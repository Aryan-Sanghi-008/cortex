import { BaseBot } from "./base.bot.js";
import { BotRole } from "./types.js";
import { LLMProvider } from "../llm/types.js";
import { ShortTermMemory } from "../memory/short-term.memory.js";
import { PromptParts } from "../utils/prompt-builder.js";
import {
  ProductOwnerOutput,
  ProductOwnerOutputSchema,
  PRODUCT_OWNER_SCHEMA_DESCRIPTION,
} from "../validation/index.js";

export class ProductOwnerBot extends BaseBot<ProductOwnerOutput> {
  readonly role = BotRole.PRODUCT_OWNER;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, ProductOwnerOutputSchema, "ProductOwner", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    return {
      role: BotRole.PRODUCT_OWNER,
      context: `Product Idea: ${memory.productIdea}`,
      task: `Analyze this product idea and produce a comprehensive, production-grade product specification — the kind of document a Series B startup would use to align engineering, design, and QA for a major release.

Your specification must include:

1. **Epics (Feature Groups)**
   - Identify ALL major functional areas of the product — don't just cover the obvious features, think about the supporting infrastructure every real app needs:
     • Authentication & Authorization (login, signup, password reset, session management, OAuth)
     • User Management (profiles, settings, preferences, account deletion)
     • Core Domain Features (the main value proposition of the product)
     • Admin/Management Dashboard (if the product has admin users)
     • Notifications (email, in-app, push)
     • Search & Filtering (full-text search, faceted filters)
     • Analytics & Reporting (usage metrics, dashboards)
     • Settings & Configuration (app-level settings, tenant settings)
   - Each epic should have a clear scope boundary — what's IN and what's OUT

2. **User Stories with Acceptance Criteria**
   - Write stories in the format: "As a [specific persona], I want [capability], so that [measurable business value]"
   - Each story MUST have testable acceptance criteria — not "should be fast" but "page loads in under 2 seconds on 3G connection"
   - Include edge case stories that junior POs miss:
     • What happens when the user has no data yet? (empty states)
     • What happens when the user's session expires mid-action?
     • What happens when two users edit the same resource simultaneously?
     • What happens when an API call fails? (error recovery)
     • What happens when the user has insufficient permissions?
   - Prioritize using MoSCoW: Must Have (MVP), Should Have (launch), Could Have (post-launch), Won't Have (out of scope)

3. **Technical Constraints**
   - Performance requirements (page load times, API response times, concurrent user targets)
   - Security requirements (data encryption, PII handling, OWASP Top 10 compliance)
   - Accessibility requirements (WCAG 2.1 AA compliance)
   - Browser/device support requirements
   - Data retention and privacy requirements

4. **Assumptions & Risks**
   - Explicitly state every assumption you're making about the product scope
   - Identify risks that could derail the project (technical complexity, unclear requirements, third-party dependencies)
   - For each risk, suggest a mitigation strategy

Be ruthlessly thorough — this specification will be the SINGLE SOURCE OF TRUTH for all downstream architecture, engineering, QA, and DevOps decisions. If something is ambiguous in the product idea, make a reasonable assumption and document it clearly.`,
      schemaDescription: PRODUCT_OWNER_SCHEMA_DESCRIPTION,
      constraints: [
        "Each user story must have a unique ID (US-001, US-002, etc.)",
        "Each user story must reference a valid epic name",
        "Priority distribution must be realistic — roughly 30% Must, 30% Should, 25% Could, 15% Won't",
        "Generate at least 5 epics and 20 user stories for a thorough specification",
        "Every acceptance criterion must be testable — a QA engineer should be able to write a test case directly from it",
        "Include at least 3 edge case user stories (empty states, error recovery, permission boundaries)",
        "Include non-functional requirements as explicit user stories (performance, security, accessibility)",
        "Assumptions must be specific and actionable — not 'we assume the user has internet' but 'we assume the target audience uses modern browsers (Chrome 90+, Firefox 90+, Safari 15+)'",
      ],
    };
  }
}
