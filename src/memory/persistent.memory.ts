import fs from "fs/promises";
import path from "path";
import { ShortTermMemory } from "./short-term.memory.js";
import { logger } from "../utils/logger.js";

/**
 * Persistent memory — writes project outputs to disk as JSON files.
 * Each project gets its own directory under the configured output dir.
 */
export class PersistentMemory {
  private outputDir: string;

  constructor(baseOutputDir: string) {
    this.outputDir = baseOutputDir;
  }

  /**
   * Save a single bot output to disk.
   */
  async saveOutput(
    projectId: string,
    key: string,
    data: unknown
  ): Promise<string> {
    const dir = path.join(this.outputDir, projectId);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    logger.info(`Saved ${key} → ${filePath}`);
    return filePath;
  }

  /**
   * Save the entire project state from short-term memory to disk.
   */
  async saveProject(memory: ShortTermMemory): Promise<string> {
    const dir = path.join(this.outputDir, memory.projectId);
    await fs.mkdir(dir, { recursive: true });

    // Save all entries
    const allData = memory.getAll();
    for (const [key, value] of Object.entries(allData)) {
      await this.saveOutput(memory.projectId, key, value);
    }

    // Save decision log
    await this.saveOutput(
      memory.projectId,
      "decision-log",
      memory.getDecisionLog()
    );

    // Save full project bundle
    const bundlePath = path.join(dir, "project-bundle.json");
    const bundle = {
      projectId: memory.projectId,
      productIdea: memory.productIdea,
      generatedAt: new Date().toISOString(),
      outputs: allData,
      decisionLog: memory.getDecisionLog(),
    };
    await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf-8");

    logger.success(`Full project saved → ${dir}`);
    return dir;
  }

  /**
   * Load a previously saved project output.
   */
  async loadOutput<T>(projectId: string, key: string): Promise<T | null> {
    try {
      const filePath = path.join(this.outputDir, projectId, `${key}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
