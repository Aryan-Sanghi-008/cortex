/**
 * Context Compressor — reduces token usage by summarizing large bot outputs
 * before passing them to downstream bots.
 *
 * Strategy: Hierarchical summarization
 * - Full output stored in memory as-is
 * - Compressed summary generated for downstream consumption
 * - Only Principal bot / deep tasks get full context
 */

const MAX_CONTEXT_CHARS = 2000; // ~500 tokens

/**
 * Compress a large JSON object into a concise text summary.
 * This is a heuristic compressor — no LLM call needed.
 */
export function compressContext(data: unknown, maxChars = MAX_CONTEXT_CHARS): string {
  const json = JSON.stringify(data, null, 2);

  // If already small, return as-is
  if (json.length <= maxChars) return json;

  // Try compact JSON first
  const compact = JSON.stringify(data);
  if (compact.length <= maxChars) return compact;

  // Deep compress: extract key fields only
  if (typeof data === "object" && data !== null) {
    const summary = extractKeySummary(data as Record<string, unknown>);
    const summaryJson = JSON.stringify(summary, null, 2);
    if (summaryJson.length <= maxChars) return summaryJson;

    // Last resort: truncate with marker
    return summaryJson.slice(0, maxChars - 50) + "\n... [truncated]";
  }

  return compact.slice(0, maxChars - 50) + "... [truncated]";
}

/**
 * Extract the most important fields from a nested object.
 */
function extractKeySummary(obj: Record<string, unknown>, depth = 0): unknown {
  if (depth > 2) return "[nested]";

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // For arrays, take first 3 items and count
      if (value.length <= 3) {
        result[key] = value.map((v) =>
          typeof v === "object" && v !== null
            ? extractKeySummary(v as Record<string, unknown>, depth + 1)
            : v
        );
      } else {
        result[key] = [
          ...value.slice(0, 2).map((v) =>
            typeof v === "object" && v !== null
              ? extractKeySummary(v as Record<string, unknown>, depth + 1)
              : v
          ),
          `... +${value.length - 2} more`,
        ];
      }
    } else if (typeof value === "object") {
      result[key] = extractKeySummary(value as Record<string, unknown>, depth + 1);
    } else if (typeof value === "string" && value.length > 200) {
      result[key] = value.slice(0, 200) + "...";
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Compress code output: keep file paths and languages, truncate content.
 */
export function compressCodeOutput(codeOutput: {
  files: Array<{ path: string; content: string; language: string }>;
  dependencies: string[];
  devDependencies: string[];
}): string {
  const summary = {
    fileCount: codeOutput.files.length,
    files: codeOutput.files.map((f) => ({
      path: f.path,
      language: f.language,
      lines: f.content.split("\n").length,
    })),
    dependencies: codeOutput.dependencies,
    devDependencies: codeOutput.devDependencies,
  };
  return JSON.stringify(summary, null, 2);
}
