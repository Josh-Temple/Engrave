<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/86ce453c-2675-426a-b05a-039e7ba8fe20

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3. (Optional, audio only) Configure Supabase audio storage in `.env.local`:
   - `VITE_AUDIO_STORAGE_MODE=supabase`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
4. Run the app:
   `npm run dev`

> Note: Supabase integration is audio-file storage only. Card content and review data remain local-first in browser storage.

## Deploy to Vercel

This repo now includes a `vercel.json` configured for a Vite SPA build (`dist`) with SPA rewrites.

1. Import this repository in Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` (for production, and preview/development if needed)
   - `VITE_AUDIO_STORAGE_MODE` (`local` or `supabase`)
   - `VITE_SUPABASE_URL` (required when `VITE_AUDIO_STORAGE_MODE=supabase`)
   - `VITE_SUPABASE_ANON_KEY` (required when `VITE_AUDIO_STORAGE_MODE=supabase`)
3. If using Supabase audio mode, create a Storage bucket named `card-audio` and set it to **public**.
4. Deploy (or redeploy after any environment variable change).

Vercel will use:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Create Flow

- **Quick Add** is the default path for creating cards from raw text without writing JSON.
- Choose a language, pick a segmentation mode (**Word**, **Character**, **Line**, or **Smart**), preview the generated tokens, lightly adjust them in the built-in token editor, optionally attach MP3 audio, and save.
- Quick Add now also supports an optional **Memo** field for supplementary context (translation, interpretation, etc.).
- The Quick Add token editor is intentionally minimal: tap a token to **edit** text, manually add or clear an optional **reading** (ruby / pinyin), **split**, **merge left/right**, or **reset to the generated result** before saving.
- Readings continue to use the existing `Segment = [text, reading?]` model. For safety, split operations clear readings on both resulting tokens, and merge operations clear the merged reading instead of guessing.
- **Advanced JSON** keeps the existing power-user flow for pasting structured segment data or using the AI prompt/template, and now accepts optional `"note"` in the JSON payload.

## Data Safety

- App data is persisted in-browser with Zustand persistence.
- The storage key is now kept stable and hydration includes normalization/migration safeguards for future schema changes.
- Segment/source data is now normalized on create, edit, import, and hydration to reject malformed payloads and trim optional text fields before persistence.
- Study card ruby rendering now escapes segment text/reading content before injecting markup, mitigating script-injection vectors when using raw markdown rendering for ruby tags.
- In **Settings**, you can now:
  - **Download backup** as JSON
  - **Restore backup** from a previously exported JSON file
- Recommended: export a backup before large updates or before switching browsers/devices.

## PWA Support

- Engrave now includes a web app manifest, an SVG-based install icon, and a registered service worker for offline-friendly caching.
- On supported browsers, you can install it to your home screen / desktop and reopen the app in a standalone window.
- The offline experience caches the app shell and previously requested same-origin assets. To keep the PR text-only, the current icon setup uses SVG assets instead of committed PNG binaries.
- Service worker runtime caching intentionally avoids JavaScript/CSS/worker code assets and fetches them network-first to reduce stale-build/module mismatch issues after deployments.
- If you installed an older PWA build and see module-load errors after deploy, clear site storage / unregister the service worker once, then reload.

## Handoff

- 引き継ぎ情報は `HANDOFF.md` を参照してください。
- UI・デザイン変更時は `DESIGN_GUIDELINES.md` を必ず確認してください。

## Audio per Card

- You can now attach an **MP3** audio file to each card during creation/edit.
- Audio uploads now include a size guard for local-storage safety (current threshold: **700KB** per file). If exceeded, the UI shows guidance instead of attempting a save that is likely to hit browser storage quota.
- Audio processing now goes through `src/lib/audioStorage.ts`, which centralizes provider selection (`VITE_AUDIO_STORAGE_MODE`) so future migration from local Data URL storage to Supabase Storage can be implemented in one place.
- The data model now keeps an `audioUrl` field (while preserving `audioDataUrl` compatibility) to simplify a later switch to remote URL-based storage.
- The Edit Card screen now includes a dedicated **Memo** textarea so memo updates do not require direct JSON editing.
- Study cards now keep their content area independently scrollable, so long passages can be read fully without clipping.
- On the study card back side, a **Play Audio** button is shown when audio exists.
- Memo is hidden while the card front is visible. When the study card back is shown, memo content appears in the lower section beneath answer/finish actions by default.
- Memo controls use up/down arrows, and tapping the card-back memo control raises/lowers the memo panel to bring it closer to the card text when needed.
- When a card is flipped to the back side, the screen now auto-scrolls to the top to keep the reading start position stable.
- Memo panel height on the back side is now expanded to a tall scrollable area (roughly card-sized) for easier long-note reading.
- Returning to the Library from Edit or Practice now restores your previous Library scroll position.
- In **Settings**, you can choose between:
  - Manual playback (default)
  - Auto-play when the card back is shown
- Library now includes two icon-based listening entry points:
  - **Read & Listen** (book/audio icon)
  - **Listen** (headphones icon)
- **Read & Listen** mode is designed for reading full card text while replaying attached audio with:
  - play/pause, previous/next card
  - repeat-one toggle
  - speed control (0.8x / 1.0x / 1.2x / 1.5x)
  - long-text-friendly independent scroll area
- **Listen** mode is designed for continuous passive listening over the current library order with:
  - play/pause, previous/next
  - loop-all toggle
  - inter-card gap (0s / 1s / 2s)
  - automatic skip of cards without audio
- Non-goals for these modes (intentionally not implemented):
  - playlist creation/saving/reordering
  - waveform/sync highlighting
  - background-audio optimization beyond normal browser behavior

> Note: Audio files are stored in local browser storage as Data URLs. Very large files may exceed storage limits.

### Supabase Storage (Audio Only)

- You can switch audio storage to Supabase by setting `VITE_AUDIO_STORAGE_MODE=supabase`.
- Required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Create a **public** Supabase Storage bucket named `card-audio` before uploading.
- In Supabase mode, uploaded MP3 files are stored in `card-audio` and `audioUrl` is saved as a public URL.
- This integration affects **audio file storage only**. Card content, review history, and other app data remain local-first in browser storage.

#### Troubleshooting Supabase Audio Uploads

- If uploads fail, confirm the `card-audio` bucket exists in your Supabase project.
- Confirm the `card-audio` bucket is set to **public**.
- Confirm Storage RLS policies allow `anon` upload to `card-audio` (public bucket alone is not enough for browser uploads).
- In Supabase SQL Editor, you can use this minimal upload policy:

```sql
create policy "Allow anon upload to card-audio"
on storage.objects
for insert
to anon
with check (bucket_id = 'card-audio');
```

- If you also need to overwrite existing paths in the future, add an `update` policy for the same bucket.
- If you see an error mentioning `row-level security policy`, it usually means the upload policy above is missing or too strict.
- Confirm Vercel environment variables are set (`VITE_AUDIO_STORAGE_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Confirm you redeployed after changing environment variables in Vercel.
- If you still see stale module-resolution errors after deploying or switching storage mode, hard refresh and (for installed PWA users) unregister the old service worker once, then reload.

