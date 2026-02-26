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
  {
    id: "DocGenerator",
    name: "Doc Gen",
    icon: "📋",
    team: "planning",
    color: "blue",
  },
  {
    id: "ProductOwner",
    name: "PO",
    icon: "📝",
    team: "planning",
    color: "blue",
  },
  {
    id: "TechStack",
    name: "Tech",
    icon: "🔧",
    team: "planning",
    color: "blue",
  },
  {
    id: "ResourcePlanner",
    name: "Resources",
    icon: "👥",
    team: "planning",
    color: "blue",
  },
  {
    id: "Frontend-Lead",
    name: "FE Lead",
    icon: "🎨",
    team: "frontend",
    color: "cyan",
  },
  {
    id: "Backend-Lead",
    name: "BE Lead",
    icon: "⚙️",
    team: "backend",
    color: "green",
  },
  {
    id: "Frontend-Devs",
    name: "FE Devs",
    icon: "⚛️",
    team: "frontend",
    color: "cyan",
  },
  {
    id: "Backend-Devs",
    name: "BE Devs",
    icon: "🖥️",
    team: "backend",
    color: "green",
  },
  {
    id: "Database-Lead",
    name: "DB",
    icon: "🗃️",
    team: "data",
    color: "purple",
  },
  { id: "QA-Lead", name: "QA", icon: "🧪", team: "qa", color: "orange" },
  { id: "DevOps", name: "DevOps", icon: "🚀", team: "infra", color: "red" },
  {
    id: "Principal-Engineer",
    name: "CTO",
    icon: "👑",
    team: "leadership",
    color: "yellow",
  },
];

const TEAM_COLORS: Record<string, string> = {
  planning: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  frontend: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  backend: "from-green-500/20 to-green-600/5 border-green-500/30",
  data: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  qa: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  infra: "from-red-500/20 to-red-600/5 border-red-500/30",
  leadership: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30",
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

  return (
    <div className="mt-6 mb-8">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-accent to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-400 font-mono min-w-20 text-right">
          {completedCount}/{BOTS.length} bots
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/3 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-accent">{activeCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Active</div>
        </div>
        <div className="bg-white/3 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {completedCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Done</div>
        </div>
        <div className="bg-white/3 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {BOTS.length - completedCount - activeCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Waiting</div>
        </div>
      </div>

      {/* Bot Network */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {BOTS.map((bot) => {
          const state = getBotState(bot.id, events);
          const task = getCurrentTask(bot.id, events);

          return (
            <div
              key={bot.id}
              className={`relative bg-linear-to-b border rounded-xl p-4 transition-all duration-300 ${TEAM_COLORS[bot.team]} ${
                state === "active" ? "animate-pulse-glow scale-[1.02]" : ""
              } ${state === "done" ? "opacity-70" : ""}`}
            >
              {/* Status indicator */}
              <div
                className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${
                  state === "idle"
                    ? "bg-gray-600"
                    : state === "active"
                      ? "bg-green-400 animate-ping"
                      : state === "done"
                        ? "bg-green-500"
                        : "bg-red-500"
                }`}
              />

              <div className="text-2xl mb-2">{bot.icon}</div>
              <div className="text-xs font-semibold mb-1">{bot.name}</div>

              {state === "active" && task && (
                <div className="text-[10px] text-gray-400 truncate mt-1">
                  {task}
                </div>
              )}

              {state === "done" && (
                <div className="text-[10px] text-green-400 mt-1">✓ Done</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
