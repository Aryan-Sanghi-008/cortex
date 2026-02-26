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
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-xl font-semibold">👁️ Live Preview</h3>
        <div className="flex gap-2">
          {!previewUrl ? (
            <button
              onClick={startPreview}
              disabled={loading}
              className="px-5 py-2.5 bg-linear-to-r from-blue-500 to-blue-600 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5"
            >
              {loading ? "⏳ Starting..." : "▶️ Start Preview"}
            </button>
          ) : (
            <>
              <div className="flex bg-bg-tertiary rounded-lg overflow-hidden border border-white/8">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={`px-3 py-1.5 text-xs ${viewMode === "desktop" ? "bg-accent text-white" : "text-gray-400"}`}
                >
                  🖥 Desktop
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={`px-3 py-1.5 text-xs ${viewMode === "mobile" ? "bg-accent text-white" : "text-gray-400"}`}
                >
                  📱 Mobile
                </button>
              </div>
              <button
                onClick={stopPreviewServer}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                ⏹ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="bg-bg-secondary border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-bg-tertiary">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-xs font-mono text-gray-400 truncate">
              {previewUrl}
            </div>
            <button
              onClick={() => window.open(previewUrl, "_blank")}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ↗ Open
            </button>
          </div>
          <div className="flex justify-center bg-[#1e1e2e] p-4">
            <iframe
              src={previewUrl}
              title="Preview"
              className={`bg-white rounded-lg shadow-2xl transition-all duration-300 ${
                viewMode === "desktop"
                  ? "w-full h-[600px]"
                  : "w-[375px] h-[667px]"
              }`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}

      {!previewUrl && !loading && (
        <div className="flex items-center justify-center p-12 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
          Click "Start Preview" to see your generated website running live
        </div>
      )}
    </div>
  );
};
