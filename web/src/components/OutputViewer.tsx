import React, { useState, useEffect } from "react";

interface FileItem {
  path: string;
  content: string;
  language: string;
}

interface Props {
  output: any;
}

function extractFiles(output: any): FileItem[] {
  if (!output) return [];
  const files: FileItem[] = [];
  const codeKeys = [
    "frontendCode",
    "backendCode",
    "databaseCode",
    "qaCode",
    "devopsCode",
  ];

  for (const key of codeKeys) {
    const codeOutput = output[key];
    if (codeOutput?.files) {
      for (const f of codeOutput.files) {
        files.push({ path: f.path, content: f.content, language: f.language });
      }
    }
  }
  return files;
}

function getFileIcon(lang: string): string {
  const icons: Record<string, string> = {
    typescript: "📘",
    tsx: "⚛️",
    javascript: "📒",
    css: "🎨",
    json: "📋",
    prisma: "🗃️",
    yaml: "⚙️",
    yml: "⚙️",
    dockerfile: "🐳",
    markdown: "📝",
    sql: "💾",
    env: "🔐",
    html: "🌐",
  };
  return icons[lang] ?? "📄";
}

function getFileCategory(path: string): string {
  if (path.includes("test") || path.includes("spec")) return "Tests";
  if (path.includes("prisma") || path.includes("db") || path.includes("migration")) return "Database";
  if (path.includes("docker") || path.includes("ci") || path.includes("deploy") || path.includes("nginx")) return "DevOps";
  if (path.includes("component") || path.includes("page") || path.includes("App") || path.includes("main.tsx")) return "Frontend";
  if (path.includes("route") || path.includes("service") || path.includes("middleware") || path.includes("server")) return "Backend";
  return "Other";
}

