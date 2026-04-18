

## التدقيق الجنائي قبل النشر — تقرير شامل

### ✅ صحة Frontend (ممتازة)
| المؤشر | القيمة |
|---|---|
| TypeScript errors | **0** |
| ESLint errors | **0** |
| ESLint warnings | 1 (TanStack Virtual — مكتبة) |
| Build | ✅ ناجح (22.64s، PWA: 237 entries / 3.9MB) |
| أكبر chunk | `vendor-pdf` 542KB / 179KB gzip — مقبول |

---

### 🔴 ثغرات أمنية حرجة في Backend (يجب إصلاحها قبل النشر)

#### #1 (CRITICAL) — 4 Views بدون `security_invoker=on`
| View | المشكلة |
|---|---|
| `beneficiaries_safe` | `NOT_SET` — تنفّذ بصلاحيات postgres، تتجاوز RLS |
| `contracts_safe` | `NOT_SET` — نفس المشكلة |
| `v_fiscal_year_summary` | `NOT_SET` — يكشف ملخصات سنوات غير منشورة |
| `zatca_certificates_safe` | `security_invoker=false` — صريح |

**الأثر**: المستفيد/الواقف يستطيع قراءة بيانات تتجاوز RLS التقييدي على السنوات غير المنشورة عبر `v_fiscal_year_summary`.
**الإصلاح**: `ALTER VIEW <name> SET (security_invoker = on);` لكل view + التأكد من أن الـ underlying tables تحوي RLS مناسب.

#### #2 (CRITICAL) — `zatca_certificates` بدون سياسات INSERT/UPDATE/DELETE
- السياسة الوحيدة: `SELECT USING(false)` فقط
- RLS مفعّل، لذا الكتابة محجوبة افتراضياً للمستخدمين العاديين ✅
- لكن: لا توجد سياسة صريحة للأدمن للكتابة → **حالياً Edge Functions فقط (بـ service_role) تستطيع الكتابة**
- **يحتاج تأكيد قصدي**: هل هذا مقصود؟ إذا نعم → توثيق فقط. إذا لا → إضافة `INSERT/UPDATE FOR admin`.

#### #3 (CRITICAL) — `realtime.messages` بدون RLS policies
- 11 جدول مُعلَن في `supabase_realtime`: `accounts`, `advance_requests`, `contracts`, `distributions`, `expenses`, `fiscal_years`, `income`, `payment_invoices`, `support_tickets` …
- بدون policy على `realtime.messages` → **أي مستخدم authenticated يستطيع subscribe لأي قناة** ويستلم تحديثات بيانات ليست له
- **الأثر**: مستفيد يستطيع subscribe لقناة `contracts` ويرى تغييرات contracts (تحايل على RLS الحالي للقراءة الأولى — لكن الـ payload يصل عبر realtime)
- **الإصلاح**: إضافة سياسة على `realtime.messages` تربط الاشتراك بـ `has_role` المناسب لكل topic

#### #4 (WARN) — `access_log` و `access_log_archive` على `{public}` بدلاً من `{authenticated}`
- السياسات تعمل (`has_role` يُرجع false للـ anon) لكن هشّ
- **الإصلاح**: `ALTER POLICY ... TO authenticated`

#### #5 (INFO) — `waqf-assets` bucket عام
- موثَّق في `mem://security/storage/waqf-assets-public-bucket-rationale` كقرار مقصود (شعارات PDF + Email templates)
- **لا إجراء** — مقبول

#### #6 (INFO) — `contract_fiscal_allocations` متاح للمستفيد/الواقف لكنه يربط بـ contracts التي تحوي PII
- التحقق: الكود يستخدم `contracts_safe` (بعد إصلاح #1)؟ يحتاج فحص query patterns

---

### 📋 المجالات التي **لم** تُفحَص بعمق

| المجال | السبب |
|---|---|
| محتوى منطق 11 Edge Function | فُحصت كصناديق سوداء (deploy ناجح، logs نظيفة) |
| 32 stored procedure | يحتاج SQL audit يدوي للمنطق التجاري |
| 29 trigger | لم تُحاكَ سيناريوهات |
| تطابق RLS مع frontend queries (joins) | يحتاج e2e بكل دور |
| HIBP password protection | لم يُتحقق من تفعيله |

---

### 🗺️ خطة الإصلاح (موجة P9 — pre-publish security)

**SQL migration واحدة تحوي:**

```sql
-- 1. CRITICAL: إصلاح 4 views
ALTER VIEW public.beneficiaries_safe SET (security_invoker = on);
ALTER VIEW public.contracts_safe SET (security_invoker = on);
ALTER VIEW public.v_fiscal_year_summary SET (security_invoker = on);
ALTER VIEW public.zatca_certificates_safe SET (security_invoker = on);

-- 2. CRITICAL: realtime authorization
CREATE POLICY "Authenticated channel subscriptions" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    -- سيناريوهات tailored لكل topic — يحتاج تصميم دقيق
    -- الخيار الأبسط: قصر realtime على admin/accountant فقط
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 3. WARN: access_log policies → authenticated
ALTER POLICY "Admins can view access_log" ON public.access_log TO authenticated;
ALTER POLICY "No deletes on access_log" ON public.access_log TO authenticated;
ALTER POLICY "No direct inserts on access_log" ON public.access_log TO authenticated;
ALTER POLICY "No updates on access_log" ON public.access_log TO authenticated;
-- نفس الشيء لـ access_log_archive (4 سياسات)
```

**ملاحظة على #3 (realtime)**: الحل المقترح يعطّل realtime للمستفيد/الواقف. إذا كانت بعض الجداول تحتاج realtime لهم (مثل `notifications`)، يجب تصميم policy أدق per-topic. **يحتاج قرارك**.

---

### 🎯 توصية النشر

**🛑 لا تنشر قبل إصلاح #1 و #3** (تسريب بيانات حقيقي عبر views + realtime).
**✅ #2 و #4 و #6 يمكن إصلاحها بعد النشر** (دفاع في العمق، لا تسريب فعلي حالياً).

### خيارات للموافقة:
- **A)** تنفيذ موجة P9 كاملة (إصلاح #1 + #3 + #4 في migration واحدة) — **موصى به**
- **B)** تنفيذ #1 فقط (views) ثم النشر، ومعالجة #3 لاحقاً مع تصميم realtime تفصيلي
- **C)** تنفيذ #1 + #3 (الحرجَين فقط) ثم النشر
- **D)** عرض تفاصيل أعمق لأي بند قبل اتخاذ قرار

