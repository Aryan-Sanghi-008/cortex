import { z } from "zod";

/**
 * Universal code file output schema.
 * Every dev bot outputs files in this format.
 *
 * `language` is optional — defaults to "unknown" so LLMs that omit it
 * still pass validation. The project assembler doesn't rely on it.
 */
export const CodeFileSchema = z.object({
  path: z.string().describe("Relative path from project root, e.g. src/pages/Dashboard.tsx"),
  content: z.string().describe("Full file content"),
  language: z.string().default("unknown").describe("Language identifier, e.g. typescript, css, json, prisma"),
});

export const CodeOutputSchema = z.object({
  files: z.array(CodeFileSchema).min(1).describe("Generated code files"),
  dependencies: z.array(z.string()).default([]).describe("npm packages to install"),
  devDependencies: z.array(z.string()).default([]).describe("npm dev packages to install"),
});

export type CodeFile = z.infer<typeof CodeFileSchema>;
export type CodeOutput = z.infer<typeof CodeOutputSchema>;

export const CODE_OUTPUT_SCHEMA_DESCRIPTION = `{
  files: [{
    path: string (relative path, e.g. "src/pages/Login.tsx"),
    content: string (full file source code),
    language: string (e.g. "typescript", "css", "json") — optional
  }],
  dependencies: string[] (npm packages, e.g. ["react", "next"]) — optional,
  devDependencies: string[] (dev packages, e.g. ["vitest", "@types/react"]) — optional
}`;
