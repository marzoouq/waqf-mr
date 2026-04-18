
## تقرير المراجعة المعمارية الشامل — ما بعد الموجة 14

### ✅ ما أُنجز فعلياً في الموجة 14 (مؤكَّد بالكود)
| إنجاز | الحالة |
|------|--------|
| توحيد `permissions` تحت `utils/auth/` | ✅ مكتمل (الملف القديم re-export فقط) |
| إنشاء `properties/index.ts` | ✅ مكتمل |
| إكمال `admin/index.ts` | ✅ مكتمل |
| `MAX_FINANCIAL_AMOUNT` في `constants/limits.ts` | ✅ مكتمل |
| `SortFieldOf<T>` generic | ✅ مكتمل |
| تطبيقها على `useIncomePage`/`useExpensesPage` | ✅ مكتمل |

### 📊 الإحصائيات الحالية المؤكَّدة (forensic)
- **820 ملف مصدر** + **188 ملف اختبار** = 1008
- **33 موقع `as unknown as`** (انخفض من 84 — نتيجة العمل السابق)
- **14 موقع `ITEMS_PER_PAGE`** (لم يتغيّر — هدف الموجة 15)
- **AuthContext = 238 سطر** (لم يتغيّر)
- **98 تعليق مرجعي** (`#1, #B6, #D1...`) بدون CHANGELOG

---

### 🔴 أولوية قصوى (critical — لم تُحَلّ بعد)

**1. `ITEMS_PER_PAGE` مكرَّر في 14 ملفاً بقيم متباينة**
- 4 قيم مختلفة: `9` (beneficiaries), `12` (invoices grid), `15` (5 ملفات), `DEFAULT_PAGE_SIZE` (5 ملفات)
- لا مصدر حقيقة موحَّد — يستحق توسيع `constants/pagination.ts` بثوابت دلالية:
  - `PAGE_SIZE_GRID = 12`, `PAGE_SIZE_LIST = 15`, `PAGE_SIZE_BENEFICIARIES = 9`

**2. 33 موقع `as unknown as` — تصنيفها**
- **20 موقعاً في `hooks/data/`** (RPC results) — مبرَّرة جزئياً (Supabase RPC types ضعيفة) — لكن يمكن تحسينها بـ wrapper مثل `castRpc<T>(data)`
- **5 مواقع في `hooks/page/`** — أنماط mutation arg متطابقة → `inferMutationArg<T>()` يحلّها كلها
  - `useContractForm:98,136,157`، `useContractsPage:55`، `InvoicesPage:180`
- **6 مواقع في `lib/`** (storage/dataFetcher/queryMonitor/realtime) — معظمها interop مع APIs خارجية (مقبول)
- **2 موقع في `useMySharePage`** — تحويل JSONB من dashboard data

**3. `ContractsPage` يمرّر ~25 خاصية لـ `ContractsTabContent` (تأكَّد رقمياً)**
- سطر 81-95 — extreme props drilling (تم تأكيد العدد فعلياً ≈25 لا 50)
- يمرّر حتى `ITEMS_PER_PAGE` كـ prop (!) — يجب أن يستخدم الثابت المركزي
- يستخدم `setStatusFilter as (v: string) => void` — type cast إضافي

---

### 🟠 أولوية عالية (coupling / structural)

**4. `ContractsPage` يستدعي `useIsMobile`، `usePdfWaqfInfo`، `useAuth` خارج page hook** — يخالف Page Hook Pattern (`mem://core-modularization-standard-v7`)

**5. `IncomePage` يحوي `<Dialog>` كامل inline** (سطر 70-89) — يخالف نمط `ContractFormDialog`. ينبغي استخراج `IncomeFormDialog`

**6. `beneficiary/` flat (19 ملف) vs `admin/` مُقسَّم** — عدم تماثل واضح. اقتراح: `dashboard/`, `financial/`, `views/`, `messaging/`, `notifications/`, `support/`

**7. `components/dashboard/` يخلط 18 ملف بثلاث وظائف**
- KPIs: `DashboardKpiPanel`, `DashboardStatsGrid`, `CollectionSummaryCard`, `YearComparisonCard`, `YoYBadge`
- Charts: `DashboardCharts`, `IncomeMonthlyChart`, `CollectionSummaryChart`, `CollectionHeatmap`
- Widgets: `FiscalYearWidget`, `QuickActionsCard`, `RecentContractsCard`, `PendingActionsTable`, `DashboardAlerts`
- Views: `AccountantDashboardView`, `PagePerformanceCard`

**8. `FiscalYearContext.tsx:63-67` ternary ثلاثي متداخل** — يستحق `resolveFiscalYearId()` كدالة نقية قابلة للاختبار

---

### 🟡 أولوية متوسطة

