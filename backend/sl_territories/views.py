import re
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from django.core.files.uploadedfile import UploadedFile
from django.core.files.storage import default_storage

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None
try:
    import pdfplumber
except Exception:
    pdfplumber = None

from .models import Territory, TerritoryAccess, Booking, Machine, InstructionTemplate
from .serializers import (
    TerritorySerializer,
    TerritoryAccessSerializer,
    BookingSerializer,
)


def generate_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return get_random_string(length=6, allowed_chars=alphabet)

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


class AdminTerritoryListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        territories = Territory.objects.all().order_by("name")
        serializer = TerritorySerializer(territories, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        payload = request.data.copy()
        payload["code"] = generate_code()
        serializer = TerritorySerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        territory = serializer.save(created_by=request.user)
        return Response(TerritorySerializer(territory).data, status=status.HTTP_201_CREATED)


class AdminTerritoryDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        serializer = TerritorySerializer(instance=territory, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        territory.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserAddTerritoryByCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"detail": "Code is required"}, status=status.HTTP_400_BAD_REQUEST)
        territory = Territory.objects.filter(code__iexact=code).first()
        if not territory:
            return Response({"detail": "Invalid code"}, status=status.HTTP_404_NOT_FOUND)
        access, _ = TerritoryAccess.objects.get_or_create(user=request.user, territory=territory)
        serializer = TerritoryAccessSerializer(access, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserTerritoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accesses = TerritoryAccess.objects.filter(user=request.user).select_related("territory")
        serializer = TerritoryAccessSerializer(accesses, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        machine_id = request.query_params.get("machine")
        qs = Booking.objects.select_related("user", "machine")
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        serializer = BookingSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MachineListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, territory_id: int):
        territory = get_object_or_404(Territory, pk=territory_id)
        serializer = TerritorySerializer(territory, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class InstructionTemplateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        model_name = (request.data.get("model_name") or "").strip()
        file_obj: UploadedFile = request.FILES.get("file")
        if not model_name or not file_obj:
            return Response(
                {"detail": "model_name and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        template, created = InstructionTemplate.objects.get_or_create(
            model_name__iexact=model_name,
            defaults={"model_name": model_name, "file": file_obj},
        )
        if not created:
            template.file.delete(save=False)
            template.file = file_obj
        try:
            file_obj.seek(0)
        except Exception:
            pass
        programs_to_save = self._parse_programs(file_obj, model_name=model_name)
        template.parsed_programs = programs_to_save
        template.save()
        return Response(
            {
                "id": template.id,
                "model_name": template.model_name,
                "programs": programs_to_save,
                "created_at": template.created_at,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        search_query = (request.query_params.get("search") or request.query_params.get("q") or "").strip()
        if search_query:
            templates = (
                InstructionTemplate.objects.filter(model_name__icontains=search_query)
                .order_by("model_name")[:8]
            )
            return Response(
                {"results": [{"id": t.id, "model_name": t.model_name} for t in templates]},
                status=status.HTTP_200_OK,
            )

        model_name = (request.query_params.get("model_name") or "").strip()
        if not model_name:
            return Response({"detail": "model_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        template = InstructionTemplate.objects.filter(model_name__iexact=model_name).first()
        if not template:
            return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        key = re.sub(r"[^a-z0-9]+", "", model_name.lower())
        programs = PROGRAM_OVERRIDES.get(key, template.parsed_programs)
        return Response(
            {
                "id": template.id,
                "model_name": template.model_name,
                "programs": programs,
                "file": template.file.url if template.file else None,
            },
            status=status.HTTP_200_OK,
        )

    def _parse_programs(self, file_obj: UploadedFile, model_name: str | None = None):
        key = re.sub(r"[^a-z0-9]+", "", (model_name or "").lower())
        if key in PROGRAM_OVERRIDES:
            return PROGRAM_OVERRIDES[key]
        content = ""
        saved_path = None
        if PdfReader is not None and file_obj.name.lower().endswith(".pdf"):
            try:
                saved_path = default_storage.save(f"tmp/{file_obj.name}", file_obj)
                with default_storage.open(saved_path, "rb") as fh:
                    reader = PdfReader(fh)
                    content = "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception:
                content = ""
        if not content:
            try:
                content = file_obj.read().decode(errors="ignore")
            except Exception:
                content = ""

        table_programs = []
        if saved_path and pdfplumber is not None:
            try:
                with default_storage.open(saved_path, "rb") as fh:
                    with pdfplumber.open(fh) as pdf:
                        for page in pdf.pages:
                            for table in page.extract_tables() or []:
                                table_programs.extend(self._parse_table_rows(table))
            except Exception:
                table_programs = []
        if saved_path:
            try:
                default_storage.delete(saved_path)
            except Exception:
                pass

        if not content:
            defaults = [
                {"name": "Quick", "duration_minutes": 30},
                {"name": "Normal", "duration_minutes": 60},
                {"name": "Intensive", "duration_minutes": 90},
            ]
            return defaults

        lines = [
            re.sub(r"[\u00ad\u2011\u2013\u2014]", "-", line).strip()
            for line in content.splitlines()
            if line.strip()
        ]
        program_section_keywords = (
            "tabela program",
            "program",
            "programy",
            "programów",
            "programmes",
            "programme",
            "cycles",
            "cycle",
            "wash program",
            "wash cycles",
            "programs",
        )
        colon_time_re = re.compile(r"(\d{1,2})\s*[.:：]\s*(\d{2})")
        spaced_time_re = re.compile(r"^(\d{1,3})\s*(?:min|mins?|мин(?:\.|ут)?|m|'|minutes)?$", re.IGNORECASE)
        word_time_re = re.compile(r"(\d{1,2})\s*(?:h|ч|час[а]?)\s*(\d{1,2})?", re.IGNORECASE)
        number_only_re = re.compile(r"^\d{1,3}$")
        programs = []
        current_name_parts: list[str] = []

        colon_time_indices = [idx for idx, line in enumerate(lines) if colon_time_re.search(line)]
        prefer_colon_only = True if colon_time_indices else len(colon_time_indices) >= 2

        def parse_time_match(line: str):
            def _convert(match_obj):
                hours = int(match_obj.group(1))
                minutes = int(match_obj.group(2) or 0)
                if minutes >= 60:
                    hours += minutes // 60
                    minutes = minutes % 60
                return hours * 60 + minutes

            time_patterns = (colon_time_re,) if prefer_colon_only else (colon_time_re, word_time_re)
            for pattern in time_patterns:
                match_obj = pattern.search(line)
                if match_obj:
                    minutes_val = _convert(match_obj)
                    if minutes_val is not None:
                        return minutes_val, match_obj.start()
            if not prefer_colon_only:
                spaced_match = spaced_time_re.match(line.strip())
                if spaced_match:
                    minutes_val = _convert(spaced_match)
                    if minutes_val is not None:
                        return minutes_val, spaced_match.start()
            return None

        def looks_like_program_name(line: str) -> bool:
            if not any(ch.isalpha() for ch in line):
                return False
            if len(line) > 60 or number_only_re.fullmatch(line):
                return False
            if len(line.split()) == 1 and len(line.strip()) <= 2:
                return False
            if parse_time_match(line):
                return False
            if any(p in line for p in ".!?;"):
                return False
            if len(line.split()) > 6:
                return False
            alpha_chars = [c for c in line if c.isalpha()]
            if alpha_chars:
                upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
                if upper_ratio > 0.7:
                    return False
            lowered = line.lower()
            excluded = {
                "time",
                "tempo",
                "temps",
                "dauer",
                "время",
                "min",
                "мин",
                "rpm",
                "кг",
                "kg",
                "load",
                "temp",
                "°",
                "uwaga",
                "informacje",
                "kliencie",
                "producenta",
                "instrukcja",
                "pranie",
                "pralk",
                "oświadczenie",
                "nazwa",
                "programu",
            }
            if any(token in lowered for token in excluded):
                return False
            return True

        def extract_program_name(prefix: str, fallback_parts: list[str], program_index: int) -> str:
            tokens = prefix.strip().split()
            if tokens and tokens[0].isdigit():
                tokens = tokens[1:]
            name_tokens: list[str] = []
            temp_added = False
            for tok in tokens:
                clean = tok.strip(",.;")
                if clean in {"--", "-", "––", "—", "­­"}:
                    continue
                if re.fullmatch(r"\d{3,4}", clean) or re.fullmatch(r"\d+[.,]\d+", clean):
                    break
                if any(ch.isalpha() for ch in clean):
                    name_tokens.append(tok)
                    continue
                if re.fullmatch(r"\d+[°º']?(?:-\d+[°º']?)?", clean) and (name_tokens or not temp_added):
                    name_tokens.append(tok)
                    temp_added = True
                    continue
            if not name_tokens and tokens and re.fullmatch(r"\d+[°º]", tokens[0].strip(",.;")):
                name_tokens = [tokens[0]]
            if not name_tokens and fallback_parts:
                name_tokens = fallback_parts
            if not name_tokens:
                return f"Program {program_index}"
            cleaned: list[str] = []
            for tok in name_tokens:
                if cleaned and tok == cleaned[-1]:
                    continue
                cleaned.append(tok)
            name = re.sub(r"\s+", " ", " ".join(cleaned)).strip()
            return name or f"Program {program_index}"

        def build_column_programs(all_lines: list[str]):
            program_keywords = (
                "program",
                "programme",
                "programa",
                "programas",
                "программа",
                "режим",
                "tabela program",
            )
            start_idx = 0
            for idx, line in enumerate(all_lines):
                lower = line.lower()
                if any(keyword in lower for keyword in program_keywords):
                    start_idx = idx
                    break
            names: list[str] = []
            times: list[int] = []
            seen_names: set[str] = set()
            for line in all_lines[start_idx:]:
                time_hit = parse_time_match(line)
                if time_hit:
                    times.append(time_hit[0])
                    continue
                if looks_like_program_name(line):
                    cleaned_name = extract_program_name(line, [], len(names) + 1)
                    if cleaned_name not in seen_names:
                        seen_names.add(cleaned_name)
                        names.append(cleaned_name)
            pair_count = min(len(names), len(times))
            if pair_count < 2:
                return []
            return [{"name": names[i][:60], "duration_minutes": times[i]} for i in range(pair_count)]

        def build_table_programs(all_lines: list[str]):
            start_idx = -1
            for idx, line in enumerate(all_lines):
                low = line.lower()
                if "nazwa" in low and "program" in low:
                    start_idx = idx + 1
                    break
                if "tabela program" in low:
                    start_idx = idx + 1
                    break
            if start_idx == -1:
                return []
            names: list[str] = []
            times: list[int] = []
            buffer_names: list[str] = []
            for line in all_lines[start_idx:]:
                low = line.lower()
                if any(k in low for k in ("czas", "h:min")) and not parse_time_match(line):
                    continue
                time_hit = parse_time_match(line)
                if time_hit:
                    times.append(time_hit[0])
                    if buffer_names:
                        names.extend(buffer_names)
                        buffer_names = []
                    continue
                if looks_like_program_name(line):
                    extracted = extract_program_name(line, [], len(names) + 1)
                    if extracted and extracted not in buffer_names:
                        buffer_names.append(extracted)
            pair_count = min(len(names), len(times))
            if pair_count < 2:
                return []
            return [{"name": names[i][:60], "duration_minutes": times[i]} for i in range(pair_count)]

        def pair_names_and_times(all_lines: list[str]):
            pairs: list[dict[str, int | str]] = []
            used_name_idx: set[int] = set()
            for idx, line in enumerate(all_lines):
                hit = parse_time_match(line)
                if not hit:
                    continue
                minutes, start_idx = hit
                name_candidate = ""
                prefix = line[:start_idx].strip()
                if prefix and not any(p in prefix for p in ".!?;"):
                    name_candidate = extract_program_name(prefix, [], len(pairs) + 1)
                if not name_candidate:
                    for back in range(1, 3):
                        cand_idx = idx - back
                        if cand_idx >= 0 and cand_idx not in used_name_idx and looks_like_program_name(all_lines[cand_idx]):
                            name_candidate = extract_program_name(all_lines[cand_idx], [], len(pairs) + 1)
                            used_name_idx.add(cand_idx)
                            break
                if not name_candidate and idx + 1 < len(all_lines):
                    if idx + 1 not in used_name_idx and looks_like_program_name(all_lines[idx + 1]):
                        name_candidate = extract_program_name(all_lines[idx + 1], [], len(pairs) + 1)
                        used_name_idx.add(idx + 1)
                if not name_candidate:
                    continue
                pairs.append({"name": name_candidate[:60], "duration_minutes": minutes})
            return pairs

        anchor_idx = 0
        for idx, line in enumerate(lines):
            low = line.lower()
            if any(keyword in low for keyword in program_section_keywords):
                anchor_idx = idx
                break
        if anchor_idx == 0 and colon_time_indices:
            anchor_idx = max(0, min(colon_time_indices) - 3)
        if anchor_idx:
            lines = lines[anchor_idx:]

        for line in lines:
            if number_only_re.fullmatch(line):
                current_name_parts = []
                continue
            time_hit = parse_time_match(line)
            if time_hit:
                total_minutes, start_idx = time_hit
                if start_idx > 0 or current_name_parts:
                    name_prefix = line[:start_idx]
                    if not any(p in name_prefix for p in ".!?;"):
                        name = extract_program_name(name_prefix, current_name_parts, len(programs) + 1)
                        programs.append({"name": name[:60], "duration_minutes": total_minutes})
                current_name_parts = []
                continue
            if any(ch.isalpha() for ch in line) and len(line) <= 50:
                current_name_parts = [line]

        column_programs = build_column_programs(lines)
        neighbor_programs = pair_names_and_times(lines)
        text_table_programs = build_table_programs(lines)

        best_programs = programs
        for candidate in (table_programs, text_table_programs, neighbor_programs, column_programs):
            if candidate and len(candidate) > len(best_programs):
                best_programs = candidate
        programs = best_programs

        programs = self._cleanup_programs(programs)
        return programs

    def _cleanup_programs(self, programs: list[dict[str, int | str]]):
        banned_tokens = {"kg", "woda", "water", "rpm", "obr", "litr"}
        banned_exact = {"x l", "xl", "x", "l", "+", "-"}

        def normalize_name(name: str) -> str:
            name = re.sub(r"^[\-\–—•*·]+", "", name or "")
            name = re.sub(r"\s+", " ", name)
            return name.strip()

        result: list[dict[str, int | str]] = []
        seen: dict[str, int] = {}
        for program in programs:
            raw_name = str(program.get("name") or "").strip()
            duration = program.get("duration_minutes")
            try:
                duration_int = int(duration) if duration is not None else 0
            except (TypeError, ValueError):
                continue
            if duration_int < 5 or duration_int > 300:
                continue
            name = normalize_name(raw_name)
            if len(name) < 3:
                continue
            lower = name.lower()
            if lower in banned_exact:
                continue
            if any(token in lower for token in banned_tokens):
                continue
            key = lower
            if key in seen:
                idx = seen[key]
                if duration_int < result[idx]["duration_minutes"]:
                    result[idx]["duration_minutes"] = duration_int
                continue
            result.append({"name": name, "duration_minutes": duration_int})
            seen[key] = len(result) - 1

        if not result:
            return [
                {"name": "Quick", "duration_minutes": 30},
                {"name": "Normal", "duration_minutes": 60},
                {"name": "Intensive", "duration_minutes": 90},
            ]
        return result

    def _parse_table_rows(self, table_rows):
        programs: list[dict[str, int | str]] = []
        time_re = re.compile(
            r"(\d{1,2})\s*[:.:：]\s*(\d{2})|(\d{1,3})\s*(?:min|mins?|мин(?:\.|ут)?|m|'|minutes)?",
            re.IGNORECASE,
        )
        for row in table_rows:
            cells = [(" ".join(str(cell or "").split())).strip() for cell in row]
            if not any(cells):
                continue
            time_idx = None
            duration_minutes = None
            for idx, cell in enumerate(cells):
                m = time_re.search(cell)
                if not m:
                    continue
                if m.group(1) and m.group(2):
                    h = int(m.group(1))
                    minutes = int(m.group(2))
                    if minutes >= 60:
                        h += minutes // 60
                        minutes = minutes % 60
                    duration_minutes = h * 60 + minutes
                else:
                    minutes = int(m.group(3))
                    duration_minutes = minutes
                time_idx = idx
                break
            if duration_minutes is None:
                continue
            name_cell = None
            if time_idx is not None:
                if time_idx - 1 >= 0:
                    name_cell = cells[time_idx - 1]
                if (not name_cell or len(name_cell) < 3) and time_idx + 1 < len(cells):
                    name_cell = cells[time_idx + 1]
            if not name_cell:
                name_cell = cells[0]
            programs.append({"name": name_cell, "duration_minutes": duration_minutes})
        return programs
