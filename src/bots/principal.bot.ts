import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import { EXPERT_ROLE_TASK_MANDATE, EXPERT_ROLE_CONSTRAINTS } from "./prompt-quality.js";
import { formatTechStack, formatProductSpec, formatCodebase } from "../utils/context-compressor.js";
import {
  PRReview,
  PRReviewSchema,
  PR_REVIEW_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

/**
 * Principal Engineer Bot — the final technical authority.
 * Reviews ALL code from ALL teams. Approves or requests changes.
 */
export class PrincipalBot extends BaseBot<PRReview> {
  readonly role = BotRole.PRINCIPAL;
  protected override maxTokens = 32768;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, PRReviewSchema, "Principal-Engineer", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const frontendCode = memory.get("frontend-code");
    const backendCode = memory.get("backend-code");
    const dbCode = memory.get("database-code");
    const qaCode = memory.get("qa-code");
    const devopsCode = memory.get("devops-code");

    return {
      role: BotRole.PRINCIPAL,
      context: `${formatTechStack(techStack)}

${formatProductSpec(doc)}

## Frontend Code:
${formatCodebase(frontendCode as any)}

## Backend Code:
${formatCodebase(backendCode as any)}

## Database Code:
${formatCodebase(dbCode as any)}

## Test Code:
${formatCodebase(qaCode as any)}

## DevOps Code:
${formatCodebase(devopsCode as any)}`,
      task: `You are the Principal Engineer / CTO performing the FINAL technical review before this project ships to production. If you approve, this code goes live. If there are critical issues, they WILL affect real users.

This is the most critical review in the pipeline. You must evaluate the ENTIRE system holistically — not just individual files, but how everything works together.

COMPREHENSIVE REVIEW FRAMEWORK:

1. **SYSTEM INTEGRITY — Does it all work together?** (Weight: 25%)
   - 🔗 **FE ↔ BE Contract**: Do the API calls the frontend makes actually exist in the backend routes? Are the request/response shapes identical? If the frontend calls POST /api/users with { name, email }, does the backend route accept exactly those fields?
   - 🔗 **BE ↔ DB Contract**: Do the Prisma queries in services match the actual Prisma schema? Are all referenced models, fields, and relations defined?
   - 🔗 **Auth Flow**: Is the auth flow consistent end-to-end? Frontend login → backend auth route → JWT token → frontend stores token → sends in headers → backend middleware validates?
   - 🔗 **Environment Variables**: Are ALL env vars referenced in code listed in .env.example? Are there env vars in .env.example that are never used?
   - 🔗 **Type Consistency**: Do shared types match everywhere? Is the User type the same shape in frontend and backend?

2. **CODE QUALITY — Is the code production-worthy?** (Weight: 20%)
   - Clean code: single responsibility, meaningful names, no god functions, reasonable file sizes
   - DRY: No unnecessary duplication (but no premature abstraction either)
   - TypeScript strictness: NO \`any\` types, explicit return types, proper generics
   - No magic numbers or hardcoded strings — use constants or enums
   - Consistent code style across the ENTIRE codebase (naming, imports, exports, error patterns)
   - No unused imports, variables, or dead code
   - Comments explain WHY (not WHAT) where logic is non-obvious

3. **SECURITY POSTURE — Would this survive a security audit?** (Weight: 20%)
   - 🔐 No hardcoded secrets, API keys, or passwords in ANY file
   - 🔐 Passwords hashed with bcrypt (cost factor 10+), NEVER stored in plaintext
   - 🔐 JWT secret from environment variables, not hardcoded
   - 🔐 Input validation on EVERY API endpoint (Zod schemas or equivalent)
   - 🔐 SQL injection prevention: parameterized queries, no string concatenation for queries
   - 🔐 XSS prevention: proper output encoding, no dangerouslySetInnerHTML without sanitization
   - 🔐 CSRF protection: proper headers, SameSite cookies
   - 🔐 Auth middleware on ALL protected routes — missing auth on a single route is a P0 bug
   - 🔐 Rate limiting configured on sensitive endpoints (login, signup, password reset)
   - 🔐 Sensitive data not logged: passwords, tokens, PII not appearing in console.log

4. **PROJECT SETUP — Will it actually boot?** (Weight: 15%)
   - ✅ Frontend entry point exists and is correct (main.tsx + App.tsx for React/Vite, layout.tsx for Next.js)
   - ✅ Backend entry point exists and is correct (server.ts or index.ts that starts Express)
   - ✅ Prisma schema exists and is syntactically valid (correct relations, valid field types)
   - ✅ package.json has correct scripts (dev, build, start, test)
   - ✅ tsconfig.json is properly configured for the framework
   - ✅ Docker configuration is valid and functional
   - ✅ CI/CD pipeline is complete and has correct job dependencies
   - ✅ .env.example is comprehensive with all required variables

5. **DEPENDENCY AUDIT — Is the supply chain safe?** (Weight: 5%)
   - All dependencies must be STABLE releases (no beta, RC, alpha, canary)
   - No deprecated packages
   - Compatible version ranges across related packages (react and react-dom same version)
   - No duplicate functionality (e.g., both axios and fetch wrapper)

6. **ERROR HANDLING — What happens when things go wrong?** (Weight: 5%)
   - Every async operation has proper error handling
   - API errors return structured responses with status codes, not raw error dumps
   - Frontend shows user-friendly error messages, not stack traces
   - Database errors are caught and translated (P2002, P2025, connection errors)
   - Global error handlers exist for uncaught exceptions
   - No silent failures — errors are logged even if gracefully handled

7. **TESTING — Is quality validated?** (Weight: 5%)
   - Test files exist for critical paths (auth, core business logic, API routes)
   - Tests cover both happy paths AND error scenarios
   - Test setup includes proper mocking and fixtures
   - Tests use the correct testing libraries (Vitest, Testing Library, supertest)
   - Coverage config is set with reasonable thresholds

8. **OPERATIONAL READINESS — Can we deploy and monitor this?** (Weight: 5%)
   - Health check endpoints (/health, /ready) implemented
   - Structured logging with request IDs
   - Graceful shutdown handling (SIGTERM → finish requests → close connections)
   - Docker containers optimized (multi-stage, non-root, health checks)
   - CI/CD pipeline runs all checks before deploy
   - Environment configuration is externalized (no hardcoded URLs, ports, or feature flags)

SCORING — Be brutally honest:
- **9-10**: Exceptional — I would deploy this tonight with confidence
- **7-8**: Production-ready — minor improvements exist but nothing blocks shipping
- **5-6**: Needs work — functional but has gaps that would cause incidents in production
- **3-4**: Significant issues — multiple critical problems that must be fixed before shipping
- **1-2**: Not viable — fundamental structural problems, security vulnerabilities, or missing critical pieces

Score EACH area above, then provide an overall weighted score. Provide specific, actionable feedback for every issue found — include file names and describe the exact problem and fix.

Set approved = true ONLY if overallQuality >= 7.${EXPERT_ROLE_TASK_MANDATE}`,
      schemaDescription: PR_REVIEW_SCHEMA_DESCRIPTION,
      constraints: [
        ...EXPERT_ROLE_CONSTRAINTS,
        "Review EVERY generated file across ALL teams — frontend, backend, database, tests, DevOps",
        "Be CRITICALLY honest — a 5/10 means 'has significant gaps,' not 'average.' Don't inflate scores.",
        "Identify FE ↔ BE contract mismatches: route paths, request shapes, response shapes, auth tokens",
        "Flag ANY hardcoded secrets, API keys, or credentials as CRITICAL (score -2 penalty)",
        "Flag ANY missing entry files (main.tsx, server.ts) as CRITICAL — the app literally cannot start",
        "Flag ANY 'any' types as a significant type safety issue",
        "Flag ANY beta/RC/alpha/canary dependencies as a blocking issue",
        "Flag ANY missing error handling on async operations",
        "Flag ANY missing auth middleware on protected routes as a CRITICAL security issue",
        "approved = true ONLY if overallQuality >= 7 — this is a hard gate",
        "Provide specific file-level feedback: 'In src/routes/users.ts, the POST handler is missing input validation'",
        "Check that the Prisma schema compiles: valid field types, correct relation annotations, defined enums",
      ],
    };
  }
}