| # | المشكلة | التوصية |
|---|---------|---------|
| **9** | `AuthContext.tsx` = 238 سطر بـ 5+ مسؤوليات | استخراج `useAuthListener`, `useAuthCleanup` |
| **10** | لا اختبارات لـ `lowIncomeMonths` و `documentationRate` | استخراج إلى `utils/financial/anomalyDetection.ts` |
| **11** | 98 تعليق مرجعي بدون وثيقة | إنشاء `docs/CHANGELOG-REFS.md` |
| **12** | حدود `lib/` vs `utils/` غامضة (services/monitoring/navigation/realtime/search في lib؛ pdf/format/financial/zatca في utils) | اعتماد قاعدة: `lib/` = side-effects/services، `utils/` = pure functions، وتوثيقها في `lib/README.md` و`utils/README.md` |
| **13** | `useReportsData` يُرجع 30+ قيمة | تجميع في `summary/distribution/performance` |

---

### 🟢 اختياري

| # | المشكلة | التوصية |
|---|---------|---------|
| **14** | `fyProgress` يعتمد على `Date.now()` بدون timer | توثيق أو `useInterval` يومي |
| **15** | لا E2E tests | موجة Playwright منفصلة |
| **16** | نمط `*.types.ts` مطبَّق فقط على `useDashboardSummary` | تعميمه على hooks كبيرة (`useReportsData`, `useCollectionData`) |

---

### خارطة الموجات المقترحة (ما بعد 14)

| موجة | المحتوى | مخاطر | تأثير |
|------|---------|-------|-------|
| **15** | `inferMutationArg<T>()` + تطبيقه على 5 مواقع `useContractForm/useContractsPage/InvoicesPage` + توسيع `constants/pagination.ts` بثوابت دلالية + توحيد 14 موقع `ITEMS_PER_PAGE` | منخفض | type safety + DRY |
| **16** | إعادة تنظيم `beneficiary/` لمجلدات + تقسيم `components/dashboard/` لـ `kpi/charts/widgets/` | متوسط (imports كثيرة) | تماثل |
| **17** | فك coupling `ContractsPage`: `ContractsContext` + نقل `useIsMobile/useAuth/usePdfWaqfInfo` للـ page hook + استخراج `IncomeFormDialog` | متوسط-عالي | maintainability |
| **18** | استخراج `lowIncomeMonths`/`documentationRate`/`resolveFiscalYearId` لـ pure utils + اختبارات + تقسيم `AuthContext` | متوسط | جودة |
| **19** | `docs/CHANGELOG-REFS.md` + توثيق `lib/` vs `utils/` + تطبيق `*.types.ts` على hooks كبيرة | منخفض | maintainability |
| **20** | E2E Playwright (تسجيل دخول، إقفال سنة، توزيع، سلفة) | عالي (إعداد جديد) | ثقة |

---

### الخلاصة
- الموجة 14 **نجحت فعلياً**: `as unknown as` انخفض 84 → 33، barrels مكتملة، constants موحَّدة جزئياً
- التركيز التالي يجب أن يكون على **#1 (ITEMS_PER_PAGE)** و**#2 (inferMutationArg)** كاستكمال طبيعي للموجة 14
- لا توجد bugs أمنية أو حرجة — كل المتبقي **تحسيني**
- **التوصية**: تنفيذ الموجة 15 فوراً (نفس النمط، مخاطر منخفضة، إكمال طبيعي للموجة 14)

<lov-actions>
<lov-suggestion message="نفّذ الموجة 15: إنشاء inferMutationArg helper + توحيد ITEMS_PER_PAGE في 14 ملفاً بثوابت دلالية في constants/pagination.ts">نفّذ الموجة 15</lov-suggestion>
<lov-suggestion message="نفّذ الموجة 17 مباشرة: فك coupling ContractsPage بإنشاء ContractsContext ونقل useIsMobile/useAuth/usePdfWaqfInfo داخل page hooks + استخراج IncomeFormDialog">نفّذ الموجة 17 (decoupling)</lov-suggestion>
<lov-suggestion message="نفّذ الموجة 16: إعادة تنظيم src/hooks/page/beneficiary/ لمجلدات (dashboard/financial/views/messaging) + تقسيم src/components/dashboard/ لـ kpi/charts/widgets">نفّذ الموجة 16 (تنظيم)</lov-suggestion>
<lov-suggestion message="نفّذ الموجة 18: استخراج lowIncomeMonths و documentationRate و resolveFiscalYearId لـ pure utils مع اختبارات + تقسيم AuthContext لـ sub-hooks">نفّذ الموجة 18 (جودة)</lov-suggestion>
<lov-suggestion message="أنشئ docs/CHANGELOG-REFS.md يربط كل تعليق مرجعي (#1, #B6, #D1...) بسياقه التاريخي + وثّق حدود lib/ vs utils/ في README">وثّق المراجع</lov-suggestion>
</lov-actions>
