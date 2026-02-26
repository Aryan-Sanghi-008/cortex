import { useState, useCallback, useRef, useEffect } from 'react';
import { createProject, getProject, uploadImages, type ProjectRecord } from '../api/client';

export function useProject() {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProject = useCallback(async (productIdea: string, files?: FileList) => {
    setLoading(true);
    setError(null);

    try {
      let images: string[] = [];
      if (files && files.length > 0) {
        images = await uploadImages(files);
      }

      const { projectId } = await createProject(productIdea, images);

      // Start polling for status
      const poll = setInterval(async () => {
        try {
          const p = await getProject(projectId);
          setProject(p);
          if (p.status === 'completed' || p.status === 'failed') {
            clearInterval(poll);
            setLoading(false);
          }
        } catch {}
      }, 2000);

      pollRef.current = poll;
      setProject({ id: projectId, productIdea, images, status: 'queued', createdAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start project');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return { project, loading, error, startProject };
}
