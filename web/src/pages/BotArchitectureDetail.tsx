import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { BotEvent } from '../utils/api';

// Reusing BotInfo map to get bot ID from name
const BOTS = [
    { id: "DocGenerator", name: "Doc Gen" },
    { id: "ProductOwner", name: "Product Owner" },
    { id: "TechStack", name: "Tech Stack" },
    { id: "ResourcePlanner", name: "Resources" },
    { id: "Frontend-Lead", name: "Frontend Lead" },
    { id: "Frontend-Devs", name: "Frontend Devs" },
    { id: "Backend-Lead", name: "Backend Lead" },
    { id: "Backend-Devs", name: "Backend Devs" },
    { id: "Database-Lead", name: "DB Lead" },
    { id: "Data-Dev", name: "Data Dev" },
    { id: "QA-Lead", name: "QA Lead" },
    { id: "QA-Devs", name: "QA Devs" },
    { id: "DevOps", name: "DevOps" },
    { id: "Principal-Engineer", name: "Principal" }
];

const BotArchitectureDetail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const botName = searchParams.get('bot') || 'Product Owner';
    const projectId = searchParams.get('id') || '';

    const { activeProject, recentLogs } = useProject();

    const botId = useMemo(() => {
        const found = BOTS.find(b => b.name === botName);
        return found ? found.id : botName.replace(/\s+/g, '');
    }, [botName]);

    const botEvents = useMemo(() => {
        return recentLogs.filter(log => log.data?.bot === botId || log.data?.reviewer === botId);
    }, [recentLogs, botId]);

    const isRunning = useMemo(() => {
        if (botEvents.length === 0) return false;
        const last = botEvents[botEvents.length - 1];
        return last.event !== 'bot-complete' && last.event !== 'bot-error' && last.event !== 'review-result';
    }, [botEvents]);

    const status = useMemo(() => {
        if (botEvents.length === 0) return 'Waiting';
        const last = botEvents[botEvents.length - 1];
        if (last.event === 'bot-error') return 'Failed';
        if (last.event === 'bot-complete' || last.event === 'review-result') return 'Success';
        return 'Active';
    }, [botEvents]);

    const botResultData = useMemo(() => {
        const completeEvent = botEvents.find(e => e.event === 'bot-complete' || e.event === 'review-result');
        return completeEvent ? completeEvent.data : null;
    }, [botEvents]);

    const handleRunAgain = () => {
        // No-op for frontend demo purposes
        console.log("Re-trigger bot execution", botId);
    };

    return (
        <div className="relative flex min-h-[calc(100vh-64px)] w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-8 relative z-10">
                {/* Breadcrumbs and Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <Link to={`/orchestrator${projectId ? `?id=${projectId}` : ''}`} className="hover:text-primary transition-colors">Bots</Link>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <a href="#" className="hover:text-primary transition-colors">{botName}</a>
                        <span className="material-symbols-outlined text-xs text-primary">chevron_right</span>
                        <span className="text-slate-900 dark:text-white">Architecture</span>
                    </nav>

                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-sm">settings</span>
                            Configure
                        </button>
                        <button 
                            onClick={handleRunAgain}
                            disabled={isRunning || status === 'Waiting'}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                        >
                            {isRunning ? (
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                            )}
                            {isRunning ? "Running..." : "Run Again"}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{botName}</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Detailed execution trace and runtime outputs</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`glass-panel rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden group transition-colors duration-300 ${status === 'Success' ? 'hover:border-emerald-500/30' : status === 'Failed' ? 'hover:border-red-500/30' : 'hover:border-primary/30'}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className={`material-symbols-outlined text-5xl ${status === 'Success' ? 'text-emerald-500' : status === 'Failed' ? 'text-red-500' : status === 'Active' ? 'text-primary' : 'text-slate-500'}`}>
                                {status === 'Success' ? 'check_circle' : status === 'Failed' ? 'error' : status === 'Active' ? 'sync' : 'hourglass_empty'}
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Status</p>
                        <div className="flex items-end gap-2">
                            <p className="text-slate-900 dark:text-white text-3xl font-bold">{status}</p>
                            {status === 'Success' && (
                                <span className="text-emerald-500 text-sm font-bold mb-1 flex items-center">
                                    <span className="material-symbols-outlined text-xs">arrow_upward</span> 100%
                                </span>
                            )}
                        </div>
                        <div className={`h-1 w-full rounded-full mt-2 ${status === 'Success' ? 'bg-emerald-500/20' : status === 'Failed' ? 'bg-red-500/20' : status === 'Active' ? 'bg-primary/20' : 'bg-slate-700/20'}`}>
                            <div className={`h-1 rounded-full transition-all duration-1000 ${status === 'Success' ? 'bg-emerald-500 w-full' : status === 'Failed' ? 'bg-red-500 w-full' : status === 'Active' ? 'bg-primary w-3/4 animate-pulse' : 'bg-slate-500 w-0'}`}></div>
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden group hover:border-primary/30 transition-colors duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-5xl text-primary">analytics</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Memory / Context</p>
                        <div className="flex items-end gap-2">
                            <p className="text-slate-900 dark:text-white text-3xl font-bold">{botResultData ? '4.2 MB' : '---'}</p>
                            {botResultData && (
                                <span className="text-emerald-500 text-sm font-bold mb-1 flex items-center">
                                    <span className="material-symbols-outlined text-xs">trending_down</span> 1.2%
                                </span>
                            )}
                        </div>
                        <div className="h-1 w-full bg-primary/20 rounded-full mt-2">
                            <div className="h-1 bg-primary rounded-full transition-all duration-1000 delay-150" style={{ width: botResultData ? '42%' : '0%' }}></div>
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-5xl text-amber-500">bolt</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Engine Model</p>
                        <div className="flex items-end gap-2">
                            <p className="text-slate-900 dark:text-white text-2xl font-bold text-truncate line-clamp-1 break-all">Gemini</p>
                            <span className="text-amber-500 text-sm font-bold mb-1 flex items-center">
                                <span className="material-symbols-outlined text-xs">speed</span> fast
                            </span>
                        </div>
                        <div className="h-1 w-full bg-amber-500/20 rounded-full mt-2">
                            <div className="h-1 bg-amber-500 rounded-full transition-all duration-1000 delay-300" style={{ width: '85%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                    {/* Left Column: Trace */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-amber-500 text-lg">history</span>
                                Execution Trace
                            </h4>
                            <div className="relative flex flex-col gap-6 pl-5 border-l-2 border-slate-200 dark:border-slate-700 ml-2 py-2">
                                {botEvents.length === 0 ? (
                                    <div className="text-sm text-slate-500 italic">No events recorded for this agent yet.</div>
                                ) : (
                                    botEvents.map((event, idx) => {
                                        const isLast = idx === botEvents.length - 1;
                                        const eventTime = new Date(event.timestamp);
                                        const prevTime = idx > 0 ? new Date(botEvents[idx - 1].timestamp) : eventTime;
                                        const durationMs = eventTime.getTime() - prevTime.getTime();
                                        const durationStr = durationMs > 0 ? `${durationMs}ms` : '';

                                        let iconColor = "bg-primary text-primary";
                                        let title = "Processing...";
                                        let subtitle = "";

                                        if (event.event === "bot-start") {
                                            iconColor = isRunning && isLast ? "bg-primary ring-primary/30 animate-pulse" : "bg-emerald-500";
                                            title = `Step: ${event.data.step || "Initialize"}`;
                                            subtitle = isRunning && isLast ? "In progress..." : `Started at ${eventTime.toLocaleTimeString()}`;
                                        } else if (event.event === "bot-complete" || event.event === "review-result") {
                                            iconColor = "bg-emerald-500";
                                            title = event.event === "review-result" ? "Review Completed" : "Task Completed";
                                            subtitle = `Success ${durationStr ? `(+${durationStr})` : ''}`;
                                        } else if (event.event === "bot-error") {
                                            iconColor = "bg-red-500";
                                            title = "Execution Failed";
                                            subtitle = "Error isolated";
                                        } else if (event.event === "file-generated") {
                                            iconColor = "bg-slate-500";
                                            title = `Generated ${event.data.fileName}`;
                                        } else {
                                            title = event.event;
                                        }

                                        return (
                                            <div key={idx} className="relative group">
                                                <div className={`absolute -left-[27px] top-1 size-4 rounded-full ring-4 ring-background-dark group-hover:scale-125 transition-transform ${iconColor.split(' ')[0]}`}></div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white break-words">{title}</p>
                                                <p className="text-[10px] text-slate-500">{subtitle}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Generated Files Preview (if applicable) */}
                        {botEvents.some(e => e.event === 'file-generated' || e.data?.filesGenerated) && (
                           <div className="glass-panel rounded-xl overflow-hidden border border-slate-700/50 hover:border-primary/30 transition-colors">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/5 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">folder_open</span>
                                        Generated Assets
                                    </span>
                                </div>
                                <div className="p-4 flex flex-col gap-3 max-h-48 overflow-y-auto">
                                    {botEvents.filter(e => e.event === 'file-generated').length > 0 ? (
                                        botEvents.filter(e => e.event === 'file-generated').map((e, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent cursor-pointer group">
                                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">description</span>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{String(e.data.fileName || 'unknown_file')}</p>
                                                    <p className="text-[10px] text-slate-500">Asset generated</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-500 italic p-2">Reference generated assets in the master bundle</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Code and Diagnostics */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl bg-[#0d141b] font-mono text-sm leading-relaxed relative flex flex-col h-full min-h-[400px]">
                            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                                <div className="flex gap-1.5">
                                    <div className="size-3 rounded-full bg-red-500/80"></div>
                                    <div className="size-3 rounded-full bg-amber-500/80"></div>
                                    <div className="size-3 rounded-full bg-emerald-500/80"></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{botResultData ? 'validated_output.json' : 'waiting_for_output.log'}</span>
                                    {botResultData && (
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(JSON.stringify(botResultData, null, 2))}
                                            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 overflow-auto flex-1 text-[#a1a1aa] selection:bg-primary/30">
                                {botResultData ? (
                                    <pre className="text-slate-300 m-0">
                                        <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(botResultData, null, 2)) }} />
                                    </pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full opacity-50 flex-col gap-4">
                                        <span className="material-symbols-outlined text-4xl animate-pulse">terminal</span>
                                        <p>Awaiting raw payload output from bot termination...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <div className="flex-1 glass-panel rounded-xl p-4 flex items-center justify-between border-slate-700/50 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${status === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                                        <span className="material-symbols-outlined">verified</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Review Status</p>
                                        <p className="text-[10px] text-slate-500">{status === 'Success' ? 'Strict mode passed' : 'Pending'}</p>
                                    </div>
                                </div>
                                {status === 'Success' && <span className="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>}
                            </div>

                            <div className="flex-1 glass-panel rounded-xl p-4 flex items-center justify-between border-slate-700/50 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${botResultData ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-400'}`}>
                                        <span className="material-symbols-outlined">storage</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Context Token</p>
                                        <p className="text-[10px] text-slate-500">{botResultData ? '~1,240 tokens used' : 'Calculating...'}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">82% AVAIL.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Simple syntax highlighter for JSON
function syntaxHighlight(json: string) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'text-amber-400'; // number/boolean
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-blue-400'; // key
            } else {
                cls = 'text-emerald-400'; // string
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-pink-400';
        } else if (/null/.test(match)) {
            cls = 'text-slate-400';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

export default BotArchitectureDetail;
