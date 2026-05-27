#!/usr/bin/env python3
"""Check Chuchotage localization coverage across committed text surfaces."""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SUPPORTED_LANGUAGES = {
    "en",
    "es",
    "pt",
    "fr",
    "ja",
    "ru",
    "zh",
    "de",
    "ko",
    "hi",
    "id",
    "vi",
    "it",
}

ANDROID_LOCALE_DIRS = {
    "en": "values",
    "es": "values-es",
    "pt": "values-pt",
    "fr": "values-fr",
    "ja": "values-ja",
    "ru": "values-ru",
    "zh": "values-zh",
    "de": "values-de",
    "ko": "values-ko",
    "hi": "values-hi",
    "id": "values-b+id",
    "vi": "values-vi",
    "it": "values-it",
}


def load_android_strings(path: Path) -> tuple[set[str], set[str]]:
    root = ET.parse(path).getroot()
    keys: set[str] = set()
    non_translatable: set[str] = set()
    for child in root:
        if child.tag != "string":
            continue
        name = child.attrib["name"]
        keys.add(name)
        if child.attrib.get("translatable") == "false":
            non_translatable.add(name)
    return keys, non_translatable


def check_android() -> list[str]:
    errors: list[str] = []
    base_path = ROOT / "app/src/main/res/values/strings.xml"
    base_keys, non_translatable = load_android_strings(base_path)
    expected_keys = base_keys - non_translatable

    locale_config = ROOT / "app/src/main/res/xml/locales_config.xml"
    locale_config_text = locale_config.read_text(encoding="utf-8")
    for language, dirname in ANDROID_LOCALE_DIRS.items():
        if language != "en" and f'android:name="{language}"' not in locale_config_text:
            errors.append(f"Android locale config missing {language}")

        strings_path = ROOT / f"app/src/main/res/{dirname}/strings.xml"
        if not strings_path.exists():
            errors.append(f"Android strings file missing for {language}: {strings_path.relative_to(ROOT)}")
            continue

        keys, _ = load_android_strings(strings_path)
        if language == "en":
            continue
        missing = sorted(expected_keys - keys)
        if missing:
            preview = ", ".join(missing[:10])
            suffix = "..." if len(missing) > 10 else ""
            errors.append(f"Android {language} missing {len(missing)} keys: {preview}{suffix}")
    return errors


def check_apple() -> list[str]:
    errors: list[str] = []
    resources = ROOT / "apple/Chuchotage/Resources"
    for language in SUPPORTED_LANGUAGES:
        if language == "en":
            continue
        has_lproj = (resources / f"{language}.lproj/Localizable.strings").exists()
        has_catalog = any((resources / candidate).exists() for candidate in ("Localizable.xcstrings", "Chuchotage.xcstrings"))
        if not has_lproj and not has_catalog:
            errors.append(f"Apple localization missing for {language}")
    return errors


def check_windows() -> list[str]:
    errors: list[str] = []
    locale_candidates = [
        ROOT / "windows/Chuchotage.Electron/src/renderer/locales.js",
        ROOT / "windows/Chuchotage.Electron/src/renderer/locales.json",
    ]
    locale_file = next((path for path in locale_candidates if path.exists()), None)
    if locale_file is None:
        return ["Windows renderer localization file missing"]

    text = locale_file.read_text(encoding="utf-8")
    for language in SUPPORTED_LANGUAGES:
        if f"{language}" not in text and f"'{language}'" not in text and f'"{language}"' not in text:
            errors.append(f"Windows renderer localization missing {language}")
    return errors


def check_play() -> list[str]:
    errors: list[str] = []
    listings = ROOT / "app/src/main/play/listings"
    expected_files = ("title.txt", "short-description.txt", "full-description.txt")
    locale_dirs = {
        "en": "en-US",
        "es": "es-ES",
        "pt": "pt-BR",
        "fr": "fr-FR",
        "ja": "ja-JP",
        "ru": "ru-RU",
        "zh": "zh-CN",
        "de": "de-DE",
        "ko": "ko-KR",
        "hi": "hi-IN",
        "id": "id-ID",
        "vi": "vi-VN",
        "it": "it-IT",
    }
    for language, dirname in locale_dirs.items():
        directory = listings / dirname
        if not directory.exists():
            errors.append(f"Play listing missing {language}: {dirname}")
            continue
        for filename in expected_files:
            path = directory / filename
            if not path.exists() or not path.read_text(encoding="utf-8").strip():
                errors.append(f"Play listing {dirname}/{filename} missing or empty")
    return errors


def main() -> int:
    checks = {
        "android": check_android(),
        "apple": check_apple(),
        "windows": check_windows(),
        "play": check_play(),
    }
    errors = [f"{scope}: {error}" for scope, scope_errors in checks.items() for error in scope_errors]
    if errors:
        print("Localization coverage gaps:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Localization coverage check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
