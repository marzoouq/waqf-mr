

# نظام التوزيعات والسُلف - خطة التنفيذ الشاملة

## ما تم مراجعته

بعد فحص الكود الحالي بالتفصيل، الخطة السابقة كانت **إطاراً عاماً** وتحتاج تفصيلاً في عدة نقاط حرجة. فيما يلي الخطة الكاملة مع جميع العمليات الحسابية والوظائف.

---

## المرحلة 1: قاعدة البيانات

### جدول طلبات السُلف (advance_requests)

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | المعرف |
| beneficiary_id | uuid NOT NULL | FK -> beneficiaries.id |
| fiscal_year_id | uuid | FK -> fiscal_years.id |
| amount | numeric NOT NULL | المبلغ المطلوب |
| reason | text | سبب الطلب |
| status | text NOT NULL DEFAULT 'pending' | pending / approved / paid / rejected |
| rejection_reason | text | سبب الرفض |
| approved_by | uuid | معرف الناظر الموافق |
| approved_at | timestamptz | تاريخ الموافقة |
| paid_at | timestamptz | تاريخ الصرف الفعلي |
| created_at | timestamptz DEFAULT now() | تاريخ الطلب |

### سياسات RLS

```text
- المستفيد: SELECT حيث beneficiary_id مرتبط بـ user_id = auth.uid()
- المستفيد: INSERT حيث beneficiary_id مرتبط بـ user_id = auth.uid() AND status = 'pending'
- الناظر (admin): ALL
```

### إضافة عمود fiscal_year_id للتوزيعات

جدول `distributions` الحالي لا يحتوي على `fiscal_year_id` -- سيتم إضافته للربط المباشر بالسنة المالية (بدلاً من الاعتماد فقط على account_id).

### Trigger للتدقيق

ربط `advance_requests` بمشغل `audit_trigger_func` لتسجيل كل عملية موافقة/رفض/صرف.

### Trigger لمنع التعديل في السنة المغلقة

ربط `advance_requests` بمشغل `prevent_closed_fiscal_year_modification`.

---

## المرحلة 2: العمليات الحسابية (الجزء الأهم)

### آلية التوزيع المنهجية

عند ضغط الناظر "توزيع الحصص":

```text
1. جلب availableAmount من calculateFinancials()
   = waqfRevenue - waqfCorpusManual
   (ريع الوقف - رقبة الوقف اليدوية)

2. لكل مستفيد:
   حصة_المستفيد = availableAmount * (share_percentage / totalBeneficiaryPercentage)

3. جلب السُلف المصروفة (status = 'paid') للسنة المالية الحالية:
   سلف_المستفيد = SUM(amount) FROM advance_requests
                   WHERE beneficiary_id = X AND fiscal_year_id = Y AND status = 'paid'

4. صافي_التوزيع = حصة_المستفيد - سلف_المستفيد

5. إنشاء سجل في distributions:
   { beneficiary_id, account_id, amount: صافي_التوزيع, status: 'pending', date: today }

6. تحديث distributions_amount في الحساب الختامي (accounts):
   distributions_amount = SUM(distributions.amount) + SUM(paid_advances)

7. تحديث remainingBalance في الواجهة تلقائياً
```

### آلية خصم السلفة

```text
عند طلب سلفة:
  1. حساب الحصة التقديرية = availableAmount * (share_percentage / total)
  2. جلب إجمالي السُلف السابقة غير المخصومة = SUM(paid advances for this FY)
  3. الحد الأقصى = (الحصة التقديرية * 50%) - السُلف السابقة
  4. إذا المبلغ المطلوب > الحد الأقصى -> رفض تلقائي

عند الموافقة وتأكيد الصرف:
  - تغيير status إلى 'paid'
  - تسجيل paid_at = now()

عند التوزيع النهائي:
  - خصم إجمالي السُلف المصروفة من حصة المستفيد
  - إذا السُلف أكبر من الحصة -> صافي = 0 (لا يوجد دين سالب)
```

---

## المرحلة 3: الهوكات الجديدة

### useAdvanceRequests.ts
- `useAdvanceRequests(beneficiaryId?)` -- جلب الطلبات (مفلتر للمستفيد أو الكل للناظر)
- `useCreateAdvanceRequest()` -- إنشاء طلب جديد (المستفيد)
- `useUpdateAdvanceStatus()` -- تحديث الحالة (الناظر: approve / reject / mark_paid)
- `usePaidAdvancesTotal(beneficiaryId, fiscalYearId)` -- إجمالي السُلف المصروفة

