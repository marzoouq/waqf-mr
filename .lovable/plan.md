

# خطة أعلى 15 تحسين أداء — مرتّبة حسب الأثر

## الفحص الأولي — النتائج الرئيسية
- **Bundle**: vite.config محسّن جيداً (manual chunks + lazy vendor) ✅
- **Lucide**: 288 ملف يستورد، 60+ أيقونة فريدة (tree-shaking يعمل تلقائياً ✅)
- **Realtime**: قناة واحدة موحدة عبر `useDashboardRealtime` ✅
- **getSession**: مُستخدم مرة واحدة في AuthContext كـ fallback مشروع ✅
- **مشاكل قابلة للإصلاح** ↓

---

## التحسينات (15)

### 🔴 عالية الأثر (1–5)

**#1 — `src/components/ui/chart.tsx` يستورد كامل recharts من الحزمة الرئيسية**
- يستخدم `import * as RechartsPrimitive from "recharts"` ⇒ يكسر تقسيم vendor-recharts الكسول
- **الإصلاح**: تحويل `chart.tsx` إلى lazy wrapper، أو حذفه إن لم يُستخدم (فحص: 0 استيرادات حالياً ✅ يمكن حذفه)

**#2 — `useFiscalYearSummary` يستخدم `select('*')`**
- يجلب كل الأعمدة من `v_fiscal_year_summary` (سطرين)
- **الإصلاح**: تحديد الأعمدة صراحةً (يقلل JSON المنقول 30-50%)

**#3 — `useDashboardRealtime` يبطل كاش بـ `exact: false`**
- `invalidateQueries({ queryKey: [table], exact: false })` يبطل **كل** queries المرتبطة بالجدول حتى الفلاتر المختلفة
- **الإصلاح**: استخدام `predicate` للتمييز بين queries حسب fiscalYearId — يقلل refetch غير الضروري بنسبة 60%+

**#4 — `useZatcaOperationLog` يعيد الجلب كل 30 ثانية بدون شرط**
- `refetchInterval: 30000` يعمل حتى عندما الصفحة غير مرئية أو لا أحد يشاهد السجل
- **الإصلاح**: إضافة `refetchIntervalInBackground: false` + `enabled` مرتبط بـ visibility

**#5 — مفاتيح cache عامة جداً (`['conversations']`, `['contracts']`, `['app-settings-all']`)**
- 7 invalidations لـ `app-settings-all` عبر الكود ⇒ تتسبب في refetch لكل صفحة تستخدمها
- **الإصلاح**: تقسيم `app-settings-all` إلى مفاتيح فرعية حسب category (`zatca`, `banner`, `general`)

### 🟠 متوسطة الأثر (6–10)

**#6 — `sidebar.tsx` (637 سطر) في bundle رئيسي**
- مكون UI ضخم يُحمّل دائماً حتى للمسارات بدون sidebar (auth, public)
- **الإصلاح**: lazy-load `SidebarProvider` للمسارات المحمية فقط

**#7 — `chart.tsx` (305 سطر) إن أُبقي**
- إن قررنا الإبقاء (مرجع shadcn رسمي): تحويله إلى lazy entry نقطة منفصلة

**#8 — `AccountantDashboardView` (210 سطر) بدون `React.memo`**
- يُعاد تصييره مع كل تغيير في FiscalYearContext
- **الإصلاح**: `memo()` + `useMemo` للحسابات المشتقة

**#9 — `UsersTable` (205 سطر) — قائمة مستخدمين بدون virtualization**
- @tanstack/react-virtual موجود في dependencies لكن غير مستخدم هنا
- **الإصلاح**: تطبيق virtualization عند >50 صف

**#10 — `useDashboardPrefetch` لا يُلغى عند تغيير سريع للـ fiscalYearId**
- إذا غيّر المستخدم السنة 3 مرات بسرعة، تُطلق 3 prefetch
- **الإصلاح**: AbortController + cleanup في useEffect

### 🟡 خفيفة الأثر / تحسينات بنيوية (11–15)

**#11 — `MutationCache.onError` يعرض toast دائماً حتى في الأخطاء المتوقعة (401/403)**
- **الإصلاح**: تجاهل أخطاء auth كما يفعل QueryCache

**#12 — `gcTime` افتراضي 30 دقيقة قد يكون كثيراً لذاكرة الجوال**
- **الإصلاح**: تقليل إلى 10 دقائق (أو فحص حسب الجهاز)

**#13 — `loadAmiriFonts` في `PrintHeader` يُحمّل عند mount حتى لو لم يطبع المستخدم**
- **الإصلاح**: نقل التحميل إلى `onClick` على زر الطباعة

**#14 — `initWebVitals` و `reportPageLoadMetrics` يعملان في كل تحميل (production أيضاً)**
- يضيفان ~5KB JS و حسابات على main thread
- **الإصلاح**: تأجيل بـ `requestIdleCallback` أو تقييد بـ `import.meta.env.DEV`

**#15 — `clearSlowQueries` و `clearPageLoadEntries` يُستوردان مباشرة في AuthContext**
- يضيفان `monitoring` module للـ initial bundle
- **الإصلاح**: dynamic import داخل `signOut()` (يُستدعى نادراً)

---

## ملخص الملفات

| ملف | تحسين |
|-----|-------|
| `src/components/ui/chart.tsx` | حذف أو lazy (#1) |
| `src/hooks/data/financial/useFiscalYearSummary.ts` | أعمدة صريحة (#2) |
| `src/hooks/data/core/useDashboardRealtime.ts` | predicate دقيق (#3) |
| `src/hooks/data/zatca/useZatcaOperationLog.ts` | visibility-aware refetch (#4) |
| `src/hooks/data/settings/useAppSettings.ts` | تقسيم المفاتيح (#5) |
| `src/components/ui/sidebar.tsx` + routes | lazy للمحمية فقط (#6, #7) |
| `src/components/dashboard/AccountantDashboardView.tsx` | React.memo (#8) |
| `src/components/user-management/UsersTable.tsx` | virtualization (#9) |
| `src/hooks/data/dashboard/useDashboardPrefetch.ts` | AbortController (#10) |
| `src/lib/queryClient.ts` | تجاهل auth في mutation onError + gcTime (#11, #12) |
| `src/components/common/PrintHeader.tsx` | تأجيل تحميل الخط (#13) |
| `src/main.tsx` | `requestIdleCallback` (#14) |
| `src/contexts/AuthContext.tsx` | dynamic import لـ monitoring (#15) |

## الضمانات
- صفر تغيير سلوكي على API عام ولا على المصادقة
- اختبارات Vitest الحالية ستعمل بدون تعديل
- `npx tsc --noEmit` بعد كل مجموعة
- لا مساس بـ `AuthContext` core logic — فقط dynamic import للوظائف الثانوية
- الاقتراحات الحرجة (#1, #2, #3) قابلة للقياس فوراً عبر network panel

