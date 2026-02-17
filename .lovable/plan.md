

# إضافة فلتر السنة المالية لصفحتي العقارات والعقود

## ملخص التغييرات

### 1. إضافة هوك `useContractsByFiscalYear` في `src/hooks/useContracts.ts`
- إنشاء هوك جديد بنفس نمط `useExpensesByFiscalYear` و `useIncomeByFiscalYear`
- يفلتر العقود بحقل `fiscal_year_id` مع دعم خيار "جميع السنوات"
- يتضمن ربط العقار والوحدة (`*, property:properties(*), unit:units(*)`)

### 2. تعديل صفحة العقود `src/pages/dashboard/ContractsPage.tsx`
- استيراد `FiscalYearSelector`, `useActiveFiscalYear`, `useContractsByFiscalYear`
- إضافة state للسنة المالية المختارة (افتراضياً: السنة النشطة)
- استبدال `useContracts()` بـ `useContractsByFiscalYear(fiscalYearId)`
- وضع `FiscalYearSelector` بجانب حقل البحث في شريط الأدوات
- إضافة تحذير برتقالي عند عرض سنة مقفلة (نفس نمط صفحة الدخل)
- تحديث الإحصائيات لتعكس السنة المختارة فقط

### 3. تعديل صفحة العقارات `src/pages/dashboard/PropertiesPage.tsx`
- استيراد `FiscalYearSelector`, `useActiveFiscalYear`, `useContractsByFiscalYear`, `useExpensesByFiscalYear`
- إضافة state للسنة المالية المختارة
- استبدال `useContracts()` بـ `useContractsByFiscalYear(fiscalYearId)` لفلترة العقود في بطاقات العقارات
- استبدال `useExpenses()` بـ `useExpensesByFiscalYear(fiscalYearId)` لفلترة المصروفات
- العقارات والوحدات تبقى بدون فلترة (أصول ثابتة)
- المؤشرات المالية في كل بطاقة (الإيرادات التعاقدية، المصروفات، الصافي) تتغير حسب السنة المختارة
- وضع `FiscalYearSelector` بجانب حقل البحث

## التفاصيل التقنية

### هوك جديد (`useContracts.ts`)

```typescript
export const useContractsByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts', 'fiscal_year', fiscalYearId],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('*, property:properties(*), unit:units(*)')
        .order('start_date', { ascending: false })
        .limit(500);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
};
```

### نمط واجهة المستخدم (مطابق لصفحة الدخل)

```typescript
const { data: activeFY, fiscalYears } = useActiveFiscalYear();
const [selectedFY, setSelectedFY] = useState<string>('');
const fiscalYearId = selectedFY || activeFY?.id || 'all';
const currentFY = fiscalYears.find(fy => fy.id === fiscalYearId);
const isClosed = currentFY?.status === 'closed';

const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
```

### الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/hooks/useContracts.ts` | إضافة `useContractsByFiscalYear` |
| `src/pages/dashboard/ContractsPage.tsx` | إضافة فلتر السنة + تحذير السنة المقفلة |
| `src/pages/dashboard/PropertiesPage.tsx` | إضافة فلتر السنة للبيانات المالية |

