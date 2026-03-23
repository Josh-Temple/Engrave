# HANDOFF

## Current Status

- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Quick Add now includes a lightweight token editor for small pre-save corrections to generated segments, including optional manual readings.
- Per-card MP3 upload is still available from both creation modes.

## Latest Session Changes

- Study full-recall cards now include two session-local hint stages before flip: a first-character skeleton and a deterministic light reveal.
- Study review buttons now use three ratings: Again, Hard, and Good, while practice mode still ends with Finish Practice.
- Store scheduling now treats Hard as a softer success path that keeps the current level, while Again and Good still move difficulty down/up respectively.
- README was updated to document the Study hint flow and the 3-button review ratings.

## Verification

- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session

- Full-recall hint state is intentionally local to `Study.tsx`; do not persist it unless the level model is explicitly redesigned.
- The current 3-rating review policy is intentionally minimal: Again lowers level, Hard keeps level steady with a smaller interval bump, and Good advances as before.
- Reverse mode remains unchanged and still only applies at level 5; if recall difficulty is revisited later, evaluate the level model separately from the temporary hint UI.
- If study UX changes again, keep the screen mobile-first and avoid adding extra controls before validating that the hint/review flow is insufficient.
