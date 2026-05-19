# قائمة دوال SECURITY DEFINER المسموح بها (تحذير 0029)

هذه الدوال تظهر في تحذير Supabase Linter رقم
[`0029_authenticated_security_definer_function_executable`](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
لأنها قابلة للتنفيذ من المستخدمين المسجلين (`authenticated`).

تم قبول هذا التحذير عمداً للدوال أدناه لأن كلاً منها:

1. **يتحقق من الدور داخلياً** (`has_role(auth.uid(), 'admin'|'accountant')`)، أو
2. **يفلتر النتائج بحسب `auth.uid()`** بحيث لا يرى المستخدم بيانات غيره، أو
3. **يُستدعى حصراً من سياسات RLS** ولا يُنفّذ تأثيراً جانبياً، أو
4. **يحمي ثبات تسلسل ICV (ZATCA)** ويُستدعى من Edge Functions موثّقة.

تحويلها إلى `SECURITY INVOKER` غير ممكن لأن:
- بعضها يقرأ snapshots لسنوات مقفلة (RLS تمنع المستخدم العادي).
- بعضها يكتب في `audit_log` و `access_logs` التي تمنع `INSERT` من المستخدم.
- دوال RLS نفسها يجب أن تتجاوز RLS لمنع التكرار (recursion).

> أي إضافة لهذه القائمة يجب أن تُحدِّث أيضاً `ALLOWLIST_0029` في
> `scripts/supabase-lint-check.mjs` ليتجاوزها فحص CI.

## الدوال المسموح بها

### مساعدات RLS
| الدالة | المبرر |
|---|---|
| `has_role(uuid, app_role)` | تُستدعى داخل كل سياسة RLS؛ يجب أن تكون قابلة للتنفيذ من `authenticated`. |
| `is_fiscal_year_accessible(uuid)` | تتحقق من حالة السنة المالية ضمن سياسات RLS المالية. |
| `get_total_beneficiary_percentage()` | تُستخدم في trigger التحقق من نسب المستفيدين. |

### لوحات التحكم والتقارير
| الدالة | المبرر |
|---|---|
| `get_dashboard_full_summary(uuid)` | تتحقق من الدور وتُرجع KPIs مفلترة بحسب `auth.uid()`. |
| `get_dashboard_kpis(uuid)` | تجميعات للوحة الناظر/المحاسب فقط. |
| `get_beneficiary_dashboard(uuid)` | تُرجع بيانات المستفيد لـ `auth.uid()` فقط. |
| `get_beneficiary_decrypted(uuid)` | فك تشفير PII — يتحقق من admin أو ملكية الصف. |
| `get_expense_summary_by_type(uuid)` | للوحة المحاسب؛ يتحقق من الدور. |
| `get_income_summary_by_source(uuid)` | للوحة المحاسب؛ يتحقق من الدور. |
| `get_year_comparison_summary(uuid, uuid)` | مقارنة سنوات؛ admin/accountant فقط. |
| `get_multi_year_summary(uuid[])` | تجميع متعدد السنوات؛ يتحقق من الدور. |
| `get_max_advance_amount(uuid, uuid)` | يحسب سقف السلفة لمستفيد محدد. |
| `get_public_stats()` | إحصائيات هبوط مع تحكم admin بالظهور. |
| `get_support_analytics()` / `get_support_stats()` | لوحة الدعم؛ admin فقط. |

### عمليات Workflow حساسة
| الدالة | المبرر |
|---|---|
| `close_fiscal_year(uuid, jsonb, numeric)` | إقفال السنة؛ يتحقق من admin، ويكتب snapshots ومراجعة. |
| `reopen_fiscal_year(uuid, text)` | إعادة فتح السنة؛ admin فقط مع سبب موثّق. |
| `execute_distribution(...)` | يحسب التوزيعات على الخادم ويتجاهل قيم العميل. |
| `pay_invoice_and_record_collection(uuid, numeric)` | يدفع فاتورة ويسجل تحصيل ضمن transaction واحدة. |
| `unpay_invoice_and_revert_collection(uuid)` | يعكس الدفع؛ يتحقق من الدور. |
| `upsert_tenant_payment(...)` | يسجل دفع مستأجر؛ يتحقق من admin/accountant. |
| `upsert_contract_allocations(uuid, jsonb)` | يحدّث توزيع العقد على السنوات. |
| `generate_contract_invoices(uuid)` | توليد فواتير عقد. |
| `generate_all_active_invoices()` | توليد جماعي؛ admin فقط. |
| `reorder_bylaws(jsonb)` | ترتيب لوائح؛ admin فقط. |
| `notify_admins(...)` / `notify_all_beneficiaries(...)` | إرسال تنبيهات؛ يتحقق من الدور قبل الإرسال. |
| `log_access_event(...)` | كتابة سجل وصول لا يُسمح للمستخدم بالكتابة فيه مباشرة. |
| `check_rate_limit(text, int, int)` | فحص حد المعدل؛ يقرأ/يكتب جدول مغلق بـ RLS. |

### تسلسل ZATCA (ICV chain)
| الدالة | المبرر |
|---|---|
| `allocate_icv_and_chain(...)` | يحجز ICV ويربط الفاتورة بالسلسلة. |
| `commit_icv_chain(...)` | يثبّت الفاتورة في السلسلة بعد التوقيع. |
| `reserve_icv()` / `get_next_icv()` | حجز رقم ICV التالي. |
| `get_active_zatca_certificate()` | إرجاع الشهادة النشطة للمصادقة على الفاتورة. |
| `clear_zatca_otp()` | تنظيف OTP بعد الاستخدام. |

## دوال Triggers (مستثناة من 0028 — لا تُستدعى من العميل)

| الدالة | المبرر |
|---|---|
| `audit_app_settings_trigger()` | تسجيل تغييرات الإعدادات في `audit_log`. |
| `audit_trigger_func()` | trigger عام للمراجعة على الجداول الحسّاسة. |
| `auto_revoke_anon_execute()` | event trigger يسحب EXECUTE من `anon` تلقائياً. |
| `enforce_single_active_fy()` | يمنع وجود أكثر من سنة مالية نشطة. |
| `encrypt_beneficiary_pii()` | تشفير AES-256 لبيانات المستفيد قبل الإدراج. |
| `encrypt_zatca_private_key()` | تشفير المفتاح الخاص لشهادة ZATCA. |
| `prevent_category_circular_ref()` | يمنع المراجع الدائرية في تصنيفات المصروفات. |
| `prevent_closed_fiscal_year_modification()` | يحظر التعديل على سنة مقفلة. |
| `prevent_fiscal_year_overlap()` | يمنع تداخل تواريخ السنوات. |
| `prevent_issued_invoice_modification()` | يمنع تعديل فاتورة بعد الإصدار. |
| `sync_unit_status_on_contract_change()` | يحدّث حالة الوحدة عند تغيير العقد. |
| `update_support_ticket_timestamp()` | يحدّث `updated_at` لتذاكر الدعم. |
| `validate_advance_request_amount()` | يتحقق من سقف السلفة. |
| `validate_advance_status_transition()` | يفرض انتقالات الحالات المسموحة للسلفة. |
| `validate_invoice_chain_ref()` / `validate_invoice_chain_reference()` | يتحقق من سلامة مرجع سلسلة الفواتير. |
| `validate_ticket_rating()` | يتحقق من قيم تقييم تذاكر الدعم. |
| `validate_zatca_certificate_activation()` | يتحقق من تفعيل شهادة ZATCA. |

## دوال Cron / Background (مستثناة من 0028)

| الدالة | المبرر |
|---|---|
| `cron_archive_old_access_logs()` | أرشفة `access_logs` القديمة. |
| `cron_auto_expire_contracts()` | إنهاء العقود المنتهية تلقائياً. |
| `cron_check_contract_expiry()` | فحص العقود المقاربة للانتهاء وإرسال تنبيهات. |
| `cron_check_late_payments()` | فحص الدفعات المتأخرة وإصدار تنبيهات. |
| `cron_check_slow_queries()` | تتبّع الاستعلامات البطيئة وإرسال تقرير صحة. |
| `cron_check_zatca_cert_expiry()` | تنبيه عند اقتراب انتهاء شهادة ZATCA. |
| `cron_cleanup_old_notifications()` | حذف الإشعارات القديمة. |
| `cron_update_overdue_invoices()` | تحديث حالة الفواتير المتأخرة. |
| `cleanup_expired_challenges()` | تنظيف WebAuthn challenges المنتهية. |
| `cleanup_pending_invoice_chain()` | تنظيف فواتير ICV غير المثبّتة. |

## مساعدات تشفير PII (تُستدعى من triggers و Edge Functions)

| الدالة | المبرر |
|---|---|
| `encrypt_pii(text)` | تشفير AES-256 لأي قيمة PII قبل التخزين. |
| `decrypt_pii(text)` | فك التشفير؛ يتحقق من admin أو ملكية الصف عبر المستدعي. |
| `get_pii_key()` | يُرجع مفتاح التشفير من `vault.secrets`؛ DEFINER إلزامي. |
| `lookup_by_national_id(text)` | بحث آمن عن طريق رقم الهوية المشفّر؛ يتحقق من الدور. |

## Email Queue Internals (تُستدعى من process-email-queue Edge Function)

| الدالة | المبرر |
|---|---|
| `enqueue_email(...)` | إضافة بريد للطابور؛ تتحقق من الدور قبل الإدراج. |
| `read_email_batch(int)` | قراءة دفعة بـ SKIP LOCKED للمعالجة المتزامنة. |
| `delete_email(uuid)` | حذف بريد بعد الإرسال الناجح. |
| `move_to_dlq(uuid, text)` | نقل البريد الفاشل إلى Dead-Letter Queue. |

## دوال إضافية للوحات الدعم

| الدالة | المبرر |
|---|---|
| `get_support_analytics()` | تحليلات تذاكر الدعم؛ admin فقط. |
| `get_support_stats()` | إحصائيات سريعة لتذاكر الدعم؛ admin فقط. |

> إن ظهرت أي من هذه الدوال في تحذير 0028 ⇒ خلل في `auto_revoke_anon_execute`
> يجب إصلاحه فوراً.


## دوال Hooks
| الدالة | المبرر |
|---|---|
| `custom_access_token_hook(jsonb)` | يستدعيها GoTrue باسم النظام لإضافة الدور إلى JWT. |
| `sync_role_to_auth_meta()` | trigger مزامنة الدور — لا تُستدعى من العميل. |

## الدوال العامة (anon-callable) — مستثناة من 0028

| الدالة | المبرر |
|---|---|
| `get_public_stats()` | إحصائيات صفحة الهبوط للزوار. الإخراج مفلتر بواسطة `app_settings` (الناظر يتحكم بكل إحصائية: auto/manual/hidden). |
| `log_access_event(text,text,uuid,text,text,jsonb)` | تسجيل أخطاء/أحداث العميل قبل تسجيل الدخول. RLS على `access_logs` يمنع المستخدمين من القراءة. |

كلتاهما موسومتان في DB بـ `COMMENT ON FUNCTION ... IS '[anon-callable] ...'`،
والـ event trigger `auto_revoke_anon_execute` يحترم هذا الوسم ولا يسحب صلاحية
`EXECUTE` من `anon` عند إعادة الإنشاء.

> لإضافة دالة anon-callable جديدة: أضف الـ COMMENT بالوسم، امنح
> `EXECUTE` لـ `anon, authenticated`، وأضفها إلى `ALLOWLIST_ANON` في
> `scripts/supabase-lint-check.mjs`.

## كيف يعمل فحص CI
- Workflow: `.github/workflows/ci.yml` (خطوة "Supabase security linter").
- السكربت: `scripts/supabase-lint-check.mjs`.
- يفشل البناء عند ظهور أي تحذير `0028` أو `0029` خارج هذه القائمة.
- يتطلب أسرار GitHub: `SUPABASE_ACCESS_TOKEN` و `SUPABASE_PROJECT_REF`.
