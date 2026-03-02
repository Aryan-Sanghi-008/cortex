export class GlobalRateLimiter {
  private queue: (() => void)[] = [];
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(requestsPerMinute: number) {
    this.maxTokens = 1; // Strict pacing: 1 token at a time
    this.tokens = 1;
    // Calculate interval to evenly distribute the RPM
    this.refillIntervalMs = 60000 / requestsPerMinute;
  }

  private startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tokens = this.maxTokens;
      this.processQueue();
      if (this.queue.length === 0) {
        clearInterval(this.timer!);
        this.timer = null;
      }
    }, this.refillIntervalMs);
  }

  private processQueue() {
    if (this.queue.length > 0 && this.tokens > 0) {
      this.tokens--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }

  async acquire(): Promise<void> {
    if (this.tokens > 0 && this.queue.length === 0) {
      this.tokens--;
      this.startTimer();
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.startTimer();
    });
  }
}
