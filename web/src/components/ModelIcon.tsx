import type { ProviderType } from "@opentranslator/shared-types";
import type { ComponentType } from "react";
// Deep-import Color/Mono only — avoids @lobehub/icons features (Avatar → antd).
import DeepSeekColor from "@lobehub/icons/es/DeepSeek/components/Color";
import QwenColor from "@lobehub/icons/es/Qwen/components/Color";
import KimiColor from "@lobehub/icons/es/Kimi/components/Color";
import ClaudeColor from "@lobehub/icons/es/Claude/components/Color";
import GeminiColor from "@lobehub/icons/es/Gemini/components/Color";
import OpenAIMono from "@lobehub/icons/es/OpenAI/components/Mono";
import MetaColor from "@lobehub/icons/es/Meta/components/Color";
import GemmaColor from "@lobehub/icons/es/Gemma/components/Color";
import MistralColor from "@lobehub/icons/es/Mistral/components/Color";
import ChatGLMColor from "@lobehub/icons/es/ChatGLM/components/Color";
import DoubaoColor from "@lobehub/icons/es/Doubao/components/Color";
import YiColor from "@lobehub/icons/es/Yi/components/Color";
import HunyuanColor from "@lobehub/icons/es/Hunyuan/components/Color";
import GrokMono from "@lobehub/icons/es/Grok/components/Mono";
import { ProviderIcon } from "@/components/ProviderIcon";
import { cn } from "@/lib/utils";

type LobeIconProps = {
  size?: number | string;
  className?: string;
  title?: string;
};

type BrandRule = {
  /** 小写子串或 RegExp；按数组顺序优先匹配更具体的规则 */
  test: string | RegExp;
  Icon: ComponentType<LobeIconProps>;
  /** Mono 需固定前景色，避免继承 muted */
  mono?: boolean;
};

const BRAND_RULES: BrandRule[] = [
  { test: "deepseek", Icon: DeepSeekColor },
  { test: /qwen|qwq|qvq|tongyi/, Icon: QwenColor },
  { test: /kimi|moonshot/, Icon: KimiColor },
  { test: "claude", Icon: ClaudeColor },
  { test: "gemini", Icon: GeminiColor },
  { test: "gemma", Icon: GemmaColor },
  { test: /mistral|mixtral|codestral|ministral|magistral|devstral|pixtral/, Icon: MistralColor },
  { test: /chatglm|glm-/, Icon: ChatGLMColor },
  { test: /doubao|ep-/, Icon: DoubaoColor },
  { test: /(^|[/\-_])yi-/, Icon: YiColor },
  { test: "hunyuan", Icon: HunyuanColor },
  { test: "grok", Icon: GrokMono, mono: true },
  { test: "llama", Icon: MetaColor },
  // OpenAI 系列靠后，避免误伤其它品牌
  { test: /gpt-|openai|^o1([/\-_]|$)|\/o1|[/\-]o1[/\-]|o3([/\-_]|$)|\/o3|[/\-]o3[/\-]|o4([/\-_]|$)/, Icon: OpenAIMono, mono: true },
];

function matchBrand(model: string): BrandRule | null {
  const id = model.trim().toLowerCase();
  if (!id) return null;
  for (const rule of BRAND_RULES) {
    if (typeof rule.test === "string") {
      if (id.includes(rule.test)) return rule;
    } else if (rule.test.test(id)) {
      return rule;
    }
  }
  return null;
}

export function ModelIcon({
  model,
  providerType,
  size = 16,
  className,
}: {
  model: string;
  providerType?: ProviderType | string;
  size?: number;
  className?: string;
}) {
  const brand = matchBrand(model);
  if (brand) {
    const { Icon, mono } = brand;
    return (
      <Icon
        size={size}
        className={cn(
          "shrink-0",
          mono && "text-foreground dark:text-foreground",
          className,
        )}
        aria-hidden
      />
    );
  }
  if (providerType) {
    return <ProviderIcon type={providerType} size={size} className={className} />;
  }
  return null;
}
