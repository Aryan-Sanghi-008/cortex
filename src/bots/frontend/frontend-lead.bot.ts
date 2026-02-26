import { BaseBot } from "../base.bot.js";
import { BotRole } from "../types.js";
import { LLMProvider } from "../../llm/types.js";
import { ShortTermMemory } from "../../memory/short-term.memory.js";
import { PromptParts } from "../../utils/prompt-builder.js";
import {
  LeadAssignment,
  LeadAssignmentSchema,
  LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
} from "../../validation/index.js";

export class FrontendLeadBot extends BaseBot<LeadAssignment> {
  readonly role = BotRole.FRONTEND_LEAD;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, LeadAssignmentSchema, "Frontend-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.FRONTEND_LEAD,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Product Spec:
${JSON.stringify(productSpec, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}`,
      task: `You are the Frontend Lead / Technical Lead for the frontend team.

Your responsibilities:
1. Make key architecture decisions for the frontend
2. Design the folder structure following the selected framework's conventions
3. Break the frontend work into clear modules
4. For each module, specify:
   - What files the dev bot should create (exact file paths, including App.tsx, main.tsx, etc. if setting up a new app)
   - The technical approach to follow
   - Specific requirements and patterns to use
5. Define shared patterns (naming, code style, error handling)
6. Set technical guidelines that all frontend devs must follow, explicitly requiring STRICT TypeScript and STABLE dependency versions.

Think like a real senior lead assigning work to junior/mid developers.
Be very specific about file paths, component names, and approach.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "File paths must match the folder structure you define. Specifically include entry points (like src/main.tsx or app/layout.tsx)",
        "Every page from the documentation must be covered by a module",
        "Include auth-related pages (login, signup, protected routes)",
        "Include shared components (layout, navbar, sidebar, etc.)",
        "State management setup must be a module",
        "API integration layer must be a module",
        "Explicitly forbid the use of beta/rc versions of frontend libraries",
      ],
    };
  }
}
