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

  // Fetch cost when platform changes
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
      desc: "Best for frontend + serverless",
    },
    {
      id: "railway",
      name: "Railway",
      icon: "🚂",
      desc: "Full-stack + database",
    },
    { id: "render", name: "Render", icon: "⚡", desc: "Free tier available" },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">🚀 Deploy Your Project</h3>

      {deployUrl ? (
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h4 className="text-lg font-bold text-green-400 mb-2">
            Deployed Successfully!
          </h4>
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light underline font-mono text-sm"
          >
            {deployUrl}
          </a>
          <button
            onClick={() => window.open(deployUrl, "_blank")}
            className="mt-4 block mx-auto px-6 py-2.5 bg-green-500 rounded-lg text-white font-semibold text-sm"
          >
            Visit Site →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Platform Selection */}
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">Select Platform</div>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  platform === p.id
                    ? "border-accent bg-accent/5"
                    : "border-white/8 bg-white/2 hover:bg-white/4"
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.desc}</div>
                </div>
                {platform === p.id && (
                  <span className="ml-auto text-accent text-sm">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h4 className="text-sm font-semibold mb-4">💰 Cost Breakdown</h4>

            {cost ? (
              <>
                <div className="space-y-2.5 mb-4">
                  {cost.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span
                        className={
                          item.amount === "Free"
                            ? "text-green-400"
                            : "text-gray-200"
                        }
                      >
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/8 pt-3 mb-4">
                  <div className="flex justify-between text-base font-bold">
                    <span>Total (one-time)</span>
                    <span className="text-green-400">
                      {cost.totalFormatted}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  <div className="font-medium text-gray-400 mb-1">
                    Monthly hosting: {cost.hosting.monthly}
                  </div>
                  {cost.hosting.breakdown.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="flex-1 px-4 py-3 bg-linear-to-r from-accent to-purple-600 rounded-lg text-white font-semibold text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  >
                    {deploying ? "⏳ Deploying..." : "🚀 Deploy Now"}
                  </button>
                  <button
                    onClick={handlePay}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    💳 Pay & Deploy
                  </button>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Loading cost...</div>
            )}

            {error && (
              <div className="mt-3 p-2.5 bg-red-500/10 rounded text-red-400 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
