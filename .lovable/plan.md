# خطة التنفيذ — إصلاح بنية البريد + تحسينات قاعدة البيانات والأداء

## النطاق المختار: **الخيار C — كل البنود (P1 → P4)**

سيتم التنفيذ بالترتيب أدناه دون المساس بأي مكون آخر (UI/منطق محاسبي/RLS/مصادقة).

---

## P1 — استكمال بنية البريد الإلكتروني (الأكثر إلحاحاً)

**المشكلة:** خطأ متكرر كل ~5 ثوانٍ في لوغ Postgres:
`relation "public.email_send_state" does not exist`
السبب: cron job نشط يستدعي `process-email-queue` بينما البنية غير منشورة.

**الإجراءات:**
1. تشغيل أداة `setup_email_infra` (آمنة/idempotent) — تُنشئ تلقائياً:
   - الجداول: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`
   - طوابير pgmq: `auth_emails`, `transactional_emails`
   - دوال RPC: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`
   - Edge function: `process-email-queue`
   - Vault secret: `email_queue_service_role_key`
   - إعادة جدولة cron job بالمفتاح الصحيح
2. فحص `auth-email-hook` الحالي:
   - إذا كان يستخدم النمط القديم (`@lovable.dev/email-js` + استدعاء مباشر) → إعادة سقالته عبر `scaffold_auth_email_templates` مع `confirm_overwrite: true` ثم نشره
   - إذا كان يستخدم `enqueue_email` → لا يُلمس
3. نشر `auth-email-hook` عبر `deploy_edge_functions` لضمان السريان

**النتيجة:** يتوقف تلوث اللوغ فوراً + auth emails تعمل عبر الطابور مع retry/DLQ.

---

## P2 — إضافة مشغّل `update_updated_at_column` لـ 5 جداول

**الجداول الناقصة:** `app_settings`, `expense_budgets`, `support_tickets`, `annual_report_items`, `account_categories`

**الإجراء:** مايغريشن واحد بسيط:
```sql
CREATE TRIGGER update_<table>_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```
(يُكرر للجداول الخمسة)

**ملاحظة:** الدالة `update_updated_at_column()` موجودة بالفعل. الإضافة آمنة 100% ولا تؤثر على أي بيانات أو سياسات.

---

## P3 — توسيع lazy loading لمولّدات PDF

**الفائدة:** تأجيل 542KB (179KB gzipped) من البندل الأولي حتى أول طلب PDF.

**الإجراء:** فحص جميع `import` المباشرة من `@/utils/pdf` (أو ما يماثلها) واستبدالها بـ `await import(...)` في مواقع الاستدعاء فقط.

**نمط التحويل:**
```ts
// قبل
import { generateAnnualReportPDF } from '@/utils/pdf';
const handleExport = () => generateAnnualReportPDF(data);

// بعد
const handleExport = async () => {
  const { generateAnnualReportPDF } = await import('@/utils/pdf');
  generateAnnualReportPDF(data);
};
```

**ضمانات:**
- لا يُلمس منطق توليد PDF نفسه
- لا تُغيّر التواقيع أو الواجهات
- يُحدّث فقط نقاط الاستيراد في معالجات الأحداث (handlers)

---

## P4 — توحيد عرض الحقول المالية (تنظيمي)

**المشكلة:** قراءة الحقول المالية (`waqf_revenue`, `admin_share`, `waqif_share`, `zakat_amount`) منتشرة في 7 ملفات عرض.

**الإجراء:**
1. إنشاء هوك صغير `useDisplayFinancials(account)` في `src/hooks/finance/`:
   - يقرأ الحقول من المصدر الموحد
   - يُرجع قيماً مهيّأة للعرض فقط
2. استبدال القراءات المباشرة في الملفات السبعة بالهوك الجديد:
   - `AccountsBeneficiariesTable.tsx`
   - `ReportsPage.tsx`
   - `DisclosurePage.tsx`
   - (و4 ملفات أخرى يتم تحديدها بالفحص)

**ضمانات:**
- لا تغيير في القيم المعروضة (نفس الحسابات)
- لا تغيير في المحرك المالي (`financial-engine`)
- لا تغيير في RLS أو الاستعلامات

---

## P5 — مراجعة الفهارس غير المستخدمة

**مؤجّل 30 يوماً** — لا إجراء الآن. تذكير فقط لمراجعة `pg_stat_user_indexes` لاحقاً.

---

## ضوابط السلامة (تطبق على كل البنود)

- ✅ لا تعديل على `AuthContext`, `ProtectedRoute`, `SecurityGuard`
- ✅ لا تعديل على `supabase/config.toml`, `client.ts`, `types.ts`, `.env`
- ✅ لا تغيير في سياسات RLS الموجودة
- ✅ لا تغيير في المنطق المحاسبي أو محرك التوزيع
- ✅ كل تغيير قابل للتراجع (idempotent migrations + lazy imports)

---

## التحقق بعد التنفيذ

1. **P1:** فحص لوغ Postgres — يجب أن يتوقف خطأ `email_send_state` خلال دقيقة
2. **P2:** تحديث صف في أحد الجداول الخمسة والتحقق من تحديث `updated_at`
3. **P3:** بناء المشروع والتحقق من تقلّص حجم الـ initial chunk
4. **P4:** تشغيل `tsc --noEmit` و`eslint` — يجب أن يبقى صفر أخطاء/تحذيرات

---

## الوقت المقدّر: ~20 دقيقة
