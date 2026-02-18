

# خطة إصلاح تحذيرات وحدة التحكم (Console Warnings)

## المشكلتان المكتشفتان

### 1. تحذير WebSocket: "WebSocket is closed before the connection is established"
- **المصدر:** مكتبة Supabase Realtime الداخلية
- **السبب:** عند تنظيف useEffect (cleanup)، يتم استدعاء `supabase.removeChannel(channel)` قبل اكتمال اتصال WebSocket، مما يولّد هذا التحذير المتكرر
- **الملفات المتأثرة:**
  - `src/hooks/useNotifications.ts` (سطر 86)
  - `src/hooks/useMessaging.ts` (سطر 34 و 68)
- **الإصلاح:** التحقق من حالة الاشتراك قبل محاولة إزالة القناة، مع إضافة تأخير بسيط لمنع سباق الأحداث (race condition)

### 2. تحذير الوصولية: "Missing Description or aria-describedby for DialogContent"
- **المصدر:** مكتبة Radix UI Dialog
- **السبب:** بعض نوافذ الحوار تحتوي على `DialogContent` بدون `DialogDescription`
- **الملفات المتأثرة:**
  - `src/components/WaqfInfoBar.tsx` (سطر 202) - حوار تعديل بيانات الوقف بدون DialogDescription
  - `src/components/ui/command.tsx` (سطر 29) - CommandDialog بدون DialogDescription
- **الإصلاح:** إضافة `DialogDescription` مخفي بـ `sr-only` لكل حوار ناقص

---

## التفاصيل الفنية

### إصلاح WebSocket (3 ملفات)

في كل من `useNotifications.ts` و `useMessaging.ts`، سيتم تغيير دالة التنظيف من:
```typescript
return () => { supabase.removeChannel(channel); };
```
إلى:
```typescript
return () => {
  channel.unsubscribe().then(() => {
    supabase.removeChannel(channel);
  });
};
```

هذا يضمن إلغاء الاشتراك أولاً بشكل آمن قبل إزالة القناة، مما يمنع محاولة إغلاق WebSocket غير مكتمل الاتصال.

### إصلاح DialogDescription (2 ملف)

**WaqfInfoBar.tsx:** إضافة `DialogDescription` بعد `DialogTitle`:
```tsx
<DialogDescription className="sr-only">نموذج تعديل بيانات الوقف</DialogDescription>
```

**command.tsx:** إضافة `DialogDescription` داخل `DialogContent`:
```tsx
<DialogDescription className="sr-only">نافذة البحث والأوامر</DialogDescription>
```

---

## الملخص

| المشكلة | النوع | الملفات | الأثر |
|---------|-------|---------|-------|
| WebSocket disconnect warning | تحذير متكرر في Console | 2 ملفات (3 مواقع) | تشويش على سجل التحكم |
| Missing DialogDescription | تحذير وصولية | 2 ملفات | عدم توافق مع WCAG |

**لا توجد تغييرات على قاعدة البيانات أو منطق العمل.**

