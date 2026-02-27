

# إصلاح `r: any` في `useAdvanceRequests.ts`

## نظرة عامة
استبدال `r: any` بنوع محدد في سطرَي 99 و 123 لتفعيل فحص TypeScript على خاصية `amount`.

## التغييرات

### ملف واحد: `src/hooks/useAdvanceRequests.ts`

**سطر 99** (`usePaidAdvancesTotal`):
```text
// قبل
(data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)
// بعد
(data ?? []).reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0)
```

**سطر 123** (`useCarryforwardBalance`):
```text
// نفس التغيير بالضبط
```

