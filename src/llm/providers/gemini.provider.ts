import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  LLMConfig,
  LLMGenerationRequest,
  LLMProvider,
  LLMProviderName,
} from "../types.js";
import { logger } from "../../utils/logger.js";
import type { TokenTracker } from "../../utils/token-tracker.js";
import { GlobalRateLimiter } from "../../utils/rate-limiter.js";
import { parseJsonSafely } from "../../utils/json-parser.js";

// Global singleton to enforce 15 RPM across all Gemini instances
const geminiLimiter = new GlobalRateLimiter(15);

export class GeminiProvider implements LLMProvider {
  readonly name = LLMProviderName.GEMINI;
  private client: GoogleGenerativeAI;
  private model: string;
  private defaultTemperature: number;
  private tracker?: TokenTracker;
  private botName: string;

  constructor(config: LLMConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.defaultTemperature = config.temperature;
    this.tracker = config.tracker;
    this.botName = config.botName ?? "Gemini";
  }

  async generateStructuredOutput(
    request: LLMGenerationRequest
  ): Promise<unknown> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
        maxOutputTokens: request.maxTokens ?? 16384,
        responseMimeType: "application/json",
      },
    });

    // Build prompt from messages
    const systemMsg =
      request.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      request.messages.find((m) => m.role === "user")?.content ?? "";

    const fullPrompt = `${systemMsg}\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.\n\n${userMsg}`;

    // Rate limit to prevent 429s (15 RPM max)
    await geminiLimiter.acquire();
    const result = await model.generateContent(fullPrompt);
    const raw = result.response.text();
    logger.bot("Gemini", `Received ${raw.length} chars`);

    // Track token usage from API response
    if (this.tracker && result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.tracker.recordExact(
        this.botName,
        this.model,
        usage.promptTokenCount ?? 0,
        usage.candidatesTokenCount ?? 0
      );
    }

    // Parse safely (handles Markdown fences, truncations, jsonrepair)
    return parseJsonSafely(raw, this.botName);
  }

  async generateText(request: LLMGenerationRequest): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
        maxOutputTokens: request.maxTokens ?? 16384,
      },
    });

    const systemMsg =
      request.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      request.messages.find((m) => m.role === "user")?.content ?? "";

    // Rate limit to prevent 429s
    await geminiLimiter.acquire();
    const result = await model.generateContent(`${systemMsg}\n\n${userMsg}`);

    // Track token usage from API response
    if (this.tracker && result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.tracker.recordExact(
        this.botName,
        this.model,
        usage.promptTokenCount ?? 0,
        usage.candidatesTokenCount ?? 0
      );
    }

    return result.response.text();
  }
}
