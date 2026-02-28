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

/**
 * Extract JSON from a response that may contain reasoning/think tags.
 * R1/reasoning models wrap output like: <think>...</think>\n{...}
 */
function extractJSON(raw: string): string {
  // Strip <think>...</think> blocks (R1 reasoning models)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // If it starts with ``` markdown fences, strip them
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Try to find the first { or [ and last } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    return cleaned; // Return as-is, let JSON.parse handle the error
  }

  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  const isArray = cleaned[start] === "[";
  const lastClose = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");

  if (lastClose === -1) return cleaned;

  return cleaned.slice(start, lastClose + 1);
}

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

  async generateStructuredOutput<T>(
    request: LLMGenerationRequest,
    schema: z.ZodType<T, any, any>
  ): Promise<T> {
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

    // Extract JSON from potentially reasoning-wrapped output
    const jsonStr = extractJSON(raw);
    logger.bot("DeepSeek", `Extracted JSON: ${jsonStr.length} chars`);

    const parsed = JSON.parse(jsonStr);
    return schema.parse(parsed);
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
