/**
 * Stub لـ `virtual:pwa-register/react` خاص ببيئة الاختبار فقط.
 * يُستبدل عبر `vi.mock('virtual:pwa-register/react', ...)` داخل الاختبارات،
 * ووجوده هنا يسمح لـ Vite بحل الاستيراد قبل أن يطبّق Vitest الموك.
 */
export function useRegisterSW(_opts?: unknown) {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: (_reload?: boolean) => Promise.resolve(),
  };
}
