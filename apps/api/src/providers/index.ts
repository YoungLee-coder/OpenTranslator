import { providerRegistry } from "./registry";
import {
  openaiProvider,
  deepseekProvider,
  openrouterProvider,
  customProvider,
} from "./openai";
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { azureOpenAIProvider } from "./azure-openai";

/**
 * Provider registration side-effects. Importing this module wires every
 * adapter into the registry. New vendor = add an adapter file + a line here.
 */
providerRegistry.register("openai", openaiProvider);
providerRegistry.register("deepseek", deepseekProvider);
providerRegistry.register("openrouter", openrouterProvider);
providerRegistry.register("claude", claudeProvider);
providerRegistry.register("gemini", geminiProvider);
providerRegistry.register("azure_openai", azureOpenAIProvider);
providerRegistry.register("custom", customProvider);
