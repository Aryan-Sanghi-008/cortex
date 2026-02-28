import React, { useState, useEffect } from "react";

interface Props {
  projectId: string;
}

interface CostData {
  totalFormatted: string;
  items: Array<{ label: string; amount: string }>;
  hosting: {
    monthly: string;
    yearly: string;
    breakdown: string[];
  };
}

export const DeployPanel: React.FC<Props> = ({ projectId }) => {
  const [platform, setPlatform] = useState<string>("vercel");
  const [cost, setCost] = useState<CostData | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/cost?platform=${platform}`)
      .then((r) => r.json())
      .then(setCost)
      .catch(() => {});
  }, [projectId, platform]);

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.url) {
        setDeployUrl(data.url);
      } else {
        setError(data.error ?? "Deployment failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handlePay = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError("Payment setup failed");
      }
    } catch {
      setError("Payment failed");
    }
  };

  const platforms = [
    {
      id: "vercel",
      name: "Vercel",
      icon: "▲",
      desc: "Best for frontend & serverless",
      badge: "Popular",
    },
    {
      id: "railway",
      name: "Railway",
      icon: "🚂",
      desc: "Full-stack with database",
      badge: "Full Stack",
    },
    {
      id: "render",
      name: "Render",
      icon: "⚡",
      desc: "Free tier available",
      badge: "Free Tier",
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-5">
        <span className="text-lg">🚀</span> Deploy Your Project
      </h3>

      {deployUrl ? (
        <div className="p-8 glass rounded-xl neon-border-green text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h4 className="text-lg font-bold text-neon-green mb-2">
            Deployed Successfully!
          </h4>
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light underline font-mono text-sm hover:text-white transition-colors"
          >
            {deployUrl}
          </a>
          <button
            onClick={() => window.open(deployUrl, "_blank")}
            className="mt-5 btn-primary text-sm py-2.5 px-6 mx-auto block"
          >
            Visit Site →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Platform Selection */}
          <div className="space-y-3">
            <div className="text-[11px] text-gray-500 mb-2 font-medium uppercase tracking-wider">Select Platform</div>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left group ${
                  platform === p.id
                    ? "border-accent/40 bg-accent/5 shadow-lg shadow-accent/10"
                    : "border-white/6 bg-white/2 hover:bg-white/4 hover:border-white/10"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                  platform === p.id ? 'bg-accent/15' : 'bg-white/5 group-hover:bg-white/8'
                }`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/80">{p.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      platform === p.id
                        ? 'bg-accent/20 text-accent-light'
                        : 'bg-white/5 text-gray-500'
                    }`}>
                      {p.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{p.desc}</div>
                </div>
                {platform === p.id && (
                  <span className="text-accent-light text-sm shrink-0">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div className="glass rounded-xl p-5 h-fit">
            <h4 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
              <span>💰</span> Cost Estimate
            </h4>

            {cost ? (
              <>
                <div className="space-y-2.5 mb-4">
                  {cost.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span
                        className={`font-medium ${
                          item.amount === "Free"
                            ? "badge-success px-2 py-0.5 rounded-full text-[11px]"
                            : "text-gray-200 font-mono tabular-nums"
                        }`}
                      >
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="divider-glow mb-4" />

                <div className="flex justify-between text-base font-bold mb-4">
                  <span className="text-white/80">Total (one-time)</span>
                  <span className="text-neon-green font-mono tabular-nums">
                    {cost.totalFormatted}
                  </span>
                </div>

                <div className="glass rounded-lg p-3 text-[11px] text-gray-500 mb-5">
                  <div className="font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <span className="text-xs">📊</span> Monthly hosting: <span className="text-gray-300">{cost.hosting.monthly}</span>
                  </div>
                  {cost.hosting.breakdown.map((line, i) => (
                    <div key={i} className="text-[10px] leading-relaxed">• {line}</div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    {deploying ? (
                      <><span className="animate-spin">⏳</span> Deploying...</>
                    ) : (
                      <><span>🚀</span> Deploy Now</>
                    )}
                  </button>
                  <button
                    onClick={handlePay}
                    className="btn-secondary text-sm py-2.5 px-4 flex items-center gap-2"
                  >
                    <span>💳</span> Pay & Deploy
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                <span className="text-xl mb-2 animate-pulse">⏳</span>
                Loading cost estimate...
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 bg-neon-red/5 border border-neon-red/15 rounded-lg text-neon-red text-[11px] flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
