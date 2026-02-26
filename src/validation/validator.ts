import { z } from "zod";
import { logger } from "../utils/logger.js";

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
