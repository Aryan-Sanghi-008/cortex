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

export class BackendLeadBot extends BaseBot<LeadAssignment> {
  readonly role = BotRole.BACKEND_LEAD;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, LeadAssignmentSchema, "Backend-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.BACKEND_LEAD,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Product Spec:
${JSON.stringify(productSpec, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}`,
      task: `You are the Backend Lead / Technical Lead for the backend team.

Your responsibilities:
1. Make key architecture decisions for the backend (API structure, service layer, middleware)
2. Design the folder structure for the backend project
3. Break the backend work into clear modules:
   - API routes module (all REST endpoints)
   - Database/models module (Prisma schema, migrations)
   - Auth module (login, signup, middleware)
   - Service modules (business logic per domain)
   - Middleware module (error handling, validation, auth)
   - Config/setup module (server setup, env config, database connection)
4. For each module, specify exact file paths (including the main entry point like src/server.ts) and approach
5. Define shared patterns and technical guidelines, explicitly requiring STRICT TypeScript and STABLE dependency versions.

Think like a senior backend architect assigning work to developers.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "Must include database models module and backend entry point (src/server.ts)",
        "Must include authentication module",
        "Must include API routes for all data entities in documentation",
        "Include middleware for error handling, validation, and auth",
        "Include server setup and config files",
        "File paths must follow Node.js/Express conventions",
        "Explicitly forbid the use of beta/rc versions of backend libraries",
      ],
    };
  }
}
