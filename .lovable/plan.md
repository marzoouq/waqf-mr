

# إصلاح نتائج الفحص الجنائي — 4 مشاكل متبقية

## ملخص الاكتشافات
- **BUG-1 (dataCache)**: مُصلح بالفعل — `SimpleCache` مع TTL 60 ثانية موجود
- **ISSUE-2 (clearSlowQueries)**: مُستدعاة بالفعل عند تسجيل الخروج في `AuthContext.tsx`

## التغييرات المطلوبة

### 1. BUG-2: إضافة `diagnostics_run` لقائمة أنواع الأحداث المسموحة
- **Migration SQL**: تحديث دالة `log_access_event` لإضافة `'diagnostics_run'` في قائمة `IF p_event_type NOT IN (...)`

### 2. BUG-3: تسرب `activeTimers` في `queryClient.ts`
- **الملف**: `src/lib/queryClient.ts`
- إضافة معالجة حدث `removed` لتنظيف المؤقتات عند حذف query من الكاش:
```typescript
if (event.type === 'removed') {
  const endTimer = activeTimers.get(event.query.queryHash);
  if (endTimer) {
    endTimer();
    activeTimers.delete(event.query.queryHash);
  }
}
```

### 3. BUG-4: `sessionStorage.removeItem` في module scope في `lazyWithRetry.ts`
- **الملف**: `src/lib/lazyWithRetry.ts`
- حذف السطر الأخير `sessionStorage.removeItem('chunk_retry');`
- نقل المسح إلى داخل `.then()` عند النجاح:
```typescript
return lazy(() =>
  importFn()
    .then(mod => {
      sessionStorage.removeItem('chunk_retry');
      return mod;
    })
    .catch(...)
);
```

### 4. ISSUE-1: تحديد حجم رسالة المساعد الذكي
- **الملف**: `src/components/AiAssistant.tsx`
- إضافة `maxLength={1000}` على `<Input>`
- تقطيع النص: `const trimmed = input.trim().slice(0, 1000);`

## ما لا يحتاج تعديل (مُصلح بالفعل)
- ~~BUG-1: dataCache~~ — `SimpleCache` مع TTL موجود
- ~~ISSUE-2: clearSlowQueries~~ — مُستدعاة في `AuthContext.tsx`
- ~~ISSUE-4: pagePerformanceTracker~~ — unsubscribe موجود

