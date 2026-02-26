import React, { useState, useRef } from "react";

interface Props {
  onSubmit: (idea: string, files?: FileList) => void;
  loading: boolean;
}

export const PromptInput: React.FC<Props> = ({ onSubmit, loading }) => {
  const [idea, setIdea] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-secondary border border-white/8 rounded-xl p-6 mt-8"
    >
      <textarea
        className="w-full min-h-[120px] bg-bg-tertiary border border-white/8 rounded-lg p-4 text-gray-100 text-[15px] font-sans resize-y transition-all duration-200 placeholder:text-gray-500 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        placeholder={
          "Describe your product idea...\n\ne.g. Build a SaaS HR management system with employee onboarding, leave management, payroll integration, and role-based dashboards."
        }
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        disabled={loading}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-white/10 rounded-lg cursor-pointer text-gray-400 text-sm transition-all hover:border-accent hover:text-accent-light">
            📎 Upload References
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
            <span className="text-xs text-gray-500">
              {fileNames.length} file(s)
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !idea.trim()}
          className="px-8 py-3 bg-linear-to-r from-accent to-purple-600 rounded-lg text-white font-semibold text-[15px] shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? "⏳ Generating..." : "🚀 Generate Project"}
        </button>
      </div>
    </form>
  );
};
