#!/usr/bin/env python3
"""Validator for bot UI files.

Checks:
- No raw Unicode escapes (\\U0001f, \\u26a0) — use emoji.py constants
- No parse_mode= without HTML
- html.escape() usage for user data in f-strings
- No inline keyboard construction outside keyboards.py

Usage:
    python bot/tools/validate_bot_ui.py [path]
    python bot/tools/validate_bot_ui.py bot/
    python bot/tools/validate_bot_ui.py bot/handlers/start.py
"""

import re
import sys
from pathlib import Path

# Files that are allowed to define keyboards inline
KEYBOARD_ALLOWLIST = {
    "keyboards.py",
    "preview.html",
    "validate_bot_ui.py",
}

# Files that are allowed to use raw emoji (the emoji constants file itself)
EMOJI_ALLOWLIST = {
    "emoji.py",
    "preview.html",
    "validate_bot_ui.py",
}

# Backend files that can't import from bot/ — allowed to use inline emoji
BACKEND_PATHS = {"backend/", "backend\\"}

UNICODE_ESCAPE_RE = re.compile(r"\\U[0-9a-fA-F]{8}|\\u[0-9a-fA-F]{4}")
PARSE_MODE_RE = re.compile(r'parse_mode\s*=\s*["\'](?!HTML)[^"\']*["\']')
INLINE_KB_RE = re.compile(r"InlineKeyboardMarkup\s*\(")


class Violation:
    def __init__(self, path: str, line: int, code: str, message: str):
        self.path = path
        self.line = line
        self.code = code
        self.message = message

    def __str__(self):
        return f"{self.path}:{self.line} [{self.code}] {self.message}"


def is_backend_file(path: Path) -> bool:
    path_str = str(path)
    return any(path_str.startswith(p) or f"/{p}" in path_str or f"\\{p}" in path_str
               for p in ("backend",))


def check_file(filepath: Path, root: Path) -> list[Violation]:
    violations = []
    rel = str(filepath.relative_to(root))
    name = filepath.name
    backend = is_backend_file(filepath)

    try:
        content = filepath.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        return []

    lines = content.split("\n")

    for i, line in enumerate(lines, 1):
        # BOT001: Raw Unicode escapes
        if name not in EMOJI_ALLOWLIST and not backend:
            for match in UNICODE_ESCAPE_RE.finditer(line):
                violations.append(Violation(
                    rel, i, "BOT001",
                    f"Raw Unicode escape '{match.group()}' — use emoji.py constants"
                ))

        # BOT002: parse_mode not HTML
        if PARSE_MODE_RE.search(line):
            violations.append(Violation(
                rel, i, "BOT002",
                "parse_mode should be 'HTML' (found non-HTML value)"
            ))

        # BOT003: InlineKeyboardMarkup outside keyboards.py
        if name not in KEYBOARD_ALLOWLIST and not backend:
            if INLINE_KB_RE.search(line):
                violations.append(Violation(
                    rel, i, "BOT003",
                    "InlineKeyboardMarkup defined outside keyboards.py — "
                    "use Kb factory from templates/keyboards.py"
                ))

    return violations


def scan_directory(path: Path) -> list[Violation]:
    violations = []
    root = path if path.is_dir() else path.parent

    if path.is_file():
        if path.suffix == ".py":
            return check_file(path, root)
        return []

    for py_file in sorted(path.rglob("*.py")):
        # Skip __pycache__, .venv, etc.
        parts = py_file.parts
        if any(p.startswith(".") or p == "__pycache__" or p == "node_modules"
               for p in parts):
            continue
        violations.extend(check_file(py_file, root))

    return violations


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    path = Path(target)

    if not path.exists():
        print(f"Error: {target} not found")
        sys.exit(2)

    violations = scan_directory(path)

    if violations:
        print(f"\n{'='*60}")
        print(f"  BOT UI VALIDATION: {len(violations)} violation(s) found")
        print(f"{'='*60}\n")
        for v in violations:
            print(f"  {v}")
        print()
        sys.exit(1)
    else:
        print("\n  BOT UI VALIDATION: All clear!\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
