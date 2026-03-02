import { jsonrepair } from "jsonrepair";
import { logger } from "./logger.js";

/**
 * Robust JSON extraction and repair utility.
 * Handles:
 * 1. DeepSeek R1 `<think>...</think>` reasoning blocks.
 * 2. Markdown formatting fences (e.g. ` ```json `).
 * 3. Truncated JSON strings or trailing commas via `jsonrepair`.
 */
export function parseJsonSafely(raw: string, contextName: string = "Parser"): unknown {
  // 1. Strip <think>...</think> blocks (R1 reasoning models)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Strip Markdown formatting fences if open-source models hallucinate them
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 3. Try to find the first { or [ and last } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    // Return early if no JSON-like structure is found at all.
    // Let the main try-catch attempt to parse the raw text.
  } else {
    if (firstBrace === -1) start = firstBracket;
    else if (firstBracket === -1) start = firstBrace;
    else start = Math.min(firstBrace, firstBracket);

    const isArray = cleaned[start] === "[";
    const lastClose = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");

    if (lastClose !== -1) {
      cleaned = cleaned.slice(start, lastClose + 1);
    }
  }

  // 4. Try parsing cleanly first
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // 5. If it failed (likely due to truncation or trailing commas), hit it with jsonrepair
    logger.warn(`${contextName}: Native JSON parse failed (${cleaned.length} chars). Attempting jsonrepair...`);
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired);
    } catch (repairErr) {
      logger.error(`${contextName}: Fatal JSON parse failure even after jsonrepair.`);
      throw new Error(`Failed to parse JSON output: ${repairErr instanceof Error ? repairErr.message : String(repairErr)}`);
    }
  }
}
