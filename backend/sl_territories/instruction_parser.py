from __future__ import annotations

import io
import re
from typing import Any

try:
    import pdfplumber
except Exception:
    pdfplumber = None

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None


DEFAULT_PROGRAMS = [
    {"name": "Quick", "duration_minutes": 30},
    {"name": "Normal", "duration_minutes": 60},
    {"name": "Intensive", "duration_minutes": 90},
]

PROGRAM_OVERRIDES = {
    "aws610l": [
        {"name": "Super krótkie (zimna woda)", "duration_minutes": 15},
        {"name": "Bawełna 40°", "duration_minutes": 200},
        {"name": "Wirowanie", "duration_minutes": 15},
        {"name": "Autoczyszczenie 90°", "duration_minutes": 75},
        {"name": "Bawełna szybki 60°", "duration_minutes": 113},
        {"name": "Syntetyki 40°", "duration_minutes": 100},
        {"name": "Wełna 40°", "duration_minutes": 85},
        {"name": "Baby Comfort 40°", "duration_minutes": 110},
    ],
}

COLON_TIME_RE = re.compile(r"(?<![\d,.])(\d{1,2})\s*[:：]\s*(\d{2})(?![\d,.])")
HOUR_TIME_RE = re.compile(
    r"(?<!\d)(\d{1,2})\s*(?:h|hr|hrs|hour|hours|godz\.?|godzina|godziny|g)"
    r"\s*(?:(\d{1,2})\s*(?:min\.?|mins?|minutes?|minut(?:y)?))?",
    re.IGNORECASE,
)
MINUTE_TIME_RE = re.compile(
    r"(?<![\d,.])(\d{1,3})\s*(?:min\.?|mins?|minutes?|minut(?:y)?)(?![a-z])",
    re.IGNORECASE,
)

PROGRAM_PAGE_KEYWORDS = (
    "tabela program",
    "programy",
    "programów",
    "programmes",
    "programs",
    "consumption values",
    "wartości zużycia",
    "wartosci zuzycia",
    "czas [h:min]",
    "programme duration",
    "program duration",
)

NEGATIVE_PAGE_KEYWORDS = (
    "table of contents",
    "spis treści",
    "troubleshooting",
    "fault cause",
    "display description",
    "buttons",
    "safety",
    "installation",
    "customer service",
    "charakterystyka techniczna",
    "karta produktu",
    "product fiche",
    "technical data",
)

HEADER_NAME_KEYWORDS = (
    "program",
    "programme",
    "nazwa",
)

HEADER_TIME_KEYWORDS = (
    "czas",
    "duration",
    "h:min",
    "time",
)

BANNED_NAME_TOKENS = (
    "activate",
    "available online",
    "automatically detects",
    "appliance",
    "buttons",
    "button",
    "capacity",
    "care label",
    "cleaning",
    "control",
    "deactivate",
    "description",
    "detergent",
    "display",
    "duration",
    "energy",
    "delayed start",
    "difference of",
    "fault",
    "frequency",
    "homewhiz",
    "increment",
    "is shown",
    "locked",
    "load",
    "motor locked",
    "max.",
    "opcja",
    "option",
    "page",
    "programme setting",
    "router",
    "safety",
    "setting",
    "shown in hours",
    "soak time",
    "supports",
    "technical data",
    "temperature",
    "troubleshooting",
    "turn off",
    "up to",
    "within",
    "bawełnianych w",
    "czas pracy",
    "czas trwania",
    "dane techniczne",
    "ilość",
    "informacje",
    "instrukcja",
    "kliencie",
    "naciśnij",
    "nazwa",
    "obr",
    "odcinki",
    "opóźniony start",
    "pojemność",
    "producenta",
    "prędkość",
    "pralk",
    "temperatura",
    "uwaga",
    "wsadu",
    "włożonego prania",
    "zalecenia",
    "zwłoka czasowa",
    "zużycie",
)

BANNED_EXACT_NAMES = {"x", "l", "xl", "+", "-", "x l", "opcja", "option"}

SENTENCE_START_TOKENS = (
    "activate ",
    "any ",
    "button ",
    "if ",
    "main ",
    "only ",
    "press ",
    "the ",
    "there ",
    "this ",
    "to ",
    "your ",
)

