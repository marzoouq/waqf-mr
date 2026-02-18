

# خطة استبدال استعلامات المستفيدين بـ beneficiaries_safe

## الهدف
ضمان أن واجهات المستفيدين تستعلم من العرض الآمن `beneficiaries_safe` بدلاً من جدول `beneficiaries` مباشرة، لتطبيق إخفاء البيانات الحساسية (رقم الهوية، الحساب البنكي، البريد، الهاتف) على مستوى الخادم.

## نطاق التغيير

### الملفات المتأثرة (واجهات المستفيدين فقط)
- `src/hooks/useBeneficiaries.ts` — إضافة هوك `useBeneficiariesSafe` جديد
- `src/hooks/useFinancialSummary.ts` — استبدال `useBeneficiaries` بـ `useBeneficiariesSafe`
- `src/pages/beneficiary/BeneficiaryDashboard.tsx` — استبدال الاستيراد المباشر

### الملفات التي لن تتأثر (واجهات الناظر)
صفحات الأدمن (`AccountsPage`, `BeneficiariesPage`, `MessagesPage`) ستبقى تستعلم من `beneficiaries` مباشرة لأن الناظر يحتاج البيانات الكاملة.

## التفاصيل التقنية

### 1. إنشاء هوك `useBeneficiariesSafe`
إضافة هوك جديد في `src/hooks/useBeneficiaries.ts` يستعلم من `beneficiaries_safe` مباشرة باستخدام Supabase client (بدون `useCrudFactory` لأن العرض للقراءة فقط):

```typescript
export const useBeneficiariesSafe = () => {
  return useQuery({
    queryKey: ['beneficiaries-safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('*')
        .order('name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
};
```

### 2. تحديث `useFinancialSummary`
استبدال `useBeneficiaries()` بـ `useBeneficiariesSafe()` — هذا يغطي تلقائياً:
- `MySharePage`
- `DisclosurePage`
- `FinancialReportsPage`
- `AccountsViewPage`

### 3. تحديث `BeneficiaryDashboard`
استبدال `useBeneficiaries` بـ `useBeneficiariesSafe` في الاستيراد والاستخدام المباشر.

### 4. تحديث الاختبارات
تحديث ملفات الاختبار المرتبطة لتتوافق مع الهوك الجديد:
- `src/pages/beneficiary/BeneficiaryDashboard.test.tsx`
- `src/pages/beneficiary/MySharePage.test.tsx`
- `src/pages/beneficiary/DisclosurePage.test.tsx`

## النتيجة
- المستفيد يرى بياناته فقط عبر العرض الآمن (البيانات الحساسة مخفية تلقائياً من الخادم)
- الناظر يستمر في الوصول الكامل عبر جدول `beneficiaries` الأصلي
- لا تأثير على عمليات CRUD الخاصة بالناظر

