/**
 * OpenRouter 模型引用：模型名 + 可选的供应商锁定后缀。
 *
 * 语法：`模型名:供应商1,供应商2`
 * - 供应商写 OpenRouter 的 provider slug（如 `anthropic`、`google-vertex`、
 *   `deepinfra/turbo`，可在模型页复制），按书写顺序作为优先级。
 * - 分隔符支持半角逗号 `,`、全角逗号 `，`、顿号 `、`；
 *   锁定分隔符支持半角冒号 `:` 与全角冒号 `：`。
 * - 模型名本身可带 OpenRouter 变体后缀（`:free` / `:nitro` …），
 *   此时写成 `模型名:free:供应商1,供应商2`。
 *
 * adapter 会把锁定转成请求体的 `provider: { order, allow_fallbacks: false }`，
 * 即只在该供应商列表内路由，不落到列表外的其它供应商。
 *
 * @see https://openrouter.ai/docs/guides/routing/provider-selection
 */

/**
 * OpenRouter 模型变体后缀（对应 SDK 的 `Variant` 类型）：
 * 静态变体 free / extended / exacto / thinking，
 * 虚拟变体 all / online / nitro / floor。
 * 单个 token 的后缀命中这里时按模型变体处理，不当作供应商锁定。
 */
export const OPENROUTER_MODEL_VARIANTS = [
  "free",
  "extended",
  "exacto",
  "thinking",
  "all",
  "online",
  "nitro",
  "floor",
] as const;

/** 供应商列表分隔符：半角逗号 / 全角逗号 / 顿号。 */
const PROVIDER_SEPARATOR = /[,，、]/;
/** 供应商 slug：字母数字开头，允许 `-`、`_`、`.`、`/`（端点变体如 deepinfra/turbo）。 */
const PROVIDER_SLUG = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export interface OpenRouterModelRef {
  /** 去掉供应商锁定后的模型 ID（可能保留 `:free` 等变体后缀）。 */
  model: string;
  /** 锁定的供应商 slug（已去重、保持书写顺序）；未写锁定时为空数组。 */
  providers: string[];
}

/** 判断 suffix 是否是 OpenRouter 模型变体（大小写不敏感）。 */
export function isOpenRouterModelVariant(token: string): boolean {
  return (OPENROUTER_MODEL_VARIANTS as readonly string[]).includes(
    token.toLowerCase(),
  );
}

/**
 * 拆解 `模型名:供应商1,供应商2`。
 * 无法识别为供应商锁定时整串按原样作为模型名返回（providers 为空），
 * 保证不带锁定的普通模型名与 `:free` 等变体后缀行为不变。
 */
export function parseOpenRouterModelRef(raw: string): OpenRouterModelRef {
  const trimmed = raw.trim();
  const colon = lastLockColon(trimmed);
  if (colon <= 0 || colon === trimmed.length - 1) {
    return { model: trimmed, providers: [] };
  }

  const suffix = trimmed.slice(colon + 1).trim();
  // 不含分隔符且命中变体白名单 → `:free` / `:nitro` 这类模型变体，不是锁定。
  if (!PROVIDER_SEPARATOR.test(suffix) && isOpenRouterModelVariant(suffix)) {
    return { model: trimmed, providers: [] };
  }

  const parts = suffix
    .split(PROVIDER_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);
  const model = trimmed.slice(0, colon).trim();
  if (
    !model ||
    parts.length === 0 ||
    !parts.every((p) => PROVIDER_SLUG.test(p))
  ) {
    return { model: trimmed, providers: [] };
  }

  return { model, providers: Array.from(new Set(parts)) };
}

/** 最后一个 `:` / `：` 的下标；没有时返回 -1。 */
function lastLockColon(value: string): number {
  return Math.max(value.lastIndexOf(":"), value.lastIndexOf("："));
}
