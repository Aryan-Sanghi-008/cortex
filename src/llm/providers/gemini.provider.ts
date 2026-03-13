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

// Read RPM from env: free tier = 15, paid tier = 1000+
const geminiRPM = parseInt(process.env.GEMINI_RPM ?? "15", 10);
const geminiLimiter = new GlobalRateLimiter(geminiRPM);

/** Max provider-level retries for transient errors (429, 503) */
const PROVIDER_RETRIES = 3;

/**
 * Wait with exponential backoff. For 429s, attempts to extract
 * the retry delay from the error message.
 */
async function backoffWait(attempt: number, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);

  // Try to extract retry delay from 429 error: "retry in 55s" or "retryDelay":"52s"
  const match = msg.match(/retry(?:Delay)?[:\s"]*?(\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    const seconds = parseFloat(match[1]) + 2; // 2s buffer
    logger.warn(`Gemini rate-limited. Waiting ${seconds.toFixed(0)}s (from error)...`);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    return;
  }

  // Exponential backoff: 2s, 4s, 8s
  const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
  logger.warn(`Gemini transient error. Waiting ${(delay / 1000).toFixed(0)}s before retry ${attempt}/${PROVIDER_RETRIES}...`);
  await new Promise((r) => setTimeout(r, delay));
}

/**
 * Check if an error is retryable at the provider level (429, 503, network).
 */
function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status ?? (err as any)?.code ?? (err as any)?.httpStatusCode;

  if (status === 429 || status === 503) return true;
  if (msg.includes("429") || msg.includes("Too Many Requests")) return true;
  if (msg.includes("503") || msg.includes("UNAVAILABLE")) return true;
  if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) return true;
  return false;
}

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
    const maxOutputTokens = request.maxTokens ?? 16384;

    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    // Build prompt from messages
    const systemMsg =
      request.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      request.messages.find((m) => m.role === "user")?.content ?? "";

    const fullPrompt = `${systemMsg}\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.\n\n${userMsg}`;

    // Rate limit to prevent 429s
    await geminiLimiter.acquire();

    // ─── Provider-level retry for transient errors (429, 503) ───
    let result;
    for (let attempt = 1; attempt <= PROVIDER_RETRIES; attempt++) {
      try {
        result = await model.generateContent(fullPrompt);
        break; // Success — exit retry loop
      } catch (err: any) {
        if (isRetryableError(err) && attempt < PROVIDER_RETRIES) {
          logger.warn(`${this.botName}: Transient API error (attempt ${attempt}/${PROVIDER_RETRIES})`);
          await backoffWait(attempt, err);
          // Re-acquire rate limiter token before retrying
          await geminiLimiter.acquire();
          continue;
        }
        // Non-retryable or final attempt — throw
        const status = err?.status ?? err?.code ?? err?.httpStatusCode ?? "";
        const msg = err?.message ?? String(err);
        throw new Error(`[${status}] Gemini API error: ${msg}`);
      }
    }

    if (!result) {
      throw new Error(`Gemini API: No result after ${PROVIDER_RETRIES} attempts`);
    }

    const raw = result.response.text();
    logger.bot("Gemini", `Received ${raw.length} chars`);

    // Track token usage from API response (even if truncated — so cost stays accurate)
    if (this.tracker && result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.tracker.recordExact(
        this.botName,
        this.model,
        usage.promptTokenCount ?? 0,
        usage.candidatesTokenCount ?? 0
      );
    }

    // ─── Truncation detection ───────────────────────────────────
    // If finishReason is MAX_TOKENS, the output was cut short by maxOutputTokens.
    // This means the JSON is likely incomplete/corrupted.
    const candidate = result.response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === "MAX_TOKENS") {
      logger.warn(
        `⚠️  ${this.botName}: Output TRUNCATED (finishReason=MAX_TOKENS). ` +
        `maxOutputTokens=${maxOutputTokens}, received ${raw.length} chars. ` +
        `JSON may be incomplete — attempting repair.`
      );
      // Attempt to parse/repair the truncated JSON. If jsonrepair fails,
      // this will throw and the bot-level retry loop will re-attempt with
      // validation error feedback, which naturally asks for more compact output.
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

    // ─── Provider-level retry for transient errors (429, 503) ───
    let result;
    for (let attempt = 1; attempt <= PROVIDER_RETRIES; attempt++) {
      try {
        result = await model.generateContent(`${systemMsg}\n\n${userMsg}`);
        break;
      } catch (err: any) {
        if (isRetryableError(err) && attempt < PROVIDER_RETRIES) {
          logger.warn(`${this.botName}: Transient API error (attempt ${attempt}/${PROVIDER_RETRIES})`);
          await backoffWait(attempt, err);
          await geminiLimiter.acquire();
          continue;
        }
        const status = err?.status ?? err?.code ?? err?.httpStatusCode ?? "";
        const msg = err?.message ?? String(err);
        throw new Error(`[${status}] Gemini API error: ${msg}`);
      }
    }

    if (!result) {
      throw new Error(`Gemini API: No result after ${PROVIDER_RETRIES} attempts`);
    }

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
