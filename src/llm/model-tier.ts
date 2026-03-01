import { LLMProviderName } from "./types.js";

/**
 * Model Tiering — use cheap models for simple tasks, premium for reviews.
 *
 * Tiers:
 *   cheap    → fast, low-cost (flash models, mini variants)
 *   standard → balanced (default models)
 *   premium  → highest quality (for leader/principal reviews)
 */

export type ModelTier = "cheap" | "standard" | "premium";

interface TierModels {
  cheap: string;
  standard: string;
  premium: string;
}

/** Default model per tier per provider */
const TIER_MODELS: Record<LLMProviderName, TierModels> = {
  openai: {
    cheap: "gpt-5-nano",
    standard: "gpt-5-nano",
    premium: "gpt-4o-mini",
  },
  gemini: {
    cheap: "gemini-2.0-flash",
    standard: "gemini-2.0-flash",
    premium: "gemini-2.5-pro-preview-05-06",
  },
  deepseek: {
    cheap: "deepseek-ai/deepseek-r1-distill-llama-70b",
    standard: "deepseek-ai/deepseek-r1-distill-llama-70b",
    premium: "deepseek-ai/deepseek-r1-distill-llama-70b",
  },
};

/** Which tier each bot role should use */
const BOT_TIER_MAP: Record<string, ModelTier> = {
  // Planning bots → cheap
  "DocumentationGenerator": "cheap",
  "ProductOwner": "cheap",
  "TechStack": "cheap",
  "ResourcePlanner": "cheap",

  // Dev bots → standard
  "Frontend-Lead": "premium",
  "Backend-Lead": "premium",
  "Frontend-Dev": "standard",
  "Backend-Dev": "standard",
  "Database-Lead": "premium",
  "QA-Lead": "standard",
  "DevOps": "premium",

  // Review bots → premium
  "Principal-Engineer": "premium",
  "Lead-Review": "premium",
};

export function getModelForBot(
  botName: string,
  provider: LLMProviderName
): string {
  // Match by prefix (e.g. "Frontend-Dev-1" → "Frontend-Dev")
  const tier =
    BOT_TIER_MAP[botName] ??
    Object.entries(BOT_TIER_MAP).find(([key]) =>
      botName.startsWith(key)
    )?.[1] ??
    "standard";

  return TIER_MODELS[provider][tier];
}

export function getTierForBot(botName: string): ModelTier {
  return (
    BOT_TIER_MAP[botName] ??
    Object.entries(BOT_TIER_MAP).find(([key]) =>
      botName.startsWith(key)
    )?.[1] ??
    "standard"
  );
}
