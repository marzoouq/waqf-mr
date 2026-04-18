
## خطة: اختبار وحدة لـ IdleTimeoutManager

### الهدف
اختبار co-located يتحقق أن `performCleanup` يُستدعى عند فشل `signOut` داخل `handleIdleLogout`.

### الملف الجديد
`src/components/layout/IdleTimeoutManager.test.tsx`

### استراتيجية الـ Mocking

| Module | Mock |
|--------|------|
| `@/hooks/auth/useAuthContext` | `useAuth` يُرجع `{ user: { id: 'u1' }, signOut: vi.fn() }` |
| `@/hooks/auth/useAuthCleanup` | `useAuthCleanup` يُرجع `{ performCleanup: vi.fn() }` |
| `@/hooks/data/settings/useAppSettings` | `useAppSettings` يُرجع `{ getJsonSetting: () => 15 }` |
| `@/hooks/ui/useIdleTimeout` | يلتقط `onIdle` ويعرضه عبر متغيّر خارجي للاستدعاء اليدوي في الاختبار |
| `@/lib/services/accessLogService` | `logAccessEvent: vi.fn().mockResolvedValue(undefined)` |
| `@/lib/logger` | `logger.error: vi.fn()` |
| `@/components/auth/IdleTimeoutWarning` | mock بسيط (lazy import) — يُرجع `null` |

### حماية window.location
```ts
const originalLocation = window.location;
beforeEach(() => {
  delete (window as any).location;
  (window as any).location = { href: '' };
});
afterEach(() => {
  (window as any).location = originalLocation;
});
```

### الاختبارات (4)

1. **مسار النجاح**: `signOut` ينجح → `performCleanup` لا يُستدعى → `window.location.href === '/auth?reason=idle'`
2. **مسار الفشل (الحرج)**: `signOut.mockRejectedValue(new Error('boom'))` → `performCleanup` يُستدعى مرة واحدة → `logger.error` يُستدعى → التوجيه يحدث رغم الفشل
3. **logAccessEvent يُستدعى دائماً** قبل `signOut` بـ `event_type: 'idle_logout'` و `user_id: 'u1'`
4. **بدون مستخدم**: `useAuth` يُرجع `{ user: null }` → المكوّن يُرجع `null` (لا renders)

### نمط استدعاء onIdle
```ts
let capturedOnIdle: (() => Promise<void>) | null = null;
vi.mock('@/hooks/ui/useIdleTimeout', () => ({
  useIdleTimeout: (opts: any) => {
    capturedOnIdle = opts.onIdle;
    return { showWarning: false, remaining: 0, stayActive: vi.fn() };
  },
}));
// في الاختبار:
render(<IdleTimeoutManager />);
await act(async () => { await capturedOnIdle!(); });
```

### ضمانات
- لا تعديل على ملفات الإنتاج
- co-located مع الملف المُختبَر (مطابق لنمط `useAuthCleanup.test.ts`)
- يحمي ضد الانحدار: إن أُزيل try/catch مستقبلاً، اختبار #2 سيفشل
