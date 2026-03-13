import { jsonrepair } from "jsonrepair";
import { logger } from "./logger.js";

/**
 * Robust JSON extraction and repair utility.
 * Handles:
 * 1. DeepSeek R1 `<think>...</think>` reasoning blocks.
 * 2. Markdown formatting fences (e.g. ` ```json `).
 * 3. Truncated JSON strings or trailing commas via `jsonrepair`.
 * 4. Pre-repair truncation recovery (close unclosed structures).
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
    } else {
      // No closing bracket/brace found — likely truncated
      cleaned = cleaned.slice(start);
    }
  }

  // 4. Try parsing cleanly first
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // 5. Pre-repair: detect and fix truncation before jsonrepair
    logger.warn(`${contextName}: Native JSON parse failed (${cleaned.length} chars). Attempting truncation repair...`);
    
    let repairInput = cleaned;
    try {
      repairInput = closeTruncatedJson(cleaned);
    } catch {
      // If our pre-repair fails, pass the original to jsonrepair
    }

    // 6. Hit it with jsonrepair
    try {
      const repaired = jsonrepair(repairInput);
      return JSON.parse(repaired);
    } catch (repairErr) {
      logger.error(`${contextName}: Fatal JSON parse failure even after jsonrepair.`);
      throw new Error(`Failed to parse JSON output: ${repairErr instanceof Error ? repairErr.message : String(repairErr)}`);
    }
  }
}

/**
 * Attempt to close a truncated JSON structure by balancing brackets.
 * This helps jsonrepair succeed on severely truncated outputs where
 * the model hit maxOutputTokens mid-JSON.
 */
function closeTruncatedJson(input: string): string {
  let result = input;

  // Remove trailing incomplete string (unclosed quote)
  // Look for the last complete key-value or array element
  const lastQuote = result.lastIndexOf('"');
  if (lastQuote > 0) {
    // Count unescaped quotes to check if we're inside a string
    let quoteCount = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '"' && (i === 0 || result[i - 1] !== '\\')) {
        quoteCount++;
      }
    }
    // Odd number of quotes = unclosed string
    if (quoteCount % 2 !== 0) {
      // Close the dangling string
      result += '"';
    }
  }

  // Remove trailing comma (common in truncated arrays/objects)
  result = result.replace(/,\s*$/, "");

  // Count unclosed braces and brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (ch === '"' && (i === 0 || result[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // Close unclosed structures
  for (let i = 0; i < openBrackets; i++) result += "]";
  for (let i = 0; i < openBraces; i++) result += "}";

  return result;
}
