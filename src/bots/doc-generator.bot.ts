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
      task: `You are a Documentation Generator. Your job is to convert this raw product idea into a comprehensive, structured technical specification that other engineering bots can consume.

Analyze the prompt carefully and extract:
1. A clear project name and type (web-app, api, fullstack, etc.)
2. A detailed summary of what the product does
3. All features with correct priority and category assignment
4. If reference images were described, extract UI design notes from them
5. All pages/screens the app needs with routes and auth requirements
6. Core data entities with their fields and relationships
7. Any technical hints or preferences mentioned by the user
8. Target audience and constraints

Be thorough — this document drives ALL downstream engineering work.`,
      schemaDescription: DOC_GENERATOR_SCHEMA_DESCRIPTION,
      constraints: [
        "Extract features comprehensively — don't miss implied features",
        "Data entities must capture the core domain model",
        "Pages must include auth flows (login, signup, etc.)",
        "Be specific about each feature's category (frontend/backend/fullstack)",
      ],
    };
  }
}
