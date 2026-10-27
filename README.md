# Meme Arena

**Two memes enter. Your laugh decides.**

Head-to-head meme battles, a winners board, and image submissions with moderation.

![Meme Arena: actual running application with English interface and light theme](assets/preview.jpg)

*Actual browser capture of the application, using local example data. Votes and completion counts shown are demonstration interactions, not audience statistics.*

### Try the flow

Pick the funnier card → the pair updates → inspect the winners board. Uploads await moderation.

English, Español, and Русский are selected from browser preferences, with a manual language selector. Light, dark, and system themes are available in every app. Native HTML, CSS, and JavaScript; no third-party browser libraries, external fonts, trackers, or CDN requests.

## Quick start

Requires Node.js 24+. No install or build step.

```sh
npm start
```

Open http://localhost:3000. The root opens this application; unrelated app routes and APIs are disabled. Data persists in `data/minute.sqlite`.

```sh
npm test
npm run check
```

## Enable image submissions

Set `ADMIN_TOKEN` to a long random secret before starting. Without a key, uploads are disabled. Review submissions at `/admin/`. Images remain private until approved. The browser compresses JPEG/PNG/WebP to 500 KB; the server validates size, signature, and dimensions. Animated files are not supported in v1. This project defaults to **40 GB** of accepted media; together with the other image project this totals 80 GB, leaving headroom within a 100 GB allocation.

## Deploy

Set `PUBLIC_ORIGIN` to the exact HTTPS origin, give the process a persistent `DATA_DIR`, and put an HTTPS reverse proxy in front. Example Dockerfile, Caddy config, environment file, and systemd unit are included. Each independent project needs its own port and data directory. `.env` is not loaded automatically: use exported variables or `node --env-file=.env server/index.mjs`. See [OPERATIONS.md](OPERATIONS.md) for backups, moderation, identity limitations, and storage details.


## Develop with TypeScript

Generated JavaScript is committed, so production needs no TypeScript compiler. Development uses pinned tools:

```sh
npm ci
npm run typecheck
npm run build
npm run check:generated
npm test
npm run check
```

`src/preferences*.ts` is the source for language negotiation and the early theme bootstrap. Server projects also compile `src/validation.mts` into `server/validation.mjs`. `src/contracts.ts` describes shared data shapes. The compiler uses strict mode, checked indexed access, and exact optional properties; errors block emission. Edit these TypeScript sources, then rebuild. Other existing application modules are still JavaScript: this is an incremental migration, not a claim of complete TypeScript coverage.

The build emits ordinary ES2022 JavaScript, then compiles the three locale variants. No compiler or framework is shipped to visitors. CI checks types, generated output, behavior, and the asset budget.
