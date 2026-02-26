import { z } from "zod";

export const TechStackOutputSchema = z.object({
  frontend: z.array(z.string()).min(1).describe("Frontend technologies"),
  backend: z.array(z.string()).min(1).describe("Backend technologies"),
  infra: z.array(z.string()).min(1).describe("Infrastructure / cloud"),
  database: z.string().describe("Primary database"),
  authStrategy: z.string().describe("Authentication strategy"),
  scalingStrategy: z.string().describe("Scaling approach"),
  justification: z.object({
    frontend: z.string(),
    backend: z.string(),
    infra: z.string(),
    database: z.string(),
  }),
});

export type TechStackOutput = z.infer<typeof TechStackOutputSchema>;

export const TECH_STACK_SCHEMA_DESCRIPTION = `{
  frontend: string[] (e.g. ["Next.js", "TailwindCSS"]),
  backend: string[] (e.g. ["Node.js", "Express"]),
  infra: string[] (e.g. ["AWS", "Docker"]),
  database: string (e.g. "PostgreSQL"),
  authStrategy: string (e.g. "JWT with refresh tokens"),
  scalingStrategy: string (e.g. "Horizontal with load balancer"),
  justification: {
    frontend: string,
    backend: string,
    infra: string,
    database: string
  }
}`;
