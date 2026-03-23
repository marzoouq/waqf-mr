

# تنفيذ التوصيات الثلاث المتبقية

---

## التوصية 1: إضافة Rate Limiting لوظائف ZATCA الثلاث

### zatca-api/index.ts (سطر ~255، بعد فحص admin role)
إضافة فحص rate limit باستخدام `check_rate_limit` RPC:
```
const { data: isLimited } = await admin.rpc('check_rate_limit', {
  p_key: `zatca-api:${user.id}`, p_limit: 30, p_window_seconds: 60
});
if (isLimited) return 429 "تم تجاوز الحد المسموح"
```

### zatca-signer/index.ts (سطر ~532، بعد فحص roles)
```
const { data: isLimited } = await admin.rpc('check_rate_limit', {
  p_key: `zatca-signer:${user.id}`, p_limit: 20, p_window_seconds: 60
});
if (isLimited) return 429
```

### zatca-xml-generator/index.ts (سطر ~444، بعد فحص roles)
```
const { data: isLimited } = await admin.rpc('check_rate_limit', {
  p_key: `zatca-xml:${user.id}`, p_limit: 30, p_window_seconds: 60
});
if (isLimited) return 429
```

---

## التوصية 2: تنظيف سطر paramsRef الزائد

### useAccountsActions.ts (سطر 49)
حذف السطر `paramsRef.current = params;` لأنه يُستبدل فوراً في `useAccountsPage.ts` سطور 70-85.

---

## التوصية 3: لف commercialRent و calculatedVat بـ useMemo

### useAccountsCalculations.ts (سطور 48-54)
تحويل:
```typescript
const commercialRent = contracts.filter(...).reduce(...);
const calculatedVat = commercialRent * (vatPercentage / 100);
```
إلى:
```typescript
const commercialRent = useMemo(() => contracts.filter(...).reduce(...), [contracts, isCommercialContract, allocationMap]);
const calculatedVat = useMemo(() => commercialRent * (vatPercentage / 100), [commercialRent, vatPercentage]);
```

وكذلك `totalAnnualRent` (سطر 66-69) و `totalPaymentPerPeriod` (سطر 91):
```typescript
const totalAnnualRent = useMemo(() => contracts.reduce(...), [contracts, allocationMap]);
const totalPaymentPerPeriod = useMemo(() => contracts.reduce(...), [contracts, getPaymentPerPeriod]);
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/zatca-api/index.ts` | إضافة 5 أسطر rate limiting |
| `supabase/functions/zatca-signer/index.ts` | إضافة 5 أسطر rate limiting |
| `supabase/functions/zatca-xml-generator/index.ts` | إضافة 5 أسطر rate limiting |
| `src/hooks/useAccountsActions.ts` | حذف سطر 49 |
| `src/hooks/useAccountsCalculations.ts` | لف 4 حسابات بـ useMemo |

