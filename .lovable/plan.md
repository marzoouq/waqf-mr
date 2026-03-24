

# خطة الإصلاح — الجولة التاسعة (التقرير الجنائي الشامل الثاني)

---

## تحقق سريع: بنود خاطئة أو مُصلحة فعلاً

| البند | الحكم | السبب |
|-------|-------|-------|
| BD-01 `myShare = 0` في السنة النشطة | ❌ **ليس خطأ** | `BeneficiaryDashboard` يستخدم RPC `useBeneficiaryDashboardData` — لا يستخدم `useMyShare` مباشرة. عرض 0 مع نص "الأرقام النهائية ستتوفر بعد إقفال السنة" هو السلوك المقصود |
| BD-02 `isAccountMissing` بصمت | ❌ **ليس خطأ** | سطر 288-292 يعرض رسالة واضحة عند `!isClosed` |
| BD-05 Realtime بدون cleanup | ❌ **ليس خطأ** | يستخدم `useBfcacheSafeChannel` مع `filter: beneficiary_id=eq.${beneficiaryId}` — مُصفى بالمستفيد سطر 97 |
| WQ-08 `GreetingIcon` بدون useMemo | ❌ **ليس خطأ في BeneficiaryDashboard** | يستخدم `useMemo` سطر 63-67. لكن **WaqifDashboard لا يحتوي useMemo** — مؤكد |
| INF-02 `private_key` plaintext | ❌ **تصميم مقبول** | RLS يحمي الجدول (admin فقط). نقله لـ Vault تحسين مستقبلي وليس خللاً |
| HC-01 `useYearData(undefined)` يجلب كل البيانات | ✅ **مؤكد جزئياً** | `useFinancialSummary(undefined)` → `useRawFinancialData(undefined)` → `fyFilter = '__none__'` → **الهوكات تُعطَّل** عبر `shouldSkip`. لا يُجلب شيء. **خطأ في التقرير** |
| MS-01 `rawNet` خاطئ في PDF | ✅ **مؤكد** | سطر 156: `rawNet = myShare - advances - carryforwardBalance` بينما سطر 155: `actualCarryforward = Math.min(carryforwardBalance, afterAdvances)`. يُمرَّر `actualCarryforward` للـ PDF سطر 166 لكن `rawNet` يستخدم `carryforwardBalance` الكامل — **تناقض حقيقي** |
| NT-01 `deleteRead` يحذف الأنواع المخفية | ✅ **مؤكد** | سطر 223-227 يحذف كل `is_read = true` بدون فلتر بالنوع |
| AU-02 تصدير 15 سجل فقط | ✅ **مؤكد** | `filtered = logs` = صفحة واحدة server-side (سطر 153) |
| ZT-01 limit(200) | ✅ **مؤكد** | سطر 84 + 96 — limit(200) لكل جدول |
| HC-02 PDF `net` بدون VAT/Zakat | ✅ **مؤكد** | سطر 124: `net: d0.totalIncome - d0.totalExpenses` — يتجاهل VAT والزكاة |

---

## البنود القابلة للتنفيذ (15 إصلاح مؤكد)

### 🔴 فوري — يكسر بيانات أو يُضلل

**1. MS-01 — `handleDownloadDistributionsPDF` يحسب `rawNet` بـ `carryforwardBalance` بدلاً من `actualCarryforward`**
- الملف: `src/hooks/financial/useMySharePage.ts` سطر 156
- المشكلة: `rawNet = myShare - advances - carryforwardBalance` بينما `actualCarryforward` محسوب بالفعل في السطر السابق
- الإصلاح: `const rawNet = myShare - advances - actualCarryforward;`

**2. WQ-01 — `activeContracts = relevantContracts` يشمل العقود المنتهية والملغاة**
- الملف: `src/pages/beneficiary/WaqifDashboard.tsx` سطر 64
- المشكلة: عند `isSpecificYear = true`، `relevantContracts = contracts` (كل الحالات)
- الإصلاح: `const activeContracts = contracts.filter(c => c.status === 'active');` — فلتر مستقل دائماً

