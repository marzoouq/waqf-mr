/**
 * Cache بسيط في الذاكرة بحد أقصى للحجم وسياسة FIFO + TTL.
 * يُستخدم لتقليل استعلامات DB المتكررة في المساعد الذكي.
 */
export class SimpleCache {
  private cache = new Map<string, { data: string; ts: number }>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttlMs = 60_000, maxSize = 50) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, ts: Date.now() });
  }
}

export const dataCache = new SimpleCache();
