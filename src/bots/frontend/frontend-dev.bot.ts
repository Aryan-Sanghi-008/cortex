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

  constructor(llm: LLMProvider, moduleIndex: number, maxRetries?: number) {
    super(llm, CodeOutputSchema, `Frontend-Dev-${moduleIndex + 1}`, maxRetries);
    this.moduleIndex = moduleIndex;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const leadAssignment = memory.get<LeadAssignment>("frontend-lead");
    const module = leadAssignment?.modules[this.moduleIndex];
    const feedback = memory.get<string>(
      `frontend-dev-${this.moduleIndex}-feedback`,
    );
    const apiContract = memory.get("api-contract");

    const feedbackBlock = feedback
      ? `\n\nIMPORTANT — Your previous code was reviewed by the Lead and REJECTED. You MUST fix ALL issues:\n${feedback}\n\nAddress every single point above. The Lead will review again and will reject if issues persist.`
      : "";

    const contractBlock = apiContract
      ? `\n\nBACKEND API CONTRACT — Use these EXACT endpoints in your API calls:\n${JSON.stringify(apiContract)}`
      : "";

    return {
      role: BotRole.FRONTEND_DEV,
      context: `Technology Stack:
${JSON.stringify(techStack)}

Lead Architecture Decisions:
${JSON.stringify(leadAssignment?.architectureDecisions)}

Shared Patterns:
${JSON.stringify(leadAssignment?.sharedPatterns)}

Technical Guidelines:
${JSON.stringify(leadAssignment?.techGuidelines)}

Your Module Assignment:
${JSON.stringify(module)}

Project Documentation:
${JSON.stringify(doc)}${contractBlock}${feedbackBlock}`,
      task: `You are a Senior Frontend Developer. Write COMPLETE, PRODUCTION-READY code for your assigned module: "${module?.name ?? "unknown"}"

Files you MUST create: ${JSON.stringify(module?.assignedFiles ?? [])}
Technical Approach: ${module?.approach ?? "Follow lead's guidelines"}

Module Requirements:
${module?.requirements?.map((r) => `- ${r}`).join("\n") ?? "See module assignment"}

ENGINEERING STANDARDS — treat these as non-negotiable:

1. **Complete Implementation**
   - Write EVERY function, handler, and utility fully. NEVER use placeholders, TODOs, comments like "// implement later", or stub functions.
   - Every component must render a complete, functional UI — not just a div with text.
   - Every form must have full validation, submission handling, and error display.
   - Every data-fetching component must have loading, error, and empty states.

2. **TypeScript Rigor**
   - Define explicit interfaces for ALL props, state, API responses, and function parameters
   - NEVER use \`any\` — use \`unknown\` with type guards if the type is truly dynamic
   - Use generic types for reusable components (e.g., \`DataTable<T>\`)
   - Use discriminated unions for state: \`{ status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: string }\`

3. **React Best Practices**
   - Use functional components with hooks exclusively
   - Extract reusable logic into custom hooks (useAuth, useForm, usePagination)
   - Implement ErrorBoundary wrappers for route-level error catching
   - Use React.lazy + Suspense for route-level code splitting when assigned
   - Use proper dependency arrays in useEffect — lint-clean, no missing deps

4. **UI/UX Completeness**
   - Every page must handle: loading (skeleton/spinner), error (retry button + message), empty (helpful empty state), and success states
   - Forms must show field-level validation errors, disable submit during loading, and show success feedback
   - Tables must support pagination, sorting indicators, and empty row states
   - Modals must trap focus, close on Escape, and have proper overlay click behavior
   - Navigation must show active states and breadcrumbs where appropriate

5. **Accessibility**
   - Use semantic HTML: <nav>, <main>, <section>, <article>, <button> (never div as button)
   - Add ARIA labels on icon-only buttons and interactive elements
   - Ensure proper heading hierarchy (one h1 per page, h2 for sections, etc.)
   - Ensure all interactive elements are keyboard-accessible (Tab, Enter, Escape)

6. **Responsive Design**
   - All layouts must work from 320px mobile to 1440px+ desktop
   - Use CSS Grid for page layouts, Flexbox for component internals
   - Use the project's breakpoint system consistently
   - Stack side-by-side elements vertically on mobile

7. **Styling**
   - Follow the lead's specified CSS approach (Tailwind, CSS Modules, styled-components)
   - Use the design system's spacing scale, color tokens, and typography scale consistently
   - Include hover states, focus states, and active states on all interactive elements
   - Add smooth transitions (150-300ms) on state changes

8. **API Integration**
   - Use the project's centralized API client — never raw fetch calls in components
   - Handle ALL HTTP error codes: 401 (redirect to login), 403 (permission denied), 404 (not found), 422 (validation), 500 (server error)
   - Implement optimistic updates where it improves UX (toggling likes, deleting items)`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Every file in assignedFiles MUST appear in your output — missing files means build failure",
        "ZERO placeholder code — every function body must be fully implemented with real logic",
        "Use STRICT TypeScript with explicit type annotations on every function, const, and interface. NEVER use 'any'.",
        "ALWAYS use stable versions of all UI framework dependencies — never beta, RC, or alpha packages",
        "Generate proper entry files (index.html, main.tsx, App.tsx) if they are part of your assignment — these are critical for the app to start",
        "Follow the lead's naming conventions, folder structure, and shared patterns EXACTLY",
        "Every component that fetches data must implement loading, error, and empty states",
        "All interactive elements must be keyboard-accessible with proper ARIA attributes",
        "Include ALL necessary imports — missing imports will cause build failures",
        "SELF-CHECK before submitting: (1) verify every import you use is from a real package or local file, (2) verify every TypeScript type annotation is correct, (3) verify every file in assignedFiles is included in your output, (4) verify no function body is empty or contains placeholder comments",
        "API CONTRACT CHECK: If a Backend API Contract is provided above, your fetch/API calls MUST use the EXACT paths, methods, and request/response shapes from that contract. Do NOT invent API endpoints.",
      ],
    };
  }
}
