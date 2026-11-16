# Design pass v2

Status: steps 1 to 3 done (audit, design rules, mockup). **Waiting for the owner's approval
before any app code changes.**

- `mockup.html` (open in a browser from this folder): the audit findings, the v2 design rules
  and a clickable mockup of Today, Train, the workout, Eat, Progress and Settings, next to
  the current screens in `shots/`. Light/dark and English/Arabic toggles.
- `AUDIT.md`: the ranked findings (P1 to P3) as text.
- `.claude/skills/impeccable/`: the impeccable design review skill (Apache-2.0, upstream
  commit d41d986), installed review-only: SKILL.md and reference/ only. Its scripts folder
  (launcher, live mode, edit hook) is deliberately not installed.

## v2 rules in short
- Colours: neutral page and surface, one orange accent for actions, green/red for status,
  three macro colours for data only. Values are in the `.lv` block of `mockup.html`.
- Type: system font, six sizes (44 metric, 30 large title, 20 title, 16 body, 14 secondary,
  12 caption). No uppercase labels, no letter-spacing.
- Spacing 4/8/12/16/24/32, screen edge 16. Corners 8/12/16. Flat surfaces, no shadows on cards.
- Standard labelled tab bar, large-title headers, grouped lists for navigation.
- Removed: aurora gradients, glass, the orb, the capsule tab bar, title dots.

## Build order after approval
1 tokens and primitives, 2 navigation, 3 Today, 4 Train, 5 Eat, 6 Progress, 7 Hiku,
8 Settings and onboarding. One PR each, verified with emulator screenshots (light, dark, Arabic).
