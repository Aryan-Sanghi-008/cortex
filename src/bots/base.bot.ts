import { z } from "zod";
import { Bot, BotResult, BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { validateOutput, formatValidationErrors } from "../validation/validator.js";
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

    logger.bot(this.instanceId, `Starting execution...`);

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

        // ─── Check LLM cache (skip on retries — they have different prompts) ───
        if (lastErrors.length === 0) {
          const cached = await llmCache.get(system, user);
          if (cached) {
            logger.bot(this.instanceId, `Cache HIT — skipping LLM call`);
            const parsed = JSON.parse(cached) as TOutput;
            const validation = validateOutput(parsed, this.schema);
            if (validation.success) {
              // Artificial delay so the UI registers the bot as running -> done
              // rather than instantly completing before the UI catches up
              await new Promise(resolve => setTimeout(resolve, 1500));
              return validation.data!;
            }
            // Cache had invalid data — fall through to LLM call
            logger.warn(`${this.instanceId} cache entry invalid, calling LLM`);
          }
        }

        const result = await this.llm.generateStructuredOutput({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
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

        // ─── Store in cache on success ───
        await llmCache.set(system, user, JSON.stringify(validation.data), "cached");

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
