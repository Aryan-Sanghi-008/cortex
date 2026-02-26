import { z } from "zod";

export const ResourcePlanOutputSchema = z.object({
  frontendBots: z.number().int().min(1),
  backendBots: z.number().int().min(1),
  qaBots: z.number().int().min(1),
  leaderBots: z.number().int().min(1),
  devopsBots: z.number().int().min(1),
  reasoning: z.object({
    complexityAssessment: z.string(),
    scalingJustification: z.string(),
  }),
});

export type ResourcePlanOutput = z.infer<typeof ResourcePlanOutputSchema>;

export const RESOURCE_PLAN_SCHEMA_DESCRIPTION = `{
  frontendBots: number (>= 1),
  backendBots: number (>= 1),
  qaBots: number (>= 1),
  leaderBots: number (>= 1),
  devopsBots: number (>= 1),
  reasoning: {
    complexityAssessment: string,
    scalingJustification: string
  }
}`;
