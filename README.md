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
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This repo now includes a `vercel.json` configured for a Vite SPA build (`dist`) with SPA rewrites.

1. Import this repository in Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` (for production, and preview/development if needed)
3. Deploy.

Vercel will use:
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`




## Create Flow

- **Quick Add** is the default path for creating cards from raw text without writing JSON.
- Choose a language, pick a segmentation mode (**Word**, **Character**, **Line**, or **Smart**), preview the generated tokens, optionally attach MP3 audio, and save.
- **Advanced JSON** keeps the existing power-user flow for pasting structured segment data or using the AI prompt/template.

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
- Study cards now keep their content area independently scrollable, so long passages can be read fully without clipping.
- On the study card back side, a **Play Audio** button is shown when audio exists.
- In **Settings**, you can choose between:
  - Manual playback (default)
  - Auto-play when the card back is shown

> Note: Audio files are stored in local browser storage as Data URLs. Very large files may exceed storage limits.
