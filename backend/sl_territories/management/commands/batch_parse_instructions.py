from __future__ import annotations

import csv
import io
import json
import time
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError

from sl_territories.instruction_parser import DEFAULT_PROGRAMS, parse_instruction_programs


SUPPORTED_SUFFIXES = {".pdf", ".txt"}


class Command(BaseCommand):
    help = "Parse wash programs from instruction files in bulk without uploading them through the UI."

    def add_arguments(self, parser):
        parser.add_argument(
            "paths",
            nargs="+",
            help="Instruction files or directories with instruction files.",
        )
        parser.add_argument(
            "--glob",
            default="*",
            help="File glob used for directory inputs. Default: *",
        )
        parser.add_argument(
            "--model-name",
            default="",
            help="Use one model name for all files. Default: file name without extension.",
        )
        parser.add_argument(
            "--language",
            default="",
            help="Optional label stored in the report, for example pl or en.",
        )
        parser.add_argument(
            "--json-out",
            default="",
            help="Write full results to this JSON file.",
        )
        parser.add_argument(
            "--csv-out",
            default="",
            help="Write a compact summary to this CSV file.",
        )
        parser.add_argument(
            "--recursive",
            action="store_true",
            help="Search directory inputs recursively.",
        )
        parser.add_argument(
            "--fail-on-error",
            action="store_true",
            help="Exit with an error if any file cannot be parsed.",
        )
        parser.add_argument(
            "--pretty",
            action="store_true",
            help="Pretty-print JSON output.",
        )

    def handle(self, *args, **options):
        files = collect_files(
            options["paths"],
            file_glob=options["glob"],
            recursive=options["recursive"],
        )
        if not files:
            raise CommandError("No .pdf or .txt instruction files found.")

        results = []
        started = time.monotonic()
        try:
            for index, file_path in enumerate(files, start=1):
                self.stdout.write(f"[{index}/{len(files)}] Parsing {file_path}")
                result = parse_file(
                    file_path,
                    model_name=options["model_name"] or file_path.stem,
                    language=options["language"],
                )
                results.append(result)
                status = "ERROR" if result["error"] else "OK"
                fallback = " fallback" if result["used_default_programs"] else ""
                self.stdout.write(
                    f"{status:5} {result['program_count']:>2} programs{fallback:9} {file_path}"
                )
                write_reports(options, results)
        except KeyboardInterrupt:
            write_reports(options, results)
            self.stdout.write(
                self.style.WARNING(
                    f"Interrupted. Saved partial results for {len(results)} of {len(files)} files."
                )
            )
            return

        write_reports(options, results)
        if options["pretty"] and not options["json_out"]:
            self.stdout.write(json.dumps(results, ensure_ascii=False, indent=2))

        elapsed = time.monotonic() - started
        errors = [result for result in results if result["error"]]
        fallback_count = sum(1 for result in results if result["used_default_programs"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Parsed {len(results)} files in {elapsed:.1f}s. "
                f"Errors: {len(errors)}. Default fallback: {fallback_count}."
            )
        )

        if errors and options["fail_on_error"]:
            raise CommandError(f"{len(errors)} file(s) failed. See report for details.")


def collect_files(paths: list[str], file_glob: str, recursive: bool) -> list[Path]:
    files: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path).expanduser()
        if path.is_file():
            if path.suffix.lower() in SUPPORTED_SUFFIXES:
                files.append(path)
            continue
        if path.is_dir():
            iterator = path.rglob(file_glob) if recursive else path.glob(file_glob)
            files.extend(
                candidate
                for candidate in iterator
                if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_SUFFIXES
            )
            continue
        raise CommandError(f"Path does not exist: {raw_path}")
    return sorted(dict.fromkeys(files))


def parse_file(file_path: Path, model_name: str, language: str) -> dict[str, Any]:
    try:
        file_obj = io.BytesIO(file_path.read_bytes())
        file_obj.name = file_path.name
        programs = parse_instruction_programs(file_obj, model_name=model_name)
        error = ""
    except Exception as exc:
        programs = []
        error = f"{exc.__class__.__name__}: {exc}"

    return {
        "file": str(file_path),
        "model_name": model_name,
        "language": language,
        "program_count": len(programs),
        "used_default_programs": programs == DEFAULT_PROGRAMS,
        "programs": programs,
        "error": error,
    }


def write_reports(options: dict[str, Any], results: list[dict[str, Any]]) -> None:
    if options["json_out"]:
        write_json(Path(options["json_out"]), results, pretty=options["pretty"])
    if options["csv_out"]:
        write_csv(Path(options["csv_out"]), results)


def write_json(path: Path, results: list[dict[str, Any]], pretty: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    indent = 2 if pretty else None
    path.write_text(json.dumps(results, ensure_ascii=False, indent=indent), encoding="utf-8")


def write_csv(path: Path, results: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file_obj:
        writer = csv.DictWriter(
            file_obj,
            fieldnames=[
                "file",
                "model_name",
                "language",
                "program_count",
                "used_default_programs",
                "programs",
                "error",
            ],
        )
        writer.writeheader()
        for result in results:
            writer.writerow(
                {
                    "file": result["file"],
                    "model_name": result["model_name"],
                    "language": result["language"],
                    "program_count": result["program_count"],
                    "used_default_programs": result["used_default_programs"],
                    "programs": "; ".join(
                        f"{program['name']} ({program['duration_minutes']} min)"
                        for program in result["programs"]
                    ),
                    "error": result["error"],
                }
            )
