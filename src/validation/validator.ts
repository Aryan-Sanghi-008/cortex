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
  /\bplaceholder\b/i,
  /lorem ipsum/i,
  /coming soon/i,
];

const DEPRECATED_PACKAGE_HINTS: RegExp[] = [
  /\brequest\b/i,
  /\btslint\b/i,
  /\bnode-sass\b/i,
  /\bapollo-server\b/i,
  /\bprotractor\b/i,
  /\bcreate-react-app\b/i,
  /\bwebpack\s*4\b/i,
  /\bmui\s*v4\b/i,
  /\bjavascript\s*es5\b/i,
];

const ROLE_SPECIFIC_MIN_CHARS: Partial<Record<BotRole, number>> = {
  [BotRole.DOC_GENERATOR]: 800,
  [BotRole.PRODUCT_OWNER]: 1000,
  [BotRole.TECH_STACK]: 600,
  [BotRole.RESOURCE_PLANNER]: 350,
  [BotRole.FRONTEND_LEAD]: 900,
  [BotRole.BACKEND_LEAD]: 900,
  [BotRole.DATABASE]: 500,
  [BotRole.QA]: 600,
  [BotRole.PRINCIPAL]: 350,
  [BotRole.LEAD_REVIEWER]: 250,
};

type MaybeCodeOutput = {
  files?: Array<{ path?: string; content?: string }>;
};

function hasCodeOutputShape(data: unknown): data is MaybeCodeOutput {
  return Boolean(data && typeof data === "object" && "files" in data);
}

function validateCodeOutputShape(role: BotRole, data: MaybeCodeOutput): string[] {
  const errors: string[] = [];
  const files = Array.isArray(data.files) ? data.files : [];

  if (files.length === 0) {
    errors.push("Code output must include at least one file.");
    return errors;
  }

  const seenPaths = new Set<string>();
  for (const file of files) {
    const path = file.path?.trim() ?? "";
    const content = file.content?.trim() ?? "";

    if (!path) {
      errors.push("Generated file path cannot be empty.");
      continue;
    }

    if (seenPaths.has(path)) {
      errors.push(`Duplicate generated file path detected: ${path}`);
    }
    seenPaths.add(path);

    if (!content || content.length < 20) {
      errors.push(`Generated file has empty or too-short content: ${path}`);
    }
  }

  const hasFrontendEntry = files.some((f) => /(^|\/)src\/main\.tsx?$/.test(f.path ?? ""));
  const hasBackendEntry = files.some((f) => /(^|\/)src\/server\.tsx?$/.test(f.path ?? ""));
  const hasDbSchema = files.some((f) => /(^|\/)prisma\/schema\.prisma$/.test(f.path ?? ""));

  if (role === BotRole.FRONTEND_DEV && !hasFrontendEntry) {
    errors.push("Frontend code output must include an application entry file (src/main.tsx or src/main.ts).");
  }

  if (role === BotRole.BACKEND_DEV && !hasBackendEntry) {
    errors.push("Backend code output must include server entry file (src/server.ts or src/server.tsx).");
  }

  if (role === BotRole.DATA_DEV && !hasDbSchema) {
    errors.push("Data layer output should include prisma/schema.prisma for schema coherence.");
  }

  return errors;
}

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
  const minChars = ROLE_SPECIFIC_MIN_CHARS[role] ?? 120;

  if (text.trim().length < minChars) {
    errors.push(
      `Output is too short for ${role}; expected at least ${minChars} characters of concrete detail.`
    );
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

  if (
    role === BotRole.FRONTEND_DEV ||
    role === BotRole.BACKEND_DEV ||
    role === BotRole.DATA_DEV ||
    role === BotRole.QA_DEV ||
    role === BotRole.DEVOPS
  ) {
    if (hasCodeOutputShape(data)) {
      errors.push(...validateCodeOutputShape(role, data));
    } else {
      errors.push("Expected code-output shape with files[] for implementation roles.");
    }
  }

  if (errors.length > 0) {
    logger.warn(`${role}: semantic quality validation failed with ${errors.length} issue(s)`);
    return { success: false, errors };
  }

  return { success: true, data };
}
