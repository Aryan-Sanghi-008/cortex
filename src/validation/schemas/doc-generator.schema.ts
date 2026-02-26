import { z } from "zod";

/**
 * Documentation Generator Bot output.
 * Converts raw user prompt + images into a structured spec for all bots.
 */
export const DocGeneratorOutputSchema = z.object({
  projectName: z.string().describe("Suggested project name"),
  projectType: z.enum(["web-app", "api", "fullstack", "landing-page", "dashboard"]),
  summary: z.string().describe("1-2 paragraph project summary"),
  features: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        priority: z.enum(["must-have", "should-have", "nice-to-have"]),
        category: z.enum(["frontend", "backend", "fullstack", "infrastructure"]),
      })
    )
    .min(1),
  uiReferences: z
    .array(
      z.object({
        description: z.string().describe("What the image shows"),
        designNotes: z.string().describe("Key design elements to implement"),
      })
    )
    .describe("Descriptions extracted from reference images"),
  pages: z
    .array(
      z.object({
        name: z.string(),
        route: z.string(),
        description: z.string(),
        isProtected: z.boolean(),
      })
    )
    .min(1)
    .describe("Pages/screens the app needs"),
  dataEntities: z
    .array(
      z.object({
        name: z.string(),
        fields: z.array(z.string()),
        relationships: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .describe("Core data models"),
  technicalHints: z.array(z.string()).describe("Tech preferences from user input"),
  targetAudience: z.string(),
  constraints: z.array(z.string()),
});

export type DocGeneratorOutput = z.infer<typeof DocGeneratorOutputSchema>;

export const DOC_GENERATOR_SCHEMA_DESCRIPTION = `{
  projectName: string,
  projectType: "web-app" | "api" | "fullstack" | "landing-page" | "dashboard",
  summary: string (1-2 paragraph project summary),
  features: [{
    name: string,
    description: string,
    priority: "must-have" | "should-have" | "nice-to-have",
    category: "frontend" | "backend" | "fullstack" | "infrastructure"
  }],
  uiReferences: [{
    description: string (what the reference image shows),
    designNotes: string (key design elements to replicate)
  }],
  pages: [{
    name: string,
    route: string,
    description: string,
    isProtected: boolean
  }],
  dataEntities: [{
    name: string,
    fields: string[],
    relationships?: string[]
  }],
  technicalHints: string[],
  targetAudience: string,
  constraints: string[]
}`;
