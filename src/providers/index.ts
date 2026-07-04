import { providerRegistry } from "./registry";
import {
  openaiProvider,
  aihubmixProvider,
  customProvider,
} from "./openai";
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { cloudflareProvider } from "./cloudflare";
import { deeplProvider } from "./deepl";

/**
 * Provider registration side-effects. Importing this module wires every
 * adapter into the registry. New vendor = add an adapter file + a line here.
 */
providerRegistry.register("openai", openaiProvider);
providerRegistry.register("aihubmix", aihubmixProvider);
providerRegistry.register("claude", claudeProvider);
providerRegistry.register("gemini", geminiProvider);
providerRegistry.register("custom", customProvider);
providerRegistry.register("cloudflare", cloudflareProvider);
providerRegistry.register("deepl", deeplProvider);
