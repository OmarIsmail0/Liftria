#!/usr/bin/env sh
# Wraps the prototype fragments in src/ into standalone pages viewable from a file or any static host.
set -eu
cd "$(dirname "$0")"
for f in src/*.html; do
  out="$(basename "$f")"
  { printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'; cat "$f"; printf '\n</body>\n</html>\n'; } > "$out"
done
