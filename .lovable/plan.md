## خلاصة الاستكشاف

شغّلت الـ Linter محلياً + استعلامات على pg_proc/pg_views/pg_policies. النتيجة 44 تنبيه مفصّلة:

| # | النوع | المصدر | الحكم |
|---|------|--------|------|
| 1 | ERROR — Security Definer View | `contracts_safe` (security_invoker=off) | **مقصود** — مذكور صراحة في `mem://security/views/contracts-safe-rationale` لإخفاء PII. تبديله ممنوع. |
| 2 | WARN — Extension in Public | `btree_gist` | **مقصود** — يُستخدم في فهارس exclusion على contracts/payment_invoices؛ نقله يكسر الفهارس. |
| 3 | WARN — Public Bucket Allows Listing | `waqf-assets` + policy `Anyone can view waqf assets` لدور `public` | **يُصلح فعلياً** — نسحب صلاحية LIST من `anon` مع إبقاء القراءة المباشرة عبر CDN. |
| 4-5 | WARN — anon SECURITY DEFINER | `get_public_stats`, `log_access_event` | **مقصود** — endpoints عامة (إحصائيات الهبوط + تسجيل وصول قبل المصادقة). |
| 6-44 | WARN — authenticated SECURITY DEFINER | 39 دالة (has_role, close_fiscal_year, get_*_dashboard, execute_distribution, …) | **مقصود** — كلها تتجاوز RLS بحراسة `has_role()` داخلها؛ التحويل إلى INVOKER يكسر التطبيق. |

## الفحص بعد التنفيذ (لا تعارضات متوقعة)

- **#3 (الإصلاح الفعلي)**: تغيير policy `Anyone can view waqf assets` ليصبح INSERT/SELECT مقيّداً على authenticated فقط، أو حذفها بالكامل لأن `bucket.public=true` يكفي للوصول عبر CDN URL. تأكدت من ذلك:
  - أصول EF/Email تُجلب عبر `getPublicUrl()` → CDN مباشر (لا يحتاج policy على storage.objects).
  - لا يوجد كود يستدعي `list()` على `waqf-assets` من anon. تحقق سريع: `rg "from\(.waqf-assets.\).*\.list"` يجب أن يعود فارغاً للأكواد العامة.
  - الأدمن يحتاج list في صفحة إدارة الأصول → يحتفظ بسياسة UPDATE/DELETE/INSERT الحالية (authenticated+admin) ونضيف SELECT for admin/accountant لتمكين list.

- **#1, #2, #4-44 (Ignore)**: عمليات قراءة فقط في scanner state — لا أثر على DB أو التطبيق.

## الخطوات

### 1) Migration (إصلاح #3 فقط)
```sql
DROP POLICY IF EXISTS "Anyone can view waqf assets" ON storage.objects;
CREATE POLICY "Authenticated can list waqf assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'waqf-assets');
```
الوصول العام للقراءة يبقى عبر `bucket.public=true` (Supabase CDN) — لا انكسار في PDF/Email templates.

### 2) Ignore 43 تنبيه مقصودة عبر `security--manage_security_finding`
لكل تنبيه: explanation عربي مختصر يربط بقرار التصميم/الذاكرة المناسبة.

### 3) تحديث `@security-memory`
إضافة قسم يوضح:
- `contracts_safe` بـ security_invoker=off مقصود (PII).
- `btree_gist` في public مقصود (exclusion indexes).
- `get_public_stats` + `log_access_event` endpoints عامة موثقة.
- جميع SECURITY DEFINER في public تحمل حراسة `has_role()` داخلياً — لا تطلب من السكنر إعادة رفعها.

### 4) التحقق
- `supabase--linter` بعد التنفيذ → يبقى فقط تنبيهات تم تصنيفها كـ accepted، أو 0 جديدة.
- `bunx vitest run` → بدون انحدار (لا تغييرات frontend/types).
- زيارة `/dashboard` + لوحة المستفيد للتأكد من تحميل صور/PDFs من `waqf-assets`.

## ما لن أنفّذه (مبررات)

- **نقل `btree_gist` خارج public**: يتطلب إعادة بناء فهارس exclusion + إيقاف الكتابة لحظياً. مخاطرة عالية مقابل تنبيه WARN واحد. سأوثّقه بدل تنفيذه.
- **تحويل أي دالة إلى SECURITY INVOKER**: يكسر تجاوز RLS المتعمّد (مثلاً `has_role` نفسها).
- **تبديل `contracts_safe`**: محظور صراحة في الذاكرة.

## النتيجة المتوقعة

Linter post-run: إصلاح فعلي = 1، مقبول/موثّق = 43. لا تعارض مع المنطق المالي/المحاسبي الموثّق في رسالتك السابقة (هذه الخطة لا تمس `useEndUserFinancials` ولا RPCs المالية — تلك تحتاج خطة منفصلة).