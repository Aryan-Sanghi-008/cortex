import React from 'react';
import type { BotEvent } from '../hooks/useWebSocket';

interface BotInfo {
  name: string;
  icon: string;
  team: string;
}

const BOT_MAP: Record<string, BotInfo> = {
  DocGenerator: { name: 'Doc Generator', icon: '📋', team: 'Planning' },
  ProductOwner: { name: 'Product Owner', icon: '📝', team: 'Planning' },
  TechStack: { name: 'Tech Stack', icon: '🔧', team: 'Planning' },
  ResourcePlanner: { name: 'Resource Planner', icon: '👥', team: 'Planning' },
  'Frontend-Lead': { name: 'Frontend Lead', icon: '🎨', team: 'Frontend' },
  'Frontend-Devs': { name: 'Frontend Devs', icon: '⚛️', team: 'Frontend' },
  'Backend-Lead': { name: 'Backend Lead', icon: '⚙️', team: 'Backend' },
  'Backend-Devs': { name: 'Backend Devs', icon: '🖥️', team: 'Backend' },
  'Database-Lead': { name: 'Database Lead', icon: '🗃️', team: 'Database' },
  'QA-Lead': { name: 'QA Lead', icon: '🧪', team: 'QA' },
  DevOps: { name: 'DevOps', icon: '🚀', team: 'Infrastructure' },
  'Principal-Engineer': { name: 'Principal Engineer', icon: '👑', team: 'Leadership' },
};

function getBotState(botName: string, events: BotEvent[]): 'idle' | 'active' | 'done' | 'error' {
  const botEvents = events.filter(
    (e) => (e.data.bot as string) === botName || (e.data.reviewer as string) === botName
  );
  if (botEvents.length === 0) return 'idle';
  const last = botEvents[botEvents.length - 1];
  if (last.event === 'bot-error') return 'error';
  if (last.event === 'bot-complete' || last.event === 'review-result') return 'done';
  return 'active';
}

function getFilesCount(botName: string, events: BotEvent[]): number | null {
  const complete = events.find(
    (e) => e.event === 'bot-complete' && (e.data.bot as string) === botName && e.data.filesGenerated
  );
  return complete ? (complete.data.filesGenerated as number) : null;
}

interface Props {
  events: BotEvent[];
  status: string;
}

const STATE_STYLES: Record<string, string> = {
  idle: 'border-white/8',
  active: 'border-accent shadow-lg shadow-accent/10 animate-pulse-glow',
  done: 'border-green-500/30',
  error: 'border-red-500/30',
};

const STATE_LABELS: Record<string, string> = {
  idle: '⏸ Waiting',
  active: '🔄 Working...',
  done: '✅ Complete',
  error: '❌ Failed',
};

export const PipelineDashboard: React.FC<Props> = ({ events, status }) => {
  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xl font-semibold">🏗️ Pipeline</h3>
        <span
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
            status === 'queued' ? 'bg-blue-500/10 text-blue-400'
            : status === 'running' ? 'bg-amber-500/10 text-amber-400'
            : status === 'completed' ? 'bg-green-500/10 text-green-400'
            : 'bg-red-500/10 text-red-400'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Bot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {Object.entries(BOT_MAP).map(([key, info]) => {
          const state = getBotState(key, events);
          const files = getFilesCount(key, events);
          return (
            <div
              key={key}
              className={`bg-white/[0.03] border rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] ${STATE_STYLES[state]}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{info.name}</div>
                  <div className="text-xs text-gray-500">{STATE_LABELS[state]}</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-500">{info.team}</div>
              {files !== null && (
                <div className="mt-2 text-xs text-accent-light font-mono">
                  {files} files generated
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="bg-bg-secondary border border-white/8 rounded-xl max-h-[400px] overflow-y-auto">
        <h4 className="sticky top-0 px-5 py-3.5 text-sm font-semibold text-gray-400 border-b border-white/8 bg-bg-secondary z-10">
          📡 Live Activity
        </h4>
        {events.length === 0 && (
          <div className="px-5 py-3 text-sm text-gray-500">Waiting for pipeline to start...</div>
        )}
        {[...events].reverse().map((event, i) => (
          <div key={i} className="flex gap-3 px-5 py-2.5 border-b border-white/5 text-[13px] animate-fade-in">
            <span className="text-gray-500 font-mono text-[11px] min-w-[70px] shrink-0">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-gray-400">{formatEvent(event)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatEvent(e: BotEvent): React.ReactNode {
  switch (e.event) {
    case 'pipeline-start':
      return <><strong className="text-gray-100">Pipeline started</strong> — "{e.data.productIdea as string}"</>;
    case 'pipeline-complete':
      return <><strong className="text-green-400">Pipeline complete!</strong> — Score: {e.data.score as number}/10</>;
    case 'pipeline-error':
      return <><strong className="text-red-400">Pipeline failed</strong> — {e.data.error as string}</>;
    case 'bot-start':
      return <><strong className="text-gray-100">{e.data.bot as string}</strong> started — {e.data.step as string}</>;
    case 'bot-complete':
      return <><strong className="text-gray-100">{e.data.bot as string}</strong> completed{e.data.filesGenerated ? ` (${e.data.filesGenerated} files)` : ''}</>;
    case 'review-start':
      return <><strong className="text-gray-100">{e.data.reviewer as string}</strong> reviewing {e.data.target as string}</>;
    case 'review-result':
      return <><strong className="text-gray-100">{e.data.reviewer as string}</strong> {e.data.approved ? '✅ approved' : '❌ rejected'} ({e.data.score as number}/10)</>;
    default:
      return <>{e.event}: {JSON.stringify(e.data)}</>;
  }
}
