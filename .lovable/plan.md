# خطة إكمال فحص ربط الأزرار والصلاحيات

## الحالة: ✅ مكتملة (الجولات المنفذة)

| Round | الوصف | الحالة | الدليل |
|---|---|---|---|
| P0 | توحيد `financial_reports`/`carryforward`، إزالة `reports` legacy | ✅ سابقاً | `permissionKeysCoverage.test.ts` (7/7) |
| V1 | Parity صارم + UNCONTROLLED_ROUTES whitelist + SECTION_LABELS coverage | ✅ مكتمل | `routePermissionParity.test.ts` (15/15) |
| V2 | كل nav link مسجَّل كـ `<Route>` فعلي (شامل `/waqif`) | ✅ مكتمل | `navLinksRouteRegistration.test.ts` (5/5) |
| V3 | Audit أزرار/روابط/تبويبات (regex-based) — تقرير CSV/MD | ✅ مكتمل | `audit/ui-permissions-audit.{csv,md}` — **0 GAPs** |
| V4 | إصلاح GAP-* | ⊘ غير مطلوب — 0 GAPs بعد تحسين detector |
| V5 | اختبارات contractual إضافية | ⊘ غير مطلوب — V1+V2+V3 تغطي العقد |

**النتيجة النهائية:** 1962/1962 اختبار يمر (225 ملف، صفر انحدارات).

**أبرز النتائج التحقيقية:**
- `/waqif` **مسجَّل فعلياً** في `src/routes/waqifRoutes.tsx` (ادعاء "يتيم" مرفوض).
- 27 GAP أولي اكتُشف ثم تبيّن أنه false positive (نمط `<Link><Button>` و filter Tabs بـ `onValueChange` و Collapsible `asChild`) — حُدّث الـ detector ليعكس النية الحقيقية.
- لا توجد `<Link>` ميتة، لا `supabase.from()` مباشر في صفحات.
- `/beneficiary/settings` موثّق صراحةً في whitelist (الإعدادات الشخصية متاحة دائماً).

---



## Round V1 — Parity صارم + توثيق الاستثناءات

ملف اختبار جديد: `src/test/routePermissionParity.test.ts`

يفحص:
- كل `permKey` في `BENEFICIARY_ROUTES`/`ADMIN_ROUTES` موجود في `DEFAULT_ROLE_PERMS` للأدوار المسموحة.
- كل `sectionKey` في الـ registries موجود في `BENEFICIARY_SECTION_KEYS`/`ADMIN_SECTION_KEYS`.
- كل key في `ROLE_SECTION_DEFS` له label في `SECTION_LABELS`.
- كل key في `DEFAULT_ROLE_PERMS` إما مستخدم فعلياً في routeRegistry أو مدرج في whitelist `LEGACY_PERM_KEYS = []` (فارغة الآن).
- whitelist `UNCONTROLLED_ROUTES = ['/beneficiary/settings', '/dashboard/settings/profile', ...]` للمسارات التي لا تملك permKey عمداً، مع تعليق يشرح السبب.

## Round V2 — التحقق من `/waqif`

ملف اختبار: `src/test/waqifRouteRegistration.test.tsx`

- يستخرج جميع `<Route path>` من `App.tsx` + `adminRoutes.tsx` + `beneficiaryRoutes.tsx` + أي ملف routes آخر.
- يفحص أن كل `to` يُرجعه `useNavLinks('waqif')` إما مسجل كـ Route أو معرف كـ redirect معروف في خريطة `KNOWN_REDIRECTS`.
- خاص: `/waqif` يجب أن يحل إلى مكون React صالح (ليس 404).

إذا كشف الاختبار أن `/waqif` غير مسجل: إضافته في `beneficiaryRoutes.tsx` كـ redirect إلى `/beneficiary` أو route مستقل (حسب نتيجة الفحص).

## Round V3 — Audit أزرار AST (سكربت Node)

سكربت جديد: `scripts/audit-ui-permissions.ts` (يستخدم `ts-morph`).

يفحص كل ملف في `src/pages/**` و `src/components/**` ويُولّد:
- `audit/ui-permissions-audit.csv`
- `audit/ui-permissions-audit.md`

أعمدة CSV:
```
file | line | element | label | handler | handler_resolved | role_context | route | guard | status
```

