# HANDOFF

## Current Status
- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Per-card MP3 upload is still available from both creation modes.

## Latest Session Changes
- Preserved blank lines in Quick Add Line mode by converting line tokens to `Segment[]` without dropping empty-string lines.
- Updated Quick Add Smart mode so tapping Smart re-enables suggested mode behavior on later language changes, and aligned the helper text with that state.
- README remains current; no content changes were required in this session.

## Verification
- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session
- If users want manual token adjustment next, the safest extension is a lightweight split/merge editor layered on top of the generated `Segment[]` preview.
- If segmentation quality needs improvement for Japanese or Chinese, enhance `src/lib/segmentText.ts` heuristics first without changing the storage model.
- If Create screen UX changes again, keep Quick Add mobile-first and avoid expanding the default flow into a developer-oriented editor.
