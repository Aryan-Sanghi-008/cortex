import React, { useState, useRef } from "react";

interface Props {
  onSubmit: (idea: string, files?: FileList) => void;
  loading: boolean;
}

export const PromptInput: React.FC<Props> = ({ onSubmit, loading }) => {
  const [idea, setIdea] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const filesRef = useRef<FileList | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || loading) return;
    onSubmit(idea.trim(), filesRef.current ?? undefined);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      filesRef.current = files;
      setFileNames(Array.from(files).map((f) => f.name));
    }
  };

  const charCount = idea.length;

  return (
    <form
      onSubmit={handleSubmit}
      className={`glass rounded-2xl p-6 transition-all duration-300 ${
        isFocused
          ? "neon-border-purple shadow-lg shadow-accent/5"
          : "border-border"
      }`}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Describe Your Product
        </label>
        <span className={`text-[11px] font-mono transition-colors ${charCount > 0 ? 'text-gray-500' : 'text-transparent'}`}>
          {charCount} chars
        </span>
      </div>

      {/* Textarea */}
      <textarea
        className="input-area w-full min-h-32 bg-bg-tertiary/60 border border-white/6 rounded-xl p-4 text-gray-100 text-[14px] font-sans leading-relaxed resize-y transition-all duration-300 placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:bg-bg-tertiary/80"
        placeholder="Build a SaaS platform with team management, role-based dashboards, real-time notifications, Stripe billing integration, and an admin panel..."
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={loading}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer text-sm py-2 px-4">
            <span className="text-base">📎</span>
            <span>Reference Images</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFiles}
              disabled={loading}
              className="hidden"
            />
          </label>
          {fileNames.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="badge-success text-[11px] px-2 py-0.5 rounded-full">
                {fileNames.length} file{fileNames.length > 1 ? 's' : ''} attached
              </span>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !idea.trim()}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block">⏳</span>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Generate Project</span>
            </>
          )}
        </button>
      </div>

      {/* Hint */}
      {!idea.trim() && !loading && (
        <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
          💡 Tip: Be specific about features, user roles, integrations, and UI preferences for best results.
        </p>
      )}
    </form>
  );
};
