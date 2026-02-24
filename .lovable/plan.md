

# خطة إصلاح الملاحظات المتبقية الفعلية (3 إصلاحات)

بعد الفحص الجنائي العميق لـ 15 ملاحظة، تبيّن أن 9 منها مُصلحة أو مقصودة تصميمياً. المتبقي 6 ملاحظات، منها 3 تستحق الإصلاح فعلياً.

---

## ملخص الفحص الجنائي (مع الأدلة)

### ملاحظات ثبت أنها لا تحتاج إصلاح:

| الملاحظة | الحكم | الدليل |
|----------|-------|--------|
| `.env` مكشوف | تصميم Lovable Cloud | الملف يُدار تلقائياً ويحتوي مفاتيح عامة فقط (anon key) |
| `client.ts` بدون fallback | ملف محظور التعديل | يُولَّد تلقائياً من المنصة |
| `useRawFinancialData` isError | مُصلح مسبقاً | السطر 20: `incError \|\| expError \|\| accError \|\| benError` |
| `safeErrorMessage` شرط DEV | مُصلح في آخر تعديل | السطر 36: `logger.error(...)` مباشرة بدون شرط |
| `Auth.tsx` يتجاوز guard-signup | خاطئ | السطر 185: `supabase.functions.invoke('guard-signup')` |
| `verify_jwt = false` | تصميم موثّق | كل وظيفة تتحقق يدوياً من JWT/service_role |
| `corsHeaders` ثابت | لا يُستخدم | جميع الـ 7 وظائف تستخدم `getCorsHeaders(req)` الديناميكية |
| `ai-assistant` كشف الخطأ | مُصلح | السطر 107: `e.message` فقط |
| Rate limit في الذاكرة | قيد بيئة معروف | Edge Functions تُعيد التشغيل — لا حل بدون Redis/DB خارجي |

### ملاحظات لا تحتاج إصلاح (تصميم مقصود):

| الملاحظة | السبب |
|----------|-------|
| `pdf/entities.ts` يعرض national_id | يُستدعى حصرياً من لوحة الناظر (admin) الذي يملك صلاحية الاطلاع |
| `hmr.overlay: false` | تفضيل تطويري لتجنب تراكب الأخطاء أثناء التطوير — Lovable's default |
| `app_role` enum بدون accountant في migration الأول | migration لاحق يضيفها — تسلسل صحيح |

---

## التغييرات المطلوبة (3 إصلاحات)

### 1. `src/components/ProtectedRoute.tsx` -- إصلاح التناقض المعماري

**المشكلة:** التعليق في السطر 7 يقول "لا تستورد supabase مباشرة" لكن السطر 14 يستوردها. وتُستخدم فقط في زر تسجيل الخروج الطارئ (السطر 72). هذا يفتّت مسؤولية `signOut` بين `AuthContext` و `ProtectedRoute`.

**الإصلاح:** استخدام `signOut` من `AuthContext` بدلاً من استيراد `supabase` مباشرة، وتحديث التعليق ليعكس الواقع:

```text
// قبل (سطر 14):
import { supabase } from '@/integrations/supabase/client';

// بعد: إزالة هذا السطر

// قبل (سطر 72):
onClick={async () => {
  await supabase.auth.signOut();
  window.location.href = '/auth';
}}

// بعد:
onClick={async () => {
  await signOut();
  window.location.href = '/auth';
}}
```

يتطلب أيضاً استخراج `signOut` من `useAuth()` في المكوّن.

### 2. `src/hooks/useIdleTimeout.ts` -- إصلاح مشكلة الأداء

**المشكلة:** `onIdle` في dependency array الخاص بـ `useCallback` (السطر 56) يتسبب في إعادة تسجيل جميع event listeners في كل render إذا مُرر `onIdle` كـ arrow function inline.

**الإصلاح:** استخدام `useRef` لتخزين `onIdle` لمنع إعادة إنشاء `resetTimer` عند كل render:

```text
// إضافة:
const onIdleRef = useRef(onIdle);
useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

// تغيير في resetTimer و timerRef callback:
// استبدال onIdle() بـ onIdleRef.current()
// إزالة onIdle من dependency array
```

### 3. `src/contexts/FiscalYearContext.tsx` -- إضافة حماية دفاعية لـ localStorage

**المشكلة:** السطر 23 يستدعي `localStorage.getItem` بدون `try/catch`. في بيئات معينة (Private browsing في بعض المتصفحات القديمة، أو Storage quota ممتلئ)، قد يرمي استثناء.

**الإصلاح:** لف الاستدعاء بـ `try/catch`:

```text
// قبل:
const [selectedId, setSelectedId] = useState<string>(() => {
  return localStorage.getItem(STORAGE_KEY) || '';
});

// بعد:
const [selectedId, setSelectedId] = useState<string>(() => {
  try { return localStorage.getItem(STORAGE_KEY) || ''; }
  catch { return ''; }
});
```

ونفس الشيء لـ `localStorage.setItem` و `localStorage.removeItem` في `handleSetFiscalYearId`.

---

## الملفات المتأثرة

1. `src/components/ProtectedRoute.tsx` -- إزالة import supabase واستخدام signOut من AuthContext
2. `src/hooks/useIdleTimeout.ts` -- useRef لـ onIdle
3. `src/contexts/FiscalYearContext.tsx` -- try/catch لـ localStorage

