import { z } from "zod";

/**
 * PR review schema — Lead bots review Dev bot code output.
 */
const FileReviewSchema = z.object({
  path: z.string(),
  status: z.enum(["approved", "needs-changes"]),
  comments: z.array(z.string()).describe("List of simple comments or issues"),
});

export const PRReviewSchema = z.object({
  approved: z.boolean().describe("true if code is ready to merge"),
  overallQuality: z.number().min(1).max(10).describe("Code quality score 1-10"),
  fileReviews: z.array(FileReviewSchema).optional().describe("Leave empty or undefined if no specific file edits are needed"),
  summary: z.string().describe("Overall review summary"),
  requiredChanges: z.array(z.string()).describe("List of changes needed before approval"),
  positives: z.array(z.string()).describe("Things done well"),
});

export type PRReview = z.infer<typeof PRReviewSchema>;

export const PR_REVIEW_SCHEMA_DESCRIPTION = `{
  approved: boolean (true if code is production-ready),
  overallQuality: number (1-10),
  fileReviews?: [{
    path: string,
    status: "approved" | "needs-changes",
    comments: string[]
  }],
  summary: string,
  requiredChanges: string[],
  positives: string[]
}`;
