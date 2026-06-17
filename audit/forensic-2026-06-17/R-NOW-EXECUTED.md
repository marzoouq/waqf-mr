# R-NOW — إصلاحات حرجة عاجلة (2026-06-17)

## تنفيذ مباشر قبل اكتمال W2/W5/W6/W8

---

## ✅ FIX-1 (W7 #1) — حارس حذف الفواتير المدفوعة

**الملف:** `src/lib/services/invoicesService.ts` — دالة `remove()`

**المشكلة:** كان بإمكان أي مستدعٍ حذف فاتورة بحالة `paid` أو `partially_paid` مباشرة، مما يكسر سجلات الدفع المرتبطة ويخالف قاعدة Invoice Deletion Safeguard.

**الإصلاح:** قراءة `status` قبل الحذف وإطلاق استثناء عربي واضح إذا كانت الحالة محظورة. الترتيب الزمني (DB ثم Storage) بقي كما هو.

---

## 🔵 FIX-2 — تأكيد عدم تسرّب PII فعلي (W4 F-01..F-04)

**نتيجة التحقق من قاعدة البيانات:**

```sql
SELECT pg_get_viewdef('public.contracts_safe', true);
-- CASE WHEN r.is_privileged THEN c.tenant_name ELSE '***' END
```

عرض `contracts_safe` يُقنّع `tenant_name` و`tenant_id_number` و`tenant_tax_number` وكل حقول العنوان تلقائياً للمستخدم غير المُميَّز (المستفيد/الواقف). 

**التشخيص الأصلي في W4 كان إيجابياً كاذباً:** حقل `tenant_name` يصل العميل بقيمة `'***'` فقط، فلا تسرّب فعلي. توثيق هذا هنا لتجنّب إعادة فتح القضية. (يُترك التحسين التجميلي لإزالة العمود من PDF المستفيد لجولة UX لاحقة — ليس أمنياً.)

---

## 🔵 FIX-3 — تأكيد سلامة سلسلة ICV (W7 #2)

**نتيجة البحث الموسّع:**

```bash
rg "reserve_icv|commit_icv_chain" supabase/functions/ src/
# supabase/functions/zatca-signer/index.ts:93  → reserve_icv
# supabase/functions/zatca-signer/index.ts:219 → commit_icv_chain
```

`reserve_icv` و`commit_icv_chain` يُستدعيان من `zatca-signer` بالتسلسل الصحيح. **W7 #2 إيجابي كاذب** (البحث الأصلي اقتصر على `src/` فقط).

---

## 🔵 FIX-4 — تأكيد التوزيع الخادم-موثوق (W7 #3)

**نتيجة فحص الدالة المخزّنة `execute_distribution`:**

- `SECURITY DEFINER` مع `has_role(auth.uid(), 'admin'|'accountant')`
- `SELECT … FOR UPDATE` على الحساب الختامي → قفل صفّي يمنع double distribution
- `assert_fiscal_year_open(p_fiscal_year_id)` يمنع التنفيذ على سنة مقفلة
- إعادة حساب server-side في `v_server_share` / `v_server_net` / `v_server_deficit` (يتجاهل قيم العميل)

الحساب client-side في `useDistributionCalculation` **preview فقط**، لا يُعتمد عليه في الكتابة. **W7 #3 إيجابي كاذب** ومتوافق مع قاعدة Server-Side Distribution.

---

## 🔵 FIX-5 — تأكيد منطق ترحيل السلف (W7 #6)

استعلام `useActiveCarryforwards` يستخدم `or(to_fiscal_year_id.eq.{fy}, to_fiscal_year_id.is.null)` بشكل مقصود:
- `to_fiscal_year_id = fy` → ترحيل مستهدَف
- `to_fiscal_year_id IS NULL` → ترحيل مفتوح يُطبَّق على أول سنة قادمة

السلوك مطابق لـ Advance Carryforward spec. **W7 #6 إيجابي كاذب** (وصف الفحص الأصلي اعتبره خطأً عمومياً).

---

## ملخص الحالة

| البند | الحالة |
|------|--------|
| إصلاح كودي فعلي | 1 (FIX-1) |
| إيجابيات كاذبة موثّقة | 4 (FIX-2..5) |
| ينتظر الجولات | W2/W5/W6/W8 |

**خطوة تالية:** الانتظار لاكتمال الجولات الأربع المتبقية لتجميع التقرير النهائي.
