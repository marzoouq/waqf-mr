

# خطة إصلاح نتائج الفحص الشامل

## تحليل الحالة الراهنة

بعد مراجعة الكود الفعلي، إليك ما تم إصلاحه سابقاً وما يحتاج إصلاح:

- **البند 3 (ai-assistant User ID leak)**: ✅ **تم إصلاحه سابقاً** — السطر 75 يُظهر `"ai rate_limit check failed"` بدون UUID
- **البند 4 (React.ReactNode)**: ⚪ **ليس خطأ حرجاً** — TypeScript يدعم `React.ReactNode` بدون استيراد صريح في مشاريع JSX transform الحديثة (Vite + React 19). هذا تحسين أسلوبي فقط.

---

## الإصلاحات المطلوبة (6 بنود)

### الإصلاح 1 — `signIn` loading freeze (حرج)
**الملف:** `src/contexts/AuthContext.tsx`

إضافة safety timeout بعد نجاح تسجيل الدخول:
```tsx
if (error) {
  setLoading(false);
} else {
  setTimeout(() => setLoading(false), 8000);
}
```

### الإصلاح 2 — PWA Manifest `purpose` (حرج)
**الملف:** `vite.config.ts`

فصل الأيقونات إلى اثنتين منفصلتين بدلاً من `"any maskable"`:
```typescript
{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
```

### الإصلاح 3 — ErrorBoundary chunk patterns (متوسط)
**الملف:** `src/components/ErrorBoundary.tsx`

إضافة نمطين إضافيين لأخطاء Vite الحديثة:
- `'Importing a module script failed'`
- `'Unable to preload CSS'`

### الإصلاح 4 — CORS رفض صريح (متوسط)
**الملف:** `supabase/functions/_shared/cors.ts`

تعديل `getAllowedOrigin` لإرجاع `""` (سلسلة فارغة) بدلاً من domain افتراضي عند origin غير معروف — هذا يجعل المتصفح يرفض الطلب صريحاً.

### الإصلاح 5 — ExpenseBudgetBar useMemo (متوسط)
**الملف:** `src/components/expenses/ExpenseBudgetBar.tsx`

دمج 3 `useMemo` في واحد لتقليل إعادة الحساب.

### الإصلاح 6 — queryClient retry count (متوسط)
**الملف:** `src/lib/queryClient.ts`

تغيير `failureCount < 1` إلى `failureCount < 2` لمنح محاولتين بدلاً من واحدة.

---

## البنود المؤجلة (تحسينات مستقبلية — لا تُنفّذ الآن)

| البند | السبب |
|---|---|
| React.ReactNode imports | تحسين أسلوبي فقط، لا خطأ فعلي |
| sourcemap: 'hidden' | يحتاج تكامل مع خدمة error tracking أولاً |
| QR مكتبتان | يحتاج تحليل أين تُستخدم كل واحدة |
| localStorage prefix | تغيير بنيوي يحتاج اختبار شامل |
| DeferredRender delay | يحتاج قياس أداء على أجهزة حقيقية |
| Tailwind v4 | ترقية كبيرة، ليست أولوية حالياً |
| refreshRole state | تحسين UX بسيط |

