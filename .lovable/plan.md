

# إصلاح 3 مشاكل متبقية

## ملخص
تم التحقق من الكود الفعلي وتأكيد أن الـ 3 بنود لا تزال قائمة.

---

## البند 1: `Index.tsx` — fallback عند فشل `get_public_stats`

**الملف:** `src/pages/Index.tsx` سطر 51-58

**المشكلة:** إذا فشل استدعاء `get_public_stats` تبقى الإحصائيات على `'...'` للأبد بدون أي تغيير.

**الإصلاح:** إضافة `else` block يعيد القيم إلى `'0'` عند الفشل.

---

## البند 2: `use-toast.ts` — تقليل `TOAST_REMOVE_DELAY`

**الملف:** `src/hooks/use-toast.ts` سطر 6

**المشكلة:** `TOAST_REMOVE_DELAY = 1000000` (16.6 دقيقة) — Toast المُغلق يبقى في الذاكرة لفترة طويلة جداً.

**الإصلاح:** تغيير القيمة إلى `5000` (5 ثوانٍ).

---

## البند 3: `Auth.tsx` — إضافة error handling لـ `fetchSettings`

**الملف:** `src/pages/Auth.tsx` سطر 102-114

**المشكلة:** `useEffect` يجلب `registration_enabled` بدون `try/catch` ولا تحقق من `error`.

**الإصلاح:** إضافة `try/catch` و فحص `error` من الاستجابة. الحالة الافتراضية `false` هي الأكثر أماناً (لا تسجيل مفتوح).

---

## ترتيب التنفيذ
1. `Index.tsx` — error fallback
2. `use-toast.ts` — TOAST_REMOVE_DELAY
3. `Auth.tsx` — error handling

