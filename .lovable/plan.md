

# خطة إضافة اختبارات للـ Hooks المتبقية

## الملفات المستهدفة (5 ملفات جديدة)

### 1. `src/hooks/useAuditLog.test.ts` (~7 اختبارات)
يختبر:
- `getTableNameAr`: ترجمة أسماء الجداول المعروفة + إرجاع الاسم الأصلي للمجهولة
- `getOperationNameAr`: ترجمة العمليات (INSERT/UPDATE/DELETE) + إرجاع الأصلي للمجهولة
- `useAuditLog`: يرندر بدون خطأ، يمرر الفلاتر (tableName, operation, searchQuery)، يحسب pagination صحيح (`from/to`)
- تنظيف searchQuery: يزيل الأحرف الخاصة `%_\\(),.*`

### 2. `src/hooks/useRealtimeAlerts.test.ts` (~5 اختبارات)
يختبر:
- لا يُشترك إذا لم يوجد user
- لا يُشترك إذا كان الدور `beneficiary`
- يُشترك عند `admin` ويسجّل القناة
- يُشترك عند `accountant`
- يُنظّف القناة عند unmount (`removeChannel`)

**النمط**: موك لـ `supabase.channel()` يرجع كائن سلسلة `.on().subscribe()` + موك `useAuth`

### 3. `src/hooks/useSupportTickets.test.ts` (~8 اختبارات)
يختبر:
- `useSupportTickets`: يجلب البيانات، يفلتر بالحالة، يحسب pagination
- `useTicketReplies`: معطّل بدون ticketId
- `useCreateTicket`: يستدعي insert + invalidates cache
- `useUpdateTicketStatus`: يضيف `resolved_at` عند حالة resolved/closed
- `useAddTicketReply`: يستدعي insert مع sender_id
- `useRateTicket`: يرندر بدون خطأ
- `useClientErrors`: يفلتر بـ `event_type = 'client_error'`

### 4. `src/hooks/useAccessLog.test.ts` (~3 اختبارات)
يختبر:
- `logAccessEvent`: يستدعي `supabase.rpc('log_access_event')` بالبارامترات الصحيحة
- يمرر `navigator.userAgent` مقطوعاً إلى 500 حرف
- لا يرمي خطأ عند فشل RPC (silent fail)

### 5. `src/hooks/usePdfWaqfInfo.test.ts` (~3 اختبارات)
يختبر:
- يرجع كائن فارغ عند عدم وجود بيانات
- يبني `deedNumber` و `court` بالصيغة الصحيحة عند وجود بيانات
- يمرر `vatNumber` و `logoUrl` من الإعدادات

## النمط المتبع
- `vi.mock` لـ `supabase`, `sonner`, `AuthContext`
- `QueryClient` معزول لكل اختبار مع `retry: false`
- التحقق من نجاح الرندرة (`not.toBeNull()`) بدلاً من البحث عن نصوص عربية
- `vi.clearAllMocks()` في `beforeEach`

## الإجمالي
```text
ملفات جديدة:     5
اختبارات جديدة:  ~26
```

