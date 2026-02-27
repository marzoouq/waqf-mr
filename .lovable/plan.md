
# Fix Remaining PDF Bugs in beneficiary.ts

## Summary
Out of 8 reported bugs, 6 were already fixed in previous iterations. Only 2 real issues remain, both in `src/utils/pdf/beneficiary.ts`.

---

## Fix 1: Remove duplicate "إجمالي ريع الوقف" row (BUG #3)

**File:** `src/utils/pdf/beneficiary.ts`, lines 39-40

The same row appears twice in the PDF table body. Remove the duplicate on line 40.

Before:
```text
['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],
['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],  // duplicate
```

After:
```text
['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],
```

---

## Fix 2: Add sharePercentage to PDF output (BUG #7)

**File:** `src/utils/pdf/beneficiary.ts`, line 39

Add a row showing the beneficiary's share percentage, which is passed in the data but never displayed.

Add this row after "إجمالي ريع الوقف":
```text
['نسبتي من الريع', `${data.sharePercentage}%`],
```

---

## What about AiAssistant.tsx (BUG #8)?

`VITE_SUPABASE_URL` is automatically provided by Lovable Cloud and is always defined in production. Adding a fallback would be defensive but unnecessary. Skipping this fix.

## Technical Details

- Only `src/utils/pdf/beneficiary.ts` will be modified
- Lines 39-40 will be changed (remove duplicate, add sharePercentage row)
- No other files affected
