import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import {
  ResourcePlanOutput,
  ResourcePlanOutputSchema,
  RESOURCE_PLAN_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class ResourcePlannerBot extends BaseBot<ResourcePlanOutput> {
  readonly role = BotRole.RESOURCE_PLANNER;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, ResourcePlanOutputSchema, "ResourcePlanner", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const productSpec = memory.get("product-owner");
    const techStack = memory.get("tech-stack");

    return {
      role: BotRole.RESOURCE_PLANNER,
      context: `Product Idea: ${memory.productIdea}

Product Specification:
${JSON.stringify(productSpec, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}`,
      task: `Determine the optimal number of AI engineering bots to allocate for this project.

Consider:
1. Number of epics and user stories (scope)
2. Technical complexity of the chosen stack
3. Number of frontend vs backend features
4. Testing requirements

Allocation guidelines:
- frontendBots: 1-3 based on UI complexity
- backendBots: 1-3 based on API/service complexity
- qaBots: 1-2 based on feature count
- leaderBots: ceil(totalBots / 5), minimum 1
- devopsBots: 1 (standard)

Provide reasoning for your allocation decisions.`,
      schemaDescription: RESOURCE_PLAN_SCHEMA_DESCRIPTION,
      constraints: [
        "All bot counts must be >= 1",
        "leaderBots should be approximately ceil(totalOtherBots / 5), minimum 1",
        "devopsBots is typically 1 unless the infra is unusually complex",
        "Total bots should be proportional to project scope",
      ],
    };
  }
}
