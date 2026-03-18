

## الفحص الجنائي — الجولة الثانية عشرة (أمن قاعدة البيانات: 12 بنداً)

### التحقق بند بند مقابل البيانات الحية

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **DB-CRIT-1** | `decrypt_pii` ممنوحة لـ `authenticated` | **✅ مؤكد مباشرةً من الإنتاج** — `has_function_privilege('authenticated', 'decrypt_pii(text)', 'execute') = true`. Migration `20260313181829` سطر 53 يمنحها صراحةً. لا يوجد `REVOKE FROM authenticated` لاحق. **لكن**: الدالة نفسها (migration `20260314040815` سطر 247) تتحقق داخلياً: `IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN RETURN '********'`. المستفيد يستدعيها → يحصل على `********` وليس البيانات الحقيقية. **الخطر مُخفَّف بالفحص الداخلي لكن يجب سحب الصلاحية كطبقة دفاع إضافية** | **نعم** |
| **DB-CRIT-2** | `get_pii_key()` ممنوحة لـ `authenticated` | **✅ مؤكد مباشرةً من الإنتاج** — `true`. Migration `20260314021014` سطر 18 يتحقق: `IF NOT has_role → RETURN NULL`. المستفيد يحصل على `NULL`. **مُخفَّف لكن يجب السحب** | **نعم** |
| **DB-CRIT-3** | `contracts.notes` غير مُقنَّع في `contracts_safe` | **✅ مؤكد** — آخر migration (`20260318101512` سطر 53): `c.notes` بدون `CASE WHEN`. ملاحظات الناظر الداخلية مرئية للمستفيدين | **نعم** |
| **DB-BUG-1** | نسختان من `allocate_icv_and_chain` | **🟡 مقبول** — PostgreSQL function overloading يختار النسخة الأحدث (3 معاملات مع default). كلتا النسختين الأخيرتين تتحققان من الدور | لا |
| **DB-BUG-2** | `cron_check_late_payments` ممنوحة لـ `authenticated` | **❌ مدحوض** — Migration `20260306020909` سطر 32: `REVOKE FROM authenticated` ✅. Migration `20260313181829` سطر 75-76: "cron functions: لا GRANT" — لم تُعَد المنح | لا |
| **DB-BUG-3** | UNIQUE بدون `fiscal_year_id` → فواتير مكررة | **❌ مدحوض** — Migration `20260312141447` غيّر القيد إلى 2 أعمدة، **وأيضاً** migration `20260314065842` حدّث `generate_contract_invoices` ليستخدم `ON CONFLICT (contract_id, payment_number)` بعمودين فقط → **متطابقان** | لا |
| **DB-BUG-4** | Trigger ملتصق بنسخة قديمة | **🟡 مقبول** — Migration `20260306090758` أعادت إنشاء الدالة بـ `SECURITY DEFINER + SET search_path`. PostgreSQL يربط الـ trigger تلقائياً بأحدث نسخة من الدالة | لا |
| **DB-BUG-5** | `lookup_by_national_id` fallback يقارن encrypted بـ plaintext | **🟡 مقبول بالتصميم** — الـ fallback للسجلات القديمة غير المشفرة (مسار ترحيل). الدالة تُستدعى فقط من Edge Function عبر `service_role` ومحمية بـ rate limiting | لا |
| **DB-BUG-6** | Event trigger لا يشمل ALTER FUNCTION | **❌ تم إصلاحه** — Migration `20260314040815` أعادت إنشاء الـ trigger مع `CREATE FUNCTION, ALTER FUNCTION` | لا |
| **CSP-1** | `unsafe-inline` في style-src | **🟡 معروف** — مطلوب لـ Tailwind/Radix inline styles. موثق في SECURITY-KNOWLEDGE.md | لا |
| **CSP-2** | ZATCA API قد تُحجب | **❌ غير صحيح** — ZATCA API تُستدعى من Edge Functions (server-side) وليس من المتصفح. CSP لا تؤثر | لا |
| **CSP-3** | `blob:` في frame-src | **🟡 مطلوب** — لعرض PDF blobs في iframe. مخاطرة ضئيلة مع CSP الأخرى | لا |

### `encrypt_pii` أيضاً مكشوفة

تأكدت أيضاً أن `encrypt_pii(text)` ممنوحة لـ `authenticated` في الإنتاج. يجب سحبها مع الدالتين الأخريين.

---

### الإصلاحات المطلوبة — migration واحدة

#### Migration: سحب صلاحيات PII + تقنيع notes في contracts_safe

**1. REVOKE PII functions من authenticated** (DB-CRIT-1 + DB-CRIT-2):
```sql
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pii_key() FROM authenticated;
```

هذه الدوال تُستخدم داخلياً من:
- `get_beneficiary_decrypted(uuid)` — هذه SECURITY DEFINER وتستدعي `decrypt_pii` بسياق المالك → تبقى تعمل
- `encrypt_beneficiary_pii()` trigger — SECURITY DEFINER → تبقى تعمل
- لا يوجد استدعاء مباشر من الـ frontend لهذه الدوال

**2. تقنيع `notes` في `contracts_safe`** (DB-CRIT-3):

إعادة إنشاء الـ view مع `CASE WHEN` على `notes`:
```sql
CASE
  WHEN (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
  THEN c.notes ELSE NULL::text
END AS notes
```

---

### ملخص التأثير

- **Migration واحدة** بـ 3 أقسام (REVOKE + إعادة إنشاء view)
- لا تغييرات في الكود (الدوال مُستدعاة عبر SECURITY DEFINER فقط)
- من أصل 12 بنداً: **3 للإصلاح** (جميعها أمنية)، **0 مؤجلة**، **9 مدحوضة/مقبولة**
- أبرز المدحوضات: **DB-BUG-3** (القيد والدالة متطابقان بعمودين)، **DB-BUG-2** (cron لم تُعَد المنح)

