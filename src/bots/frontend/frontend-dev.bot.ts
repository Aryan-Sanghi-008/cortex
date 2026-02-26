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

export class FrontendDevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.FRONTEND_DEV;
  private moduleIndex: number;

  constructor(
    llm: LLMProvider,
    moduleIndex: number,
    maxRetries?: number
  ) {
    super(llm, CodeOutputSchema, `Frontend-Dev-${moduleIndex + 1}`, maxRetries);
    this.moduleIndex = moduleIndex;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const leadAssignment = memory.get<LeadAssignment>("frontend-lead");
    const module = leadAssignment?.modules[this.moduleIndex];
    const feedback = memory.get<string>(`frontend-dev-${this.moduleIndex}-feedback`);

    const feedbackBlock = feedback
      ? `\n\nIMPORTANT — Your previous code was reviewed and needs changes:\n${feedback}\nFix all the issues mentioned above.`
      : "";

    return {
      role: BotRole.FRONTEND_DEV,
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
      task: `You are a Frontend Developer. Write the actual code for your assigned module.

Your module: "${module?.name ?? "unknown"}"
Files to create: ${JSON.stringify(module?.assignedFiles ?? [])}
Approach: ${module?.approach ?? "Follow lead's guidelines"}

Requirements:
${module?.requirements?.map((r) => `- ${r}`).join("\n") ?? "See module assignment"}

CRITICAL RULES:
1. Write COMPLETE, PRODUCTION-READY code — no placeholders, no TODOs, no "// rest of code here"
2. Every file must be a complete, working file
3. Use the exact tech stack specified (React/Next.js/etc.) and ALWAYS use STABLE versions (no beta/rc).
4. For Vite/React setups, you MUST generate the standard entry files: \`index.html\`, \`src/main.tsx\`, and \`src/App.tsx\` if they are part of your assignment.
5. Follow the lead's coding patterns and naming conventions
6. Include proper imports, types, and error handling
7. Components must include styling (CSS modules, styled-components, or inline as per guidelines)
8. Use STRICT TypeScript types for all props and state. Do NOT use \`any\`.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Every file in assignedFiles must appear in your output",
        "No placeholder code — every function must be fully implemented",
        "Use STRICT TypeScript with proper type annotations; never use 'any'",
        "Include all necessary imports and ensure UI framework dependencies are stable",
        "Generate proper entry files (index.html, main.tsx, App.tsx) if assigned",
        "Follow the naming convention from shared patterns",
      ],
    };
  }
}
