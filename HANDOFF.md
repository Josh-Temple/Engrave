# HANDOFF

## Current Status

- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Quick Add now includes a lightweight token editor for small pre-save corrections to generated segments, including optional manual readings.
- Per-card MP3 upload is still available from both creation modes.

## Latest Session Changes

- Added a minimal Quick Add token editor that appears below Preview when generated segments exist.
- Token editor v1 now supports single-token selection, edit text, manual reading add/edit/clear, split, merge left/right, an Edited badge, and reset-to-generated behavior.
- Quick Add save continues to use the editable token list, now preserving optional `Segment[1]` readings when present.
- Token chips show a subtle dot when a reading is attached, and newline tokens disable the reading input.
- README was updated to document Quick Add reading support and its deterministic split/merge behavior.

## Verification

- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session

- Quick Add reading rule for this session: splitting a token clears readings on both resulting tokens; merging adjacent tokens clears the merged reading. This is intentional v1 safety behavior and should stay documented unless replaced with a smarter proven approach.
- If users want a richer correction flow next, keep the editor lightweight and consider only small upgrades such as better newline/space editing affordances or focused reading UX polish.
- If segmentation quality needs improvement for Japanese or Chinese, enhance `src/lib/segmentText.ts` heuristics first without changing the storage model.
- If Create screen UX changes again, keep Quick Add mobile-first and avoid expanding the default flow into a developer-oriented editor.
