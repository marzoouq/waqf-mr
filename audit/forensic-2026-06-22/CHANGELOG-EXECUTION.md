# سجل تنفيذ الفحص الجنائي V2 — 2026-06-22

> ملخص ما نُفِّذ فعلياً من بنود `FORENSIC-REPORT.md`، وما اعتُبر إيجاباً كاذباً، وما أُجِّل لقرار صريح.

## مفتاح الحالات
- ✅ منفّذ
- ⚪ إيجابي كاذب (لا إجراء)
- ⏭ مؤجَّل (يحتاج قراراً)
- 📝 توثيق فقط

| ID | الفئة | الحالة | الإجراء/المرجع |
|----|------|--------|----------------|
| **F1** | Storage RLS | ✅ | migration `20260622230922_*` — إسقاط سياسة `Authenticated users can view invoices` |
| **F1b** | Storage RLS | ✅ | إضافة سياسة موحَّدة `Role-based users can view invoices` |
| **F2** | Secrets | ⏭ | يتطلّب أمر git يدوي: `git rm --cached .env` |
| **F3** | DB Privileges | ✅ | migration `20260622231008_*` — REVOKE EXECUTE من anon/PUBLIC على ~70 دالة SECURITY DEFINER |
| **F4** | React Query | ⚪ | `contentKeys.bylaws = ['waqf_bylaws']` يطابق factory key — TanStack prefix-match سليم |
| **F5** | DB Health | ⏭ | تحقيق `xact_rollback` يحتاج مراقبة زمنية |
| **F6** | Edge — auth-email-hook | ✅ | تعقيم `console.error` لا يكشف الـ payload |
| **F7** | Edge — email-admin | ✅ | إزالة `lastError` من الرد للعميل |
| **F8** | Edge — beneficiary-summary | ⏭ | موثّقة في `docs/API.md` كنقطة عامة — لا أحذف بدون أمر |
| **F9** | Hooks — Toast in data | ⏭ | يتطلب refactor `useNotificationActions` (تأثير سلوكي) |
| **F10** | Docs — routeRoles | ✅ | تحديث `src/constants/routeRoles.ts` ليطابق 41 مسار فعلي |
| **F11** | Edge — generate-voucher-pdf | ✅ | إزالة stack trace من logs |
| **F12** | Edge — zatca-* | ✅ | تعقيم logs في `zatca-onboard`, `zatca-renew`, `zatca-signer` |
| **F13** | Edge — beneficiary-summary PII | ⏭ | تابع لقرار F8 |
| **F14** | Edge — health-check | ✅ | استخدام `SUPABASE_ANON_KEY` بدل `SERVICE_ROLE_KEY` |
| **F15** | Storage — duplicates | ✅ | migration `20260622232316_*` — حذف 4 سياسات SELECT متكررة على bucket `invoices` |
| **F16** | Routes — hardcoded roles | ✅ | إضافة `WAQIF_ROLES` في `src/constants/roles.ts` واستخدامه في `waqifRoutes.tsx` |
| **F17** | UI — SignaturePad hex | ✅ | `strokeStyle` يقرأ `--foreground` ديناميكياً (يدعم الوضع الداكن) |
| **F18** | UI — hex sweep | ⚪ | الحالات المتبقية كلها Canvas/PDF/shadcn overlay (مسموح بنص memory rule) |
| **F19** | Dead hooks | ✅ | إضافة `@deprecated` على 7 hooks ميتة (لم تُحذف — فترة مراقبة) |
| **F20** | Query keys | ⚪ | الاختلافات بين base key و sub-keys factories سليمة (نمط TanStack) |
| **F21** | Test — REAL_KEY | ✅ | إعادة تسمية `REAL_KEY` → `MOCK_KEY` + قيمة `mock-…` في `_shared/auth.test.ts` |
| **F22** | Edge — HIBP log | ✅ | تقليل تفاصيل خطأ HIBP في `guard-signup` |
| **F23** | Routes — missing icons | 📝 | الصفحات admin-only utility، خارج bottom nav — لا أيقونة مطلوبة |
| **F24** | Storage — waqf-assets public | 📝 | مقصود وموثَّق في memory + `docs/security/views.md` |
| **F25** | Edge — auth-email-hook CORS | 📝 | مقصود (Supabase Auth webhook) — موثَّق |
| **F26** | DB — disk/memory | 📝 | مراقبة autovacuum لـ `access_log_archive` (راجع playbook) |

## ملفات أُنشئت/عُدِّلت

### Migrations
- `supabase/migrations/20260622230922_*.sql` — F1
- `supabase/migrations/20260622231008_*.sql` — F3
- `supabase/migrations/20260622231239_*.sql` — F1b
- `supabase/migrations/20260622232316_*.sql` — F15

### Edge Functions
- `auth-email-hook/index.ts` — F6
- `email-admin/index.ts` — F7
- `generate-voucher-pdf/index.ts` — F11
- `zatca-onboard/index.ts`, `zatca-renew/index.ts`, `zatca-signer/index.ts` — F12
- `health-check/index.ts` — F14
- `guard-signup/index.ts` — F22
- `_shared/auth.test.ts` — F21

### Frontend
- `src/constants/routeRoles.ts` — F10
- `src/constants/roles.ts` — F16
- `src/routes/waqifRoutes.tsx` — F16
- `src/components/expenses/vouchers/SignaturePad.tsx` — F17
- `src/hooks/data/audit/useAuditLogStats.ts` — F19
- `src/hooks/data/contracts/useContractsForPdf.ts` — F19
- `src/hooks/data/contracts/useWholePropertyRental.ts` — F19
- `src/hooks/data/financial/dashboard/useTotalBeneficiaryPercentage.ts` — F19
- `src/hooks/data/financial/fiscalYears/useFiscalYearSummary.ts` — F19
- `src/hooks/data/properties/usePropertyVatSync.ts` — F19
- `src/hooks/data/settings/app/useAppSettingsHistory.ts` — F19

## إجمالي
- **منفّذ:** 14 بند (F1, F1b, F3, F6, F7, F10, F11, F12, F14, F15, F16, F17, F19, F21, F22)
- **إيجابي كاذب:** 3 بنود (F4, F18, F20)
- **مؤجَّل:** 5 بنود (F2, F5, F8, F9, F13)
- **توثيق فقط:** 4 بنود (F23, F24, F25, F26)
