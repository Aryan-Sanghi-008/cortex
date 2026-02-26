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

export class QADevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.QA_DEV;
  private moduleIndex: number;

  constructor(
    llm: LLMProvider,
    moduleIndex: number = 0,
    maxRetries?: number
  ) {
    super(llm, CodeOutputSchema, `QA-Dev-${moduleIndex + 1}`, maxRetries);
    this.moduleIndex = moduleIndex;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const qaLeadOutput = memory.get("qa-lead");
    const frontendCode = memory.get("frontend-code");
    const backendCode = memory.get("backend-code");

    return {
      role: BotRole.QA_DEV,
      context: `Project Documentation:
${JSON.stringify(doc, null, 2)}

Technology Stack:
${JSON.stringify(techStack, null, 2)}

QA Lead Test Plan & Setup:
${JSON.stringify(qaLeadOutput, null, 2)}

Frontend Code Generated:
${JSON.stringify(frontendCode, null, 2)}

Backend Code Generated:
${JSON.stringify(backendCode, null, 2)}`,
      task: `You are the QA Developer. Write the comprehensive test files based on the QA Lead's design and the generated application code.

Generate test files to thoroughly cover both frontend and backend functionality.
Expand upon the QA Lead's test setup to include detailed test cases.

CRITICAL RULES:
1. Write COMPLETE, RUNNABLE test files — no placeholders, no TODOs.
2. Ensure you import the actual dependencies correctly. Use STABLE testing libraries (like Vitest, React Testing Library).
3. Cover both happy paths and edge/error cases.
4. Ensure robust mocking for external dependencies, APIs, and the database.
5. All test files must be runnable and have correct TypeScript typings.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Include strict TypeScript typings in all test files",
        "Mock database calls and external APIs comprehensively",
        "No placeholder tests — write actual assertions",
        "Use stable versions of test runners (Vitest) and libraries (@testing-library/react)",
      ],
    };
  }
}
