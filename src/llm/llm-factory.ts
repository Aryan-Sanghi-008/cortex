import { LLMConfig, LLMProvider, LLMProviderName } from "./types.js";
import { OpenAIProvider } from "./providers/openai.provider.js";
import { GeminiProvider } from "./providers/gemini.provider.js";
import { DeepSeekProvider } from "./providers/deepseek.provider.js";

/**
 * Factory function to create an LLM provider by name.
 * Supports role-based model selection (e.g., leader bot uses a different model).
 */
export function createLLMProvider(
  name: LLMProviderName,
  config: LLMConfig
): LLMProvider {
  switch (name) {
    case LLMProviderName.OPENAI:
      return new OpenAIProvider(config);
    case LLMProviderName.GEMINI:
      return new GeminiProvider(config);
    case LLMProviderName.DEEPSEEK:
      return new DeepSeekProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}
