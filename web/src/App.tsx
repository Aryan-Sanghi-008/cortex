import React from "react";
import { PromptInput } from "./components/PromptInput";
import { PipelineDashboard } from "./components/PipelineDashboard";
import { BotVisualization } from "./components/BotVisualization";
import { OutputViewer } from "./components/OutputViewer";
import { PreviewPanel } from "./components/PreviewPanel";
import { DeployPanel } from "./components/DeployPanel";
import { useProject } from "./hooks/useProject";
import { useWebSocket } from "./hooks/useWebSocket";

const App: React.FC = () => {
  const { project, loading, error, startProject } = useProject();
  const { events, connected } = useWebSocket(project?.id ?? null);

  const handleSubmit = (idea: string, files?: FileList) => {
    startProject(idea, files);
  };

  const isRunning =
    project && (project.status === "running" || project.status === "queued");
  const isComplete = project?.status === "completed" && project.output;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-8 py-4 border-b border-white/8 flex items-center gap-3 bg-bg-secondary/80 backdrop-blur-xl sticky top-0 z-50">
        <span className="text-2xl">🧠</span>
        <h1 className="text-lg font-bold bg-linear-to-r from-accent-light to-purple-300 bg-clip-text text-transparent">
          Cortex
        </h1>
        <span className="text-[13px] text-gray-500 ml-auto hidden sm:block">
          AI Code Generation Platform
        </span>
        <div
          className={`w-2 h-2 rounded-full transition-colors ${connected ? "bg-green-500" : "bg-red-500"}`}
          title={connected ? "Connected" : "Disconnected"}
        />
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-10">
        {/* Home */}
        {!project && (
          <>
            <div className="text-center py-12 sm:py-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 bg-linear-to-r from-white to-accent-light bg-clip-text text-transparent">
                Build apps from ideas
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
                Describe your product — our AI engineering teams will design,
                code, review, and deploy your project end-to-end.
              </p>
            </div>
            <PromptInput onSubmit={handleSubmit} loading={loading} />
          </>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mt-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Running — Bot Visualization + Pipeline Dashboard */}
        {isRunning && (
          <>
            <div className="mb-4 text-sm text-gray-400">
              <strong className="text-gray-200">Project:</strong>{" "}
              {project.productIdea}
            </div>
            <BotVisualization events={events} />
            <PipelineDashboard events={events} status={project.status} />
          </>
        )}

        {/* Complete — Output + Preview + Deploy */}
        {isComplete && (
          <>
            <OutputViewer output={project.output} />

            <PreviewPanel
              projectId={project.id}
              projectDir={project.output.projectDir}
            />

            <DeployPanel projectId={project.id} />
          </>
        )}

        {/* Failed */}
        {project?.status === "failed" && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl mt-6">
            <h4 className="text-red-400 font-semibold mb-2">
              ❌ Pipeline Failed
            </h4>
            <p className="text-gray-400 text-sm">{project.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-bg-tertiary border border-white/10 rounded-md text-gray-200 text-sm cursor-pointer hover:bg-white/6 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
