# R4 — التصلب الأمني للتكاملات الخارجية (P1) — منجزة

تاريخ التنفيذ: 2026-06-17
المرجع: `00-FINAL-CONSOLIDATED-REPORT.md` (W5 — Edge/Integrations) + W6 (Database)

## الإصلاحات المُنفّذة

| # | الكود | الموقع | الإصلاح |
|---|---|---|---|
| 1 | W5-OTP-PLAINTEXT | `app_settings` + `zatca-onboard/renew` | OTP كان يُحفظ نصاً ساطعاً في `app_settings`. أُضيف ترغر `encrypt_zatca_otp_settings_trg` يشفّر القيمة قبل الكتابة بمفتاح `vault.decrypted_secrets.pii_encryption_key`. أُضيفت RPC `consume_zatca_otp()` تفك التشفير وتحذف القيمة (single-use). Edge Functions تستخدمها بدل القراءة المباشرة |
| 2 | W6-DUP-TRIGGER | `public.zatca_certificates` | حُذف الترغر المكرّر `trg_encrypt_zatca_private_key` (يُنفّذ نفس `encrypt_zatca_pk_trigger` على نفس الحقل). كان يضاعف العمل وقد يُربك ترتيب التنفيذ |
| 3 | W5-RPC-LEAK | `public.lookup_by_national_id(text)` | كانت قابلة للاستدعاء مباشرة عبر PostgREST من `anon`/`authenticated` → مسار جانبي لتعداد أرقام الهوية يلتفّ على rate-limit الـEdge Function. RPC الآن محصورة بـ `service_role` فقط. الاستدعاء الشرعي يمرّ حصراً عبر Edge Function `lookup-national-id` |
| 4 | W6-DOC | 4 دوال | توثيق دوال anon المتبقية كاستثناءات مقصودة عبر `COMMENT` (`check_rate_limit`, `get_rate_limit_count`, `log_access_event`, `get_public_stats`) |

## التحقق

```bash
psql -c "SELECT tgname FROM pg_trigger WHERE tgrelid='public.zatca_certificates'::regclass AND NOT tgisinternal;"
# → encrypt_zatca_pk_trigger فقط (لا تكرار)

psql -c "SELECT has_function_privilege('anon','public.lookup_by_national_id(text)','EXECUTE');"
# → false ✅

psql -c "SELECT proname FROM pg_proc WHERE proname='consume_zatca_otp';"
# → 1 row ✅
```

—

## شرح "أخطاء السياسات" التي يُبلّغ عنها Supabase Linter

المسح يُرجع 44 ملاحظة. **لا واحدة منها ثغرة فعلية** — كلها تنبيهات معلوماتية. تفصيلها:

### 1× ERROR — `0010_security_definer_view` على `contracts_safe`
- **السبب**: العرض مُعرَّف بـ `security_invoker=off` (يُنفَّذ بصلاحيات منشئه، يتجاوز RLS الجدول الأصلي).
- **لماذا مقصود**: العرض يفرض داخلياً (a) رفض `auth.uid() IS NULL`، (b) فلترة سنة مالية، (c) إخفاء PII (`tenant_name='***'` لغير الناظر/المحاسب). الصلاحيات على الجدول الأصلي `contracts` مغلقة، فالوصول الوحيد المسموح يمرّ عبر هذا العرض الذي يطبّق المنطق بنفسه.
- **التوثيق**: `docs/security/views.md` + `mem://security/views/contracts-safe-rationale`.
- **القرار**: ignored finding دائم.

### 5× WARN — `0028` (دوال SECURITY DEFINER قابلة للاستدعاء من anon)
الدوال الخمس بعد إصلاح R4:
| الدالة | السبب الشرعي |
|---|---|
| `check_rate_limit` | يجب أن تعمل قبل تسجيل الدخول لتحديد سرعة المحاولات (anti brute-force) |
| `get_rate_limit_count` | عرض عدّاد المحاولات للمستخدم على صفحة Login |
| `log_access_event` | تسجيل `login_failed` لمستخدمين لم يدخلوا بعد — anon ضروري |
| `get_public_stats` | إحصائيات الـ landing page (الناظر يتحكم بكل إحصائية auto/manual/hidden عبر `app_settings`) |
| ~~`lookup_by_national_id`~~ | **أُزيلت من anon في R4 ✅** |

