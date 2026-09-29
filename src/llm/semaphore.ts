type Priority = 'interactive' | 'background';

export class RequestSemaphore {
  private active = 0;
  private effectiveMax: number;
  private successStreak = 0;
  private readonly queues: Record<Priority, Array<() => void>> = {
    interactive: [],
    background: [],
  };

  constructor(private max: number) {
    this.effectiveMax = max;
  }

  setMax(max: number): void {
    this.max = max;
    this.effectiveMax = Math.min(this.effectiveMax, max);
  }

  onRateLimit(): void {
    this.effectiveMax = Math.max(1, Math.floor(this.effectiveMax / 2));
  }

  onSuccess(): void {
    this.successStreak++;
    if (this.successStreak >= 20) {
      this.successStreak = 0;
      this.effectiveMax = Math.min(this.max, this.effectiveMax + 1);
    }
  }

  async acquire(priority: Priority): Promise<() => void> {
    if (this.active < this.effectiveMax) {
      this.active++;
      return () => this.release();
    }
    await new Promise<void>((resolve) => {
      this.queues[priority].push(resolve);
    });
    this.active++;
    return () => this.release();
  }

  private release(): void {
    this.active--;
    const next =
      this.queues.interactive.shift() ??
      this.queues.background.shift() ??
      this.queues.interactive.shift();
    if (next) next();
  }
}
