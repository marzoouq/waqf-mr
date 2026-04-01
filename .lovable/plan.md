

# تقرير التدقيق الجنائي — جميع المدفوعات الخارجية في المستودع

## ملخص تنفيذي

تم فحص **جميع مسارات الدفع الخارجي** (outbound payments) في المستودع بشكل منهجي. النتيجة: **لا يوجد تسريب أو ثغرة حرجة**، لكن هناك ملاحظات تستحق التوثيق.

---

## 1. جرد مسارات الدفع الخارجي

النظام يحتوي على **4 مسارات رئيسية** تُغيّر بيانات مالية:

| # | المسار | الآلية | الحماية |
|---|--------|--------|---------|
| 1 | تسديد فاتورة إيجار | `pay_invoice_and_record_collection` RPC | ✅ `SECURITY DEFINER` + `has_role(admin/accountant)` + `FOR UPDATE` lock |
| 2 | إلغاء تسديد فاتورة | `unpay_invoice_and_revert_collection` RPC | ✅ نفس الحماية + حذف income مرتبط |
| 3 | تحصيل يدوي (قديم) | `upsert_tenant_payment` RPC | ✅ محصّن: bounds check + حد `payment_count` + income reversal |
| 4 | توزيع حصص المستفيدين | `execute_distribution` RPC | ✅ محصّن: إعادة حساب من الخادم + تحقق وجود المستفيد + حارس تكرار |

---

## 2. نتائج التدقيق لكل مسار

### 2.1 `pay_invoice_and_record_collection` ✅ سليم
- يقفل الفاتورة بـ `FOR UPDATE` — لا سباق شروط
- يتحقق من حالة الفاتورة (`paid` = رفض) ووجود العقد
- يُنشئ سجل `income` ذري مع الفاتورة
- المبلغ المدفوع يأخذ من `p_paid_amount` أو يسقط على `v_invoice.amount`

### 2.2 `unpay_invoice_and_revert_collection` ✅ سليم
- يحذف سجل income **الأحدث المطابق** عبر `LIKE` على `invoice_number`
- يُعيد حالة الفاتورة (`overdue`/`pending`) بناءً على `due_date`
- يُنقص `paid_months` بمقدار 1

### 2.3 `upsert_tenant_payment` ✅ محصّن (بعد إصلاحات HIGH-15 + MED-20)
- لا يقبل `paid_months < 0`
- لا يقبل `paid_months > payment_count`
- عند إنقاص الدفعات يحذف سجلات income تلقائياً (LIFO)

### 2.4 `execute_distribution` ✅ محصّن (بعد إصلاحات #28 + #29)
- **لا يثق بأرقام العميل** — يعيد حساب كل شيء من الخادم:
  - `v_server_share` = من `accounts.waqf_revenue` و`beneficiaries.share_percentage`
  - `v_server_advances` = من `advance_requests` المدفوعة
  - `v_server_carryforward` = من `advance_carryforward` النشطة
- حارس تكرار يمنع التوزيع المزدوج
- تحقق نهائي: `v_sum_distributions <= v_available_amount + 0.01`

---

## 3. الوظائف الحافة (Edge Functions) — مسح خارجي

| الوظيفة | تواصل خارجي؟ | الحماية |
|---------|-------------|---------|
| `zatca-onboard` | ✅ ZATCA API | `getUser()` + admin only |
| `zatca-signer` | ✅ ZATCA API | `getUser()` + admin/accountant |
| `zatca-report` | ✅ ZATCA API | `getUser()` + admin/accountant |
| `zatca-xml-generator` | ❌ محلي | `getUser()` |
| `generate-invoice-pdf` | ❌ محلي | `getUser()` |
| `admin-manage-users` | ❌ Supabase Auth | `getUser()` + admin |
| `ai-assistant` | ✅ Lovable AI | `getUser()` |
| `beneficiary-summary` | ❌ محلي | `getUser()` |
| `webauthn` | ❌ محلي | `getUser()` |
| `guard-signup` | ❌ محلي | بدون JWT (مقصود) |

**لا توجد وظيفة تُرسل أموالاً فعلية** — كل الاتصالات الخارجية هي لـ ZATCA (ضريبية) أو AI (استشارية).

---

## 4. ملاحظات (ليست ثغرات، لكن جديرة بالتوثيق)

### 4.1 `unpay_invoice` — حذف income بـ `LIKE`
```sql
WHERE notes LIKE '%فاتورة ' || v_invoice.invoice_number || '%'
```
إذا تطابقت ملاحظات أكثر من سجل income مع نفس رقم الفاتورة، يحذف **الأحدث فقط** (`LIMIT 1`) — وهذا سلوك صحيح لكنه يعتمد على ثبات صيغة الملاحظات.

### 4.2 `upsert_tenant_payment` — مسار قديم
هذا المسار **لا يزال موجوداً** رغم أن `BUSINESS_RULES.md` ينص على أن "أزرار +/- أُزيلت" وأن "كل شيء يمر عبر `pay_invoice_and_record_collection`". الدالة لا تزال `GRANT`-ed لـ `authenticated` ومُستدعاة في `useTenantPayments.ts`.

### 4.3 لا يوجد مدفوعات بنكية فعلية
النظام **لا يتصل بأي بنك أو بوابة دفع** — التوزيعات تُسجّل كـ `pending` وتُصرف يدوياً خارج النظام.

---

## 5. الخلاصة

| البند | الحكم |
|-------|-------|
| حماية الصلاحيات | ✅ كل RPC يتحقق من `admin`/`accountant` |
| منع سباق الشروط | ✅ `FOR UPDATE` في كل مسار |
| منع التلاعب بالأرقام | ✅ `execute_distribution` يحسب من الخادم |
| منع التكرار | ✅ حارس تكرار في التوزيع + تحقق حالة في الفواتير |
| تسريب مالي خارجي | ✅ لا يوجد — لا بوابة دفع ولا تحويلات آلية |
| مسار `upsert_tenant_payment` القديم | ⚠️ لا يزال متاحاً — يُنصح بحذفه أو تقييده |

