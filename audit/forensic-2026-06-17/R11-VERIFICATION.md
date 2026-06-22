# R11 — Verification (2026-06-22)

## الادعاء (يتكرر في كل `security--run_security_scan`)

```
id: EXPOSED_SENSITIVE_DATA
level: error
scanner: supabase_lov v3.2

The storage policy 'Authenticated users can view invoices' (applies to {public},
checks `auth.role() = 'authenticated'`) grants every authenticated user — including
beneficiaries and waqif — read access to all files in the private 'invoices' bucket.
```

## التحقق المباشر من القاعدة الحية

### 1) كل سياسات `storage.objects` (14 سياسة)

استعلام:
```sql
SELECT policyname, permissive, cmd, roles::text, qual
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;
```

السياسة الوحيدة لـ `SELECT` على `invoices`:

| الحقل | القيمة |
|------|--------|
| policyname | `Admin and accountant can view invoice files` |
| cmd | `SELECT` |
| roles | `{authenticated}` |
| qual | `bucket_id = 'invoices' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))` |

لا توجد أي سياسة `SELECT` أخرى على `invoices` تسمح لمستفيد أو واقف.

### 2) بحث هدف عن السياسة المزعومة

```sql
SELECT policyname, roles::text, qual
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND ('public' = ANY(roles)
       OR qual::text ILIKE '%auth.role()%'
       OR (qual::text ILIKE '%authenticated%' AND qual::text NOT ILIKE '%has_role%'));
```

**النتيجة: `[]` (صفر سجلات).**

### 3) عدّاد قاطع

```sql
SELECT
  count(*) AS total_policies,
  count(*) FILTER (WHERE policyname ILIKE '%authenticated users%') AS named_authenticated_users,
  count(*) FILTER (WHERE qual::text ILIKE '%auth.role()%')         AS uses_auth_role
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects';
```

| المقياس | القيمة |
|---------|--------|
| `total_policies` | 14 |
| `named_authenticated_users` | **0** |
| `uses_auth_role` | **0** |

### 4) حالة buckets

| bucket | public |
|--------|--------|
| `invoices` | **false** (خاص) |
| `disbursement-vouchers` | false |
| `waqf-assets` | true (مقصود — `mem://security/storage/waqf-assets-public-bucket-rationale`) |

## الاستنتاج

- السياسة المزعومة `Authenticated users can view invoices` **غير موجودة** في `pg_policies`.
- لا أي سياسة `storage.objects` تستخدم `auth.role() = 'authenticated'` (الـ antipattern الموصوف).
- bucket `invoices` خاص، والوصول للقراءة محصور على admin/accountant عبر `has_role()`.
- المستفيد والواقف **لا يستطيعان** تنزيل ملفات الفواتير. التهديد الموصوف غير قابل للتطبيق.

## السبب الجذري للـ finding

`supabase_lov` scanner v3.2 يحتفظ بـ **cache قديم** يعكس حالة سابقة (قبل R5 — جولة DB hardening في 2026-06-17 التي شدّدت سياسات invoice storage). الـ scanner يُكرّر نفس التحذير في كل تشغيل رغم أن القاعدة لا تطابقه.

## القرار

- **لا migration. لا تعديل على policies.**
- يُعتبر الـ finding **إيجابي كاذب مؤكَّد بـ3 استعلامات مستقلة**.
- يُتجاهل في كل scan لاحق إلى أن يُحدِّث Lovable scanner cache.
- إن ظهر بصيغة `manage_security_finding`-able في المستقبل (مع `internal_id`)، يُغلق بـ `ignore` مع الإشارة لهذا الملف.

## المراجع

- `audit/forensic-2026-06-17/R5-EXECUTED.md` — الجولة التي شدّدت السياسات.
- `audit/forensic-2026-06-17/R10-EXECUTED.md` §4 — حيث ظهر الـ finding أول مرة بعد R10.
- `docs/security/views.md` — مرجع سياسة storage الموحَّدة.

## تواريخ التحقق

- 2026-06-22 22:24 UTC — أول مرة
- 2026-06-22 22:39 UTC — تحقق ثانٍ بنفس الاستعلامات → نفس النتيجة
