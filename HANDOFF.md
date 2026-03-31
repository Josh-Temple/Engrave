# HANDOFF

## Current Status

- The Create screen now has two tabs: a default Quick Add flow for raw text entry and the existing Advanced JSON flow.
- Quick Add uses deterministic local segmentation and saves into the existing `Segment[]` data model, so study/review behavior remains unchanged.
- Quick Add now includes a lightweight token editor for small pre-save corrections to generated segments, including optional manual readings.
- Per-card MP3 upload is still available from both creation modes.
- Cards now support an optional per-card memo (`note`) field that is editable in create/edit flows.

## Latest Session Changes

- Improved Study back-side readability for memo cards:
  - On card flip to back, the screen is forced to scroll to top so users always start reading from the beginning.
  - Memo panel height was expanded to a tall, scrollable container (roughly card-sized) instead of the previous compact area.
- Improved Library navigation continuity:
  - Home (Library) now saves/restores scroll position via session storage, so returning from Edit or Practice returns users to their prior card-list position.

- Added two lightweight listening modes as auxiliary memorization support (without playlist architecture):
  - **Read & Listen**: full-text reading + per-card audio controls (play/pause, prev/next, repeat-one, speed 0.8/1.0/1.2/1.5).
  - **Listen**: continuous audio mode across current library order (play/pause, prev/next, loop-all, gap 0/1/2s, auto-skip no-audio cards).
- Added icon-based entry buttons in Library for these modes:
  - Book/audio icon for **Read & Listen**
  - Headphones icon for **Listen**
- Added new view wiring in `App.tsx` (`readListen` / `listen`) and a dedicated `ListeningModes` component.
- Read/listen text panel uses long-text-friendly independent scrolling for mobile readability.
- Audio session cleanup is handled on unmount (pause + timer cleanup) to reduce cross-screen playback leaks.

- Practice Mode card back now shows a top-right copy action that copies `source` + body text to clipboard.
- Clipboard payload intentionally strips ruby/furigana by joining only raw segment text.
- Fixed random-order study regression where flipping to back could reshuffle and switch cards before the user rated the current card.
- Random order is now generated once per due-set snapshot and reused for stable back-side review interaction.

- Library cards with attached audio now include a dedicated play/pause button in the action row, allowing direct audio preview from the card list.
- Settings screen audio auto-play switch alignment was corrected by updating the track/thumb layout so the toggle knob remains visually centered in both states.
- Study card memo drawer now explicitly enters from the bottom edge (`initial y = offscreen-bottom`) when opened on the back side.
- Library card action buttons were moved from the upper-right overlay to a dedicated bottom action row to prevent title overlap.
- Library now supports manual card ordering with per-card up/down controls.
- Added a new setting for normal study order: `Library order` (default) or `Random`.
- Study queue construction now honors the selected order mode (ordered due list vs shuffled due list).

- Study card memo drawer no longer auto-opens on card flip; on the back side it now starts hidden (`closed`) so rating buttons stay visible and memo is opt-in.
- Back-side memo controls were updated from memo/close semantics to explicit vertical arrows:
  - Card back action now uses up/down arrows with Show/Hide labels.
  - Drawer header now uses up/down arrow buttons for expand/collapse instead of the previous `×` close affordance.
- Memo drawer rendering is now tied to the card back side only: it never appears on the front side in either normal study or practice mode.
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

- Current listening modes intentionally reuse library order (`items`) as the playback sequence; there is no saved queue or playlist layer.
- `Listen` mode currently skips no-audio cards for playback navigation and auto-advance; `Read & Listen` keeps all cards navigable/readable and disables play when a card lacks audio.
- If “start from this card” is added later, thread an optional item ID into the listening view and initialize `currentIndex` from that ID.

- `settings.reviewOrder` is persisted in Zustand and normalized at hydration/import; any future settings additions should follow the same normalize pattern.
- Random mode currently shuffles due cards client-side for each due-card set snapshot; ordered mode strictly follows the Library list order.
- Card reordering is currently done with up/down controls; if drag-and-drop is added later, preserve the same `items` array ordering contract so study order remains predictable.

