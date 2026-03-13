import { BaseBot } from "../base.bot.js";
import { BotRole } from "../types.js";
import { LLMProvider } from "../../llm/types.js";
import { ShortTermMemory } from "../../memory/short-term.memory.js";
import { PromptParts } from "../../utils/prompt-builder.js";
import { formatTechStack, formatProductSpec, formatLeadAssignment } from "../../utils/context-compressor.js";
import {
  CodeOutput,
  CodeOutputSchema,
  CODE_OUTPUT_SCHEMA_DESCRIPTION,
} from "../../validation/index.js";

export class QADevBot extends BaseBot<CodeOutput> {
  readonly role = BotRole.QA_DEV;
  protected override maxTokens = 65536;
  private moduleIndex: number;

  constructor(llm: LLMProvider, moduleIndex: number = 0, maxRetries?: number) {
    super(llm, CodeOutputSchema, `QA-Dev-${moduleIndex + 1}`, maxRetries);
    this.moduleIndex = moduleIndex;
  }

  protected buildPromptParts(memory: ShortTermMemory): PromptParts {
    const doc = memory.get("documentation");
    const techStack = memory.get("tech-stack");
    const qaLeadOutput = memory.get("qa-lead");
    // Use code summaries instead of full source — saves 10-50K+ input tokens
    const frontendCodeSummary = memory.get<string>("frontend-code-summary");
    const backendCodeSummary = memory.get<string>("backend-code-summary");

    return {
      role: BotRole.QA_DEV,
      context: `${formatTechStack(techStack)}

QA Lead Test Architecture & Module Assignments:
${formatLeadAssignment(qaLeadOutput)}

${formatProductSpec(doc)}

## Frontend Codebase Structure:
${frontendCodeSummary ?? "No frontend code summary available"}

## Backend Codebase Structure:
${backendCodeSummary ?? "No backend code summary available"}`,
      task: `You are a Senior QA Developer. Write COMPREHENSIVE, RUNNABLE test files based on the QA Lead's architecture and the actual generated application code.

Your tests must be thorough enough that if they all pass, you would confidently deploy to production.

TESTING STANDARDS — follow these rigorously:

1. **Test Structure**
   - Use describe blocks to group related tests by feature/function
   - Use nested describe blocks for different scenarios: describe('POST /api/users') → describe('with valid input') / describe('with invalid input')
   - Test names must be descriptive: "should return 401 when Authorization header is missing" — NOT "test auth"
   - Follow Arrange-Act-Assert pattern in every test
   - Use beforeEach/afterEach for setup/teardown, never rely on test execution order

2. **Backend API Tests (supertest)**
   For each API endpoint, write tests that cover:
   - ✅ **Success case**: Valid input → correct status code (200/201/204), correct response shape, correct data in response
   - ❌ **Missing required fields**: Omit each required field one at a time → 422 with field-level error
   - ❌ **Invalid field types**: Wrong type for each field (string where number expected) → 422
   - ❌ **Boundary values**: Empty strings, 0, negative numbers, very long strings (1000+ chars), special characters, SQL injection attempts
   - 🔒 **No auth token**: Missing Authorization header → 401
   - 🔒 **Expired token**: Token with past expiry → 401 with specific error code
   - 🔒 **Wrong role**: Valid token but insufficient permissions → 403
   - 🔍 **Not found**: Valid request for non-existent resource → 404
   - ⚠️ **Conflict**: Duplicate unique field (e.g., existing email) → 409
   - 📄 **Pagination**: Verify page, pageSize, total, hasMore in list responses
   - 🔄 **Idempotency**: DELETE same resource twice → first 204, second 404

3. **Frontend Component Tests (@testing-library/react)**
   For each major component, write tests that cover:
   - **Initial render**: Component mounts without crashing, shows expected default content
   - **Loading state**: Shows skeleton/spinner while data is loading (mock slow API response)
   - **Error state**: Shows error message when API call fails, renders retry button
   - **Empty state**: Shows empty message when API returns empty array
   - **User interactions**: Click buttons, fill forms, submit, navigate — verify side effects
   - **Form validation**: Submit with empty required fields → shows validation errors
   - **Form submission**: Fill all fields correctly → calls API with correct payload → shows success
   - **Conditional rendering**: Different content based on user role, permissions, or data state
   - **Accessibility**: Key interactive elements are accessible via getByRole

4. **Test Setup Files**
   - vitest.config.ts: proper test environment, path aliases, coverage configuration
   - Test utilities: custom render with providers, mock token generators, data factories
   - Mock implementations: msw handlers for frontend API mocking, Prisma mock for backend unit tests
   - Fixtures: createMockUser(), createMockOrder(), etc. — generate realistic test data

5. **Mocking Best Practices**
   - Use vi.mock() for module-level mocking, vi.fn() for individual function mocks
   - Frontend: Use msw to intercept fetch/axios calls — DON'T mock the fetch function directly
   - Backend: Mock PrismaClient methods for unit tests using vi.mock()
   - ALWAYS verify mock call arguments: expect(mockFn).toHaveBeenCalledWith(expectedArgs)
   - Reset mocks in beforeEach to prevent test pollution
   - For auth tests: create helper functions that generate valid JWT tokens for different user roles

6. **Assertion Quality**
   - Be SPECIFIC: expect(response.body.data.email).toBe('user@example.com') — not just expect(response.body).toBeDefined()
   - Check array lengths: expect(response.body.items).toHaveLength(3)
   - Check object shapes: expect(response.body).toMatchObject({ id: expect.any(String), email: 'test@example.com' })
   - Check error messages: expect(response.body.error.message).toContain('required')
   - Check status codes: expect(response.status).toBe(422) — not just expect(response.ok).toBeFalsy()

CRITICAL: Every test file must be COMPLETE and RUNNABLE. No skipped tests, no placeholder assertions, no TODOs. Import all dependencies correctly using the actual project paths.`,
      schemaDescription: CODE_OUTPUT_SCHEMA_DESCRIPTION,
      constraints: [
        "Include strict TypeScript typings in ALL test files — typed mock factories, typed assertions",
        "Mock database calls and external APIs comprehensively — use vi.mock() and msw",
        "No placeholder tests — every test must have REAL assertions that validate specific behavior",
        "Use STABLE versions of test runners and libraries: Vitest, @testing-library/react, supertest",
        "Every API test must cover: success, validation error, auth error, not-found error at minimum",
        "Every component test must cover: render, interaction, loading, error, and empty states",
        "Test names must be descriptive and follow the pattern: 'should [expected behavior] when [condition]'",
        "Reset mocks in beforeEach/afterEach — no test should depend on another test's state",
        "Include setup files: vitest.config.ts, test helpers, mock factories, and custom render utilities",
        "Import paths must match the actual project structure — verify against the generated code",
      ],
    };
  }
}
