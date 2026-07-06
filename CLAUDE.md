<!-- ai-init-version: 6 -->
# OpenTranslator — Claude Code Instructions

Project knowledge is distributed across `.ai/` (shared with opencode). Read these files before non-trivial work:

- `.ai/project.md` — project background, response language
- `.ai/architecture.md` — tech stack, repository map, entry points
- `.ai/coding-style.md` — conventions, helpers, gotchas
- `.ai/workflow.md` — commands, verification, release flow
- `.ai/testing.md` — test strategy, per-change verification
- `.ai/security.md` — safety rules, destructive-op guardrails

Claude-specific notes:
- 改后端前先读 `src/index.ts` 看路由挂载顺序与中间件分层；admin 路由必须在 `authMiddleware` 之后。
- 用 Edit 改已有文件，别用 Write 覆盖；typecheck 用 `pnpm typecheck`（api + web 都要过）。
- **Persistent memory:** when you notice a stable convention, command, or gotcha missing from `.ai/`, propose saving it and ask for confirmation before writing. Use `/opentranslator-remember` or route per `.ai/project.md` Persistent memory section.
- Put personal overrides in `CLAUDE.local.md` (gitignored).
