# خطة الإغلاق النهائية — تحقق وإصلاح الادعاءات الخارجية

## نتائج التحقق المباشر

التقرير الخارجي يشير إلى commit قديم (`77cc292`). تحققت من الكود الفعلي وفلترت الادعاءات:

### ❌ ادعاءات غير صحيحة (مُصلحة سابقاً أو خطأ بالأصل)

1. **PendingActionsTable يسرّب رابط ZATCA للمحاسب** — خطأ. `AdminDashboard.tsx:116` يلفّ المكوّن بـ `{ctx.role === 'admin' && (...)}`. المحاسب لا يراه إطلاقاً.
2. **`useUnits.ts` فيه toast** — تم إصلاحه في Batch 2C (toasts مُزالة).
3. **`useUnitMutations.ts` خلط طبقات في hooks/data** — تم نقله إلى `hooks/page/admin/properties/`.
4. **`useZatcaInvoiceActions.ts` فيه toast** — تم إصلاحه في Batch 2C.
5. **`useDistribute.ts` فيه toast** — تم إصلاحه في Batch 2B.

### ✅ ادعاءات صحيحة متبقية

1. `useLogoUpload.ts` — toasts + `setPreview` داخل جسم الـ hook أثناء render (نمط خطر).
2. `useCollectionAlerts.ts` — toasts + UI loading state داخل `hooks/data/`.
3. `useNotificationPreferences.ts` — toasts + UI state داخل `hooks/data/`.
4. `useAppSettingsWrite.ts` — toasts متفرقة داخل `hooks/data/`.
5. `invoiceSync.ts` — `window.confirm` × 2 وtoasts متعددة داخل `lib/`.
6. `pdfMessages.ts` — `SAVE_MESSAGES` معرّف داخل ملف باسم `pdfMessages` (تسمية مضلِّلة).
7. `pageMonitor.ts` — `PAGE_LABELS` يدوية ومكررة مع `routeRegistry`.
8. `guard-signup` Edge Function — validation يدوي بدل Zod.

---

## التنفيذ المقترح (4 دفعات)

### Batch 2D — تنظيف hooks/data المتبقية من toasts + UI state

- **`useLogoUpload.ts`**: نقل الملف إلى `src/hooks/page/admin/settings/useLogoUpload.ts`، وإصلاح `setPreview` بنقله إلى `useEffect([currentUrl, saving])`. تحديث consumers.
- **`useCollectionAlerts.ts`**: نقله إلى `src/hooks/page/admin/contracts/useCollectionAlerts.ts`. التوست يبقى لأنه أصبح في page layer. تحديث consumers.
- **`useNotificationPreferences.ts`**: نقله إلى `src/hooks/page/shared/notifications/useNotificationPreferences.ts` (يقرأ/يكتب localStorage و audio preview — منطق UI خالص). تحديث consumers.
- **`useAppSettingsWrite.ts`**: إبقاء الملف، إزالة كل `uiNotify.*`، نقلها إلى الـ wrappers في الصفحات/المكونات المستهلِكة عبر `mutate(vars, { onSuccess, onError })`.

### Batch 2E — استبدال `window.confirm` في invoiceSync

- إنشاء مكوّنين في `src/components/contracts/`:
  - `ConfirmRegenerateInvoicesDialog.tsx`
  - `ConfirmDeleteContractWithPendingDialog.tsx`
  (مبنيان فوق `AlertDialog` الموجود).
- تعديل `src/lib/contracts/invoiceSync.ts`: حذف `confirmRegenerateWithPaid` و`confirmDeleteWithPending` — استبدالها بدوال صافية تُرجع `{ shouldConfirm: boolean, message: string }` فقط (بدون `window.confirm`).
- تحديث `useContractForm.ts` و`useContractDelete.ts` لاستخدام state للحوار + الموافقة عبر الـ dialog component.

### Batch 3 — تنظيمات صغيرة

- **رسائل**: فصل `src/lib/messages/saveMessages.ts` عن `pdfMessages.ts`. تحديث imports.
- **pageMonitor**: استبدال `PAGE_LABELS` بدالة `getPageLabel(path)` تشتق من `ALL_ROUTES` في `src/constants/routeRegistry.ts`، مع fallback ذكي.

### Batch 4 — Zod في `guard-signup`

- استبدال `if (!email...)` المتسلسل بـ:
  ```ts
  const RequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  });
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return json({ error: ... }, 400, corsHeaders);
  ```

---

## التحقق بعد كل دفعة

- `bunx vitest run` — يجب أن يبقى 1936/1936 ناجح.
- بحث صفري:
  - `rg -l "uiNotify\|useState" src/hooks/data/` يقتصر فقط على ملفات data نقية بلا UI.
  - `rg "window\.confirm" src/lib src/hooks` = 0.

---

## ملفات سيتم تعديلها/إنشاؤها (تقدير)

- موجودة (تعديل): ~12 ملف
- نقل: 3 ملفات (Logo/CollectionAlerts/NotificationPreferences)
- جديدة: 3 (Dialog ×2 + saveMessages.ts)
- Edge Function: 1 (guard-signup)

النطاق صغير ومحصور؛ لا migrations DB، لا تغييرات RLS، لا تعديل أمني. هل أبدأ تنفيذ Batch 2D؟