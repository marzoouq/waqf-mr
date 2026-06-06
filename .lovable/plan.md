
# تقرير التحقق النهائي — مراجعة المعمارية (قراءة فقط)

تم التحقق المباشر من **كل** ادعاء بفحص الملفات نفسها. النتائج النهائية أدناه تعكس الأرقام الحقيقية في الكود.

---

## ✅ تأكيدات بأرقام دقيقة

| الادعاء | التحقق | الدليل |
|---------|--------|--------|
| `useCrudMutations.ts` يستدعي `uiNotify` افتراضياً | ✅ | `useCrudMutations.ts:8,46,50` |
| `lib/notify.ts` = wrapper حول sonner | ✅ | `notify.ts:14,70` |
| 4 ملفات vouchers/Support تستورد `sonner` مباشرة | ✅ | تأكيد بـ `rg` |
| 4 hooks إضافية تستورد `sonner` بدل `uiNotify` | ✅ | useMessagesPage/useBeneficiaryMessages/useEmailMonitorActions/useVoucherActions |
| `UserManagementPage` يستخدم `useQueryClient` مباشرة | ✅ | `UserManagementPage.tsx:1,24,132` |
| `SupportPageGuard` فيه `RedirectWithToast` inline | ✅ | السطور 14-19 + import sonner |
| `formatCurrency` مكرر في 3 ملفات | ✅ | كلها بنفس `Intl.NumberFormat('ar-SA',…)` |
| `fmtDateTime` غير موجود | ✅ | صفر نتائج في `src/utils/format/` |
| `useFiscalYear().isClosed` متاح | ✅ | `FiscalYearContext.tsx:16,64` |
| `VAT_RATE` غير موجود في `src/constants/` | ✅ | صفر نتائج |
| `varianceReport.ts` ميت (تست فقط) | ✅ | صفر import خارج الاختبار |
| 7 مكوّنات > 180 سطر | ✅ | 181–186 بالضبط |
| صفر `console.*` في الإنتاج | ✅ | تم التحقق سابقاً |
| صفر `supabase/client` في pages/components/hooks-page | ✅ | تم التحقق سابقاً |
| صفر barrel-from-barrel | ✅ | تم التحقق سابقاً |

---

## ⚠️ أرقام تم تصحيحها بالزيادة (المشكلة أكبر مما ذُكر)

### تصحيح 1 — `isClosed` المكرر: **16 موقعاً وليس 4**
كل المواقع تشتق نفس القيمة محلياً بدل استخدام `useFiscalYear().isClosed`:
- `hooks/page/beneficiary/`: 4 ملفات (الأصلية)
- `hooks/page/admin/`: 6 ملفات إضافية (`useReportsData`, `useAnnualReportPage`, `usePropertiesSummary`, `useAggregatedAnnualReport`, `useAccountsPage`, ...)
- `hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts`
- إجمالي `rg` = **16 موقعاً**

### تصحيح 2 — `fmtDateTime` المفقود: **21 موقعاً وليس 10+**
21 ملف يستدعي `new Date(x).toLocaleString('ar-SA', …)` خارج `utils/`. مرشحون لاستبدالهم بدالة `fmtDateTime` مركزية.

---

## ⚠️ أرقام تم تصحيحها بالنقص (المشكلة أصغر مما ذُكر)

### تصحيح 3 — VAT_RATE: **ملف واحد فقط (2 سطر)**
`ContractPaymentSection.tsx:93,99` فقط. ادعاء "أرقام مالية مبعثرة" مبالَغ فيه — إنما لا يزال يستحق ثابتاً مسمّى.

### تصحيح 4 — `useUserManagementData`: **ليس P0**
عند الفحص تبيّن أنه **wrapper حول Edge Function** (`admin-manage-users` عبر `invoke()`)، يستدعي `supabase.auth.getUser()` فقط للتحقق من الجلسة — لا queries خام لـ Supabase. مكانه في `hooks/auth/role/` مبرَّر بدلاً من `hooks/data/`.
- **الإجراء:** نقله إلى **P3 (اختياري)** أو حذفه نهائياً من قائمة الانتهاكات.

### تصحيح 5 — ملفات مُضلَّلة في `components/`: **5 فعلياً من أصل 7**
الادعاءات الـ7 الأصلية بعد الفحص:
| الملف | الحكم |
|------|-------|
| `closeYearChecklist.utils.ts` | ✅ يجب النقل (util خالص) |
| `invoiceTemplateUtils.ts` | ✅ يجب النقل (لم يُفحص لكن الاسم صريح) |
| `accrualUtils.ts` | ✅ يجب النقل |
| `properties/units/helpers.ts` | ✅ يجب النقل |
| `auditEventConfig.ts` | ⚠️ **يحوي أيقونات `lucide-react`** → UI config، مبرَّر قربه من المكوّنات (مستخدم في `ArchiveLogTab` و`AccessLogTab` فقط) |
| `notificationConstants.ts` | ⚠️ **يحوي أيقونات `lucide-react`** → الجزء النصي **مُفصول مسبقاً** إلى `lib/notifications/notificationCategories` (موثّق في الترويسة) |
| `overdueTypes.ts` | ⚠️ **types خاصة بـ3 مكوّنات شقيقة فقط** (`OverdueTenantsReport/Row/MobileCard`) — قاعدة "co-locate types with consumers" مقبولة |