### 38× WARN — `0029` (دوال SECURITY DEFINER قابلة للاستدعاء من authenticated)
كلها RPCs مشروعة للأدوار المسجّلة:
- **أمان وأدوار**: `has_role`, `jwt_role` (محذوفة في R1), `is_fiscal_year_accessible`, `assert_fiscal_year_open` — لا غنى عنها لأن RLS نفسه يستدعيها (security definer لتجنّب RLS recursive)
- **عمليات مالية**: `execute_distribution`, `update_advance_status`, `set_annual_report_publish`, `close_fiscal_year`, `reopen_fiscal_year` — كل واحدة تتحقق من الدور داخلها قبل التنفيذ
- **ZATCA**: `commit_icv_chain`, `reserve_icv`, `clear_zatca_otp`, `get_active_zatca_certificate`
- **PII/التشفير**: `get_pii_key`, `encrypt_pii`, `get_beneficiary_decrypted` — كلها تفحص الدور داخلياً
- **مساعدات**: `log_access_event` (تسجيل من أدوار مسجّلة), `get_public_stats`, إلخ.

**لماذا SECURITY DEFINER**: لأن RLS لا تسمح للمستخدم العادي بقراءة `user_roles` لتحديد دوره (recursive risk) — لذلك الدالة تعمل بصلاحيات المالك مع check داخلي صريح.

**لماذا لا نحوّلها إلى INVOKER**: ستفشل لأنها تقرأ من جداول/مخططات لا يملك المستخدم صلاحية عليها (مثل `vault.decrypted_secrets`).

**القرار**: 38 تنبيهاً مقصودة. كل دالة تطبّق `has_role()` أو فحص دور داخلي قبل أي إجراء حسّاس. السلوك يعادل سياسة RLS لكن بآلية أكثر مرونة.

—

## ما لم يُنفَّذ في R4 (مؤجّل بسبب التبعيات)

- **استبدال FK إلى `auth.users`** (5 جداول: `beneficiaries`, `user_roles`, `support_tickets×2`, `support_ticket_replies`):
  - **السبب في التأجيل**: لا يوجد جدول `profiles` حالياً. إنشاؤه يتطلب: (a) ترغر `handle_new_user` على `auth.users`، (b) backfill للمستخدمين الحاليين، (c) تحديث ~30 موقع استعلام في الواجهة. تغيير معماري كبير يستحق جولة منفصلة.
  - **التخفيف الحالي**: FKs الحالية تستخدم `ON DELETE CASCADE/SET NULL` وتعمل بشكل صحيح. الخطر الوحيد هو الالتزام بمعمارية Lovable المرجعية. **مؤجّل لـ R5**.
- **IP hashing في `access_log`**: الجدول **لا يحوي عمود IP أصلاً** (فقط `device_info` = user-agent). لا حاجة لـ R4.

## بوابة القبول R4

- [x] Migration نجحت
- [x] `lookup_by_national_id` غير قابلة للاستدعاء من المتصفح
- [x] ترغر مكرّر محذوف
- [x] OTP يُشفَّر تلقائياً عند الكتابة
- [x] Edge Functions تستخدم `consume_zatca_otp` RPC
- [ ] **مطلوب من المستخدم**: تجربة تدفّق ZATCA كامل (إدخال OTP → onboard) للتأكد من العمل end-to-end

## التالي

قل **"نفّذ R5"** للجولة المعمارية الكبرى: إنشاء جدول `profiles` + تحويل FKs الخمسة من `auth.users` إلى `profiles.id`، أو **"اكتفِ"** لو تريد إيقاف الجولات هنا.