**3. AU-02 — تصدير سجل المراجعة PDF يصدّر صفحة واحدة (15 سجل)**
- الملف: `src/pages/dashboard/AuditLogPage.tsx` سطر 183
- المشكلة: `logs: filtered` = الصفحة الحالية فقط
- الإصلاح: إضافة دالة `fetchAllForExport` تجلب كل السجلات (بحد 1000) بدون pagination قبل التصدير

**4. HC-02 — تصدير PDF للمقارنة يحسب `net` بدون VAT/Zakat**
- الملف: `src/pages/dashboard/HistoricalComparisonPage.tsx` سطر 124
- المشكلة: `net: d0.totalIncome - d0.totalExpenses` يتجاهل الضريبة والزكاة
- الإصلاح: `net: (d0.waqfRevenue ?? (d0.totalIncome - d0.totalExpenses))` — استخدام `waqfRevenue` الموحد

**5. ZT-01 — `allInvoices` محدودة 200 سجل — فواتير مخفية عن ZATCA**
- الملف: `src/pages/dashboard/ZatcaManagementPage.tsx` سطر 84 + 96
- الإصلاح: رفع `limit` لـ 1000 أو إزالته + إضافة pagination للعرض

### 🟠 عالي — يؤثر على المنطق والثقة

**6. WQ-03 — `collectionSummary` يشمل كل السنوات التاريخية**
- الملف: `src/pages/beneficiary/WaqifDashboard.tsx` سطر 79
- المشكلة: `computeCollectionSummary(contracts, ...)` يستخدم `contracts` بدلاً من `relevantContracts`
- الإصلاح: `computeCollectionSummary(activeContracts, paymentInvoices)` — العقود النشطة فقط

**7. BD-03 — `lastPaid` يعرض أول توزيع في المصفوفة وليس الأحدث**
- الملف: `src/pages/beneficiary/BeneficiaryDashboard.tsx` سطر 251
- المشكلة: `distributions.find(d => d.status === 'paid')` بدون ترتيب مضمون
- الإصلاح: `[...distributions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).find(d => d.status === 'paid')`

**8. NT-01 — `deleteRead` يحذف الأنواع المخفية أيضاً**
- الملف: `src/hooks/data/useNotifications.ts` سطر 220-228
- المشكلة: يحذف كل `is_read = true` بدون استثناء الأنواع المعطَّلة
- الإصلاح: تمرير `disabledTypes` وإضافة فلتر `.not('type', 'in', disabledArray)` أو عرض التحذير في UI

**9. ZT-02 — ترقية الإنتاج بدون AlertDialog تأكيد**
- الملف: `src/pages/dashboard/ZatcaManagementPage.tsx` سطر 195
- المشكلة: النقر المباشر ينفذ ترقية لا رجعة فيها
- الإصلاح: إضافة `AlertDialog` تأكيد قبل التنفيذ + `disabled={productionLoading}` على الزر

**10. ZT-05 — `pendingAction` مشترك يسمح بعمليتين متزامنتين**
- الملف: `src/pages/dashboard/ZatcaManagementPage.tsx`
- المشكلة: حالة واحدة `pendingAction` تحمي صفاً واحداً فقط
- الإصلاح: تحويل لـ `Set<string>` أو تعطيل كل الأزرار عند وجود أي عملية جارية

**11. WQ-05 — `collectionRate` 0% بالأحمر عند بداية السنة**
- الملف: `src/pages/beneficiary/WaqifDashboard.tsx` سطر 90
- المشكلة: نفس مشكلة AdminDashboard D-03 — 0% تعرض بالأحمر بلا سياق
- الإصلاح: عند `collectionSummary.total === 0` عرض "—" بدلاً من 0%

**12. WQ-08 — `GreetingIcon` و`hijriDate` تُحسب في كل render**
- الملف: `src/pages/beneficiary/WaqifDashboard.tsx` سطور 100+ (في body المكوّن)
- المشكلة: `toLocaleDateString('ar-SA-u-ca-islamic')` مكلفة وتُنفَّذ كل render
- الإصلاح: تغليف بـ `useMemo` كما في `BeneficiaryDashboard`

