import { ShortTermMemory } from "../memory/index.js";

// ─── Bot Role Enum ────────────────────────────────────────────
export enum BotRole {
  DOC_GENERATOR = "doc-generator",
  PRODUCT_OWNER = "product-owner",
  TECH_STACK = "tech-stack",
  RESOURCE_PLANNER = "resource-planner",
  FRONTEND_LEAD = "frontend-lead",
  FRONTEND_DEV = "frontend-dev",
  BACKEND_LEAD = "backend-lead",
  BACKEND_DEV = "backend-dev",
  DATABASE = "database",
  QA = "qa",
  QA_DEV = "qa-dev",
  DATA_DEV = "data-dev",
  DEVOPS = "devops",
  PRINCIPAL = "principal",
  LEAD_REVIEWER = "lead-reviewer",
}

// ─── Bot execution result ─────────────────────────────────────
export interface BotResult<T = unknown> {
  role: BotRole;
  instanceId: string;
  output: T;
  retries: number;
  durationMs: number;
}

// ─── Bot interface ────────────────────────────────────────────
export interface Bot<TOutput = unknown> {
  readonly role: BotRole;
  readonly instanceId: string;

  /**
   * Execute the bot's task.
   * @param memory - Shared short-term memory containing all prior bot outputs.
   */
  execute(memory: ShortTermMemory): Promise<BotResult<TOutput>>;
}
