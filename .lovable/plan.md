## فحص جنائي شامل قبل الإطلاق — نظام وقف الثبيتي

فحص متعدد الطبقات يغطي الأمان، البيانات، الأداء، والامتثال. ينتج تقرير نهائي مع تصنيف الخطورة (critical/high/medium/low) وقرار GO/NO-GO.

### 1. طبقة قاعدة البيانات (DB Forensics)

- `supabase--linter` — كشف RLS مفقود، SECURITY DEFINER غير آمن، أعمدة حساسة مكشوفة
- فحص كل جدول (42 جدول) للتحقق من: تفعيل RLS، وجود سياسات SELECT/INSERT/UPDATE/DELETE، GRANT صحيح
- مراجعة الدوال (32 stored procedure) — تأكيد `search_path` آمن و`SECURITY DEFINER` مبرّر
- فحص المشغلات (29 trigger) — لا تسريب بيانات أو bypass للسياسات
- التحقق من تشفير الحقول الحساسة (national_id، bank_account) عبر pgcrypto
- اختبار سياسة `invoices` storage bucket (المُصلحة حديثاً)

### 2. طبقة Edge Functions

- تشغيل `scripts/security-gates.mjs` — كشف `getSession()`، PII في logs، استخدام SERVICE_ROLE خارج allowlist
- التحقق من Zod validation في كل function تقرأ body
- مراجعة CORS، rate limiting، معالجة الأخطاء
- اختبار auth flow عبر `getUser()` في كل endpoint

### 3. طبقة الواجهة والصلاحيات

- تشغيل `scripts/audit-all.mjs` (structure + conventions + hooks-layout + UI permissions + page controls)
- مراجعة `audit/ui-permissions-audit.csv` — تطابق RBAC للأدوار الأربعة (admin/accountant/beneficiary/waqif)
- التحقق من حراس المسارات (route guards) لكل الصفحات المحمية
- فحص تسريب بيانات بين الأدوار (cross-role data leakage)

### 4. طبقة منطق الأعمال المالية

- التحقق من قواعد التوزيع (LRM parity بين server/client)
- اختبار سلسلة ZATCA ICV (تسلسل الفواتير)
- التحقق من حدود السلف (advance limits)
- اختبار إقفال/إعادة فتح السنة المالية
- مراجعة حسابات الريع والكاش فلو

### 5. طبقة الجودة والاختبارات

- `tsgo` للتحقق من TypeScript strict
- `bunx vitest run` للاختبارات (unit + integration)
- ESLint gates
- فحص `console.*` المباشر (يجب استخدام logger)

### 6. طبقة الأداء والـ PWA

- تحليل bundle size وlazy loading
- التحقق من preload للخطوط (مشكلة سابقة)
- فحص `usePagePerformance` ومقاييس Core Web Vitals
- اختبار PWA manifest وservice worker

### 7. طبقة الخصوصية والامتثال

- فحص masking للـ PII في logs وUI العامة
- مراجعة `app_settings` لإحصائيات الهبوط
- التحقق من `email_unsubscribe_tokens` وسياسات suppressed_emails

### المخرجات

- `audit/forensic-pre-launch-2026-06-25/` يحتوي:
  - `SUMMARY.md` — تصنيف نهائي + قرار GO/NO-GO
  - `01-database.md` — نتائج DB layer
  - `02-edge-functions.md`
  - `03-ui-rbac.md`
  - `04-business-logic.md`
  - `05-quality.md`
  - `06-performance.md`
  - `07-privacy.md`
  - `CRITICAL.md` — قائمة مرتبة بالأولوية للإصلاح قبل الإطلاق

### ملاحظة مهمة

هذا الفحص **قراءة فقط** — لن أُجري أي تعديلات. عند اكتشاف ثغرات حرجة، سأقترح خطة إصلاح منفصلة للموافقة عليها.

### السؤال قبل البدء

هل تريد الفحص الكامل (السبع طبقات، ~15-20 دقيقة) أم نسخة مركّزة على الأمان فقط (طبقات 1+2+3، ~5-7 دقائق)؟  
نفذ فحص كامل لجميع المخرجات   
نفذ فحص عميق للروابط  
فحص الحافه  
الواجهات  
كل ما بداخل التطبيق والمستودع 