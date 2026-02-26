import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  LLMConfig,
  LLMGenerationRequest,
  LLMProvider,
  LLMProviderName,
} from "../types.js";
import { logger } from "../../utils/logger.js";

export class GeminiProvider implements LLMProvider {
  readonly name = LLMProviderName.GEMINI;
  private client: GoogleGenerativeAI;
  private model: string;
  private defaultTemperature: number;

  constructor(config: LLMConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.defaultTemperature = config.temperature;
  }

  async generateStructuredOutput<T>(
    request: LLMGenerationRequest,
    schema: z.ZodType<T, any, any>
  ): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
        maxOutputTokens: request.maxTokens ?? 4096,
        responseMimeType: "application/json",
      },
    });

    // Build prompt from messages
    const systemMsg =
      request.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      request.messages.find((m) => m.role === "user")?.content ?? "";

    const fullPrompt = `${systemMsg}\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.\n\n${userMsg}`;

    const result = await model.generateContent(fullPrompt);
    const raw = result.response.text();
    logger.bot("Gemini", `Received ${raw.length} chars`);

    const parsed = JSON.parse(raw);
    return schema.parse(parsed);
  }

  async generateText(request: LLMGenerationRequest): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
        maxOutputTokens: request.maxTokens ?? 4096,
      },
    });

    const systemMsg =
      request.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      request.messages.find((m) => m.role === "user")?.content ?? "";

    const result = await model.generateContent(`${systemMsg}\n\n${userMsg}`);
    return result.response.text();
  }
}
