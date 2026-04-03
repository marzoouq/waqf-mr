

# خطة تحديث ملف barrel لـ hooks/data

## المشكلة
بعد مقارنة الملفات الفعلية في كل مجلد مع ملفات `index.ts`، وُجد أن **3 ملفات** في `hooks/data/` غير مُصدَّرة من الـ barrel. المجلدات الأخرى (`auth`, `financial`, `page`, `ui`) مكتملة.

## الملفات المفقودة من `src/hooks/data/index.ts`

| الملف | التصديرات المطلوبة |
|---|---|
| `useBylaws.ts` | `BylawEntry`, `useBylawsList`, `useCreateBylaw`, `useUpdateBylaw`, `useDeleteBylaw` |
| `usePushNotifications.ts` | `usePushNotifications` |
| `useSupportTicketMutations.ts` | `useCreateTicket`, `useAddTicketReply`, `useCloseTicket`, `useAssignTicket` (يحتاج تأكيد التصديرات) |

## خطة التنفيذ

1. **قراءة التصديرات الكاملة** من `useBylaws.ts` و `useSupportTicketMutations.ts`
2. **إضافة 3 أسطر** إلى `src/hooks/data/index.ts` بالتصديرات المفقودة
3. **تحقق نهائي** بـ `npx tsc --noEmit`

