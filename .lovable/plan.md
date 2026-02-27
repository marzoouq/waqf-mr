

# تنظيف الأكواد والملفات المهملة

## التغييرات المطلوبة

### 1. حذف `.lovable/plan.md`
ملف تخطيط قديم يحتوي على خطة منفذة سابقاً (تحقق بريد المستفيدين). وجوده يسبب ارتباكاً لأنه لا يعكس الحالة الحالية.

### 2. حذف `docs/FORENSIC-FIX-PLAN.md`
وثيقة تاريخية تحتوي على وصف تفصيلي لـ 17 ثغرة أمنية سابقة وكيفية إصلاحها. الاحتفاظ بها يكشف الثغرات القديمة بدون فائدة عملية. سجل التحديثات الأمنية موجود أصلاً في `docs/INDEX.md`.

### 3. تحديث `docs/INDEX.md`
حذف السطر 31 (البند رقم 6) الذي يحيل لملف `FORENSIC-FIX-PLAN.md` المحذوف.

### 4. إعادة كتابة `timingSafeEqual` في `check-contract-expiry/index.ts`
المشاكل الحالية:
- السطر `crypto.subtle.timingSafeEqual?.(aBytes, dummy)` يستدعي الدالة بـ dummy بدون استخدام الناتج
- `as any` يخفي خطأ في الأنواع
- فرع `if (aBytes.byteLength !== bBytes.byteLength)` يكشف طول المفتاح عبر timing

الإصلاح: توحيد طول المدخلات عبر padding ثم مقارنة constant-time، مع استخدام `crypto.subtle.timingSafeEqual` المتوفر في Deno بشكل صحيح:

```text
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // توحيد الطول لمنع تسريب المعلومات
  const maxLen = Math.max(aBytes.byteLength, bBytes.byteLength);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  // مقارنة constant-time
  let result = aBytes.byteLength ^ bBytes.byteLength; // ستكون != 0 إذا اختلف الطول
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded[i] ^ bPadded[i];
  }
  return result === 0;
}
```

هذا الحل:
- لا يكشف الطول (padding يوحّد الأطوال قبل المقارنة)
- لا يعتمد على دوال غير موثقة
- لا يستخدم `as any`
- يعمل في أي بيئة JavaScript/Deno

### 5. ملاحظة: `guard-signup` -- لا يحتاج إصلاح
تم التحقق من الكود الفعلي (سطور 106-113): الـ rollback عبر `deleteUser` موجود ومُطبَّق. الادعاء بعدم تطبيقه كان خاطئاً.

## الملفات المتأثرة

| الملف | الإجراء |
|-------|---------|
| `.lovable/plan.md` | حذف |
| `docs/FORENSIC-FIX-PLAN.md` | حذف |
| `docs/INDEX.md` سطر 31 | حذف البند 6 |
| `supabase/functions/check-contract-expiry/index.ts` | إعادة كتابة `timingSafeEqual` |
