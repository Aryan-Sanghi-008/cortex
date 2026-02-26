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
import type { CodeOutput } from "../validation/index.js";

/**
 * Generic Lead Reviewer — used by FE/BE leads to review dev bot code.
 */
export class LeadReviewerBot extends BaseBot<PRReview> {
  readonly role: BotRole;
  private teamName: string;
  private codeKey: string;

  constructor(
    llm: LLMProvider,
    role: BotRole,
    teamName: string,
    codeKey: string,
    maxRetries?: number
  ) {
    super(llm, PRReviewSchema, `${teamName}-Lead-Review`, maxRetries);
    this.role = role;
    this.teamName = teamName;
    this.codeKey = codeKey;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const leadAssignment = memory.get(`${this.codeKey.replace("-code", "-lead")}`);
    const code = memory.get<CodeOutput[]>(this.codeKey) ?? memory.get<CodeOutput>(this.codeKey);

    return {
      role: this.role,
      context: `Lead Architecture Assignment:
${JSON.stringify(leadAssignment, null, 2)}

Generated Code to Review:
${JSON.stringify(code, null, 2)}`,
      task: `You are the ${this.teamName} Lead reviewing code submitted by your dev team.

Review every file for:
1. Does it follow your architecture decisions and guidelines?
2. Is the code complete — no placeholders, no TODOs?
3. Is error handling proper and types strictly correct?
4. Are essential project files present (like main.tsx, App.tsx, or server.ts)?
5. Are all dependencies explicitly stable (no beta/rc tags)?
6. Does it match the assigned module requirements?
7. Code quality and readability

Be thorough but fair — approve if the code is production-worthy.
Set approved = true if overallQuality >= 7.`,
      schemaDescription: PR_REVIEW_SCHEMA_DESCRIPTION,
      constraints: [
        "Review every generated file",
        "Check that module requirements are fully implemented",
        "Flag placeholder or stub code and missing project entry files strongly",
        "Flag any usage of 'any' or missing error handling",
        "Strongly reject the use of unstable/beta dependencies",
        "approved = true only if overallQuality >= 7",
      ],
    };
  }
}
