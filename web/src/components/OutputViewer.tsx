import React, { useState } from 'react';

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
  const codeKeys = ['frontendCode', 'backendCode', 'databaseCode', 'qaCode', 'devopsCode'];

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
    typescript: '📘', tsx: '⚛️', javascript: '📒', css: '🎨',
    json: '📋', prisma: '🗃️', yaml: '⚙️', yml: '⚙️',
    dockerfile: '🐳', markdown: '📝', sql: '💾',
  };
  return icons[lang] ?? '📄';
}

export const OutputViewer: React.FC<Props> = ({ output }) => {
  const files = extractFiles(output);
  const [selected, setSelected] = useState<FileItem | null>(files[0] ?? null);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center p-10 text-gray-500 text-sm mt-10">
        No generated files yet
      </div>
    );
  }

  const review = output?.principalReview;
  const costBreakdown = output?.costBreakdown;
  const scoreClass =
    review?.overallQuality >= 7 ? 'border-green-500 text-green-400'
    : review?.overallQuality >= 5 ? 'border-amber-500 text-amber-400'
    : 'border-red-500 text-red-400';

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <h3 className="text-xl font-semibold">📦 Generated Project</h3>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-gray-500">{files.length} files</span>
          <button
            onClick={() => window.open(`/output/${output.projectId}/${output.projectName?.toLowerCase().replace(/\s+/g, '-')}.zip`)}
            className="px-5 py-2.5 bg-green-500 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5"
          >
            ⬇ Download ZIP
          </button>
        </div>
      </div>

      {/* Score + Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {review && (
          <div className="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/8 rounded-xl">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold border-[3px] shrink-0 ${scoreClass}`}>
              {review.overallQuality}
            </div>
            <div>
              <h4 className="text-sm font-semibold">
                {review.approved ? '✅ Approved by Principal' : '⚠️ Needs Improvements'}
              </h4>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{review.summary}</p>
            </div>
          </div>
        )}

        {costBreakdown && (
          <div className="p-5 bg-white/[0.03] border border-white/8 rounded-xl">
            <h4 className="text-sm font-semibold mb-2">💰 Cost Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">Total Tokens</div>
              <div className="text-gray-200 font-mono">{costBreakdown.totalTokens?.toLocaleString()}</div>
              <div className="text-gray-400">Total Cost</div>
              <div className="text-green-400 font-mono font-bold">${costBreakdown.totalCost?.toFixed(4)}</div>
              <div className="text-gray-400">Input Tokens</div>
              <div className="text-gray-300 font-mono">{costBreakdown.totalInputTokens?.toLocaleString()}</div>
              <div className="text-gray-400">Output Tokens</div>
              <div className="text-gray-300 font-mono">{costBreakdown.totalOutputTokens?.toLocaleString()}</div>
            </div>

            {costBreakdown.perBot?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-[11px] text-gray-500 mb-1.5">Per Bot</div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {costBreakdown.perBot.map((bot: any, i: number) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-gray-400 truncate">{bot.botName}</span>
                      <span className="text-gray-300 font-mono shrink-0 ml-2">${bot.cost?.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Tree + Preview */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] bg-bg-secondary border border-white/8 rounded-xl overflow-hidden">
        {/* File Tree */}
        <div className="border-b md:border-b-0 md:border-r border-white/8 max-h-[250px] md:max-h-[600px] overflow-y-auto py-3">
          {files.map((f) => (
            <div
              key={f.path}
              onClick={() => setSelected(f)}
              className={`flex items-center gap-2 px-4 py-1.5 text-[13px] font-mono cursor-pointer transition-all
                ${selected?.path === f.path
                  ? 'bg-accent/10 text-accent-light'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
            >
              <span className="text-sm">{getFileIcon(f.language)}</span>
              <span className="truncate">{f.path}</span>
            </div>
          ))}
        </div>

        {/* Code Preview */}
        <div className="max-h-[600px] overflow-auto p-5">
          {selected ? (
            <pre className="font-mono text-[13px] leading-7 text-gray-400">
              {selected.content.split('\n').map((line, i) => (
                <div key={i}>
                  <span className="inline-block w-10 text-right mr-4 text-gray-600 select-none">{i + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a file to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
