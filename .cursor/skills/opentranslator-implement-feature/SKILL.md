---
name: opentranslator-implement-feature
description: Implement a new feature in OpenTranslator, following project conventions from .ai/ files. Use when asked to add a feature / implement something / build X / 加功能.
---

# Implement Feature

Implement a new feature following the conventions defined in `.ai/`:

1. **Read project context**: `.ai/project.md` (what this is), `.ai/architecture.md` (where things go), `.ai/coding-style.md` (how to write), `.ai/workflow.md` (commands and verification).
2. **Plan the change**: identify which files to modify, which layers are involved, which conventions apply.
3. **Implement**: write the code following `.ai/coding-style.md` conventions. Use the helpers and patterns documented there, not raw alternatives.
4. **Verify**: run the commands from `.ai/workflow.md` Verification section for the change type you made.
5. **Review**: if the change is non-trivial, run code-reviewer or security-auditor subagents before considering it done.

## Project-specific constraints

- **New provider**: add adapter in `src/providers/` → register in `src/providers/index.ts` → add form fields in `src/providers/schema.ts`. OpenAI-compatible vendors can reuse `openai.ts`. Do not touch core routes.
- **New feature module**: add component in `web/src/features/` and register in `features/registry.ts` → add backend manifest/handler in `src/features/` → enable via Dashboard module DB toggle.
- **Shared types** go in `shared-types/` via tsconfig path alias `@opentranslator/shared-types` — never duplicate in frontend and backend separately.
- **Admin routes** must sit behind `authMiddleware` (see `src/index.ts`).
