import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Link, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { api, BotEvent } from '../utils/api';

interface BotInfo {
    id: string;
    name: string;
    materialIcon: string;
    team: string;
}

const BOTS: BotInfo[] = [
    { id: "DocGenerator", name: "Doc Gen", materialIcon: "description", team: "Planning" },
    { id: "ProductOwner", name: "Product Owner", materialIcon: "person", team: "Planning" },
    { id: "TechStack", name: "Tech Stack", materialIcon: "build", team: "Planning" },
    { id: "ResourcePlanner", name: "Resources", materialIcon: "groups", team: "Planning" },
    { id: "Frontend-Lead", name: "Frontend Lead", materialIcon: "brush", team: "Frontend" },
    { id: "Frontend-Devs", name: "Frontend Devs", materialIcon: "code", team: "Frontend" },
    { id: "Backend-Lead", name: "Backend Lead", materialIcon: "settings", team: "Backend" },
    { id: "Backend-Devs", name: "Backend Devs", materialIcon: "dns", team: "Backend" },
    { id: "Database-Lead", name: "DB Lead", materialIcon: "schema", team: "Database" },
    { id: "Data-Dev", name: "Data Dev", materialIcon: "database", team: "Database" },
    { id: "QA-Lead", name: "QA Lead", materialIcon: "science", team: "QA" },
    { id: "QA-Devs", name: "QA Devs", materialIcon: "bug_report", team: "QA" },
    { id: "DevOps", name: "DevOps", materialIcon: "rocket", team: "Infrastructure" },
    { id: "Principal-Engineer", name: "Principal", materialIcon: "verified", team: "Leadership" }
];

function getBotState(botId: string, events: BotEvent[]): "waiting" | "active" | "completed" | "failed" {
    const botEvents = events.filter((e) => e.data?.bot === botId || e.data?.reviewer === botId);
    if (botEvents.length === 0) return "waiting";
    const last = botEvents[botEvents.length - 1];
    if (last.event === "bot-error") return "failed";
    if (last.event === "bot-complete" || last.event === "review-result") return "completed";
    return "active";
}

function getCurrentTask(botId: string, events: BotEvent[]): string | null {
    const active = events.filter((e) => e.event === "bot-start" && e.data?.bot === botId).pop();
    return active ? (active.data?.step as string) : null;
}

const OrchestratorDashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('id');
    const { activeProject, setActiveProjectId, recentLogs } = useProject();
    
    // Auto-scrolling ref for logs
    const logEndRef = useRef<HTMLDivElement>(null);

    // Initial state setup
    useEffect(() => {
        if (projectId) {
            setActiveProjectId(projectId);
        } else {
            setActiveProjectId(null);
        }
    }, [projectId, setActiveProjectId]);

    // Scroll logs to bottom whenever they change
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [recentLogs]);

    const [isStarting, setIsStarting] = useState(false);
    const [localIdea, setLocalIdea] = useState("");

    const handleCreateProject = async () => {
        if (!localIdea.trim()) return;
        setIsStarting(true);
        try {
            const res = await api.createProject(localIdea);
            // navigate to the new ID, which will trigger the effect above
            window.location.search = `?id=${res.projectId}`;
        } catch (e) {
            console.error(e);
            setIsStarting(false);
        }
    };
    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

                {/* Sub Header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">v2.4 Live</span>
                        <div className="h-4 w-px bg-slate-200 dark:border-slate-800"></div>
                        <h2 className="text-sm font-semibold text-primary">
                            {activeProject ? `Mission: ${activeProject.id}` : 'Select or Initialize a Mission'}
                        </h2>
                    </div>
                    {activeProject?.status === "completed" && (
                         <div className="flex items-center gap-4">
                            <Link to="/output" className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-primary/90 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-sm">download</span>
                                View Bundle
                            </Link>
                        </div>
                    )}
                </header>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-8 relative z-0">
                    {/* Natural Language Input (Only show if no active project) */}
                    {!activeProject && (
                        <div className="max-w-4xl mx-auto mb-12">
                            <div className="glass-card rounded-xl p-6 shadow-2xl border border-primary/20 transition-all focus-within:border-primary/50 focus-within:shadow-primary/10">
                                <div className="flex items-start gap-4">
                                    <div className="size-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-2">Initialize Mission</h3>
                                        <div className="relative">
                                            <textarea
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none min-h-[100px] outline-none font-sans"
                                                placeholder="Describe your product vision in natural language..."
                                                value={localIdea}
                                                onChange={(e) => setLocalIdea(e.target.value)}
                                            />
                                            <div className="absolute bottom-4 right-4 flex gap-2">
                                                <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"><span className="material-symbols-outlined">mic</span></button>
                                                <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"><span className="material-symbols-outlined">attach_file</span></button>
                                                <button 
                                                    onClick={handleCreateProject}
                                                    disabled={isStarting || !localIdea.trim()}
                                                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/20 cursor-pointer text-center inline-flex items-center gap-2"
                                                >
                                                    {isStarting ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                                                    Launch Orchestrator
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orchestrator Status (Only show if project active) */}
                    {activeProject && (
                        <div className="max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Live Orchestration</h2>
                                    <p className="text-slate-500 text-sm">Real-time status of autonomous agents</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${activeProject.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : activeProject.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                        <span className={`size-2 rounded-full ${activeProject.status === 'running' ? 'bg-green-500 animate-pulse' : activeProject.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                        {activeProject.status.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                        {/* Bot Grid Wrapper */}
                        <div className="flex items-center justify-between mb-4 mt-8">
                            <h3 className="font-bold text-slate-900 dark:text-white">Active Agents</h3>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{recentLogs.length} events received</div>
                        </div>

                        {/* Bot Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {BOTS.map((bot, index) => {
                                const state = getBotState(bot.id, recentLogs);
                                const task = getCurrentTask(bot.id, recentLogs);
                                const agentNumber = (index + 1).toString().padStart(2, '0');

                                return (
                                    <Link key={bot.id} to={`/bot-architecture?bot=${encodeURIComponent(bot.name)}&id=${activeProject.id}`} className={`glass-card rounded-xl p-5 relative overflow-hidden active-glow cursor-pointer transition-transform hover:-translate-y-1 block ${state === 'active' ? 'shadow-lg shadow-primary/10' : 'border-slate-700/50'}`}>
                                        <div className="absolute top-0 right-0 p-3">
                                            <span className={`text-[9px] font-bold tracking-widest uppercase ${state === 'active' ? 'text-primary' : 'text-slate-500'}`}>Agent {agentNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${state === 'active' ? 'bg-primary/20 text-primary shadow-inner' : state === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : state === 'failed' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400'}`}>
                                                <span className="material-symbols-outlined text-lg">{bot.materialIcon}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-sm truncate">{bot.name}</h3>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">Status: {state === 'active' ? 'Active' : state === 'completed' ? 'Done' : state === 'failed' ? 'Failed' : 'Waiting'}</p>
                                            </div>
                                        </div>
                                        <div className={`space-y-3 ${state === 'active' || state === 'completed' ? '' : 'opacity-40'}`}>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${state === 'active' ? 'bg-primary w-4/5 animate-pulse' : state === 'completed' ? 'bg-emerald-500 w-full' : state === 'failed' ? 'bg-red-500 w-full' : 'bg-slate-600 w-0'}`}></div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className={`flex items-center gap-1.5 text-[11px] truncate ${state === 'active' ? 'text-primary animate-pulse' : state === 'completed' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-[12px] shrink-0">{state === 'completed' ? 'check_circle' : state === 'active' ? 'sync' : state === 'failed' ? 'error' : 'circle'}</span>
                                                    <span className="truncate">{task || (state === 'completed' ? 'Task finished' : 'Awaiting tasks')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* CEO Dashboard Section */}
                        <div className="mt-8">
                            <div className="glass-card rounded-xl overflow-hidden border-primary/10">
                                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary">hub</span>
                                        </div>
                                        <h3 className="font-bold">Orchestrator (CEO) Log</h3>
                                    </div>
                                    <button className="text-xs font-bold text-primary hover:underline cursor-pointer">View Full Trace</button>
                                </div>
                                <div className="p-6 font-mono text-sm space-y-3 bg-slate-900/30 max-h-[400px] overflow-y-auto w-full max-w-full">
                                    {recentLogs.length === 0 ? (
                                        <div className="flex gap-4 opacity-50">
                                            <span className="text-slate-500 shrink-0">--:--:--</span>
                                            <span className="text-slate-400 shrink-0">[SYSTEM]</span>
                                            <span className="text-slate-300">Awaiting telemetry from orchestrator...</span>
                                        </div>
                                    ) : (
                                        recentLogs.map((log, idx) => {
                                            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
                                            
                                            // Format styling per event type
                                            let prefix = "[CEO]";
                                            let prefixColor = "text-primary";
                                            let message = "";

                                            switch (log.event) {
                                                case "pipeline-start":
                                                    prefix = "[SYSTEM]";
                                                    prefixColor = "text-green-400";
                                                    message = `Initialized ${activeProject?.id || log.projectId}. Processing input vector.`;
                                                    break;
                                                case "pipeline-complete":
                                                    prefix = "[SYSTEM]";
                                                    prefixColor = "text-emerald-500 font-bold";
                                                    message = `Orchestration complete. Principal Score: ${log.data.score}/10`;
                                                    break;
                                                case "bot-start":
                                                    prefix = `[${(log.data.bot as string).toUpperCase()}]`;
                                                    prefixColor = "text-orange-400";
                                                    message = `Booting autonomous sequence for step: ${log.data.step}`;
                                                    break;
                                                case "bot-complete":
                                                    prefix = `[${(log.data.bot as string).toUpperCase()}]`;
                                                    prefixColor = "text-orange-400";
                                                    message = `Sequence completed. Generated ${log.data.filesGenerated || 0} files.`;
                                                    break;
                                                case "pipeline-error":
                                                case "bot-error":
                                                    prefix = "[ERROR]";
                                                    prefixColor = "text-red-500 font-bold";
                                                    message = `Fault isolated: ${log.data.error}`;
                                                    break;
                                                case "review-start":
                                                    prefix = "[REVIEW]";
                                                    prefixColor = "text-purple-400";
                                                    message = `${log.data.reviewer} engaging static analysis on ${log.data.target}.`;
                                                    break;
                                                case "review-result":
                                                    prefix = "[REVIEW]";
                                                    prefixColor = log.data.approved ? "text-emerald-400" : "text-amber-400";
                                                    message = `${log.data.reviewer} evaluated with score ${log.data.score}. Approved? ${log.data.approved}`;
                                                    break;
                                                default:
                                                    prefix = `[${log.event}]`;
                                                    prefixColor = "text-slate-400";
                                                    message = JSON.stringify(log.data);
                                            }

                                            return (
                                                <div key={idx} className="flex gap-4">
                                                    <span className="text-slate-500 shrink-0">{timeStr}</span>
                                                    <span className={`${prefixColor} shrink-0 w-[100px]`}>{prefix}</span>
                                                    <span className="text-slate-300 break-words">{message}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                    {/* Auto-scroll target */}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>

                {/* Progress Footer (Static Overlay Effect) - only when running */}
                {activeProject?.status === "running" && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none z-20">
                        <Link to="/output" className="glass-card rounded-full px-6 py-3 flex items-center justify-between shadow-2xl active-glow pointer-events-auto cursor-pointer hover:border-primary/60 hover:shadow-primary/20 transition-all bg-slate-900/90 block">
                            <div className="flex items-center gap-3 w-full">
                                <span className="material-symbols-outlined text-primary animate-spin shrink-0">progress_activity</span>
                                <span className="text-sm font-medium flex-1">Orchestrating AI Pipeline</span>
                                <div className="flex gap-4 text-xs font-bold shrink-0">
                                    <span className="text-slate-500">Live Streaming</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrchestratorDashboard;
