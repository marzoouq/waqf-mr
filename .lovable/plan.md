

# إضافة حماية `.flat()` في `useNotifications`

## التغيير
ملف واحد: `src/hooks/data/useNotifications.ts` سطر 204

استبدال:
```ts
() => infiniteQuery.data?.pages.flat() || [],
```
بـ:
```ts
() => (infiniteQuery.data?.pages ?? []).flat(),
```

هذا يمنع خطأ `Cannot read properties of undefined (reading 'flat')` في حالة كون `pages` غير معرّف مؤقتاً أثناء التحميل.

