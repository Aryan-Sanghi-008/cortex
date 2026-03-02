import { BaseBot } from "../base.bot.js";
import { BotRole } from "../types.js";
import { LLMProvider } from "../../llm/types.js";
import { ShortTermMemory } from "../../memory/short-term.memory.js";
import { PromptParts } from "../../utils/prompt-builder.js";
import {
  LeadAssignment,
  LeadAssignmentSchema,
  LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
} from "../../validation/index.js";

export class FrontendLeadBot extends BaseBot<LeadAssignment> {
  readonly role = BotRole.FRONTEND_LEAD;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, LeadAssignmentSchema, "Frontend-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const productSpec = memory.get("product-owner");

    return {
      role: BotRole.FRONTEND_LEAD,
      context: `Project Documentation:
${JSON.stringify(doc)}

Product Spec:
${JSON.stringify(productSpec)}

Technology Stack:
${JSON.stringify(techStack)}`,
      task: `You are the Frontend Lead — the most senior frontend engineer on this project. Design the complete frontend architecture and assign development work to your team with the precision of a Staff engineer leading a launch.

Your deliverables:

1. **Architecture Decisions**
   - Choose the exact project structure following the selected framework's conventions:
     • For Vite + React: src/components/, src/pages/, src/hooks/, src/lib/, src/types/, src/assets/
     • For Next.js App Router: app/(auth)/, app/(dashboard)/, components/, lib/, types/
   - Define the state management architecture:
     • Server state: TanStack Query or SWR for API data fetching, caching, and invalidation
     • UI state: React useState/useReducer for component-local state, Zustand only if true global state is needed
     • Form state: React Hook Form with Zod validation
     • URL state: Search params for filterable/shareable views
   - Design the routing architecture:
     • Define ALL routes with exact paths, including dynamic segments (/users/:id)
     • Specify which routes are public, authenticated, and admin-only
     • Plan route guards/middleware for authentication checks
     • Include 404 catch-all and error boundary routes
   - Define the API client architecture:
     • Centralized fetch wrapper or Axios instance with base URL configuration
     • Request interceptors for auth token injection
     • Response interceptors for 401 handling (redirect to login) and error normalization
     • Typed request/response interfaces for every endpoint

2. **Design System Foundation**
   - Define the spacing scale (4px grid: 4, 8, 12, 16, 24, 32, 48, 64)
   - Define the color system: primary, secondary, success, warning, error, neutral (with shade scales)
   - Define the typography scale: heading sizes (h1-h6), body sizes, caption, overline
   - Define responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Define component patterns: how buttons, inputs, cards, modals, and tables are structured

3. **Module Breakdown**
   - Break the work into clear, independently-implementable modules. Each module should:
     • Have a clear scope (e.g., "Auth Pages Module" covers login, signup, forgot-password, and auth guard)
     • List EVERY file the dev bot must create, with exact paths. CRITICALLY include:
       - Project entry files: \`index.html\`, \`src/main.tsx\`, \`src/App.tsx\` (for Vite/React)
       - App shell: Layout component, Navbar, Sidebar, Footer
       - Each page component with its route
       - Shared components used across pages
       - Custom hooks for shared logic
       - Type definitions
     • Specify the technical approach: which libraries to use, which patterns to follow
     • List explicit requirements the dev must satisfy
   - Ensure EVERY page from the documentation is assigned to a module
   - Ensure there is a "Project Setup & Shell" module that includes entry files and the app shell

4. **Technical Guidelines**
   - Naming conventions: PascalCase for components, camelCase for hooks (useXxx), kebab-case for CSS
   - File structure: one component per file, co-located styles, index.ts barrel exports
   - TypeScript strictness: explicit prop types, no \`any\`, use satisfies operator, discriminated unions for state
   - Performance patterns: React.lazy for route-level code splitting, useMemo for expensive computations only
   - Error handling: ErrorBoundary on each route, try/catch on async operations, toast notifications for errors
   - Accessibility: semantic HTML, ARIA labels, focus management, keyboard navigation

Think like a senior lead assigning work to mid-level developers — your assignments should be so detailed that NO clarifying questions are needed.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "File paths must match the folder structure you define. ALWAYS include entry points: src/main.tsx (or app/layout.tsx for Next.js), src/App.tsx",
        "Every page from the documentation must be assigned to exactly one module — no page is left unassigned",
        "Include auth-related pages (login, signup, forgot-password) and protected route guards in a dedicated module",
        "Include a 'Project Setup & Shell' module that creates index.html, main.tsx, App.tsx, layout, navbar, and global styles",
        "Include a shared components module for reusable elements (Button, Input, Modal, DataTable, etc.)",
        "State management setup (API client, auth context, global store) must be a dedicated module",
        "Explicitly FORBID the use of beta/rc/alpha versions of ANY frontend library",
        "Every module must specify error handling, loading state, and empty state requirements",
        "Define shared patterns for consistent form handling, data fetching, and error display across all modules",
        "MUST populate apiContract with EVERY API endpoint the frontend expects to call — include method, path, request body shape, response shape, and auth level. This will be cross-checked against the backend's API contract to catch mismatches early.",
        "CRITICAL: Be CONCISE in all descriptions and approaches. Keep JSON payload size below 20KB to avoid API truncation. Do NOT write paragraphs when a single sentence works.",
      ],
    };
  }
}