- Memo drawer sizing is intentionally lightweight: it derives peek/expanded heights from card + viewport height and uses spring snapping for state transitions.
- Drag is currently started from the drawer handle to avoid scroll/drag conflicts with long memo content in expanded mode.
- Full-recall hint state is intentionally local to `Study.tsx`; do not persist it unless the level model is explicitly redesigned.
- The current 3-rating review policy is intentionally minimal: Again lowers level, Hard keeps level steady with a smaller interval bump, and Good advances as before.
- Reverse mode remains unchanged and still only applies at level 5; if recall difficulty is revisited later, evaluate the level model separately from the temporary hint UI.
- If study UX changes again, keep the screen mobile-first and avoid adding extra controls before validating that the hint/review flow is insufficient.
- Note normalization trims whitespace and stores empty notes as `undefined` for backward-compatible persistence.
- Edit form memo and JSON `note` can diverge in the UI; currently the dedicated memo field is treated as the primary source during save.

## Session Update (2026-03-28, Supabase Audio Storage)

- Implemented Supabase Storage support for audio upload flow only.
- Added `src/lib/supabase.ts` with browser client initialization from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Replaced `prepareSupabaseAudio()` stub in `src/lib/audioStorage.ts` with real upload + public URL retrieval from bucket `card-audio`.
- Kept local audio mode behavior unchanged (`VITE_AUDIO_STORAGE_MODE=local`).
- Updated README with env vars and setup notes for `VITE_AUDIO_STORAGE_MODE=supabase` and public bucket requirements.
- No Auth, DB schema, Edge Functions, or sync features were added in this session.

## Session Update (2026-03-28, Setup/Docs Polish)

- Updated `.env.example` with Supabase audio-mode variables:
  - `VITE_AUDIO_STORAGE_MODE` (default `local`)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Added comments clarifying Supabase is used for audio file storage only.
- Expanded README local setup instructions with optional Supabase env configuration.
- Expanded Vercel deploy instructions to explicitly list Supabase-related env vars for `supabase` audio mode.
- Added a compact Supabase troubleshooting checklist (bucket existence, public bucket, env vars, redeploy after env changes).
- No architecture or runtime behavior changes; this session is docs/setup polish only.
- Small runtime-safe polish: `src/lib/supabase.ts` now lazy-loads the Supabase SDK at call time and caches the client, preserving local mode behavior in environments where the SDK is unavailable until explicitly needed.
- Small UI fix: `ItemCard` now consistently uses `audioUrl || audioDataUrl` for MP3 indicator and preview playback, fixing a missing-variable TypeScript error and supporting both legacy/new audio fields.

## Session Update (2026-03-28, Supabase Audio Final Verification)

- Re-verified repository integration for audio-only Supabase Storage mode without expanding scope to Auth/DB/sync features.
- Confirmed `@supabase/supabase-js` is present in dependencies and `src/lib/supabase.ts` initializes from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Confirmed `src/lib/audioStorage.ts` switches behavior via `VITE_AUDIO_STORAGE_MODE`, uploading MP3 files to the `card-audio` bucket in Supabase mode and returning a public URL.
- Confirmed local mode (`VITE_AUDIO_STORAGE_MODE=local`) remains available and unchanged.
- Validation commands completed successfully: `npm run lint` and `npm run build`.
- No Supabase SQL, bucket strategy, Auth, signed URL, or sync architecture changes were made.

## Session Update (2026-03-28, Supabase Upload Troubleshooting Docs)

- Updated README Supabase troubleshooting with a missing but critical note: **public bucket alone does not grant browser upload** when Storage RLS blocks `anon`.
- Added a minimal SQL policy example for `storage.objects` insert access scoped to bucket `card-audio`.
- Added guidance for common upload failure symptom (`row-level security policy` error) and note about optional update policy for overwrite use cases.
- No runtime behavior changes in app code; this session is documentation-only to reduce setup mistakes during Supabase upload configuration.

## Session Update (2026-03-28, Supabase Setup Ownership Clarification)

- Expanded README with a new **Setup Ownership (Who does what)** section to clearly separate dashboard tasks (user-side) from behavior already implemented in app code.
- Added a short **Quick Verification Steps** checklist to validate bucket visibility, policy setup, env vars, and upload behavior in order.
- No runtime code changes; docs-only clarification update.

## Session Update (2026-03-28, Supabase Upload Client Dependency Removal)

- Reworked `src/lib/supabase.ts` to use direct Supabase Storage REST calls (`fetch`) instead of importing `@supabase/supabase-js`.
- This removes the runtime/dev dependency on the Supabase JS package and resolves browser errors like `Failed to resolve module specifier "@supabase/supabase-js"` in restricted environments.
- Kept the existing `getSupabaseClient().storage.from(...).upload/getPublicUrl` interface shape so `audioStorage.ts` behavior and call sites remain unchanged.
- Removed `@supabase/supabase-js` from `package.json` dependencies.

