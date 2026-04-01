

# إصلاح شريط التحديث ليظهر فوق الهيدر

## المشكلة
`SwUpdateBanner` يستخدم `fixed top-0 z-[9999]` و`MobileHeader` يستخدم `fixed top-0 z-40`. رغم أن z-index أعلى، قد يحدث تداخل بسبب stacking context أو ترتيب الرسم. الحل: إضافة `isolate` لفرض stacking context مستقل وزيادة safe-area padding.

## التعديل

**ملف واحد: `src/components/SwUpdateBanner.tsx`** — السطر 51:

تغيير:
```
className="fixed top-0 inset-x-0 z-[9999] bg-primary text-primary-foreground shadow-lg"
```
إلى:
```
className="fixed top-0 inset-x-0 z-[99999] isolate bg-primary text-primary-foreground shadow-2xl"
```

- `isolate`: ينشئ stacking context مستقل يضمن الأولوية
- `z-[99999]`: رفع إضافي للتأكيد
- `shadow-2xl`: تمييز بصري أوضح عن الهيدر

وإضافة `style` للـ safe-area:
```
style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
```

