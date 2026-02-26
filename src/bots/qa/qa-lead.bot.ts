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

export class QALeadBot extends BaseBot<LeadAssignment> {
  readonly role = BotRole.QA;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, LeadAssignmentSchema, "QA-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const frontendCode = memory.get("frontend-code");
    const backendCode = memory.get("backend-code");

    return {
      role: BotRole.QA,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}

Frontend Code Generated:
${JSON.stringify(frontendCode, null, 2)}

Backend Code Generated:
${JSON.stringify(backendCode, null, 2)}`,
      task: `You are the QA Lead. Design a comprehensive testing strategy and architecture for the application.

Your responsibilities:
1. Design the folder structure for tests (e.g., \`tests/unit\`, \`tests/integration\`, \`tests/e2e\`)
2. Break the testing work into clear modules:
   - Backend API route tests (test each endpoint with supertest/vitest)
   - Frontend component tests (React Testing Library)
   - Integration tests (API flow tests)
   - Test setup/config module (vitest.config.ts, test setup, test utils)
3. For each module, specify exact file paths and technical approach
4. Define shared testing patterns, explicitly requiring STRICT TypeScript and STABLE dependency versions.

Think like a Senior QA Lead assigning work to QA Developers.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "Design must use vitest as the test runner",
        "Frontend testing architecture must use @testing-library/react",
        "Backend testing architecture must use supertest for HTTP testing",
        "Must include a module dedicated to test setup files and configs",
        "Ensure instructions specify comprehensive mocking for external dependencies",
        "Explicitly forbid the use of beta/rc versions of testing tools",
      ],
    };
  }
}
