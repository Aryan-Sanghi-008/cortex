import dotenv from "dotenv";
import { LLMProviderName } from "./llm/types.js";

dotenv.config();

export interface AppConfig {
  llm: {
    defaultProvider: LLMProviderName;
    defaultTemperature: number;
    maxRetries: number;
    openai: { apiKey: string; model: string };
    gemini: { apiKey: string; model: string };
    deepseek: { apiKey: string; model: string };
    leader: { provider?: LLMProviderName; model?: string };
  };
  outputDir: string;
}

export function loadConfig(): AppConfig {
  return {
    llm: {
      defaultProvider:
        (process.env.DEFAULT_LLM_PROVIDER as LLMProviderName) ??
        LLMProviderName.GEMINI,
      defaultTemperature: parseFloat(
        process.env.DEFAULT_TEMPERATURE ?? "0.7"
      ),
      maxRetries: parseInt(process.env.MAX_RETRIES ?? "3", 10),
      openai: {
        apiKey: process.env.OPENAI_API_KEY ?? "",
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY ?? "",
        model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY ?? "",
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      },
      leader: {
        provider: process.env.LEADER_LLM_PROVIDER as
          | LLMProviderName
          | undefined,
        model: process.env.LEADER_MODEL || undefined,
      },
    },
    outputDir: process.env.OUTPUT_DIR ?? "./output",
  };
}
