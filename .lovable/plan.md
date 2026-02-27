
# إضافة `fiscal_year_id` إلى جدول `accounts` — خطة تنفيذ نهائية

## نظرة عامة
ربط جدول `accounts` بجدول `fiscal_years` عبر مفتاح أجنبي UUID بدلاً من الاعتماد على النص فقط، مما يجعل الربط موثوقاً ولا يتأثر بتغيير تسمية السنة المالية.

---

## الخطوة 1: Database Migration

```text
ALTER TABLE accounts ADD COLUMN fiscal_year_id UUID REFERENCES fiscal_years(id);

UPDATE accounts a
SET fiscal_year_id = fy.id
FROM fiscal_years fy
WHERE TRIM(a.fiscal_year) = TRIM(fy.label);

CREATE INDEX idx_accounts_fiscal_year_id ON accounts(fiscal_year_id);
```

العمود nullable للتوافق. عمود `fiscal_year` النصي يبقى للعرض.

---

## الخطوة 2: تحديث `src/types/database.ts`

إضافة في interface `Account` (بعد سطر `fiscal_year: string;`):

```text
fiscal_year_id?: string | null;
```

---

## الخطوة 3: تحديث `src/hooks/useAccounts.ts`

تغيير `useAccountByFiscalYear` ليقبل `fiscalYearId` ويفلتر به أولاً:

```text
export const useAccountByFiscalYear = (
  fiscalYearLabel?: string,
  fiscalYearId?: string
) => {
  return useQuery({
    queryKey: ['accounts', 'fiscal_year', fiscalYearId ?? fiscalYearLabel ?? 'all'],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      } else if (fiscalYearLabel) {
        query = query.eq('fiscal_year', fiscalYearLabel);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
};
```

---

## الخطوة 4: تحديث `src/hooks/useRawFinancialData.ts`

تمرير `fiscalYearId` لـ `useAccountByFiscalYear` (سطر 15):

```text
const { data: accounts = [], ... } = useAccountByFiscalYear(fiscalYearLabel, fiscalYearId);
```

حيث `fiscalYearId` متاح بالفعل كأول معامل للهوك.

---

## الخطوة 5: تحديث `src/hooks/useComputedFinancials.ts`

### 5a. إضافة `fiscalYearId` للـ interface (سطر 16):
```text
fiscalYearId?: string;
```

### 5b. تحديث destructuring (سطر 27):
```text
fiscalYearId,
```

### 5c. تحديث منطق `currentAccount` (سطر 34-40):
```text
const currentAccount = useMemo(() => {
  if (fiscalYearId) {
    const byId = accounts.find(a => a.fiscal_year_id === fiscalYearId);
    if (byId) return byId;
  }
  if (fiscalYearLabel) {
    return accounts.find(a => a.fiscal_year === fiscalYearLabel) || null;
  }
  if (accounts.length === 1) return accounts[0];
  return null;
}, [accounts, fiscalYearId, fiscalYearLabel]);
```

---

## الخطوة 6: تحديث `src/hooks/useFinancialSummary.ts`

تمرير `fiscalYearId` لـ `useComputedFinancials` (سطر 18):

```text
const computed = useComputedFinancials({
  income, expenses, accounts, settings,
  fiscalYearLabel, fiscalYearId,
});
```

حيث `fiscalYearId` = المعامل الأول للهوك.

---

## الخطوة 7: تحديث `src/hooks/useAccountsPage.ts` (4 أماكن)

### 7a. دالة مساعدة موحدة (قبل سطر 70):
```text
const findAccount = (accts: typeof accounts, fy: typeof selectedFY) =>
  fy
    ? accts.find(a =>
        (fy.id && a.fiscal_year_id === fy.id) ||
        a.fiscal_year === fy.label
      ) ?? null
    : accts.length === 1 ? accts[0] : null;
```

### 7b. `useEffect` matchingAccount (سطر 72-73):
```text
const matchingAccount = findAccount(accounts, selectedFY);
```

### 7c. `useEffect` dependency array (سطر 88):
```text
}, [accounts, selectedFY?.id, selectedFY?.label]);
```

### 7d. `buildAccountData()` (سطر 231-246):
إضافة سطر بعد `fiscal_year`:
```text
fiscal_year_id: selectedFY?.id || null,
```

### 7e. `handleCloseYear` insert (سطر 308-315):
إضافة `fiscal_year_id: nextFYId` في الـ insert:
```text
await supabase.from('accounts').insert({
  fiscal_year: nextLabel,
  fiscal_year_id: nextFYId,
  waqf_corpus_previous: waqfCorpusManual,
  ...
});
```

### 7f. `currentAccount` (سطر 461-463):
```text
const currentAccount = findAccount(accounts, selectedFY);
```

---

## الخطوة 8: تحديث الاختبارات (3 ملفات)

إضافة `fiscal_year_id: null` في mock objects التي تستخدم `Tables<'accounts'>`:

| الملف | الموقع |
|---|---|
| `src/hooks/useComputedFinancials.test.ts` | `mkAccount` (سطر 27-46) |
| `src/test/financialIntegration.test.ts` | `mkAccount` (سطر 25-44) |
| `src/hooks/useAccounts.test.ts` | `sampleAccount` (سطر 38-56) |

الملفات الأخرى لا تحتاج تحديثاً (interfaces محلية أو mocks كاملة).

---

## الخطوة 9: تحديث `docs/DATABASE.md`

إضافة سطر بعد `fiscal_year` في قسم جدول accounts (سطر 279):
```text
| `fiscal_year_id` | UUID | مفتاح أجنبي لجدول السنوات المالية |
```

---

## ترتيب التنفيذ
1. Migration (إضافة العمود + ربط البيانات + index)
2. `types/database.ts` (إضافة الحقل)
3. `useAccounts.ts` (تحديث الهوك + queryKey)
4. `useRawFinancialData.ts` (تمرير fiscalYearId)
5. `useComputedFinancials.ts` (إضافة fiscalYearId للمنطق)
6. `useFinancialSummary.ts` (تمرير fiscalYearId)
7. `useAccountsPage.ts` (findAccount + buildAccountData + handleCloseYear + dependency array)
8. الاختبارات (3 ملفات)
9. `docs/DATABASE.md`

## ملاحظات مهمة
- لا يُستخدم `as any` في أي مكان
- `supabase/types.ts` يُحدَّث تلقائياً بعد الـ migration
- عمود `fiscal_year` النصي يبقى للتوافق وللعرض
- كل المطابقات تستخدم `fiscal_year_id` أولاً مع fallback للنص
- دالة `findAccount` موحدة تمنع التناقض بين السطرين 72 و 461
- dependency array محدّثة لتشمل `selectedFY?.id`
