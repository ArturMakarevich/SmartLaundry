from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def parse_programs_with_gemini(pdf_bytes: bytes, model_name: str | None = None) -> list[dict[str, Any]] | None:
    """
    Send PDF bytes to Gemini and extract wash programs as structured JSON.
    Returns a list of {name, duration_minutes} dicts, or None if unavailable/failed.
    """
    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore
    except ImportError:
        logger.debug("google-genai not installed; skipping Gemini parser")
        return None

    from django.conf import settings
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        return None

    try:
        client = genai.Client(api_key=api_key)

        prompt = _build_prompt(model_name)

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                types.Part.from_text(text=prompt),
            ],
        )

        raw = response.text or ""
        return _parse_gemini_response(raw)

    except Exception as exc:
        logger.warning("Gemini parser failed: %s", exc)
        return None


def _build_prompt(model_name: str | None) -> str:
    model_hint = f" The machine model is: {model_name}." if model_name else ""
    return (
        "You are analyzing a washing machine instruction manual PDF."
        f"{model_hint}"
        " Extract ALL wash programs listed in the program table or program overview section."
        " For each program, provide its name (as written in the manual, keep temperature if shown, e.g. 'Cotton 60°')"
        " and its typical duration in minutes (use the value from the table; if a range is given, use the longer value)."
        " Return ONLY a valid JSON array, no markdown, no explanation. Example:"
        ' [{"name": "Cotton 60°", "duration_minutes": 150}, {"name": "Quick 30°", "duration_minutes": 30}]'
        " If you cannot find any programs, return an empty array []."
        " Do not include spin-only or rinse-only pseudo-programs unless they appear in the main program table."
    )


_JSON_ARRAY_RE = re.compile(r"\[.*?\]", re.DOTALL)


def _parse_gemini_response(raw: str) -> list[dict[str, Any]] | None:
    raw = raw.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw.strip())
        raw = raw.strip()

    # Try direct parse first
    try:
        data = json.loads(raw)
        return _validate_programs(data)
    except json.JSONDecodeError:
        pass

    # Fallback: extract first JSON array from response
    match = _JSON_ARRAY_RE.search(raw)
    if match:
        try:
            data = json.loads(match.group())
            return _validate_programs(data)
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse Gemini response as JSON: %s", raw[:200])
    return None


_CJK_RE = re.compile(r"[㐀-鿿一-鿿가-힣]")


def _validate_programs(data: Any) -> list[dict[str, Any]] | None:
    if not isinstance(data, list):
        return None

    seen: dict[str, int] = {}
    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        try:
            duration = int(item.get("duration_minutes") or 0)
        except (TypeError, ValueError):
            continue
        if not name or not (5 <= duration <= 300):
            continue
        # Drop entries with CJK characters (wrong language section in PDF)
        if _CJK_RE.search(name):
            continue
        # Deduplicate by normalised key (same as cleanup_programs in instruction_parser)
        key = re.sub(r"\s+", " ", name.lower().strip())
        if key in seen:
            # keep the longer duration for the same program
            result[seen[key]]["duration_minutes"] = max(
                result[seen[key]]["duration_minutes"], duration
            )
            continue
        seen[key] = len(result)
        result.append({"name": name[:80], "duration_minutes": duration})
    return result if result else None
