

# خطة إصلاح البنود الثلاثة المؤكدة

تم التحقق الجنائي من كل بند مقابل الكود الفعلي. النتائج:

---

## نتائج التحقق

| البند | الحكم | الدليل |
|-------|-------|--------|
| `main.tsx` سطر 11 — `VITE_BUILD_TIME` غائب، `Date.now()` يُستخدم دائماً | **مؤكدة** | `VITE_BUILD_TIME` لا يظهر في أي ملف آخر غير `main.tsx` — لا في `vite.config.ts` ولا في `.env` |
| `useAppSettings.ts` سطر 34-37 — `.update()` بدلاً من `.upsert()` | **مؤكدة** | `.update({ value, updated_at }).eq('key', key)` — إعداد غير موجود = 0 rows بصمت |
| `useBylaws.ts` سطر 21-32 — بدون `staleTime` | **مؤكدة** | لا `staleTime` في `useQuery` — يُعيد الجلب عند كل window focus |

---

## الإصلاحات المطلوبة

### 1. `vite.config.ts` — تثبيت `VITE_BUILD_TIME` وقت البناء

اضافة `define` داخل `defineConfig` لتعيين `VITE_BUILD_TIME` بقيمة ثابتة وقت الـ build:

```typescript
define: {
  'import.meta.env.VITE_BUILD_TIME': JSON.stringify(Date.now().toString()),
},
```

هذا يجعل القيمة ثابتة لكل build بدلاً من تغييرها عند كل تحميل صفحة.

### 2. `src/hooks/useAppSettings.ts` — تغيير `.update()` إلى `.upsert()`

استبدال:
```typescript
.update({ value, updated_at: new Date().toISOString() })
.eq('key', key);
```

بـ:
```typescript
.upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
```

هذا يضمن حفظ الإعدادات الجديدة التي لم تُدخل مسبقاً.

### 3. `src/hooks/useBylaws.ts` — اضافة `staleTime`

اضافة `staleTime: 5 * 60 * 1000` (5 دقائق) في `useQuery` — اللوائح نادرة التغيير.

---

## الملفات المتأثرة

1. `vite.config.ts` — اضافة `define` block
2. `src/hooks/useAppSettings.ts` — سطر واحد: `.update()` -> `.upsert()`
3. `src/hooks/useBylaws.ts` — سطر واحد: اضافة `staleTime`

