
# خطة إصلاح شامل — لوحة المستفيد (29 خطأ مُتحقَّق منها)

## نتيجة الفحص المعمّق

بعد فحص كل ملف مصدري سطراً بسطر، إليك التصنيف النهائي مع ملاحظات التحقق:

---

## تصنيف الأخطاء بعد التحقق

### مؤكَّدة ويجب إصلاحها (22 خطأ)

| # | الخطورة | الوصف | الملف | الحكم |
|---|---------|-------|-------|-------|
| 01 | حرج | `sharePercentage: 0` ثابت في PDF الإفصاح | DisclosurePage:112 | مؤكد - وثيقة رسمية خاطئة |
| 02 | متوسط | `netAfterZakat` يُحسب يدوياً بدل استخدام القيمة من الـ hook | MySharePage:176, DisclosurePage:140 | مؤكد - حالياً نفس النتيجة لكن هش مستقبلاً |
| 03 | حرج | إجمالي الإيجارات يشمل عقود منتهية/ملغاة | DisclosurePage:314,346 | مؤكد - رقم مُضلل مالياً |
| 04 | حرج | `netIncome` يستخدم `contractualRevenue` (كل العقود) بدل `activeIncome` | PropertiesViewPage:91 | مؤكد - صافي دخل مُضخَّم |
| 05 | حرج | `monthlyRent` يشمل عقود منتهية ولا يدعم quarterly/semi_annual | PropertiesViewPage:221-226 | مؤكد |
| 06 | حرج | بطاقة "ريع الوقف" تعرض `availableAmount` وليس `waqfRevenue` | WaqifDashboard:190 | مؤكد - تسمية مُضللة |
| 07 | حرج | "ريع المستفيدين" يعرض `waqfRevenue` بدل `availableAmount` | WaqifDashboard:240 | مؤكد - BUG-06 و07 متعاكسان: القيمتان مُتبادلتان |
| 08 | حرج | `waqfRevenue = netAfterZakat` في السنوات غير المغلقة | useComputedFinancials:94 | مؤكد - يعرض رقماً قبل خصم الحصص |
| 09 | متوسط | `!currentBeneficiary` يُفحص قبل `finLoading` | MySharePage:242-256 | مؤكد - قد يسبب وميض "لم يتم العثور" |
| 10 | متوسط | `noPublishedYears` بعد `!currentBeneficiary` | MySharePage:258 | مؤكد |
| 11 | متوسط | `isLoading` لا يمنع حسابات البطاقات العلوية | PropertiesViewPage | مؤكد - بطاقات تعرض أصفار أثناء التحميل |
| 12 | منخفض | لا معالجة `isError` في CarryforwardHistoryPage | CarryforwardHistoryPage | مؤكد |
| 13 | منخفض | جلب كل السنوات المالية بدون فلتر status | CarryforwardHistoryPage:34-43 | مؤكد - لكن RLS يحمي المستفيد فعلياً |
| 16 | متوسط | `collectionRate` يقارن `totalIncome` (كل المصادر) بإيجارات فقط | WaqifDashboard:54 | مؤكد - قد تتجاوز 100% |
| 17 | متوسط | `expectedPayments` لا يراعي `end_date` العقد | WaqifDashboard:75-81 | مؤكد |
| 18 | متوسط | `isPublished` الافتراضي true عند عدم وجود إعداد | BylawsViewPage:23 | مؤكد |
| 19 | منخفض | نفس استعلام distributions بـ queryKey مختلف | MySharePage vs DisclosurePage | مؤكد |
| 21 | منخفض | `useInvoicesByFiscalYear` يُنفَّذ حتى لو `noPublishedYears` | InvoicesViewPage:26 | مؤكد - لكن ترتيب الفحوصات صحيح |
| 24 | منخفض | `allVisible` غير `useMemo` يُبطل فائدة `useMemo` لـ `visibleBylaws` | BylawsViewPage:25-36 | مؤكد |
| 25 | منخفض | `isMobile` مُعرَّف ولا يُستخدم | PropertiesViewPage:31 | مؤكد |
| 27 | منخفض | `as any` بدل نوع صريح | MySharePage:195, DisclosurePage:159 | مؤكد |
| 28 | منخفض | `user` مُستخرَج ولا يُستخدم | WaqifDashboard:30 | مؤكد |

### مُلغاة أو لا تحتاج إصلاح (7 أخطاء)

| # | الوصف | السبب |
|---|-------|-------|
| 14 | `filteredDistributions` كل السجلات عند غياب account | لا أثر فعلي: `isAccountMissing` يرجع مبكراً قبل العرض |
| 15 | `remainingBalance` سالب في PDF | هذا سلوك محاسبي صحيح (يُظهر عجز التوزيع)، لا يحتاج تقييد |
| 20 | تعارض `queryKey: ['fiscal_years_all']` | لا يوجد key آخر بنفس الاسم في التطبيق - تعارض نظري فقط |
| 22 | تعارض `readCount` و `unreadCount` | بعد الفحص: كلاهما يُحسب من `notifications` (= `filteredData`) - متسق |
| 23 | `benError` غير معالج في BeneficiarySettingsPage | **خطأ في التقرير**: الملف يعالج `benError` فعلياً (سطر 143-155) |
| 26 | `noPublishedYears` بعد `finLoading` في AccountsViewPage | ترتيب مقبول: `finLoading` ينتهي سريعاً، الأثر ضئيل |
| 29 | `ExportMenu hidePdf` بلا محتوى | `ExportMenu` بدون `hidePdf` يُظهر طباعة فقط - سلوك مقصود |

---

