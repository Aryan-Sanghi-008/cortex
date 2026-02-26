import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
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
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}`,
      task: `You are the DevOps Engineer. Generate all infrastructure and deployment files.

Generate these files:
1. Dockerfile (multi-stage build for the Node.js app)
2. docker-compose.yml (app + database + redis if needed)
3. .github/workflows/ci.yml (GitHub Actions CI pipeline: lint, test, build)
4. .github/workflows/deploy.yml (deployment pipeline)
5. .env.example (all environment variables the app needs)
6. nginx.conf (reverse proxy config if applicable)

Each file must be production-ready and follow best practices.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Dockerfile must use multi-stage build",
        "docker-compose must include the database from tech stack",
        "CI pipeline must run lint, test, and build steps",
        "Include health check endpoints in Docker config",
        ".env.example must list ALL env vars the app needs",
        "All files must be complete — no placeholders",
      ],
    };
  }
}
