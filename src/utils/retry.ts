import { logger } from "./logger.js";

/**
 * Retry a function up to `maxRetries` times with smart backoff.
 *
 * For rate-limit errors (429), extracts the retry delay from the error
 * message and waits that long. For other errors, uses exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  onError?: (attempt: number, error: unknown) => void
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (onError) {
        onError(attempt, err);
      } else {
        logger.warn(
          `Attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (attempt < maxRetries) {
        const delay = getRateLimitDelay(err) ?? Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.info(`Waiting ${Math.round(delay / 1000)}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Extract retry delay from rate-limit error messages.
 * Looks for patterns like "retry in 55s" or "retryDelay":"52s"
 */
function getRateLimitDelay(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);

  if (!msg.includes("429") && !msg.includes("Too Many Requests") && !msg.includes("rate")) {
    return null;
  }

  // Match "retryDelay":"52s" or "retry in 55.25s"
  const match = msg.match(/retry(?:Delay)?[:\s"]*?(\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    // Add 2s buffer
    return (seconds + 2) * 1000;
  }

  // Default rate-limit wait: 60 seconds
  return 60_000;
}
