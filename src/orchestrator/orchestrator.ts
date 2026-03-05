import { randomUUID } from "crypto";
import { AppConfig } from "../config.js";
import { createLLMProvider } from "../llm/index.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PersistentMemory } from "../memory/persistent.memory.js";
import { ProjectStore } from "../memory/project-store.js";
import { TeamRunner } from "./team-runner.js";
import { ProjectAssembler } from "./project-assembler.js";
import { WSEmitter } from "../server/ws-emitter.js";
import { logger } from "../utils/logger.js";
import { runWithConcurrency } from "../utils/concurrency.js";
import { compressCodeOutput } from "../utils/context-compressor.js";
import { TokenTracker, type ProjectCostBreakdown } from "../utils/token-tracker.js";

// Bots
import { DocGeneratorBot } from "../bots/doc-generator.bot.js";
import { ProductOwnerBot } from "../bots/product-owner.bot.js";
import { TechStackBot } from "../bots/tech-stack.bot.js";
import { ResourcePlannerBot } from "../bots/resource-planner.bot.js";
import { FrontendLeadBot } from "../bots/frontend/frontend-lead.bot.js";
import { BackendLeadBot } from "../bots/backend/backend-lead.bot.js";
import { DBLeadBot } from "../bots/database/db-lead.bot.js";
import { QALeadBot } from "../bots/qa/qa-lead.bot.js";
import { DevOpsBot } from "../bots/devops.bot.js";
import { PrincipalBot } from "../bots/principal.bot.js";
import { DataDevBot } from "../bots/database/data-dev.bot.js";
import { QADevBot } from "../bots/qa/qa-dev.bot.js";

import type { CodeOutput, DocGeneratorOutput } from "../validation/index.js";

export interface ProjectOutput {
  projectId: string;
  projectName: string;
  productIdea: string;
  generatedAt: string;
  status: "approved" | "rejected";

  documentation: DocGeneratorOutput;
  frontendCode: CodeOutput;
  backendCode: CodeOutput;
  databaseCode: CodeOutput;
  qaCode: CodeOutput;
  devopsCode: CodeOutput;

  principalReview: {
    approved: boolean;
    overallQuality: number;
    summary: string;
  };

  projectDir: string;
  zipPath: string;

  costBreakdown: ProjectCostBreakdown;
}

/**
 * Orchestrator V2 — runs the full code generation pipeline.
 *
 * Pipeline:
 *   1. Documentation Generator → structured spec
 *   2. Product Owner → requirements
 *   3. Tech Stack Selector → tech choices
 *   4. Resource Planner → team allocation
 *   5. Leads (FE + BE) → architecture & module assignment
 *   6. Dev teams (FE + BE + DB) → actual code (parallel)
 *   7. QA → test files
 *   8. DevOps → infrastructure files
 *   9. Principal Engineer → final review
 *   10. Project Assembly → ZIP
 */
export class Orchestrator {
  private config: AppConfig;
  private persistentMemory: PersistentMemory;
  private projectStore: ProjectStore;
  private emitter?: WSEmitter;
  public tokenTracker: TokenTracker;

  constructor(config: AppConfig, emitter?: WSEmitter) {
    this.config = config;
    this.persistentMemory = new PersistentMemory(config.outputDir);
    this.projectStore = new ProjectStore();
    this.emitter = emitter;
    this.tokenTracker = new TokenTracker();
  }

