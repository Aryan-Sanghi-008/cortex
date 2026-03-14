import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import { EXPERT_ROLE_TASK_MANDATE, EXPERT_ROLE_CONSTRAINTS } from "./prompt-quality.js";
import { formatProductSpec } from "../utils/context-compressor.js";
import {
  TechStackOutput,
  TechStackOutputSchema,
  TECH_STACK_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class TechStackBot extends BaseBot<TechStackOutput> {
  readonly role = BotRole.TECH_STACK;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, TechStackOutputSchema, "TechStackSelector", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.TECH_STACK,
      context: `Product Idea: ${memory.productIdea}

${formatProductSpec(productSpec)}`,
      task: `Based on the product specification, select the OPTIMAL technology stack for this project. Think like a CTO making a critical infrastructure decision — every choice has long-term consequences.

Evaluate each technology layer systematically:

1. **Frontend Framework Selection**
   - Consider the product's UI complexity: Is it a data-heavy dashboard? A consumer-facing marketing site? A real-time collaborative tool?
   - For SPAs with complex client-side state → React with Vite or Next.js
   - For content-heavy sites with SEO needs → Next.js with SSR/SSG
   - Consider: bundle size implications, developer tooling maturity, component ecosystem richness
   - Evaluate state management needs: simple local state vs. server state caching vs. global state
   - Select a CSS approach: Tailwind CSS for rapid development, CSS Modules for component isolation, or styled-components for dynamic styling

2. **Backend Framework Selection**
   - Consider the API complexity: simple CRUD vs. complex business logic vs. real-time WebSocket needs
   - For TypeScript full-stack → Express.js or Fastify with ts-node
   - For complex APIs → NestJS (if the team scale justifies the framework overhead)
   - Evaluate middleware ecosystem, request validation libraries, and auth integration options
   - Consider API design: REST for standard CRUD, GraphQL only if the frontend truly benefits from flexible queries

3. **Database Selection**
   - Match the data model to the right database: relational data with complex joins → PostgreSQL, document-oriented data → MongoDB (but prefer PostgreSQL for most SaaS)
   - Consider: ACID compliance needs, JSON column support, full-text search capabilities, connection pooling options
   - ORM selection: Prisma for type-safe queries and excellent DX, Drizzle for SQL-close control
   - Evaluate hosting options: managed services (Supabase, PlanetScale, Neon) vs. self-hosted

4. **Authentication Strategy**
   - Evaluate: JWT with refresh tokens for stateless APIs, session-based for server-rendered apps
   - Consider auth libraries: bcrypt for password hashing, jose for JWT handling, or full auth services (Clerk, Auth0, NextAuth)
   - Plan for: OAuth providers (Google, GitHub), magic links, 2FA readiness
   - RBAC model: role-based for simple apps, permission-based for complex multi-tenant systems

5. **Infrastructure & DevOps**
   - Hosting: Vercel for frontend + serverless, Railway/Render for full-stack, AWS/GCP for enterprise scale
   - Containerization: Docker for consistent environments, docker-compose for local development
   - CI/CD: GitHub Actions for most projects, with proper caching and parallelization
   - Monitoring: basic structured logging → Pino or Winston; production monitoring → Sentry for errors

6. **Cost Analysis**
   - Estimate monthly costs at: MVP (100 users), Growth (10K users), Scale (100K users)
   - Prefer technologies with generous free tiers for the MVP phase
   - Factor in developer time costs — a complex stack that's hard to debug costs more than hosting

For EVERY technology choice, provide:
- The specific version or version range (e.g., "React ^19.0.0", "PostgreSQL 16")
- A clear justification explaining why THIS technology over alternatives
- Any migration path considerations if the project outgrows the choice${EXPERT_ROLE_TASK_MANDATE}`,
      schemaDescription: TECH_STACK_SCHEMA_DESCRIPTION,
      constraints: [
        ...EXPERT_ROLE_CONSTRAINTS,
        "Select ONLY production-proven, stable technologies — NEVER beta, RC, or alpha versions. Check that the specific version you recommend is a stable release.",
        "Frontend and backend must share TypeScript for type safety across the stack",
        "Database choice must support the data model complexity implied by user stories (relationships, transactions, full-text search)",
        "Auth strategy must support ALL user roles identified in the product spec (RBAC, multi-tenant if needed)",
        "ALWAYS specify exact stable version ranges for ALL dependencies (e.g., ^19.0.0, not 'latest'). Verify the version exists and is not a beta/RC.",
        "NEVER recommend bleeding-edge tools with < 1 year of stable releases or < 10K weekly npm downloads",
        "Infrastructure choices must be realistic for the project's scale — don't recommend Kubernetes for an MVP",
        "Include justification for EVERY technology choice explaining why it was chosen over at least one alternative",
      ],
    };
  }
}
