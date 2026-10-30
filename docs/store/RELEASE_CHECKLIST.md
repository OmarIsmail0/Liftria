# Store release metadata and screenshot checklist

The four localized listing files here contain copyable console fields. Remove Markdown headers and formatting before pasting.

| Field | Google Play | Apple App Store |
| --- | --- | --- |
| Name | 30 characters | 30 characters |
| Short description / subtitle | 80 characters | 30 characters |
| Full description | 4000 characters | 4000 characters |
| Promotional text | — | 170 characters |
| Keywords | — | 100 bytes |

## Screenshot routes — real application UI only

In an internal/dev build with `EXPO_PUBLIC_LIFTRIA_DEV_ROUTES=1`, open `liftria://dev/store-gallery?panel=eat&lang=en&appearance=light`. The gallery **redirects to real application screens**, never renders marketing cards. Direct entry `/dev/store/[panel]` uses the same redirect.

| Panel | Destination after opening the dev route | On-screen content |
| --- | --- | --- |
| `today` | `/dev/demo-diary?auto=1&view=today` → Today tab | Actual dashboard with bundled-food demo diary |
| `eat` | `/dev/demo-diary?auto=1` → Eat tab | Actual meal diary, foods from bundled Egyptian/USDA packs, three demo water glasses (read-only) |
| `train` | `/dev/demo-workout?auto=1` → active workout | Actual workout UI with two pack exercises and zero logged sets |
| `progress` | `/dev/demo-trends?auto=1&view=body` → Body | Actual trends chart; synthetic weights are visibly marked `Demo fixture` |
| `privacy` | `/settings/privacy` | Actual localized privacy page |
| `hiku` | `/dev/demo-hiku?auto=1` → Hiku review | Actual review UI with bundled food values, explicitly marked demo; Save disabled |

`lang=en|ar` and `appearance=light|dark` set the app's real language and theme preferences *before* redirecting. **For RTL screenshots, relaunch the app with Arabic device locale** if React Native requests a native direction restart; check the rendered screen rather than trusting query values alone.

**Fixture warning:** These are developer screenshot helpers, not isolated marketing screens. `demo-diary` adds missing food entries to the device's **local diary**; `demo-workout` starts or resumes a local session; `demo-trends` adds explicitly labeled synthetic weights and food entries. Use a clean disposable test installation, never personal user data, and reset app data between store screenshot sets. The Hiku demo makes **no API request and cannot Save**. Screenshot captures should use actual screen UI after navigation finishes, not the transient loading page.

Capture required iPhone and Android phone sizes from a running build. Never submit a screenshot of a developer setup page, a caption-only panel or an Android Health Connect screen as an iPhone feature. Compare light/dark, English/Arabic and device-safe-area results; remove misleading demo fixtures and follow the App Store's rule that screenshots show the app in use.

## Owner / Claude release gates
- Owner: configure `LIFTRIA_*` Android signing secrets according to `scripts/configure_release_signing.py`; Claude builds and verifies the signed release.
- Owner: provide Apple Developer membership for device builds and App Store submission, plus a working public support URL and privacy policy URL. Do not use invented URLs.
- Owner and Claude: check Hiku's user-triggered Anthropic processing, optional photo Beta, privacy disclosures, permissions, age/category questionnaires, local-first claim, and both localized store listings.
- Claude: verify the iOS light/dark app icon, Android adaptive icon, native splash appearances, and screenshots. Release builds have dev routes disabled.

Store guides: https://support.google.com/googleplay/android-developer/answer/9859152 and https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
