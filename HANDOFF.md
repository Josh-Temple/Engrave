# HANDOFF

## Current Status
- The Vercel deployment setup is ready via `vercel.json`.
- Settings already include backup/restore actions and audio playback preferences.
- Study cards now keep long content in an independently scrollable area so users can read the full text without clipping.

## Latest Session Changes
- Updated the flashcard front/back layout to use a dedicated scroll container with `min-h-0`, `overflow-y-auto`, and preserved vertical centering for shorter content.
- Kept the card header and optional audio button fixed while only the text region scrolls.
- Updated the README to mention the long-text scrolling improvement.

## Verification
- `npm run lint`
- `npm run build`

## Notes for the Next Session
- If additional readability tuning is needed, review `src/components/Card.tsx` first because both the study and practice experiences share that component.
- For UI changes, continue following `DESIGN_GUIDELINES.md`.
- If a visual validation artifact is required later, use the browser screenshot flow when that tool is available in the environment.
