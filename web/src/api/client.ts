const API_BASE = '/api';

export interface ProjectRecord {
  id: string;
  productIdea: string;
  images: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  createdAt: string;
}

export async function createProject(productIdea: string, images: string[] = []): Promise<{ projectId: string }> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIdea, images }),
  });
  if (!res.ok) throw new Error(`Failed to create project: ${res.statusText}`);
  return res.json();
}

export async function getProject(id: string): Promise<ProjectRecord> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error(`Project not found: ${res.statusText}`);
  return res.json();
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error(`Failed to list projects: ${res.statusText}`);
  return res.json();
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('images', f));
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.images;
}
