

# التحقق الجنائي الشامل — فحص كل ملاحظة ضد الكود الفعلي

---

## القسم الأول: ملاحظات تم حلّها أو غير صحيحة

| الملاحظة | الحكم | الدليل |
|----------|-------|--------|
| **CRIT-1**: `.env` مكشوف في Git | **ليست مشكلة** | هذا مشروع Lovable Cloud. الملف يحتوي فقط على مفاتيح عامة (anon key + URL) مصممة لتكون مكشوفة. المفتاح السري في Supabase secrets. |
| **CRIT-2**: `waqif` محجوب من `/beneficiary` | **تم حلّها** | السطر 115 في `App.tsx` الآن: `allowedRoles={['admin', 'beneficiary', 'waqif']}` |
| **CRIT-3**: `accountant` غير مضاف للـ enum | **خطأ في التقرير** | الملف `20260223005810` يحتوي على `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant'` -- والملف التالي `20260223005824` يُنشئ السياسات. الترتيب صحيح. |
| **HIGH-3**: `fiscal_years` RLS لا تشمل `accountant` | **محلولة** | الملف `20260223005824` يُضيف `"Accountants can manage fiscal_years" FOR ALL` -- وهذا يشمل SELECT أيضاً. |
| **MED-5**: `useFiscalYears` query key مختلف | **ليست مشكلة** | `invalidateQueries({ queryKey: ['fiscal_years'] })` يُبطل بالـ prefix match كل المفاتيح التي تبدأ بـ `['fiscal_years']`. |

---

## القسم الثاني: مشاكل حقيقية تحتاج إصلاح

### 1. `Index.tsx` لا يُوجّه `accountant` (HIGH-1)
**الحكم: مشكلة حقيقية**

```text
// سطر 37-41 في Index.tsx:
if (role === 'admin') {
  navigate('/dashboard');
} else if (role === 'beneficiary' || role === 'waqif') {
  navigate('/beneficiary');
}
// accountant غير مذكور -- يبقى عالقاً في الصفحة الرئيسية
```

الإصلاح: تغيير الشرط ليشمل accountant مع admin.

### 2. `AccountsPage` -- `fiscalYear` state محلي بقيمة ثابتة (CRIT-4)
**الحكم: مشكلة حقيقية جزئياً**

السطر 74 يُعيّن قيمة افتراضية ثابتة `'25/10/1446 - 25/10/1447هـ'`، لكن السطر 87 يُحدّثها من `app_settings` عند التحميل:

```text
if (settings['fiscal_year']) setFiscalYear(settings['fiscal_year']);
```

والسطر 262 يستخدم `fiscalYear` (الـ state المحلي) عند الحفظ. المشكلة: إذا لم يكن هناك إعداد `fiscal_year` في `app_settings`، يُحفظ الحساب بالقيمة الثابتة الخاطئة. الحل: استخدام `selectedFY?.label` بدلاً من state محلي.

### 3. `handleCloseYear` يستخدم `supabase` مباشر (ملاحظة 8-9 من التقرير السابق)
**الحكم: مشكلة حقيقية لكن مقبولة عملياً**

السطور 318-362 تستخدم `supabase` مباشرة لإقفال السنة وإنشاء سنة جديدة. لكن السطر 366 يُبطل cache `['accounts']` بالـ prefix match مما يُبطل `['accounts', 'fiscal_year', '*']` أيضاً. المشكلة الفعلية ليست في cache بل في أن العمليات المتعددة (close + create FY + create account) ليست في transaction -- لكن هذا قيد تقني في Supabase JS client.

### 4. `useAppSettings.updateSetting` بدون `onError` (HIGH-5)
**الحكم: مشكلة حقيقية**

الـ mutation لا تحتوي `onError` callback. عند فشل الحفظ، لا يظهر أي إشعار للمستخدم. ملاحظة: `updateJsonSetting` تتعامل مع الخطأ لأنها تستخدم `try/catch` حول `mutateAsync`، لكن الاستدعاءات المباشرة لـ `updateSetting.mutate()` (وليس `mutateAsync`) ستفشل بصمت.

---

## القسم الثالث: ملاحظات تحسينية (ليست أخطاء)

| الملاحظة | الحكم |
|----------|-------|
| **HIGH-2**: console.log في Edge Function | ملاحظة صحيحة -- logs في بيئة الخادم ليست مكشوفة للمستخدم لكن تحسين مستقبلي |
| **HIGH-4**: `reorderBylaws` بدون transaction | صحيح لكن التأثير منخفض (ترتيب مقالات نظامية، ليس بيانات مالية) |
| **MED-1**: اختبارات 3 أدوار | تحسين توثيقي |
| **MED-2**: docs يذكر 3 أدوار | تحسين توثيقي |
| **MED-3**: pwa-192x192.png | لا تأثير -- PWA manifest يحملها بشكل مستقل |
| **MED-4**: لا typecheck script | تحسين CI/CD |
| **PERF-1/2**: أداء | تحسينات مستقبلية |
| **SEC-1**: ai-assistant يستخدم getClaims | مقبول -- المساعد الذكي ليس عملية مالية حساسة |

---

## التغييرات المطلوبة

### التغيير 1: `src/pages/Index.tsx` (سطر 37)
تغيير شرط التوجيه ليشمل `accountant`:

```text
if (role === 'admin' || role === 'accountant') {
  navigate('/dashboard');
} else if (role === 'beneficiary' || role === 'waqif') {
  navigate('/beneficiary');
}
```

### التغيير 2: `src/pages/dashboard/AccountsPage.tsx` (سطر 262)
استبدال `fiscalYear` (state محلي) بـ `selectedFY?.label` عند حفظ الحساب:

```text
fiscal_year: selectedFY?.label || fiscalYear,
```

### التغيير 3: `src/hooks/useAppSettings.ts` (سطر 27)
إضافة `onError` للـ mutation:

```text
onError: () => {
  toast.error('حدث خطأ أثناء حفظ الإعداد');
},
```

---

## ملخص

من أصل 16 ملاحظة في التقرير:
- 5 محلولة أو غير صحيحة
- **3 مشاكل حقيقية تحتاج إصلاح** (توجيه accountant + fiscalYear state + updateSetting onError)
- 8 تحسينات مستقبلية غير عاجلة

