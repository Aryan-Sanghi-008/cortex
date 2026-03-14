import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import { EXPERT_ROLE_TASK_MANDATE, EXPERT_ROLE_CONSTRAINTS } from "./prompt-quality.js";
import { formatLeadAssignment, formatCodebase } from "../utils/context-compressor.js";
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
  protected override maxTokens = 32768;
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
      context: `${formatLeadAssignment(leadAssignment)}

## Generated Code to Review:
${formatCodebase(code as any)}`,
      task: `You are the ${this.teamName} Lead conducting a thorough code review of your team's submissions. Review this code as if you were a Tech Lead at Stripe who would be accountable if broken code ships to production.

REVIEW CHECKLIST — evaluate EVERY item:

1. **Architecture Compliance** (Critical)
   - Does the code follow YOUR architecture decisions exactly? (folder structure, naming, patterns)
   - Are the lead's technical guidelines followed? (state management approach, API patterns, error handling strategy)
   - Are the shared patterns applied consistently? (naming conventions, file structure, import patterns)
   - Does each module stay within its defined scope? (no feature creep, no cross-boundary imports)

2. **Completeness** (Critical)
   - Is EVERY file from the assignment present in the output? Count them.
   - Is every function fully implemented? No TODOs, no placeholders, no "// implement later", no empty function bodies
   - Are all required features from the module requirements actually implemented?
   - Are essential project files present? (main.tsx/App.tsx for frontend, server.ts for backend — missing these = DOA)
   - Do list views include pagination? Do forms include validation? Do pages include error states?

3. **Type Safety** (Critical)
   - Is TypeScript used STRICTLY? No \`any\` types anywhere in the codebase
   - Are function parameters and return types explicitly annotated?
   - Are component props properly typed with interfaces?
   - Are API response types defined and used correctly?
   - Are there any implicit \`any\` from untyped library usage?

4. **Error Handling** (Critical)
   - Does every async operation have try/catch or .catch()?
   - Are errors caught and presented to the user (not silently swallowed)?
   - Are API errors handled with proper status code checks (401 → redirect to login, 404 → show not found, etc.)?
   - Do React components have ErrorBoundary wrappers where appropriate?
   - Are database errors (Prisma error codes) caught and translated to user-friendly messages?

5. **Dependency Stability** (Critical)
   - Are ALL dependencies on stable, production-released versions?
   - Are there ANY beta, RC, alpha, or canary packages? These are HARD REJECT.
   - Are dependency versions pinned or using caret (^) ranges appropriately?
   - Are there any deprecated packages being used?

6. **Security** (Important)
   - Is input validated at boundaries (API route level for backend, form level for frontend)?
   - Are there any hardcoded secrets, API keys, or credentials?
   - Is authentication middleware applied to all protected routes?
   - Are passwords hashed (bcrypt), not stored in plaintext?
   - Is user input sanitized before use in queries or templates?

7. **Code Quality** (Important)
   - Is the code readable and well-organized?
   - Are function names descriptive? Variable names meaningful?
   - Is there unnecessary code duplication?
   - Are files a reasonable size (< 300 lines for components, < 500 for services)?
   - Are there unused imports, variables, or functions?

8. **Best Practices**
   - React: proper hook usage, dependency arrays, key props on lists, controlled components
   - Express: proper middleware ordering, async error handling, input validation
   - Prisma: typed queries, proper relation loading, transaction usage for multi-model operations
   - General: consistent code style, proper imports, meaningful comments (not obvious ones)

SCORING GUIDE:
- 9-10: Exceptional — production-ready, clean, comprehensive, no issues
- 7-8: Good — production-worthy, minor improvements suggested but nothing blocking
- 5-6: Acceptable — works but has significant gaps that should be addressed
- 3-4: Below standard — multiple issues that would cause production problems
- 1-2: Unacceptable — major missing pieces, broken functionality, or security issues

Review the code as a whole. Do NOT include every single file in the fileReviews array. ONLY include files in the fileReviews array that actually have issues or need changes. If a file is perfect, leave it out of the array to save space. Set approved = true ONLY if overallQuality >= 7.${EXPERT_ROLE_TASK_MANDATE}`,
      schemaDescription: PR_REVIEW_SCHEMA_DESCRIPTION,
      constraints: [
        ...EXPERT_ROLE_CONSTRAINTS,
        "ONLY include files in the fileReviews array if they have actual problems or suggestions. Skip perfect files.",
        "Check that ALL files from the module assignment are present in the output",
        "Flag ANY placeholder or stub code as a blocking issue — this is a hard reject",
        "Flag ANY usage of 'any' type as a blocking issue for type safety",
        "STRONGLY reject ANY use of unstable/beta/RC/alpha dependencies — this is a hard reject",
        "Flag missing entry files (main.tsx, App.tsx, server.ts) as CRITICAL — the app cannot start without them",
        "Flag missing error handling on async operations as a significant issue",
        "Flag hardcoded secrets or missing auth middleware as CRITICAL security issues",
        "approved = true ONLY if overallQuality >= 7 — be honest, don't inflate scores",
        "Provide specific, actionable feedback — 'line X in file Y has issue Z' rather than 'code could be better'",
      ],
    };
  }
}
