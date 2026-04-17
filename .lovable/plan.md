
# الموجة الرابعة — استكمال: إزالة vendor-pdf من modulepreload فعلياً

## الوضع الحالي
بعد تحويل 19 ملف إلى dynamic imports في الجولة السابقة، اكتُشف أن `vendor-pdf` **لا يزال** في `<link rel="modulepreload">` ضمن `dist/index.html`. السبب: Vite يُنشئ modulepreload لجميع chunks المُعرَّفة في `manualChunks` بشكل افتراضي حتى لو كانت dynamic.

## المهمة الوحيدة المتبقية

### إضافة `experimental.renderBuiltUrl` أو تعديل `modulePreload` في `vite.config.ts`

**الحل المختار:** استخدام `build.modulePreload.resolveDependencies` لاستثناء chunks الـ pdf/html2canvas من preload:

```ts
build: {
  modulePreload: {
    resolveDependencies: (filename, deps) => {
      return deps.filter(dep => 
        !dep.includes('vendor-pdf') && 
        !dep.includes('vendor-pdf-table') &&
        !dep.includes('html2canvas')
      );
    },
  },
  // ... باقي الإعدادات
}
```

هذا يمنع Vite من إضافة `<link rel="modulepreload">` لهذه الـ chunks، فتُحمَّل **فقط** عند أول `await import('@/utils/pdf')` فعلي.

## خطوات التنفيذ

1. قراءة `vite.config.ts` الحالي للتحقق من بنية `build`
2. إضافة `modulePreload.resolveDependencies` filter
3. `npx vite build` — التحقق من `dist/index.html`:
   - ✅ لا يحتوي على `vendor-pdf-*.js` في modulepreload
   - ✅ لا يحتوي على `html2canvas-*.js` في modulepreload
4. `npx tsc --noEmit` — تأكيد سلامة الأنواع
5. توليد `/mnt/documents/stats-v4-final.html`
6. اختبار يدوي مختصر: تأكيد أن chunk `vendor-pdf` يُجلب بنجاح عند أول استيراد ديناميكي (Network tab)

## الملفات
```
vite.config.ts  (تعديل واحد — إضافة modulePreload.resolveDependencies)
```

## النتيجة المتوقعة
| Chunk | قبل | بعد |
|-------|-----|-----|
| vendor-pdf في modulepreload | ✅ موجود (179KB gzip) | ❌ مُستثنى |
| html2canvas في modulepreload | ✅ موجود (47KB gzip) | ❌ مُستثنى |
| **التوفير في initial load** | — | **−226KB gzip** |

السلوك: عند الضغط على زر تصدير PDF لأول مرة، يحدث download إضافي للـ chunk (~ميلي ثانية واحدة على اتصال جيد، ~200ms على 4G بطيء) ثم يعمل التصدير طبيعياً.

## الضمانات
- تعديل واحد فقط في `vite.config.ts`
- صفر تغيير في كود التطبيق
- صفر تغيير سلوكي (نفس الـ UX الذي يراه المستخدم)
- لا مساس بملفات المصادقة أو الملفات المحمية
- إن لم يوفّر Vite الـ API المطلوب في النسخة الحالية، سأبحث عن بديل (مثل `transformIndexHtml` plugin) وأعرضه قبل التطبيق

## المؤجَّل (موجة منفصلة)
- ترقية `lucide-react@1.7.0` → `0.544.x` — تتطلب تحقق من breaking changes في أسماء الأيقونات
