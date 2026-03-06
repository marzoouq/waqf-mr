

# خطة إصلاح الجولة السادسة — بعد التحقق الجنائي

## نتائج التحقق الفعلية

### مشاكل مُلغاة (خاطئة أو مُصلحة فعلاً):

| المشكلة المُبلَّغة | الحقيقة |
|---|---|
| #N-1 — tenant_name في DisclosurePage/MySharePage | **مقصود** — المستخدم أكد أن الإفصاح الكامل للمستفيدين سلوك مطلوب |
| #N-2 — pii_encryption_key مقروء | **مُصلح فعلاً** — المهاجرة `20260306` أضافت `key != 'pii_encryption_key'`. التحقق من الـ DB الحي يؤكد أن السياسة مُطبَّقة |
| #1 — client_error مرفوض من log_access_event | **خاطئ** — الدالة الحالية في الـ DB لا تحتوي على أي IF/قيود على event_type. تقبل أي نوع |
| #6/#7 — beneficiaries_safe تعرض base64 | **مُصلح فعلاً** — المهاجرة `20260306` أعادت إنشاء الـ View بقناع ثابت `'********'` |
| #N-7 — beneficiaries_safe لم تُحدَّث | **مُصلح فعلاً** — نفس المهاجرة |

### مشاكل حقيقية مؤكدة (4 إصلاحات):

---

## 1. REVOKE دوال cron/invoices من authenticated
**الحقيقة من الـ DB الحي:** `has_function_privilege('authenticated', 'cron_check_late_payments()', 'EXECUTE')` = **true**. رغم أن المهاجرة `20260306` تتضمن REVOKE، النتيجة تُظهر أنه لم يُطبَّق بعد أو فشل. نفس الحال لـ `generate_contract_invoices` و `generate_all_active_invoices`.

**الإصلاح:** مهاجرة جديدة تسحب الصلاحية من الثلاث دوال:
```sql
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_all_active_invoices() FROM authenticated;
```

---

## 2. WaqifDashboard — الواقف محجوب عن beneficiaries
**الحقيقة من الـ DB الحي:** سياسة `beneficiaries` الحالية تسمح فقط لـ `user_id = auth.uid()` أو admin أو accountant. **الواقف غائب**. بما أن `beneficiaries_safe` مُعرَّفة بـ `security_invoker=on`، فإن RLS تُطبَّق — والواقف سيحصل على مصفوفة فارغة.

**الإصلاح:** إضافة دور الواقف لسياسة القراءة على `beneficiaries` (أو سياسة SELECT منفصلة):
```sql
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'accountant')
  OR has_role(auth.uid(), 'waqif')
);
```

---

## 3. auditLog PDF — فلترة PII من old_data/new_data
**ملف:** `src/utils/pdf/auditLog.ts` سطر 32-33

المشكلة: `summarizeData` يستبعد `id, created_at, updated_at` فقط — لكن لا يستبعد `national_id` و `bank_account`. إذا كانت سجلات قديمة تحتوي PII نصية، ستظهر في PDF.

**الإصلاح:** إضافة الحقلين المشفرين للقائمة المستبعدة:
```typescript
const entries = Object.entries(data).filter(
  ([k]) => !['id', 'created_at', 'updated_at', 'national_id', 'bank_account'].includes(k),
);
```

---

## 4. auth-email-hook preview CORS مفتوح
**ملف:** `supabase/functions/auth-email-hook/index.ts`

المشكلة: `/preview` endpoint يستخدم `Access-Control-Allow-Origin: *` بينما باقي الـ endpoints تستخدم whitelist.

**الإصلاح:** استخدام `getCorsHeaders(req)` بدل `*`:
```typescript
const previewCorsHeaders = getCorsHeaders(req);
```

---

## ملخص التغييرات

| النوع | التغيير |
|---|---|
| مهاجرة DB | REVOKE ثلاث دوال من authenticated |
| مهاجرة DB | إضافة waqif لسياسة قراءة beneficiaries |
| كود TS | فلترة national_id/bank_account من auditLog PDF |
| كود TS | تقييد CORS في auth-email-hook preview |

2 مهاجرات DB + تعديلان في كود TypeScript.

