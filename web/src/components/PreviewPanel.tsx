import React, { useState } from "react";
import { api } from "../utils/api";

interface Props {
  projectId: string;
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
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <h2 className="text-slate-900 dark:text-white text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">preview</span>
          Live Preview Engine
        </h2>
        <div className="flex gap-2 items-center">
          {!previewUrl ? (
            <button
              onClick={startPreview}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 h-10 bg-primary-stitch text-white rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary-stitch/20 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Starting...</>
              ) : (
                <><span className="material-symbols-outlined text-sm">play_arrow</span> Start Preview</>
              )}
            </button>
          ) : (
            <>
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden p-1 gap-1 border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === "desktop"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">desktop_windows</span> Desktop
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === "mobile"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">smartphone</span> Mobile
                </button>
              </div>
              <button
                onClick={stopPreviewServer}
                className="flex items-center justify-center gap-1.5 px-3 h-9 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg font-bold hover:bg-red-200 dark:hover:bg-red-500/20 transition-all cursor-pointer text-xs border border-red-200 dark:border-red-500/20"
              >
                <span className="material-symbols-outlined text-[14px]">stop</span> Stop
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span> {error}
        </div>
      )}

      {previewUrl && (
        <div className="bg-white dark:bg-[#0d151c] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* Browser Chrome */}
          <div className="bg-slate-100 dark:bg-slate-900/80 px-4 py-2.5 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-400/50"></div>
              <div className="size-2.5 rounded-full bg-amber-400/50"></div>
              <div className="size-2.5 rounded-full bg-emerald-400/50"></div>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-md py-1.5 px-3 text-[11px] font-mono text-slate-500 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <span className="truncate">{previewUrl}</span>
              <button
                onClick={() => window.open(previewUrl, "_blank")}
                className="text-primary-stitch hover:brightness-110 flex items-center"
                title="Open in new tab"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            </div>
          </div>
          {/* Preview Frame */}
          <div className="flex justify-center bg-slate-50 dark:bg-[#0a0f14] p-6 min-h-[400px]">
            <iframe
              src={previewUrl}
              title="Preview"
              className={`bg-white rounded-lg shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-800 ${
                viewMode === "desktop" ? "w-full h-[600px]" : "w-[375px] h-[667px] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-slate-900 shadow-xl"
              }`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}

      {!previewUrl && !loading && (
        <div className="flex flex-col items-center justify-center p-14 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 block">play_circle</span>
          <p className="text-slate-900 dark:text-white font-bold mb-1">Preview Offline</p>
          <p className="text-slate-500 text-sm">Start the preview engine to interact with your generated application</p>
        </div>
      )}
    </div>
  );
};
