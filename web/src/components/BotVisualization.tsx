import React from "react";
import type { BotEvent } from "../hooks/useWebSocket";

interface Props {
  events: BotEvent[];
}

interface BotNode {
  id: string;
  name: string;
  icon: string;
  team: string;
  color: string;
}

const BOTS: BotNode[] = [
  { id: "DocGenerator", name: "Doc Gen", icon: "📋", team: "planning", color: "blue" },
  { id: "ProductOwner", name: "PO", icon: "📝", team: "planning", color: "blue" },
  { id: "TechStack", name: "Tech Stack", icon: "🔧", team: "planning", color: "blue" },
  { id: "ResourcePlanner", name: "Resources", icon: "👥", team: "planning", color: "blue" },
  { id: "Frontend-Lead", name: "FE Lead", icon: "🎨", team: "frontend", color: "cyan" },
  { id: "Backend-Lead", name: "BE Lead", icon: "⚙️", team: "backend", color: "green" },
  { id: "Frontend-Devs", name: "FE Devs", icon: "⚛️", team: "frontend", color: "cyan" },
  { id: "Backend-Devs", name: "BE Devs", icon: "🖥️", team: "backend", color: "green" },
  { id: "Database-Lead", name: "DB Lead", icon: "🗃️", team: "data", color: "purple" },
  { id: "Data-Dev", name: "Data Dev", icon: "💾", team: "data", color: "purple" },
  { id: "QA-Lead", name: "QA Lead", icon: "🧪", team: "qa", color: "orange" },
  { id: "QA-Devs", name: "QA Devs", icon: "🐞", team: "qa", color: "orange" },
  { id: "DevOps", name: "DevOps", icon: "🚀", team: "infra", color: "red" },
  { id: "Principal-Engineer", name: "CTO", icon: "👑", team: "leadership", color: "yellow" },
];

const TEAM_COLORS: Record<string, { gradient: string; border: string; glow: string }> = {
  planning: { gradient: "from-blue-500/15 to-blue-600/5", border: "border-blue-500/25", glow: "shadow-blue-500/10" },
  frontend: { gradient: "from-cyan-500/15 to-cyan-600/5", border: "border-cyan-500/25", glow: "shadow-cyan-500/10" },
  backend: { gradient: "from-green-500/15 to-green-600/5", border: "border-green-500/25", glow: "shadow-green-500/10" },
  data: { gradient: "from-purple-500/15 to-purple-600/5", border: "border-purple-500/25", glow: "shadow-purple-500/10" },
  qa: { gradient: "from-orange-500/15 to-orange-600/5", border: "border-orange-500/25", glow: "shadow-orange-500/10" },
  infra: { gradient: "from-red-500/15 to-red-600/5", border: "border-red-500/25", glow: "shadow-red-500/10" },
  leadership: { gradient: "from-yellow-500/15 to-yellow-600/5", border: "border-yellow-500/25", glow: "shadow-yellow-500/10" },
};

const TEAM_LABELS: Record<string, string> = {
  planning: "Planning",
  frontend: "Frontend",
  backend: "Backend",
  data: "Database",
  qa: "Quality",
  infra: "Infrastructure",
  leadership: "Leadership",
};

function getBotState(
  botId: string,
  events: BotEvent[],
): "idle" | "active" | "done" | "error" {
  const botEvents = events.filter(
    (e) =>
      (e.data.bot as string) === botId || (e.data.reviewer as string) === botId,
  );
  if (botEvents.length === 0) return "idle";
  const last = botEvents[botEvents.length - 1];
  if (last.event === "bot-error") return "error";
  if (last.event === "bot-complete" || last.event === "review-result")
    return "done";
  return "active";
}

function getCurrentTask(botId: string, events: BotEvent[]): string | null {
  const active = events
    .filter((e) => e.event === "bot-start" && (e.data.bot as string) === botId)
    .pop();
  return active ? (active.data.step as string) : null;
}

export const BotVisualization: React.FC<Props> = ({ events }) => {
  const completedCount = BOTS.filter(
    (b) => getBotState(b.id, events) === "done",
  ).length;
  const activeCount = BOTS.filter(
    (b) => getBotState(b.id, events) === "active",
  ).length;
  const progress = Math.round((completedCount / BOTS.length) * 100);

  // Group bots by team
  const teams = BOTS.reduce<Record<string, BotNode[]>>((acc, bot) => {
    if (!acc[bot.team]) acc[bot.team] = [];
    acc[bot.team].push(bot);
    return acc;
  }, {});

  return (
    <div>
      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8b5cf6, #6366f1, #60a5fa)',
            }}
          >
            <div className="absolute inset-0 animate-shimmer rounded-full" />
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono min-w-20 text-right tabular-nums">
          {completedCount}/{BOTS.length} bots
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-accent-light font-mono">{activeCount}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider">Active</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-neon-green font-mono">{completedCount}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider">Done</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-500 font-mono">
            {BOTS.length - completedCount - activeCount}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider">Waiting</div>
        </div>
      </div>

      {/* Bot Grid Grouped by Team */}
      <div className="space-y-4">
        {Object.entries(teams).map(([team, bots]) => (
          <div key={team}>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2 px-1">
              {TEAM_LABELS[team] || team}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {bots.map((bot) => {
                const state = getBotState(bot.id, events);
                const task = getCurrentTask(bot.id, events);
                const teamStyle = TEAM_COLORS[bot.team];

                return (
                  <div
                    key={bot.id}
                    className={`relative bg-gradient-to-b border rounded-xl p-3.5 transition-all duration-300 ${teamStyle.gradient} ${teamStyle.border} ${
                      state === "active"
                        ? `animate-pulse-glow scale-[1.02] shadow-lg ${teamStyle.glow}`
                        : ""
                    } ${state === "done" ? "opacity-60" : ""} ${
                      state === "error" ? "border-neon-red/30" : ""
                    }`}
                  >
                    {/* Status Dot */}
                    <div
                      className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full transition-all duration-300 ${
                        state === "idle"
                          ? "bg-gray-600"
                          : state === "active"
                            ? "bg-neon-green animate-ping shadow-lg shadow-neon-green/30"
                            : state === "done"
                              ? "bg-neon-green"
                              : "bg-neon-red shadow-lg shadow-neon-red/30"
                      }`}
                    />

                    <div className="text-xl mb-1.5">{bot.icon}</div>
                    <div className="text-[11px] font-semibold text-white/80 mb-0.5">{bot.name}</div>

                    {state === "active" && task && (
                      <div className="text-[9px] text-gray-400 truncate mt-1 animate-pulse font-mono">
                        {task}
                      </div>
                    )}

                    {state === "done" && (
                      <div className="text-[9px] text-neon-green mt-1 font-medium">✓ Done</div>
                    )}

                    {state === "error" && (
                      <div className="text-[9px] text-neon-red mt-1 font-medium">✗ Failed</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
