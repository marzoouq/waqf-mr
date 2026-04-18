
## تقرير المراجعة المعمارية الشامل — حالة الكودبيس

### الإحصائيات المؤكَّدة (forensic)
- **815 ملف مصدر** + **188 ملف اختبار** = 1003
- **84 موقع `as unknown as`** (الرقم السابق 27 كان أقل بكثير من الواقع)
- **AuthContext = 238 سطر** | **types.ts = 2288 سطر** (auto-gen، يُتجاهل)
- **92 تعليق مرجعي** (#1, #B6, #D1...) بدون وثيقة

---

### 🔴 أولوية قصوى (critical)

| # | المشكلة | الدليل |
|---|---------|--------|
| **1** | **84 موقع `as unknown as`** — أعلى بكثير من المُدَّعى | معظمها في `hooks/data/` لـ RPC results (مبرَّر جزئياً) لكن `useContractForm:98,136,157`، `useContractsPage:55`، `useAccessLogTab:46`، `useArchiveLog:49` تكرّر النمط نفسه ويمكن استخراج helper |
| **2** | **`ITEMS_PER_PAGE` مُكرَّر في 14 ملفاً** — أعلى من المُدَّعى (4+) | بقيم متباينة: 9, 12, 15, `DEFAULT_PAGE_SIZE`. لا مصدر حقيقة واحد |
| **3** | **تكرار `permissions` في موقعين** (`utils/auth/` و `lib/permissions/`) | كلاهما دوال نقية — لا مبرر للتقسيم |
| **4** | **Barrel exports ناقصة** | `admin/index.ts` لا يصدّر `financial/` ولا `properties/`. مجلد `properties/` ليس له `index.ts` أصلاً |

---

### 🟠 أولوية عالية (coupling)

| # | المشكلة | الدليل |
|---|---------|--------|
| **5** | **`ContractsPage` يمرّر 50+ خاصية لـ `ContractsTabContent`** (تأكَّد: ~52 prop) | سطر 80-96 — extreme props drilling |
| **6** | **`ContractsPage` يستدعي `useIsMobile`، `usePdfWaqfInfo`، `useAuth` خارج page hook** | يخالف Page Hook Pattern |
| **7** | **`SortField` مكرَّر بنيتَين مختلفتَين** (income/expense) — barrel يُصدِّرهما باسمين مختلفين كحل التفاف | `useIncomePage:19`، `useExpensesPage:19` |
| **8** | **`999_999_999` hardcoded في ملفَين** | يستحق `MAX_FINANCIAL_AMOUNT` في `constants/limits.ts` |
| **9** | **`beneficiary/` حوي 19 ملف flat** بينما `admin/` مُقسَّم لـ 6 مجلدات | عدم تماثل واضح |
| **10** | **`IncomePage` يحوي `<Dialog>` كامل inline** (سطر 70-89) | يخالف نمط `ContractFormDialog` |

---

### 🟡 أولوية متوسطة

| # | المشكلة | التوصية |
|---|---------|---------|
| **11** | `AuthContext.tsx` 238 سطر بـ 5+ مسؤوليات | استخراج `useAuthListener`, `useAuthCleanup` |
| **12** | `useReportsData` يُرجع 30+ قيمة | تجميع في `summary/distribution/performance` |
| **13** | `components/dashboard/` يخلط KPIs/Charts/Heatmap (18 ملف) | تقسيم لـ `kpi/`, `charts/`, `widgets/` |
| **14** | لا اختبارات لـ `lowIncomeMonths` و `documentationRate` | استخراج إلى `utils/financial/` |
| **15** | 92 تعليق مرجعي (`#1, #D1...`) بدون وثيقة | إنشاء `docs/CHANGELOG-REFS.md` |
| **16** | `FiscalYearContext:63-67` ternary ثلاثي متداخل | استخراج `resolveFiscalYearId()` |
| **17** | حدود `lib/` vs `utils/` غير واضحة (services, monitoring, navigation في lib؛ بقية utilities في utils) | اعتماد قاعدة: `lib/` = side-effects/services، `utils/` = pure functions |

---

### 🟢 اختياري

| # | المشكلة | التوصية |
|---|---------|---------|
| **18** | `fyProgress` يعتمد على `Date.now()` بدون timer | توثيق أو `useInterval` |
| **19** | لا E2E tests | موجة Playwright منفصلة |
| **20** | `useDashboardSummary.types.ts` نمط جيد غير مُعمَّم | تطبيق على hooks كبيرة أخرى |

---

### خارطة الموجات المقترحة

| موجة | المحتوى | مخاطر | تأثير |
|------|---------|-------|-------|
| **14** | تنظيف هيكلي: توحيد `permissions` تحت `utils/auth/` + إكمال barrels (`properties/index.ts`, `admin/index.ts` للـ financial/properties) + استخراج `MAX_FINANCIAL_AMOUNT` و `ITEMS_PER_PAGE` كثوابت مركزية + `SortField<T>` generic | منخفض | نظافة فورية |
| **15** | helper `inferMutationArg<T>()` في `hooks/data/core/` + تطبيقه على 7 مواقع `useContractForm`, `useContractsPage`, `useAccessLogTab`, `useArchiveLog` | منخفض | type safety |
| **16** | إعادة تنظيم `beneficiary/` لمجلدات (`dashboard/`, `financial/`, `views/`, `messaging/`) | متوسط (imports) | تماثل |
| **17** | فك coupling: `ContractsContext` لإلغاء 50-prop drilling + نقل `useIsMobile/useAuth/usePdfWaqfInfo` لداخل page hooks (Contracts/Income/Expenses) + استخراج `IncomeFormDialog` | متوسط-عالي | maintainability |
| **18** | استخراج `lowIncomeMonths` و `documentationRate` لـ pure utils + اختبارات + تقسيم `AuthContext` لـ sub-hooks + استخراج `resolveFiscalYearId` | متوسط | جودة |
| **19** | تقسيم `components/dashboard/` لمجلدات + توحيد `lib/` vs `utils/` boundary + `docs/CHANGELOG-REFS.md` | منخفض | maintainability |
| **20** | E2E tests (Playwright): تسجيل دخول، إقفال سنة، توزيع، طلب سلفة | عالي (إعداد جديد) | ثقة |

---

### الخلاصة
- المشروع في **حالة معمارية صحية** — لا bugs أمنية أو بنيوية حرجة
- العدد الفعلي لـ `as unknown as` (84) أعلى بثلاثة أضعاف من التقدير السابق (27) — يستحق موجة مخصَّصة
- العدد الفعلي لـ `ITEMS_PER_PAGE` (14) أعلى من التقدير (4) — توحيدها يُلغي 13 سطر تكرار
- **التوصية**: تنفيذ الموجات بالترتيب 14→15→17 أولاً (تأثير فوري ومنخفض المخاطر)، تأجيل 16 و 20 لمرحلة لاحقة
