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
      className={`glass rounded-2xl p-6 transition-all duration-300 relative overflow-hidden ${
        isFocused
          ? "border-accent/30 shadow-[0_0_20px_rgba(96,165,250,0.1)]"
          : "border-border"
      }`}
    >
      {/* Subtle Background Inner Glow when focused */}
      <div className={`absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none ${isFocused ? 'opacity-100' : ''}`} />

      {/* Label */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
          Product Requirements
        </label>
        <span className={`text-[11px] font-mono transition-colors ${charCount > 0 ? 'text-gray-500' : 'text-transparent'}`}>
          {charCount} chars
        </span>
      </div>

      {/* Textarea */}
      <textarea
        className="input-area relative z-10 w-full min-h-[140px] bg-white/[0.02] border border-white/5 rounded-xl p-5 text-gray-200 text-[15px] font-sans leading-relaxed resize-y transition-all duration-300 placeholder:text-gray-600 focus:outline-none focus:border-accent/20 focus:bg-white/[0.04]"
        placeholder="Build an inventory management system with a dashboard for tracking stock, user roles for warehouse staff, and integration with Stripe for wholesale ordering..."
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
