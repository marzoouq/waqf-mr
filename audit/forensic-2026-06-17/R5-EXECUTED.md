# R5 — تشديد أمان قاعدة البيانات (مُنفَّذ 2026-06-17)

## ✅ تم بالكامل

| # | البند | الحالة | التحقق |
|---|------|--------|--------|
| W6-F01 | `get_support_stats` ← role guard admin/accountant | ✅ | `prosrc LIKE '%has_role%'` |
| W6-F02 | `get_support_analytics` ← role guard admin/accountant | ✅ | كما أعلاه |
| W6-F04 | `get_max_advance_amount` ← guard: المستفيد لنفسه أو admin/accountant | ✅ | حارس ownership على `beneficiaries.user_id = auth.uid()` |
| W6-F05 | `consume_zatca_otp` ← إزالة fallback نص ساطع | ✅ | يرفع `EXCEPTION` عند غياب vault key أو فشل فك التشفير، ويحذف القيمة المعطوبة |
| W6-F06 | `encrypt_zatca_otp_setting` ← REVOKE من authenticated | ✅ | لا entry لـ authenticated في `routine_privileges` |
| W6-F18 | `cron_check_late_payments` ← REVOKE من authenticated | ✅ | كما أعلاه |
| W6-F27 | `disbursement_vouchers_public` ← `security_barrier=true` | ✅ | `reloptions={security_invoker=true,security_barrier=true}` |
| W6-F05b | `consume_zatca_otp` EXECUTE ← service_role فقط | ✅ | REVOKE من PUBLIC/authenticated |

## 🔵 موثّق كـ "غير محتاج للحارس"
- **W6-F03** `get_total_beneficiary_percentage` — تُرجع رقماً غير حساس (إجمالي نسب المستفيدين، مثلاً 100). يستخدمها المستفيد ذاته لحساب حصته في `useMyShare`. لا قيمة أمنية لإضافة حارس.

## ⏸️ مؤجَّل إلى R9
- **W6-F07..F16** حذف 10 أزواج فهارس مكررة (تنظيف أداء، ليس أمنياً).
- **W6-F17** إضافة GRANTs صريحة لـ 42 جدول (defence-in-depth، يحتاج migration منفصلة كبيرة).
- **W6-F19..F24** حذف فهارس غير مستخدمة (يحتاج 30 يوم مراقبة بعد إعادة الإحصاءات).

## ملاحظات
- الـ 42 linter warnings الظاهرة بعد التنفيذ **سابقة** لـ R5 وموثّقة في R4 كقرارات تصميمية مقصودة (دوال vault/has_role/zatca).
- لم يتم تعديل أي ملف TS — الواجهة تواصل استدعاء الدوال بنفس التواقيع، لكن غير المخوّلين سيتلقّون الآن `42501 — غير مصرح`.

## التأثير على الواجهة
- المستفيد/الواقف يحاول استدعاء `get_support_stats/analytics` مباشرة → خطأ 42501 (الواجهة بالفعل لا تعرض هذه الصفحات لهم — صلاحيات UI تمنع، الآن DB يمنع أيضاً = defence-in-depth).
- المستفيد يستدعي `get_max_advance_amount(my_id, fy)` → يعمل (ownership match).
- استدعاء OTP من Edge Function عبر service_role → يعمل؛ من أي عميل آخر → 42501.

## التالي
**R6** — تكاملات Edge (W5): ZATCA OTP env fallback × 2، AI gateway timeout، lookup-national-id PII leak.
