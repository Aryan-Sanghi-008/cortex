import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
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
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}

Frontend Code:
${JSON.stringify(frontendCode, null, 2)}

Backend Code:
${JSON.stringify(backendCode, null, 2)}

Database Code:
${JSON.stringify(dbCode, null, 2)}

Test Code:
${JSON.stringify(qaCode, null, 2)}

DevOps Code:
${JSON.stringify(devopsCode, null, 2)}`,
      task: `You are the Principal Engineer / CTO. Conduct a final code review of the entire project.

Review ALL generated code across frontend, backend, database, tests, and DevOps.

Evaluate:
1. Code quality — is it production-ready? Clean? Well-structured?
2. Consistency — do FE API calls match BE routes? Do types align?
3. Security — proper auth, input validation, no hardcoded secrets?
4. Setup — are entry files (main.tsx, server.ts) and config files correct and present?
5. Dependencies — are all libraries production-stable without beta/rc tags?
6. Completeness — are all features from the spec implemented without stub code?
7. Best practices — error handling, logging, proper HTTP codes, strict TS?
8. Test coverage — do tests cover critical paths?

Score each file and provide specific comments with line numbers where possible.
Set approved = true ONLY if overallQuality >= 7.`,
      schemaDescription: PR_REVIEW_SCHEMA_DESCRIPTION,
      constraints: [
        "Review EVERY generated file",
        "Be critically honest — don't inflate scores",
        "Identify FE↔BE contract mismatches",
        "Flag any hardcoded values that should be env vars",
        "Flag missing error handling, 'any' types, or stubbed code",
        "Rigourously reject missing setup files or unstable dependencies",
        "approved = true only if overallQuality >= 7",
      ],
    };
  }
}
