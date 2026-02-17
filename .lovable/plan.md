

# تقرير الفحص الجنائي العميق - الجزء الثاني
# الملفات التي لم يتم فحصها بعمق سابقاً

---

## الملخص

تم فحص **22 ملف إضافي** بعمق شمل: جميع الهوكات المخصصة، صفحات المستفيدين، صفحة الحسابات الختامية الكاملة، أدوات PDF، مكونات التقارير، صفحة المصادقة، وجميع الوظائف الخلفية المتبقية.

---

## 1. المشاكل المكتشفة

### 1.1 خطورة متوسطة

**A. استعلامات بدون حد صفوف (limit) - 6 مواضع**

الهوكات التالية لا تستخدم `.limit()` وقد تتجاوز حد 1000 صف:

| الملف | الاستعلام | المخاطرة |
|-------|-----------|----------|
| `useExpenses.ts` سطر 39 | `useExpensesByFiscalYear` | بيانات مالية قد تنمو |
| `useIncome.ts` سطر 39 | `useIncomeByFiscalYear` | بيانات مالية قد تنمو |
| `useInvoices.ts` سطر 65 | `useInvoicesByFiscalYear` | فواتير قد تتراكم |
| `useAuditLog.ts` سطر 43 | `useAuditLog` | سجل التدقيق ينمو بسرعة (اخطر موضع) |
| `useMessaging.ts` سطر 17 | `useConversations` | محادثات بدون حد |
| `useMessaging.ts` سطر 48 | `useMessages` | رسائل بدون حد |

**التوصية**: اضافة `.limit(500)` لجميع هذه الاستعلامات، خاصة `useAuditLog` الذي ينمو بسرعة مع كل عملية CRUD.

---

**B. تسريب ذاكرة محتمل في `InvoiceViewer.tsx` (سطر 25-51)**

عند اغلاق الـ Dialog ثم فتحه بسرعة مع ملف مختلف، يتم استدعاء `getInvoiceSignedUrl` مرتين بسبب عدم الغاء الطلب السابق. المتغير `revoked` يمنع تعيين الـ URL لكن لا يلغي طلب الشبكة نفسه.

```text
المشكلة:
فتح ملف A → بدء تحميل → اغلاق → فتح ملف B → بدء تحميل B
                                   ↑ تحميل A يستمر في الخلفية (لا يُلغى)
```

**التوصية**: استخدام `AbortController` لالغاء الطلب السابق.

---

**C. `AccountsPage.tsx` - حفظ الاعدادات بدون debounce كافٍ (سطر 113-124)**

الدالة `saveSetting` تستخدم `setTimeout(500ms)` لكنها تُنشئ `ref` جديدة لكل مفتاح. عند تعديل نسبة الناظر ونسبة الواقف بسرعة، يمكن ان تتداخل الطلبات. هذا ليس خطيراً لان كل مفتاح له timeout مستقل، لكن لا يوجد معالجة خطأ شاملة اذا فشل الـ upsert.

---

### 1.2 خطورة منخفضة

**D. `useAuditLog.ts` - خريطة الجداول ناقصة (سطر 15-24)**

`TABLE_NAMES_AR` لا تشمل جداولl `units` و`fiscal_years` رغم ان لهما مشغلات تدقيق:

```text
المفقود:
- units → 'الوحدات'
- fiscal_years → 'السنوات المالية'
```

**التوصية**: اضافة `units: 'الوحدات'` و `fiscal_years: 'السنوات المالية'` للخريطة.

---

**E. `check-contract-expiry` - فلترة الاشعارات المكررة غير دقيقة (سطر 90-96)**

الاستعلام يجلب جميع اشعارات اليوم من نوع `warning` بدون تصفية بـ `user_id`، مما يعني ان اشعار مرسل لأدمن واحد يمنع ارساله لأدمن آخر.

```text
المشكلة:
- ادمن A يتلقى اشعار "عقد 123 ينتهي خلال 5 ايام"
- ادمن B لن يتلقى نفس الاشعار لان الرسالة موجودة في الجدول
```

**التوصية**: اضافة `.eq('user_id', admin.user_id)` في فحص التكرار، او الاكتفاء بالمنطق الحالي اذا كان مقبولاً (اشعار واحد يكفي لأي ادمن).

---

**F. `AuthContext.tsx` - `fetchUserRole` تستخدم `.single()` بدلاً من `.maybeSingle()` (سطر 36-47)**

اذا لم يكن للمستخدم دور (مستخدم جديد لم يُعيّن له دور بعد)، سيُلقي `.single()` خطأ في الـ console. الكود يتعامل معه عبر `if (data && !error)` لكن الخطأ يظهر في الـ console بدون داعٍ.

**التوصية**: تغيير `.single()` الى `.maybeSingle()`.

---

**G. `DashboardLayout.tsx` - `allAdminLinks` و`allBeneficiaryLinks` تُنشأ في كل render (سطر 75-101)**

المصفوفتان ثابتتان لكنهما تُنشأ داخل المكون مما يعني اعادة انشائهما مع كل render. التأثير طفيف على الاداء لكنه مخالف لأفضل الممارسات.

**التوصية**: نقلهما خارج المكون كثوابت.

