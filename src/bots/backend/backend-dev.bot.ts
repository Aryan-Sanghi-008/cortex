import { BaseBot } from "../base.bot.js";
import { BotRole } from "../types.js";
import { LLMProvider } from "../../llm/types.js";
import { ShortTermMemory } from "../../memory/short-term.memory.js";
import { PromptParts } from "../../utils/prompt-builder.js";
import { formatTechStack, formatProductSpec, formatLeadAssignment } from "../../utils/context-compressor.js";
import {
  CodeOutput,
  CodeOutputSchema,
  CODE_OUTPUT_SCHEMA_DESCRIPTION,
} from "../../validation/index.js";
import type { LeadAssignment } from "../../validation/index.js";

export class BackendDevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.BACKEND_DEV;
  protected override maxTokens = 65536;
  private moduleIndex: number;

  constructor(llm: LLMProvider, moduleIndex: number, maxRetries?: number) {
    super(llm, CodeOutputSchema, `Backend-Dev-${moduleIndex + 1}`, maxRetries);
    this.moduleIndex = moduleIndex;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const leadAssignment = memory.get<LeadAssignment>("backend-lead");
    const module = leadAssignment?.modules[this.moduleIndex];
    const feedback = memory.get<string>(`backend-dev-${this.moduleIndex}-feedback`);

    const feedbackBlock = feedback
      ? `\n\nIMPORTANT — Your previous code was reviewed by the Lead and REJECTED. You MUST fix ALL issues:\n${feedback}\n\nAddress every single point above. The Lead will review again and will reject if issues persist.`
      : "";

    return {
      role: BotRole.BACKEND_DEV,
      context: `${formatTechStack(techStack)}

${formatLeadAssignment(leadAssignment)}

Your Module Assignment:
${JSON.stringify(module)}

${formatProductSpec(doc)}${feedbackBlock}`,
      task: `You are a Senior Backend Developer. Write COMPLETE, PRODUCTION-READY code for your assigned module: "${module?.name ?? "unknown"}"

Files you MUST create: ${JSON.stringify(module?.assignedFiles ?? [])}
Technical Approach: ${module?.approach ?? "Follow lead's guidelines"}

Module Requirements:
${module?.requirements?.map((r) => `- ${r}`).join("\n") ?? "See module assignment"}

ENGINEERING STANDARDS — treat these as non-negotiable:

1. **Complete Implementation**
   - Write EVERY function, handler, service method, and utility fully. NEVER use placeholders, TODOs, or stubs.
   - Every route handler must parse input, call service, format response, and handle errors.
   - Every service method must implement the complete business logic, not just pass through to the database.
   - If you are assigned src/server.ts, it MUST be a fully working server entry point that boots the Express app, connects middleware, registers routes, and starts listening.

2. **TypeScript Strictness**
   - Explicit return types on EVERY function and method
   - NEVER use \`any\` — use \`unknown\` with type guards or specific types
   - Define interfaces for all request bodies, query params, response shapes, and service parameters
   - Use Zod schemas to validate AND infer types: \`type CreateUserInput = z.infer<typeof createUserSchema>\`
   - Exhaustive switch/case with \`never\` for impossible states on enums

3. **HTTP Semantics (follow these EXACTLY)**
   - GET endpoints: return 200 with data, 404 if resource not found
   - POST endpoints: return 201 with created resource and Location header
   - PATCH/PUT endpoints: return 200 with updated resource
   - DELETE endpoints: return 204 (no content)
   - Validation errors: return 422 with field-level error details
   - Authentication errors: return 401 (not authenticated) or 403 (not authorized)
   - Conflict errors: return 409 (e.g., duplicate email)
   - Server errors: return 500 with generic message (NEVER expose internal details)

4. **Input Validation**
   - Every route MUST validate its input using Zod schemas at the handler level
   - Validate request body, query params, AND path params
   - Return 422 with field-level errors: { success: false, error: { code: "VALIDATION_ERROR", details: [{ field: "email", message: "Invalid email format" }] } }
   - NEVER trust client input — validate even if there's frontend validation

5. **Error Handling**
   - Use the project's custom error classes (NotFoundError, UnauthorizedError, ValidationError, ConflictError)
   - EVERY async operation must be wrapped in try/catch
   - Database errors must be caught and translated: Prisma P2002 → ConflictError, P2025 → NotFoundError
   - External API errors must be caught and wrapped with context
   - NEVER expose raw error messages, stack traces, or internal details to clients

6. **Service Layer Pattern**
   - Route handlers are THIN: parse input → call service → format response. NO business logic in handlers.
   - Services contain ALL business logic: validation rules, permission checks, data transformations, multi-step operations
   - Services use repositories/Prisma for data access — never raw SQL in services
   - Multi-model operations use Prisma transactions: \`prisma.$transaction([...])\`

7. **Authentication & Authorization**
   - If implementing auth routes: use bcrypt for password hashing (cost factor 12), JWT for tokens
   - Auth middleware: extract token from Authorization header, verify with jose/jsonwebtoken, attach user to req context
   - Protected routes: use auth middleware. Role-restricted routes: check user role in handler or guard middleware
   - Handle all auth edge cases: missing token (401), expired token (401 + specific code), insufficient permissions (403)

8. **Database Interactions**
   - Use Prisma with full type safety — leverage generated types
   - Select only the fields you need — never return password hashes or sensitive data
   - Use includes/selects to control relation loading — no N+1 queries
   - Handle database errors gracefully — connection errors, constraint violations, not-found errors
   - Implement pagination for all list endpoints with proper metadata

9. **Logging & Observability**
   - Log every request: method, path, status code, duration, request ID
   - Log errors with full context: error class, message, affected resource, user ID
   - Use structured JSON logging format
   - NEVER log sensitive data: passwords, tokens, PII`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Every file in assignedFiles MUST appear in your output — missing files breaks the build",
        "ZERO placeholder code — every function body must be fully implemented with real logic",
        "Use STRICT TypeScript with explicit types on every function, parameter, and return value. NEVER use 'any'.",
        "Ensure ALL backend dependencies are stable versions — never beta, RC, or alpha packages",
        "If assigned src/server.ts, it MUST be a complete, working entry point that starts the server",
        "Use async/await for ALL asynchronous operations — no raw Promises or callbacks",
        "Every API route must validate input with Zod and return proper HTTP status codes",
        "Include proper error handling middleware that catches and formats all errors",
        "Follow the lead's architecture decisions EXACTLY — same folder structure, naming, and patterns",
        "Database queries must use Prisma's typed API — no raw SQL strings",
        "SELF-CHECK before submitting: (1) verify every import you use is from a real package or local file, (2) verify every function has an explicit return type, (3) verify every file in assignedFiles is included in your output, (4) verify no function body is empty or contains TODO/placeholder comments",
      ],
    };
  }
}
