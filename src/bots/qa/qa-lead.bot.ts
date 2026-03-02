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

export class QALeadBot extends BaseBot<LeadAssignment> {
  readonly role = BotRole.QA;

  constructor(llm: LLMProvider, maxRetries?: number) {
    super(llm, LeadAssignmentSchema, "QA-Lead", maxRetries);
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const frontendCode = memory.get("frontend-code");
    const backendCode = memory.get("backend-code");

    return {
      role: BotRole.QA,
      context: `Project Documentation:
${JSON.stringify(doc)}

Technology Stack:
${JSON.stringify(techStack)}

Frontend Code Generated:
${JSON.stringify(frontendCode)}

Backend Code Generated:
${JSON.stringify(backendCode)}`,
      task: `You are the QA Lead — a senior QA architect responsible for designing a comprehensive test strategy that ensures this application is production-ready. Think like a QA Lead at Stripe who would be fired if a bug reaches production.

Design the complete testing architecture:

1. **Test Folder Structure**
   \`\`\`
   tests/
   ├── unit/
   │   ├── services/          # Business logic unit tests
   │   ├── utils/             # Utility function tests
   │   └── components/        # React component tests
   ├── integration/
   │   ├── api/               # API endpoint integration tests
   │   └── flows/             # Multi-step flow tests
   ├── e2e/                   # End-to-end scenarios (optional)
   ├── helpers/
   │   ├── setup.ts           # Global test setup
   │   ├── fixtures.ts        # Test data factories
   │   ├── mocks.ts           # Shared mock implementations
   │   └── test-utils.tsx     # Custom render with providers
   └── vitest.config.ts       # Test runner configuration
   \`\`\`

2. **Backend API Test Strategy**
   For EVERY API endpoint, plan tests that cover:
   - **Happy path**: Valid input → correct response shape, status code, and data
   - **Validation errors**: Missing required fields, invalid types, boundary values (empty string, max length, negative numbers)
   - **Authentication errors**: No token (401), expired token (401), invalid token (401)
   - **Authorization errors**: Valid token but wrong role (403)
   - **Not found errors**: Valid request but resource doesn't exist (404)
   - **Conflict errors**: Duplicate unique fields like email (409)
   - **Business rule violations**: Domain-specific errors (e.g., trying to delete an active subscription)
   Use supertest for HTTP testing against the Express app instance

3. **Frontend Component Test Strategy**
   For EVERY major component, plan tests that cover:
   - **Rendering**: Component renders correctly in default state
   - **User interactions**: Button clicks, form submissions, navigation, modal open/close
   - **Data states**: Loading state (shows skeleton/spinner), error state (shows error message with retry), empty state (shows empty message)
   - **Form validation**: Required fields, invalid input, successful submission, server error on submit
   - **Conditional rendering**: Different content based on user role, feature flags, or data state
   Use @testing-library/react with userEvent for realistic interactions

4. **Test Setup & Configuration**
   - vitest.config.ts with TypeScript support, coverage thresholds, and test environment setup
   - Global setup: database seeding for integration tests, auth token generation helpers
   - Custom render function with providers (QueryClientProvider, AuthProvider, etc.)
   - Mock factories for generating test data: createMockUser(), createMockOrder(), etc.
   - Shared mock implementations for external dependencies (API clients, file upload, etc.)

5. **Coverage Targets**
   - Business logic (services): minimum 80% line coverage
   - Auth/payment code: minimum 90% line coverage
   - API routes: minimum 75% line coverage
   - React components: minimum 60% line coverage
   - Utilities: minimum 90% line coverage

6. **Mocking Strategy**
   - Backend tests: Mock database for unit tests, use real test database for integration tests
   - Frontend tests: Use msw (Mock Service Worker) to intercept API calls
   - External services: Always mock (payment processors, email services, file storage)
   - Authentication: Create helper to generate valid JWT tokens for test users with different roles

Break this into clear modules that QA developers can implement independently. Each module should have exact file paths, specific test cases to write, and the exact mocking approach.`,
      schemaDescription: LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION,
      constraints: [
        "Test architecture MUST use Vitest as the test runner — it's fast, TypeScript-native, and Jest-compatible",
        "Frontend testing MUST use @testing-library/react — test behavior, not implementation details",
        "Backend testing MUST use supertest for HTTP-level testing against the Express app",
        "MUST include a test setup module with vitest.config.ts, global setup, mock factories, and custom render",
        "MUST include comprehensive mocking strategy: msw for frontend API mocks, Prisma mock for backend unit tests",
        "Each test module must specify EXACT test file paths and the specific test cases to implement",
        "Explicitly FORBID the use of beta/rc versions of any testing library",
        "Include auth test helpers: generate tokens for users with different roles (admin, user, guest)",
        "Every API endpoint must have tests for: happy path, validation errors, auth errors, not-found errors",
        "Every React component test must cover: rendering, interactions, loading state, error state, empty state",
      ],
    };
  }
}
