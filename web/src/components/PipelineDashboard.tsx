import React from "react";
import type { BotEvent } from "../hooks/useWebSocket";

interface BotInfo {
  name: string;
  icon: string;
  team: string;
}

const BOT_MAP: Record<string, BotInfo> = {
  DocGenerator: { name: "Doc Generator", icon: "📋", team: "Planning" },
  ProductOwner: { name: "Product Owner", icon: "📝", team: "Planning" },
  TechStack: { name: "Tech Stack", icon: "🔧", team: "Planning" },
  ResourcePlanner: { name: "Resource Planner", icon: "👥", team: "Planning" },
  "Frontend-Lead": { name: "Frontend Lead", icon: "🎨", team: "Frontend" },
  "Frontend-Devs": { name: "Frontend Devs", icon: "⚛️", team: "Frontend" },
  "Backend-Lead": { name: "Backend Lead", icon: "⚙️", team: "Backend" },
  "Backend-Devs": { name: "Backend Devs", icon: "🖥️", team: "Backend" },
  "Database-Lead": { name: "Database Lead", icon: "🗃️", team: "Database" },
  "Data-Dev": { name: "Data Dev", icon: "💾", team: "Database" },
  "QA-Lead": { name: "QA Lead", icon: "🧪", team: "Quality" },
  "QA-Devs": { name: "QA Devs", icon: "🐞", team: "Quality" },
  DevOps: { name: "DevOps", icon: "🚀", team: "Infrastructure" },
  "Principal-Engineer": { name: "Principal Engineer", icon: "👑", team: "Leadership" },
};

function getBotState(
  botName: string,
  events: BotEvent[],
): "idle" | "active" | "done" | "error" {
  const botEvents = events.filter(
    (e) =>
      (e.data.bot as string) === botName ||
      (e.data.reviewer as string) === botName,
  );
  if (botEvents.length === 0) return "idle";
  const last = botEvents[botEvents.length - 1];
  if (last.event === "bot-error") return "error";
  if (last.event === "bot-complete" || last.event === "review-result")
    return "done";
  return "active";
}

function getFilesCount(botName: string, events: BotEvent[]): number | null {
  const complete = events.find(
    (e) =>
      e.event === "bot-complete" &&
      (e.data.bot as string) === botName &&
      e.data.filesGenerated,
  );
  return complete ? (complete.data.filesGenerated as number) : null;
}

interface Props {
  events: BotEvent[];
  status: string;
}

const STATE_STYLES: Record<string, string> = {
  idle: "border-white/6",
  active: "border-accent/40 shadow-lg shadow-accent/10 animate-pulse-glow",
  done: "border-neon-green/25",
  error: "border-neon-red/25",
};

const STATE_BADGES: Record<string, { label: string; className: string }> = {
  idle: { label: "Waiting", className: "text-gray-500 bg-white/5" },
  active: { label: "Working", className: "text-accent-light bg-accent/10 animate-pulse" },
  done: { label: "Complete", className: "text-neon-green bg-neon-green/10" },
  error: { label: "Failed", className: "text-neon-red bg-neon-red/10" },
};

const STATUS_BADGES: Record<string, string> = {
  queued: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  running: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-neon-green/10 text-neon-green border-neon-green/20",
  failed: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

export const PipelineDashboard: React.FC<Props> = ({ events, status }) => {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-lg">🏗️</span> Pipeline Status
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${STATUS_BADGES[status] || STATUS_BADGES.failed}`}
        >
          {status}
        </span>
      </div>

      {/* Bot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {Object.entries(BOT_MAP).map(([key, info]) => {
          const state = getBotState(key, events);
          const files = getFilesCount(key, events);
          const badge = STATE_BADGES[state];
          return (
            <div
              key={key}
              className={`glass rounded-xl p-4 transition-all duration-300 glass-hover ${STATE_STYLES[state]}`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="text-xl">{info.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white/80 truncate">{info.name}</div>
                  <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${badge.className}`}>
                    {badge.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">{info.team}</span>
                {files !== null && (
                  <span className="text-[10px] text-accent-light font-mono font-medium">
                    {files} files
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="divider-glow mb-6" />

      {/* Activity Feed */}
      <div className="glass rounded-xl max-h-80 overflow-y-auto">
        <div className="sticky top-0 px-4 py-3 text-[11px] font-semibold text-gray-400 border-b border-border glass-strong z-10 flex items-center gap-2 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          Live Activity
        </div>
        {events.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">
            <span className="text-xl block mb-2">📡</span>
            Waiting for pipeline to start...
          </div>
        )}
        {[...events].reverse().map((event, i) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-2.5 border-b border-white/4 text-[12px] animate-fade-in hover:bg-white/2 transition-colors"
          >
            <span className="text-gray-600 font-mono text-[10px] min-w-16 shrink-0 tabular-nums pt-0.5">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-gray-400 leading-relaxed">{formatEvent(event)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatEvent(e: BotEvent): React.ReactNode {
  switch (e.event) {
    case "pipeline-start":
      return (
        <>
          <strong className="text-white/80">Pipeline started</strong>
          <span className="text-gray-500"> — </span>
          <span className="text-gray-400 italic">"{e.data.productIdea as string}"</span>
        </>
      );
    case "pipeline-complete":
      return (
        <>
          <strong className="text-neon-green">Pipeline complete</strong>
          <span className="text-gray-500"> — Score: </span>
          <span className="text-neon-green font-mono font-bold">{e.data.score as number}/10</span>
        </>
      );
    case "pipeline-error":
      return (
        <>
          <strong className="text-neon-red">Pipeline failed</strong>
          <span className="text-gray-500"> — </span>
          <span className="text-gray-400">{e.data.error as string}</span>
        </>
      );
    case "bot-start":
      return (
        <>
          <strong className="text-white/80">{e.data.bot as string}</strong>
          <span className="text-gray-500"> started — </span>
          <span className="text-accent-light">{e.data.step as string}</span>
        </>
      );
    case "bot-complete":
      return (
        <>
          <strong className="text-white/80">{e.data.bot as string}</strong>
          <span className="text-neon-green"> completed</span>
          {e.data.filesGenerated ? (
            <span className="text-gray-500 font-mono"> ({e.data.filesGenerated as number} files)</span>
          ) : (
            ""
          )}
        </>
      );
    case "review-start":
      return (
        <>
          <strong className="text-white/80">{e.data.reviewer as string}</strong>
          <span className="text-gray-500"> reviewing </span>
          <span className="text-accent-light">{e.data.target as string}</span>
        </>
      );
    case "review-result":
      return (
        <>
          <strong className="text-white/80">{e.data.reviewer as string}</strong>{" "}
          {e.data.approved ? (
            <span className="text-neon-green font-medium">✓ approved</span>
          ) : (
            <span className="text-neon-red font-medium">✗ rejected</span>
          )}
          <span className="text-gray-500 font-mono"> ({e.data.score as number}/10)</span>
        </>
      );
    default:
      return (
        <span className="text-gray-500">
          {e.event}: {JSON.stringify(e.data)}
        </span>
      );
  }
}
