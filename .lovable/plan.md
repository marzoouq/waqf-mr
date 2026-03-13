

# مراجعة التزام الـ Hooks بنمط createCrudFactory والأنماط الموثقة

## نتائج المراجعة

### ✅ هوكات تستخدم createCrudFactory بشكل صحيح (7 هوكات)

| الهوك | الجدول | ملاحظات |
|-------|--------|---------|
| `useProperties` | properties | مثالي — نمط نظيف |
| `useAccounts` | accounts | ✅ + هوك مخصص `useAccountByFiscalYear` |
| `useBeneficiaries` | beneficiaries | ✅ + `onCreateSuccess` + هوكات إضافية آمنة |
| `useContracts` | contracts | ✅ + `useContractsByFiscalYear` |
| `useExpenses` | expenses | ✅ + `useExpensesByFiscalYear` |
| `useIncome` | income | ✅ + `useIncomeByFiscalYear` |
| `useInvoices` | invoices | ✅ + حذف مخصص (تنظيف Storage) — مبرر |
| `useUnits` | units | ✅ + حذف مخصص (invalidate مزدوج) — مبرر |

### ❌ هوك واحد يجب تحويله: `useBylaws`

**المشكلة**: يُنفّذ CRUD يدوياً بالكامل (query + create + update + delete) رغم أن العمليات الأساسية نمطية ويمكن تغطيتها بـ `createCrudFactory`.

**لكن**: يحتوي على `reorderBylaws` (RPC مخصص) ويُرجع كائناً مُوحّداً `{ ...query, updateBylaw, reorderBylaws, createBylaw, deleteBylaw }` — وهذا نمط مختلف عن التصدير المنفصل.

**الإصلاح المقترح**: تحويل الـ CRUD الأساسي إلى `createCrudFactory` مع الإبقاء على `reorderBylaws` كهوك مستقل. تصدير منفصل يتبع النمط الموحد.

### ✅ هوكات لا تحتاج createCrudFactory (مبرر)

| الهوك | السبب |
|-------|-------|
| `useAdvanceRequests` | منطق workflow معقد (state machine + إشعارات + atomic transitions) |
| `useSupportTickets` | pagination + server-side count + ردود + تقييم — ليس CRUD بسيط |
| `useTenantPayments` | RPC فقط (`upsert_tenant_payment`) — ليس CRUD |
| `usePaymentInvoices` | RPC متعدد + query مخصص |
| `useMessaging` | Realtime + conversations + messages — نطاق مختلف |
| `useNotifications` | Realtime + صوت + browser push — نطاق مختلف |
| `useContractAllocations` | RPC ذري |
| `useAuditLog` | query-only + pagination |
| `useAppSettings` | key-value upsert — ليس CRUD نمطي |
| `useFiscalYears` | query-only |
| `useDistribute` | mutation-only (RPC ذري) |
| Pure hooks | `useComputedFinancials`, `useRawFinancialData`, `useFinancialSummary`, `useRealtimeAlerts`, `useAccessLog` — لا تتفاعل مع CRUD |

### ⚠️ ملاحظات على الأنماط الموثقة

1. **`logger` vs `console`**: جميع الهوكات تستخدم `logger` من `@/lib/logger` — ✅ متوافق
2. **`staleTime`**: جميع الاستعلامات تحدد `staleTime` — ✅ متوافق
3. **Toast بالعربية**: جميع الرسائل بالعربية — ✅ متوافق
4. **`invalidateQueries`**: لا يوجد استخدام لـ `window.location.reload()` — ✅ متوافق
5. **حدود الاستعلام (limit)**: جميع الاستعلامات تحدد `limit` — ✅ متوافق

---

## الخطة التنفيذية

**مهمة واحدة**: إعادة كتابة `useBylaws.ts` لاستخدام `createCrudFactory` للعمليات الأساسية (list, create, update, delete) مع الإبقاء على `reorderBylaws` كهوك مستقل.

### التغييرات:
1. إنشاء factory عبر `createCrudFactory<'waqf_bylaws', BylawEntry>` مع `orderBy: 'sort_order'`, `ascending: true`
2. تصدير `useBylaws`, `useCreateBylaw`, `useUpdateBylaw`, `useDeleteBylaw` بشكل منفصل
3. إضافة `useReorderBylaws` كهوك mutation مستقل
4. تحديث المستهلكين (الصفحات التي تستخدم النمط القديم `useBylaws().createBylaw` إلى الاستيراد المنفصل)

### الملفات المتأثرة:
- `src/hooks/useBylaws.ts` — إعادة كتابة
- `src/pages/dashboard/BylawsPage.tsx` — تحديث الاستيرادات
- `src/pages/beneficiary/BylawsViewPage.tsx` — تحديث الاستيرادات (إن كان يستخدم mutations)

