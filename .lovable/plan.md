## نتيجة المراجعة: الإصلاحات الثلاثة المطلوبة

فحصت الكود الفعلي للبنود الثلاثة. الواقع مختلف عما ادّعى التدقيق السابق:

### 1) EmailMonitorPage — حقيقي ويحتاج توثيق فقط

**الواقع:** الصفحة موجودة، مستخدمة، محمية بـ `ADMIN_ONLY` في `adminRoutes.tsx:55`، ومُختبَرة في `dashboardRoutesContract.test.ts` و `adminSectionsVisibility.test.ts`. تحوي تعليقاً مختصراً `(admin only)` فقط دون مبرّر.

**الإجراء:** توسيع التعليق العلوي ليوثّق صراحةً سبب التقييد:
- يعرض `recipient_email` (PII)
- يعرض `error_message` (تفاصيل تشخيصية حساسة)
- يفتح أزرار retry/DLQ على بنية البريد (impact على المستلمين)

**ملف واحد، تعديل JSDoc فقط:** `src/pages/dashboard/EmailMonitorPage.tsx`

### 2) F-C2 / PII raw table — لا توجد ثغرة فعلية

فحصت كل استعلامات `from('beneficiaries')` و `from('contracts')` في `src/hooks/` و `src/lib/`:

| المُستهلِك | الأعمدة المختارة | حالة الأمان |
|---|---|---|
| `searchService.ts` admin | CONTRACT_FIELDS (5 حقول، بدون PII) | آمن — والمتغير غير-admin يستخدم `contracts_safe` بالفعل |
| `useContracts.ts` | tenant_id_number, tenant_tax_number… | RLS على `contracts` تمنع beneficiary/waqif كلياً (`Admin and accountant can view contracts`) |
| `useContractsForPdf.ts` | contract_number, tenant_name فقط | نفس RLS فوق |
| `useDashboardSummary.ts` | tenant_name فقط | نفس RLS |
| `dataFetcher.ts` beneficiaries | id,name,email,phone,share_percentage,notes — **بدون** national_id/bank_account | لا PII حساس |
| `advanceService.ts` | user_id فقط | لا PII |
| `useUserManagementData.ts` | id,name,email,user_id | لا national_id/bank_account |

**الخلاصة:** الـ `_safe` views موجودة (`beneficiaries_safe`, `contracts_safe`) وتُستعمل حيث تلزم. الجداول الخام محميّة بـ RLS تمنع الأدوار غير المُمتازة من قراءتها أصلاً. **لا حاجة لأي تغيير** — التدقيق السابق كان بناءً على افتراض خاطئ.

**الإجراء:** توثيق الحقيقة في ذاكرة الأمان لمنع تكرار نفس التنبيه الكاذب.

### 3) cacheKey في generateZatcaXml.ts / xmlBuilder.ts — الملفات غير موجودة

```
$ ls src/utils/zatca/
validateZatcaForm.ts  zatcaQr.test.ts  zatcaQr.ts
```

لا يوجد `generateZatcaXml.ts` ولا `xmlBuilder.ts`. الـ ZATCA XML يُولَّد في Edge Function أو في مكان آخر لا يحوي `cacheKey`. الـ `cacheKey` الوحيد في المشروع كله موجود في `supabase/functions/ai-assistant/index.ts` ولا علاقة له بـ ZATCA.

**الخلاصة:** البند مبني على ملفات وهمية. **لا إصلاح ممكن** — لا يوجد ما يُصلَح.

**الإجراء:** لا تغييرات. تأكيد للمستخدم.

---

## خطة التنفيذ (دقيقة واحدة)

**ملفان فقط للتعديل:**

1. **`src/pages/dashboard/EmailMonitorPage.tsx`** — توسيع JSDoc بشرح أسباب `ADMIN_ONLY` (3-4 أسطر)

2. **`security/security-memory`** عبر `update_memory` — تسجيل أن:
   - `beneficiaries_safe` و `contracts_safe` تُستخدم في الصفحات العامة، والجداول الخام محمية بـ RLS صارمة
   - EmailMonitorPage admin-only مقصود بسبب عرض PII البريد
   - لا تُنشأ تنبيهات `raw PII table query` على هذه الـ hooks لأن RLS يحميها

**ما لن أفعله:**
- لن أُنشئ ملفات zatca وهمية
- لن أُحوّل استعلامات الـ hooks الإدارية إلى `contracts_safe` (سيُكسر الـ join مع unit/property ولا يضيف أماناً)
- لن أُعدّل أي منطق إنتاجي

عند الموافقة، أُنفّذ التعديلين وأنتهي.