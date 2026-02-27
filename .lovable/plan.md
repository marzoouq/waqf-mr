

# إصلاح المشاكل المتبقية بعد التدقيق الشامل

## نظرة عامة
إصلاح 4 مشاكل حقيقية متبقية + تحسين واحد. البند #5 (handleFiscalYearChange) ليس خطأ — هو حقل نصي لتعديل تسمية السنة المالية في الإعدادات وليس لتبديل السنة المحددة.

---

## الخطوة 1: إزالة `as any` من `useAdvanceRequests.ts` (8 أماكن)

الجدولان `advance_requests` و `advance_carryforward` موجودان بالكامل في `src/integrations/supabase/types.ts`. إزالة `as any` تُفعّل فحص TypeScript الكامل.

التغييرات:
- سطر 44: `'advance_requests' as any` → `'advance_requests'`
- سطر 67: نفس الشيء
- سطر 89: نفس الشيء
- سطر 115: `'advance_carryforward' as any` → `'advance_carryforward'`
- سطر 138: نفس الشيء
- سطر 158: نفس الشيء
- سطر 179: `'advance_requests' as any` → `'advance_requests'`
- سطر 221: نفس الشيء

بعد إزالة `as any`، الـ `as unknown as AdvanceRequest[]` في النتائج يمكن أن تبقى لأن الـ select مع relation join يُرجع نوعاً مختلفاً.

---

## الخطوة 2: إضافة `staleTime` لـ `useAllCarryforwards`

سطر 155: إضافة `staleTime: 60_000` بعد `queryKey` — لتتوافق مع باقي hooks الملف.

---

## الخطوة 3: نقل `findAccount` خارج الـ hook في `useAccountsPage.ts`

نقل الدالة من داخل `useAccountsPage()` (سطر 70-76) إلى خارجها كـ module-level function. هذا يُزيل التحذير المحتمل من `react-hooks/exhaustive-deps` ويمنع إعادة إنشاء الدالة في كل render.

```text
// خارج useAccountsPage (module level)
const findAccount = (
  accts: { fiscal_year_id?: string | null; fiscal_year: string }[],
  fy: { id: string; label: string } | null
) =>
  fy
    ? accts.find(a =>
        (fy.id && a.fiscal_year_id === fy.id) ||
        a.fiscal_year === fy.label
      ) ?? null
    : accts.length === 1 ? accts[0] : null;
```

---

## الخطوة 4: إضافة `limit` لـ `useAdvanceRequests` الرئيسي

سطر 50: إضافة `.limit(500)` قبل الاستعلام — لمنع جلب آلاف السجلات.

---

## الخطوة 5: ثغرة `auth-options` في WebAuthn (اختياري - أمني)

هذا تحسين أمني يتطلب تغيير في edge function. الوضع الحالي مقبول وظيفياً لأن:
- التحقق من البصمة يتطلب الجهاز الفيزيائي المسجل
- `auth-verify` يتحقق من credential_id ويربطه بالمستخدم الصحيح

لكن الممارسة الأفضل: تقييد `allowCredentials` بقائمة credentials المستخدم المحدد. هذا يتطلب تغيير flow التسجيل (إرسال email/identifier في body) وهو تغيير أكبر. يُنصح بتأجيله لمهمة منفصلة.

---

## الملفات المتأثرة
- `src/hooks/useAdvanceRequests.ts` (خطوات 1 + 2 + 4)
- `src/hooks/useAccountsPage.ts` (خطوة 3)

## ترتيب التنفيذ
1. `useAdvanceRequests.ts` — إزالة `as any` + `staleTime` + `limit`
2. `useAccountsPage.ts` — نقل `findAccount` خارج الـ hook