---

**H. `MySharePage.tsx` - حساب `distributableAmount` مكرر (سطر 64-66)**

```typescript
const distributableAmount = waqfRevenue - waqfCorpusManual;
const beneficiariesShare = distributableAmount;
```

هذا الحساب مُعرّف ايضاً في `useFinancialSummary` كـ `availableAmount`. يجب استخدام القيمة من الهوك لضمان التطابق الجنائي.

**التوصية**: استبدال الحساب المحلي بـ `availableAmount` من `useFinancialSummary`.

---

**I. نفس المشكلة في `DisclosurePage.tsx` سطر 48-49**

نفس الحساب المكرر لـ `distributableAmount` بدلاً من استخدام `availableAmount` من الهوك.

---

## 2. ملاحظات ايجابية (ما تم التحقق منه وهو سليم)

| الملف | النتيجة |
|-------|---------|
| `useCrudFactory.ts` | نمط CRUD موحد ومحكم مع limit: 500 |
| `useFinancialSummary.ts` | منطق جنائي سليم - يقرأ من السجل المدقق اولاً |
| `accountsCalculations.ts` | حسابات مالية صحيحة مع 36 اختبار |
| `useNotifications.ts` | حد 50 اشعار + Realtime + CRUD كامل |
| `useMessaging.ts` | حماية 5000 حرف + Realtime + تنظيف القنوات |
| `useTenantPayments.ts` | upsert بـ onConflict صحيح |
| `useIdleTimeout.ts` | تنظيف timers في cleanup + countdown دقيق |
| `maskData.ts` | اخفاء بيانات حساسة بنمط موحد |
| `ErrorBoundary.tsx` | يغلف التطبيق بالكامل مع واجهة عربية |
| `SecurityGuard.tsx` | حماية متوازنة (حساس فقط) |
| `InvoiceViewer.tsx` | يستخدم `getInvoiceSignedUrl` (الصحيحة) |
| `Auth.tsx` | `.maybeSingle()` + idle message + reset password |
| `lookup-national-id` | rate limit + timing attack protection |
| `ai-assistant` | getClaims + message limits + streaming |
| `check-contract-expiry` | مصادقة مزدوجة + منع تكرار |
| `auto-expire-contracts` | مصادقة مزدوجة + اشعار |
| `pdf/core.ts` | خطوط عربية + حدود زخرفية + header/footer |
| `pdf/reports.ts` | تسلسل مالي كامل في الافصاح الشامل |
| `pdf/accounts.ts` | تسلسل مالي هرمي مطابق |
| `pdf/beneficiary.ts` | حصة المستفيد + سجل التوزيعات |
| `AccountsPage.tsx` | اقفال السنة المالية + ترحيل الرصيد + حماية السنة المغلقة |
| `MonthlyPerformanceReport.tsx` | تقارير شهرية ديناميكية مع رسوم بيانية |
| `YearOverYearComparison.tsx` | مقارنة سنوية مع تصدير PDF |
| `App.tsx` | lazy loading + حماية مسارات محكمة |

---

## 3. ملخص التوصيات (حسب الاولوية)

| # | التوصية | الخطورة | الجهد |
|---|---------|---------|-------|
| 1 | اضافة `.limit()` لـ 6 استعلامات (خاصة audit_log) | متوسطة | منخفض |
| 2 | استبدال حساب `distributableAmount` المكرر في MySharePage وDisclosurePage بـ `availableAmount` من الهوك | متوسطة | منخفض |
| 3 | تغيير `.single()` الى `.maybeSingle()` في `fetchUserRole` بـ AuthContext | منخفضة | منخفض |
| 4 | اضافة `units` و`fiscal_years` لخريطة TABLE_NAMES_AR في useAuditLog | منخفضة | منخفض |
| 5 | نقل مصفوفات الروابط خارج مكون DashboardLayout | منخفضة | منخفض |
| 6 | استخدام AbortController في InvoiceViewer لالغاء الطلبات المعلقة | منخفضة | متوسط |
| 7 | تصحيح فلترة الاشعارات المكررة في check-contract-expiry | منخفضة | منخفض |

---

## 4. الدرجة المحدّثة بعد الفحص الشامل

| المحور | الدرجة السابقة | الدرجة المحدّثة |
|--------|---------------|----------------|
| سلامة قاعدة البيانات | 9.5/10 | 9.5/10 |
| سياسات الامان (RLS) | 10/10 | 10/10 |
| الوظائف الخلفية | 9/10 | 8.5/10 (فلترة اشعارات ناقصة) |
| المصادقة والجلسات | 9.5/10 | 9/10 (single بدل maybeSingle) |
| المنطق المالي | 10/10 | 9/10 (حساب مكرر في صفحتين) |
| بنية الكود | 9.5/10 | 9/10 (استعلامات بدون limit) |
| حماية البيانات | 9/10 | 9/10 |
| تقارير PDF | -- | 9.5/10 (شاملة ومتطابقة) |

**الدرجة الاجمالية المحدّثة: 9.2/10**

النظام محكم البنية بشكل عام. التوصيات السبع المذكورة هي تحسينات وقائية وليست ثغرات حرجة.

