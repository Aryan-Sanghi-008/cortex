/**
 * Project Store — bot memory from past projects.
 *
 * Stores completed project metadata and enables similarity
 * matching so bots learn from past experiences.
 */

import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";

interface ProjectRecord {
  id: string;
  prompt: string;
  projectType: string;
  features: string[];
  techStack: { frontend: string[]; backend: string[]; database: string };
  fileCount: number;
  qualityScore: number;
  lessons: string[];
  keywords: string[];
  createdAt: string;
}

const STORE_PATH = path.resolve("./data/project-history.json");

export class ProjectStore {
  private projects: ProjectRecord[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(STORE_PATH, "utf-8");
      this.projects = JSON.parse(raw);
      this.loaded = true;
      logger.info(`[Memory] Loaded ${this.projects.length} past projects`);
    } catch {
      this.projects = [];
      this.loaded = true;
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(this.projects, null, 2));
  }

  /**
   * Store a completed project for future reference.
   */
  async addProject(record: Omit<ProjectRecord, "keywords" | "createdAt">): Promise<void> {
    await this.load();

    const keywords = this.extractKeywords(record.prompt, record.features);

    this.projects.push({
      ...record,
      keywords,
      createdAt: new Date().toISOString(),
    });

    await this.save();
    logger.info(`[Memory] Stored project ${record.id} (${this.projects.length} total)`);
  }

  /**
   * Find similar past projects using keyword matching (TF-IDF style).
   */
  async findSimilar(prompt: string, topK = 3): Promise<ProjectRecord[]> {
    await this.load();

    if (this.projects.length === 0) return [];

    const queryKeywords = this.extractKeywords(prompt, []);

    const scored = this.projects.map((project) => {
      const overlap = queryKeywords.filter((kw) =>
        project.keywords.includes(kw)
      ).length;
      const score = overlap / Math.max(queryKeywords.length, 1);
      return { project, score };
    });

    return scored
      .filter((s) => s.score > 0.1) // min 10% keyword overlap
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.project);
  }

  /**
   * Format past experiences for bot prompt injection.
   */
  formatForPrompt(similar: ProjectRecord[]): string {
    if (similar.length === 0) return "";

    const lines = similar.map((p, i) => {
      return [
        `Past Project ${i + 1}: "${p.prompt.slice(0, 100)}"`,
        `  Type: ${p.projectType}`,
        `  Tech: ${p.techStack.frontend.join(", ")} + ${p.techStack.backend.join(", ")} + ${p.techStack.database}`,
        `  Quality: ${p.qualityScore}/10`,
        `  Files: ${p.fileCount}`,
        p.lessons.length > 0
          ? `  Lessons: ${p.lessons.join("; ")}`
          : "",
      ].filter(Boolean).join("\n");
    });

    return `\n\nBased on ${similar.length} similar past projects:\n${lines.join("\n\n")}`;
  }

  /**
   * Extract keywords from prompt and features for similarity matching.
   */
  private extractKeywords(prompt: string, features: string[]): string[] {
    const stopWords = new Set([
      "a", "an", "the", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "could", "should", "may", "might", "can", "shall",
      "to", "of", "in", "for", "on", "with", "at", "by", "from",
      "and", "or", "but", "not", "no", "if", "then", "else", "when",
      "up", "out", "about", "into", "through", "during", "before",
      "after", "above", "below", "between", "under", "again",
      "i", "me", "my", "we", "our", "you", "your", "he", "she",
      "it", "they", "them", "this", "that", "these", "those",
      "build", "create", "make", "want", "need", "like", "app",
      "website", "platform", "system", "application", "project",
    ]);

    const text = `${prompt} ${features.join(" ")}`.toLowerCase();
    const words = text.match(/[a-z]+/g) ?? [];

    return [...new Set(words.filter((w) => w.length > 2 && !stopWords.has(w)))];
  }
}
