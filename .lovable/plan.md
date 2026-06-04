## الحالة الحالية

تم تنفيذ Batches 2A→2D بنجاح. الادعاءات المتبقية الصحيحة من التقرير الجديد:

| الادعاء | الحالة الفعلية |
|---|---|
| ازدواجية toast في `useDistributeShares` و`DistributeDialog` | ✅ مُصلحة بالفعل في Batch 2A — `useDistribute.ts` الحالي لا يحتوي `uiNotify` |
| `useLogoUpload` يحدث state أثناء render | ✅ مُصلحة في Batch 2D — `useEffect([currentUrl, saving])` |
| `useUnits` / `useUnitMutations` toasts في data layer | ✅ مُصلحة في Batches 2B/2C |
| `useCollectionAlerts` / `useNotificationPreferences` UI state في data | ✅ مُصلحة في Batch 2D |
| `PendingActionsTable` يسرّب ZATCA للمحاسب | ✅ آمن — `AdminDashboard.tsx:116` يستخدم `{ctx.role === 'admin' && ...}` |
| `SAVE_MESSAGES` داخل `pdfMessages.ts` | ✅ مُصلحة — نُقلت إلى `lib/messages/saveMessages.ts` |

### المتبقي فعلياً (3 بنود حقيقية)

1. `lib/invoiceSync.ts` يحتوي `window.confirm` ×2 + toasts (Batch 2E)
2. `lib/monitoring/pageMonitor.ts` يكرر `PAGE_LABELS` بدل استخدام `routeRegistry/ALL_ROUTES` (Batch 3)
3. `supabase/functions/guard-signup` validation يدوي بدل Zod (Batch 4)

---

## Batch 2E — استبدال `window.confirm` بـ AlertDialog

**ملفات جديدة:**
- `src/components/contracts/ConfirmRegenerateInvoicesDialog.tsx` — AlertDialog لتأكيد إعادة توليد الفواتير عند وجود مدفوعات
- `src/components/contracts/ConfirmDeleteContractWithPendingDialog.tsx` — AlertDialog لتأكيد حذف عقد مع فواتير معلّقة

**تعديلات:**
- `src/lib/invoiceSync.ts` — حذف `confirmRegenerateWithPaid` و`confirmDeleteWithPending` المعتمدة على `window.confirm`؛ تُرجع الدوال `{ shouldConfirm: boolean, message: string }` فقط بدون toast
- `src/hooks/page/admin/contracts/useContractForm.ts` (أو الاسم الفعلي) — إضافة state لفتح dialog وانتظار قرار المستخدم
- `src/hooks/page/admin/contracts/useContractDelete.ts` — نفس النمط

## Batch 3 — توحيد PAGE_LABELS مع routeRegistry

**تعديل `src/lib/monitoring/pageMonitor.ts`:**
- حذف `PAGE_LABELS` المحلي
- `getPageLabel(path)` يقرأ من `ALL_ROUTES[path]?.title` في `routeRegistry`
- fallback للمسار نفسه إن لم يوجد

## Batch 4 — Zod في guard-signup

**تعديل `supabase/functions/guard-signup/index.ts`:**
- استبدال التحقق اليدوي بـ:
```ts
const SignupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});
const parsed = SignupSchema.safeParse(await req.json());
if (!parsed.success) return json({ error: 'مدخلات غير صالحة' }, 400);
```
- استيراد Zod من `https://esm.sh/zod@3` (متوافق مع باقي functions)

---

## التحقق بعد التنفيذ

- `bunx vitest run` يجب أن يبقى 1936/1936
- `supabase/functions/guard-signup/index.test.ts` يجب أن يمر دون تعديل (نفس contract)
- لا migrations، لا RLS، لا تغيير أمني

## بنود مرفوضة من التقرير (لا تنفيذ)

- حذف ملفات compatibility (`crudFactory.types.ts`, `types/sorting.ts`, `entities/accounts.ts`) — موثّقة كـ backward-compat، حذفها يحتاج `knip` فعلي
- `ChartBox.fallback` — موثّق للتوافق
- ثوابت `pagination.ts` القديمة — موثّقة للتوافق
- توحيد `ResponsiveTabs` في `SettingsPage` — تغيير UI كبير خارج نطاق الجولة
- Zod لكل action في `admin-manage-users` — جولة منفصلة لاحقاً
