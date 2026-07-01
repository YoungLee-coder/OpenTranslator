import type { TranslationProvider } from "@opentranslator/shared-types";

class ProviderRegistry {
  private providers = new Map<string, TranslationProvider>();

  register(type: string, provider: TranslationProvider): void {
    this.providers.set(type, provider);
  }

  get(type: string): TranslationProvider {
    const p = this.providers.get(type);
    if (!p) throw new Error(`Provider type "${type}" not registered`);
    return p;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
