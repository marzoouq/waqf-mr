

# خطة تنفيذ 8 مهام متبقية من التدقيق الجنائي

## المرحلة أ — أمان (3 مهام)

### المهمة 1: حذف console.log في admin-manage-users
**الملف:** `supabase/functions/admin-manage-users/index.ts`
- حذف سطر 182: `console.log("update_password: success")`
- حذف سطر 215: `console.log("update_password: verified")`
- إبقاء `console.error` في سطور 175, 198

### المهمة 2: حذف console.log في auth-email-hook
**الملف:** `supabase/functions/auth-email-hook/index.ts`
- حذف سطر 236: `console.log('Received auth event', ...)`
- حذف سطر 304: `console.log('Email sent successfully', ...)`
- إبقاء `console.error` في سطور 240, 273, 297

### المهمة 3: تعليق توضيحي لاستخدام admin في dashboard-summary
**الملف:** `supabase/functions/dashboard-summary/index.ts`
- إضافة تعليق قبل سطر استعلام user_roles يوضح أن admin مقصود لأن RLS RESTRICTIVE يمنع القراءة المباشرة

---

## المرحلة ب — بنية (4 مهام)

### المهمة 4: نقل fetchTableData من lib/export إلى utils/export
- نقل `src/lib/export/dataFetcher.ts` إلى `src/utils/export/dataFetcher.ts`
- تحديث barrel export في `src/utils/export/index.ts` لتصدير `fetchTableData`
- تحديث الاستيراد الوحيد في `src/hooks/page/shared/useDataExport.ts`
- حذف `src/lib/export/` (المجلد بأكمله)

### المهمة 5: استخدام EmptyState في PropertiesViewPage
**الملف:** `src/pages/beneficiary/PropertiesViewPage.tsx`
- البحث عن inline empty state JSX واستبداله بـ `<EmptyState>` من `@/components/common`
- **ملاحظة:** الصفحة لا تحتوي على حالة فراغ ظاهرة — الـ properties تُعرض مباشرة بعد التحميل. سأتحقق من وجود `!properties?.length` في الملف وأطبق EmptyState إذا وُجد

### المهمة 6: مركزة toSourceRecord / toExpenseRecord
- الدوال مكررة حرفياً في **4 ملفات**: `useMySharePage.ts`, `useAccountsViewPage.ts`, `useDisclosurePage.ts`, `useFinancialReportsPage.ts` + نسخة مشابهة في `useYearComparisonData.ts`
- إنشاء `src/utils/financial/recordConverters.ts` يصدّر `toSourceRecord` و `toExpenseRecord`
- تحديث الملفات الأربعة لاستيرادها من المسار الجديد
- `useYearComparisonData.ts` له توقيع مختلف (`ExpenseTypeEntry[]`) — يبقى كما هو

### المهمة 7: استخراج eventConfig المشترك
- `eventConfig` مكرر حرفياً في `AccessLogTab.tsx` و `ArchiveLogTab.tsx`
- إنشاء `src/components/audit/auditEventConfig.ts` يصدّر `eventConfig`
- تحديث الملفين لاستيراده بدل تعريفه محلياً

---

## المرحلة ج — توثيق (مهمة واحدة)

### المهمة 8: إضافة README لمجلدات غير موثّقة
إنشاء README.md قصير (3-5 أسطر) لكل من:
- `src/components/waqif/` — مكونات واجهة الواقف (الشخص المانح)
- `src/components/waqf/` — مكونات إدارة الوقف (الكيان)
- `src/lib/realtime/` — اشتراكات Supabase Realtime
- `src/lib/monitoring/` — رصد الأداء والاستعلامات
- `src/lib/services/` — خدمات البيانات (تخزين، تشخيص)
- `src/components/disclosure/` — صفحة الإفصاح المالي للمستفيدين

---

## ملخص التأثير

| المرحلة | الملفات المُعدَّلة | الملفات الجديدة | الملفات المحذوفة |
|---------|-------------------|----------------|-----------------|
| أ | 3 edge functions | 0 | 0 |
| ب | 6 hooks + 2 audit | 2 (recordConverters + auditEventConfig) | 2 (lib/export/) |
| ج | 0 | 6 README | 0 |
| **المجموع** | **11** | **8** | **2** |

صفر تأثير على الميزات. كل التغييرات refactoring وتنظيف.

