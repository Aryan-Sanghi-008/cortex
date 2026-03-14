import { z } from "zod";
import { Bot, BotResult, BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import {
  validateOutput,
  formatValidationErrors,
  validateBotQuality,
} from "../validation/validator.js";
import { buildPrompt, PromptParts } from "../utils/prompt-builder.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";
import { llmCache } from "../llm/llm-cache.js";

/**
 * Abstract base bot — handles the common LLM call → validate → retry loop.
 * Subclasses only need to implement `buildPromptParts()` and provide a schema.
 */
export abstract class BaseBot<TOutput> implements Bot<TOutput> {
  abstract readonly role: BotRole;
  readonly instanceId: string;

  protected llm: LLMProvider;
  protected schema: z.ZodType<TOutput, any, any>;
  protected maxRetries: number;
  /** Max output tokens for this bot's LLM calls. Override in subclasses for larger outputs. */
  protected maxTokens: number = 16384;

  constructor(
    llm: LLMProvider,
    schema: z.ZodType<TOutput, any, any>,
    instanceId: string,
    maxRetries: number = 3
  ) {
    this.llm = llm;
    this.schema = schema;
    this.instanceId = instanceId;
    this.maxRetries = maxRetries;
  }

  /**
   * Subclasses implement this to define their prompt.
   */
  protected abstract buildPromptParts(
    memory: ShortTermMemory
  ): PromptParts;

  async execute(memory: ShortTermMemory): Promise<BotResult<TOutput>> {
    const startTime = Date.now();
    let retries = 0;
    let lastErrors: string[] = [];

    logger.bot(this.instanceId, `Starting execution (maxTokens=${this.maxTokens})...`);

    const output = await withRetry(
      async () => {
        const parts = this.buildPromptParts(memory);

        // If we had validation errors from a previous attempt, add them as constraints
        if (lastErrors.length > 0) {
          parts.constraints = [
            ...(parts.constraints ?? []),
            formatValidationErrors(lastErrors),
          ];
        }

        const { system, user } = buildPrompt(parts);

        // ─── Prompt size guard ───
        const totalChars = system.length + user.length;
        if (totalChars > 500_000) {
          logger.warn(`${this.instanceId}: Prompt size is ${(totalChars / 1000).toFixed(0)}K chars (~${(totalChars / 4000).toFixed(0)}K tokens). Consider trimming context.`);
        }

        // ─── Check LLM cache (skip on retries — they have different prompts) ───
        if (lastErrors.length === 0) {
          const cached = await llmCache.get(system, user, this.llm.model);
          if (cached) {
            logger.bot(this.instanceId, `Cache HIT (${this.llm.model}) — skipping LLM call`);
            const parsed = JSON.parse(cached) as TOutput;
            const validation = validateOutput(parsed, this.schema);
            if (validation.success) {
              const semanticValidation = validateBotQuality(this.role, validation.data);
              if (!semanticValidation.success) {
                logger.warn(`${this.instanceId} cache entry failed semantic validation, calling LLM`);
              } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return validation.data!;
              }
            }
            if (!validation.success) {
              logger.warn(`${this.instanceId} cache entry failed schema validation, calling LLM`);
            }
          }
        }

        const result = await this.llm.generateStructuredOutput({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          maxTokens: this.maxTokens,
        });

        // Validate with Zod (belt and suspenders — some providers may skip schema)
        const validation = validateOutput(result, this.schema);
        if (!validation.success) {
          lastErrors = validation.errors ?? [];
          retries++;
          throw new Error(
            `Schema validation failed: ${lastErrors.join(", ")}`
          );
        }

        const semanticValidation = validateBotQuality(this.role, validation.data);
        if (!semanticValidation.success) {
          lastErrors = semanticValidation.errors ?? [];
          retries++;
          throw new Error(
            `Semantic quality validation failed: ${lastErrors.join(", ")}`
          );
        }

        // ─── Store in cache on success ───
        await llmCache.set(system, user, JSON.stringify(validation.data), this.llm.model);

        return validation.data!;
      },
      this.maxRetries,
      (attempt, error) => {
        retries = attempt;
        logger.warn(
          `${this.instanceId} attempt ${attempt}/${this.maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    );

    const durationMs = Date.now() - startTime;
    logger.bot(this.instanceId, `Completed in ${durationMs}ms (${retries} retries)`);

    return {
      role: this.role,
      instanceId: this.instanceId,
      output,
      retries,
      durationMs,
    };
  }
}
