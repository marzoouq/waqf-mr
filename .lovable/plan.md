

# إصلاح بندين متبقيين

## ملخص التحقق
من أصل 8 بنود في التقرير:
- البند 1 (staleTime): مُصلح بالفعل (السطر 41 يحتوي `staleTime: 60_000`)
- البنود 3/4 (fiscal_year_id): جدول `accounts` لا يحتوي عمود `fiscal_year_id` أصلاً — تغيير هيكلي كبير يحتاج migration منفصل
- البنود 5-7 (as any / limit): منخفضة الأولوية، تمت مناقشتها سابقاً

**بندان قابلان للإصلاح الآن:**

---

## البند 2 (MEDIUM): fiscalYear hardcoded في useAccountsPage

**الملف:** `src/hooks/useAccountsPage.ts` سطر 54

**المشكلة:** القيمة الافتراضية `'25/10/1446 - 25/10/1447هـ'` مشفّرة. لكن السطر 66 يُحدّثها من `appSettings` عند التحميل، والسطر 72 يستخدم `selectedFY?.label` أولاً. المشكلة الحقيقية هي أن القيمة الافتراضية قد تظهر لحظياً قبل تحميل الإعدادات.

**الإصلاح:** تغيير القيمة الافتراضية إلى سلسلة فارغة `''` بحيث لا تُطابق أي حساب خطأً قبل تحميل الإعدادات الفعلية.

---

## البند 8 (LOW): HTML injection في تقارير الطباعة

**الملفات:** `src/utils/printShareReport.ts` سطر 40، `src/utils/printDistributionReport.ts` سطر 45

**المشكلة:** أسماء المستفيدين تُدرج مباشرة في HTML بدون escaping. إذا احتوى الاسم على `<script>` أو علامات HTML، سيُنفَّذ في نافذة الطباعة.

**الإصلاح:** إضافة دالة `escapeHtml` بسيطة واستخدامها قبل إدراج أي نص مستخدم في HTML:
```text
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

تطبيقها على: `beneficiaryName`, `d.beneficiary_name`, `waqfName`, `deedNumber`, `fiscalYearLabel`.

---

## ترتيب التنفيذ
1. `useAccountsPage.ts` — تغيير القيمة الافتراضية
2. `printShareReport.ts` — إضافة escapeHtml
3. `printDistributionReport.ts` — إضافة escapeHtml