## خطة التنفيذ (6 مجموعات)

### المجموعة 1: إصلاح المنطق المالي الجذري
**الملف:** `src/hooks/useComputedFinancials.ts`

**BUG-08**: عند `!isClosed`، تصفير `waqfRevenue` مثل بقية الحصص (بدلاً من `netAfterZakat`)
- سطر 94: تغيير `waqfRevenue: netAfterZakat` الى `waqfRevenue: 0`
- هذا يتسق مع تصفير `adminShare` و `waqifShare` لأن كل الحصص تُحسب فقط بعد الإقفال

### المجموعة 2: إصلاحات حسابية حرجة في الصفحات

**BUG-01** — `DisclosurePage.tsx` سطر 112:
- تغيير `sharePercentage: 0` الى `sharePercentage: currentBeneficiary?.share_percentage || 0`

**BUG-02** — `MySharePage.tsx` سطر 176 و `DisclosurePage.tsx` سطر 140:
- استبدال `netAfterZakat: netAfterVat - zakatAmount` بـ `netAfterZakat` المُستخرج من `useFinancialSummary`

**BUG-03** — `DisclosurePage.tsx` سطور 314, 346:
- تصفية العقود النشطة فقط في حساب الإجمالي: `contracts.filter(c => c.status === 'active')`

**BUG-04** — `PropertiesViewPage.tsx` سطر 91:
- تغيير `const netIncome = contractualRevenue - totalExpensesAll` الى `const netIncome = activeIncome - totalExpensesAll`

**BUG-05** — `PropertiesViewPage.tsx` سطور 221-226:
- تصفية العقود النشطة فقط في حساب `monthlyRent`
- اضافة حالات `quarterly` (قسمة /4) و `semi_annual` (قسمة /6) و `annual` (قسمة /12)

**BUG-06 + BUG-07** — `WaqifDashboard.tsx`:
- سطر 190: تغيير `availableAmount` الى `waqfRevenue` في بطاقة "ريع الوقف"
- سطر 240: تغيير `waqfRevenue` الى `availableAmount` في صف "ريع المستفيدين"

### المجموعة 3: إصلاح ترتيب فحوصات الحالة

**BUG-09 + BUG-10** — `MySharePage.tsx`:
- اعادة الترتيب: `finError` ثم `finLoading || distLoading` ثم `noPublishedYears` ثم `!currentBeneficiary` ثم `isAccountMissing`

**BUG-11** — `PropertiesViewPage.tsx`:
- اضافة فحص `isLoading` مبكراً (بعد `noPublishedYears` و `isError`) لعرض Skeleton بدل بطاقات بأصفار

### المجموعة 4: إصلاح منطق الأعمال

**BUG-16** — `WaqifDashboard.tsx` سطر 54:
- حساب `collectionRate` باستخدام `contractualRevenue` كمقام مع clamp عند 100%: `Math.min(100, ...)`

**BUG-17** — `WaqifDashboard.tsx` سطور 75-81:
- اضافة `contract.end_date` في حساب `expectedPayments`: استخدام `Math.min(now, endDate)` بدل `now`

**BUG-18** — `BylawsViewPage.tsx` سطر 23:
- تغيير `settings?.bylaws_published !== 'false'` الى `settings?.bylaws_published === 'true'`

### المجموعة 5: تحسينات Cache والأداء

**BUG-19** — توحيد queryKey للتوزيعات:
- `DisclosurePage.tsx` سطر 81: تغيير `['my-distributions-disclosure', ...]` الى `['my-distributions', ...]`

**BUG-12** — `CarryforwardHistoryPage.tsx`:
- اضافة `isError` handling مع رسالة خطأ وزر اعادة محاولة

**BUG-13** — `CarryforwardHistoryPage.tsx` سطر 34-43:
- ملاحظة: RLS يحمي المستفيد تلقائياً (سياسة `Beneficiaries and waqif can view published fiscal_years` تمنع رؤية غير المنشورة). لا حاجة لتعديل.

**BUG-24** — `BylawsViewPage.tsx`:
- تحويل `allVisible` الى `useMemo` لتحسين الأداء

### المجموعة 6: تنظيف الكود

**BUG-25** — `PropertiesViewPage.tsx` سطر 31: ازالة `const isMobile = useIsMobile();`
**BUG-27** — `MySharePage.tsx` سطر 195 و `DisclosurePage.tsx` سطر 159: استبدال `(d as any).account?.fiscal_year` بنوع صريح
**BUG-28** — `WaqifDashboard.tsx` سطر 30: ازالة `const { user } = useAuth();`

---

## ملخص الملفات المتأثرة

| الملف | عدد التعديلات |
|-------|--------------|
| `src/hooks/useComputedFinancials.ts` | 1 |
| `src/pages/beneficiary/DisclosurePage.tsx` | 4 |
| `src/pages/beneficiary/MySharePage.tsx` | 3 |
| `src/pages/beneficiary/WaqifDashboard.tsx` | 5 |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | 4 |
| `src/pages/beneficiary/BylawsViewPage.tsx` | 2 |
| `src/pages/beneficiary/CarryforwardHistoryPage.tsx` | 1 |

**الإجمالي:** 7 ملفات، 22 إصلاح مؤكد (7 أخطاء مُلغاة بعد التحقق)

## ترتيب التنفيذ
1. المجموعة 1 اولاً (hook جذري يؤثر على كل الصفحات)
2. المجموعة 2 (إصلاحات حسابية حرجة)
3. المجموعات 3-4 (ترتيب الحالات ومنطق الأعمال)
4. المجموعتين 5-6 (تحسينات وتنظيف)
