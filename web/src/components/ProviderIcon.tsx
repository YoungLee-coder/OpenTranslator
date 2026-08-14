import type { ProviderType } from "@opentranslator/shared-types";
import type { ComponentType } from "react";
// Deep-import Color/Mono only — avoids @lobehub/icons features (Avatar → antd).
import OpenAI from "@lobehub/icons/es/OpenAI/components/Mono";
import ClaudeColor from "@lobehub/icons/es/Claude/components/Color";
import GeminiColor from "@lobehub/icons/es/Gemini/components/Color";
import AiHubMixColor from "@lobehub/icons/es/AiHubMix/components/Color";
import OpenRouterMono from "@lobehub/icons/es/OpenRouter/components/Mono";
import CloudflareColor from "@lobehub/icons/es/Cloudflare/components/Color";
import DeepLColor from "@lobehub/icons/es/DeepL/components/Color";
import { cn } from "@/lib/utils";

type LobeIconProps = {
  size?: number | string;
  className?: string;
  title?: string;
};

const PROVIDER_COLOR_ICONS: Record<
  ProviderType,
  ComponentType<LobeIconProps>
> = {
  // OpenAI 品牌本身为单色，库无 Color 变体
  openai: OpenAI,
  claude: ClaudeColor,
  gemini: GeminiColor,
  aihubmix: AiHubMixColor,
  openrouter: OpenRouterMono,
  cloudflare: CloudflareColor,
  deepl: DeepLColor,
};

const KNOWN_TYPES = new Set<string>(Object.keys(PROVIDER_COLOR_ICONS));

export function ProviderIcon({
  type,
  size = 16,
  className,
}: {
  type: ProviderType | string;
  size?: number;
  className?: string;
}) {
  if (!KNOWN_TYPES.has(type)) return null;
  const Icon = PROVIDER_COLOR_ICONS[type as ProviderType];
  // Mono 走 currentColor：OpenAI 跟前景色；OpenRouter 用官网主色紫（非 LobeHub 荧光绿 Color）
  const monoClass =
    type === "openai"
      ? "text-foreground dark:text-foreground"
      : type === "openrouter"
        ? "text-[#7624F4]"
        : undefined;
  return (
    <Icon
      size={size}
      className={cn("shrink-0", monoClass, className)}
      aria-hidden
    />
  );
}
