#!/usr/bin/env bash
# Installs a Liftria APK on the running emulator and screenshots every hidden primitive story
# in dark and light mode. Usage: visual-check.sh <apk> <out-dir>
set -uo pipefail
APK="$1"; OUT="$2"; PKG="com.liftria.diagnostics"
STORIES="screen header card button chip banner snackbar sheet stepper toggle field list-row empty-state skeleton orb capsule-nav"
mkdir -p "$OUT"
adb wait-for-device
adb install -r -g "$APK" || { echo "::error::APK install failed"; exit 1; }
shot() { # mode name deep-link
  adb shell am force-stop "$PKG"
  adb shell am start -W -a android.intent.action.VIEW -d "$3" "$PKG" >/dev/null
  sleep 6
  adb exec-out screencap -p > "$OUT/$1-$2.png" || echo "::warning::screenshot $1-$2 failed"
}
for mode in dark light; do
  if [ "$mode" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  sleep 2
  shot "$mode" index "liftria://dev/primitives"
  for id in $STORIES; do shot "$mode" "$id" "liftria://dev/primitives/$id"; done
done
ls -la "$OUT"
