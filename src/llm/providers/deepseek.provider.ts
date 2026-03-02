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

/**
 * DeepSeek uses an OpenAI-compatible API, so we reuse the OpenAI SDK
 * with a custom base URL. Supports Qubrid and other OpenAI-compatible hosts.
 * Handles R1/reasoning models that wrap output in <think> tags.
 */
export class DeepSeekProvider implements LLMProvider {
  readonly name = LLMProviderName.DEEPSEEK;
  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;
  private tracker?: TokenTracker;
  private botName: string;

  constructor(config: LLMConfig) {
    const baseURL = config.baseUrl ?? "https://api.deepseek.com";
    logger.bot("DeepSeek", `Connecting to: ${baseURL} (model: ${config.model})`);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL,
    });
    this.model = config.model;
    this.defaultTemperature = config.temperature;
    this.tracker = config.tracker;
    this.botName = config.botName ?? "DeepSeek";
  }

  async generateStructuredOutput(
    request: LLMGenerationRequest
  ): Promise<unknown> {
    const messages = request.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));

    const systemIdx = messages.findIndex((m) => m.role === "system");
    if (systemIdx >= 0) {
      messages[systemIdx].content +=
        "\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation. Output ONLY the JSON object, nothing else.";
    }

    // R1/reasoning models may not support response_format
    const isReasoningModel = this.model.includes("r1");

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? 4096,
      ...(isReasoningModel ? {} : { response_format: { type: "json_object" as const } }),
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    logger.bot("DeepSeek", `Received ${raw.length} chars`);

    // Track token usage from API response
    if (this.tracker && response.usage) {
      this.tracker.recordExact(
        this.botName,
        this.model,
        response.usage.prompt_tokens ?? 0,
        response.usage.completion_tokens ?? 0
      );
    }

    // Use the central robust parser (handles <think> blocks and Markdown fences)
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
