/**
 * Concurrency limiter — runs async tasks with a max parallelism.
 * Prevents exceeding API rate limits (e.g., Gemini free tier: 15 RPM).
 *
 * Usage:
 *   const results = await runWithConcurrency(tasks, 5);
 */

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  // Spawn up to maxConcurrent workers
  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
