import { z } from "zod";
import type { TokenTracker } from "../utils/token-tracker.js";

// ─── Provider Names ───────────────────────────────────────────
export enum LLMProviderName {
  OPENAI = "openai",
  GEMINI = "gemini",
  DEEPSEEK = "deepseek",
}

// ─── Config passed to a provider instance ─────────────────────
export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  baseUrl?: string;
  tracker?: TokenTracker;
  botName?: string;
}

// ─── Chat message format ──────────────────────────────────────
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Generation request ───────────────────────────────────────
export interface LLMGenerationRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

// ─── Provider interface — every LLM provider must implement ───
export interface LLMProvider {
  readonly name: LLMProviderName;

  /**
   * Generate a structured JSON output.
   * The provider must instruct the LLM to return valid JSON and parse it cleanly.
   * Validation is intentionally handled by the caller, NOT the provider,
   * so that format errors can be caught and fed back into the retry prompt.
   */
  generateStructuredOutput(
    request: LLMGenerationRequest
  ): Promise<unknown>;

  /**
   * Generate a raw text response (used for non-structured tasks).
   */
  generateText(request: LLMGenerationRequest): Promise<string>;
}
