# Engrave

Engrave is a mobile-first, minimal, local-first memorization PWA for passages, formulas, and language study. Card content, settings, review history, and local audio remain in the browser; there are no accounts, server database, cloud sync, or AI integration.

## Local development

Requires Node.js.

```bash
npm install
npm run dev
```

Quality commands:

```bash
npm run lint
npm run test
npm run build
```

The Vercel configuration builds the Vite app to `dist` and preserves SPA routing. No Gemini/API secret is required or injected into the client bundle.

## Data safety and compatibility

Zustand persistence intentionally continues to use the legacy `zencards-storage-v4` key so existing browser data is not lost. Hydration, backup restore, create, and edit normalize card data. Legacy `audioDataUrl` values migrate to canonical `audioUrl`; new persistence and backup exports omit `audioDataUrl`, preventing duplicate Data URLs. Old Engrave/ZenCards backup JSON remains importable. Backup downloads use the `engrave-backup-*.json` name.

Before a large update or browser/device change, use **Settings → Download backup**. Browser storage is still finite and clearing site data removes local cards.

## Audio

Cards accept MP3 and WAV only. A single `MAX_AUDIO_FILE_SIZE_BYTES` guard (currently 700 KB) applies in both local and Supabase modes. Local mode stores one Data URL in `audioUrl`. WAV/MP3 previews let the browser infer the media type.

Optional Supabase audio-only mode:

```env
VITE_AUDIO_STORAGE_MODE="supabase"
VITE_SUPABASE_URL="https://PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="..."
```

Create a public `card-audio` bucket. The browser needs narrowly scoped `insert` and `delete` Storage policies for that bucket. Uploaded records include an explicit `audioStoragePath`, allowing deletion without guessing from a public URL. Card deletion invokes Storage deletion for tracked objects; legacy public URLs without a path are deliberately not guessed or deleted.

> **Security warning:** a public bucket plus anonymous browser upload/delete policies permits anyone holding the project URL/key to consume storage or delete objects allowed by those policies. The anon key is not a secret. Restrict policies to `card-audio` and the `cards/` prefix, set bucket/file limits, monitor usage, and use this configuration only for the intended personal prototype deployment. Stable multi-user/public deployment requires authentication or a trusted upload service, which is outside this repository's local-first scope.

## Review and listening behavior

Normal study ratings remain persisted as follows: Again lowers difficulty and schedules tomorrow, Hard keeps the level with a conservative interval, and Good advances it. Separately, Again places the card into an in-memory session queue 2–4 positions later (or at the tail). Good/Hard completes a repeated card; three Again attempts end it for that session. Practice Mode and persistent data do not store this queue.

Listen mode skips cards without audio, starts playback after moving to the first playable card, supports a one-card Loop All restart, and cancels pending gap timers on pause/navigation. Read & Listen retains repeat-one and speed controls.

## PWA and rendering security

`npm run build` generates a service worker from the actual Vite `dist` file list. It precaches hashed JavaScript/CSS plus HTML, manifest, and icon, uses a network-first navigation response with an offline HTML fallback, and replaces versioned caches on activation. The existing Engrave manifest, icon, standalone display, and name are retained.

Study ruby markup is produced only from HTML-escaped segment text/readings; user values are never passed directly into the raw-HTML markdown path. React escapes source and memo rendering, while KaTeX and ruby display remain available. Scripts, iframes, event handlers, and dangerous URLs supplied through card/backup values therefore remain text rather than executable markup.

## Product principles

See `DESIGN_GUIDELINES.md` before UI work. Preserve the mobile-first, calm, minimal interface and local-first behavior. See `HANDOFF.md` for implementation notes and known constraints.