#### Setup Ownership (Who does what)

- **You (project owner) do this in Supabase/Vercel dashboards:**
  - Set `VITE_AUDIO_STORAGE_MODE=supabase`
  - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Create `card-audio` bucket and mark it public
  - Add Storage RLS upload policy for `anon`
- **This app code already does:**
  - Upload MP3 files to `card-audio` when `VITE_AUDIO_STORAGE_MODE=supabase`
  - Store returned public URL into `audioUrl`
  - Keep card/review data local-first in browser storage

#### Quick Verification Steps

1. Open Supabase → **Storage** → confirm bucket `card-audio` exists and is public.
2. Open Supabase → **SQL Editor** → run the `insert` policy SQL above.
3. In app `.env.local`, set `VITE_AUDIO_STORAGE_MODE=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
4. Restart dev server (`npm run dev`) or redeploy if on Vercel.
5. Upload a small MP3 from Create/Edit screen.
6. If it fails with RLS-related text, revisit step 2; if it fails with missing env text, revisit step 3.

## Study Flow

- Lower study levels still use deterministic cloze blanks, while full-recall cards now offer two optional pre-flip hints: a first-character skeleton and a light token reveal.
- Full-recall hints are session-local UI only; the persisted `level` model remains 0-5 with reverse mode still at level 5.
- Review now uses three ratings after flip: **Again**, **Hard**, and **Good**. Hard keeps the current prompt difficulty while applying a smaller interval increase than Good.
- In **Settings**, normal study order can now be switched between **Library order** and **Random**.
- Random order in Study mode is now snapshotted per due-list state, preventing repeated reshuffles/re-renders while reviewing a card.
- In **Practice Mode**, the back side now shows a copy icon at the top-right; tapping it copies `source + plain body text` (without ruby/furigana readings) to the clipboard.
- Random study order behavior on the back side now keeps the current card stable so rating buttons can be used correctly after flip.
- Card flip rendering now uses explicit CSS 3D transforms (with WebKit-prefixed style fields) inside the card component so mobile/webview browsers that struggled with Framer Motion `rotateY` still reliably show the back face.
- Fixed a tap-flip regression where the card state could reset to front immediately after a flip because a reset effect depended on a changing callback reference (`onFlipChange`). The reset now depends only on `resetKey`, so back-side visibility remains stable after tap/flip.

## Library Improvements

- Card action icons (practice / edit / delete) were moved to each card’s lower action row to avoid overlapping long titles.
- Library cards can now be reordered manually using up/down controls, and this order is used for non-random study sessions.
- Cards with attached audio now show a dedicated play/pause action in the Library list so audio can be previewed without opening Study mode.
