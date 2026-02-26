import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { BotRole, type BotResult } from "../bots/types.js";
import { LeadReviewerBot } from "../bots/lead-reviewer.bot.js";
import { FrontendDevBot } from "../bots/frontend/frontend-dev.bot.js";
import { BackendDevBot } from "../bots/backend/backend-dev.bot.js";
import { WSEmitter } from "../server/ws-emitter.js";
import { logger } from "../utils/logger.js";
import type { CodeOutput, LeadAssignment, PRReview } from "../validation/index.js";

const MAX_REVIEW_LOOPS = 2;

interface TeamRunResult {
  code: CodeOutput;
  review?: PRReview;
}

/**
 * Team Runner — executes the Lead → Dev → Review loop for a team.
 *
 * Flow:
 *   1. Lead assigns modules
 *   2. Dev bots generate code (one per module, in parallel)
 *   3. Lead reviews all generated code
 *   4. If rejected → dev bots revise (up to MAX_REVIEW_LOOPS times)
 */
export class TeamRunner {
  constructor(
    private llm: LLMProvider,
    private maxRetries: number,
    private emitter?: WSEmitter
  ) {}

  /**
   * Run the frontend team's full Lead → Dev → Review cycle.
   */
  async runFrontendTeam(
    memory: ShortTermMemory
  ): Promise<TeamRunResult> {
    const leadAssignment = memory.get<LeadAssignment>("frontend-lead")!;
    const projectId = memory.projectId;

    return this.runDevReviewLoop({
      projectId,
      teamName: "Frontend",
      role: BotRole.FRONTEND_LEAD,
      codeKey: "frontend-code",
      leadAssignment,
      memory,
      createDevBot: (moduleIndex) =>
        new FrontendDevBot(this.llm, moduleIndex, this.maxRetries),
      feedbackKeyPrefix: "frontend-dev",
    });
  }

  /**
   * Run the backend team's full Lead → Dev → Review cycle.
   */
  async runBackendTeam(
    memory: ShortTermMemory
  ): Promise<TeamRunResult> {
    const leadAssignment = memory.get<LeadAssignment>("backend-lead")!;
    const projectId = memory.projectId;

    return this.runDevReviewLoop({
      projectId,
      teamName: "Backend",
      role: BotRole.BACKEND_LEAD,
      codeKey: "backend-code",
      leadAssignment,
      memory,
      createDevBot: (moduleIndex) =>
        new BackendDevBot(this.llm, moduleIndex, this.maxRetries),
      feedbackKeyPrefix: "backend-dev",
    });
  }

  /**
   * Generic Lead → Dev → Review loop.
   */
  private async runDevReviewLoop(opts: {
    projectId: string;
    teamName: string;
    role: BotRole;
    codeKey: string;
    leadAssignment: LeadAssignment;
    memory: ShortTermMemory;
    createDevBot: (moduleIndex: number) => FrontendDevBot | BackendDevBot;
    feedbackKeyPrefix: string;
  }): Promise<TeamRunResult> {
    const { projectId, teamName, role, codeKey, leadAssignment, memory } = opts;

    let mergedCode: CodeOutput = { files: [], dependencies: [], devDependencies: [] };
    let lastReview: PRReview | undefined;

    for (let loop = 0; loop <= MAX_REVIEW_LOOPS; loop++) {
      // ─── Dev bots generate code (parallel per module) ─────
      this.emitter?.botStart(projectId, `${teamName}-Devs`, "Generating code");
      logger.bot(`${teamName}-Team`, `Dev cycle ${loop + 1}: generating code for ${leadAssignment.modules.length} modules`);

      const devResults: BotResult<CodeOutput>[] = await Promise.all(
        leadAssignment.modules.map((_, index) => {
          const devBot = opts.createDevBot(index);
          return devBot.execute(memory);
        })
      );

      // Merge all dev bot outputs into a single CodeOutput
      mergedCode = {
        files: devResults.flatMap((r) => r.output.files),
        dependencies: [...new Set(devResults.flatMap((r) => r.output.dependencies))],
        devDependencies: [...new Set(devResults.flatMap((r) => r.output.devDependencies))],
      };

      memory.set(codeKey, mergedCode, teamName);

      this.emitter?.botComplete(projectId, `${teamName}-Devs`, mergedCode.files.length);
      logger.bot(`${teamName}-Team`, `Generated ${mergedCode.files.length} files`);

      // ─── Lead reviews the code ────────────────────────────
      this.emitter?.reviewStart(projectId, `${teamName}-Lead`, `${teamName}-Devs`);
      logger.bot(`${teamName}-Lead`, "Reviewing generated code...");

      const reviewer = new LeadReviewerBot(
        this.llm,
        role,
        teamName,
        codeKey,
        this.maxRetries
      );
      const reviewResult = await reviewer.execute(memory);
      lastReview = reviewResult.output;

      this.emitter?.reviewResult(
        projectId,
        `${teamName}-Lead`,
        lastReview.approved,
        lastReview.overallQuality
      );

      if (lastReview.approved) {
        logger.success(
          `${teamName} Lead APPROVED — Quality: ${lastReview.overallQuality}/10`
        );
        break;
      }

      if (loop < MAX_REVIEW_LOOPS) {
        logger.warn(
          `${teamName} Lead REJECTED — Quality: ${lastReview.overallQuality}/10. Requesting changes...`
        );

        // Store feedback for each dev bot
        const feedbackStr = lastReview.requiredChanges.join("\n") +
          "\n\nFile-specific comments:\n" +
          lastReview.fileReviews
            .filter((f) => f.status === "needs-changes")
            .map(
              (f) =>
                `${f.path}: ${f.comments.map((c) => c.comment).join("; ")}`
            )
            .join("\n");

        leadAssignment.modules.forEach((_, i) => {
          memory.set(`${opts.feedbackKeyPrefix}-${i}-feedback`, feedbackStr);
        });
      }
    }

    return { code: mergedCode, review: lastReview };
  }
}
