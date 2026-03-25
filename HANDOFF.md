# HANDOFF

## Current Status

- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Quick Add now includes a lightweight token editor for small pre-save corrections to generated segments, including optional manual readings.
- Per-card MP3 upload is still available from both creation modes.
- Cards now support an optional per-card memo (`note`) field that is editable in create/edit flows.

## Latest Session Changes

- Memo drawer rendering is now tied to the card back side only: it never appears on the front side in either normal study or practice mode.
- When a card flips to the back and a memo exists, the memo drawer now auto-enters `peek` with a bottom-up animation.
- Memo close behavior was hardened so the drawer close control (`×`) reliably sets drawer state to `closed` without triggering card flip.
- Study card memo UI was refined from a modal-like overlay to a draggable bottom drawer with 3 states (`closed`, `peek`, `expanded`).
- Memo now opens to a readable peek height first, supports drag up/down snap transitions, and keeps more of the back passage visible for quick comparison.
- Memo interactions now consistently stop propagation to prevent accidental card flips while preserving existing audio button behavior and action-button layout rules.
- Study full-recall cards now include two session-local hint stages before flip: a first-character skeleton and a deterministic light reveal.
- Study review buttons now use three ratings: Again, Hard, and Good, while practice mode still ends with Finish Practice.
- Store scheduling now treats Hard as a softer success path that keeps the current level, while Again and Good still move difficulty down/up respectively.
- Create now includes an optional Memo textarea, Advanced JSON accepts optional `"note"`, and Edit JSON includes/supports optional `"note"`.
- Advanced JSON save now only persists memo from `parsed.note` (no fallback from Quick Add memo draft), preventing cross-tab memo leakage.
- Study card back now shows a Memo action only when note exists, opening a draggable bottom-drawer style sheet that prevents accidental flip while open.
- README was updated to document memo support in create/advanced flows and study back actions.
- Edit Card now has a dedicated Memo textarea so users can update notes without touching JSON; save prioritizes textarea content and falls back to JSON `note` when textarea is empty.

## Verification

- Run `npm run lint`
- Run `npm run build`

## Notes for the Next Session

- Memo drawer sizing is intentionally lightweight: it derives peek/expanded heights from card + viewport height and uses spring snapping for state transitions.
- Drag is currently started from the drawer handle to avoid scroll/drag conflicts with long memo content in expanded mode.
- Full-recall hint state is intentionally local to `Study.tsx`; do not persist it unless the level model is explicitly redesigned.
- The current 3-rating review policy is intentionally minimal: Again lowers level, Hard keeps level steady with a smaller interval bump, and Good advances as before.
- Reverse mode remains unchanged and still only applies at level 5; if recall difficulty is revisited later, evaluate the level model separately from the temporary hint UI.
- If study UX changes again, keep the screen mobile-first and avoid adding extra controls before validating that the hint/review flow is insufficient.
- Note normalization trims whitespace and stores empty notes as `undefined` for backward-compatible persistence.
- Edit form memo and JSON `note` can diverge in the UI; currently the dedicated memo field is treated as the primary source during save.
