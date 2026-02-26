

# خطة إصلاح أخطاء البناء

## المشكلة الأولى: `src/lib/logger.ts` — محتوى مكرر ومشوه

الملف يحتوي على نسختين من الكود ملتصقتين ببعضهما. السطور 1-13 هي النسخة الأولى الكاملة، ثم السطور 14-27 هي نسخة ثانية تبدأ بتعليق `*` بدون فتح `/**`، مما يسبب خطأ `Unexpected "*"` عند البناء.

**الإصلاح:** حذف المحتوى المكرر (السطور 14-27) والإبقاء على النسخة الأولى فقط.

---

## المشكلة الثانية: `supabase/functions/admin-manage-users/index.ts` — `.catch()` على `PostgrestFilterBuilder`

في السطرين 289 و364، يتم استدعاء `.catch(() => {})` على نتيجة `adminClient.rpc('notify_admins', ...)`. المشكلة أن `rpc()` يُرجع `PostgrestFilterBuilder` وليس `Promise` مباشرة، لذا لا تملك خاصية `.catch`.

**الإصلاح:** تحويل الاستدعاءين لاستخدام `try/catch` مع `await` بدلا من `.catch()`:
```typescript
try { await adminClient.rpc('notify_admins', {...}); } catch {}
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/logger.ts` | حذف السطور 14-27 (المحتوى المكرر) |
| `supabase/functions/admin-manage-users/index.ts` | إصلاح `.catch()` في السطرين 289 و 364 |

