import React from 'react';

const TopNavBar: React.FC = () => {
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 md:px-10 py-3 bg-background-light dark:bg-background-dark sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <div className="size-8 flex items-center justify-center rounded-lg bg-primary text-white">
                    <span className="material-symbols-outlined text-2xl">neurology</span>
                </div>
                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Cortex</h2>
            </div>
            <div className="flex gap-3">
                <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
                <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined">account_circle</span>
                </button>
            </div>
        </header>
    );
};

export default TopNavBar;
