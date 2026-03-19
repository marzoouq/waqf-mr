

## خطة التنفيذ النهائية (مع التوصيات والتحذيرات المُدمجة)

### 1. ملف جديد: `src/hooks/useBfcacheSafeChannel.ts`
- `subscribeFnRef` (ref ثابت) لمنع إعادة إنشاء القناة عند تغيّر function reference
- `useCallback` لـ `initChannel` مع dependency على `channelName` فقط
- `pagehide` → فصل WebSocket (يسمح بـ bfcache)
- `pageshow` (persisted) → إعادة إنشاء القناة
- cleanup في `useEffect return` لمنع Memory Leak
- معامل `enabled` لتعطيل القناة عند عدم الحاجة

### 2. تحديث 4 ملفات Realtime

| الملف | التغيير | أسماء القنوات (فريدة — التوصية) |
|-------|---------|-------------------------------|
| `useRealtimeAlerts.ts` | استبدال useEffect + subscribedRef بـ `useBfcacheSafeChannel` | `admin-realtime-alerts-{userId}` |
| `useNotifications.ts` (سطر 251-294) | استبدال useEffect بـ `useBfcacheSafeChannel` | `notifications-{userId}` |
| `useMessaging.ts` (سطر 31-41) | conversations channel | `chat-conv-{userId}-{type}` |
| `useMessaging.ts` (سطر 70-79) | messages channel | `chat-msg-{conversationId}` |
| `BeneficiaryDashboard.tsx` (سطر 122-141) | distributions channel | `beneficiary-dist-{beneficiaryId}` |

### 3. إضافة `id` + `name` + `aria-label` للحقول

| الملف | الحقول |
|-------|--------|
| `IncomePage.tsx` (سطر 207-214, 298) | `id="income-source"` `id="income-amount"` `id="income-date"` `id="income-notes"` + بحث: `aria-label="بحث"` |
| `ExpensesPage.tsx` (سطر 210) | `id="expenses-search" aria-label="بحث"` |
| `PropertiesPage.tsx` (سطر 209-213, 234) | `id="property-number"` ... + `aria-label="بحث"` |
| `BeneficiariesPage.tsx` (سطر 224) | `id="beneficiaries-search" aria-label="بحث"` |
| `BylawsPage.tsx` (سطر 353, 414-504) | Add: `id="bylaw-part-number"` ... Edit: `id="edit-bylaw-part-number"` (prefix `edit-`) + `aria-label="بحث"` |
| `SupportDashboardPage.tsx` (سطر 365) | `id="ticket-title" name="ticket-title"` |

- حقول البحث: `aria-label="بحث"` بدون label مرئي (لا يوجد label فارغ يحتاج إزالة)
- حقول Edit في BylawsPage: prefix `edit-` لضمان فرادة ID في DOM
- ربط `<label>` بـ `htmlFor` حيثما يوجد label عنصر

### الملفات المعدّلة (11 ملف)
`useBfcacheSafeChannel.ts` (جديد) · `useRealtimeAlerts.ts` · `useNotifications.ts` · `useMessaging.ts` · `BeneficiaryDashboard.tsx` · `IncomePage.tsx` · `ExpensesPage.tsx` · `PropertiesPage.tsx` · `BeneficiariesPage.tsx` · `BylawsPage.tsx` · `SupportDashboardPage.tsx`

