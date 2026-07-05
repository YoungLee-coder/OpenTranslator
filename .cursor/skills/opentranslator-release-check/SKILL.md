---
name: opentranslator-release-check
description: Verify deploy readiness for OpenTranslator — run typecheck, confirm no secrets in diff, validate DB migration safety. Use before deploy / 发布前检查 / 部署前检查.
---

# Release Check

Verify that OpenTranslator is ready to deploy. This project has no version tag / changelog flow — "release" means deploying to Cloudflare edge. See `.ai/workflow.md` Deploy section.

## Steps

1. **Read deploy process**: check `.ai/workflow.md` for deploy paths (Cloudflare Git auto-deploy on `main` push vs local `pnpm deploy`).
2. **Run typecheck**: `pnpm typecheck` (api + web). Both must pass.
3. **Check for secrets**: scan the diff for `JWT_SECRET`, `ENCRYPTION_KEY`, `.dev.vars` content, or plaintext API keys. See `.ai/security.md`.
4. **DB migration safety**: if `src/db/schema.sql` changed, confirm local `pnpm db:init` was run and tested. Do not run `db:init:remote` without explicit approval.
5. **Manual smoke test** (recommended): `pnpm dev` → verify `/api/ping`, login, and a translation SSE stream.
6. **Post-deploy reminder**: if schema changed, hit `/api/init/<JWT_SECRET>` once on the deployed worker (idempotent).
7. **Report**: summarize results. If any check fails, report what failed and the fix needed before deploy.
