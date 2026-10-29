# Store release metadata and screenshot checklist

The four localized listing files here contain copyable console fields. Remove Markdown headers and formatting before pasting.

| Field | Google Play | Apple App Store |
| --- | --- | --- |
| Name | 30 characters | 30 characters |
| Short description / subtitle | 80 characters | 30 characters |
| Full description | 4000 characters | 4000 characters |
| Promotional text | — | 170 characters |
| Keywords | — | 100 bytes |

## Screenshot routes
Open an internal/dev build compiled with `EXPO_PUBLIC_LIFTRIA_DEV_ROUTES=1` and navigate to `liftria://dev/store-gallery?panel=today&lang=en&appearance=light`. Panels: `today`, `eat`, `train`, `progress`, `privacy`, `hiku`. Change `lang=en|ar` and `appearance=light|dark` to capture each localization and appearance. These screenshots deliberately show **feature previews and no fabricated user or medical measurements**. They never save demo entries, call Anthropic or request Health permissions. Complement them with real in-app device screenshots from explicitly seeded demo fixtures if the store guidelines require real product UI, and review before publishing.

Capture the required iPhone device sizes in App Store Connect and phone sizes in Google Play Console. Do not represent Android Health Connect screens as iOS health integrations. Verify actual release artwork on native builds: Expo Go cannot prove native icon/splash rendering.

## Owner / Claude release gates
- Owner: configure `LIFTRIA_*` Android signing secrets according to `scripts/configure_release_signing.py`; Claude builds and verifies the signed release.
- Owner: provide Apple Developer membership for device builds and App Store submission, plus a working public support URL and privacy policy URL. Do not use invented URLs.
- Owner and Claude: check Hiku's user-triggered Anthropic processing, optional photo Beta, privacy disclosures, permissions, age/category questionnaires, local-first claim, and both localized store listings.
- Claude: verify the iOS light/dark app icon, Android adaptive icon, native splash appearances, and screenshots. Release builds have dev routes disabled.

Store guides: https://support.google.com/googleplay/android-developer/answer/9859152 and https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