PROGRAM_NAME_HINTS = (
    "20°",
    "20°c",
    "baby",
    "bawełna",
    "bawełn",
    "bawełny",
    "cotton",
    "cottons",
    "coloureds",
    "czyszczenie",
    "daily",
    "dark",
    "delicate",
    "delicates",
    "delikat",
    "duvet",
    "eco",
    "express",
    "handwash",
    "hygiene",
    "higienicz",
    "intensive",
    "jeans",
    "kołdra",
    "koszule",
    "mix",
    "normal",
    "płukanie",
    "pranie",
    "quick",
    "rinse",
    "shirts",
    "spin",
    "sport",
    "steam",
    "syntetic",
    "synthetic",
    "synthetics",
    "syntetyki",
    "szybki",
    "towels",
    "wełna",
    "wirowanie",
    "wool",
)


def normalize_model_key(model_name: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", (model_name or "").lower())


def parse_instruction_programs(file_obj: Any, model_name: str | None = None) -> list[dict[str, int | str]]:
    key = normalize_model_key(model_name)
    if key in PROGRAM_OVERRIDES:
        return PROGRAM_OVERRIDES[key]

    data = read_file_bytes(file_obj)
    if not data:
        return DEFAULT_PROGRAMS

    file_name = getattr(file_obj, "name", "") or ""
    is_pdf = file_name.lower().endswith(".pdf")

    # Try Gemini first for PDFs (fast, accurate; free tier = 1500 req/day)
    if is_pdf:
        from .gemini_parser import parse_programs_with_gemini
        gemini_result = parse_programs_with_gemini(data, model_name)
        if gemini_result and len(gemini_result) >= 3:
            return gemini_result

    # Regex/heuristic fallback (always works, no API key needed)
    if is_pdf:
        pages, tables = extract_pdf_content(data)
        table_programs = parse_programs_from_tables(tables)
        if len(table_programs) >= 3:
            programs = table_programs
        else:
            text_programs = parse_programs_from_pages(pages)
            programs = cleanup_programs(table_programs + text_programs)
    else:
        text = data.decode(errors="ignore")
        programs = parse_programs_from_text(text)

    return programs if len(programs) >= 3 else DEFAULT_PROGRAMS


def read_file_bytes(file_obj: Any) -> bytes:
    try:
        file_obj.seek(0)
    except Exception:
        pass
    data = file_obj.read()
    try:
        file_obj.seek(0)
    except Exception:
        pass
    if isinstance(data, str):
        return data.encode()
    return data or b""


def extract_pdf_content(data: bytes) -> tuple[list[str], list[list[list[str]]]]:
    pages: list[str] = []
    tables: list[list[list[str]]] = []

    if pdfplumber is not None:
        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                for page in pdf.pages:
                    pages.append(page.extract_text() or "")
                    for table in page.extract_tables() or []:
                        tables.append(table)
        except Exception:
            pages = []
            tables = []

    if not pages and PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(data))
            pages = [page.extract_text() or "" for page in reader.pages]
        except Exception:
            pages = []

    return pages, tables


def parse_programs_from_tables(tables: list[list[list[Any]]]) -> list[dict[str, int | str]]:
    programs: list[dict[str, int | str]] = []
    for table in tables:
        rows = [[normalize_cell(cell) for cell in row] for row in table]
        programs.extend(parse_transposed_table(rows))
        name_idx, time_idx, header_idx = find_table_columns(rows)
        if time_idx is not None:
            start_idx = header_idx + 1 if header_idx is not None else 0
            for row in rows[start_idx:]:
                duration = parse_duration_minutes(row[time_idx] if time_idx < len(row) else "")
                if duration is None:
                    continue
                name = row[name_idx] if name_idx is not None and name_idx < len(row) else ""
                if not name:
                    name = first_program_cell(row, excluded_idx=time_idx)
                name = normalize_program_name(name)
                if looks_like_program_name(name):
                    programs.append({"name": name, "duration_minutes": duration})
            continue

        for row in rows:
            row_text = " ".join(cell for cell in row if cell)
            duration_hit = find_duration_hit(row_text)
            if duration_hit is None:
                continue
            duration, _ = duration_hit
            name = first_program_cell(row, excluded_idx=None)
            if not name:
                name = extract_leading_program_name(row_text[: duration_hit[1]])
            name = normalize_program_name(name)
            if looks_like_program_name(name):
                programs.append({"name": name, "duration_minutes": duration})
    return cleanup_programs(programs)


