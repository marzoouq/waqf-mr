
# خطة تحسين الأداء — المرحلة الرابعة

## الوضع الحالي

بعد التحقق من الكود، تبيّن أن:
- **`useYoYComparison` كود ميت فعلياً** — الـ hook لا يُستدعى في أي مكان. فقط `calcChangePercent` (دالة حسابية بحتة) مستوردة منه. بيانات YoY **موجودة مسبقاً** في `get_dashboard_full_summary` RPC (سطور 263-273) وتُستهلك عبر `useDashboardSummary`.
- **لا حاجة لـ migration** — البيانات موجودة.

---

## التغييرات المطلوبة

### 1. حذف الكود الميت — `useYoYComparison` (لا أثر على الأداء، تنظيف)

| الملف | الإجراء |
|--------|---------|
| `src/hooks/financial/useYoYComparison.ts` | نقل `calcChangePercent` إلى ملف مستقل `src/utils/financial/calcChangePercent.ts`، ثم حذف الملف |
| `src/hooks/financial/index.ts` | حذف تصدير `useYoYComparison` |
| `src/hooks/page/admin/useAdminDashboardStats.ts` | تغيير مصدر استيراد `calcChangePercent` إلى المسار الجديد |

### 2. استبدال `transition-all` في 6 مكونات (تحسين paint/layout)

| الملف | الحالي | البديل |
|--------|--------|--------|
| `DashboardStatsGrid.tsx` | `transition-all hover:scale-[1.02]` | `transition-[transform,box-shadow] hover:scale-[1.02]` |
| `LandingHero.tsx` | `transition-all duration-300` | `transition-transform duration-300` |
| `LandingFeatures.tsx` | `transition-all duration-500` | `transition-[transform,box-shadow] duration-500` |
| `LandingCTA.tsx` | `transition-all duration-300` | `transition-transform duration-300` |
| `InvoiceSummaryCards.tsx` | `transition-all duration-500` | `transition-[width] duration-500` |
| `LoginForm.tsx` | `transition-all` | `transition-colors` |

### 3. تحسين `useReportsData` — لا تغيير

`useReportsData` يستخدم كل حقول `useFinancialSummary` فعلاً (income, expenses, beneficiaries, currentAccount, + كل الحقول المحسوبة). استبداله لن يقلل الاستعلامات. والـ prefetch من المرحلة 3 يغطي الحالة الغالبة. **لا حاجة لتغيير.**

---

## ملخص التنفيذ

| # | الإجراء | الملفات | الأثر |
|---|---------|---------|-------|
| 1 | حذف `useYoYComparison` ونقل `calcChangePercent` | 3 ملفات + 1 جديد | تنظيف |
| 2 | استبدال `transition-all` في 6 مكونات | 6 ملفات | منخفض-متوسط (أجهزة محمولة) |

**إجمالي:** 0 migrations، ~9 ملفات كود. تغييرات خفيفة وآمنة.
