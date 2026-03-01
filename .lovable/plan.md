

# اختبارات دالة findAccountByFY

## الوضع الحالي
دالة `findAccountByFY` معرّفة داخل `src/hooks/useAccountsPage.ts` كدالة خاصة (غير مُصدّرة). تبحث عن حساب ختامي مطابق للسنة المالية بأولوية UUID ثم fallback للنص.

## التعديلات المطلوبة

### 1. تصدير الدالة للاختبار
- في `src/hooks/useAccountsPage.ts`: تغيير `function findAccountByFY` الى `export function findAccountByFY`

### 2. انشاء ملف اختبار جديد
ملف: `src/hooks/findAccountByFY.test.ts`

حالات الاختبار:

| # | الحالة | المتوقع |
|---|--------|---------|
| 1 | UUID يطابق حساب | يرجع الحساب المطابق بالـ UUID |
| 2 | UUID و label كلاهما موجود، UUID له اولوية | يرجع حساب الـ UUID وليس الـ label |
| 3 | UUID غير موجود، label يطابق (fallback) | يرجع الحساب المطابق بالنص |
| 4 | لا UUID ولا label يطابق | يرجع null |
| 5 | fy = null وحساب واحد فقط | يرجع الحساب الوحيد |
| 6 | fy = null وعدة حسابات | يرجع null |
| 7 | حساب قديم بدون fiscal_year_id (undefined) | يطابق بالـ label كـ fallback |

## التفاصيل التقنية
- تصدير الدالة باضافة `export` فقط دون تغيير منطقها
- الاختبارات تستدعي الدالة مباشرة بدون mocks (دالة pure بلا side effects)
- لا حاجة لـ renderHook لانها ليست hook

