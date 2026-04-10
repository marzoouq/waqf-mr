

# تحليل الخطة — ما تم تنفيذه وما تبقى

## النتيجة: ~90% من الخطة مُنفَّذ بالفعل

بعد فحص الكود الفعلي، معظم بنود هذه الخطة **تم تنفيذها في جلسات سابقة**:

| المرحلة | البند | الحالة |
|---------|-------|--------|
| 1 | `useAccountsViewPage` | ✅ موجود |
| 1 | `useBeneficiaryDashboardPage` | ✅ موجود |
| 1 | `useAnnualReportViewPage` | ✅ موجود |
| 1 | `useBylawsViewPage` | ✅ موجود |
| 1 | `useNotificationsPage` | ✅ موجود |
| 1 | `useInvoicesViewPage` | ✅ موجود |
| 1 | **`useSupportPage`** | ❌ غير موجود |
| 1 | **`useBeneficiarySettingsPage`** | ❌ غير موجود |
| 2 | تصنيف utils إلى مجلدات فرعية | ✅ مُنفَّذ (14 مجلد فرعي) |
| 3 | نقل `useIsMountedRef` إلى `hooks/ui/` | ✅ موجود في المسار الصحيح |
| 4 | interface `JsPDFWithAutoTable` في `pdfHelpers.ts` | ✅ مُنفَّذ بالفعل |

---

## ما تبقى: هوكان فقط

### 1. إنشاء `useSupportPage` hook
**الملف الجديد:** `src/hooks/page/beneficiary/useSupportPage.ts`

استخراج من `SupportPage.tsx` (63 سطر):
- `useState<SupportTicket | null>` للتذكرة المحددة
- `useState<boolean>` لنافذة التذكرة الجديدة
- `useSupportTickets()` لجلب البيانات
- إرجاع: `{ tickets, isLoading, selectedTicket, setSelectedTicket, showNewTicket, setShowNewTicket }`

الصفحة تصبح JSX فقط.

### 2. إنشاء `useBeneficiarySettingsPage` hook
**الملف الجديد:** `src/hooks/page/beneficiary/useBeneficiarySettingsPage.ts`

استخراج من `BeneficiarySettingsPage.tsx` (113 سطر):
- `useQueryClient` + `handleRetry`
- `useAuth` → `user`
- `useBeneficiariesSafe` → `currentBeneficiary`
- حساب `maskedId`
- `tabItems` array
- إرجاع: `{ user, currentBeneficiary, maskedId, benLoading, benError, handleRetry, tabItems }`

### 3. تحديث barrel file
إضافة التصديرين الجديدين إلى `src/hooks/page/beneficiary/index.ts`.

---

## الملفات المتأثرة

| ملف | تغيير |
|-----|-------|
| `src/hooks/page/beneficiary/useSupportPage.ts` | **جديد** |
| `src/hooks/page/beneficiary/useBeneficiarySettingsPage.ts` | **جديد** |
| `src/hooks/page/beneficiary/index.ts` | إضافة تصديرين |
| `src/pages/beneficiary/SupportPage.tsx` | تبسيط — استخدام hook |
| `src/pages/beneficiary/BeneficiarySettingsPage.tsx` | تبسيط — استخدام hook |

صفر تغيير على backend أو ملفات محمية.

