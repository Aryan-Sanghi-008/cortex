import React from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';

const Sidebar: React.FC = () => {
    const { projects } = useProject();
    return (
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-background-light dark:bg-background-dark/50 overflow-y-auto hidden md:flex h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Cortex</h1>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Mission Control</h3>
                        <nav className="space-y-1">
                            <a href="#" className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-medium">
                                <span className="material-symbols-outlined">dashboard</span> Dashboard
                            </a>
                            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <span className="material-symbols-outlined">settings_input_component</span> Bot Config
                            </a>
                            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <span className="material-symbols-outlined">analytics</span> Analytics
                            </a>
                        </nav>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Past Memory</h3>
                            <span className="material-symbols-outlined text-sm text-slate-500 cursor-pointer hover:text-primary transition-colors">history</span>
                        </div>
                        <div className="space-y-3">
                            {projects.length === 0 ? (
                                <p className="text-xs text-slate-500 italic p-3">No past missions found.</p>
                            ) : (
                                projects.slice(0, 5).map((project) => (
                                    <Link key={project.id} to={`/orchestrator?id=${project.id}`} className="block p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/5 hover:border-primary/50 cursor-pointer transition-colors group">
                                        <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors truncate">
                                            {project.productIdea || "Unnamed Mission"}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-primary block">
                                                {new Date(project.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${project.status === 'completed' ? 'text-emerald-500' : project.status === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
                                                {project.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 p-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCe3V_eg16RIYemtrGyGruHHESjFOA3bXsXSp9SYtzVasXpwB-yxzlvaDRBhZQBDgwn7le-mxGhFf4aYMePS1nSFyZegzVFwUr8EmRjDTvAigOVp5pRJxcEv7WqdZCi6N9FVAjvWAvhblH8G47q88DeBnzGfzztqvrclPyNy7Lz6NUX9_S0TD6Z8DgiCG7LgbIVDKvERmWlwltq9p_MpUqFLV0BHV7FcEIr3jwxGcJ8w3pO_6-vhj_cryufQuRCbSU_HSfiMNDIQQ')" }}></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Dev Operator</p>
                        <p className="text-xs text-slate-500 truncate">Admin Access</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">more_vert</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
