import OpenAI from "openai";
import { z } from "zod";
import {
  LLMConfig,
  LLMGenerationRequest,
  LLMProvider,
  LLMProviderName,
} from "../types.js";
import { logger } from "../../utils/logger.js";
import type { TokenTracker } from "../../utils/token-tracker.js";
import { parseJsonSafely } from "../../utils/json-parser.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = LLMProviderName.OPENAI;
  private client: OpenAI;
  readonly model: string;
  private defaultTemperature: number;
  private tracker?: TokenTracker;
  private botName: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultTemperature = config.temperature;
    this.tracker = config.tracker;
    this.botName = config.botName ?? "OpenAI";
  }

  async generateStructuredOutput(
    request: LLMGenerationRequest
  ): Promise<unknown> {
    const messages = request.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));

    // Append JSON instruction to system message
    const systemIdx = messages.findIndex((m) => m.role === "system");
    if (systemIdx >= 0) {
      messages[systemIdx].content +=
        "\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.";
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? 4096,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    logger.bot("OpenAI", `Received ${raw.length} chars`);

    // Track token usage from API response
    if (this.tracker && response.usage) {
      this.tracker.recordExact(
        this.botName,
        this.model,
        response.usage.prompt_tokens ?? 0,
        response.usage.completion_tokens ?? 0
      );
    }

    return parseJsonSafely(raw, this.botName);
  }

  async generateText(request: LLMGenerationRequest): Promise<string> {
    const messages = request.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? 4096,
    });

    // Track token usage from API response
    if (this.tracker && response.usage) {
      this.tracker.recordExact(
        this.botName,
        this.model,
        response.usage.prompt_tokens ?? 0,
        response.usage.completion_tokens ?? 0
      );
    }

    return response.choices[0]?.message?.content ?? "";
  }
}
