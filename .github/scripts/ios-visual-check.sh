#!/usr/bin/env bash
# Installs the simulator build on a fresh iPhone simulator and screenshots the screens the iPhone
# work touches, in light and dark, then in Arabic (dark). Usage: ios-visual-check.sh <Liftria.app> <out-dir>
# Routes come from visual-check.sh's SCREENS list, so both platforms shoot the same deep links.
set -uo pipefail
APP="$1"; OUT="$2"; BUNDLE=com.liftria.app
mkdir -p "$OUT"
SCREENS=$(sed -n 's/^SCREENS="\(.*\)"$/\1/p' "$(dirname "$0")/visual-check.sh")
test -n "$SCREENS" || { echo "::error::No SCREENS list in visual-check.sh"; exit 1; }
IOS_SCREENS="app-today app-train app-eat app-progress app-health app-hiku app-settings on-2-privacy on-6-health on-7-watch he-steps he-heart he-permissions he-sync he-troubleshoot st-data st-backup st-profile st-hiku-key hk-describe hk-photo hk-photo-demo tr-demo tr-active tr-superset eat-portion eat-custom"
AR_SCREENS="app-today app-health on-6-health on-7-watch he-steps st-data hk-photo tr-active eat-portion"

TYPE=$(xcrun simctl list devicetypes | sed -n 's/^\(iPhone [0-9][0-9]* Pro\) (\(.*\))$/\2/p' | tail -n1)
RUNTIME=$(xcrun simctl list runtimes available | sed -n 's/^iOS .* - \(com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9-]*\)$/\1/p' | tail -n1)
test -n "$TYPE" && test -n "$RUNTIME" || { echo "::error::No iPhone Pro simulator or iOS runtime"; exit 1; }
echo "Simulator: $TYPE on $RUNTIME"
DEV=$(xcrun simctl create liftria-check "$TYPE" "$RUNTIME")

boot() {
  xcrun simctl boot "$DEV"; xcrun simctl bootstatus "$DEV" -b >/dev/null
  xcrun simctl status_bar "$DEV" override --time 9:41 --batteryState charged --batteryLevel 100 || true
}
install_fresh() { # a first launch, as on a new phone
  xcrun simctl uninstall "$DEV" "$BUNDLE" >/dev/null 2>&1 || true
  xcrun simctl install "$DEV" "$APP" || { echo "::error::App install failed"; exit 1; }
  xcrun simctl launch "$DEV" "$BUNDLE" >/dev/null; sleep 12
}
shot() { # mode name deep-link
  xcrun simctl terminate "$DEV" "$BUNDLE" >/dev/null 2>&1 || true
  xcrun simctl openurl "$DEV" "$3" || echo "::warning::openurl $3 failed"
  sleep 7
  xcrun simctl io "$DEV" screenshot "$OUT/ios-$1-$2.png" >/dev/null || echo "::warning::screenshot $1-$2 failed"
}
route() { for entry in $SCREENS; do [ "${entry%%=*}" = "$1" ] && { echo "${entry#*=}"; return; }; done; }

boot
install_fresh
for mode in light dark; do
  xcrun simctl ui "$DEV" appearance "$mode"; sleep 2
  for name in $IOS_SCREENS; do r=$(route "$name"); [ -n "$r" ] && shot "$mode" "$name" "liftria://$r"; done
done

# Arabic: the app's language follows the system, and right to left applies from the first launch.
xcrun simctl spawn "$DEV" defaults write -g AppleLanguages -array ar
xcrun simctl spawn "$DEV" defaults write -g AppleLocale ar_EG
xcrun simctl shutdown "$DEV"; boot
install_fresh
xcrun simctl ui "$DEV" appearance dark; sleep 2
for name in $AR_SCREENS; do r=$(route "$name"); [ -n "$r" ] && shot ar-dark "$name" "liftria://$r"; done

# Crash reports for the app, if any.
find ~/Library/Logs/DiagnosticReports -iname '*Liftria*' -newer "$APP" -print -exec cp {} "$OUT"/ \; 2>/dev/null \
  | sed 's/^/crash report: /' > "$OUT/ios-crashes.txt" || true
[ -s "$OUT/ios-crashes.txt" ] && echo "::warning::The app crashed on the iPhone simulator; see ios-crashes.txt"
xcrun simctl shutdown "$DEV" || true; xcrun simctl delete "$DEV" || true
ls -la "$OUT"
