export class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next: Promise<T> = prev.then(fn, fn);
    const cleanup: Promise<void> = next
      .then(() => { this.locks.delete(key); }, () => { this.locks.delete(key); });
    this.locks.set(key, cleanup);
    return next;
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  get activeLocks(): number {
    return this.locks.size;
  }
}

export const mutex = new KeyedMutex();
