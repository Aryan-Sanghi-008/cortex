import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import {
  DocGeneratorOutput,
  DocGeneratorOutputSchema,
  DOC_GENERATOR_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class DocGeneratorBot extends BaseBot<DocGeneratorOutput> {
  readonly role = BotRole.DOC_GENERATOR;
  private imageDescriptions: string[];

  constructor(
    llm: LLMProvider,
    imageDescriptions: string[] = [],
    maxRetries?: number
  ) {
    super(
      llm,
      DocGeneratorOutputSchema,
      "DocumentationGenerator",
      maxRetries
    );
    this.imageDescriptions = imageDescriptions;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const imageContext =
      this.imageDescriptions.length > 0
        ? `\n\nThe user also provided ${this.imageDescriptions.length} reference image(s):\n${this.imageDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}`
        : "";

    return {
      role: BotRole.DOC_GENERATOR,
      context: `Raw User Prompt: ${memory.productIdea}${imageContext}`,
      task: `Convert this raw product idea into a comprehensive, structured technical specification that serves as the single source of truth for ALL downstream engineering work.

Think like a principal technical writer at a company like Stripe or GitLab — someone who can take a vague 2-sentence product idea and produce a document that 20 engineers could independently build from.

Analyze the prompt deeply and extract:

1. **Project Identity**
   - Derive a clear, professional project name and project type (web-app, api, fullstack, mobile, etc.)
   - Write a detailed summary that captures not just WHAT the product does, but WHY it exists and WHO it serves
   - Identify the target audience with specific personas (e.g., "HR managers at mid-size companies with 50-500 employees")

2. **Feature Extraction — Be Exhaustive**
   - Extract every explicitly mentioned feature AND infer the implied features that any real product would need:
     • If there are "users" → you need authentication, registration, profile management, password reset
     • If there's "data" → you need CRUD operations, search, filtering, pagination, data export
     • If there are "roles" → you need role-based access control, permission management, admin panels
     • If there's "content" → you need content creation, editing, versioning, media upload
     • If there's "collaboration" → you need real-time updates, notifications, activity feeds
     • If there's "payments" → you need billing, subscriptions, invoices, payment method management
   - Assign correct priority (must-have, should-have, could-have) and category (frontend, backend, fullstack)
   - Include cross-cutting concerns: error handling, loading states, empty states, offline behavior

3. **UI Design & Reference Image Analysis**
   - If reference images were described, extract EVERY design detail: color schemes, layout patterns, typography, component styles, navigation structure, iconography
   - Identify all pages/screens the app needs with: exact route paths, authentication requirements (public/private/admin-only), and the key UI components on each page
   - Include essential utility pages: login, signup, forgot password, 404, settings, profile

4. **Data Domain Modeling**
   - Identify ALL core data entities with their fields, types, and relationships
   - Think about the entity lifecycle: What states does each entity go through? (e.g., Order: draft → pending → confirmed → shipped → delivered → returned)
   - Identify relationships: 1:1, 1:N, N:N. Which relationships need join tables with metadata?
   - Include system entities that every app needs: User, Session, AuditLog, Notification

5. **Technical Hints & Constraints**
   - Extract any technical preferences the user mentioned (specific frameworks, databases, hosting preferences)
   - Identify scalability constraints (how many users? how much data? real-time requirements?)
   - Note integration requirements (third-party APIs, OAuth providers, payment processors)

Be AGGRESSIVELY thorough. A feature you miss here will be missing from the entire project. When in doubt, include it.`,
      schemaDescription: DOC_GENERATOR_SCHEMA_DESCRIPTION,
      constraints: [
        "Extract features comprehensively — for every 1 feature the user mentions, identify 2-3 implied features",
        "Data entities must capture the COMPLETE domain model — include User, Session, and any entity implied by features",
        "Pages must include ALL auth flows (login, signup, forgot password, email verification) and utility pages (404, settings)",
        "Be specific about each feature's category: 'frontend' for UI-only, 'backend' for API-only, 'fullstack' for features that span both",
        "Route paths must follow RESTful conventions: /users, /users/:id, /dashboard, /settings",
        "Include edge case features: empty states, error pages, loading skeletons, permission-denied screens",
        "If reference images are provided, extract EVERY UI detail (colors, spacing, component types, layout structure)",
        "Every data entity must have an id, createdAt, and updatedAt field at minimum",
      ],
    };
  }
}
