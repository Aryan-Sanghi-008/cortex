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
import type { LeadAssignment } from "../../validation/index.js";

export class BackendDevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.BACKEND_DEV;
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
      ? `\n\nIMPORTANT — Your previous code was reviewed and needs changes:\n${feedback}\nFix all the issues mentioned above.`
      : "";

    return {
      role: BotRole.BACKEND_DEV,
      context: `Technology Stack:
${JSON.stringify(techStack, null, 2)}

Lead Architecture Decisions:
${JSON.stringify(leadAssignment?.architectureDecisions, null, 2)}

Shared Patterns:
${JSON.stringify(leadAssignment?.sharedPatterns, null, 2)}

Technical Guidelines:
${JSON.stringify(leadAssignment?.techGuidelines, null, 2)}

Your Module Assignment:
${JSON.stringify(module, null, 2)}

Project Documentation:
${JSON.stringify(doc, null, 2)}${feedbackBlock}`,
      task: `You are a Backend Developer. Write the actual code for your assigned module.

Your module: "${module?.name ?? "unknown"}"
Files to create: ${JSON.stringify(module?.assignedFiles ?? [])}
Approach: ${module?.approach ?? "Follow lead's guidelines"}

CRITICAL RULES:
1. Write COMPLETE, PRODUCTION-READY code — no placeholders, no TODOs
2. Every file must be fully implemented and self-contained
3. Use the exact tech stack (Express, Node.js, TypeScript). ALWAYS use STABLE dependencies (no beta/rc).
4. If you are assigned the main entry point, you MUST generate \`src/server.ts\` or \`src/index.ts\` correctly.
5. Include proper error handling, validation, and types
6. API routes must include request validation and proper HTTP status codes
7. Database models must include all fields, types, and relationships
8. Use STRICT TypeScript types and interfaces. Do NOT use \`any\`.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Every file in assignedFiles must appear in your output",
        "Code must be production-ready — no stubs or placeholders",
        "Include proper error handling middleware",
        "API routes must validate input",
        "Use STRICT TypeScript; never use 'any'",
        "Ensure all backend dependencies are stable versions",
        "Use async/await for all async operations",
      ],
    };
  }
}