def parse_transposed_table(rows: list[list[str]]) -> list[dict[str, int | str]]:
    if not rows:
        return []

    time_row_idx = None
    best_time_count = 0
    for row_idx, row in enumerate(rows):
        time_count = sum(1 for cell in row if parse_duration_minutes(cell) is not None)
        if time_count > best_time_count:
            best_time_count = time_count
            time_row_idx = row_idx

    if time_row_idx is None or best_time_count < 3:
        return []

    name_row_idx = None
    best_name_count = 0
    for row_idx, row in enumerate(rows[:time_row_idx]):
        name_count = sum(1 for cell in row if looks_like_program_name(normalize_program_name(cell)))
        if name_count > best_name_count:
            best_name_count = name_count
            name_row_idx = row_idx

    if name_row_idx is None or best_name_count < 3:
        return []

    name_row = rows[name_row_idx]
    temp_row = rows[name_row_idx + 1] if name_row_idx + 1 < len(rows) else []
    time_row = rows[time_row_idx]
    programs: list[dict[str, int | str]] = []
    for idx, raw_name in enumerate(name_row):
        if idx >= len(time_row):
            continue
        duration = parse_duration_minutes(time_row[idx])
        if duration is None:
            continue
        name = normalize_program_name(raw_name)
        if looks_like_program_name(name):
            name = normalize_transposed_program_name(name)
            temperature = normalize_temperature(temp_row[idx] if idx < len(temp_row) else "")
            if temperature and temperature not in name and not has_temperature_number(name, temperature):
                name = f"{name} {temperature}"
            name = normalize_program_name(name)
            programs.append({"name": name, "duration_minutes": duration})

    return cleanup_programs(programs)


def find_table_columns(rows: list[list[str]]) -> tuple[int | None, int | None, int | None]:
    for row_idx, row in enumerate(rows[:8]):
        lowered = [cell.lower() for cell in row]
        time_idx = next(
            (idx for idx, cell in enumerate(lowered) if any(keyword in cell for keyword in HEADER_TIME_KEYWORDS)),
            None,
        )
        if time_idx is None:
            continue
        name_idx = next(
            (idx for idx, cell in enumerate(lowered) if any(keyword in cell for keyword in HEADER_NAME_KEYWORDS)),
            None,
        )
        if name_idx is None and time_idx != 0:
            name_idx = 0
        return name_idx, time_idx, row_idx
    return None, None, None


def first_program_cell(row: list[str], excluded_idx: int | None) -> str:
    for idx, cell in enumerate(row):
        if idx == excluded_idx:
            continue
        name = normalize_program_name(cell)
        if looks_like_program_name(name):
            return name
    return ""


def parse_programs_from_pages(pages: list[str]) -> list[dict[str, int | str]]:
    programs: list[dict[str, int | str]] = []
    for page in pages:
        if is_program_page(page):
            programs.extend(parse_programs_from_text(page))
    return cleanup_programs(programs)


