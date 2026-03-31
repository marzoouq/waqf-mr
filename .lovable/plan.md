

# إصلاح المعاينة المتوقفة على شاشة التحميل

## التشخيص

فحصت الصفحة عبر المتصفح وجمعت الأدلة التالية:

1. **جميع السكربتات تُحمّل بنجاح** (HTTP 200) — لا مشكلة في الشبكة
2. **React DOM يُحمّل** (ظهرت رسالة DevTools) — لكن المحتوى لا يظهر
3. **عنصران فقط في DOM داخل `#root`** — React لم يُصيّر شجرة المكونات الكاملة
4. **لا أخطاء runtime في console المستخدم** — الفشل صامت
5. **الصفحة تعرض الشعار + "نظام إدارة الوقف" فقط** — بدون أزرار أو تنسيقات

## الأسباب الجذرية المحددة

### السبب الأول: سكربت Clickjacking يكسر المعاينة
**ملف:** `index.html` سطر 92
```js
if(window.top!==window.self){window.top.location=window.self.location}
```
المعاينة تعمل داخل iframe. هذا السكربت يحاول كسر الـ iframe مما يسبب SecurityError غير معالج. يجب إزالته أو لفه بـ try-catch مع استثناء بيئة المعاينة.

### السبب الثاني: كلاسات Tailwind v4 في كود v3
أربعة ملفات تستخدم `bg-linear-to-*` (صيغة Tailwind v4). المشروع يعمل على Tailwind v3 حيث الصيغة الصحيحة هي `bg-gradient-to-*`. هذا يكسر التنسيقات بصمت:

| الملف | الكلاس الخاطئ | الصحيح |
|-------|--------------|--------|
| `LandingHero.tsx` | `bg-linear-to-l`, `bg-linear-to-r` | `bg-gradient-to-l`, `bg-gradient-to-r` |
| `LandingCTA.tsx` | `bg-linear-to-b` | `bg-gradient-to-b` |
| `InvoiceGridView.tsx` | `bg-linear-to-b` | `bg-gradient-to-b` |
| `PageHeaderCard.tsx` | `bg-linear-to-br` | `bg-gradient-to-br` |

### السبب الثالث: حلقة إعادة تحميل PWA cache guard
**ملف:** `src/main.tsx` سطور 29-48
في بيئة المعاينة (`lovable.app`/`lovableproject.com`)، الكود يمسح الكاش ثم يعيد تحميل الصفحة. لكن بعد إعادة التحميل، يخرج من الـ IIFE عبر `return` دون مشكلة. هذا لا يسبب حلقة لانهائية لكنه يضيف تحميلاً إضافياً غير ضروري في المعاينة.

## خطة الإصلاح

### 1. إصلاح سكربت Clickjacking في `index.html`
- استبدال سكربت frame-busting بنسخة تستثني بيئات المعاينة (lovable.app / lovableproject.com)
- أو لفه بـ try-catch لمنع الخطأ الصامت

### 2. إصلاح كلاسات Tailwind في 4 ملفات
- استبدال كل `bg-linear-to-*` بـ `bg-gradient-to-*`
- هذا يضمن عمل التدرجات اللونية بشكل صحيح مع Tailwind v3

### 3. فحص بحثي إضافي
- البحث عن أي كلاسات Tailwind v4 أخرى قد تكون موجودة في الكود (`shadow-xs`, `rounded-4xl`, `inset-shadow-*`, الخ)
- إصلاحها إن وُجدت

## الملفات المتأثرة

| الملف | نوع التعديل |
|-------|------------|
| `index.html` | إصلاح سكربت frame-busting |
| `src/components/landing/LandingHero.tsx` | تصحيح كلاسات CSS |
| `src/components/landing/LandingCTA.tsx` | تصحيح كلاسات CSS |
| `src/components/invoices/InvoiceGridView.tsx` | تصحيح كلاسات CSS |
| `src/components/PageHeaderCard.tsx` | تصحيح كلاسات CSS |

## ما لن يتم تعديله
- لا تعديل على ملفات المصادقة أو الأمان
- لا تعديل على `config.toml` أو `client.ts` أو `types.ts` أو `.env`
- لا حذف لأي كود وظيفي

