import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * File-based LLM response cache.
 *
 * Caches LLM responses keyed by hash(systemPrompt + userPrompt).
 * Cache hit = 0 tokens, 0 cost.
 */

const CACHE_DIR = path.resolve("./.cortex-cache");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  response: string;
  model: string;
  timestamp: number;
}

export class LLMCache {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  private hashKey(systemPrompt: string, userPrompt: string): string {
    return createHash("sha256")
      .update(systemPrompt + "||" + userPrompt)
      .digest("hex")
      .slice(0, 16);
  }

  private getCachePath(key: string): string {
    return path.join(CACHE_DIR, `${key}.json`);
  }

  async get(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (!this.enabled) return null;

    const key = this.hashKey(systemPrompt, userPrompt);
    const filePath = this.getCachePath(key);

    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const entry: CacheEntry = JSON.parse(raw);

      // Check TTL
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        await fs.unlink(filePath).catch(() => {});
        return null;
      }

      logger.info(`Cache HIT for ${key.slice(0, 8)}... (saved tokens!)`);
      return entry.response;
    } catch {
      return null;
    }
  }

  async set(
    systemPrompt: string,
    userPrompt: string,
    response: string,
    model: string
  ): Promise<void> {
    if (!this.enabled) return;

    const key = this.hashKey(systemPrompt, userPrompt);
    const filePath = this.getCachePath(key);

    const entry: CacheEntry = {
      response,
      model,
      timestamp: Date.now(),
    };

    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entry), "utf-8");
    } catch {
      // Cache write failure is non-fatal
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.rm(CACHE_DIR, { recursive: true, force: true });
      logger.info("LLM cache cleared");
    } catch {}
  }
}

// Singleton
export const llmCache = new LLMCache();
