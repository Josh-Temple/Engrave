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


## Handoff

- 引き継ぎ情報は `HANDOFF.md` を参照してください。
- UI・デザイン変更時は `DESIGN_GUIDELINES.md` を必ず確認してください。
