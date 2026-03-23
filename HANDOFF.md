# HANDOFF

## Current Status
- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Quick Add now includes a lightweight token editor for small pre-save corrections to generated segments.
- Per-card MP3 upload is still available from both creation modes.

## Latest Session Changes
- Added a minimal Quick Add token editor that appears below Preview when generated segments exist.
- Token editor v1 supports single-token selection, edit text, split, merge left/right, an Edited badge, and reset-to-generated behavior.
- Quick Add save now uses the editable token list instead of re-running segmentation at save time.
- README was updated to document the new token editing step in Quick Add.

## Verification
- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session
- If users want a richer correction flow next, keep the editor lightweight and consider only small upgrades such as better newline/space editing affordances or preserving readings during split operations.
- If segmentation quality needs improvement for Japanese or Chinese, enhance `src/lib/segmentText.ts` heuristics first without changing the storage model.
- If Create screen UX changes again, keep Quick Add mobile-first and avoid expanding the default flow into a developer-oriented editor.
