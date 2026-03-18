

# فحص شامل لملفات الهجرات — النتائج والإصلاحات المطلوبة

## ما تم فحصه

فحصت **18 ملف هجرة** يتعلق بـ `contracts_safe` و `beneficiaries_safe` + ملف `.gitignore`. هذا التسلسل الزمني الكامل:

```text
التسلسل الزمني لـ security_invoker (18 هجرة):

20260218001323  beneficiaries_safe  security_invoker=ON
20260301194239  beneficiaries_safe  security_invoker=ON
20260302220345  beneficiaries_safe  security_invoker=ON
20260306020909  beneficiaries_safe  security_invoker=ON
20260312072144  beneficiaries_safe  security_invoker=ON
20260312155031  beneficiaries_safe  security_invoker=TRUE
20260313162017  BOTH views         security_invoker=FALSE  ← أول إصلاح
20260314024401  beneficiaries_safe  security_invoker=FALSE + يستدعي decrypt_pii()
20260314025643  BOTH views         security_invoker=TRUE   ← كسر مجدداً
20260314041550  ALTER beneficiaries SET security_invoker=TRUE
20260316013140  contracts_safe     بدون security_invoker   ← إصلاح جزئي
20260316060846  ALTER contracts    SET security_invoker=TRUE ← كسر مجدداً!
20260316155751  REVOKE/GRANT فقط
20260318101512  BOTH views         بدون security_invoker   ← إصلاح + notes مكشوفة
20260318102000  BOTH views         ★ نسخة مطابقة 100% للملف السابق ★
20260318124043  contracts_safe     security_invoker=TRUE   ← كسر ثالث!
20260318131426  BOTH views         بدون security_invoker   ← Round 15 (الحالة النهائية) ✅
```

## النتائج المؤكدة

### 1. ملفان متطابقان 100% (مؤكد)

| الملف | المحتوى |
|-------|---------|
| `20260318101512_29652d94-5bfa-48f5-a46f-a7516caeb189.sql` | 111 سطر: DROP+CREATE كلا العرضين |
| `20260318102000_fix_safe_views_remove_security_invoker.sql` | 111 سطر: **نفس المحتوى حرفياً** |

كلاهما:
- يُنشئان `contracts_safe` بدون `security_invoker` لكن **بـ `c.notes` مكشوفة** (سطر 53)
- يُنشئان `beneficiaries_safe` بتقنيع ثابت `'***'` بدون CASE WHEN (سطر 89-93)

**الأثر**: تنفيذ مزدوج غير ضار (DROP IF EXISTS + CREATE = idempotent) لكنه فوضى في سجل الهجرات.

### 2. `notes` مكشوفة في 4 هجرات (مؤكد)

| الهجرة | `c.notes` | الحالة |
|--------|-----------|--------|
| `20260316013140` | `c.notes` مباشرة بدون CASE | مكشوفة |
| `20260314025643` | `c.notes` مباشرة | مكشوفة |
| `20260318101512` | `c.notes` مباشرة | مكشوفة |
| `20260318102000` | `c.notes` مباشرة | مكشوفة (نسخة مكررة) |
| `20260318124043` | `CASE WHEN admin/accountant THEN c.notes` | **مُقنَّعة** ✅ |
| `20260318131426` | `CASE WHEN admin/accountant THEN c.notes` | **مُقنَّعة** ✅ |

**الحالة النهائية**: Round 15 يقنّع `notes` بشكل صحيح. لكن 4 هجرات سابقة كشفتها.

### 3. `beneficiaries_safe` في `20260314024401` يستدعي `decrypt_pii()` (مؤكد)

```sql
-- سطر 16-17:
WHEN ... THEN public.decrypt_pii(b.national_id)
WHEN ... THEN public.decrypt_pii(b.bank_account)
```

هذا الـ view كان سيفشل **لو بقي نشطاً** بعد سحب `EXECUTE` من `authenticated` في Round 15. لكنه مُستبدَل بهجرة لاحقة. **الخطر**: إذا عاد أحد لهذه الهجرة في بيئة اختبار = كسر فوري.

### 4. `.gitignore` — سطر مكرر (مؤكد)

```
31: # Bun lockfiles (not used — npm is preferred)
32: bun.lock
33: bun.lockb
34: bun.lock    ← مكرر!
```

### 5. `close_fiscal_year` — الهجرة `20260314025643` بدون `FOR UPDATE` (مؤكد)

```sql
-- سطر 89:
SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;
-- ← بدون FOR UPDATE
```

**الحالة النهائية**: Round 15 (`20260318131426` سطر 211) أعاد `FOR UPDATE`. محلول.

---

## خطة الإصلاح

### الإصلاح 1: حذف الملف المكرر

حذف `20260318101512_29652d94-5bfa-48f5-a46f-a7516caeb189.sql` — محتواه مطابق 100% لـ `20260318102000` وكلاهما مُلغى بـ Round 15. حذف الأقدم يُنظّف سجل الهجرات بدون أي تأثير وظيفي.

**ملاحظة**: إذا كان الملف مُسجلاً في `supabase_migrations` كهجرة مُطبَّقة، فالحذف من الريبو فقط (الملف المحلي) آمن — لن يُعاد تنفيذه.

### الإصلاح 2: تنظيف `.gitignore`

إزالة السطر المكرر `bun.lock` (سطر 34).

### الإصلاح 3: توثيق — إضافة تعليق في Round 15

إضافة تعليق في أعلى ملف Round 15 يوثّق أنه يُلغي الهجرات السابقة:

```sql
-- يُلغي ويستبدل: 20260318101512, 20260318102000, 20260318124043
-- السبب: تذبذب security_invoker (8 تبديلات عبر 18 هجرة)
```

---

## ملخص

| البند | الحالة | الإصلاح |
|-------|--------|---------|
| ملفان متطابقان (101512 = 102000) | **مؤكد** | حذف الأقدم |
| notes مكشوفة في 4 هجرات | **محلول في Round 15** | لا إصلاح |
| decrypt_pii في view قديم | **محلول في Round 15** | لا إصلاح |
| `.gitignore` سطر مكرر | **مؤكد** | تنظيف |
| close_fiscal_year بدون FOR UPDATE | **محلول في Round 15** | لا إصلاح |
| تذبذب security_invoker (8 تبديلات) | **محلول في Round 15** | توثيق |

**3 ملفات تُعدَّل**: حذف ملف هجرة مكرر + تنظيف `.gitignore` + توثيق Round 15.

