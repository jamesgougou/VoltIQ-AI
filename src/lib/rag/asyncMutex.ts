/**
 * Serializes async work so only one critical section runs at a time.
 * Used to ensure a single RAG storage writer on disk (Windows rename-safe).
 */
export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previous = this.tail;
    this.tail = previous.then(() => gate).catch(() => gate);

    await previous.catch(() => undefined);

    try {
      return await task();
    } finally {
      release();
    }
  }
}
