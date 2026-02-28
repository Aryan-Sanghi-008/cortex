import { LLMProviderName } from "../llm/types.js";
import chalk from "chalk";

/**
 * Token Tracker — counts tokens and estimates costs per bot, per project.
 *
 * Supports both:
 *   - Exact token counts from API responses (preferred)
 *   - Estimated counts from text length (~1 token per 4 characters)
 */

/** Cost per 1M tokens in USD */
interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  "gpt-5-nano": { inputPer1M: 0.05, outputPer1M: 0.40 },

  // Gemini
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.5-pro-preview-05-06": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-2.0-pro": { inputPer1M: 1.0, outputPer1M: 4.0 },

  // DeepSeek
  "deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek-coder": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19 },
  "deepseek-ai/deepseek-r1-distill-llama-70b": { inputPer1M: 0.14, outputPer1M: 0.28 },
};

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 1.0, outputPer1M: 3.0 };

export interface BotUsage {
  botName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  calls: number;
}

export interface ProjectCostBreakdown {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  perBot: BotUsage[];
  modelUsage: Array<{ model: string; calls: number; tokens: number; cost: number }>;
}

export class TokenTracker {
  private usage: BotUsage[] = [];

  /** Estimate token count from text length */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Record a single LLM call using estimated tokens (from text length) */
  record(
    botName: string,
    model: string,
    inputText: string,
    outputText: string
  ): { inputTokens: number; outputTokens: number; cost: number } {
    const inputTokens = TokenTracker.estimateTokens(inputText);
    const outputTokens = TokenTracker.estimateTokens(outputText);
    return this.recordExact(botName, model, inputTokens, outputTokens);
  }

  /**
   * Record a single LLM call using EXACT token counts from the API response.
   * Preferred over `record()` when the provider returns usage data.
   */
  recordExact(
    botName: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { inputTokens: number; outputTokens: number; cost: number } {
    const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;

    const cost =
      (inputTokens / 1_000_000) * pricing.inputPer1M +
      (outputTokens / 1_000_000) * pricing.outputPer1M;

    // Find or create bot entry
    let entry = this.usage.find((u) => u.botName === botName);
    if (!entry) {
      entry = { botName, model, inputTokens: 0, outputTokens: 0, cost: 0, calls: 0 };
      this.usage.push(entry);
    }

    entry.inputTokens += inputTokens;
    entry.outputTokens += outputTokens;
    entry.cost += cost;
    entry.calls += 1;
    entry.model = model; // last model used

    return { inputTokens, outputTokens, cost };
  }

  /** Get full cost breakdown */
  getBreakdown(): ProjectCostBreakdown {
    const totalInputTokens = this.usage.reduce((s, u) => s + u.inputTokens, 0);
    const totalOutputTokens = this.usage.reduce((s, u) => s + u.outputTokens, 0);
    const totalCost = this.usage.reduce((s, u) => s + u.cost, 0);

    // Aggregate by model
    const modelMap = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const u of this.usage) {
      const existing = modelMap.get(u.model) ?? { calls: 0, tokens: 0, cost: 0 };
      existing.calls += u.calls;
      existing.tokens += u.inputTokens + u.outputTokens;
      existing.cost += u.cost;
      modelMap.set(u.model, existing);
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      perBot: [...this.usage],
      modelUsage: Array.from(modelMap.entries()).map(([model, data]) => ({ model, ...data })),
    };
  }

  /** Get total tokens consumed so far */
  getTotalTokens(): number {
    return this.usage.reduce((s, u) => s + u.inputTokens + u.outputTokens, 0);
  }

  /**
   * Check if we've exceeded the token limit.
   * Throws TokenLimitExceeded if over.
   */
  checkLimit(limit?: number): void {
    const max = limit ?? parseInt(process.env.MAX_TOKENS ?? "1500000", 10);
    const total = this.getTotalTokens();
    if (total >= max) {
      throw new TokenLimitExceeded(
        `🛑 Token limit reached: ${total.toLocaleString()} / ${max.toLocaleString()} tokens. ` +
        `Pipeline stopped to prevent excessive API costs. ` +
        `Increase MAX_TOKENS in .env to allow more.`
      );
    }
  }

