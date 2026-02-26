import { z } from "zod";

// ─── Product Owner Output ─────────────────────────────────────
const UserStorySchema = z.object({
  id: z.string().describe("Unique story ID, e.g. US-001"),
  epic: z.string().describe("Parent epic name"),
  title: z.string().describe("Story title"),
  asA: z.string().describe("User role"),
  iWant: z.string().describe("Desired action"),
  soThat: z.string().describe("Business value"),
  acceptanceCriteria: z
    .array(z.string())
    .min(1)
    .describe("List of acceptance criteria"),
  priority: z.enum(["high", "medium", "low"]),
});

export const ProductOwnerOutputSchema = z.object({
  epics: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      })
    )
    .min(1),
  userStories: z.array(UserStorySchema).min(1),
  constraints: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1),
});

export type ProductOwnerOutput = z.infer<typeof ProductOwnerOutputSchema>;

export const PRODUCT_OWNER_SCHEMA_DESCRIPTION = `{
  epics: [{ name: string, description: string }],
  userStories: [{
    id: string (e.g. "US-001"),
    epic: string (parent epic name),
    title: string,
    asA: string (user role),
    iWant: string (desired action),
    soThat: string (business value),
    acceptanceCriteria: string[] (min 1),
    priority: "high" | "medium" | "low"
  }],
  constraints: string[],
  assumptions: string[]
}`;
