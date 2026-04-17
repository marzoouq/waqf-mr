
# خطة معالجة الفحص العميق #16-#100

## التصنيف

**مستبعد:** #1-15 (نقاط قوة)، #19 (محمي)، #26/#29/#30/#33-38/#48-50/#41-42/#85-87/#89/#97 (مُعالجة سابقاً أو قرارات مقبولة)

**مُؤجَّل لموجات منفصلة:** #43/#44/#77/#78/#80 (تقسيم hooks)، #51-65/#92-96 (اختبارات)

## المُنفَّذ (16 إصلاح + 7 توثيقات)

### 🔴 حرجة (4)
| # | الإصلاح |
|---|---------|
| #16 | `import type { FormEvent, MouseEvent } from 'react'` بدل `React.*` |
| #17 | لف `filteredProperties` بـ `useMemo` |
| #21 | استخدام `PROPERTIES_PAGE_SIZE` من `constants/pagination.ts` |
| #22 | فصل أيقونات Lucide إلى `navigationIcons.ts` جديد |

### 🟠 بنيوية (5)
| # | الإصلاح |
|---|---------|
| #23/#69 | `routeRegistry.ts` يدمج 4 maps في `Record<route, RouteMeta>` + re-exports |
| #24 | مفتاح `carryforward` صريح بدل خلط مع `share` |
| #26/#76 | `setTimeout` دوري كل 5ث لتنظيف `recentToasts` |
| #71 | `isError` + `error` في return من `useSupportPage` |
| #74 | `activeContractsFilter.ts` يستخرج المنطق من inline |

### 🟡 توثيقات JSDoc (7)
- `usePropertiesPage.ts` (#18, #25) — pagination strategy + سبب 3 useMemos
- `useWebAuthn.ts` (#27/#28) — تغطية الاختبار
- `waqf/README.md` + `waqif/README.md` (#31/#32)
- `AuthContext.tsx` (#70) — JSDoc على `CLEARABLE_STORAGE_KEYS`
- `src/hooks/README.md` (#91) — جديد
- `useMySharePdfHandlers.ts` (#99) — تبرير المكان

## الملفات (10)
```
src/hooks/page/admin/management/usePropertiesPage.ts
src/constants/navigation.ts
src/constants/navigationIcons.ts          [جديد]
src/constants/routeRegistry.ts            [جديد]
src/lib/notify.ts
src/hooks/page/beneficiary/useSupportPage.ts
src/hooks/page/admin/activeContractsFilter.ts  [جديد]
src/contexts/AuthContext.tsx              [JSDoc فقط]
src/hooks/README.md                       [جديد]
src/components/waqf/README.md + waqif/README.md  [جديد]
```

## الضمانات
- صفر تغيير سلوكي — re-exports محفوظة لكل المسارات القديمة
- AuthContext: JSDoc فقط (لا منطق)
- لا مساس بملفات Supabase المحمية
- `npx tsc --noEmit` بعد التنفيذ
