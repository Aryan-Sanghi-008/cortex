import { z } from "zod";

/**
 * Lead bot → Dev bot task assignment schema.
 * Leads break the work into modules and assign them to dev bots.
 */
const ModuleAssignmentSchema = z.object({
  name: z.string().describe("Module name, e.g. Authentication Module"),
  description: z.string().describe("What this module does"),
  assignedFiles: z
    .array(z.string())
    .min(1)
    .describe("File paths the dev should create"),
  approach: z
    .string()
    .describe("Technical approach and implementation guidance"),
  requirements: z
    .array(z.string())
    .min(1)
    .describe("Specific requirements for this module"),
  priority: z.enum(["high", "medium", "low"]),
});

export const LeadAssignmentSchema = z.object({
  architectureDecisions: z.array(z.string()).min(1).describe("Key architecture decisions made"),
  folderStructure: z.array(z.string()).min(1).describe("Project folder structure lines"),
  modules: z.array(ModuleAssignmentSchema).min(1).describe("Module assignments for dev bots"),
  sharedPatterns: z.object({
    namingConvention: z.string(),
    codeStyle: z.string(),
    errorHandling: z.string(),
  }),
  techGuidelines: z.array(z.string()).min(1).describe("Technical guidelines devs must follow"),
});

export type LeadAssignment = z.infer<typeof LeadAssignmentSchema>;

export const LEAD_ASSIGNMENT_SCHEMA_DESCRIPTION = `{
  architectureDecisions: string[] (key decisions made by the lead),
  folderStructure: string[] (directory tree lines),
  modules: [{
    name: string,
    description: string,
    assignedFiles: string[] (file paths to create),
    approach: string (implementation guidance),
    requirements: string[],
    priority: "high" | "medium" | "low"
  }],
  sharedPatterns: {
    namingConvention: string,
    codeStyle: string,
    errorHandling: string
  },
  techGuidelines: string[]
}`;
