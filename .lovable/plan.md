

# فحص جنائي عميق — لوحة الناظر (المناطق غير المفحوصة سابقاً)

---

## المنهجية

فحص المناطق التي لم تُغطَّ في الفحوصات السابقة: الشجرة المحاسبية، المقارنة التاريخية، التقرير السنوي، إدارة المستخدمين، تشخيص النظام، أنماط الرسائل، وأنماط Type Safety العميقة.

---

## النتائج

### 🔴 F-01: قائمة اختيار الأب محدودة بالجذور فقط — ChartOfAccountsPage (متوسطة)

**الملف:** `ChartOfAccountsPage.tsx` سطر 228-231

```text
const rootCategories = useMemo(
  () => categories.filter(c => !c.parent_id),
  [categories],
);
```

**المشكلة:** عند إضافة/تعديل حساب، قائمة "الفئة الأب" تعرض فقط الفئات الجذرية (بلا أب). **لا يمكن اختيار فئة فرعية كأب**، مما يمنع بناء شجرة بعمق أكبر من مستويين.

**سيناريو:** الناظر يريد إنشاء شجرة:
```text
100 - إيرادات (جذر)
  110 - إيجارات (فرع)
    111 - إيجارات تجارية (حفيد) ← ❌ لا يمكن اختيار 110 كأب!
```

**الإصلاح:** تغيير `rootCategories` إلى `categories` (كل الفئات) مع استبعاد الفئة المُعدَّلة وفروعها فقط لمنع الحلقات.

---

### 🟡 F-02: `as never` type cast في ChartOfAccountsPage (منخفضة)

**الملف:** سطر 276

```text
createMutation.mutate(payload as never, { ... });
```

**المشكلة:** `as never` يتجاوز فحص TypeScript بالكامل. إذا تغير schema الجدول مستقبلاً، لن تظهر أخطاء compilation.

**الإصلاح:** استخدام `as Parameters<typeof createMutation.mutate>[0]` كبقية الصفحات (IncomePage, ExpensesPage, ContractsPage).

---

### 🟡 F-03: Security Definer View تحذير غير مُعالج في Supabase Linter (منخفضة)

**من Security Scan:**
```json
{
  "id": "SUPA_security_definer_view",
  "level": "error",
  "ignore": false
}
```

جميع بنود Agent Security مُعالجة ومُوثّقة (`ignore: true`)، لكن تحذير Supabase Linter لـ `security_definer_view` لا يزال `ignore: false`. هذا تحذير عرض فقط (لا تأثير أمني — تم التحقق سابقاً) لكنه يظهر كـ "error" في فحص الأمان.

**الإصلاح:** تعليم البند كـ `ignore: true` عبر أداة إدارة الأمان.

---

### ✅ بنود تم فحصها وأثبتت سلامتها

| البند | النتيجة |
|-------|---------|
| Console errors | 0 |
| Network errors | 0 |
| HistoricalComparisonPage — hooks pattern | ✅ سليم — 4 hooks ثابتة مع slice |
| HistoricalComparisonPage — PDF تصدير | ✅ يتعامل مع القسمة على صفر |
| AnnualReportPage — reorder race condition | ✅ محمي بـ mutateAsync متتابع |
| AnnualReportPage — fiscal year guard | ✅ `if (!fiscalYearId) return` |
| SystemDiagnosticsPage — access logging | ✅ يسجل في access_log |
| SystemDiagnosticsPage — تصدير مُطهّر | ✅ يستخدم sanitizeDiagnosticOutput |
| UserManagementPage — server-side auth | ✅ `getUser()` قب