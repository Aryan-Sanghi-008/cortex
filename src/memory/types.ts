export interface MemoryEntry {
  key: string;
  value: unknown;
  timestamp: number;
  botRole?: string;
}

export interface ProjectMemory {
  projectId: string;
  productIdea: string;
  entries: Map<string, MemoryEntry>;
  decisionLog: DecisionLogEntry[];
}

export interface DecisionLogEntry {
  timestamp: number;
  step: string;
  botRole: string;
  decision: string;
  reasoning?: string;
}
