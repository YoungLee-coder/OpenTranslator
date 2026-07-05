---
name: opentranslator-review-pr
description: Review a pull request for OpenTranslator against .ai/ conventions and security rules. Use before merging / when asked to review a PR / 看看PR.
---

# Review PR

Review a pull request against project conventions and security rules in `.ai/`.

## Steps

1. **Get the diff**: `git diff` against the branch base, or read the PR description and changed files.
2. **Read context**: skim `.ai/coding-style.md`, `.ai/workflow.md`, `.ai/architecture.md`, and `.ai/security.md`.
3. **Code review**: run the code-reviewer subagent on the diff, or review manually against `.ai/coding-style.md` and `.ai/workflow.md`.
4. **Security review**: run the security-auditor subagent on the diff against `.ai/security.md`. Skip for documentation-only changes.
5. **Architecture check** (if structural): verify layer boundaries against `.ai/architecture.md`. Skip for small fixes with no cross-layer impact.
6. **Synthesize**: combine findings. Present a summary with P0/P1/P2 items and a final verdict.
7. **Verification check**: confirm the commands from `.ai/workflow.md` Verification section were run for the change types involved.

## Project-specific checks

- New admin routes must be behind `authMiddleware` in `src/index.ts`.
- New providers must register in `src/providers/index.ts`, not hardcoded in core routes.
- Schema changes must be validated locally with `pnpm db:init` before remote init.
- No secrets, API keys, or JWT_SECRET in diff, logs, or docs.
