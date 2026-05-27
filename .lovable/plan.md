## نتائج الفحص الجنائي الفعلي (read-only)

### ✅ نظيف تماماً
- لا `console.*` خارج logger في كود الإنتاج
- لا `localStorage` لـ `fiscal_year_id`
- لا cross-barrel imports
- لا `domain/` يستورد supabase client
- لا `page/` يستدعي supabase مباشرة
- لا `getSession()` في Edge Functions
- لا `execute_sql` أو raw SQL
- لا أدوار مخزّنة في storage/profile
- CORS متسقة على جميع الاستجابات

### 🟡 مخالفات حقيقية تستحق الإصلاح

| # | المخالفة | الموقع | الأولوية |
|---|---|---|---|
| A1 | toast في hook بيانات | `src/hooks/data/financial/useDisbursementVouchers.ts:11,88,98,119,122,127,144,148,165,169` | **P1** |
| A2 | منطق حسابي في `data/` | `useIncomeComparison.ts:42`, `useAdvanceQueries.ts:50-54` | **P2** |
| A3 | ملفات > 200 سطر (page hooks) | `useAccountsPage.ts:216`, `useContractForm.ts:216` | **P2** |
| A4 | `any[]` بدون توثيق | `src/hooks/data/core/inferMutationArg.ts:15` | **P3** |
| B1 | `getSession()` client-side fallback | `src/hooks/auth/session/useAuthListener.ts:131` — استبدله بـ `getUser()` لإجبار التحقق الخادمي | **P1** |
| B2 | غياب Zod validation في 8 Edge Functions | `ai-assistant`, `zatca-signer`, `zatca-onboard`, `zatca-renew`, `zatca-report`, `email-admin`, `generate-voucher-pdf`, `webauthn` handlers | **P1** |
| B3 | `health-check` بدون أي حماية | service-role + verify_jwt=false + بلا secret — أضف فحص header سرّي | **P2** |
| B4 | `auth-email-hook /preview` يستخدم `Access-Control-Allow-Origin: *` | مقصود لكن غير موثّق — أضف تعليق توضيحي صريح | **P3** |

### ✅ مقبول بقرار معماري (لا يُغيَّر)
- `verify_jwt=false` على 14 وظيفة: مُعوَّض بـ `authenticate()` داخل الكود (موثّق في `mem://conventions/lovable-forbidden-actions`)
- `lookup-national-id` يستخدم service role بلا JWT: متعمد (pre-signup public) + rate-limited
- `webauthn auth-verify` بلا مصادقة: هو نفسه مسار تسجيل الدخول

---

## خطة التنفيذ المقترحة (4 جولات صغيرة)

### الجولة 3 — أمان P1 (الأكثر إلحاحاً)
1. **B1**: استبدال `getSession()` بـ `getUser()` في `useAuthListener.ts:131` مع الحفاظ على fallback behavior
2. **B2**: إضافة Zod schemas لـ 8 الوظائف الناقصة — بدءاً بـ ZATCA (4 وظائف) لأنها تتعامل مع فواتير ضريبية
3. **A1**: نقل toast من `useDisbursementVouchers.ts` إلى الـ page hook المستهلِك (`useDisbursementVouchersPage` أو ما يكافئه)

### الجولة 4 — معمارية P2
4. **A2**: نقل منطق `useIncomeComparison` و `useAdvanceQueries` الحسابي إلى `src/hooks/domain/financial/`
5. **A3**: تقسيم `useAccountsPage.ts` و `useContractForm.ts` (216 سطر لكل منهما) إلى ملفات فرعية حسب المسؤولية
6. **B3**: إضافة `X-Health-Secret` header check إلى `health-check`

### الجولة 5 — جودة P3
7. **A4**: توثيق `any[]` في `inferMutationArg.ts` بتعليق `eslint-disable` ومبرّر
8. **B4**: تعليق توضيحي على hardcoded CORS في `auth-email-hook /preview`

### الجولة 6 — توثيق
9. كتابة `.lovable/audit-2026-05-27.md` يلخّص النتائج والقرارات
10. تحديث `mem://` بأي قواعد جديدة (مثل: "لا toast في hooks/data — يجب أن تكون في hooks/page")

---

## القيود الصارمة

- كل جولة تُنفَّذ منفصلة بموافقتك بعد عرض الـ diff
- لا تعديل على ملفات محمية (`client.ts`, `types.ts`, `config.toml`, `.env`)
- لا migrations في هذه الجولات (كل التعديلات في كود التطبيق)
- اختبارات regression قبل/بعد كل تعديل
- الإصلاحات جراحية — لا تلامس كوداً غير مذكور صراحة في هذا التقرير

---

**هل أبدأ بالجولة 3 (P1 الأمنية)؟** أم تفضّل ترتيباً مختلفاً، أو إرجاء بعض البنود؟