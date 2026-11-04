# تعليمات الوكيل — نظام إدارة وقف مرزوق بن علي الثبيتي

## قواعد عامة

- لا تعدّل ملفات المصادقة (`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`) دون طلب صريح
- لا تحذف كود موجود دون سبب واضح ومبرّر
- عند إصلاح خطأ، لا تغيّر ملفات غير مرتبطة بالمشكلة
- لا تعدّل الملفات المحمية: `supabase/config.toml`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`

## قواعد أمنية

- الأدوار تُخزّن حصراً في جدول `user_roles` — لا localStorage ولا profile
- كل جدول جديد يجب أن يحتوي على سياسات RLS
- كل Edge Function يجب أن تتحقق من المستخدم عبر `getUser()`
- لا تستخدم `getSession()` أبداً في Edge Functions
- لا تستخدم `SUPABASE_SERVICE_ROLE_KEY` كبديل لمصادقة المستخدم
- `verify_jwt = false` مقصود — لا تغيّره

## قواعد الواجهة

- الواجهة عربية بالكامل (RTL)
- رسائل Toast بالعربية عبر `sonner`
- استخدم متغيرات CSS للألوان (`hsl(var(--primary))`) — لا ألوان ثابتة
- استخدم `@/` كاختصار المسار دائماً
- استخدم `logger` من `@/lib/logger` بدلاً من `console.*`

## قواعد قاعدة البيانات

- أسماء الجداول والأعمدة بـ `snake_case`
- استخدم `createCrudFactory` لأي جدول CRUD جديد
- لا تنشئ مرجع foreign key إلى `auth.users` — استخدم جدول `profiles` إذا لزم الأمر
- استخدم validation triggers بدلاً من CHECK constraints للتحقق الزمني

## بروتوكول التنفيذ قبل الدفع

- قبل أي `push` يجب الالتزام ببروتوكول التنفيذ الرسمي في `CONTRIBUTING.md`
- أي تغيير أمني أو تغييرات في `supabase/migrations` لا يُدفع دون استكمال checkpoints الإلزامية الموثقة

## معايير المشروع الشاملة (مرجعية)

تفاصيل كل فئة محفوظة كقواعد تُطبَّق تلقائياً في كل جلسة:

- **أسلوب الكود والتسمية** → `mem://conventions/code-style-and-naming`
- **المكتبات والمعمارية** → `mem://conventions/libraries-and-architecture`
- **الاختبار والجودة** → `mem://conventions/testing-and-quality`
- **اللغة وصوت العلامة** → `mem://conventions/language-and-brand-voice`
- **ممنوعات Lovable** → `mem://conventions/lovable-forbidden-actions`

عند أي تعارض بين هذا الملف والذاكرة، تُعتمد الذاكرة لأنها الأحدث.
- File access: every storage.objects policy must call public.can_access_file (deny grant > allow grant > archive category rule in file_category_rules > bucket rule in file_access_rules > deny); invoices have no SELECT policy and download only via invoice-file-url, which also calls it. Why: single fail-closed decision point.
- Support ticket routing: recipients per category live in `ticket_recipient_roles` (SQL) and `CATEGORY_ROUTING` (client) and must match; a guard test enforces parity. Why: one routing truth on both sides.
- Read state: messages/ticket notifications are marked read only via `mark_conversation_read` / `mark_ticket_notifications_read`, not direct updates. Why: server checks participation.
- Vite stays on major 5 and vitest on major 4 (vitest 5 requires Vite 6+); TypeScript stays ~5.8.3. Why: platform supports Vite 5 and project rule pins TS.
- Backend URL/publishable key have a build-time fallback in `scripts/public-backend-env.ts` (wired via vite `define`), because `.env` is gitignored and publish builds otherwise ship without them (live site stuck on loader). Values in `.env` always win.
- Dialogs: every Dialog/AlertDialog inherits the shared frame (mobile margin, dvh max-height, scroll); form grids inside dialogs are single-column on mobile; enforced by `src/test/dialogResponsiveGuard.test.ts`. Why: dialogs must fit every screen.
- Receipt vouchers: issued/voided only by the trigger on payment_invoices status and void_receipt_voucher (admin); never deleted; public QR check via verify_receipt_voucher returns no tenant data. Why: one numbering truth and no PII leak.
- Official documents: every downloaded PDF goes through finalizePdf, which registers it via issue_document (issued_documents, server-insert only) and prints reference + QR to /verify/document; disbursement vouchers register with their own number from the edge function. Why: one verification path for all documents.
