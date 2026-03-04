# HANDOFF

## このリポジトリの現状
- Vercel デプロイ準備済み（`vercel.json` 設定あり）
- UI・デザインのコード自体は変更していません

## デプロイ手順（Vercel）
1. Vercel にリポジトリを import
2. Environment Variables に `GEMINI_API_KEY` を設定
3. デプロイ実行

Vercel 側設定（`vercel.json`）:
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
- SPA Rewrite: `/(.*)` → `/index.html`

## 開発・引き継ぎ時の注意
- UI・デザインを変更する場合は、必ず `DESIGN_GUIDELINES.md` の方針に従ってください。
  - Minimalist & Zen
  - Mobile-First Ergonomics
  - 色・タイポ・余白・アニメーションの規約
- UI変更を伴うPRでは、可能な限りスクリーンショットを添付してください。

## ローカル確認
- 型チェック: `npm run lint`
- 本番ビルド確認: `npm run build`
