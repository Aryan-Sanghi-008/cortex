import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { api } from '../utils/api';
import { PreviewPanel } from '../components/PreviewPanel';
import { DeployPanel } from '../components/DeployPanel';

interface FileItem {
    path: string;
    content: string;
    language: string;
}

function extractFiles(output: any): FileItem[] {
    if (!output) return [];
    const files: FileItem[] = [];
    const codeKeys = ["frontendCode", "backendCode", "databaseCode", "qaCode", "devopsCode"];

    for (const key of codeKeys) {
        const codeOutput = output[key];
        if (codeOutput?.files) {
            for (const f of codeOutput.files) {
                files.push({ path: f.path, content: f.content, language: f.language });
            }
        }
    }
    return files;
}

function getMaterialIcon(lang: string): string {
    const icons: Record<string, string> = {
        typescript: "code", tsx: "code", javascript: "code",
        css: "palette", json: "data_object", prisma: "schema",
        yaml: "settings", yml: "settings", dockerfile: "container",
        markdown: "article", sql: "database", env: "security", html: "html"
    };
    return icons[lang?.toLowerCase()] ?? "description";
}

const FinalProjectOutput: React.FC = () => {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('id');
    const { activeProject, setActiveProjectId } = useProject();

    // Set active project if provided directly to URL
    React.useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) {
            setActiveProjectId(projectId);
        }
    }, [projectId, activeProject, setActiveProjectId]);

    const [isDownloading, setIsDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState<"code" | "preview" | "deploy">("code");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Extracted files from the active project's output
    const files = useMemo(() => extractFiles(activeProject?.output), [activeProject?.output]);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

    // Filter files
    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return files;
        return files.filter(f => f.path.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [files, searchQuery]);

    // Select first file by default when files load
    useEffect(() => {
        if (files.length > 0 && !selectedFile) {
            setSelectedFile(files[0]);
        }
    }, [files, selectedFile]);

    const handleTabSwitch = (tab: "code" | "preview" | "deploy") => {
        setActiveTab(tab);
        setTimeout(() => {
            document.getElementById("interactive-viewer-section")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    const handleDownload = async () => {
        if (!activeProject) return;
        setIsDownloading(true);
        try {
            // First check if a checkout URL is needed (gating logic)
            const result = await api.createDownloadCheckout(activeProject.id);
            if (result.url) {
                // Redirect to stripe checkout
                window.location.href = result.url;
            } else if (result.alreadyPaid) {
                // Trigger download directly via the browser
                window.location.href = api.getDownloadUrl(activeProject.id);
            }
        } catch (e) {
            console.error("Failed to initiate download", e);
            alert("Failed to initiate download. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header */}
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

            <main className="flex-1 px-4 md:px-10 lg:px-40 py-8">
                <div className="max-w-[1000px] mx-auto flex flex-col gap-8">
                    {/* Hero Section / Status */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Execution Successful
                            </div>
                            <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                {activeProject?.productIdea ? activeProject.productIdea : "Project Bundle Ready"}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl">
                                The Cortex engine has finalized your architectural blueprint and technical documentation. All assets are verified and bundled.
                            </p>
                        </div>
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading || !activeProject}
                            className="flex flex-1 md:flex-none w-full md:w-auto items-center justify-center gap-2 px-6 h-12 bg-primary text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                        >
                            {isDownloading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">download</span>}
                            {activeProject?.paidAt ? "Download Bundle" : "Unlock & Download (₹100)"}
                        </button>
                    </div>

                    {/* CTO Review Scorecard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 flex flex-col gap-4 rounded-xl p-8 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-widest">Validation Status</p>
                                    <h3 className="text-slate-900 dark:text-white text-xl font-bold mt-1">Principal Engineer CTO Review</h3>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                    PASSED
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-5xl font-black text-slate-900 dark:text-white">8.5</span>
                                <span className="text-2xl text-slate-400 font-medium">/ 10</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                                <div className="bg-primary h-full w-[85%] rounded-full"></div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mt-2">
                                "The generated architecture demonstrates strong modularity and adheres to modern cloud-native patterns. High marks for security implementation and type-safety across the stack."
                            </p>
                        </div>

                        {/* Mini Stats */}
                        <div className="flex flex-col gap-4">
                            <div className="flex-1 rounded-xl p-6 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-primary mb-2 text-3xl">description</span>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">Files Generated</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{files.length || 0}</p>
                            </div>
                            <div className="flex-1 rounded-xl p-6 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-primary mb-2 text-3xl">speed</span>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">Deploy Status</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white truncate">
                                    {activeProject?.deployUrl ? <a href={activeProject.deployUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">{new URL(activeProject.deployUrl).hostname}</a> : "Not Deployed"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
                        {/* Generated Files List */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-slate-400">folder_open</span>
                                <h2 className="text-slate-900 dark:text-white text-xl font-bold">Bundle Manifest</h2>
                            </div>

                            <div className="flex flex-col bg-slate-100 dark:bg-slate-800/30 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[600px] flex-shrink-0">
                                {/* Search */}
                                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Search files..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                </div>
                                {/* File Tree */}
                                <div className="overflow-y-auto">
                                    {filteredFiles.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-sm italic">
                                            No files found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredFiles.map((file, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedFile(file)}
                                                className={`flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                                                    selectedFile?.path === file.path 
                                                        ? 'bg-primary/10 border-l-4 border-l-primary dark:bg-primary/20' 
                                                        : 'border-l-4 border-l-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className={`material-symbols-outlined text-lg shrink-0 ${selectedFile?.path === file.path ? 'text-primary' : 'text-slate-400'}`}>
                                                        {getMaterialIcon(file.language)}
                                                    </span>
                                                    <span className={`text-sm font-medium truncate ${selectedFile?.path === file.path ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {file.path.split('/').pop()}
                                                    </span>
                                                </div>
                                                <span className={`material-symbols-outlined text-slate-400 transition-opacity ${selectedFile?.path === file.path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    visibility
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Viewer (Code / Preview / Deploy) */}
                        <div id="interactive-viewer-section" className="lg:col-span-7 flex flex-col gap-4 scroll-mt-[120px]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                                    <button 
                                        onClick={() => setActiveTab('code')} 
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                        Asset Viewer
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('preview')} 
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'preview' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">preview</span>
                                        Live App
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('deploy')} 
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'deploy' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                                        Deployment
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">Generated by Cortex AI</div>
                            </div>

                            {activeTab === 'code' && (
                                <div className="bg-white dark:bg-[#0d151c] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-200">
                                    {/* Browser-like top bar */}
                                    <div className="bg-slate-100 dark:bg-slate-900/80 px-4 py-2 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
                                        <div className="flex gap-1.5 cursor-pointer">
                                            <div className="size-2.5 rounded-full bg-red-400/50 hover:bg-red-400"></div>
                                            <div className="size-2.5 rounded-full bg-amber-400/50 hover:bg-amber-400"></div>
                                            <div className="size-2.5 rounded-full bg-emerald-400/50 hover:bg-emerald-400"></div>
                                        </div>
                                        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-md py-1 px-3 text-[10px] text-slate-500 text-center truncate select-all">
                                            {selectedFile ? selectedFile.path : 'No file selected'}
                                        </div>
                                    </div>

                                    {/* Code Content */}
                                    <div className="p-4 overflow-y-auto w-full h-full bg-[#fafafa] dark:bg-[#0d151c]">
                                        {selectedFile ? (
                                            <pre className="font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                                {selectedFile.content.split('\n').map((line, i) => (
                                                    <div key={i} className="flex hover:bg-slate-200/50 dark:hover:bg-slate-800/50 px-2 rounded group">
                                                        <span className="inline-block w-10 text-right mr-4 shrink-0 select-none tabular-nums text-slate-400 dark:text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            {i + 1}
                                                        </span>
                                                        <span className="flex-1 break-all">{line || " "}</span>
                                                    </div>
                                                ))}
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                                                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">description</span>
                                                <p>Select a file from the manifest to view its source code.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'preview' && (
                                <div className="animate-in fade-in zoom-in-95 duration-200 h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-[#0d151c]">
                                    <PreviewPanel projectId={activeProject?.id || ""} />
                                </div>
                            )}

                            {activeTab === 'deploy' && (
                                <div className="animate-in fade-in zoom-in-95 duration-200 h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-[#0d151c]">
                                    <DeployPanel projectId={activeProject?.id || ""} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm pb-10">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
                        <span>Powered by Cortex AI Engine</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-primary transition-colors">Documentation</a>
                        <a href="#" className="hover:text-primary transition-colors">System Health</a>
                        <a href="#" className="hover:text-primary transition-colors">Support</a>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default FinalProjectOutput;
