

## موجة P4 المؤسسية — التنفيذ المُتحقَّق منه جنائياً

### المؤكَّد بعد التحقق الجنائي
| البند | عدد فعلي | الإجراء |
|---|---|---|
| Barrels يتيمة | **71** (من 96) | حذف بدفعات آمنة |
| Re-export shims | 2 (`useMessagesPage` ×2) | حذف |
| Routes barrel | 1 (`routes/index.ts`) | حذف |
| `DataDiff` default export مكرر | 1 سطر | حذف السطر 80 |
| `BENEFICIARIES_PAGE_SIZE` re-export ميت | 1 token | حذف من `constants/index.ts` |
| ESLint disable في موضع خاطئ | 2 توجيهات | نقل لداخل جسم `useEffect` |

### ما **لن** يُحذف (أُسقط من التقرير الأصلي بعد التحقق)
- ❌ `STALE_SETTINGS` — مستخدم في 3 ملفات
- ❌ `filterByVisibility` shim — مستخدم في `BottomNav` + `useNavLinks`
- ❌ diagnostics `check*` — مستهلكة في `useSystemDiagnostics`
- ❌ توحيد `MONTH_NAMES` (5 ملفات) — يحتاج موجة منفصلة بفحص دلالي لكل استخدام

---

### #1 إصلاح ESLint في `useAccountsSettings.ts` (P0)
**السبب الجذري المتحقَّق**: `eslint-disable-next-line` على السطر 30/41 يستهدف فقط السطر التالي (`useEffect(() => {`)، لكن الخطأ يُرفع داخل جسم الإيفكت على السطور 34/45.

**الإصلاح**: نقل التوجيه ليكون داخل جسم كل `useEffect`:
```ts
useEffect(() => {
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync ... */
  if (settings['admin_share_percentage']) setAdminPercent(...);
  // ... + توجيه قبل كل setState
}, [...]);
```
البديل الأنظف: `useMemo` لاشتقاق القيم — مرفوض هنا لأن state قابل للتحرير في النموذج (تغيير سلوكي).

**النتيجة**: 0 أخطاء ESLint (من 2) + إزالة تحذيري "unused directive".

### #2 حذف 3 ملفات يتيمة مؤكَّدة (P1)
- `src/routes/index.ts`
- `src/hooks/page/admin/management/useMessagesPage.ts`
- `src/hooks/page/beneficiary/messaging/useMessagesPage.ts`

### #3 تنظيف ازدواج DataDiff (P2)
- `src/components/audit/DataDiff.tsx` السطر 80: حذف `export default DataDiff;`

### #4 تنظيف re-export يتيم (P2)
- `src/constants/index.ts` السطر 13: إزالة `BENEFICIARIES_PAGE_SIZE` فقط من قائمة re-exports (الإبقاء على `DEFAULT_PAGE_SIZE, PROPERTIES_PAGE_SIZE`). الملف الأصلي `pagination.ts` لا يُلمس.

### #5 حذف 68 barrel يتيم إضافي (P1 — دفعات آمنة)
بعد تأكيد grep بـ 0 مستهلك لكل واحد، حذف 68 ملف barrel متبقياً (71 إجمالي − 3 محذوفة في #2):

**components** (23): `ai, annual-report, audit, beneficiary/{dashboard,disclosure,my-share}, bylaws, chart-of-accounts, dashboard/{charts,kpi,views,widgets}, diagnostics, filters, financial, guards, landing, messages, pwa, search, settings/permissions, theme, user-management, waqf-info, waqif, zatca`

**hooks** (28): `auth, data/{audit,beneficiaries,content,dashboard,financial,invoices,messaging,notifications,properties,support,zatca}, financial, page/admin/{contracts,dashboard,financial,management,properties,reports}, page/admin (root), page/beneficiary/{dashboard,financial,messaging,notifications,settings,views}, page/shared, ui`

**lib** (5): `auth, realtime, search, theme, theme/themes`

**utils** (12): `auth, chart, contracts, export, financial, fonts, image, pdf, pdf/shared/renderers, validation, zatca`

### #6 فحص ما بعد الحذف
- `tsc --noEmit` على المشروع كاملاً
- `npx eslint src` — توقع 0 أخطاء
- اختبار build: `npm run build`

---

### الضمانات المؤسسية
- ✅ كل ملف يُحذف موثَّق بنتيجة `grep` صفرية على مسار `@/<dir>`
- ✅ لا لمس لـ `AuthContext`, `ProtectedRoute`, `SecurityGuard`, `supabase/client.ts`, `types.ts`, `config.toml`, `.env`
- ✅ لا تغيير سلوكي — كل الحذف على ملفات يتيمة فعلياً
- ✅ تحقق نهائي بـ `tsc + eslint + build`

### النتيجة المتوقعة
- **0 أخطاء ESLint** (baseline تاريخي للمرة الأولى)
- **−74 ملف ميت** (3 + 1 توحيد + 68 barrel + 2 cleanup)
- لا انحدار سلوكي

