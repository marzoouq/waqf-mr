

# خطة إصلاح التقرير الجنائي العاشر — 7 تغييرات في 5 ملفات

## الإصلاحات

### 1. إصلاح `handleRetry` queryKeys في 4 صفحات

**`CarryforwardHistoryPage.tsx`** سطور 23-28:
```ts
queryClient.invalidateQueries({ queryKey: ['advance_carryforward'] });
queryClient.invalidateQueries({ queryKey: ['advance_requests'] });
queryClient.invalidateQueries({ queryKey: ['my-beneficiary'] });
```

**`DisclosurePage.tsx`** سطور 41-45:
```ts
queryClient.invalidateQueries({ queryKey: ['income'] });
queryClient.invalidateQueries({ queryKey: ['expenses'] });
queryClient.invalidateQueries({ queryKey: ['accounts'] });
queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
queryClient.invalidateQueries({ queryKey: ['total-beneficiary-percentage'] });
```

**`MySharePage.tsx`** سطور 32-36: نفس queryKeys كـ DisclosurePage

**`BeneficiaryDashboard.tsx`** سطور 26-30:
```ts
queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
queryClient.invalidateQueries({ queryKey: ['income'] });
queryClient.invalidateQueries({ queryKey: ['expenses'] });
queryClient.invalidateQueries({ queryKey: ['accounts'] });
queryClient.invalidateQueries({ queryKey: ['my-distributions-recent'] });
```

### 2. `Number()` → `safeNumber()` في MySharePage سطور 107 و 111
استبدال `Number(d.amount)` بـ `safeNumber(d.amount)` — import `safeNumber` موجود أصلاً أو يُضاف.

### 3. إصلاح `toGregorianShort` timezone في DisclosurePage سطور 26-37
استبدال `new Date()` بتقسيم النص:
```ts
function toGregorianShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${Number(parts[2])}/${Number(parts[1])}/${parts[0]}`;
  } catch { return dateStr; }
}
```

### 4. `beneficiaries` → `beneficiaries_safe` في useAdvanceRequests سطر 198
تغيير `.from('beneficiaries')` إلى `.from('beneficiaries_safe')` لضمان عمل الإشعار مع RLS المستفيد.

### 5. إضافة `toast.error` في useBeneficiariesSafe عند 42501 (سطر 82-83)
إبقاء `return []` لمنع crash، لكن إضافة toast ليعلم المستفيد:
```ts
toast.error('تعذر تحميل بيانات المستفيدين — يرجى تسجيل الخروج وإعادة الدخول');
return [];
```

