import type { TranslateRequest } from "@opentranslator/shared-types";
import { buildTranslationPrompt, type BuiltPrompt } from "../experts/prompt";

export type { BuiltPrompt };

/**
 * Shared translation prompt builder.
 * Uses Immersive Translate AI expert prompts when expertId is set,
 * otherwise falls back to the generic default.
 */
export function buildPrompt(req: TranslateRequest): BuiltPrompt {
  if (req.promptOverride) {
    return req.promptOverride;
  }
  return buildTranslationPrompt(req);
}
