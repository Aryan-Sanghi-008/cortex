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
      task: `Determine the optimal engineering team composition for this project. Think like a seasoned Engineering Manager planning a sprint — you need enough parallelism to move fast, but not so many engineers that coordination overhead kills velocity.

Analyze the project systematically:

1. **Scope Assessment**
   - Count the total number of epics, user stories, and acceptance criteria to gauge overall volume
   - Identify the number of distinct UI pages/screens (drives frontend bot count)
   - Count the number of distinct API endpoints and data models (drives backend bot count)
   - Assess the overall complexity: CRUD-heavy (simple) vs. real-time/workflow-heavy (complex)

2. **Frontend Complexity Analysis**
   - Simple: < 5 pages, mostly static content, minimal state → 1 frontend bot
   - Medium: 5-10 pages, forms, dashboards, moderate state management → 2 frontend bots
   - Complex: 10+ pages, real-time updates, complex data tables, rich interactions → 3 frontend bots
   - Consider: Does it need a design system? Complex charts? File uploads? Real-time features?

3. **Backend Complexity Analysis**
   - Simple: < 10 endpoints, basic CRUD, simple auth → 1 backend bot
   - Medium: 10-20 endpoints, complex business logic, RBAC, file handling → 2 backend bots
   - Complex: 20+ endpoints, real-time WebSockets, complex workflows, integrations → 3 backend bots
   - Consider: Multi-step workflows? Background jobs? Third-party integrations? Complex validation?

4. **QA Complexity Analysis**
   - Standard: Straightforward CRUD app → 1 QA bot
   - Complex: Many user roles, complex state transitions, payment flows → 2 QA bots
   - Consider: How many distinct user personas need testing? How many permission boundaries?

5. **Leadership Ratio**
   - leaderBots: ceil(totalDevBots / 5), minimum 1
   - Leaders provide architecture guidance and code review — too few leads means inconsistent code, too many means wasted capacity

6. **DevOps**
   - devopsBots: 1 for standard projects (Docker + CI/CD + deployment config)
   - Only 2 if the infrastructure is unusually complex (multi-region, multiple databases, complex networking)

Allocation Rules:
- frontendBots: 1-3 based on UI page count and interaction complexity
- backendBots: 1-3 based on API endpoint count and business logic complexity
- qaBots: 1-2 based on feature count and testing complexity
- leaderBots: ceil(totalOtherBots / 5), minimum 1
- devopsBots: 1 (standard), 2 (complex infra)

Provide detailed reasoning for each allocation decision, tied to specific features from the product spec.`,
      schemaDescription: RESOURCE_PLAN_SCHEMA_DESCRIPTION,
      constraints: [
        "All bot counts must be >= 1",
        "leaderBots should be approximately ceil(totalOtherBots / 5), minimum 1",
        "devopsBots is typically 1 unless the infra is unusually complex (multi-region, custom networking)",
        "Total bots should be proportional to project scope — a simple CRUD app should NOT get 10+ bots",
        "Provide specific reasoning for each allocation, referencing actual features from the product spec",
        "Consider the dependency chain: database schema → backend routes → frontend integration → testing",
        "Factor in the tech stack complexity — unfamiliar or complex stacks may need more bots",
      ],
    };
  }
}
