import { z } from "zod";
import { logger } from "../utils/logger.js";
import { BotRole } from "../bots/types.js";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Zod schema.
 */
export function validateOutput<T>(
  data: unknown,
  schema: z.ZodType<T, any, any>
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );

  logger.warn(`Validation failed with ${errors.length} error(s)`);
  errors.forEach((e) => logger.error(`  → ${e}`));

  return { success: false, errors };
}

/**
 * Format validation errors into a prompt-friendly string,
 * so the LLM can self-correct on retry.
 */
export function formatValidationErrors(errors: string[]): string {
  return `Your previous response had the following validation errors. Fix them and try again:\n${errors.map((e) => `- ${e}`).join("\n")}`;
}

const BANNED_OUTPUT_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bTBD\b/i,
  /to be implemented/i,
  /placeholder/i,
  /lorem ipsum/i,
  /coming soon/i,
];

const DEPRECATED_PACKAGE_HINTS: RegExp[] = [
  /\brequest\b/i,
  /\btslint\b/i,
  /\bnode-sass\b/i,
  /\bapollo-server\b/i,
  /\bprotractor\b/i,
];

function collectStrings(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === "string") {
    bucket.push(value);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, bucket));
    return bucket;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, bucket));
  }

  return bucket;
}

/**
 * Lightweight semantic quality checks to reject weak-but-schema-valid outputs.
 */
export function validateBotQuality(role: BotRole, data: unknown): ValidationResult<unknown> {
  const errors: string[] = [];
  const text = collectStrings(data).join("\n");

  if (text.trim().length < 120) {
    errors.push("Output is too short; provide complete, production-grade detail.");
  }

  for (const pattern of BANNED_OUTPUT_PATTERNS) {
    if (pattern.test(text)) {
      errors.push(`Output contains banned placeholder content matching: ${pattern}`);
    }
  }

  if (role === BotRole.TECH_STACK) {
    for (const pattern of DEPRECATED_PACKAGE_HINTS) {
      if (pattern.test(text)) {
        errors.push(`Tech stack contains potentially deprecated tooling matching: ${pattern}`);
      }
    }
  }

  if (errors.length > 0) {
    logger.warn(`${role}: semantic quality validation failed with ${errors.length} issue(s)`);
    return { success: false, errors };
  }

  return { success: true, data };
}
