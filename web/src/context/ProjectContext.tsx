import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { api, ProjectRecord, BotEvent } from '../utils/api';

interface ProjectContextType {
    projects: ProjectRecord[];
    activeProject: ProjectRecord | null;
    setActiveProjectId: (id: string | null) => void;
    recentLogs: BotEvent[];
    refreshProjects: () => Promise<void>;
    refreshActiveProject: () => Promise<void>;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<ProjectRecord[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
    
    // WS items
    const [recentLogs, setRecentLogs] = useState<BotEvent[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);

    const refreshProjects = async () => {
        try {
            const data = await api.listProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        }
    };

    const refreshActiveProject = async () => {
        if (!activeProjectId) return;
        try {
            const data = await api.getProject(activeProjectId);
            setActiveProject(data);
        } catch (error) {
            console.error(`Failed to fetch project ${activeProjectId}:`, error);
        }
    };

    // Load initial list
    useEffect(() => {
        refreshProjects();
    }, []);

    // Monitor active project changes
    useEffect(() => {
        if (activeProjectId) {
            refreshActiveProject();
        } else {
            setActiveProject(null);
            setRecentLogs([]); // Clear logs when switching
        }
    }, [activeProjectId]);

    // Setup WebSocket globally for active project listener
    useEffect(() => {
        const connectWs = () => {
            setConnectionStatus('connecting');
            const ws = new WebSocket("ws://localhost:3001/ws");

            ws.onopen = () => {
                setConnectionStatus('connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data: BotEvent = JSON.parse(event.data);
                    
                    // Always append logs
                    setRecentLogs((prev) => [...prev, data]);

                    // If it pertains to the active project, maybe auto-refresh 
                    if (data.projectId === activeProjectId) {
                        if (data.event === "pipeline-complete" || data.event === "pipeline-error" || data.event === "bot-complete") {
                            refreshActiveProject();
                            refreshProjects(); // Update statuses in the sidebar
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            };

            ws.onclose = () => {
                setConnectionStatus('disconnected');
                // Reconnect loop if wanted
                setTimeout(connectWs, 5000); 
            };

            ws.onerror = () => {
                setConnectionStatus('error');
            };

            wsRef.current = ws;
        };

        connectWs();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [activeProjectId]);


    return (
        <ProjectContext.Provider value={{ 
            projects, 
            activeProject, 
            setActiveProjectId, 
            recentLogs, 
            refreshProjects, 
            refreshActiveProject,
            connectionStatus 
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
};
