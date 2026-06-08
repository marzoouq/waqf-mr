# خطة التنفيذ — بوابة Audit + حذف الكود الميت المؤكَّد

## المبدأ الحاكم
**لا يُحذف أي شيء قبل اجتياز `vitest run` + `tsc --noEmit` بنجاح**. أي فشل = إيقاف فوري + استرجاع.

---

## المرحلة 0 — بوابة التحقق (Audit Gate)

سكربت جديد `scripts/deletion-gate.mjs` يُشغَّل **قبل وبعد** كل دفعة حذف:

```text
1. bunx tsc --noEmit                    → يجب 0 أخطاء
2. bunx vitest run                      → يجب 2113/2113
3. node scripts/audit-all.mjs           → audit:gate أخضر
   فشل أي خطوة → exit 1 + رسالة واضحة + لا تكمل
```

التسلسل العام:
```text
baseline (gate) → دفعة حذف → gate → دفعة تالية → gate → ...
```
عند أي فشل: استرجاع آخر دفعة فقط ثم توقّف وإبلاغ.

---

## المرحلة 1 — Baseline
تشغيل `deletion-gate.mjs` على الحالة الراهنة لتثبيت 2113/2113 + 0 TS errors + audit أخضر. بدون هذا الـbaseline لا يبدأ أي حذف.

---

## المرحلة 2 — حذف 18 تصريحاً (دفعات صغيرة + gate بين كل دفعة)

### الدفعة A — ثوابت/أنواع نقية (أدنى مخاطرة)
| # | الرمز | الملف:السطر |
|---|---|---|
| 1 | `ALL_ROLES` | `src/constants/roles.ts:22` |
| 2 | `CARRYFORWARD_NOTICE_COPY` | `src/constants/beneficiaryCopy.ts:85` |
| 3 | `ProtectedAdminSectionKey` | `src/constants/sections.ts:51` |
| 4 | `VoucherStatus` | `src/constants/entities.ts:84` |
| 5 | `STALE_PUBLIC`, `STALE_DASHBOARD`, `STALE_REFERENCE` | `src/lib/queryStaleTime.ts:24,27,30` |

→ gate

### الدفعة B — Utilities/Monitoring
| # | الرمز | الملف:السطر |
|---|---|---|
| 6 | `getLargePayloads`, `clearLargePayloads` | `src/lib/monitoring/payloadMonitor.ts:33,37` |
| 7 | `compareDateOnly`, `diffCalendarDays` | `src/utils/date/dateOnly.ts:31,36` |
| 8 | `computeMonthlyData` | `src/utils/financial/dashboardComputations.ts:19` |
| 9 | `cleanupThemeObserver` | `src/lib/theme/themeColor.utils.ts:55` |
| 10 | `getExpectedEdgeFunctions` | `src/lib/diagnostics/checks/backend.ts:143` |

→ gate

### الدفعة C — Hooks/Types
| # | الرمز | الملف:السطر |
|---|---|---|
| 11 | `useContractInvoiceSummary` | `src/hooks/data/invoices/usePaymentInvoices.ts:133` |
| 12 | `PropertyPerformanceItem`, `PropertyPerformanceTotals` | `src/hooks/domain/financial/usePropertyPerformance.ts:36,47` |
| 13 | `useFiscalYearMock` | `src/test/e2e/_helpers/mockFiscalYear.ts:50` |

→ gate

> ملاحظة `useFiscalYearMock`: قبل الحذف، فحص نهائي `rg "useFiscalYearMock" src/` — إن وُجد استعمال فعلي في أي test → يُنقل إلى KEEP وتُلغى الإزالة.

---

## المرحلة 3 — default exports الآمنة
حذف سطر `export default` فقط (مع إبقاء الـnamed export):
- `src/components/contracts/payment-invoices/paymentStatusBadge.tsx:25`
- `src/components/reports/ChangeIndicator.tsx:24`

→ gate

---

## المرحلة 4 — إعداد knip
- `knip.json` يُعرّف entrypoints: `src/main.tsx`, `supabase/functions/*/index.ts`, `supabase/functions/*/*.test.ts`, `scripts/*.mjs`, `src/test/**/*.test.{ts,tsx}`.
- `package.json` → إضافة `fast-glob` إلى `devDependencies` (يستخدمه `ariaLabelCoverage.test.ts`).

→ gate نهائي

---

## ما لن يُنفَّذ في هذه الجولة
- ❌ 171 unexport — مؤجَّلة لجولة لاحقة (آمنة لكن كبيرة الحجم وتستحق PR منفصل).
- ❌ default exports الثلاثة الباقية (`PaymentInvoicesTab`, `RolePermissionsTab`, `SectionsTab`) — تكسر barrels.
- ❌ أي ملف كامل (لا حذف ملفات).
- ❌ أي تعديل على ملفات محمية (`client.ts`, `types.ts`, `config.toml`, `.env`, `AuthContext`).

---

## المخرجات
| النوع | العدد |
|---|---|
| سكربت جديد | 1 (`scripts/deletion-gate.mjs`) |
| ملف إعداد جديد | 1 (`knip.json`) |
| تعديل `package.json` | 1 (إضافة `fast-glob`) |
| ملفات تُعدَّل (حذف رموز) | ~13 |
| تعديلات سطر واحد (default exports) | 2 |
| ملفات تُحذف | 0 |

## معايير النجاح
- ✅ `tsc --noEmit` = 0 أخطاء بعد كل دفعة
- ✅ `vitest run` = 2113/2113 بعد كل دفعة
- ✅ `audit:gate` = 9/9 بعد كل دفعة
- ✅ 0 ارتدادات

## بروتوكول الفشل
أي فشل في الـgate → استرجاع الدفعة الفاشلة فقط → الإبلاغ بالرمز المسبب → توقّف. الدفعات السابقة الناجحة تبقى.
