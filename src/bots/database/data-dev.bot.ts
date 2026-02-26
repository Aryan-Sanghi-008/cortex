import { BaseBot } from "../base.bot.js";
import { BotRole } from "../types.js";
import { LLMProvider } from "../../llm/types.js";
import { ShortTermMemory } from "../../memory/short-term.memory.js";
import { PromptParts } from "../../utils/prompt-builder.js";
import {
  CodeOutput,
  CodeOutputSchema,
  CODE_OUTPUT_SCHEMA_DESCRIPTION,
} from "../../validation/index.js";

export class DataDevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.DATA_DEV;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, CodeOutputSchema, "Data-Dev", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const dbLeadOutput = memory.get("database-lead");

    return {
      role: BotRole.DATA_DEV,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}

Database Lead Design:
${JSON.stringify(dbLeadOutput, null, 2)}`,
      task: `You are the Data Developer. Write the implementation for the database access layer and any required seed scripts or complex migrations based on the Database Lead's schema.

Generate the following files as needed:
1. Repositories or data access utilities (e.g., src/lib/repositories/user.repository.ts)
2. Complex seed data scripts (if the lead omitted them or if they need expansion)
3. Any custom database utility scripts

CRITICAL RULES:
1. Write COMPLETE, PRODUCTION-READY code — no placeholders, no TODOs.
2. Every file must be a complete, working file.
3. Use the exact tech stack specified, ensuring you use STABLE versions of ORMs/database drivers.
4. Use strict TypeScript with proper typing for all database queries and parameters. Avoid 'any'.
5. Include proper error handling for all database operations (e.g., handling unique constraint violations, connection errors).`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Include strict TypeScript typings for all database operations",
        "Handle database errors gracefully without crashing the app",
        "No placeholder code — all queries and repository methods must be fully implemented",
        "Use the exact Prisma/ORM models defined by the Database Lead",
      ],
    };
  }
}
