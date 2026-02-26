// ─── Core types ───────────────────────────────────────────────
export { BotRole, type Bot, type BotResult } from "./types.js";
export { BaseBot } from "./base.bot.js";

// ─── Planning bots ───────────────────────────────────────────
export { DocGeneratorBot } from "./doc-generator.bot.js";
export { ProductOwnerBot } from "./product-owner.bot.js";
export { TechStackBot } from "./tech-stack.bot.js";
export { ResourcePlannerBot } from "./resource-planner.bot.js";

// ─── Team bots ───────────────────────────────────────────────
export { FrontendLeadBot } from "./frontend/frontend-lead.bot.js";
export { FrontendDevBot } from "./frontend/frontend-dev.bot.js";
export { BackendLeadBot } from "./backend/backend-lead.bot.js";
export { BackendDevBot } from "./backend/backend-dev.bot.js";
export { DBLeadBot } from "./database/db-lead.bot.js";
export { QALeadBot } from "./qa/qa-lead.bot.js";
export { DevOpsBot } from "./devops.bot.js";
export { PrincipalBot } from "./principal.bot.js";
export { LeadReviewerBot } from "./lead-reviewer.bot.js";
