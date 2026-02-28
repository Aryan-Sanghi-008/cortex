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

Database Lead Design (Prisma schema, db.ts, seed):
${JSON.stringify(dbLeadOutput, null, 2)}`,
      task: `You are the Data Developer — a senior engineer specializing in data access layers. Build the complete repository/data access layer based on the Database Lead's schema.

Generate the following files:

1. **Repository Files** — One per major data entity
   - Location: src/lib/repositories/[entity].repository.ts
   - Each repository encapsulates ALL database operations for that entity
   - Standard CRUD methods:
     • \`findById(id: string): Promise<Entity | null>\` — find by primary key, return null if not found
     • \`findMany(params: FindManyParams): Promise<PaginatedResult<Entity>>\` — list with pagination, filtering, sorting
     • \`create(data: CreateInput): Promise<Entity>\` — create new record, return created entity
     • \`update(id: string, data: UpdateInput): Promise<Entity>\` — update existing, throw NotFoundError if missing
     • \`delete(id: string): Promise<void>\` — soft delete (set deletedAt) or hard delete as appropriate
   - Advanced methods based on business needs:
     • \`findByEmail(email: string)\` for User repository
     • \`findBySlug(slug: string)\` for content entities
     • \`findByUserId(userId: string, pagination)\` for user-owned entities
     • \`count(filters)\` for dashboard statistics
     • \`existsBy(field, value)\` for uniqueness checks before create
   - Every method must:
     • Use Prisma's typed API — leverage generated types, never raw SQL
     • Select only needed fields — never return passwordHash or internal fields to callers
     • Handle errors: P2002 (unique violation) → ConflictError, P2025 (not found) → NotFoundError
     • Support transaction injection: accept optional \`tx: Prisma.TransactionClient\` parameter for composability

2. **Pagination Utility** — src/lib/pagination.ts
   - Define PaginationParams type: { page: number, pageSize: number, sortBy?: string, sortOrder?: 'asc' | 'desc' }
   - Define PaginatedResult<T> type: { items: T[], total: number, page: number, pageSize: number, totalPages: number, hasMore: boolean }
   - Helper function to convert PaginationParams to Prisma skip/take/orderBy
   - Default page size: 20, max page size: 100

3. **Custom Error Classes** — src/lib/errors.ts (if not already defined)
   - AppError (base): message, statusCode, code
   - NotFoundError: 404
   - ConflictError: 409
   - UnauthorizedError: 401
   - ForbiddenError: 403
   - ValidationError: 422 with field-level details

4. **Expanded Seed Script** — If the DB Lead's seed needs expansion
   - Add more diverse test data
   - Create data in different states for testing
   - Ensure seed is idempotent (use upsert)

CRITICAL RULES:
- Write COMPLETE, PRODUCTION-READY code — no placeholders, no TODOs
- Use strict TypeScript with explicit types on every function parameter and return value
- Handle ALL Prisma error codes gracefully — never let raw database errors propagate to callers
- Use the exact Prisma models defined by the Database Lead
- Import PrismaClient from the singleton instance (src/lib/db.ts)
- Every repository method must be async and properly handle errors`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Include strict TypeScript typings for ALL repository methods — explicit params and return types",
        "Handle database errors gracefully: P2002 → ConflictError, P2025 → NotFoundError, connection errors → ServiceUnavailableError",
        "No placeholder code — every repository method must be fully implemented with real Prisma queries",
        "Use the exact Prisma models defined by the Database Lead — don't invent new models",
        "Every repository must support pagination for list operations with proper metadata",
        "Support transaction injection via optional tx parameter for composable multi-model operations",
        "Never return sensitive fields (passwordHash, tokens) from repository methods — use select to exclude them",
        "Import PrismaClient from db.ts singleton — never create new instances",
      ],
    };
  }
}
