import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import {
  TechStackOutput,
  TechStackOutputSchema,
  TECH_STACK_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class TechStackBot extends BaseBot<TechStackOutput> {
  readonly role = BotRole.TECH_STACK;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, TechStackOutputSchema, "TechStackSelector", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.TECH_STACK,
      context: `Product Idea: ${memory.productIdea}

Product Specification:
${JSON.stringify(productSpec, null, 2)}`,
      task: `Based on the product specification, select the optimal technology stack.

Consider:
1. Functional requirements from the user stories
2. Non-functional requirements (scalability, performance, security)
3. Development speed vs long-term maintainability
4. Cost implications of infrastructure choices
5. Team size feasibility

Provide clear justifications for each technology choice.`,
      schemaDescription: TECH_STACK_SCHEMA_DESCRIPTION,
      constraints: [
        "Select production-proven technologies",
        "Frontend and backend must be compatible",
        "Database choice must support the data model implied by user stories",
        "Auth strategy must support the required user roles",
        "ALWAYS specify 'latest stable' versions for dependencies (e.g., specific major versions or ^x.y.z)",
        "NEVER use 'latest' if it resolves to a beta or release candidate",
      ],
    };
  }
}
