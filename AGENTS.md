<!-- ai-init-version: 2 -->
# OpenTranslator — opencode Instructions

Project knowledge is in `.ai/` (shared with Claude Code). The `instructions` field in `opencode.jsonc` loads these files automatically. If you're reading this outside opencode, read the `.ai/` files manually:

- `.ai/project.md` — project background, response language
- `.ai/architecture.md` — tech stack, repository map, entry points
- `.ai/coding-style.md` — conventions, helpers, gotchas
- `.ai/workflow.md` — commands, verification, release flow
- `.ai/testing.md` — test strategy, per-change verification
- `.ai/security.md` — safety rules, destructive-op guardrails

Put personal overrides in `AGENTS.local.md` (gitignored).