### 🟡 متوسط

**13. ZT-06 — لا تحذير عند غياب شهادة ZATCA نشطة**
- الملف: `src/pages/dashboard/ZatcaManagementPage.tsx`
- المشكلة: أزرار رمادية بصمت بدون توجيه
- الإصلاح: إضافة `Alert` banner عند `!activeCert`

**14. AU-03 — `ArchiveLogTab` لا يُصفّر `currentPage` عند تغيير الفلتر**
- الملف: `src/components/audit/ArchiveLogTab.tsx`
- الإصلاح: إضافة reset عند تغيير `eventFilter`

**15. HC-02b — جدول المقارنة الرسم البياني يحسب `net` بسيط أيضاً**
- الملف: `src/pages/dashboard/HistoricalComparisonPage.tsx` سطر 92
- الإصلاح: `row[fy.label] = d?.waqfRevenue ?? ((d?.totalIncome ?? 0) - (d?.totalExpenses ?? 0))`

---

## لن يُعدَّل (مع السبب)

| البند | السبب |
|-------|-------|
| HC-01 `useYearData(undefined)` يجلب كل البيانات | **خطأ في التقرير** — `shouldSkip` يُعطّل الاستعلامات |
| BD-01/BD-02 `myShare = 0` | سلوك مقصود مع رسالة واضحة |
| BD-05 Realtime بدون filter | **خطأ** — مُصفى بـ `beneficiary_id` |
| INF-02 `private_key` plaintext | تحسين مستقبلي — RLS يحمي |
| INF-03 حذف Storage عند rollback | تحسين مستقبلي — storage leak بسيط |
| INF-04 cache key collision | `queryKey: ['income', undefined]` ≠ `['income']` في React Query |
| AU-01 البحث محدود | تحسين مستقبلي — يتطلب full-text search |
| AU-04 DataDiff يعرض PII | البيانات مشفّرة في DB — الـ diff يعرض النص المشفّر |
| AU-05 فلتر التاريخ | تحسين مستقبلي |
| BD-04 `estimatedShare=0` | متعمد — السُلف في السنة النشطة يُحدد مبلغها يدوياً |
| WQ-07 تفاصيل المصروفات | مقصود — الواقف له حق الاطلاع |
| WQ-09 رابط التواصل | تحسين UX مستقبلي |
| UX-01 إلى UX-05 | تحسينات UX منفصلة |
| NT-02/NT-03/NT-04 | تحسينات بسيطة غير حرجة |
| MS-02/MS-03/MS-04 | خطر نظري — React Query يُحدّث atomically |
| INF-01 AI rate limiting | تحسين مستقبلي — Edge Function لها CPU timeout طبيعي |
| SD-01/SD-02/SD-03 | تحسينات غير حرجة |
| ZT-03 `inv.source` | مُعرَّف ضمنياً في `.map()` سطر 89/101 — دائماً `'invoices'` أو `'payment_invoices'` |
| ZT-04 chain بدون FY | السلسلة عابرة للسنوات بطبيعتها |
| HC-03 CAGR | تحسين مستقبلي |

---

## الملفات المتأثرة

| الملف | التغييرات |
|-------|----------|
| `src/hooks/financial/useMySharePage.ts` | إصلاح `rawNet` |
| `src/pages/beneficiary/WaqifDashboard.tsx` | `activeContracts` فلتر + `collectionSummary` + `collectionRate "—"` + `useMemo` للتاريخ |
| `src/pages/beneficiary/BeneficiaryDashboard.tsx` | `lastPaid` ترتيب |
| `src/pages/dashboard/AuditLogPage.tsx` | تصدير PDF كامل |
| `src/pages/dashboard/HistoricalComparisonPage.tsx` | `net` بـ `waqfRevenue` |
| `src/pages/dashboard/ZatcaManagementPage.tsx` | رفع limit + AlertDialog تأكيد + `pendingIds` Set + banner غياب شهادة |
| `src/hooks/data/useNotifications.ts` | `deleteRead` بفلتر الأنواع |
| `src/components/audit/ArchiveLogTab.tsx` | reset page عند تغيير فلتر |

