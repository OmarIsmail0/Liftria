#!/usr/bin/env python3
"""Patch an Expo SDK 57 GENERATED build.gradle for a trusted signed release.

This code never reads, stores or prints secret values. Gradle reads the four environment
variables during its own process. Git ignores android/, so no credentials are committed.
Do not run this helper for PR builds; the default release uses the Android debug key.
"""
from __future__ import annotations

import os
from pathlib import Path
import re
import sys

REQUIRED = (
    "LIFTRIA_SIGNING_KEYSTORE",
    "LIFTRIA_KEYSTORE_PASSWORD",
    "LIFTRIA_KEY_ALIAS",
    "LIFTRIA_KEY_PASSWORD",
)

RELEASE_CONFIG = """        liftriaRelease {
            storeFile file(System.getenv('LIFTRIA_SIGNING_KEYSTORE'))
            storePassword System.getenv('LIFTRIA_KEYSTORE_PASSWORD')
            keyAlias System.getenv('LIFTRIA_KEY_ALIAS')
            keyPassword System.getenv('LIFTRIA_KEY_PASSWORD')
        }
"""


def apply_release_signing(source: str) -> str:
    """Fail closed when a different Expo template would make the patch ambiguous."""
    marker = "    signingConfigs {\n"
    if source.count(marker) != 1 or "liftriaRelease" in source:
        raise ValueError("Unexpected Gradle signing block; refusing to guess")

    start = source.find("        release {\n")
    end = source.find("    packagingOptions {", start)
    if start == -1 or end == -1:
        raise ValueError("Expected generated release buildType was not found")

    release_block = source[start:end]
    original = "            signingConfig signingConfigs.debug"
    if release_block.count(original) != 1:
        raise ValueError("Expected exactly one release debug-signing line")

    source = source.replace(marker, marker + RELEASE_CONFIG, 1)
    start = source.find("        release {\n")
    end = source.find("    packagingOptions {", start)
    block = source[start:end].replace(
        original, "            signingConfig signingConfigs.liftriaRelease", 1
    )
    return source[:start] + block + source[end:]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: configure_release_signing.py android/app/build.gradle")
    # A missing environment value is an ERROR, never a cue to release an APK under
    # another certificate after a signing configuration was explicitly requested.
    if any(not os.environ.get(key) for key in REQUIRED):
        raise SystemExit("Release signing was requested but credentials are missing")
    target = Path(sys.argv[1])
    content = target.read_text(encoding="utf-8")
    replacement = apply_release_signing(content)
    target.write_text(replacement, encoding="utf-8")
    print("Generated Android release Gradle buildType uses the trusted keystore")


if __name__ == "__main__":
    main()