قواعد كشف:
- `<Button>` بدون `onClick` ولا `type="submit"` ولا `asChild` ولا داخل `DialogTrigger`/`AlertDialogTrigger` → `GAP-NO-HANDLER`.
- `<DropdownMenuItem>` بدون `onClick` ولا `asChild` → `GAP-NO-HANDLER`.
- `<TabsTrigger value="X">` بدون `<TabsContent value="X">` مطابق في نفس الشجرة → `GAP-DEAD-TAB`.
- `<Link to="/path">` حيث `/path` غير موجود في `routeRegistry` ولا في Route files → `GAP-DEAD-LINK`.
- أزرار destructive (variant="destructive" أو label يحتوي "حذف") بدون `AlertDialog`/`ConfirmDeleteDialog` → `GAP-NO-CONFIRM`.
- handler يستدعي `supabase.from(...).delete()` مباشرة في صفحة (يجب عبر hook) → `GAP-DIRECT-DB`.

يولّد ملخص MD بإحصاء `GAP-*` لكل صفحة.

## Round V4 — إصلاح GAPs المكتشفة

بناءً على CSV:
- `GAP-NO-HANDLER`: ربط handler من `hooks/page/` أو حذف العنصر الميت.
- `GAP-DEAD-TAB`: إضافة `TabsContent` أو إزالة `TabsTrigger`.
- `GAP-DEAD-LINK`: تصحيح المسار أو إزالة الرابط.
- `GAP-NO-CONFIRM`: لف الزر بـ `ConfirmDeleteDialog` الموجود.
- `GAP-DIRECT-DB`: نقل الاستدعاء إلى `hooks/data/` (احتراماً لـ memory rule).

الصفحات الحرجة المستهدفة أولاً:
`PropertiesPage`, `ContractsPage`, `InvoicesPage`, `ExpensesPage`, `SettingsPage`, `UserManagementPage`, `MySharePage`, `DisclosurePage`, `SupportPage`.

## Round V5 — اختبارات contractual للأزرار

ملفات جديدة:

**`src/test/criticalButtonsRender.test.tsx`**
- لكل صفحة حرجة (9 صفحات أعلاه)، يرندر بـ mock auth لكل دور مسموح، ويفحص أن جميع `getAllByRole('button')` تملك `onClick` غير undefined عبر `(btn as any).onclick !== null` أو event handler attached.

**`src/test/roleRouteAccess.test.tsx`**
- `<MemoryRouter>` لكل دور × كل route من registry.
- يتحقق: إذا كان الدور غير مسموح → يُعاد توجيهه إلى `/unauthorized`.
- إذا مسموح → يرندر المكون بدون throw.

**`src/test/dropdownMenuHandlers.test.tsx`**
- يلتقط كل `DropdownMenu` في الصفحات الحرجة، يفتحه، ويتحقق أن كل `MenuItem` يستجيب للضغط (handler attached).

## Round V6 — تشغيل مصفوفة التحقق الخماسية + توثيق

```bash
bunx vitest run    # كل الاختبارات الجديدة + الموجودة
bun run lint
bun tsc --noEmit
```

تحديث `.lovable/plan.md` بحالة "مكتمل" لكل Round.
إضافة `audit/ui-permissions-audit.md` كـ snapshot مرجعي.

---

## معايير القبول

- 0 صف `GAP-*` في `ui-permissions-audit.csv` (أو موثّق صراحة كاستثناء مقصود في whitelist).
- 100% اختبارات Round V1-V5 تمر.
- `/waqif` محسوم: إما route مسجل أو redirect موثق.
- لا تعديل على ملفات محمية: `AuthContext`, `ProtectedRoute`, `SecurityGuard`, `client.ts`, `types.ts`, `.env`, `config.toml`.
- لا migrations جديدة (فحص واجهة فقط).

## استثناءات مقصودة موثقة

- `/beneficiary/settings`, `/dashboard/settings/profile` — بدون permKey لأن الإعدادات الشخصية متاحة دائماً.
- `usePermissionCheck` opt-out على المفاتيح المفقودة — مقبول لأن `routePermissionParity` يمنع الفقدان أصلاً.

## خارج النطاق

- إعادة هيكلة `RequirePermission` لإضافة prop `section` (غير مطلوب — الاختبارات الجديدة تكفي).
- تغيير `verify_jwt` أو سياسات RLS.
- فحص Edge Functions (جولة منفصلة).
