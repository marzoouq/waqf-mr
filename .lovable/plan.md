## الجولات المتبقية — خطة مرتّبة

### الجولة 3-ب (إكمال P1) — أمان Edge Functions

**B2-تكملة**: إضافة Zod validation للوظائف الثلاث المتبقية.

1. **`email-admin`** (`supabase/functions/email-admin/index.ts`)
   - أضف schema يتحقق من `action` (enum من `ALLOWED_ACTIONS`) + الحقول المرتبطة بكل action (recipient_email, template_name, etc.)
   - يرجع 400 مع `flatten().fieldErrors` عند الفشل
2. **`generate-voucher-pdf`** (`supabase/functions/generate-voucher-pdf/index.ts`)
   - schema: `{ voucher_id: z.string().uuid() }`
3. **`webauthn`** (`supabase/functions/webauthn/`)
   - schema موحّد على مستوى dispatcher: `{ action: z.enum([...]) }` + sub-schemas في كل handler حسب الحقول (challenge, credential, userId, etc.)
   - يحافظ على `auth-verify` (pre-auth flow) بدون كسر سلوك تسجيل الدخول

**معيار القبول**: كل request body يمرّ بـ `safeParse`؛ لا حقول `as any` أو destructure مباشر؛ ردود 400 موحّدة الشكل.

---

### الجولة 4 — المعمارية P2

**A2**: نقل منطق حسابي خارج طبقة data
- `src/hooks/data/financial/useIncomeComparison.ts:42` — العمليات الحسابية (مقارنة الإيرادات، النِسَب) تنتقل إلى `src/hooks/domain/financial/useIncomeComparison.ts` جديد. يبقى ملف data ينفّذ الاستعلامات فقط ويعيد raw rows.
- `src/hooks/data/financial/useAdvanceQueries.ts:50-54` — حسابات الحد الأقصى للسلف ومجاميع الفئات تنتقل إلى `src/hooks/domain/financial/useAdvanceCalculations.ts`.
- تحديث المستهلكين (page hooks/components) للاستيراد من المسار الجديد.

**A3**: تقسيم ملفات > 200 سطر
- `src/hooks/page/admin/accounts/useAccountsPage.ts` (216) → تقسيم إلى:
  - `useAccountsPageState.ts` (الفلاتر/البحث/التصفّح)
  - `useAccountsPageActions.ts` (mutations + toasts)
  - `useAccountsPage.ts` (composer رفيع يجمع الاثنين)
- `src/hooks/page/admin/contracts/useContractForm.ts` (216) → تقسيم إلى:
  - `useContractFormSchema.ts` (Zod + defaults)
  - `useContractFormSubmit.ts` (mutations + validation)
  - `useContractForm.ts` (composer)

**B3**: حماية `health-check`
- إضافة `X-Health-Secret` header check يقارن مع `Deno.env.get('HEALTH_CHECK_SECRET')` (سيُضاف لاحقاً كـ secret)
- يعيد 401 عند الفشل بدلاً من السماح بأي وصول
- ملاحظة: يتطلب إضافة secret جديد قبل التفعيل — سيُطلب من المستخدم في وقت التنفيذ

---

### الجولة 5 — جودة P3

**A4**: `src/hooks/data/core/inferMutationArg.ts:15`
- توثيق `any[]` بتعليق `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + سطر تفسير: "TanStack mutation arg variance can't be expressed without `any` — see infer types limitation."

**B4**: `supabase/functions/auth-email-hook/index.ts` /preview
- إضافة تعليق توضيحي بارز فوق hardcoded `*` يشرح: "Preview endpoint called from Lovable's email template tool — origin is unpredictable, `*` is intentional and safe because no credentials are returned."

---

### الجولة 6 — توثيق

1. **إنشاء `.lovable/audit-2026-05-27.md`** — تقرير شامل:
   - ملخص النتائج (8 مخالفات، 3 مقبولة بقرار معماري)
   - ما تم إصلاحه في كل جولة + diff references
   - القرارات المعمارية المُوثّقة (verify_jwt=false rationale, service-role exceptions)
   - متبقّيات للمستقبل (إن وجدت)

2. **تحديث `mem://` بقواعد جديدة**:
   - `mem://conventions/no-toast-in-data-hooks` — قاعدة جديدة: toast في `hooks/page/` فقط، `hooks/data/` نقي
   - `mem://security/edge-functions-zod-required` — كل Edge Function تقرأ body يجب أن تحقّق Zod قبل الاستخدام
   - تحديث `mem://index.md` لربط القواعد الجديدة

---

## القيود الصارمة (تنطبق على كل جولة)

- موافقة منفصلة لكل جولة قبل البدء
- لا تعديل على ملفات محمية: `client.ts`, `types.ts`, `config.toml`, `.env`
- لا migrations
- إصلاحات جراحية فقط — لا تلامس كوداً غير مذكور صراحة
- بعد كل جولة: tsc يمرّ، tests تمرّ، diff معروض

---

## الترتيب المقترح للتنفيذ

```
الآن  →  3-ب (B2-تكملة)     [3 وظائف، ~15 دقيقة]
ثم   →  4    (A2 + A3 + B3) [أكبر جولة، ~30 دقيقة]
ثم   →  5    (A4 + B4)      [توثيق سريع، ~5 دقائق]
ثم   →  6    (تقرير + mem)  [توثيق، ~10 دقائق]
```

**هل أبدأ بالجولة 3-ب (B2 المتبقي) فور موافقتك؟**