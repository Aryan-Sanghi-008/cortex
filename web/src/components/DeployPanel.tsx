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
      icon: "rocket_launch", 
      desc: "Best for frontend & serverless",
      badge: "Popular",
    },
    {
      id: "railway",
      name: "Railway",
      icon: "train",
      desc: "Full-stack with database",
      badge: "Full Stack",
    },
    {
      id: "render",
      name: "Render",
      icon: "bolt",
      desc: "Free tier available",
      badge: "Free Tier",
    },
  ];

  return (
    <div className="w-full">
      <h2 className="text-slate-900 dark:text-white text-xl font-bold flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
        Deploy Your Project
      </h2>

      {deployUrl ? (
        <div className="p-8 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-center shadow-lg shadow-emerald-500/5">
          <div className="text-4xl mb-4">🎉</div>
          <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            Deployed Successfully!
          </h4>
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-stitch underline font-mono text-sm hover:brightness-110 transition-colors block mb-6"
          >
            {deployUrl}
          </a>
          <button
            onClick={() => window.open(deployUrl, "_blank")}
            className="flex justify-center items-center gap-2 mx-auto px-6 h-10 bg-primary-stitch text-white rounded-lg font-bold hover:brightness-110 transition-all cursor-pointer text-sm shadow-md"
          >
            Visit Site <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Select Cloud Platform</div>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 text-left group border ${
                  platform === p.id
                    ? "border-primary-stitch/40 bg-primary-stitch/10 shadow-lg shadow-primary-stitch/5"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  platform === p.id ? 'bg-primary-stitch/20 text-primary-stitch' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                }`}>
                  <span className="material-symbols-outlined">{p.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                      platform === p.id
                        ? 'bg-primary-stitch/20 text-primary-stitch'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {p.badge}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{p.desc}</div>
                </div>
                {platform === p.id && (
                  <span className="material-symbols-outlined text-primary-stitch shrink-0 ml-2">check_circle</span>
                )}
              </button>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-fit">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">payments</span> Cost Estimate
            </h4>

            {cost ? (
              <>
                <div className="space-y-3 mb-5">
                  {cost.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm items-center">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span
                        className={`font-semibold ${
                          item.amount === "Free"
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider"
                            : "text-slate-900 dark:text-white font-mono tabular-nums"
                        }`}
                      >
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mb-5" />

                <div className="flex justify-between items-center text-base mb-5">
                  <span className="font-bold text-slate-900 dark:text-white">Total (one-time)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums text-lg">
                    {cost.totalFormatted}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-lg p-4 text-xs text-slate-500 dark:text-slate-400 mb-6 shadow-sm">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">bar_chart</span> Monthly hosting: <span className="text-slate-900 dark:text-white ml-1">{cost.hosting.monthly}</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc">
                    {cost.hosting.breakdown.map((line, i) => (
                      <li key={i} className="leading-relaxed text-slate-500 dark:text-slate-400">{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="flex-1 flex justify-center items-center gap-2 px-4 h-11 bg-primary-stitch text-white rounded-lg font-bold hover:brightness-110 transition-all shadow-md cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {deploying ? (
                      <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Deploying...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Deploy Now</>
                    )}
                  </button>
                  <button
                    onClick={handlePay}
                    className="flex justify-center items-center gap-2 px-4 h-11 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer text-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">credit_card</span> Pay & Deploy
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400 text-sm">
                <span className="material-symbols-outlined text-3xl mb-3 animate-spin text-slate-300 dark:text-slate-600">progress_activity</span>
                Calculating cloud resources...
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-[16px]">warning</span> {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
