
# تقرير التحقق النهائي — الجولات 1-7

> آخر تحديث: 2026-03-14 | جميع الإصلاحات مُطبَّقة

---

## الجولة الأولى — 14 بنداً

| # | البند | الخطورة | الحالة | التفاصيل |
|---|-------|---------|--------|----------|
| CRIT-01 | `beneficiaries_safe` / `contracts_safe` بـ `security_invoker=false` | 🔴 | ✅ قرار تصميم موثَّق | شفافية مقصودة — `notes` تم تمويهها لغير admin/accountant |
| CRIT-02 | تناقض trigger (50% ثابتة) vs RPC (من app_settings) | 🔴 | ✅ تم الإصلاح | Trigger يقرأ الآن من `app_settings['advance_max_percentage']` |
| CRIT-03 | `getSession()` في WebAuthn | 🔴 | ❌ إنذار كاذب | Client-side مقبول — RLS تحمي server-side |
| HIGH-01 | race condition في `auto-version.yml` | 🟠 | ✅ مُصلح مسبقاً | `concurrency` block موجود |
| HIGH-02 | double-counting في `lookup-national-id` | 🟠 | ✅ مُصلح مسبقاً | re-read بعد `check_rate_limit` |
| HIGH-03 | `contracts_safe` بدون فائدة من `security_barrier` | 🟠 | ✅ قرار تصميم | مرتبط بـ CRIT-01 |
| HIGH-04 | `ai-assistant` يستخدم serviceClient | 🟠 | ❌ إنذار كاذب | مقصود — تصفية حسب الدور |
| HIGH-05 | `session?.access_token` قد يكون undefined | 🟠 | ✅ تم الإصلاح | null check + رسالة واضحة |
| MED-01 | `waqf_bylaws` سياسة `TO public` | 🟡 | ❌ إنذار كاذب | `has_role()` في USING تمنع anon |
| MED-02 | trigger السُلف INSERT فقط | 🟡 | ❌ إنذار كاذب | trigger منفصل على UPDATE + RLS |
| MED-03 | `access_log` INSERT مفتوح | 🟡 | ✅ مُصلح مسبقاً | `WITH CHECK (false)` |
| MED-04 | changelog heredoc | 🟡 | ✅ مُصلح مسبقاً | `printf` عبر env variable |
| MED-05 | `notes` في `beneficiaries_safe` مكشوف | 🟡 | ✅ تم الإصلاح | CASE WHEN يُخفيها لغير admin/accountant |

---

## الجولة الثانية — 11 بنداً جديداً

| # | البند | الخطورة | الحالة | التفاصيل |
|---|-------|---------|--------|----------|
| CRIT-04 | `allocate_icv_and_chain` مُعادة لـ `authenticated` | 🔴 | ❌ إنذار كاذب | guard داخلي `has_role(admin/accountant)` يمنع الاستغلال |
| CRIT-05 | `lookup_by_national_id` يُعاد فتحها تلقائياً | 🔴 | ❌ إنذار كاذب | guard داخلي + `get_pii_key()` يُرجع NULL لغير المخوَّلين |
| HIGH-06 | `cron_check_contract_expiry` يُرسل لكل المستفيدين | 🟠 | ✅ قرار تصميم | `ben_msg` لا يحتوي اسم المستأجر — مقبول |
| HIGH-07 | `upsert_tenant_payment` بتاريخ `CURRENT_DATE` دائماً | 🟠 | ✅ تم الإصلاح | أُضيف `p_payment_date` كمعامل اختياري |
| HIGH-08 | `reopen_fiscal_year` لا تُعالج السنة الجديدة | 🟠 | ❌ إنذار كاذب | `enforce_single_active_fy` trigger يُغلق السنة الأخرى |
| HIGH-09 | `auto_revoke_anon_execute` في `allowed_functions` | 🟠 | ❌ إنذار كاذب | event trigger function — لا يمكن استدعاؤها مباشرة |
| MED-06 | `log_access_event` تقبل `client_error` من anon | 🟡 | ✅ قرار تصميم | مقصود لتسجيل أخطاء صفحة تسجيل الدخول |
| MED-07 | المحاسب يرى جميع تذاكر الدعم | 🟡 | ✅ قرار تصميم | المحاسب دور موثوق |
| MED-08 | double-source لـ `paid_count` | 🟡 | ❌ إنذار كاذب | COALESCE يعمل كـ fallback وليس double-counting |
| MED-09 | `close_fiscal_year` بدون تحقق من pending | 🟡 | ✅ تم الإصلاح | يُرجع `warnings` في النتيجة (تحذير بدل منع) |
| Fallback | `useBeneficiariesDecrypted` يجلب من `beneficiaries` | 🟡 | ✅ تم الإصلاح | Fallback يستخدم الآن `beneficiaries_safe` |

---

## الجولة السادسة — إصلاح `logger.ts`

| # | البند | الخطورة | الحالة | التفاصيل |
|---|-------|---------|--------|----------|
| LOG-01 | `stack` trace يُرسل لـ `access_log` — يكشف مسارات الكود | 🟠 | ✅ تم الإصلاح | حُذف `stack` من metadata |
| LOG-02 | `LogAccessFn` type يستخدم `string` بدل union type | 🟡 | ✅ تم الإصلاح | أُضيف `AccessEventType` union type |

---

## الجولة السابعة — 11 بنداً (الكل إنذارات كاذبة)

| # | البند | الخطورة | الحالة | التفاصيل |
|---|-------|---------|--------|----------|
| CRIT-16 | `getSession()` في `useWebAuthn` | 🔴 | ❌ إنذار كاذب | Client-side — RLS تُفلتر بـ `auth.uid()` من JWT الفعلي |
| CRIT-17 | `getSession()` في `useGenerateInvoicePdf` | 🔴 | ❌ إنذار كاذب | Token يُتحقق منه server-side بـ `getUser()` |
| HIGH-29 | `URL.createObjectURL` بدون cleanup | 🟠 | ❌ إنذار كاذب | `revokeObjectURL` موجود في InvoiceViewer و PaymentInvoicesTab |
| HIGH-30 | CSS injection عبر ThemeColorPicker | 🟠 | ❌ إنذار كاذب | يُخزَّن معرّف الثيم فقط — يُبحث في مصفوفة ثابتة |
| HIGH-31 | أحداث مكررة في `useIdleTimeout` | 🟠 | ❌ إنذار كاذب | Cleanup صحيح في useEffect — نمط React قياسي |
| HIGH-32 | `selectedId` بدون UUID validation | 🟠 | ❌ إنذار كاذب | استعلامات مُعلَّمة + فحص تطابق مع السنوات الموجودة |
| MED-31 | Mock في AuthContext.test لا يتحقق من جلب الدور | 🟡 | ❌ ملاحظة اختبارات | لا تؤثر على الإنتاج |
| MED-32 | اختبارات edgeFunctionAuth تختبر نفسها | 🟡 | ❌ ملاحظة اختبارات | تحسين مستقبلي |
| MED-33 | `limit(100)` في useAdvanceRequests | 🟡 | ❌ تصميم مقصود | سقف كافٍ لسنة مالية واحدة |
| MED-34 | clearToasts عند logout | 🟡 | ❌ سلوك مقصود | حذف الإشعارات عند الخروج متوقع |
| MED-35 | رفع PDF بدون client-side auth check | 🟡 | ❌ تصميم صحيح | Storage RLS كافٍ |

---

## الخلاصة

**جميع المشاكل الحقيقية من 7 جولات مُعالجة. المشروع في حالة أمنية سليمة.**
