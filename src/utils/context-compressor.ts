/**
 * Context Compressor — reduces token usage by summarizing large bot outputs
 * before passing them to downstream bots.
 *
 * Strategy: Hierarchical summarization
 * - Full output stored in memory as-is
 * - Compressed summary generated for downstream consumption
 * - Only Principal bot / deep tasks get full context
 */

const MAX_CONTEXT_CHARS = 2000; // ~500 tokens

/**
 * Compress a large JSON object into a concise text summary.
 * This is a heuristic compressor — no LLM call needed.
 */
export function compressContext(data: unknown, maxChars = MAX_CONTEXT_CHARS): string {
  const json = JSON.stringify(data);

  // If already small, return as-is
  if (json.length <= maxChars) return json;

  // Try compact JSON first
  const compact = JSON.stringify(data);
  if (compact.length <= maxChars) return compact;

  // Deep compress: extract key fields only
  if (typeof data === "object" && data !== null) {
    const summary = extractKeySummary(data as Record<string, unknown>);
    const summaryJson = JSON.stringify(summary);
    if (summaryJson.length <= maxChars) return summaryJson;

    // Last resort: truncate with marker
    return summaryJson.slice(0, maxChars - 50) + "\n... [truncated]";
  }

  return compact.slice(0, maxChars - 50) + "... [truncated]";
}

/**
 * Extract the most important fields from a nested object.
 */
function extractKeySummary(obj: Record<string, unknown>, depth = 0): unknown {
  if (depth > 2) return "[nested]";

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // For arrays, take first 3 items and count
      if (value.length <= 3) {
        result[key] = value.map((v) =>
          typeof v === "object" && v !== null
            ? extractKeySummary(v as Record<string, unknown>, depth + 1)
            : v
        );
      } else {
        result[key] = [
          ...value.slice(0, 2).map((v) =>
            typeof v === "object" && v !== null
              ? extractKeySummary(v as Record<string, unknown>, depth + 1)
              : v
          ),
          `... +${value.length - 2} more`,
        ];
      }
    } else if (typeof value === "object") {
      result[key] = extractKeySummary(value as Record<string, unknown>, depth + 1);
    } else if (typeof value === "string" && value.length > 200) {
      result[key] = value.slice(0, 200) + "...";
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Compress code output: keep file paths and languages, truncate content.
 */
export function compressCodeOutput(codeOutput: {
  files: Array<{ path: string; content: string; language: string }>;
  dependencies: string[];
  devDependencies: string[];
}): string {
  const summary = {
    fileCount: codeOutput.files.length,
    files: codeOutput.files.map((f) => ({
      path: f.path,
      language: f.language,
      lines: f.content.split("\n").length,
    })),
    dependencies: codeOutput.dependencies,
    devDependencies: codeOutput.devDependencies,
  };
  return JSON.stringify(summary);
}

/**
 * Dense Markdown formatters to compress context payloads and save input tokens.
 * JSON has massive token overhead ({}, [], ", etc). These formatters convert that
 * exact same logic into clean bullets.
 */

// Formats the ProductOwnerOutput (Specs & User Stories)
export function formatProductSpec(data: any): string {
  if (!data) return "";
  let out = "## Product Specification\n";
  if (data.epics?.length) {
    out += "\n### Epics\n" + data.epics.map((e: any) => `- **${e.name}**: ${e.description}`).join("\n");
  }
  if (data.userStories?.length) {
    out += "\n\n### User Stories\n" + data.userStories.map((us: any) => 
      `- [${us.id}] (${us.priority}) As a ${us.asA}, I want ${us.iWant}, so that ${us.soThat}\n  - AC: ${us.acceptanceCriteria?.join("; ")}`
    ).join("\n");
  }
  if (data.constraints?.length) out += "\n\n### Constraints\n" + data.constraints.map((c: string) => `- ${c}`).join("\n");
  if (data.assumptions?.length) out += "\n\n### Assumptions\n" + data.assumptions.map((a: string) => `- ${a}`).join("\n");
  return out;
}

// Formats the TechStackOutput
export function formatTechStack(data: any): string {
  if (!data) return "";
  let out = "## Technology Stack\n";
  if (data.frontend?.length) out += `- Frontend: ${data.frontend.join(", ")}\n`;
  if (data.backend?.length) out += `- Backend: ${data.backend.join(", ")}\n`;
  if (data.database) out += `- Database: ${data.database}\n`;
  if (data.infra?.length) out += `- Infrastructure: ${data.infra.join(", ")}\n`;
  if (data.authStrategy) out += `- Auth Strategy: ${data.authStrategy}\n`;
  if (data.scalingStrategy) out += `- Scaling Strategy: ${data.scalingStrategy}\n`;
  return out;
}

// Formats LeadAssignment module structure
export function formatLeadAssignment(data: any): string {
  if (!data) return "";
  let out = "## Architecture Decisions\n";
  if (data.architectureDecisions?.length) out += data.architectureDecisions.map((d: string, i: number) => `${i+1}. ${d}`).join("\n");
  
  out += "\n\n## Shared Patterns\n";
  if (data.sharedPatterns) {
    out += `- Naming: ${data.sharedPatterns.namingConvention}\n`;
    out += `- Style: ${data.sharedPatterns.codeStyle}\n`;
    out += `- Errors: ${data.sharedPatterns.errorHandling}\n`;
  }

  out += "\n\n## Technical Guidelines\n";
  if (data.techGuidelines?.length) out += data.techGuidelines.map((g: string) => `- ${g}`).join("\n");

  if (data.apiContract?.length) {
    out += "\n\n## API Contract\n";
    out += formatApiContract(data.apiContract);
  }
  return out;
}

// Formats the standalone API contract array
export function formatApiContract(contract: any[]): string {
  if (!contract || !contract.length) return "";
  return contract.map((api: any) => 
    `- ${api.method} ${api.path} (Auth: ${api.auth})\n  - Req: ${api.requestBody || "none"}\n  - Res: ${api.responseShape}\n  - Desc: ${api.description}`
  ).join("\n");
}
