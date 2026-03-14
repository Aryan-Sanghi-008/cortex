import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleStartProject = () => {
        navigate(`/orchestrator`);
    };

    return (
        <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 selection:bg-primary/30">
            {/* Background Accents */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none opacity-50"></div>
            <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

            {/* Navigation */}
            <header className="sticky top-0 z-50 px-6 py-4 lg:px-20 glass-panel border-b border-white/5">
                <nav className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg text-white">
                            <span className="material-symbols-outlined text-2xl">neurology</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Cortex</span>
                    </div>
                    <div className="hidden md:flex items-center gap-10">
                        <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Platform</a>
                        <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Pipeline</a>
                        <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Features</a>
                        <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Pricing</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleStartProject}
                            className="hidden sm:flex px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-all glow-subtle cursor-pointer"
                        >
                            Start a Project
                        </button>
                        <div className="size-10 rounded-full border-2 border-primary/20 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBK6BqKA6AhG7QGDLd0TQw6dkEllGOESDZUgCJcrtnOgH_96GTa9MDuv27HaIjzbYA8ZqPcr1w_m1yqh86FUypup_wtzDihX9_qXeArOhkIcLtIs9Cua77zs1zru8rdDghnJ1I9Oy5ZlwkLECEddnOcZFe-Ns0OzXMuGvT5nNFcPmCsL7w59Ik2OF39Zm_3eFPQSlykb0El5o5mxv6IhueXvTQKW-TuUQBkdtuWFS56U1Z12hJcvNQ8TAEAXQ6JdQUmZ3W-gSJpMQ')" }}></div>
                    </div>
                </nav>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20">
                {/* Hero Section */}
                <section className="py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col gap-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider self-start">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Next-Gen Autonomous Systems
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                            Your AI Engineering Team, <span className="text-primary">Orchestrated.</span>
                        </h1>
                        <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                            Deploy a multi-agent system that autonomously handles planning, architecture, and execution with unparalleled precision.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={handleStartProject}
                                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all text-lg glow-subtle cursor-pointer"
                            >
                                Start a Project
                            </button>
                            <button className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold rounded-xl transition-all text-lg cursor-pointer">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <div className="aspect-video rounded-2xl overflow-hidden glass-panel border border-primary/20 glow-subtle shadow-2xl">
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background-dark to-primary/5 p-1">
                                <div className="w-full h-full rounded-xl bg-slate-900 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[url('https://placeholder.pics/svg/800')] bg-cover opacity-40 mix-blend-overlay"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="p-4 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-sm shadow-[0_0_15px_rgba(37,157,244,0.3)]">
                                            <span className="material-symbols-outlined text-4xl text-primary leading-none">play_arrow</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pipeline Section */}
                <section className="py-20 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-4">The Pipeline</h2>
                        <p className="text-slate-600 dark:text-slate-400">Streamlining complex engineering through structured agent coordination.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Progress Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                        
                        {/* Step 1 */}
                        <div className="relative flex flex-col items-center text-center gap-6">
                            <div className="z-10 size-24 rounded-2xl glass-panel flex items-center justify-center text-primary glow-subtle">
                                <span className="material-symbols-outlined text-4xl">content_copy</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Planning</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Strategic objective definition and roadmap generation.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative flex flex-col items-center text-center gap-6">
                            <div className="z-10 size-24 rounded-2xl glass-panel flex items-center justify-center text-primary glow-subtle">
                                <span className="material-symbols-outlined text-4xl">layers</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Architecture</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">High-level system design and dependency mapping.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative flex flex-col items-center text-center gap-6">
                            <div className="z-10 size-24 rounded-2xl glass-panel flex items-center justify-center text-primary glow-subtle">
                                <span className="material-symbols-outlined text-4xl">memory</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Execution</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Autonomous code generation and implementation.</p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative flex flex-col items-center text-center gap-6">
                            <div className="z-10 size-24 rounded-2xl glass-panel flex items-center justify-center text-primary glow-subtle">
                                <span className="material-symbols-outlined text-4xl">check_circle</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Review</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Automated validation, testing, and QA cycles.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-16">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">Key Features</h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400">
                                Experience the next generation of AI engineering with our core technological pillars designed for reliability and scale.
                            </p>
                        </div>
                        <button className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all cursor-pointer">
                            View all capabilities <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature Card 1 */}
                        <div className="group p-8 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all duration-300">
                            <div className="mb-6 p-3 bg-primary/10 rounded-xl inline-block text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">compress</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Context Compression</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Optimize large-scale prompts for maximum efficiency without losing critical intent or semantic depth.
                            </p>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="group p-8 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all duration-300">
                            <div className="mb-6 p-3 bg-primary/10 rounded-xl inline-block text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">database</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Memory Management</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Persistent state management across agent sessions ensures continuity and deep situational awareness.
                            </p>
                        </div>

                        {/* Feature Card 3 */}
                        <div className="group p-8 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all duration-300">
                            <div className="mb-6 p-3 bg-primary/10 rounded-xl inline-block text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">shield</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Zod Validation</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Strict schema adherence for reliable structured outputs, ensuring every response is type-safe and valid.
                            </p>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="mb-32">
                    <div className="relative p-12 lg:p-20 rounded-[2rem] overflow-hidden bg-slate-900 border border-primary/20">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
                        
                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Ready to scale your engineering output?</h2>
                            <p className="text-slate-400 text-lg mb-10">
                                Join hundreds of high-growth teams using Cortex to automate their architecture and development lifecycle.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button 
                                    onClick={handleStartProject}
                                    className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all glow-subtle cursor-pointer"
                                >
                                    Start a Project
                                </button>
                                <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-md transition-all cursor-pointer">
                                    Talk to an Expert
                                </button>
                            </div>
                        </div>

                        <div className="absolute -bottom-20 -right-20 size-80 bg-primary/20 blur-[100px] rounded-full"></div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-background-dark border-t border-slate-800 py-12 px-6 lg:px-20 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">neurology</span>
                        <span className="text-xl font-bold tracking-tight text-white uppercase">Cortex</span>
                    </div>
                    <div className="flex gap-8 text-sm text-slate-500">
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Github</a>
                        <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                    </div>
                    <p className="text-sm text-slate-500">© 2024 Cortex AI Systems Inc.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
