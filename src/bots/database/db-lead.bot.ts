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
${JSON.stringify(doc)}

Product Spec:
${JSON.stringify(productSpec)}

Technology Stack:
${JSON.stringify(techStack)}`,
      task: `You are the Database Lead — a senior DBA and data architect. Design and write the COMPLETE database layer for this project with the rigor of someone designing a schema that will hold millions of records.

Generate the following files:

1. **Prisma Schema (prisma/schema.prisma)** — This is the most critical file. It must be FLAWLESS.
   - Generator and datasource blocks configured for the chosen database
   - EVERY data entity from the documentation must have a model
   - Model design principles:
     • Every model has an \`id\` field (String @id @default(cuid()) or autoincrement Int as appropriate)
     • Every model has \`createdAt DateTime @default(now())\` and \`updatedAt DateTime @updatedAt\`
     • Use proper scalar types: String for text, Int for counts, Float for decimals, Boolean for flags, DateTime for timestamps, Json for flexible data
     • Use Prisma enums for bounded value sets (UserRole, Status, Priority, etc.)
   - Relationship design:
     • 1:1 relationships: use @relation with explicit foreign key field
     • 1:N relationships: parent has \`children ModelName[]\`, child has \`parent ModelName @relation(fields: [parentId], references: [id])\`
     • N:N relationships: use explicit join table with \`@@id([fieldA, fieldB])\` if join table needs metadata (like role, joinedAt), otherwise use implicit many-to-many
     • Set proper onDelete behavior: Cascade for owned children, SetNull for optional references, Restrict for protected references
   - Indexing strategy:
     • @@index on foreign key fields (Prisma does this automatically, but verify)
     • @@index on fields used in WHERE clauses (status, email, slug)
     • @@unique on business-unique fields (email, slug, [tenantId, name] for tenant-scoped uniqueness)
     • Compound indexes for common query patterns: @@index([userId, createdAt]) for "my recent items"
   - Include a User model with:
     • id, email (unique), passwordHash, name, role (enum: ADMIN, USER, etc.)
     • Profile fields as appropriate (avatar, bio, phone)
     • createdAt, updatedAt, lastLoginAt, isActive (for soft-disable)
   - Include audit/tracing fields where compliance requires: createdBy, updatedBy

2. **Seed File (prisma/seed.ts)** — Realistic, interconnected test data
   - Use PrismaClient with async/await
   - Create data in dependency order: Users first, then dependent entities
   - Generate 3-5 records per model with REALISTIC data (proper names, emails, descriptions — not "Test User 1")
   - Use upsert where appropriate to make the seed idempotent (can run multiple times safely)
   - Include users with different roles for testing RBAC
   - Include data in different states (active, inactive, pending) to test filtering
   - Handle errors gracefully and log progress
   - End with \`prisma.$disconnect()\` in a finally block

3. **Database Client (src/lib/db.ts)** — Singleton PrismaClient
   - Export a singleton PrismaClient instance
   - Configure connection pooling if needed
   - Handle the "multiple PrismaClient instances in development" warning
   - Add graceful shutdown: listen for SIGINT/SIGTERM and call \`prisma.$disconnect()\`

The Prisma schema MUST compile without errors. Test it mentally — every @relation must have matching fields and references, every enum must be defined before use, every @@index must reference existing fields.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "schema.prisma MUST contain ALL data entities from the documentation — missing a model means missing an entire feature",
        "EVERY relationship must have correct Prisma syntax: @relation(fields: [...], references: [...]) on the foreign key side",
        "EVERY model must have id, createdAt, updatedAt fields",
        "Include a User model with email (unique), passwordHash, name, role (enum), and authentication fields",
        "Seed file must use async/await with proper error handling and prisma.$disconnect() in finally",
        "Seed data must be REALISTIC — proper names, valid emails, meaningful descriptions",
        "db.ts must export a singleton PrismaClient with the globalThis pattern to prevent multiple instances",
        "ALWAYS specify stable versions of 'prisma' and '@prisma/client' — NEVER beta or RC versions",
        "Enums must be defined BEFORE models that reference them in the schema file",
        "Include @@index on all foreign key fields and fields commonly used in WHERE clauses",
        "Set appropriate onDelete behavior on all relations — Cascade, SetNull, or Restrict",
        "The schema must be syntactically valid Prisma — verify that field types, relations, and decorators are correct",
      ],
    };
  }
}