  /**
   * Print a formatted token usage summary to the terminal.
   */
  printSummary(): void {
    const breakdown = this.getBreakdown();

    console.log("");
    console.log(chalk.bold.bgMagenta.white("  📊 Token Usage Summary  "));
    console.log("");

    // Per-bot table
    console.log(chalk.bold("  Bot                        Model              Input      Output     Total      Cost"));
    console.log(chalk.dim("  ─────────────────────────  ─────────────────  ─────────  ─────────  ─────────  ──────────"));

    for (const bot of breakdown.perBot) {
      const name = bot.botName.padEnd(27);
      const model = bot.model.padEnd(17);
      const input = bot.inputTokens.toLocaleString().padStart(9);
      const output = bot.outputTokens.toLocaleString().padStart(9);
      const total = (bot.inputTokens + bot.outputTokens).toLocaleString().padStart(9);
      const cost = `$${bot.cost.toFixed(4)}`.padStart(10);

      console.log(`  ${chalk.cyan(name)}  ${chalk.dim(model)}  ${input}  ${output}  ${chalk.white(total)}  ${chalk.green(cost)}`);
    }

    console.log(chalk.dim("  ─────────────────────────  ─────────────────  ─────────  ─────────  ─────────  ──────────"));

    // Totals
    const totalInput = breakdown.totalInputTokens.toLocaleString().padStart(9);
    const totalOutput = breakdown.totalOutputTokens.toLocaleString().padStart(9);
    const totalTokens = breakdown.totalTokens.toLocaleString().padStart(9);
    const totalCost = `$${breakdown.totalCost.toFixed(4)}`.padStart(10);

    console.log(`  ${chalk.bold("TOTAL".padEnd(27))}  ${"".padEnd(17)}  ${totalInput}  ${totalOutput}  ${chalk.bold.white(totalTokens)}  ${chalk.bold.green(totalCost)}`);
    console.log("");

    // Model summary
    if (breakdown.modelUsage.length > 0) {
      console.log(chalk.bold("  Models used:"));
      for (const m of breakdown.modelUsage) {
        console.log(`    ${chalk.cyan(m.model)}: ${m.calls} calls, ${m.tokens.toLocaleString()} tokens, ${chalk.green(`$${m.cost.toFixed(4)}`)}`);
      }
      console.log("");
    }
  }

  /** Reset for new project */
  reset(): void {
    this.usage = [];
  }
}

/**
 * Custom error for token limit exceeded — caught by the orchestrator.
 */
export class TokenLimitExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenLimitExceeded";
  }
}

/**
 * Estimate project cost before running, based on complexity.
 */
export function estimateProjectCost(
  projectType: string,
  featureCount: number,
  provider: LLMProviderName
): {
  estimatedCost: string;
  estimatedTokens: string;
  draftsToProduction: string;
  confidence: string;
  breakdown: string;
} {
  // Base tokens per bot call (approximate)
  const baseCosts = {
    planning: 4, // 4 planning bots × ~2k tokens each
    leads: 2,    // 2 leads × ~3k tokens each
    devs: featureCount * 2, // ~ 2 dev calls per feature
    qa: 1,
    devops: 1,
    principal: 1,
  };

  const totalCalls = Object.values(baseCosts).reduce((a, b) => a + b, 0);
  const avgTokensPerCall = 4000; // input + output
  const totalTokens = totalCalls * avgTokensPerCall;

  // Get pricing for provider
  const modelPricing =
    provider === "gemini"
      ? MODEL_PRICING["gemini-2.0-flash"]
      : provider === "deepseek"
        ? MODEL_PRICING["deepseek-chat"]
        : MODEL_PRICING["gpt-5-nano"];

  if (!modelPricing) {
    return {
      estimatedCost: "Unknown",
      estimatedTokens: `~${(totalTokens / 1000).toFixed(0)}K`,
      draftsToProduction: "2-3",
      confidence: "N/A",
      breakdown: "No pricing available for this provider.",
    };
  }

  const avgCostPer1M = (modelPricing.inputPer1M + modelPricing.outputPer1M) / 2;
  const cost = (totalTokens / 1_000_000) * avgCostPer1M;

  return {
    estimatedCost: `$${cost.toFixed(2)} - $${(cost * 2.5).toFixed(2)}`,
    estimatedTokens: `~${(totalTokens / 1000).toFixed(0)}K - ${((totalTokens * 2.5) / 1000).toFixed(0)}K`,
    draftsToProduction: featureCount <= 5 ? "1-2" : featureCount <= 15 ? "2-3" : "3-4",
    confidence:
      featureCount <= 5
        ? "Draft 1: ~70% accuracy"
        : featureCount <= 15
          ? "Draft 1: ~60% | Draft 2: ~80%"
          : "Draft 1: ~50% | Draft 2: ~70% | Draft 3: ~85%",
    breakdown: [
      `Planning bots: ${baseCosts.planning} calls`,
      `Lead bots: ${baseCosts.leads} calls`,
      `Dev bots: ${baseCosts.devs} calls`,
      `QA + DevOps + Principal: ${baseCosts.qa + baseCosts.devops + baseCosts.principal} calls`,
      `Total: ~${totalCalls} LLM calls`,
    ].join("\n"),
  };
}