  async run(
    productIdea: string,
    imagePaths: string[] = []
  ): Promise<ProjectOutput> {
    const projectId = randomUUID().slice(0, 8);
    const memory = new ShortTermMemory(projectId, productIdea);
    const maxRetries = this.config.llm.maxRetries;

    logger.header("🧠 Cortex — AI Code Generation Platform");
    logger.info(`Project ID: ${projectId}`);
    logger.info(`Product Idea: "${productIdea}"`);
    logger.divider();

    this.emitter?.pipelineStart(projectId, productIdea);

    const defaultLLM = this.createDefaultProvider();
    const leaderLLM = this.createLeaderProvider();

    // ─── Load past project lessons ───────────────────────────
    const similarProjects = await this.projectStore.findSimilar(productIdea);
    if (similarProjects.length > 0) {
      const lessons = this.projectStore.formatForPrompt(similarProjects);
      memory.set("past-projects", lessons, "ProjectStore");
      logger.info(`Found ${similarProjects.length} similar past projects for context`);
    }

    // ─── Step 1: Documentation Generator ────────────────────
    logger.step(1, 10, "Documentation Generator — Creating spec");
    this.emitter?.botStart(projectId, "DocGenerator", "Converting prompt to spec");

    // TODO: Add Gemini Vision support for imagePaths
    const imageDescs = imagePaths.map((p) => `Reference image: ${p}`);
    const docBot = new DocGeneratorBot(defaultLLM, imageDescs, maxRetries);
    const docResult = await docBot.execute(memory);
    memory.set("documentation", docResult.output, docBot.role);

    this.emitter?.botComplete(projectId, "DocGenerator");
    logger.bot("DocGenerator", `Spec: ${docResult.output.projectName} — ${docResult.output.features.length} features`);
    this.guardTokenLimit();

    // ─── Step 2: Product Owner ──────────────────────────────
    logger.step(2, 10, "Product Owner — Requirements");
    this.emitter?.botStart(projectId, "ProductOwner", "Generating requirements");

    const poBot = new ProductOwnerBot(defaultLLM, maxRetries);
    const poResult = await poBot.execute(memory);
    memory.set("product-owner", poResult.output, poBot.role);

    this.emitter?.botComplete(projectId, "ProductOwner");
    this.guardTokenLimit();

    // ─── Step 3: Tech Stack Selector ────────────────────────
    logger.step(3, 10, "Tech Stack Selector — Choosing tech");
    this.emitter?.botStart(projectId, "TechStack", "Selecting technologies");

    const tsBot = new TechStackBot(defaultLLM, maxRetries);
    const tsResult = await tsBot.execute(memory);
    memory.set("tech-stack", tsResult.output, tsBot.role);

    this.emitter?.botComplete(projectId, "TechStack");
    logger.bot("TechStack", `${tsResult.output.frontend.join(", ")} | ${tsResult.output.backend.join(", ")} | ${tsResult.output.database}`);
    this.guardTokenLimit();

    // ─── Step 4: Resource Planner ───────────────────────────
    logger.step(4, 10, "Resource Planner — Team allocation");
    this.emitter?.botStart(projectId, "ResourcePlanner", "Allocating teams");

    const rpBot = new ResourcePlannerBot(defaultLLM, maxRetries);
    const rpResult = await rpBot.execute(memory);
    memory.set("resource-planner", rpResult.output, rpBot.role);

    this.emitter?.botComplete(projectId, "ResourcePlanner");

    // ─── Step 5: Lead assignments (parallel) ────────────────
    logger.step(5, 10, "Leads — Architecture & module breakdown");
    this.emitter?.botStart(projectId, "Frontend-Lead", "Designing architecture");
    this.emitter?.botStart(projectId, "Backend-Lead", "Designing architecture");

    const feLeadBot = new FrontendLeadBot(defaultLLM, maxRetries);
    const beLeadBot = new BackendLeadBot(defaultLLM, maxRetries);

    const [feLeadResult, beLeadResult] = await Promise.all([
      feLeadBot.execute(memory),
      beLeadBot.execute(memory),
    ]);

    memory.set("frontend-lead", feLeadResult.output, feLeadBot.role);
    memory.set("backend-lead", beLeadResult.output, beLeadBot.role);

    // ─── Step 5.5: API Contract Sync ────────────────────
    // Share BE lead's API contract with FE devs for consistent API calls
    const apiContract = beLeadResult.output.apiContract ?? [];
    if (apiContract.length > 0) {
      memory.set("api-contract", apiContract, "ContractSync");
      logger.bot("ContractSync", `Synced ${apiContract.length} API endpoints to frontend team`);
    }

    this.emitter?.botComplete(projectId, "Frontend-Lead");
    this.emitter?.botComplete(projectId, "Backend-Lead");
    logger.bot("FE-Lead", `${feLeadResult.output.modules.length} modules assigned`);
    this.guardTokenLimit();
    logger.bot("BE-Lead", `${beLeadResult.output.modules.length} modules assigned`);

    // ─── Step 6: Dev teams + DB (parallel) ──────────────────
    logger.step(6, 10, "Dev Teams — Code generation (FE + BE + DB)");

    const teamRunner = new TeamRunner(defaultLLM, maxRetries, this.emitter);
    const dbLeadBot = new DBLeadBot(defaultLLM, maxRetries);
    const dataDevBot = new DataDevBot(defaultLLM, maxRetries);

    this.emitter?.botStart(projectId, "Database-Lead", "Generating schema");

    // Run Frontend, Backend, and DB Lead in parallel
    const [feTeamResult, beTeamResult, dbLeadResult] = await Promise.all([
      teamRunner.runFrontendTeam(memory),
      teamRunner.runBackendTeam(memory),
      dbLeadBot.execute(memory),
    ]);

    memory.set("database-lead", dbLeadResult.output, dbLeadBot.role);
    this.emitter?.botComplete(projectId, "Database-Lead", dbLeadResult.output.files.length);
    
    // Now run DataDevBot with the DB Lead's output
    this.emitter?.botStart(projectId, "Data-Dev", "Generating database implementations");
    const dataDevResult = await dataDevBot.execute(memory);
    
    // Merge DB Lead and Data Dev outputs
    const mergedDbCode: CodeOutput = {
      files: [...dbLeadResult.output.files, ...dataDevResult.output.files],
      dependencies: [...new Set([...dbLeadResult.output.dependencies, ...dataDevResult.output.dependencies])],
      devDependencies: [...new Set([...dbLeadResult.output.devDependencies, ...dataDevResult.output.devDependencies])],
    };
    memory.set("database-code", mergedDbCode, dataDevBot.role);
    this.emitter?.botComplete(projectId, "Data-Dev", dataDevResult.output.files.length);

    this.guardTokenLimit();

    // ─── Step 7: QA ─────────────────────────────────────────
    logger.step(7, 10, "QA — Generating tests");

    // Compress code context for QA bots (they need structure, not full source)
    memory.set("frontend-code-summary", compressCodeOutput(feTeamResult.code), "Compressor");
    memory.set("backend-code-summary", compressCodeOutput(beTeamResult.code), "Compressor");

    this.emitter?.botStart(projectId, "QA-Lead", "Designing test strategy");

    const qaLeadBot = new QALeadBot(defaultLLM, maxRetries);
    const qaLeadResult = await qaLeadBot.execute(memory);
    memory.set("qa-lead", qaLeadResult.output, qaLeadBot.role);
    this.emitter?.botComplete(projectId, "QA-Lead");

    this.emitter?.botStart(projectId, "QA-Devs", "Writing tests");
    // Run QADevBots for each module in the QA Lead's assignment (rate-limited)
    const qaDevResults = await runWithConcurrency(
      qaLeadResult.output.modules.map((_, index) => {
        return () => {
          const qaDevBot = new QADevBot(defaultLLM, index, maxRetries);
          return qaDevBot.execute(memory);
        };
      }),
      parseInt(process.env.MAX_CONCURRENCY ?? "3", 10) // Configurable: free tier = 3, paid tier = higher
    );
    
    const mergedQaCode: CodeOutput = {
      files: qaDevResults.flatMap((r) => r.output.files),
      dependencies: [...new Set(qaDevResults.flatMap((r) => r.output.dependencies))],
      devDependencies: [...new Set(qaDevResults.flatMap((r) => r.output.devDependencies))],
    };
    memory.set("qa-code", mergedQaCode, "QA-Devs");
    this.emitter?.botComplete(projectId, "QA-Devs", mergedQaCode.files.length);

    // ─── Step 8: DevOps ─────────────────────────────────────
    logger.step(8, 10, "DevOps — Infrastructure files");
    this.emitter?.botStart(projectId, "DevOps", "Generating infra");

    const devopsBot = new DevOpsBot(defaultLLM, maxRetries);
    const devopsResult = await devopsBot.execute(memory);
    memory.set("devops-code", devopsResult.output, devopsBot.role);
    this.emitter?.botComplete(projectId, "DevOps", devopsResult.output.files.length);
    this.guardTokenLimit();

    // ─── Step 9: Principal Engineer Review ──────────────────
    logger.step(9, 10, "Principal Engineer — Final review");
    this.emitter?.botStart(projectId, "Principal-Engineer", "Reviewing all code");

    const principalBot = new PrincipalBot(leaderLLM, maxRetries);
    const principalResult = await principalBot.execute(memory);
    memory.set("principal-review", principalResult.output, principalBot.role);

    this.emitter?.reviewResult(
      projectId,
      "Principal-Engineer",
      principalResult.output.approved,
      principalResult.output.overallQuality
    );

    const status = principalResult.output.approved ? "approved" : "rejected";
    logger.bot(
      "Principal",
      `${status.toUpperCase()} — Quality: ${principalResult.output.overallQuality}/10`
    );

    // ─── Step 10: Project Assembly ──────────────────────────
    logger.step(10, 10, "Assembly — Writing project files");

    const assembler = new ProjectAssembler(this.config.outputDir);
    const codeOutputs: Record<string, CodeOutput> = {
      frontend: feTeamResult.code,
      backend: beTeamResult.code,
      database: mergedDbCode,
      qa: mergedQaCode,
      devops: devopsResult.output,
    };

    const projectName = docResult.output.projectName || "cortex-project";
    const { projectDir, zipPath } = await assembler.assembleProject(
      projectId,
      projectName,
      codeOutputs
    );

    // Save metadata
    await this.persistentMemory.saveProject(memory);

    // Store project record for future cross-project learning
    const totalFiles = feTeamResult.code.files.length + beTeamResult.code.files.length
      + mergedDbCode.files.length + mergedQaCode.files.length + devopsResult.output.files.length;
    await this.projectStore.addProject({
      id: projectId,
      prompt: productIdea,
      projectType: docResult.output.projectType ?? "fullstack",
      features: docResult.output.features?.map((f: { name: string }) => f.name) ?? [],
      techStack: {
        frontend: tsResult.output.frontend ?? [],
        backend: tsResult.output.backend ?? [],
        database: tsResult.output.database ?? "postgresql",
      },
      fileCount: totalFiles,
      qualityScore: principalResult.output.overallQuality,
      lessons: principalResult.output.requiredChanges ?? [],
    });

    this.emitter?.pipelineComplete(
      projectId,
      status,
      principalResult.output.overallQuality
    );

    logger.divider();
    logger.header("✅ Cortex Pipeline Complete!");
    logger.info(`Status: ${status.toUpperCase()}`);
    logger.info(`Score: ${principalResult.output.overallQuality}/10`);
    logger.info(`Project: ${projectDir}`);
    logger.info(`ZIP: ${zipPath}`);

    // Print token usage summary to terminal
    this.tokenTracker.printSummary();

    return {
      projectId,
      projectName,
      productIdea,
      generatedAt: new Date().toISOString(),
      status,
      documentation: docResult.output,
      frontendCode: feTeamResult.code,
      backendCode: beTeamResult.code,
      databaseCode: mergedDbCode,
      qaCode: mergedQaCode,
      devopsCode: devopsResult.output,
      principalReview: {
        approved: principalResult.output.approved,
        overallQuality: principalResult.output.overallQuality,
        summary: principalResult.output.summary,
      },
      projectDir,
      zipPath,
      costBreakdown: this.tokenTracker.getBreakdown(),
    };
  }

