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
${JSON.stringify(doc)}

Product Spec:
${JSON.stringify(productSpec)}

Technology Stack:
${JSON.stringify(techStack)}`,
      task: `You are the Backend Lead — the most senior backend engineer on this project. Design the complete backend architecture and assign development work to your team like a Staff engineer planning a production-critical service.

Your deliverables:

1. **Architecture Decisions**
   - Define the project structure following Node.js/Express best practices:
     • src/server.ts — the main entry point (CRITICAL: this MUST exist or the app won't start)
     • src/routes/ — route definitions grouped by domain (auth.routes.ts, users.routes.ts, etc.)
     • src/controllers/ — thin request handlers that parse input and call services
     • src/services/ — business logic layer (the core of the application)
     • src/middleware/ — auth, validation, error handling, logging, rate limiting
     • src/types/ — shared TypeScript interfaces and enums
     • src/lib/ — utilities, helpers, database client, external service clients
     • src/config/ — environment config, constants, feature flags
   - Design the middleware stack (order matters!):
     1. CORS configuration
     2. Helmet.js for security headers
     3. Rate limiting (per-IP and per-user)
     4. Request logging with request ID generation
     5. Body parsing (JSON, URL-encoded)
     6. Auth middleware (JWT verification, user context injection)
     7. Route handlers
     8. 404 catch-all
     9. Global error handler (LAST — catches all thrown errors)
   - Define the API contract:
     • URL pattern: /api/v1/[resource] (RESTful, versioned)
     • Standard response format: { success: boolean, data: T, error?: { code: string, message: string, details?: any } }
     • Standard pagination: { items: T[], total: number, page: number, pageSize: number, hasMore: boolean }
     • Error codes: AUTH_001 (invalid token), AUTH_002 (expired token), VALIDATION_001 (invalid input), etc.
   - Design the error handling architecture:
     • Custom error hierarchy: AppError → NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError
     • Each error class sets the appropriate HTTP status code and error code
     • Global error handler catches all errors, logs them, and sends structured responses

2. **Authentication & Authorization Design**
   - JWT access tokens (short-lived, 15-60 min) + refresh tokens (long-lived, 7-30 days)
   - Password hashing with bcrypt (cost factor 12)
   - RBAC: define roles and permissions matrix
   - Auth middleware that extracts, verifies, and attaches user to request context
   - Protection levels: public (no auth), authenticated (valid token), authorized (specific role/permission)

3. **Module Breakdown**
   - Break into clear, independently-implementable modules:
     • **Server Setup Module**: src/server.ts, src/config/env.ts, src/config/database.ts, middleware setup
     • **Auth Module**: login, signup, refresh token, logout, forgot password, auth middleware
     • **Resource Modules**: one module per major domain entity (users, [domain entities], etc.)
     • **Middleware Module**: error handler, validation middleware, auth middleware, logging
     • **Utility Module**: response helpers, pagination utils, date helpers, crypto utils
   - Each module specifies:
     • Exact file paths to create (including src/server.ts in the setup module — THIS IS CRITICAL)
     • The technical approach and patterns to follow
     • Explicit requirements with expected behavior
     • Database interactions needed
     • Error handling expectations

4. **Technical Guidelines**
   - TypeScript strictness: explicit return types, no \`any\`, proper generic usage
   - HTTP semantics: correct methods (GET/POST/PATCH/DELETE), correct status codes (201, 204, 400, 401, 403, 404, 409, 422, 500)
   - Input validation: Zod schemas at the route level for every request body and query param
   - Logging: structured JSON with request ID, method, path, status, duration
   - Database: Prisma with typed queries, transaction support, connection pooling
   - Security: parameterized queries, input sanitization, no string concatenation for SQL/URLs
   - Dependency versions: ALL must be stable releases (no beta/rc/alpha)

Think like a senior backend architect who has built APIs serving millions of requests — be specific, be thorough, leave nothing to guesswork.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "MUST include a Server Setup module with src/server.ts as the entry point — without this file, the server does not start",
        "MUST include an Authentication module with login, signup, token refresh, and auth middleware",
        "MUST include API routes for ALL data entities identified in the documentation",
        "MUST include error handling middleware with custom error classes and proper HTTP status code mapping",
        "MUST include input validation middleware using Zod at the route level",
        "MUST include logging middleware with request ID generation",
        "File paths must follow Node.js/Express conventions: src/routes/*.ts, src/services/*.ts, src/middleware/*.ts",
        "Explicitly FORBID the use of beta/rc/alpha versions of ANY backend library",
        "Every module must define how it connects to the database or external services. No black boxes.",
        "Include authentication/authorization boundaries for each REST endpoint or service.",
        "MUST populate apiContract with EVERY API endpoint the backend intends to expose — include method, path, request body shape, response shape, and auth level. This will be synced to the frontend team.",
        "CRITICAL: Be CONCISE in all descriptions and approaches. Keep JSON payload size below 20KB to avoid API truncation. Do NOT write paragraphs when a single sentence works.",
      ],
    };
  }
}
