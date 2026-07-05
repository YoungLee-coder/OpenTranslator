---
name: opentranslator-review-pr
description: Review a pull request for OpenTranslator using code-reviewer and security-auditor agents. Use before merging / when asked to review a PR / 看看PR.
---

# Review PR

Review a pull request against project conventions and security rules.

## Steps

1. **取 diff**：`git diff` 对照分支基点，或读 PR 描述与改动文件。
2. **跑 code-reviewer**：对 diff 调用 `code-reviewer` 子代理。它对照 `.ai/coding-style.md` 与 `.ai/workflow.md`。
3. **跑 security-auditor**（适用时）：对 diff 调用 `security-auditor` 子代理。它对照 `.ai/security.md`。纯文档改动或无安全相关代码时跳过。
4. **跑 architect**（结构性改动时）：对 diff 调用 `architect` 子代理。它对照 `.ai/architecture.md`。小修且无跨层影响时跳过。
5. **综合**：合并所有代理发现，给 P0/P1/P2 汇总与最终 verdict。
6. **验证检查**：确认 `.ai/workflow.md` Verification 表里对应改动类型的命令跑过了。

## 项目特定约束

- 确认改 `src/db/schema.sql` 时先本地 `pnpm db:init` 验证过，再考虑 `db:init:remote`。
- 确认没有密钥 / API Key 明文进 diff。
