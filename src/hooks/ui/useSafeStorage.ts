/**
 * بديل آمن لـ localStorage — يستخدم useSyncExternalStore
 * يوفر تزامن تلقائي بين التبويبات وتحديثات React متوافقة مع Concurrent Mode
 */
import { useSyncExternalStore, useCallback } from 'react';

// مستمعون لكل مفتاح
const listeners = new Map<string, Set<() => void>>();

function notifyKey(key: string) {
  listeners.get(key)?.forEach(fn => fn());
}

// مزامنة بين التبويبات عبر حدث storage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key) notifyKey(e.key);
  });
}

/**
 * Hook آمن لإدارة localStorage مع React
 * @param key مفتاح التخزين
 * @param fallback القيمة الافتراضية
 * @returns [value, setValue] — مشابه لـ useState
 * 
 * @example
 * const [theme, setTheme] = useSafeStorage('waqf_theme_color', 'default');
 * setTheme('dark');
 * setTheme(prev => prev === 'dark' ? 'light' : 'dark');
 */
export function useSafeStorage<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(onChange);
    return () => {
      listeners.get(key)?.delete(onChange);
    };
  }, [key]);

  const getSnapshot = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback((updater: T | ((prev: T) => T)) => {
    try {
      const current = (() => {
        try {
          const raw = localStorage.getItem(key);
          return raw !== null ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      })();
      const newValue = typeof updater === 'function'
        ? (updater as (prev: T) => T)(current)
        : updater;
      localStorage.setItem(key, JSON.stringify(newValue));
      notifyKey(key);
    } catch {
      // التخزين غير متاح
    }
  }, [key, fallback]);

  return [value, setValue];
}

/**
 * إزالة مفتاح من التخزين المحلي مع إشعار المستمعين
 */
export function removeSafeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
    notifyKey(key);
  } catch {
    // التخزين غير متاح
  }
}
