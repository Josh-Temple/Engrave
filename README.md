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
- In **Settings**, you can now:
  - **Download backup** as JSON
  - **Restore backup** from a previously exported JSON file
- Recommended: export a backup before large updates or before switching browsers/devices.

## PWA Support

- Engrave now includes a web app manifest, an SVG-based install icon, and a registered service worker for offline-friendly caching.
- On supported browsers, you can install it to your home screen / desktop and reopen the app in a standalone window.
- The offline experience caches the app shell and previously requested same-origin assets. To keep the PR text-only, the current icon setup uses SVG assets instead of committed PNG binaries.

## Handoff

- 引き継ぎ情報は `HANDOFF.md` を参照してください。
- UI・デザイン変更時は `DESIGN_GUIDELINES.md` を必ず確認してください。

## Audio per Card

- You can now attach an **MP3** audio file to each card during creation/edit.
- In **local audio mode**, uploads include a size guard for browser-storage safety (current threshold: **700KB** per file). If exceeded, the UI shows guidance instead of attempting a save that is likely to hit browser storage quota.
- Audio processing now goes through `src/lib/audioStorage.ts`, which centralizes provider selection (`VITE_AUDIO_STORAGE_MODE`) so future migration from local Data URL storage to Supabase Storage can be implemented in one place.
- The data model now keeps an `audioUrl` field (while preserving `audioDataUrl` compatibility) to simplify a later switch to remote URL-based storage.
- The Edit Card screen now includes a dedicated **Memo** textarea so memo updates do not require direct JSON editing.
- Study cards now keep their content area independently scrollable, so long passages can be read fully without clipping.
- On the study card back side, a **Play Audio** button is shown when audio exists.
- Memo is hidden while the card front is visible. When the study card back is shown, memo content stays hidden by default and can be opened from the back-side control as a lightweight draggable drawer with `closed / peek / expanded` states.
- Memo controls now use up/down arrow affordances (instead of note/close semantics) to better match the drawer’s actual vertical movement behavior.
- In **Settings**, you can choose between:
  - Manual playback (default)
  - Auto-play when the card back is shown

> Note: The **700KB** guard applies only to `VITE_AUDIO_STORAGE_MODE=local`. In `supabase` mode, files are uploaded to Supabase Storage instead of being stored as Data URLs in browser local storage.

### Supabase Storage (Audio Only)

- You can switch audio storage to Supabase by setting `VITE_AUDIO_STORAGE_MODE=supabase`.
- Storage mode selection is environment-based (build/deploy config), not an in-app Settings toggle.
- Required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Create a **public** Supabase Storage bucket named `card-audio` before uploading.
- In Supabase mode, uploaded MP3 files are stored in `card-audio` and `audioUrl` is saved as a public URL.
- This integration affects **audio file storage only**. Card content, review history, and other app data remain local-first in browser storage.
- Supabase mode currently does **not** enforce the 700KB local-storage guard in app code.

#### Troubleshooting Supabase Audio Uploads

- If you see `Audio file is too large for reliable local storage...`, the app is currently running in `local` mode. Re-check `VITE_AUDIO_STORAGE_MODE=supabase` in the active runtime environment and restart/redeploy.
- If uploads fail, confirm the `card-audio` bucket exists in your Supabase project.
- Confirm the `card-audio` bucket is set to **public**.
- Confirm Vercel environment variables are set (`VITE_AUDIO_STORAGE_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Confirm you redeployed after changing environment variables in Vercel.

#### Root-Cause Checklist (Local vs Supabase)

Use this order to identify where the issue is:

1. **App mode check**: confirm runtime env is `VITE_AUDIO_STORAGE_MODE=supabase`.
2. **Build/runtime refresh**: after any env change, restart local dev server or redeploy Vercel.
3. **Bucket check**: verify `card-audio` exists and is public.
4. **Policy check**: verify `storage.objects` has INSERT policies for `anon` / `authenticated` on `bucket_id = 'card-audio'`.
5. **Request check**: inspect browser Network tab during upload.
   - If no Supabase Storage request appears, app is still effectively in local mode.
   - If request appears but fails (401/403/400), Supabase config/policy is the likely issue.

## Study Flow

- Lower study levels still use deterministic cloze blanks, while full-recall cards now offer two optional pre-flip hints: a first-character skeleton and a light token reveal.
- Full-recall hints are session-local UI only; the persisted `level` model remains 0-5 with reverse mode still at level 5.
- Review now uses three ratings after flip: **Again**, **Hard**, and **Good**. Hard keeps the current prompt difficulty while applying a smaller interval increase than Good.
- In **Settings**, normal study order can now be switched between **Library order** and **Random**.

## Library Improvements

- Card action icons (practice / edit / delete) were moved to each card’s lower action row to avoid overlapping long titles.
- Library cards can now be reordered manually using up/down controls, and this order is used for non-random study sessions.
- Cards with attached audio now show a dedicated play/pause action in the Library list so audio can be previewed without opening Study mode.
