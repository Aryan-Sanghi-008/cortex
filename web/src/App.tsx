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
    <div className="min-h-screen flex flex-col relative noise-overlay">
      {/* ──── Header ──── */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-border flex items-center gap-3 glass-strong sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-neon-blue flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1 className="text-base font-bold gradient-text tracking-tight leading-tight">Cortex</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase leading-tight">AI Engineering Platform</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[12px] text-gray-500 hidden sm:block font-medium">
            Multi-Agent Code Generation
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`status-dot transition-all duration-300 ${connected ? "status-dot-connected animate-pulse" : "status-dot-disconnected"}`}
            />
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* ──── Main Content ──── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Floating Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-accent/10 to-neon-blue/5 blur-3xl animate-orb" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-neon-purple/8 to-accent/5 blur-3xl animate-orb-delay" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-neon-cyan/4 blur-3xl animate-orb" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 space-y-8">
          {/* ──── Home State ──── */}
          {!project && (
            <div className="animate-fade-in">
              {/* Hero Section */}
              <div className="text-center py-12 sm:py-16 lg:py-24">
                <div className="inline-flex items-center gap-2 mb-8 animate-fade-in">
                  <span className="tag">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    AI-Powered Development Team
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight">
                  <span className="block text-white/90">
                    Turn ideas into
                  </span>
                  <span className="gradient-text animate-text-glow">
                    production code
                  </span>
                </h1>

                <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-delay">
                  Describe your product — our AI engineering team will architect,
                  code, review, test, and prepare deployment in minutes.
                </p>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-3xl mx-auto mb-12 animate-fade-in-delay">
                  {[
                    { icon: "📋", label: "Product Spec" },
                    { icon: "🏗️", label: "Architecture" },
                    { icon: "💻", label: "Full Stack Code" },
                    { icon: "🧪", label: "Test Suite" },
                    { icon: "🚀", label: "Deploy Ready" },
                  ].map((feature, i) => (
                    <div
                      key={feature.label}
                      className="glass rounded-xl p-3 text-center glass-hover group"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span className="text-xl mb-1.5 block group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Section */}
              <div className="max-w-3xl mx-auto">
                <PromptInput onSubmit={handleSubmit} loading={loading} />
              </div>

              {/* Architecture Preview */}
              <div className="text-center mt-16 animate-fade-in-delay">
                <p className="text-xs text-gray-500 mb-5 uppercase tracking-widest font-medium">
                  Pipeline Architecture
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {[
                    { name: "Doc Gen", icon: "📋" },
                    { name: "Product Owner", icon: "📝" },
                    { name: "Tech Stack", icon: "🔧" },
                    { name: "FE Lead", icon: "🎨" },
                    { name: "BE Lead", icon: "⚙️" },
                    { name: "DB Lead", icon: "🗃️" },
                    { name: "Dev Bots", icon: "💻" },
                    { name: "QA", icon: "🧪" },
                    { name: "DevOps", icon: "🚀" },
                    { name: "CTO Review", icon: "👑" },
                  ].map((bot, i) => (
                    <div
                      key={bot.name}
                      className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg text-[11px] text-gray-400 font-medium glass-hover"
                    >
                      <span>{bot.icon}</span>
                      <span>{bot.name}</span>
                      {i < 9 && <span className="text-gray-600 ml-1">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──── Error State ──── */}
          {error && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="glass rounded-2xl p-6 neon-border-purple" style={{ borderColor: 'rgba(255, 69, 58, 0.3)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-neon-red/10 flex items-center justify-center text-neon-red text-xl shrink-0">
                    ⚠️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-neon-red font-semibold mb-1.5 text-sm">
                      Generation Failed
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 leading-relaxed">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="btn-secondary text-neon-red border-neon-red/20 hover:bg-neon-red/10 text-sm"
                    >
                      ↻ Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──── Running State ──── */}
          {isRunning && (
            <div className="animate-fade-in space-y-6">
              {/* Project Header */}
              <div className="glass rounded-2xl p-6 border-l-4 border-accent animate-border-glow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
                      <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-lg shadow-neon-green/30" />
                      Active Pipeline
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white/90 leading-snug">
                      {project.productIdea}
                    </h2>
                  </div>
                  <div className="tag">
                    <span className="animate-spin-slow inline-block">⚡</span>
                    Generating
                  </div>
                </div>
              </div>

              {/* Bot Visualization */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span className="text-lg">🤖</span> Bot Network
                </h3>
                <BotVisualization events={events} />
              </div>

              {/* Pipeline Dashboard */}
              <div className="glass rounded-2xl p-6">
                <PipelineDashboard events={events} status={project.status} />
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Active Bots",
                    value: String(events.filter(e => e.event === "bot-start").length - events.filter(e => e.event === "bot-complete").length),
                    icon: "🤖",
                    color: "text-accent-light",
                    glow: "shadow-accent/10",
                  },
                  {
                    label: "Steps Complete",
                    value: String(events.filter(e => e.event === "bot-complete").length),
                    icon: "✅",
                    color: "text-neon-green",
                    glow: "shadow-neon-green/10",
                  },
                  {
                    label: "Events Received",
                    value: String(events.length),
                    icon: "📡",
                    color: "text-neon-cyan",
                    glow: "shadow-neon-cyan/10",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`glass rounded-xl p-5 text-center glass-hover shadow-lg ${stat.glow}`}
                  >
                    <span className="text-2xl mb-2 block">{stat.icon}</span>
                    <div className={`text-2xl font-bold ${stat.color} font-mono`}>
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── Complete State ──── */}
          {isComplete && (
            <div className="animate-fade-in space-y-8">
              {/* Success Banner */}
              <div className="glass rounded-2xl p-6 neon-border-green">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center text-neon-green text-3xl shrink-0">
                    🎉
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-neon-green mb-1">
                      Project Generated Successfully
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Your full-stack project is ready. Preview the code, download the source, or deploy directly.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-secondary text-sm">
                      📤 Share
                    </button>
                    <button className="btn-primary text-sm">
                      ⚡ Quick Deploy
                    </button>
                  </div>
                </div>
              </div>

              {/* Output Viewer */}
              <div className="glass rounded-2xl overflow-hidden">
                <OutputViewer output={project.output} />
              </div>

              {/* Preview Panel */}
              <div className="glass rounded-2xl p-6">
                <PreviewPanel
                  projectId={project.id}
                  projectDir={project.output.projectDir}
                />
              </div>

              {/* Deploy Panel */}
              <div className="glass rounded-2xl p-6">
                <DeployPanel projectId={project.id} />
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    title: "Download Source",
                    description: "Get the complete source code as a ZIP file",
                    icon: "📦",
                    action: "Download",
                    gradient: "from-blue-500/10 to-cyan-500/5",
                    border: "border-blue-500/20",
                  },
                  {
                    title: "Deploy to Cloud",
                    description: "One-click deploy to Vercel, Railway, or Render",
                    icon: "☁️",
                    action: "Deploy",
                    gradient: "from-accent/10 to-purple-500/5",
                    border: "border-accent/20",
                  },
                  {
                    title: "Share Project",
                    description: "Generate a shareable link or invite collaborators",
                    icon: "👥",
                    action: "Share",
                    gradient: "from-neon-green/10 to-emerald-500/5",
                    border: "border-neon-green/20",
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className={`card bg-gradient-to-b ${step.gradient} ${step.border} rounded-xl p-6 cursor-pointer group`}
                  >
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </span>
                    <h4 className="font-semibold text-white/90 mb-1 text-sm">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                      {step.description}
                    </p>
                    <span className="text-accent-light text-xs font-medium group-hover:translate-x-1 transition-transform inline-block">
                      {step.action} →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── Failed State ──── */}
          {project?.status === "failed" && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="glass rounded-2xl p-10 text-center" style={{ borderColor: 'rgba(255, 69, 58, 0.2)' }}>
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-neon-red/10 flex items-center justify-center text-neon-red text-4xl">
                  ❌
                </div>
                <h3 className="text-xl font-bold text-neon-red mb-2">
                  Pipeline Failed
                </h3>
                <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                  {project.error ||
                    "An unexpected error occurred during project generation. Please try again."}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-primary text-sm"
                  >
                    ↻ Try Again
                  </button>
                  <button
                    onClick={() => (window.location.href = "/")}
                    className="btn-secondary text-sm"
                  >
                    ← Start New Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ──── Footer ──── */}
      <footer className="px-4 sm:px-8 py-4 border-t border-border text-center relative z-10">
        <p className="text-[11px] text-gray-600 font-medium">
          Cortex v1.0 — Multi-Agent AI Code Generation Platform
        </p>
      </footer>
    </div>
  );
};

export default App;