## Session Update (2026-03-28, Production Module Resolution / SW Cache Hardening)

- Hardened `public/sw.js` runtime caching strategy:
  - bumped cache versions to invalidate old runtime entries
  - changed JS/CSS/worker code asset handling to network-first (with cache fallback) instead of cache-first
  - kept lightweight offline behavior for non-code same-origin GET assets
- Updated README PWA notes with the new cache behavior and a one-time user recovery step (clear old service worker/site data if stale modules were previously cached).

## Session Update (2026-03-28, Security Hardening + Refactor)

- Added `src/lib/textSafety.ts` to centralize text normalization/sanitization helpers used across persistence and rendering paths.
- Hardened store writes/reads (`addItem`, `updateItem`, backup import, hydration) to normalize source/note fields and reject invalid segment payloads before persistence.
- Mitigated ruby-markup XSS risk in study rendering by escaping segment text/reading values before composing `<ruby><rt>` HTML strings consumed by markdown.
- Refactored duplicated Flashcard markdown rendering into a small shared `CardMarkdown` helper component for maintainability.

## Session Update (2026-03-28, Random Study Loop Fix)

- Fixed a Study-mode regression where `reviewOrder = random` could reshuffle due cards on repeated renders.
- Root cause: randomization effect depended on a freshly-created due-items array each render, causing repeated `setState` and card remount loops.
- `src/components/Study.tsx` now derives stable randomization input from `dueKey` (ID signature) and shuffles `listedDueItemIds` generated from that stable key.
- Result: random order remains stable for the current due-set snapshot, and learning-mode card display no longer loops endlessly.

## Session Update (2026-03-29, Memo/Review Layout Adjustment)

- Adjusted Study back-side layout so review actions are positioned directly below the card body for memo cards as well.
- Moved memo content display out of the in-card draggable drawer to a dedicated panel in the lower section (below review/finish actions).
- Added a back-side memo control behavior that toggles whether this lower memo panel is raised upward (closer to the card) or lowered (default position beneath actions).
- Wired `Flashcard` → `Study` state via `onFlipChange` and `onMemoToggle` so memo panel visibility/position follows card side and user toggle actions.

## Session Update (2026-03-29, Card Flip Compatibility Fix)

- Fixed a regression where some mobile/webview environments could fail to render the card back after flip in both Study and Practice modes.
- Updated 3D card utility CSS (`perspective`, `transform-style`, `backface-visibility`, `rotateY`) to include WebKit-prefixed properties for broader browser compatibility.
- No review logic/state changes; this is a rendering compatibility fix only.

## Session Update (2026-03-29, Card Back Not Visible Root-Cause Fix)

- Investigated a persistent “flip animation starts but back side never appears” failure on touch devices/webviews.
- Root cause: 3D rotation was driven through `framer-motion` `rotateY` animation, which is known to be unreliable in some WebKit/webview GPU composition paths even when utility classes set `preserve-3d`/`backface-visibility`.
- Fix: replaced card-flip transform animation in `src/components/Card.tsx` with explicit inline CSS 3D transform + transition (`transform`/`WebkitTransform`, `transformStyle`/`WebkitTransformStyle`) on the rotating container.
- Kept all existing study/practice state behavior unchanged (`onFlip`, `onFlipChange`, reset behavior, memo/audio controls).
- Verified with `npm run lint` and `npm run build`.

## Session Update (2026-03-29, Flip Reset Regression Fix)

- Reproduced a severe tap-flip defect where the card appeared to start rotating but immediately returned to the front, so the back never stayed visible.
- Root cause: `Flashcard` reset effect depended on both `resetKey` and `onFlipChange`; in `Study`, `onFlipChange` is an inline callback recreated every render, so any parent re-render re-triggered the reset effect and forced `flipped=false`.
- Fix: in `src/components/Card.tsx`, added a ref to track the latest `onFlipChange` and changed the reset effect to depend on `resetKey` only. This preserves intended resets while preventing accidental reset loops from callback identity changes.
- Result: tap/flip now keeps back face visible as expected while existing reset flows (card change/hint-stage reset) remain intact.
- Verified with `npm run lint` and `npm run build`.
