import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import { EXPERT_ROLE_TASK_MANDATE, EXPERT_ROLE_CONSTRAINTS } from "./prompt-quality.js";
import { formatTechStack, formatProductSpec } from "../utils/context-compressor.js";
import {
  CodeOutput,
  CodeOutputSchema,
  CODE_OUTPUT_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class DevOpsBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.DEVOPS;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, CodeOutputSchema, "DevOps", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");

    return {
      role: BotRole.DEVOPS,
      context: `${formatTechStack(techStack)}

${formatProductSpec(doc)}`,
      task: `You are the DevOps / SRE Engineer. Generate ALL infrastructure, containerization, CI/CD, and deployment configuration files for a production-ready application.

Generate these files — each must be COMPLETE and PRODUCTION-READY:

1. **Dockerfile** — Multi-stage build optimized for production
   - Stage 1 (builder): Install ALL dependencies, compile TypeScript, run build
   - Stage 2 (runner): Copy only production dependencies and built output
   - Use specific Node.js version tag (e.g., node:20-alpine, NOT node:latest)
   - COPY package*.json first for layer caching (install before copying source)
   - Run as non-root user (create and switch to 'appuser')
   - Set proper WORKDIR, EXPOSE port, and CMD
   - Include HEALTHCHECK instruction: HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:PORT/health || exit 1
   - Set NODE_ENV=production in the runner stage
   - Use .dockerignore-compatible patterns

2. **docker-compose.yml** — Full local development environment
   - App service: build from Dockerfile, expose ports, mount volumes for dev, depends_on with health checks
   - Database service: use the EXACT database from tech stack (postgres:16-alpine, mysql:8, etc.)
     • Set proper credentials via environment variables
     • Mount volume for data persistence
     • Include HEALTHCHECK (pg_isready for postgres, mysqladmin ping for mysql)
   - Redis service (if the app uses caching, sessions, or rate limiting):
     • redis:7-alpine with health check and persistence volume
   - Environment variables: use variable substitution (\${VAR:-default}) for flexibility
   - Network: create a custom bridge network for service discovery
   - Volumes: named volumes for database persistence

3. **.github/workflows/ci.yml** — Comprehensive CI pipeline
   - Trigger: on push to main/develop, on pull_request
   - Jobs with proper dependency chain:
     1. **lint**: Run ESLint with --max-warnings 0
     2. **type-check**: Run tsc --noEmit
     3. **test**: Run vitest with coverage (needs: lint, type-check)
     4. **build**: Run production build (needs: test)
   - Setup: checkout, Node.js setup with version matrix, dependency caching (actions/cache for node_modules)
   - Environment: set CI=true, DATABASE_URL for test database
   - Coverage: upload coverage report as artifact
   - Cache node_modules using actions/setup-node with cache: 'npm'

4. **.github/workflows/deploy.yml** — Deployment pipeline
   - Trigger: on push to main (production), on push to develop (staging)
   - Environment-specific deployment (staging vs production)
   - Steps: checkout → build Docker image → push to registry → deploy to platform
   - Include rollback strategy comments
   - Use GitHub environment secrets for sensitive values
   - Add deployment status notification

5. **.env.example** — Complete environment variable documentation
   - List EVERY environment variable the app needs, grouped by category:
     • Server: PORT, NODE_ENV, HOST, API_PREFIX
     • Database: DATABASE_URL (with format example), DB_MAX_CONNECTIONS
     • Auth: JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, BCRYPT_ROUNDS
     • External Services: any API keys, webhook URLs
     • Redis: REDIS_URL (if used)
     • Logging: LOG_LEVEL, LOG_FORMAT
     • CORS: CORS_ORIGIN, ALLOWED_ORIGINS
   - Include comments explaining each variable
   - Include example values (never real secrets)
   - Mark required vs optional variables

6. **nginx.conf** — Reverse proxy configuration (if applicable)
   - Upstream block pointing to the app
   - SSL configuration (commented out for dev, template for prod)
   - Gzip compression for text assets
   - Cache headers for static files (1 year for hashed, no-cache for HTML)
   - Rate limiting zone
   - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
   - WebSocket proxy pass (if the app uses WebSockets)
   - Proxy configuration with proper headers (X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)

7. **.dockerignore** — Optimize build context
   - Exclude: node_modules, .git, .env, *.md, tests, coverage, .github
   - Include: source code, package files, tsconfig, prisma schema

Each file must be COMPLETE — no placeholders, no "customize here" comments. Every value must be sensible and production-appropriate.${EXPERT_ROLE_TASK_MANDATE}`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        ...EXPERT_ROLE_CONSTRAINTS,
        "Dockerfile MUST use multi-stage build with specific version tags (never :latest)",
        "Dockerfile MUST run as non-root user and include HEALTHCHECK instruction",
        "docker-compose MUST include the exact database from the tech stack with health checks and persistence",
        "CI pipeline MUST run lint → type-check → test → build in dependency chain with proper caching",
        "CI pipeline MUST use actions/cache or actions/setup-node cache for node_modules",
        ".env.example MUST list EVERY environment variable the app references, with descriptions and example values",
        "All files must be complete and production-ready — no placeholder sections",
        "Include health check endpoints (/health, /ready) in Docker and deployment configs",
        "Security: no hardcoded secrets, use environment variables for ALL sensitive values",
        "Docker images must be optimized: small base images (alpine), minimal layers, .dockerignore",
      ],
    };
  }
}
