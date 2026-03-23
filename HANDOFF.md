# HANDOFF

## Current Status
- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Per-card MP3 upload is still available from both creation modes.

## Latest Session Changes
- Added `src/lib/segmentText.ts` with rule-based segmentation utilities for Word, Character, Line, and Smart modes.
- Updated `src/components/CreateItem.tsx` to introduce the two-tab create experience, language-based mode suggestions, live token preview, and shared audio upload handling.
- Updated `README.md` with a short explanation of Quick Add vs Advanced JSON.

## Verification
- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session
- If users want manual token adjustment next, the safest extension is a lightweight split/merge editor layered on top of the generated `Segment[]` preview.
- If segmentation quality needs improvement for Japanese or Chinese, enhance `src/lib/segmentText.ts` heuristics first without changing the storage model.
- If Create screen UX changes again, keep Quick Add mobile-first and avoid expanding the default flow into a developer-oriented editor.
