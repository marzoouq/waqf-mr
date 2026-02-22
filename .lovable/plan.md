
# تطبيق إصلاح تمرير التوكن على باقي استدعاءات الوظائف الخلفية

## الملفات المطلوب تعديلها

### 1. `src/pages/dashboard/BeneficiariesPage.tsx` (سطر 39)
اضافة جلب الجلسة وتمرير التوكن صراحة:

```typescript
queryFn: async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('admin-manage-users', {
    body: { action: 'list_users' },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  // باقي الكود كما هو
```

### 2. `src/hooks/useInvoices.ts` (سطر 172)
اضافة جلب الجلسة وتمرير التوكن صراحة:

```typescript
mutationFn: async (invoiceIds: string[]) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
    body: { invoice_ids: invoiceIds },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  // باقي الكود كما هو
```

## ملخص
تعديلان بسيطان بنفس النمط الذي طُبق على `UserManagementPage.tsx`. باقي الاستدعاءات (`Auth.tsx` و `AuthContext.tsx`) لا تحتاج تعديل لانها تعمل قبل تسجيل الدخول حسب التصميم.
