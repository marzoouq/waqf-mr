

## ملخص شامل لجميع Cron Jobs المجدولة في المشروع

### المعمارية
النظام يستخدم طبقتين للمهام المجدولة:
1. **pg_cron** — دوال PostgreSQL تعمل داخل قاعدة البيانات مباشرة (6 دوال)
2. **Edge Function** — دالة `check-contract-expiry` تعمل كـ HTTP endpoint يُستدعى من pg_cron أو يدوياً

---

### جدول المهام المجدولة (pg_cron)

| # | اسم المهمة | الجدول الزمني | الدالة | الوظيفة |
|---|---|---|---|---|
| 1 | `expire-contracts-daily` | `0 1 * * *` (1:00 ص يومياً) | `cron_auto_expire_contracts()` | تحويل العقود المنتهية تلقائياً إلى حالة "expired" |
| 2 | `check-expiry-daily` | `0 8 * * *` (8:00 ص يومياً) | `cron_check_contract_expiry()` | إشعار بالعقود التي تنتهي خلال 30 يوماً + تذكير أسبوعي بالمنتهية (أحد) |
| 3 | `late-payments-weekly` | `0 9 * * 1` (9:00 ص كل اثنين) | `cron_check_late_payments()` | فحص تأخر الدفعات + ملخص أسبوعي (أحد) |
| 4 | `update-overdue-invoices-daily` | `30 1 * * *` (1:30 ص يومياً) | `cron_update_overdue_invoices()` | تحديث فواتير `pending` المتأخرة إلى `overdue` |
| 5 | `cleanup-notifs-weekly` | `0 2 * * 0` (2:00 ص كل أحد) | `cron_cleanup_old_notifications()` | حذف الإشعارات المقروءة > 90 يوم |
| 6 | `archive-logs-monthly` | `0 3 1 * *` (3:00 ص أول كل شهر) | `cron_archive_old_access_logs()` | أرشفة سجلات الوصول > 6 أشهر |
| 7 | `cleanup-rate-limits-weekly` | `0 4 * * 0` (4:00 ص كل أحد) | SQL مباشر | حذف سجلات rate_limits الأقدم من يوم |

---

### فحص الأمان لكل دالة

| الدالة | SECURITY DEFINER | search_path | REVOKE FROM PUBLIC | GRANT TO |
|---|---|---|---|---|
| `cron_auto_expire_contracts` | ✅ | ✅ `'public'` | ✅ | postgres, service_role |
| `cron_check_contract_expiry` | ✅ | ✅ `'public'` | ✅ | postgres, service_role |
| `cron_check_late_payments` | ✅ | ✅ `'public'` | ✅ | postgres, service_role |
| `cron_update_overdue_invoices` | ✅ | ✅ `'public'` | ✅ | postgres |
| `cron_cleanup_old_notifications` | ✅ | ✅ `'public'` | ✅ | postgres, service_role |
| `cron_archive_old_access_logs` | ✅ | ✅ `'public'` | ✅ | postgres, service_role |

**جميع الدوال محمية بشكل صحيح:** SECURITY DEFINER + search_path ثابت + REVOKE من anon/PUBLIC/authenticated.

---

### Edge Function: `check-contract-expiry`

- **المصادقة:** timing-safe comparison مع `SUPABASE_SERVICE_ROLE_KEY` (للـ cron) أو تحقق يدوي من دور admin
- **الوظيفة:** نسخة أغنى من `cron_check_contract_expiry` + `cron_check_late_payments` مع:
  - إشعارات مخصصة حسب الدور (admin يرى تفاصيل المستأجر، beneficiary يرى رسالة عامة)
  - فحص تأخر الدفع بأكثر من دفعتين
  - Deduplication يومي
- **ملاحظة:** لا يوجد `cron.schedule` يستدعي هذه الدالة عبر HTTP — يبدو أنها تُستدعى يدوياً فقط من واجهة الناظر

---

### المشاكل والملاحظات

#### ⚠️ ملاحظة 1: تكرار وظيفي (Edge Function vs pg_cron)
`check-contract-expiry` Edge Function تقوم بنفس عمل `cron_check_contract_expiry()` + جزء من `cron_check_late_payments()`. هذا تكرار متعمد — الـ Edge Function تُستدعى يدوياً من الواجهة، بينما pg_cron يعمل تلقائياً. لا يوجد تعارض لأن كلاهما يفحص deduplication.

#### ⚠️ ملاحظة 2: `cron_check_late_payments` — تعارض في يوم الملخص
الملخص الأسبوعي يُرسل يوم **الأحد** (DOW = 0)، لكن المهمة مجدولة يوم **الاثنين** (`* * 1`). الملخص لن يُرسل أبداً من pg_cron لأن المهمة لا تعمل يوم الأحد.

**الإصلاح:** تغيير الجدول إلى `0 9 * * 0,1` أو نقل شرط الملخص ليوم الاثنين.

#### ✅ ملاحظة 3: حذف الجداول القديمة
Migration `20260306023216` يحذف 6 مهام قديمة بأسماء مختلفة قبل إعادة جدولتها بأسماء جديدة في `20260306023200`. هذا صحيح ومنظم.

#### ✅ ملاحظة 4: `cron_check_late_payments` — فلترة السنوات المقفلة
Migration `20260301140149` أضاف فلترة `fy.status != 'closed'` لتجاهل العقود في سنوات مالية مقفلة. ✅

---

### ملخص تنفيذي

| # | البند | الحالة | الأولوية |
|---|---|---|---|
| ✅ | 7 مهام pg_cron مجدولة ومؤمنة | مكتمل | — |
| ✅ | Edge Function `check-contract-expiry` مؤمنة | مكتمل | — |
| ✅ | Deduplication في جميع الإشعارات | مكتمل | — |
| ✅ | REVOKE من anon/PUBLIC على جميع الدوال | مكتمل | — |
| ⚠️ | ملخص المتأخرات الأسبوعي لن يُرسل (تعارض يوم) | **يحتاج إصلاح** | متوسطة |

### الإصلاح المطلوب

تغيير جدول `late-payments-weekly` من `0 9 * * 1` (اثنين فقط) إلى `0 9 * * 0,1` (أحد + اثنين) — أو تعديل شرط الملخص في الدالة من `DOW = 0` إلى `DOW = 1`.

**الأسهل:** تعديل الدالة `cron_check_late_payments` لتغيير شرط الملخص من `EXTRACT(DOW FROM CURRENT_DATE) = 0` إلى `EXTRACT(DOW FROM CURRENT_DATE) = 1` ليتوافق مع يوم التشغيل (الاثنين).

