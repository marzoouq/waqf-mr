

# تحليل التعارضات وخطة التنفيذ

## نتائج فحص التعارضات

### ✅ لا توجد تعارضات — آمن للتنفيذ

| الملف المقترح | الحالة | ملاحظة |
|--------------|--------|--------|
| `src/hooks/useAdvanceRequests.test.ts` | **جديد** | لا يوجد ملف اختبار سابق |
| `src/hooks/usePaymentInvoices.test.ts` | **جديد** | لا يوجد ملف اختبار سابق |
| `src/hooks/useMessaging.test.ts` | **جديد** | لا يوجد ملف اختبار سابق |
| `src/components/accounts/CloseYearDialog.test.tsx` | **جديد** | لا يوجد ملف اختبار سابق |
| `src/components/accounts/AccountsSummaryCards.test.tsx` | **موجود — توسيع** | 6 اختبارات موجودة، سنضيف 3 اختبارات لـ `isClosed`, `usingFallbackPct`, `netAfterZakat` |
| `src/components/accounts/AccountsSettingsBar.test.tsx` | **موجود — توسيع** | 4 اختبارات موجودة، سنضيف 2 اختبار للزكاة ورقبة الوقف |

### الموك الموجود في ملفات أخرى (لا تعارض)

الملفات التالية تستخدم `vi.mock` للـ hooks المطلوبة كتبعيات، وليست اختبارات مباشرة لها:
- `CarryforwardHistoryPage.test.tsx` → يموك `useAdvanceRequests`
- `MySharePage.test.tsx` → يموك `useAdvanceRequests`
- `AdminDashboard.test.tsx` → يموك `usePaymentInvoices`
- `MessagesPage.test.tsx` → يموك `useMessaging`

هذه لا تتعارض لأن الاختبارات الجديدة ستختبر الـ hooks مباشرة بموك لـ `supabase`.

---

## خطة التنفيذ

### 1. `useAdvanceRequests.test.ts` (~9 اختبارات)
- موك `supabase` بـ `vi.hoisted` (سلسلة `.from().select().eq().order().limit()`)
- موك `sonner` و `@/utils/notifications`
- `useAdvanceRequests`: يرجع بيانات، يفلتر بـ `fiscalYearId`
- `useMyAdvanceRequests`: معطّل بدون `beneficiaryId`
- `usePaidAdvancesTotal`: يحسب المجموع، يرجع 0 بدون ID
- `useCarryforwardBalance`: يحسب المرحّلات النشطة
- `useCreateAdvanceRequest`: يستدعي insert
- `useUpdateAdvanceStatus`: يرفض حالات غير صالحة

### 2. `usePaymentInvoices.test.ts` (~7 اختبارات)
- `usePaymentInvoices`: يجلب بالسنة، معطّل عند `__none__`
- `useGenerateContractInvoices`: يستدعي RPC
- `useGenerateAllInvoices`: يستدعي RPC
- `useMarkInvoicePaid`: يستدعي RPC ويبطل كاش متعدد
- `useMarkInvoiceUnpaid`: يستدعي RPC

### 3. `useMessaging.test.ts` (~7 اختبارات)
- موك `AuthContext` و `supabase` (بما فيها `channel` و `removeChannel`)
- `useConversations`: معطّل بدون user
- `useMessages`: معطّل بدون conversationId، يعكس الترتيب
- `useSendMessage`: يرفض الرسائل الفارغة والطويلة (>5000)
- `useCreateConversation`: يرندر بدون خطأ

### 4. `CloseYearDialog.test.tsx` (~6 اختبارات)
- عرض العنوان والأزرار
- عرض الملخص المالي عند `totalIncome > 0`
- إخفاء الملخص عند `totalIncome=0` و `totalExpenses=0`
- عرض "جاري الإقفال" عند `isClosing=true`
- عرض السنة ورقبة الوقف
- استدعاء `onConfirm`

### 5. توسيع `AccountsSummaryCards.test.tsx` (+3 اختبارات)
- تنبيه "أرقام تقديرية" عندما `isClosed=false` (الافتراضي)
- إخفاء التنبيه عندما `isClosed=true`
- تنبيه النسب الافتراضية عند `usingFallbackPct=true`

### 6. توسيع `AccountsSettingsBar.test.tsx` (+2 اختبار)
- عرض حقل الزكاة
- عرض حقل رقبة الوقف

### الإجمالي المتوقع
```text
اختبارات جديدة:  ~34 اختبار
ملفات جديدة:     4 ملفات
ملفات محدّثة:     2 ملفين
إجمالي بعد:      ~591+ اختبار
```

