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
      task: `Analyze this product idea and produce a comprehensive product specification.

Include:
1. Identify the major epics (feature groups)
2. Break each epic into detailed user stories with acceptance criteria
3. List technical and business constraints
4. State any assumptions you're making

Be thorough — this specification will drive all architecture and engineering decisions.`,
      schemaDescription: PRODUCT_OWNER_SCHEMA_DESCRIPTION,
      constraints: [
        "Each user story must have a unique ID (US-001, US-002, etc.)",
        "Each user story must reference a valid epic name",
        "Priority distribution should be realistic (not everything is high priority)",
        "Generate at least 3 epics and 10 user stories",
      ],
    };
  }
}