def parse_programs_from_text(text: str) -> list[dict[str, int | str]]:
    lines = [normalize_line(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    programs: list[dict[str, int | str]] = []
    for idx, line in enumerate(lines):
        next_line = lines[idx + 1] if idx + 1 < len(lines) else ""
        candidate = parse_program_line(line, next_line)
        if candidate:
            programs.append(candidate)
    return cleanup_programs(programs)


def is_program_page(text: str) -> bool:
    if not text or find_duration_hit(text) is None:
        return False
    lowered = text.lower()
    duration_count = count_duration_hits(text)
    score = 0
    strong_match = False
    for keyword in PROGRAM_PAGE_KEYWORDS:
        if keyword in lowered:
            score += 2
            if keyword in {"tabela program", "consumption values", "czas [h:min]"}:
                strong_match = True
    for keyword in NEGATIVE_PAGE_KEYWORDS:
        if keyword in lowered:
            score -= 3
    if "program" in lowered and any(word in lowered for word in ("czas", "duration", "h:min")):
        score += 2
    if score <= 0:
        return False
    return strong_match or duration_count >= 2


def parse_program_line(line: str, next_line: str = "") -> dict[str, int | str] | None:
    duration_hit = find_duration_hit(line)
    if duration_hit is None:
        return None

    duration, start_idx = duration_hit
    prefix = line[:start_idx].strip()
    name = extract_consumption_program_name(prefix, next_line)
    if not name:
        name = extract_leading_program_name(prefix)
    if name and name.count("(") > name.count(")") and next_line:
        continuation = extract_parenthesis_continuation(next_line)
        if continuation:
            name = f"{name} {continuation}"
    name = normalize_program_name(name)
    if not looks_like_program_name(name):
        return None
    return {"name": name, "duration_minutes": duration}


def extract_consumption_program_name(prefix: str, next_line: str) -> str:
    match = re.match(
        r"^(?P<name>.+?)\s+(?P<temperature>\d{1,2})\s+"
        r"\d+(?:[,.]\d+)?\s+\d+(?:[,.]\d+)?\s+\d+(?:[,.]\d+)?\s*$",
        prefix,
    )
    if not match:
        return ""

    name = match.group("name").strip()
    if name.endswith("/") and next_line and find_duration_hit(next_line) is None:
        continuation = extract_name_continuation(next_line)
        if continuation:
            name = f"{name}{continuation}"

    temperature = int(match.group("temperature"))
    if 10 <= temperature <= 95:
        name = f"{name} {temperature}°"
    return name


def extract_name_continuation(line: str) -> str:
    tokens = []
    for token in line.split():
        clean = token.strip(",.;:")
        if re.fullmatch(r"\d+", clean):
            break
        if not any(ch.isalpha() for ch in clean):
            break
        tokens.append(clean)
        if len(tokens) >= 3:
            break
    return " ".join(tokens)


def extract_parenthesis_continuation(line: str) -> str:
    tokens = []
    for token in line.split():
        clean = token.strip(",.;:")
        if not clean:
            continue
        tokens.append(clean)
        if ")" in clean or len(tokens) >= 3:
            break
    continuation = " ".join(tokens)
    return continuation if ")" in continuation else ""


def extract_leading_program_name(prefix: str) -> str:
    prefix = normalize_line(prefix)
    tokens = prefix.split()
    if tokens and re.fullmatch(r"\d+[.)]?", tokens[0]):
        tokens = tokens[1:]

    name_tokens: list[str] = []
    paren_balance = 0
    for token in tokens:
        clean = token.strip(",.;:")
        clean = clean.lstrip("*•")
        if not clean:
            continue
        if should_stop_name_token(clean, bool(name_tokens), paren_balance):
            break
        paren_balance += clean.count("(") - clean.count(")")
        name_tokens.append(clean)
        if len(name_tokens) >= 8:
            break

    return " ".join(name_tokens)


def should_stop_name_token(token: str, has_name: bool, paren_balance: int) -> bool:
    lowered = token.lower()
    if lowered in {"x", "l", "+", "max", "max.", "load"} and has_name and paren_balance <= 0:
        return True
    if re.fullmatch(r"\d{3,4}", token) and has_name:
        return True
    if re.fullmatch(r"\d+[,.]\d+", token) and has_name:
        return True
    if re.fullmatch(r"\d+(?:-\d+)?", token) and has_name and paren_balance <= 0:
        return True
    return False


def find_duration_hit(text: str) -> tuple[int, int] | None:
    hits: list[tuple[int, int]] = []
    hour_spans: list[tuple[int, int]] = []

    for match in COLON_TIME_RE.finditer(text):
        hours = int(match.group(1))
        minutes = int(match.group(2))
        total = hours * 60 + minutes
        if minutes >= 60:
            total = (hours + minutes // 60) * 60 + minutes % 60
        if valid_duration(total):
            hits.append((total, match.start()))

    for match in HOUR_TIME_RE.finditer(text):
        hours = int(match.group(1))
        minutes = int(match.group(2) or 0)
        total = hours * 60 + minutes
        if valid_duration(total):
            hits.append((total, match.start()))
            hour_spans.append(match.span())

    for match in MINUTE_TIME_RE.finditer(text):
        if any(start <= match.start() < end for start, end in hour_spans):
            continue
        total = int(match.group(1))
        if valid_duration(total):
            hits.append((total, match.start()))

    if not hits:
        return None
    return sorted(hits, key=lambda item: item[1])[-1]


def count_duration_hits(text: str) -> int:
    return (
        len(COLON_TIME_RE.findall(text))
        + len(HOUR_TIME_RE.findall(text))
        + len(MINUTE_TIME_RE.findall(text))
    )


def parse_duration_minutes(text: str) -> int | None:
    hit = find_duration_hit(normalize_line(text))
    return hit[0] if hit else None


def valid_duration(minutes: int) -> bool:
    return 5 <= minutes <= 300


def cleanup_programs(programs: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    result: list[dict[str, int | str]] = []
    seen: dict[str, int] = {}
    for program in programs:
        raw_name = str(program.get("name") or "")
        name = normalize_program_name(raw_name)
        if not looks_like_program_name(name):
            continue
        try:
            duration = int(program.get("duration_minutes") or 0)
        except (TypeError, ValueError):
            continue
        if not valid_duration(duration):
            continue
        key = normalize_program_key(name)
        if key in seen:
            existing_idx = seen[key]
            result[existing_idx]["duration_minutes"] = duration
            continue
        seen[key] = len(result)
        result.append({"name": name[:80], "duration_minutes": duration})
    return result


def looks_like_program_name(name: str) -> bool:
    lowered = name.lower().strip()
    if not lowered or lowered in BANNED_EXACT_NAMES:
        return False
    if len(name) < 3 or len(name) > 90:
        return False
    if not any(ch.isalpha() for ch in name):
        return False
    if "_" in name:
        return False
    if re.search(r"[\u3400-\u9fff]", name):
        return False
    if any(token in lowered for token in BANNED_NAME_TOKENS):
        return False
    if lowered.startswith(SENTENCE_START_TOKENS):
        return False
    if re.fullmatch(r"[\d\s,.\-°]+", name):
        return False
    if re.search(r"\b(?:kwh|kg|rpm|obr|min|litres?|l)\b", lowered):
        return False
    if len(name.split()) > 4 and not any(token in lowered for token in PROGRAM_NAME_HINTS):
        return False
    if len(name.split()) > 8:
        return False
    return True


def normalize_program_name(name: str) -> str:
    name = normalize_line(name)
    name = re.sub(r"^[\-–—•*·]+", "", name)
    name = re.sub(r"(?<=\w)\*+(?=\s+\d)", "", name)
    name = re.sub(r"\b(\d{1,2})\s*\*+\s+(?=\1\s*°)", "", name)
    name = re.sub(r"\b(\d{1,2})\s+(?=\1\s*°)", "", name)
    name = re.sub(r"\b(\d{1,2})\s*°?\s*C\b", r"\1°C", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+\d+\)", "", name)
    name = dedupe_temperature_tokens(name)
    name = re.sub(r"\s+([/)])", r"\1", name)
    name = re.sub(r"([(])\s+", r"\1", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip(" -;,.")


def dedupe_temperature_tokens(name: str) -> str:
    name = re.sub(r"(?<!\d)(\d{1,2}°C?)\s+\1(?!\d)", r"\1", name)
    return re.sub(r"(?<!\d)(\d{1,2}°C?)\s+\1(?!\d)", r"\1", name)


def normalize_program_key(name: str) -> str:
    key = normalize_program_name(name).lower()
    key = re.sub(r"\s+", " ", key)
    return key


def normalize_transposed_program_name(name: str) -> str:
    name = name.replace("„", "").replace("”", "")
    lowered = name.lower()
    if "bawełna" in lowered and ("eco" in lowered or ("pranie" in lowered and "wstępne" in lowered)):
        load = ""
        if "połowa" in lowered:
            load = "połowa załadunku"
        elif "pełen" in lowered:
            load = "pełen załadunek"
        if "pranie" in lowered and "wstępne" in lowered:
            name = "Bawełna + Pranie wstępne"
        else:
            name = "Bawełna Eco"
        if load:
            name = f"{name} ({load})"
    name = normalize_program_name(name)
    if name and name[0].islower():
        name = f"{name[0].upper()}{name[1:]}"
    return name


def normalize_temperature(value: str) -> str:
    match = re.search(r"(\d{1,2})\s*°", value)
    if not match:
        return ""
    return f"{match.group(1)}°"


def has_temperature_number(name: str, temperature: str) -> bool:
    number = temperature.rstrip("°")
    return bool(re.search(rf"(?<!\d){re.escape(number)}(?!\d)", name))


def normalize_cell(value: Any) -> str:
    if value is None:
        return ""
    return normalize_line(str(value))


def normalize_line(value: str) -> str:
    value = value.replace("\n", " ")
    value = re.sub(r"[\u00ad\u2011\u2013\u2014]", "-", value)
    value = value.replace("\uf06d", "")
    value = value.replace("⁠", "")
    value = value.replace("¡", "")
    value = value.replace("▶", "")
    return re.sub(r"\s+", " ", value).strip()
