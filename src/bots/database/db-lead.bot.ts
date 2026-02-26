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

export class DBLeadBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.DATABASE;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, CodeOutputSchema, "Database-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.DATABASE,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Product Spec:
${JSON.stringify(productSpec, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}`,
      task: `You are the Database Lead. Design and write the complete database layer.

Generate the following files:
1. Prisma schema file (prisma/schema.prisma) with ALL models, relationships, enums
2. Database seed file (prisma/seed.ts) with realistic sample data
3. Database utility/connection file (src/lib/db.ts)

For the Prisma schema:
- Include ALL data entities from the documentation
- Define proper relationships (1:1, 1:N, N:N)
- Include indexes on frequently queried fields
- Include created/updated timestamps on all models
- Use proper field types (String, Int, DateTime, Boolean, etc.)
- Include enums where appropriate (user roles, status fields, etc.)
- Add @@map and @map for table/column naming if needed
- Ensure the schema compiles flawlessly without syntax errors

The seed file should include at least 3-5 records per model with realistic data.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "schema.prisma must contain ALL models from the data entities with valid Prisma syntax",
        "Every relationship must be properly defined and thoroughly validated",
        "Include User model with auth fields (email, password hash, role)",
        "Include timestamps (createdAt, updatedAt) on every model",
        "Seed file must use Prisma Client with proper async/await and STRICT TypeScript",
        "db.ts must export a singleton PrismaClient instance",
        "ALWAYS specify stable versions of `prisma` and `@prisma/client` in dependencies",
      ],
    };
  }
}
