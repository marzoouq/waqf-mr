

# إصلاح المشاكل المكتشفة في تقرير الفحص الشامل

## نظرة عامة
إصلاح 5 مشاكل حقيقية قابلة للتنفيذ. بند `.env` ليس مشكلة لأن الملف يُدار تلقائياً بواسطة Lovable Cloud ولا يجب تعديله أو إضافته لـ `.gitignore`.

---

## الخطوة 1: استبدال `console.error` بـ `logger` في `useWebAuthn.ts`

3 أماكن تستخدم `console.error` المباشر بدلاً من `logger` الآمن:

- **سطر 28**: `console.error('Failed to fetch credentials:', error.message)` → `logger.error('Failed to fetch credentials:', error.message)`
- **سطر 53**: `console.error('WebAuthn register-options error:', optErr, options)` → `logger.error('WebAuthn register-options error:', optErr)`
- **سطر 60**: `console.error('WebAuthn register-options server error:', options.error)` → `logger.error('WebAuthn register-options server error')`
- **سطر 87**: `console.error('WebAuthn registration error:', err)` → `logger.error('WebAuthn registration error:', err)`

اضافة `import { logger } from '@/lib/logger'` في أعلى الملف.

---

## الخطوة 2: إضافة `.limit()` في `useFiscalYears.ts`

سطر 24: إضافة `.limit(50)` بعد `.order(...)` — للتوافق مع نمط باقي الـ hooks.

---

## الخطوة 3: إضافة `staleTime` في `useUnits.ts`

سطر 43-44: إضافة `staleTime: 60_000` في `useUnits` query — للتوافق مع باقي الـ hooks المالية.

---

## الخطوة 4: لف الحسابات الوسيطة بـ `useMemo` في `useComputedFinancials.ts`

سطر 48-62: لف `adminPct`, `waqifPct`, `zakatAmount`, `vatAmount`, `waqfCorpusPrevious`, `waqfCorpusManual`, `distributionsAmount` داخل `useMemo` واحد يعتمد على `[settings, currentAccount]`.

```text
const derivedValues = useMemo(() => {
  const adminPctRaw = settings?.admin_share_percentage ? parseFloat(settings.admin_share_percentage) : NaN;
  const adminPct = Number.isFinite(adminPctRaw) ? adminPctRaw : 10;
  const waqifPctRaw = settings?.waqif_share_percentage ? parseFloat(settings.waqif_share_percentage) : NaN;
  const waqifPct = Number.isFinite(waqifPctRaw) ? waqifPctRaw : 5;
  const zakatAmount = currentAccount ? Number(currentAccount.zakat_amount || 0) : 0;
  const vatAmount = currentAccount ? Number(currentAccount.vat_amount || 0) : 0;
  const waqfCorpusPrevious = currentAccount ? Number(currentAccount.waqf_corpus_previous || 0) : 0;
  const waqfCorpusManual = currentAccount ? Number(currentAccount.waqf_corpus_manual || 0) : 0;
  const distributionsAmount = currentAccount ? Number(currentAccount.distributions_amount || 0) : 0;
  return { adminPct, waqifPct, zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount };
}, [settings, currentAccount]);
```

---

## الخطوة 5: إضافة تحذير `logger.warn` في `useActiveFiscalYear`

عندما لا توجد سنة `active` ويتم الـ fallback لأول سنة:

```text
const active = fiscalYears.find((fy) => fy.status === 'active');
if (!active && fiscalYears.length > 0) {
  logger.warn('No active fiscal year found, falling back to first available');
}
return { data: active || fiscalYears[0] || null, fiscalYears, ...rest };
```

---

## ملاحظة: بنود مستبعدة

- **`.env` في `.gitignore`**: الملف يُدار تلقائياً بواسطة Lovable Cloud — لا يجب تعديله.
- **`as never` في `useCrudFactory.ts`**: مطلوب بسبب قيود Supabase generic types مع factory pattern — إزالته تُسبب أخطاء TypeScript. الحل البديل `as Tables[T]['Insert']` لا يعمل بسبب variance issues.
- **`as any` في `useDistribute.ts`**: مبرر ومُوثّق بتعليق — Supabase RPC يقبل `jsonb` ولا يمكن تنميطه.

---

## الملفات المتأثرة
1. `src/hooks/useWebAuthn.ts` (خطوة 1)
2. `src/hooks/useFiscalYears.ts` (خطوات 2 + 5)
3. `src/hooks/useUnits.ts` (خطوة 3)
4. `src/hooks/useComputedFinancials.ts` (خطوة 4)

