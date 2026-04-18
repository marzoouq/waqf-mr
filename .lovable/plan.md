
## خطة الموجة 13 — مُنقَّحة بعد الفحص الجنائي

### نتائج التحقق الجنائي

#### ادعاءات كاذبة مُفنَّدة
| # | الادعاء | الواقع |
|---|--------|-------|
| 56 | `.env` في git tracking | **كاذب** — `.gitignore` سطر 22 يتجاهل `.env` و `.env.*` صراحةً |
| 25 | `useDashboardPrefetch` لكل المستخدمين | **كاذب** — الـ hook يفلتر داخلياً: `if (!isAdminOrAccountant) return` |
| المسارات | `src/pages/admin/*` | **كاذب** — الصفحات في `src/pages/dashboard/*` (أسطر التقرير مغلوطة لكن المحتوى صحيح للملفات الصحيحة) |

#### ادعاءات صحيحة مؤكَّدة بالكود
| # | الادعاء | الموقع الفعلي |
|---|--------|--------------|
| 1 | `as unknown as` في 3 hooks | `useIncomePage:72`, `useExpensesPage:70`, `useInvoicesPage:121,124` ✓ |
| 2 | `AlertDialog` inline | `dashboard/ExpensesPage.tsx:101-112` ✓ |
| 6 | Banner inline في AccountsPage | `dashboard/AccountsPage.tsx:53-57` ✓ |
| 65 | `?? true` خطير | `useBeneficiaryDashboardPage.ts:33` ✓ |
| 5 | `slice` في JSX | `dashboard/PropertiesPage.tsx:87` ✓ |
| 13 | Skeleton inline (14 مربع) | `dashboard/AccountsPage.tsx:83-92` ✓ |
| 14 | `handleExportCsv` خارج المكوّن | `dashboard/AccountsPage.tsx:24-39` ✓ |
| 23 | `isClosed && role !== 'admin'` يدوياً | `dashboard/ContractsPage.tsx:104` ✓ — يجب استخدام `!canModifyFiscalYear` |
| 4 | Guards inline | `BeneficiarySettingsPage.tsx:31-67` ✓ |
| 41-45 | لا اختبارات لـ permissions أو sanitizeDescription | مؤكَّد — الملفان غير موجودَين |

#### ادعاءات جزئية الصحة
| # | التفاصيل |
|---|---------|
| 10 | `paginatedItems` slice موجود في `IncomePage:42` لكن **خارج JSX** — يمكن نقله إلى hook (تحسين معماري لا بق) |
| 24 | Realtime على `app_settings` بلا `filter` — صحيح لكن `app_settings` جدول صغير global، الفلترة صعبة (لا `beneficiary_id`) |

### الإصلاحات المُعتمَدة (12 إصلاح حقيقي)

#### حرجة (4)
1. **#1** — إزالة `as unknown as` بتعريف types صحيحة من CRUD factory في 3 ملفات
2. **#2** — استبدال `AlertDialog` inline في `ExpensesPage` بـ `<ConfirmDeleteDialog />`
3. **#6** — استبدال banner inline في `AccountsPage:53-57` بـ `<LockedYearBanner isClosed={page.isClosed} role={role} />`
4. **#65** — تغيير `advanceEnabled = advanceSettings?.enabled ?? true` إلى `?? false` (آمن افتراضياً)

#### عالية (8)
5. **#4 + #37** — `BeneficiarySettingsPage`: استخدام `ErrorState` و `EmptyPageState` + تصحيح ترتيب guards (تحميل قبل خطأ)
6. **#5** — `PropertiesPage`: نقل `slice` إلى `useMemo`
7. **#10** — `IncomePage`: نقل `paginatedItems` إلى `useIncomePage` hook
8. **#13** — `AccountsPage`: استبدال 14 مربع skeleton inline بـ `<StatsGridSkeleton count={14} />` (إنشاؤه إن لم يوجد)
9. **#14** — `AccountsPage`: نقل `handleExportCsv` داخل المكوّن كـ `useCallback` أو لـ hook
10. **#23** — `ContractsPage:104`: استبدال `isClosed && role !== 'admin'` بـ `!canModifyFiscalYear(role, isClosed)`
11. **#41** — إنشاء `src/utils/auth/permissions.test.ts` (حالات: admin مع closed، beneficiary مع open، إلخ)
12. **#45** — إنشاء `useInvoicesPage.test.ts` يختبر `sanitizeDescription` (HTML/whitespace/XSS payloads)

### ادعاءات مرفوضة (لن تُنفَّذ)
- **#56** `.env` في git → كاذب، `.gitignore` يتجاهله بالفعل
- **#25** `useDashboardPrefetch` للكل → كاذب، الفلترة موجودة
- **#24** filter لـ realtime على `app_settings` → غير عملي (جدول global)

### الملفات المُعدَّلة (10 + 2 جديدة)
1. `src/hooks/page/admin/financial/useIncomePage.ts`
2. `src/hooks/page/admin/financial/useExpensesPage.ts`
3. `src/hooks/page/admin/financial/useInvoicesPage.ts`
4. `src/pages/dashboard/ExpensesPage.tsx`
5. `src/pages/dashboard/AccountsPage.tsx`
6. `src/pages/dashboard/IncomePage.tsx`
7. `src/pages/dashboard/PropertiesPage.tsx`
8. `src/pages/dashboard/ContractsPage.tsx`
9. `src/pages/beneficiary/BeneficiarySettingsPage.tsx`
10. `src/hooks/page/beneficiary/useBeneficiaryDashboardPage.ts`
11. **جديد:** `src/utils/auth/permissions.test.ts`
12. **جديد:** `src/hooks/page/admin/financial/useInvoicesPage.test.ts`
13. ربما `src/components/common/StatsGridSkeleton.tsx` (إن لم يوجد) + تصديره

### الضمانات
- صفر تغيير: schema، RLS، Auth، Edge Functions، migrations
- التغيير السلوكي الوحيد: `advanceEnabled` افتراضياً `false` بدل `true` — قد يُخفي زر السلف لحظياً قبل تحميل الإعدادات (آمن)
- لا تنبيه أمني للمستخدم بشأن `.env` (كاذب)

### النطاق
| العملية | العدد |
|--------|-------|
| ملفات مُعدَّلة | 10 |
| ملفات جديدة | 2-3 |
| migrations | 0 |
| ادعاءات مرفوضة | 3 |
