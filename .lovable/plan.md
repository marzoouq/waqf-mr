

# إصلاح خطأ البناء — كاش قديم

## التشخيص

الملف `src/hooks/data/notifications/useRealtimeAlerts.test.ts` **لا يحتوي** على أي إشارة إلى `@/hooks/ui/useRealtimeAlerts`. جميع الاستيرادات تشير بالفعل إلى المسار الصحيح `@/hooks/data/notifications/useRealtimeAlerts`.

بحث شامل في المشروع أكّد: **صفر نتائج** لـ `@/hooks/ui/useRealtimeAlerts`.

## السبب

خطأ البناء ناتج عن **كاش TypeScript/Vite قديم** يحتفظ بالمسارات السابقة قبل عملية النقل.

## الحل

خطوة واحدة فقط: **مسح كاش البناء وإعادة البناء**

```bash
rm -rf node_modules/.vite node_modules/.cache dist .tsbuildinfo
```

ثم إعادة تشغيل dev server. لا حاجة لأي تعديل في الكود — الملفات سليمة بالفعل.