  private createDefaultProvider() {
    const name = this.config.llm.defaultProvider;
    const cfg = this.config.llm[name];
    return createLLMProvider(name, {
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: this.config.llm.defaultTemperature,
      baseUrl: 'baseUrl' in cfg ? (cfg as any).baseUrl : undefined,
      tracker: this.tokenTracker,
    });
  }

  private createLeaderProvider() {
    const leaderCfg = this.config.llm.leader;
    if (leaderCfg.provider && leaderCfg.model) {
      const cfg = this.config.llm[leaderCfg.provider];
      return createLLMProvider(leaderCfg.provider, {
        apiKey: cfg.apiKey,
        model: leaderCfg.model,
        temperature: this.config.llm.defaultTemperature,
        baseUrl: 'baseUrl' in cfg ? (cfg as any).baseUrl : undefined,
        tracker: this.tokenTracker,
      });
    }
    return this.createDefaultProvider();
  }

  /**
   * Guard: check if we've exceeded the token limit (default 1.5M).
   * Logs current usage and throws if limit is hit.
   */
  private guardTokenLimit(): void {
    const total = this.tokenTracker.getTotalTokens();
    const max = parseInt(process.env.MAX_TOKENS ?? "1500000", 10);
    logger.info(`Token usage: ${total.toLocaleString()} / ${max.toLocaleString()}`);
    this.tokenTracker.checkLimit(max);
  }
}
