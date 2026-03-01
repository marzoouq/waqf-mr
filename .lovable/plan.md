
# خطة إصلاح المشاكل المتبقية (18-33)

بعد فحص الكود الفعلي، تبيّن أن المشكلة #19 (زر إقفال السنة) **تم إصلاحها بالفعل** في التحديث السابق (سطر 45: `role === 'admin' &&`). المتبقي 15 مشكلة حقيقية تحتاج إصلاح.

---

## المشاكل الحرجة (3)

### 1. اتجاه الرسائل معكوس في RTL (#18)
**الملفات:** `BeneficiaryMessagesPage.tsx` سطر 173 + `MessagesPage.tsx` سطر 135

الحالي: `isMe ? 'justify-start' : 'justify-end'` -- عكس المطلوب في واجهة عربية.

**الإصلاح:** قلب الاتجاه: `isMe ? 'justify-end' : 'justify-start'`

### 2. PDF الحسابات يُرسل `netAfterVat` بدلاً من `netAfterZakat` (#20)
**الملف:** `AccountsViewPage.tsx` سطر 117

**الإصلاح:** تغيير `netRevenue: netAfterVat` الى `netRevenue: netAfterZakat` (المتغير متاح من `useFinancialSummary`)

### 3. دخل يُنشأ بدون `fiscal_year_id` على سنة مغلقة (#21 + #32)
**الملف:** `IncomePage.tsx` سطر 59

**الإصلاح:** ربط `fiscal_year_id` بالسنة المختارة دائما (نشطة او مقفلة)، مع الاعتماد على حماية `disabled={isClosed}` الموجودة فعلا على الازرار لمنع الاضافة على سنة مقفلة. تغيير الشرط من `activeFYId` الى `fiscalYear?.id`.

---

## المشاكل المتوسطة (5)

### 4. حصص المستفيدين محسوبة بمعادلة غير دقيقة (#22)
**الملف:** `AccountsBeneficiariesTable.tsx` سطر 69-71

الحالي يقسم على `totalBeneficiaryPercentage` مما يضخم الحصص اذا كان المجموع اقل من 100%.

**الإصلاح:** هذا السلوك **مقصود تصميميا** -- التوزيع النسبي يعني ان المبلغ الموزّع يُقسم بين المستفيدين الموجودين فقط. لكن سنضيف تنبيها واضحا اذا كان مجموع النسب لا يساوي 100%.

### 5. `percentage: 0` في PDF التقارير المالية (#23)
**الملف:** `FinancialReportsPage.tsx` سطر 109

**الإصلاح:** تغيير `percentage: 0` الى `percentage: Number(b.share_percentage)`

### 6. اشعار الدخل يكشف مبالغ تشغيلية (#25)
**الملف:** `useIncome.ts` سطر 19-26

**الإصلاح:** تحويل الاشعار لنص عام بدون المبلغ: `"تم تسجيل دخل جديد"` بدون تفاصيل المبلغ.

### 7. مصروفات كل العقارات تُطرح من عقار واحد (#26)
**الملف:** `PropertiesViewPage.tsx` سطر 93

**الإصلاح:** فلترة المصروفات حسب `property_id` للعقار المحدد بدلا من جمع الكل.

### 8. نوع `contract` مفقود من `typeConfig` (#30)
**الملف:** `NotificationsPage.tsx` سطر 19-24

**الإصلاح:** اضافة `contract: { label: 'عقود', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' }`

---

## المشاكل البسيطة (7)

### 9. الناظر لا يرى تذاكر الدعم (#29)
**الملف:** `MessagesPage.tsx` سطر 20

**الإصلاح:** ازالة فلتر `'chat'` من `useConversations()` ليرى الناظر جميع انواع المحادثات، مع اضافة تبويبات او مؤشر للنوع.

### 10. `AccountsViewPage` يعرض `netAfterVat` كبطاقة رئيسية (#33)
**الملف:** `AccountsViewPage.tsx` سطر 162-165

**الإصلاح:** تغيير البطاقة لتعرض `netAfterZakat` بعنوان "الصافي بعد الزكاة".

### 11. `BetaBanner` يقسم الكلاسات بطريقة هشة (#28)
**الملف:** `BetaBanner.tsx` سطر 19

**الإصلاح:** تعريف `BANNER_COLOR_CLASSES` ككائن يحتوي `bg` و `hover` منفصلين بدلا من سلسلة نصية واحدة.

### 12. ترحيلات تُخصم دفعة واحدة (#24)
**الملف:** `DistributeDialog.tsx`

**الإصلاح:** اضافة تعليق توثيقي وعرض تفاصيل الخصومات للناظر في حوار التوزيع (سنة المصدر + المبلغ).

### 13. `AccountsSummaryCards` لا يتلقى `netAfterZakat` (#27)
**الملف:** `AccountsPage.tsx`

**الإصلاح:** تمرير `netAfterZakat` كـ prop منفصل واستخدامه في البطاقات بدلا من الحساب الداخلي.

### 14. `useAccountsPage` يجلب جميع العقود (#31)
هذا تحسين اداء، لكن التغيير قد يكسر منطق التخصيص (`allocationMap`). سيُترك كملاحظة تحسينية مستقبلية لانه لا يؤثر على صحة البيانات.

### 15. رسالة ترحيب الواقف الميتة (#14)
**الملف:** `AdminDashboard.tsx`

تم التحقق ان الكود المتعلق بالواقف ازيل في التحديث السابق. لا حاجة لاصلاح اضافي.

---

## ملخص الملفات المتأثرة

| الملف | المشاكل |
|-------|---------|
| `BeneficiaryMessagesPage.tsx` | #18 |
| `MessagesPage.tsx` | #18, #29 |
| `AccountsViewPage.tsx` | #20, #33 |
| `IncomePage.tsx` | #21 |
| `AccountsBeneficiariesTable.tsx` | #22 |
| `FinancialReportsPage.tsx` | #23 |
| `useIncome.ts` | #25 |
| `PropertiesViewPage.tsx` | #26 |
| `NotificationsPage.tsx` | #30 |
| `BetaBanner.tsx` | #28 |
| `DistributeDialog.tsx` | #24 |
| `AccountsPage.tsx` + `AccountsSummaryCards.tsx` | #27 |

---

## ترتيب التنفيذ

1. **الحرجة اولا:** اتجاه الرسائل، PDF، fiscal_year_id
2. **المتوسطة:** النسب، الاشعارات، المصروفات، typeConfig
3. **البسيطة:** الباقي

اجمالي التعديلات: ~12 ملف، ~50 سطر تغيير فعلي.
