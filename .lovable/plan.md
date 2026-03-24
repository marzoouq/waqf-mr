
# خطة الإصلاحات — الجولة الخامسة ✅ مكتملة

---

## الإصلاحات المنفذة (10 بنود)

| # | البند | الحالة |
|---|-------|--------|
| SEC-03 | إزالة `getSession()` من 4 ملفات واستخدام auto-auth | ✅ |
| HI-01 | cron كل 10 دقائق لحذف سجلات `PENDING` من `invoice_chain` | ✅ |
| HI-02 | فحص خطأ تحديث hash في `zatca-signer` | ✅ |
| HI-03 | تصفية `PENDING` من previousHash في `zatca-xml-generator` | ✅ |
| MED-07 | إصلاح `reachable` check في ZATCA API | ✅ |
| MED-09 | إصلاح blob URL stale closure في `InvoiceViewer` | ✅ |
| MED-10 | cron يومي لتنظيف `rate_limits` | ✅ |
| HI-07 | تحذير toast بدل return 0 صامت في نسب المستفيدين | ✅ |
| SEC-02 | validation trigger يمنع تفعيل شهادة PLACEHOLDER | ✅ |
| Tests | تحديث `edgeFunctionAuth.test.ts` لاستخدام `getUser` | ✅ |

---

## الملفات المعدلة

| الملف | التغيير |
|-------|---------|
| `src/hooks/data/useInvoices.ts` | إزالة `getSession()` + header يدوي |
| `src/hooks/auth/useUserManagement.ts` | إزالة `getSession()` + header يدوي |
| `src/pages/dashboard/BeneficiariesPage.tsx` | إزالة `getSession()` + header يدوي |
| `src/hooks/auth/useWebAuthn.ts` | إزالة `getSession()` + header يدوي |
| `supabase/functions/zatca-signer/index.ts` | فحص خطأ `hashUpdateError` |
| `supabase/functions/zatca-xml-generator/index.ts` | `.neq("invoice_hash", "PENDING")` |
| `supabase/functions/zatca-api/index.ts` | `reachable` = `status >= 200 && < 500` |
| `src/components/invoices/InvoiceViewer.tsx` | `useRef` لـ blobUrl |
| `src/hooks/financial/useTotalBeneficiaryPercentage.ts` | toast تحذيري |
| `src/test/edgeFunctionAuth.test.ts` | اختبارات محدثة |
| DB migration | trigger + دالة cleanup |
| DB cron | `cleanup-pending-invoice-chain` + `cleanup-rate-limits-daily` |