export const OutputViewer: React.FC<Props> = ({ output }) => {
  const files = extractFiles(output);
  const [selected, setSelected] = useState<FileItem | null>(files[0] ?? null);
  const [searchQuery, setSearchQuery] = useState("");

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 text-sm">
        <span className="text-3xl mb-3">📦</span>
        <p>No generated files yet</p>
      </div>
    );
  }

  const review = output?.principalReview;
  const costBreakdown = output?.costBreakdown;

  const scoreColor =
    review?.overallQuality >= 7
      ? "text-neon-green border-neon-green/30"
      : review?.overallQuality >= 5
        ? "text-neon-orange border-neon-orange/30"
        : "text-neon-red border-neon-red/30";

  const scoreGlow =
    review?.overallQuality >= 7
      ? "shadow-neon-green/20"
      : review?.overallQuality >= 5
        ? "shadow-neon-orange/20"
        : "shadow-neon-red/20";

  const filteredFiles = searchQuery
    ? files.filter((f) => f.path.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const [paymentChecked, setPaymentChecked] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check payment status on mount
  useEffect(() => {
    if (!output?.projectId) return;
    fetch(`/api/projects/${output.projectId}/payment-status`)
      .then((r) => r.json())
      .then((data) => {
        setIsPaid(data.paid);
        setPaymentChecked(true);
      })
      .catch(() => setPaymentChecked(true));
  }, [output?.projectId]);

  const handleDownload = async () => {
    if (isPaid) {
      // Already paid — direct download
      const link = document.createElement("a");
      link.href = `/api/projects/${output.projectId}/download`;
      link.download = `${output.projectName ?? "cortex-project"}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Not paid — initiate Stripe checkout
    setCheckoutLoading(true);
    try {
      const res = await fetch(`/api/projects/${output.projectId}/download-checkout`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.alreadyPaid) {
        setIsPaid(true);
        setCheckoutLoading(false);
        // Auto-download now
        const link = document.createElement("a");
        link.href = `/api/projects/${output.projectId}/download`;
        link.download = `${output.projectName ?? "cortex-project"}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      if (data.status === "paid") {
        // Dev mode (no Stripe key) — auto-approve
        setIsPaid(true);
        setCheckoutLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-lg">📦</span> Generated Project
        </h3>
        <div className="flex gap-3 items-center">
          <span className="text-[11px] text-gray-500 font-mono">{files.length} files</span>
          <button
            onClick={handleDownload}
            disabled={checkoutLoading}
            className={`text-sm py-2 px-4 flex items-center gap-2 ${
              isPaid ? "btn-primary" : "btn-secondary border-neon-orange/30 text-neon-orange hover:bg-neon-orange/10"
            }`}
          >
            {checkoutLoading ? (
              <><span className="animate-spin">⏳</span> Processing...</>
            ) : isPaid ? (
              <><span>⬇</span> Download ZIP</>
            ) : (
              <><span>🔒</span> Buy & Download — ₹100</>
            )}
          </button>
        </div>
      </div>

      {/* Score + Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {review && (
          <div className="glass rounded-xl p-5 flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-2 shrink-0 shadow-lg ${scoreColor} ${scoreGlow}`}
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {review.overallQuality}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
                {review.approved ? (
                  <><span className="text-neon-green">✓</span> Approved by CTO</>
                ) : (
                  <><span className="text-neon-orange">⚠</span> Needs Improvements</>
                )}
              </h4>
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {review.summary}
              </p>
            </div>
          </div>
        )}

        {costBreakdown && (
          <div className="glass rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <span>💰</span> Cost Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="text-gray-400">Total Tokens</div>
              <div className="text-gray-200 font-mono tabular-nums">
                {costBreakdown.totalTokens?.toLocaleString()}
              </div>
              <div className="text-gray-400">Total Cost</div>
              <div className="text-neon-green font-mono font-bold tabular-nums">
                ${costBreakdown.totalCost?.toFixed(4)}
              </div>
              <div className="text-gray-400">Input Tokens</div>
              <div className="text-gray-300 font-mono tabular-nums">
                {costBreakdown.totalInputTokens?.toLocaleString()}
              </div>
              <div className="text-gray-400">Output Tokens</div>
              <div className="text-gray-300 font-mono tabular-nums">
                {costBreakdown.totalOutputTokens?.toLocaleString()}
              </div>
            </div>

            {costBreakdown.perBot?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-[10px] text-gray-500 mb-1.5 font-medium uppercase tracking-wider">Per Bot</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {costBreakdown.perBot.map((bot: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="text-gray-400 truncate">{bot.botName}</span>
                      <span className="text-gray-300 font-mono shrink-0 ml-2 tabular-nums">
                        ${bot.cost?.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Tree + Code Preview */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] glass rounded-xl overflow-hidden">
        {/* File Tree */}
        <div className="border-b md:border-b-0 md:border-r border-white/6">
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-accent/30 transition-colors"
            />
          </div>
          {/* File List */}
          <div className="max-h-56 md:max-h-[500px] overflow-y-auto py-1">
            {filteredFiles.map((f) => (
              <div
                key={f.path}
                onClick={() => setSelected(f)}
                className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono cursor-pointer transition-all duration-150
                  ${
                    selected?.path === f.path
                      ? "bg-accent/10 text-accent-light border-r-2 border-accent"
                      : "text-gray-400 hover:bg-white/3 hover:text-gray-200"
                  }`}
              >
                <span className="text-xs shrink-0">{getFileIcon(f.language)}</span>
                <span className="truncate">{f.path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Preview */}
        <div className="code-viewer max-h-[500px] overflow-auto p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <span className="text-[11px] font-mono text-accent-light flex items-center gap-1.5">
                  <span>{getFileIcon(selected.language)}</span>
                  {selected.path}
                </span>
                <span className="tag text-[9px] py-0.5 px-2">
                  {getFileCategory(selected.path)}
                </span>
              </div>
              <pre className="font-mono text-[12px] leading-6 text-gray-400">
                {selected.content.split("\n").map((line, i) => (
                  <div key={i} className="line flex hover:bg-white/2 rounded-sm">
                    <span className="line-number inline-block w-10 text-right mr-4 shrink-0 select-none tabular-nums text-[11px]">
                      {i + 1}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">{line}</span>
                  </div>
                ))}
              </pre>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm py-16">
              <span className="text-2xl mb-2">👈</span>
              <p>Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
