<div align="center">
<img src="./docs/images/icon.svg" alt="" width="80" height="80" />

# OpenTranslator

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-Worker-E36002?logo=hono&logoColor=white)](https://hono.dev/)

**Self-hosted, DeepL-style AI translator — multi-provider, streaming, edge-deployed**

[中文](./README.md) · [Features](#-features) · [Screenshots](#-screenshots) · [Quick Start](#-quick-start) · [Deploy](#-deploy) · [Extensibility](#-extensibility) · [Roadmap](#-roadmap)

<img src="./docs/images/OpenTranslator-HomePage.png" alt="OpenTranslator translation page" width="800" />

</div>

---

## ✨ Features

- **Multi-provider, switch anytime** — Eight built-in adapters: OpenAI, Claude, Gemini, DeepSeek, OpenRouter, AIHubMix, Azure OpenAI, and custom OpenAI-compatible endpoints. Add API keys in the Dashboard and go — no code changes required.
- **Streaming translation** — Translations render token-by-token over SSE, matching DeepL’s instant feel.
- **Plugin-style extensibility** — Providers use a registry; feature modules are toggled via the database. Add a new vendor or feature with one adapter and one registration line.
- **Encrypted key storage** — Provider API keys are encrypted with `ENCRYPTION_KEY` before being stored in D1; plaintext never hits the database.
- **Fine-grained rate limiting** — Per-IP sliding window via Durable Objects, with separate quotas for anonymous and signed-in users.
- **Caching & usage stats** — KV translation cache avoids duplicate requests; usage logs land in D1 and show up in the Dashboard.
- **Glossary** — The first plugin-style feature: terms are injected into translation prompts automatically.
- **Site toggle** — Turn off public access with one switch for a private-only deployment.

---

## 📸 Screenshots

### Translation page

Side-by-side bilingual view, auto language detection, model switching, and keyboard shortcuts — ready out of the box.

<img src="./docs/images/OpenTranslator-HomePage.png" alt="Translation page" width="800" />

### Admin dashboard

**Usage overview** — Total requests, character counts, and per-provider usage at a glance.

<img src="./docs/images/OpenTranslator-Dashboard1.png" alt="Dashboard usage overview" width="800" />

**Public access** — Choose which models anonymous visitors can use, set a public default, and configure anonymous rate limits.

<img src="./docs/images/OpenTranslator-Dashboard2.png" alt="Dashboard public access" width="800" />

**Site settings** — Signed-in user rate limits, KV translation cache, feature module toggles, and database maintenance.

<img src="./docs/images/OpenTranslator-Dashboard3.png" alt="Dashboard site settings" width="800" />

**Glossary** — Maintain term pairs per target language; they are injected into prompts to enforce consistent wording.

<img src="./docs/images/OpenTranslator-Dashboard4.png" alt="Dashboard glossary" width="800" />

---

## 🚀 Quick Start

### Prerequisites

- Node 22+ (pnpm 11 requires Node 22.13+), pnpm 11+
- Cloudflare account (only for deployment; local dev does not require login)

### Local development

```bash
pnpm install
pnpm db:init        # Initialize local D1 (SQLite for wrangler dev)
pnpm dev            # Start web (5173) + api (8787) in parallel
```

Open http://localhost:5173 — the home page calls `/api/ping` to verify the full stack. Vite proxies `/api` to `http://localhost:8787`, so dev is same-origin with no CORS. Local secrets come from `.dev.vars` (gitignored).

### First-time setup

1. Open `/login` and click **First time? Initialize admin** to create the first administrator account.
2. Go to `/dashboard` → Providers → Add (enter a real API key and check **Set as public default**).
3. Return to `/` and start translating — output streams in real time.

---

## ☁️ Deploy

> [!NOTE]
> The frontend is bundled into the same Worker. A single `wrangler deploy` ships both frontend and API on the same origin — no CORS, no `VITE_API_BASE_URL`. After deploy, visit `/api/init/<JWT_SECRET>` to create tables (idempotent, safe to run again).

<details>
<summary><strong>Option 1: Cloudflare Git integration (recommended — all in the dashboard)</strong></summary>

Push to GitHub → Cloudflare builds and deploys automatically. No local wrangler or CI setup required.

**1. Create resources (Dashboard)**

- D1: Storage & D1 → Create database → name it `opentranslator`
- KV: Workers & Pages → KV → Create namespace → name it `SETTINGS_KV`

**2. Connect the Worker (Workers Builds)**

Dashboard → Workers & Pages → Create → Workers → Import a repository → select your repo, Root directory `/`, Build command `pnpm build`, leave Deploy command empty (default `npx wrangler deploy`).

After creation, open the Worker → Settings:

- **Variables and Secrets** — add two secrets (32+ random characters each):
  - `JWT_SECRET` — JWT signing key; also used as the `/api/init` credential
  - `ENCRYPTION_KEY` — encrypts provider API keys; **back this up — losing it invalidates all stored keys**
- **Bindings** → Add binding:
  - D1 binding, name `DB` → select the `opentranslator` database
  - KV binding, name `SETTINGS_KV` → select the namespace you created

**3. Initialize the database (once)**

After a successful deploy, visit `https://<your-worker-domain>/api/init/<your-JWT_SECRET>`. You should see `{"ok":true,...}` when tables are ready.

**4. Initial data**

Open your Worker URL → `/login` → **First time? Initialize admin** → Dashboard → add a provider → return home to translate.

**5. Updates**

Push to `main` and Cloudflare rebuilds and redeploys. For incremental schema migrations, visit `/api/init/<JWT_SECRET>` again.

</details>

<details>
<summary><strong>Option 2: Local wrangler (optional)</strong></summary>

```bash
wrangler login
wrangler d1 create opentranslator            # Uncomment d1 block in wrangler.toml and paste the returned ID
wrangler kv namespace create SETTINGS_KV      # Same for the kv block
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
pnpm build                                    # Build frontend to ./dist
wrangler deploy                               # Deploy frontend + API together
curl https://api.yourdomain.com/api/init/$(grep JWT_SECRET .dev.vars | cut -d= -f2)   # Create tables
```

</details>

<details>
<summary><strong>Configuration reference</strong></summary>

| Type | Name | Description |
|---|---|---|
| Secret | `JWT_SECRET` | JWT signing key (32+ random chars); also `/api/init` credential |
| Secret | `ENCRYPTION_KEY` | Encrypts provider API keys — **back up** |
| Variable | `ENV` | Environment label, default `development` |
| Variable | `ORIGINS` | CORS allowlist (comma-separated); omit for same-origin deploy |
| Binding (D1) | `DB` | Bind to `opentranslator` database |
| Binding (KV) | `SETTINGS_KV` | Settings/cache namespace |
| Binding (DO) | `RATE_LIMITER` | Durable Object for rate limiting; created on deploy, no ID needed |
| Binding (Assets) | `ASSETS` | Frontend static assets; configured in `wrangler.toml`, no manual bind |

</details>

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 19, React Router 7, TypeScript |
| Backend | Hono, Cloudflare Workers, TypeScript |
| Data | Cloudflare D1 (persistent), KV (cache/settings), Durable Object (rate limiting) |
| Deploy | Cloudflare Workers (frontend + API in one Worker, `[assets]` binding) |
| Tooling | pnpm, TypeScript `paths` aliases for shared types |

### Project structure

```
src/                     # Hono Worker backend (REST/SSE + static assets)
  providers/             #   Provider adapters + registry + form schema
  routes/                #   translate / auth / admin-*
  db/                    #   D1 schema + idempotent initializer
  durable-objects/       #   Rate limiter
  features/              #   Feature module backends
web/                     # Vite + React SPA (build output → root dist/)
  src/routes/            #   Translator / login / Dashboard
  src/features/          #   Feature registry (Dashboard dynamic nav)
shared-types/            # Shared TypeScript types (frontend + backend)
wrangler.toml            # Worker config (includes [assets] binding)
docs/images/             # README screenshots
```

---

## 🔌 Extensibility

### Add a provider

1. Add an adapter under `src/providers/` (implement `TranslationProvider`); OpenAI-compatible vendors can reuse `openai.ts`.
2. Add one line in `src/providers/index.ts`: `providerRegistry.register(...)`.
3. Add form field definitions in `src/providers/schema.ts` — the Dashboard renders the config form automatically.

Core routes and translation logic stay unchanged.

### Add a feature module

1. Add a component under `web/src/features/` and register it in `features/registry.ts`.
2. Enable it in Dashboard → Modules (DB-driven toggle); navigation and pages appear automatically.

---

## 🗺️ Roadmap

- [x] Infrastructure + minimal closed loop
- [x] Translation core: OpenAI/Claude/Gemini adapters, `/api/translate`, SSE, translator UI
- [x] Auth + Dashboard: JWT, first-time init, site toggle, provider CRUD, encrypted keys, usage overview
- [x] More providers + cache + stats: Azure OpenAI / DeepSeek / OpenRouter / custom adapters; KV translation cache; usage tracking
- [x] Feature modules: `/api/admin/features` DB toggles, dynamic Dashboard nav, glossary as first plugin
- [ ] Later (as needed): document translation / OCR, multi-role permissions, Analytics Engine migration, billing / quotas

---

## Contributing

Issues and PRs are welcome. When adding providers or feature modules, follow the extensibility sections above and keep the registry-based pattern.

## License

This project is released under [GPL-3.0](./LICENSE). Derivative works must be open-sourced under the same license.
