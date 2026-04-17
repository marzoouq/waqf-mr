/**
 * غلاف آمن لـ localStorage — يمنع تكرار try/catch في كل مكون
 */

/** قراءة قيمة من localStorage مع تحليل JSON آمن */
export function safeGet<T = string>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    // إذا كان الـ fallback نص عادي لا نحاول JSON.parse
    if (typeof fallback === 'string') return raw as unknown as T;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** كتابة قيمة إلى localStorage — JSON.stringify تلقائياً للكائنات */
export function safeSet(key: string, value: unknown): void {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch {
    /* التخزين ممتلئ أو غير متاح — صامت */
  }
}

/** حذف مفتاح من localStorage بشكل آمن */
export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* صامت */
  }
}

/** قراءة قيمة من sessionStorage مع تحليل JSON آمن */
export function safeSessionGet<T = string>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return fallback;
    if (typeof fallback === 'string') return raw as unknown as T;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** كتابة قيمة إلى sessionStorage — JSON.stringify تلقائياً للكائنات */
export function safeSessionSet(key: string, value: unknown): void {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    sessionStorage.setItem(key, serialized);
  } catch {
    /* صامت */
  }
}

/** حذف مفتاح من sessionStorage بشكل آمن */
export function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* صامت */
  }
}