### useDistribute.ts
- `useDistributeShares()` -- تنفيذ التوزيع الفعلي:
  - يحسب حصة كل مستفيد
  - يخصم السُلف المصروفة
  - ينشئ سجلات distributions
  - يحدّث distributions_amount في accounts
  - يرسل إشعارات للمستفيدين

---

## المرحلة 4: واجهات الناظر

### 1. نافذة التوزيع (DistributeDialog.tsx)

تُفتح من زر جديد في `AccountsBeneficiariesTable`:

```text
+------------------------------------------+
| توزيع حصص المستفيدين                     |
|                                          |
| المبلغ المتاح للتوزيع: XXX ر.س           |
|                                          |
| المستفيد | النسبة | الحصة | السُلف | الصافي|
| أحمد     | 12.5%  | 12,500| 2,000 | 10,500|
| فاطمة    | 6.25%  | 6,250 | 0     | 6,250 |
| ...                                      |
|                                          |
| إجمالي التوزيع: XXX ر.س                  |
| إجمالي السُلف المخصومة: XXX ر.س          |
|                                          |
| [تأكيد التوزيع]              [إلغاء]     |
+------------------------------------------+
```

### 2. تبويب طلبات السُلف (في صفحة المستفيدين أو كتبويب مستقل)

```text
| # | المستفيد | المبلغ | التاريخ | الحالة | إجراء         |
| 1 | أحمد     | 5,000  | 1/1     | قيد..  | [موافقة][رفض] |
| 2 | فاطمة    | 3,000  | 5/2     | معتمد  | [تأكيد الصرف] |
```

### 3. تحديث AccountsBeneficiariesTable

- إضافة عمود "السُلف المصروفة" و "الصافي بعد الخصم"
- إضافة زر "توزيع الحصص" في الهيدر

---

## المرحلة 5: واجهة المستفيد

### تحديث MySharePage.tsx

- إضافة زر "طلب سلفة" يفتح نموذج بسيط (المبلغ + السبب)
- إضافة بطاقة رابعة: "السُلف" تعرض إجمالي السُلف المصروفة
- إضافة جدول "سجل السُلف" أسفل جدول التوزيعات يعرض:
  - المبلغ، التاريخ، الحالة (قيد المراجعة / معتمد / مصروف / مرفوض)
  - سبب الرفض (إن وجد)
- تحديث "الحصة المستحقة" = الحصة الأصلية - السُلف المصروفة

---

## المرحلة 6: الإشعارات

| الحدث | المستلم | الرسالة |
|-------|---------|---------|
| طلب سلفة جديد | الناظر | "طلب سلفة جديد من [اسم] بمبلغ [X] ر.س" |
| موافقة على السلفة | المستفيد | "تمت الموافقة على طلب السلفة بمبلغ [X] ر.س" |
| رفض السلفة | المستفيد | "تم رفض طلب السلفة: [السبب]" |
| صرف السلفة | المستفيد | "تم صرف سلفة بمبلغ [X] ر.س" |
| تنفيذ التوزيع | جميع المستفيدين | "تم توزيع حصص السنة المالية [X]. حصتك: [Y] ر.س" |

---

## المرحلة 7: الأمان والقيود

- التحقق من أن المبلغ المطلوب لا يتجاوز 50% من الحصة التقديرية
- منع تقديم طلب سلفة جديد إذا كان هناك طلب "قيد المراجعة" للمستفيد نفسه
- منع التوزيع إذا كانت السنة المالية مغلقة (إلا بصلاحية الناظر)
- Trigger تدقيق على جدول advance_requests
- منع المستفيد من تعديل أو حذف طلباته بعد الإرسال

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| Migration SQL | جدول advance_requests + عمود fiscal_year_id في distributions + RLS + triggers |
| `src/hooks/useAdvanceRequests.ts` | **جديد** - CRUD للسُلف |
| `src/hooks/useDistribute.ts` | **جديد** - تنفيذ التوزيع مع خصم السُلف |
| `src/components/accounts/DistributeDialog.tsx` | **جديد** - نافذة حوار التوزيع |
| `src/components/beneficiaries/AdvanceRequestDialog.tsx` | **جديد** - نموذج طلب السلفة |
| `src/components/accounts/AccountsBeneficiariesTable.tsx` | تعديل - إضافة زر التوزيع وأعمدة السُلف |
| `src/components/accounts/AdvanceRequestsTab.tsx` | **جديد** - إدارة طلبات السُلف للناظر |
| `src/pages/beneficiary/MySharePage.tsx` | تعديل - زر السلفة + جدول السُلف + خصم |
| `src/pages/dashboard/BeneficiariesPage.tsx` | تعديل - إضافة تبويب طلبات السُلف |
| `src/types/database.ts` | تعديل - إضافة نوع AdvanceRequest |

