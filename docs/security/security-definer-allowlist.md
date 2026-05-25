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

## دوال Triggers — REVOKED (Migration #2, 2026-05-25)

سُحبت `EXECUTE` من `PUBLIC, anon, authenticated` وأُبقي `postgres, service_role` فقط.
لم تعد تُحسَب ضمن تحذير 0029. القائمة محفوظة هنا للتوثيق التاريخي فقط:

`audit_app_settings_trigger`, `audit_trigger_func`, `encrypt_beneficiary_pii`,
`encrypt_zatca_private_key`, `enforce_single_active_fy`, `prevent_category_circular_ref`,
`prevent_closed_fiscal_year_modification`, `prevent_fiscal_year_overlap`,
`prevent_issued_invoice_modification`, `set_distribution_fiscal_year`,
`sync_role_to_auth_meta`, `sync_unit_status_on_contract_change`,
`update_support_ticket_timestamp`, `update_updated_at_column`,
`validate_advance_request_amount`, `validate_advance_status_transition`,
`validate_app_settings_value`, `validate_category_type`, `validate_conversation_type`,
`validate_invoice_chain_reference`, `validate_invoice_vat`, `validate_payment_invoice_vat`,
`validate_polymorphic_invoice_item_ref`, `validate_reply_content`, `validate_support_ticket`,
`validate_ticket_rating`, `validate_zatca_certificate_activation`.

إن ظهرت أي منها مجدداً في 0029 → شخص ما منحها صلاحية يدوياً؛ أعد سحبها قبل الإضافة للقائمة.

> `auto_revoke_anon_execute` و `validate_invoice_chain_ref` (التواقيع الأخرى) تبقى في القائمة
> الأصلية إن وُجدت — تحقّق قبل الحذف.

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
- Workflow: `.github/workflows/ci.yml`.
- خطوتان:
  1. **Supabase security linter** → `scripts/supabase-lint-check.mjs` — يفشل عند أي تحذير `0028` أو `0029` خارج Allowlist.
  2. **SECURITY DEFINER allowlist sync** → `scripts/security-definer-sync-check.mjs` — يفشل عند أي عدم تطابق بين DB، السكربت، والتوثيق.
- يتطلب أسرار GitHub: `SUPABASE_ACCESS_TOKEN` و `SUPABASE_PROJECT_REF`.

## فحص المزامنة — الخيارات القابلة للضبط

سكربت `security-definer-sync-check.mjs` يقبل CLI flags ومتغيرات بيئة (CLI تطغى):

| Flag | Env | افتراضي | الوصف |
|---|---|---|---|
| `--check-doc` | `CHECK_DOC_SYNC` | `true` | فعّل مقارنة التوثيق ↔ السكربت. |
| `--check-db` | `CHECK_DB_SYNC` | `true` | فعّل مقارنة DB ↔ Allowlist. |
| `--schemas` | `DEFINER_SCHEMAS` | `public` | Schemas مفصولة بفواصل. |
| `--name-pattern` | `DEFINER_NAME_PATTERN` | `.*` | Regex POSIX لتصفية أسماء الدوال. |
| `--exclude-pattern` | `DEFINER_EXCLUDE_PATTERN` | `^$` | Regex لاستثناء أسماء (مثل `^test_`). |
| `--doc-path` | `ALLOWLIST_DOC_PATH` | `docs/security/security-definer-allowlist.md` | مسار ملف التوثيق. |
| `--strict` | `STRICT_MODE` | `true` | فشل البناء عند أي فرق (false = warning فقط). |
| `--report-json` | `REPORT_JSON_PATH` | فارغ | حفظ التقرير كـ JSON. |

أمثلة:
```bash
node scripts/security-definer-sync-check.mjs --check-doc=false
node scripts/security-definer-sync-check.mjs --exclude-pattern='^cron_'
node scripts/security-definer-sync-check.mjs --strict=false --report-json=sync-report.json
```

يمكن أيضاً تشغيل CI يدوياً (`workflow_dispatch`) لتجاوز الافتراضيات.

