import React, { useState } from "react";

interface Props {
  projectId: string;
  projectDir: string;
}

export const PreviewPanel: React.FC<Props> = ({ projectId }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const startPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start preview");
      const data = await res.json();
      setPreviewUrl(data.previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const stopPreviewServer = async () => {
    await fetch(`/api/projects/${projectId}/preview`, { method: "DELETE" });
    setPreviewUrl(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-lg">👁️</span> Live Preview
        </h3>
        <div className="flex gap-2 items-center">
          {!previewUrl ? (
            <button
              onClick={startPreview}
              disabled={loading}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Starting...</>
              ) : (
                <><span>▶️</span> Start Preview</>
              )}
            </button>
          ) : (
            <>
              <div className="flex glass rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-all ${
                    viewMode === "desktop"
                      ? "bg-accent text-white shadow-lg shadow-accent/20"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  🖥 Desktop
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-all ${
                    viewMode === "mobile"
                      ? "bg-accent text-white shadow-lg shadow-accent/20"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  📱 Mobile
                </button>
              </div>
              <button
                onClick={stopPreviewServer}
                className="px-3 py-1.5 bg-neon-red/10 border border-neon-red/20 text-neon-red rounded-lg text-[11px] font-medium hover:bg-neon-red/20 transition-all"
              >
                ⏹ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-neon-red/5 border border-neon-red/15 rounded-xl text-neon-red text-sm mb-4 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {previewUrl && (
        <div className="glass rounded-xl overflow-hidden neon-border-purple">
          {/* Browser Chrome */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg-tertiary/40">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-neon-red/80 hover:bg-neon-red transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-neon-orange/80 hover:bg-neon-orange transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-neon-green/80 hover:bg-neon-green transition-colors cursor-pointer" />
            </div>
            <div className="flex-1 bg-white/4 rounded-lg px-3 py-1 text-[11px] font-mono text-gray-400 truncate border border-white/5">
              {previewUrl}
            </div>
            <button
              onClick={() => window.open(previewUrl, "_blank")}
              className="text-[11px] text-gray-400 hover:text-accent-light transition-colors font-medium"
            >
              ↗ Open
            </button>
          </div>
          {/* Preview Frame */}
          <div className="flex justify-center bg-[#0a0a12] p-4">
            <iframe
              src={previewUrl}
              title="Preview"
              className={`bg-white rounded-lg shadow-2xl shadow-black/50 transition-all duration-500 ${
                viewMode === "desktop" ? "w-full h-[600px]" : "w-[375px] h-[667px] rounded-2xl"
              }`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}

      {!previewUrl && !loading && (
        <div className="flex flex-col items-center justify-center p-14 bg-white/2 border border-dashed border-white/8 rounded-xl text-center">
          <span className="text-3xl mb-3">🖥️</span>
          <p className="text-gray-500 text-sm mb-1">No preview running</p>
          <p className="text-gray-600 text-[11px]">Click "Start Preview" to see your generated app live</p>
        </div>
      )}
    </div>
  );
};
