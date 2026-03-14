

// Define the core structures from our backend setup
export interface ProjectRecord {
  id: string;
  productIdea: string;
  images: string[];
  status: "queued" | "running" | "completed" | "failed";
  output?: any;
  error?: string;
  createdAt: string;
  previewUrl?: string;
  deployUrl?: string;
  deployStatus?: string;
  paidAt?: string;
}

export interface BotEvent {
  event:
    | "pipeline-start"
    | "pipeline-complete"
    | "pipeline-error"
    | "step-start"
    | "step-complete"
    | "bot-start"
    | "bot-complete"
    | "bot-error"
    | "review-start"
    | "review-result"
    | "correction-loop"
    | "file-generated";
  projectId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// In production / Vite proxy, this will route correctly. Standard fallback for dev.
const API_BASE = "http://localhost:3001/api";

export const api = {
    // ---- Projects ----
    async createProject(productIdea: string, images?: string[]): Promise<{ projectId: string; status: string }> {
        const res = await fetch(`${API_BASE}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIdea, images })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getProject(id: string): Promise<ProjectRecord> {
        const res = await fetch(`${API_BASE}/projects/${id}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async listProjects(): Promise<ProjectRecord[]> {
        const res = await fetch(`${API_BASE}/projects`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // ---- Previews ----
    async startPreview(id: string): Promise<{ previewUrl: string; port: number }> {
        const res = await fetch(`${API_BASE}/projects/${id}/preview`, { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async stopPreview(id: string): Promise<{ status: string }> {
        const res = await fetch(`${API_BASE}/projects/${id}/preview`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getPreviewStatus(id: string): Promise<any> {
        const res = await fetch(`${API_BASE}/projects/${id}/preview/status`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // ---- Downloads and Payments ----
    async getPaymentStatus(id: string): Promise<{ paid: boolean; paidAt: string | null }> {
        const res = await fetch(`${API_BASE}/projects/${id}/payment-status`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async createDownloadCheckout(id: string): Promise<{ url?: string; alreadyPaid?: boolean }> {
        const res = await fetch(`${API_BASE}/projects/${id}/download-checkout`, { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    
    // Direct link to download route
    getDownloadUrl(id: string): string {
        return `${API_BASE}/projects/${id}/download`;
    }
};