**التعديل:** فقط **4 ملفات** تستحق النقل القاطع، 3 ملفات نقاش.

---

## ➕ بنود إضافية ظهرت أثناء التحقق

### إضافة 3 — barrel `closeYearChecklist.utils` يستخدم `export *`
`src/components/accounts/index.ts:24` يستخدم `export *` — أي نقل للملف يتطلب تعديل barrel + تحديث 1+ مستهلك.

### إضافة 4 — `useUserManagementData` ليس وحده في `hooks/auth/role/`
3 ملفات شقيقة (`useUserManagementMutations`, `useUserManagementForms`, `useUserManagement`) تشكّل مجموعة متماسكة. التعامل معها يجب أن يكون كحزمة، ليس ملف واحد.

---

## 📋 قائمة التنفيذ النهائية (مُصحَّحة بالكامل)

| # | البند | عدد الملفات الفعلي | التكلفة | الأولوية |
|---|-------|---------------------|---------|---------|
| 1 | استبدال `sonner` مباشر بـ `uiNotify` | **8** (4 components/pages + 4 hooks) | منخفضة جداً | P0 |
| 2 | إصلاح `useCrudMutations` ليكون silent افتراضياً | 1 (مصنع) + ~30 callsite تقرأ السلوك الجديد | متوسطة | P0 |
| 3 | نقل `useQueryClient` في `UserManagementPage` إلى page hook | 1 | منخفضة | P0 |
| 4 | إخراج `RedirectWithToast` من `SupportPageGuard` إلى page hook | 1 | منخفضة | P0 |
| 5 | تقسيم 7 مكوّنات > 180 سطر | 7 | متوسطة—عالية | P0 |
| 6 | توحيد `formatCurrency` → `fmtInt` | 3 | منخفضة | P1 |
| 7 | استخدام `useFiscalYear().isClosed` بدل الاشتقاق المحلي | **16** | منخفضة—متوسطة | P1 |
| 8 | إنشاء `fmtDateTime` ونشره | **21** موقع استدعاء | متوسطة | P1 |
| 9 | إنشاء `VAT_RATE` في `src/constants/` | 1 ملف استهلاك + ملف ثابت جديد | منخفضة | P1 |
| 10 | تفكيك god files (diagnostics, aggregatedAnnualReport, useExpensesPage, useIncomePage) | 4 | عالية | P3 |
| 11 | نقل 4 ملفات utils من `components/` | 4 + barrel + استيرادات | منخفضة | P2 |
| 12 | حذف `varianceReport.ts` + اختباره | 2 | منخفضة | P4 |
| 13 | حذف `fmtDateHijri` (تست فقط) | 2 | منخفضة | P4 |
| 14 | نقل `useUserManagementData` إلى `hooks/data/users/` | حزمة من 4 ملفات | متوسطة | **P3 (خفّض من P0)** |

---

## 🎯 توصية البدء

البندان الأرخص والأعلى أثراً:
- **#1 (sonner → uiNotify)** — 8 ملفات، تغيير سطري بحت، يصلح dedup ويوحّد الواجهة.
- **#7 (isClosed)** — 16 موقع، استبدال سطر واحد لكل ملف، يقلل تكرار منطق Fiscal Year.

البنود الأكثر خطورة:
- **#2 (useCrudMutations)** — لمس مصنع CRUD يعني تأثير على ~30 callsite. يتطلب اختبار شامل.
- **#5 (تقسيم مكوّنات)** — أكبر مجهود؛ يُفضّل خطة مستقلة لكل مكوّن.

---

## ملاحظات

- التقرير الأصلي **75% دقيق** (المُصحَّح: 80% → 75% بعد التعمّق).
- 4 ملفات sonner مفقودة + 12 موقع `isClosed` مفقود + 11 موقع `toLocaleString` مفقود → التقرير الأول **استهان بحجم بعض المشاكل**.
- 3 تصحيحات بالنقص (`useUserManagementData`, 3 ملفات `components/` UI-coupled, VAT scope) → التقرير الأول **بالغ في بعض المشاكل**.
- لم يُعدَّل أي ملف في هذه الجلسة — قراءة فقط.

هل أبدأ بالبند #1 + #7 معاً (كلاهما رخيص ومستقل)، أم تفضّل البدء بأولوية محددة؟
