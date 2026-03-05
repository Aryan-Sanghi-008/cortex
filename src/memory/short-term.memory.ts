import { DecisionLogEntry, MemoryEntry, ProjectMemory } from "./types.js";

/**
 * Short-term memory — in-process Map that holds current project state.
 * All bot outputs are stored here during pipeline execution.
 */
export class ShortTermMemory {
  private memory: ProjectMemory;

  constructor(projectId: string, productIdea: string) {
    this.memory = {
      projectId,
      productIdea,
      entries: new Map(),
      decisionLog: [],
    };
  }

  get projectId(): string {
    return this.memory.projectId;
  }

  get productIdea(): string {
    return this.memory.productIdea;
  }

  set<T>(key: string, value: T, botRole?: string): void {
    this.memory.entries.set(key, {
      key,
      value,
      timestamp: Date.now(),
      botRole,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.memory.entries.get(key);
    return entry?.value as T | undefined;
  }

  has(key: string): boolean {
    return this.memory.entries.has(key);
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of this.memory.entries) {
      result[key] = entry.value;
    }
    return result;
  }

  addDecision(entry: Omit<DecisionLogEntry, "timestamp">): void {
    this.memory.decisionLog.push({
      ...entry,
      timestamp: Date.now(),
    });
  }

  getDecisionLog(): DecisionLogEntry[] {
    return [...this.memory.decisionLog];
  }

  clear(): void {
    this.memory.entries.clear();
    this.memory.decisionLog = [];
  }

  /**
   * Build a context string from all stored entries for prompt injection.
   * @deprecated Bots should use their own buildPromptParts() with formatters instead.
   */
  buildContextString(): string {
    const parts: string[] = [`Product Idea: ${this.memory.productIdea}`];

    for (const [key, entry] of this.memory.entries) {
      parts.push(
        `\n--- ${key} ---\n${JSON.stringify(entry.value)}`
      );
    }

    return parts.join("\n");
  }
}
