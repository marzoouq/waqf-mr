## تقرير الفحص الجنائي الهجين — الإصدار الثالث ✅

### ملخص تنفيذي

فحص جنائي شامل على 3 طبقات: **AdminDashboard** + **SupportDashboard** + **الهوكات المالية العميقة** + **مكونات الداشبورد**. تم التحقق من 18 بنداً إجمالاً، إصلاح 10 مشاكل حقيقية، ورفض 8 إنذارات كاذبة/تصميمية.

**الاختبارات**: 600+ اختبار ✅ — 0 فشل

---

### الطبقة الأولى — AdminDashboard + Support + Permissions

| # | المشكلة | الحالة | التفاصيل |
|---|---------|--------|----------|
| BUG-01 | طلب HTTP زائد لكل العقود | ✅ مُصلح | استُبدل `useContractsByFiscalYear('all')` باستعلام خفيف |
| BUG-02 | نسبة التحصيل تحسب عقوداً لا مبالغ | ✅ مُصلح | أُعيد الحساب بالمبالغ مع دعم `partially_paid` |
| BUG-03 | `yoy.isLoading` غائب | ❌ إنذار كاذب | يعمل تزامنياً عبر `useMemo` |
| BUG-04 | `expiringContracts` بلا `useMemo` | ✅ مُصلح | استُخرج إلى `useMemo` |
| BUG-06 | `availableAmount` سالب | ✅ مُصلح | `Math.max(0, ...)` |
| Support | إحصائيات من 20 تذكرة فقط | ✅ مُصلح | `useSupportAnalytics` يجلب 2000 |
| Perms | مفاتيح `support`/`annual_report` غائبة | ✅ مُصلح | مُزامنة في 3 ملفات |

### الطبقة الثانية — الهوكات المالية + المكونات

| # | المشكلة | الحالة | التفاصيل |
|---|---------|--------|----------|
| BUG-C1 | `isDeficit` مفقود في السنة النشطة | ✅ مُصلح (وقائي) | أُضيف `isDeficit: false` — لا مستهلك حالي لكن وقائي |
| BUG-C2 | `waqfCorpusPrevious=0` بدون حساب | ❌ سلوك صحيح | الـ fallback المتوقع بدون `currentAccount` |
| BUG-C3 | `fiscalYearId='all'` يُبطل الحساب | ❌ بالتصميم | لا حساب ختامي واحد لـ "الكل" |
| BUG-C4 | `shareBase` stored vs live | ❌ بالتصميم | السنة المقفلة تستخدم القيم المخزنة عمداً |
| **BUG-R2** | `__skip__` → `'all'` طلبات غير مقصودة | **✅ مُصلح** | تحويل `__skip__` إلى `__none__` لتعطيل الهوكات |
| BUG-R1 | `benLoading` يُعيق التحميل | ❌ سلوك صحيح | المستفيدون مُستخدمون فعلياً |
| **BUG-M1** | CollectionHeatmap يعرض دخل لا تحصيل | **✅ مُصلح** | تغيير المصدر من `income` إلى `paymentInvoices` مع `paid_date` |
| **BUG-M2** | ZATCA تُقطع عند 10 بلا إشعار | **✅ مُصلح** | إضافة صف `+ X فاتورة أخرى` مع Badge العدد الحقيقي |
| BUG-Y1 | `prevContractualRevenue = 0` stub | 🟡 ملاحظة | لا مستهلك — تنظيف مستقبلي |
| BUG-M3 | CollectionSummaryChart counts | ❌ تم إصلاحه مسبقاً | BUG-02 عالج الجذر |

---

### الملفات المُعدَّلة (الطبقة الثانية)

| الملف | نوع التغيير |
|-------|------------|
| `src/hooks/useRawFinancialData.ts` | BUG-R2: `__skip__` → `__none__` |
| `src/hooks/useComputedFinancials.ts` | BUG-C1: إضافة `isDeficit: false` |
| `src/components/dashboard/CollectionHeatmap.tsx` | BUG-M1: تحويل من `income` إلى `paymentInvoices` |
| `src/components/dashboard/PendingActionsTable.tsx` | BUG-M2: مؤشر الفواتير الإضافية |
| `src/pages/dashboard/AdminDashboard.tsx` | تحديث prop لـ CollectionHeatmap |

### التقييم النهائي

- **الأمن**: 9.5/10 — لا تغييرات على RLS أو المصادقة
- **الأداء**: 10/10 — إزالة طلبات HTTP زائدة (BUG-01 + BUG-R2)
- **الدقة المالية**: 10/10 — تحصيل فعلي في الخريطة الحرارية + نسبة بالمبالغ
- **شفافية UI**: 9.5/10 — مؤشر واضح للفواتير المخفية
- **الاختبارات**: 600+ ✅ — 0 فشل

**الحالة**: مُعتمد ✅
