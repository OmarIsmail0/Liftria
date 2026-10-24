#!/usr/bin/env bash
# Installs a Liftria APK on the running emulator and screenshots the app's screens and every
# hidden primitive story in dark and light mode. Usage: visual-check.sh <apk> <out-dir>
set -uo pipefail
APK="$1"; OUT="$2"
# App screens as "<shot name>=<route>"; routes that don't exist yet just show Expo Router's
# not-found page, so this list can run ahead of the build.
SCREENS="app-today=today app-train=train app-eat=eat app-progress=progress app-health=progress/health app-hiku=hiku app-settings=settings app-appearance=settings/appearance on-1-welcome=onboarding/welcome on-2-privacy=onboarding/privacy on-3-profile=onboarding/profile on-4-goal=onboarding/goal on-5-target=onboarding/target on-6-health=onboarding/health on-7-watch=onboarding/watch on-8-hiku=onboarding/hiku on-9-done=onboarding/done he-steps=progress/health-detail?metric=steps he-heart=progress/health-detail?metric=heart-rate he-permissions=progress/health-permissions he-sync=progress/health-sync he-troubleshoot=progress/health-troubleshoot"
STORIES="screen header card button chip banner snackbar sheet stepper toggle field list-row empty-state skeleton orb capsule-nav"
mkdir -p "$OUT"
adb wait-for-device
adb install -r -g "$APK" || { echo "::error::APK install failed"; exit 1; }
# The app id changes in TASK-4 (com.liftria.diagnostics -> com.liftria.app); find whichever is installed.
PKG=$(adb shell pm list packages | tr -d '\r' | sed -n 's/^package:\(com\.liftria\..*\)$/\1/p' | head -n1)
test -n "$PKG" || { echo "::error::No com.liftria.* package installed"; exit 1; }
echo "Package: $PKG"
adb shell getprop ro.product.cpu.abilist > "$OUT/abilist.txt"
adb logcat -c
shot() { # mode name deep-link
  adb shell am force-stop "$PKG"
  adb shell am start -W -a android.intent.action.VIEW -d "$3" "$PKG" >/dev/null
  sleep 6
  adb exec-out screencap -p > "$OUT/$1-$2.png" || echo "::warning::screenshot $1-$2 failed"
}
for mode in dark light; do
  if [ "$mode" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  sleep 2
  for entry in $SCREENS; do shot "$mode" "${entry%%=*}" "liftria://${entry#*=}"; done
  shot "$mode" index "liftria://dev/primitives"
  for id in $STORIES; do shot "$mode" "$id" "liftria://dev/primitives/$id"; done
done
# Crash diagnostics: the app's fatal errors, if any, for the PR author and reviewer.
adb logcat -d -b crash > "$OUT/logcat-crash.txt" 2>/dev/null || true
adb logcat -d '*:E' | tail -n 400 > "$OUT/logcat-errors.txt" || true
if grep -q "FATAL EXCEPTION\|Fatal signal" "$OUT/logcat-crash.txt" "$OUT/logcat-errors.txt" 2>/dev/null; then echo "::warning::The app crashed on the emulator; see logcat-crash.txt"; fi
ls -la "$OUT"
