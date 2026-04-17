
# خطة موجة الأداء — تقرير 100 + 3 مهام كبرى

## التصنيف الواقعي

**أخطاء كود مؤكدة:** #1, #2, #3, #4, #5, #6, #7, #8, #9, #14, #20, #29, #35, #61, #62, #63, #64, #89
**عالية الأثر:** #50 (LockedYearBanner), #99 (تأكيد CSV)
**مؤجَّل:** #36, #46-#54, #57, #86-#88, #90-#95
**مستبعد:** #11-13, #16-19, #21-28, #30-34, #37-45, #55-60, #65-85, #91-98, #100

---

## المهام الثلاث الكبرى

### A — Bundle Analyzer
- إضافة `rollup-plugin-visualizer` كـ devDep
- تفعيل شرطي في `vite.config.ts` عند `mode === 'analyze'`
- تشغيل build وتحليل أكبر 5 chunks
- إنتاج `stats.html` في `/mnt/documents/`

### B — تقسيم `app-settings-all`
- إبقاء `['app-settings-all']` كـ legacy
- 3 مفاتيح فرعية: `['app-settings', 'zatca' | 'banner' | 'general']`
- `getCategoryFromKey(key)` للتصنيف حسب prefix
- `useZatcaSettings` يستخدم `'zatca'` فقط
- `useWaqfInfoSave`/`useLogoUpload` → `'general'`

### C — Performance Profile قبل/بعد على /dashboard
- baseline → تنفيذ → بعد
- جدول مقارنة (heap, DOM nodes, scripts duration)

---

## إصلاحات الكود

### 🔴 أخطاء (8)
| # | الملف | الإصلاح |
|---|------|---------|
| #1 | `IncomePage.tsx` | `lazy()` بعد imports |
| #2,#29,#35 | `ReportsPage.tsx` | تجميع lazy + import موحد |
| #3,#4,#20,#61 | `PropertiesViewPage.tsx` | useMemo، إزالة `!`، رفع TooltipProvider |
| #6,#7,#63 | `InvoicesPage.tsx` + hook | استخراج IIFE، useMemo، useCallback |
| #5,#62 | `BeneficiariesPage.tsx` + hook | إزالة pagination مزدوج |
| #8,#89 | `MessagesPage.tsx` | hook في `admin/management/` |
| #9 | `BeneficiaryMessagesPage.tsx` | `ml-1` → `ms-1` |
| #14 | `SettingsPage.tsx` | إزالة `defaultValue` |

### 🟠 توحيد
- #50 → `LockedYearBanner.tsx` جديد + 3 صفحات
- #64 → `useExpensesPage` يُرجع `paginatedItems`

---

## الملفات (19)
```
vite.config.ts, package.json                            [A]
src/hooks/data/settings/useAppSettings.ts               [B]
src/hooks/data/settings/useWaqfInfoSave.ts              [B]
src/hooks/data/settings/useLogoUpload.ts                [B]
src/hooks/page/admin/management/useZatcaSettings.ts     [B]
src/hooks/page/admin/management/useMessagesPage.ts      [جديد #8]
src/pages/dashboard/IncomePage.tsx                      [#1]
src/pages/dashboard/ReportsPage.tsx                     [#2,#29,#35]
src/pages/dashboard/PropertiesViewPage.tsx              [#3,#4,#20,#61]
src/pages/dashboard/InvoicesPage.tsx                    [#6,#7,#63]
src/pages/dashboard/BeneficiariesPage.tsx               [#5,#62]
src/pages/dashboard/MessagesPage.tsx                    [#8]
src/pages/dashboard/SettingsPage.tsx                    [#14]
src/pages/beneficiary/BeneficiaryMessagesPage.tsx       [#9]
src/components/common/LockedYearBanner.tsx              [جديد #50]
src/hooks/page/admin/financial/useInvoicesPage.ts       [#6]
src/hooks/page/admin/financial/useBeneficiariesPage.ts  [#62]
src/hooks/page/admin/financial/useExpensesPage.ts       [#64]
```

## الضمانات
- صفر تغيير سلوكي — `app-settings-all` legacy محفوظ
- لا مساس بملفات المصادقة
- `npx tsc --noEmit` بعد التنفيذ
- profile قبل/بعد لقياس فعلي
- `stats.html` يُسلَّم في `/mnt/documents/`
