# تقرير الفحص العميق للمستودع

## 1. إحصاءات المستودع

| الفئة | العدد |
|---|---|
| إجمالي ملفات `src/` | 1218 (684 ts + 516 tsx + 17 md + 1 css) |
| الصفحات `src/pages/**` | 67 |
| المكوّنات `src/components/**` | 450 |
| الهوكات `src/hooks/**` | 319 |
| ملفات المسارات | 4 (admin / beneficiary / waqif / public) + helpers |
| Edge Functions | 19 وظيفة + `_shared` |
| جداول قاعدة البيانات | 41 جدول (RLS مُفعّل على الكل) |

## 2. نتائج الفحوصات

| الفحص | الحالة |
|---|---|
| `tsc --noEmit` | ✅ 0 أخطاء |
| `vitest run` | ✅ 1985/1985 مرّت (228 ملف) |
| `lint:conventions` | ✅ 0 مخالفات + 5 تحذيرات حجم/استخدام |
| `audit-ui-permissions` | ✅ 0 فجوات (449 ملف) |
| `build-permissions-matrix` | ✅ 156 صف (39×4) |
| `security-gates` (Edge) | ✅ 0 مخالفات |
| `eslint src/` | ❌ **4 أخطاء + 4 تحذيرات** |
| `npm audit` | ⚠ غير متاح (نقطة نهاية npm registry لا تدعمه في الـ sandbox) |

## 3. الأخطاء الأربعة في ESLint (تحتاج إصلاح)

| # | الملف:السطر | القاعدة | الوصف |
|---|---|---|---|
| 1 | `src/components/layout/BottomNav.tsx:39` | `react-hooks/rules-of-hooks` | `useMemo` يُستدعى بعد early-return شرطي |
| 2 | `src/hooks/data/notifications/useNotificationActions.ts:11` | `no-restricted-imports` | استيراد `sonner` داخل `hooks/data/` (يجب نقله لـ `hooks/page/`) |
| 3 | `src/hooks/page/admin/financial/useFiscalYearManagement.ts:55` | `react-hooks/set-state-in-effect` | `setState` داخل `useEffect` بدون سبب |
| 4 | `src/hooks/page/admin/settings/useLogoUpload.ts:28` | `react-hooks/set-state-in-effect` | `setPreview(currentUrl)` متزامن داخل effect |

**التحذيرات الأربعة** (لا تُفشل البناء): `react-refresh/only-export-components` ×2، `exhaustive-deps` ×1، `max-lines` ×1.

## 4. التحذيرات المعمارية (5)

- 3 ملفات `hooks/page` تجاوزت 200 سطر (200-228) — تحت الحد الصارم.
- `src/lib/services/diagnosticsReadService.ts` و `fiscalYearService.test.ts` — services بدون مستهلكين.

## 5. تحذيرات الأداء من preview console

- `Query: contract_fiscal_allocations/...` استغرق 3286ms
- `Query: contracts/...` استغرق 6673ms (slow query على `/dashboard/contracts`)

## 6. الأمن

- آخر فحص أمني: الـ finding الوحيد القابل للإصلاح (سياسة storage على الفواتير) تم إصلاحه مسبقاً. لا توجد ثغرات معلّقة في الذاكرة الأمنية.

---

# خطة الإصلاح المقترحة (في جولة بناء منفصلة)

## الإصلاحات الإلزامية (4 أخطاء ESLint)

1. **`BottomNav.tsx`** — نقل `useMemo` فوق أي early-return حتى يلتزم بقواعد الهوكات.
2. **`useNotificationActions.ts`** — إزالة استيراد `sonner` ونقل استدعاء toast إلى hook صفحة أعلى في الطبقات (`hooks/page/.../useNotificationsPage.ts`).
3. **`useFiscalYearManagement.ts:55`** — تحويل `setState` داخل `useEffect` إلى derived state أو event handler.
4. **`useLogoUpload.ts:28`** — استبدال المزامنة بـ `useEffect` بـ derived state من `currentUrl` + `saving`.

## التنظيف الاختياري (تحذيرات)

- تقسيم 3 هوكات الصفحة المتجاوزة 200 سطر.
- حذف/دمج `diagnosticsReadService.ts` و `fiscalYearService.test.ts` (services بلا مستهلكين).
- مراجعة استعلامات `contracts` و `contract_fiscal_allocations` البطيئة (فهرس / select محدد / تقسيم).

## نطاق التغييرات

- 4 ملفات فقط للإصلاحات الإلزامية.
- لا تغييرات في RLS أو migrations أو edge functions أو UI/business logic.
- لا تعديل على الملفات المحمية.

## التحقق بعد الإصلاح

`npx tsc --noEmit` → `npx eslint src/` (0 أخطاء) → `npm run lint:conventions` → `npx vitest run` → سكربتات الـ audit الثلاثة.
