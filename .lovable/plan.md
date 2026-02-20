

# خطة شاملة: إشعارات التوزيعات الفورية + تطبيق قابل للتثبيت (PWA) + تحسينات احترافية

---

## 1. إشعارات فورية عند إضافة توزيعات جديدة

### ما سيحدث:
عندما يضيف الناظر توزيعة جديدة لأي مستفيد، سيصل إشعار فوري للمستفيد المعني تلقائياً دون تأخير.

### التنفيذ:
- تفعيل Realtime على جدول `distributions` عبر migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.distributions;
```
- إضافة استدعاء `notifyUser()` عند إنشاء توزيعة جديدة في صفحة الحسابات (AccountsPage)، بحيث يتم إرسال إشعار تلقائي للمستفيد يتضمن المبلغ واسم السنة المالية
- إضافة اشتراك Realtime في لوحة المستفيد (`BeneficiaryDashboard`) لتحديث قسم "آخر التوزيعات" فوراً

### الملفات المتأثرة:
- `src/pages/dashboard/AccountsPage.tsx` - إضافة استدعاء الإشعار عند حفظ التوزيعات
- `src/pages/beneficiary/BeneficiaryDashboard.tsx` - إضافة اشتراك Realtime
- Migration جديد لتفعيل Realtime

---

## 2. تحويل التطبيق لتطبيق قابل للتثبيت (PWA)

### ما سيحدث:
سيتمكن المستخدمون من تثبيت التطبيق على شاشة الجوال مباشرة من المتصفح، وسيعمل بدون إنترنت (للصفحات المخزنة مؤقتاً)، مع إشعار تلقائي عند وجود تحديث جديد.

### التنفيذ:

#### أ. إعداد vite-plugin-pwa:
- تثبيت مكتبة `vite-plugin-pwa`
- تعديل `vite.config.ts` لإضافة إعدادات PWA مع:
  - ملف manifest يحتوي اسم التطبيق وأيقوناته وألوانه
  - Service Worker مع `navigateFallbackDenylist: [/^\/~oauth/]`
  - استراتيجية التخزين المؤقت للموارد

#### ب. إنشاء أيقونات التطبيق:
- إنشاء أيقونات بأحجام متعددة (192x192, 512x512) في مجلد `public/`

#### ج. تحسين index.html:
- إضافة وسوم meta للجوال:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `theme-color`

#### د. مكون إشعار التحديث (UpdatePrompt):
- مكون جديد يظهر شريط إشعار عند توفر تحديث جديد للتطبيق
- زر "تحديث الآن" لإعادة تحميل التطبيق بالنسخة الجديدة
- يستخدم `useRegisterSW` من مكتبة PWA

#### هـ. صفحة التثبيت (/install):
- صفحة مخصصة توضح كيفية تثبيت التطبيق على الجوال
- زر "تثبيت التطبيق" يستخدم `beforeinstallprompt` API
- تعليمات مرئية لمستخدمي iPhone (Share > Add to Home Screen)

### الملفات الجديدة:
- `src/components/UpdatePrompt.tsx` - مكون إشعار التحديث
- `src/pages/InstallApp.tsx` - صفحة التثبيت
- `public/pwa-192x192.png` - أيقونة (سيتم إنشاء SVG محوّل)
- `public/pwa-512x512.png` - أيقونة كبيرة

### الملفات المعدلة:
- `vite.config.ts` - إضافة VitePWA plugin
- `index.html` - إضافة وسوم meta للجوال
- `src/App.tsx` - إضافة مسار /install ومكون UpdatePrompt

---

## 3. تحسينات احترافية شاملة

### أ. تحسين تجربة التحميل الأولي (Splash Screen):
- إضافة شاشة تحميل أنيقة في `index.html` تظهر قبل تحميل React
- تتضمن شعار الوقف وحركة تحميل سلسة

### ب. تحسين صفحة تسجيل الدخول:
- إضافة زر "تثبيت التطبيق" في صفحة تسجيل الدخول للمستخدمين الذين لم يثبتوه بعد

### ج. تحسين أداء Service Worker:
- تخزين مؤقت ذكي للخطوط والصور والملفات الثابتة
- تحديث تلقائي في الخلفية كل ساعة

---

## التفاصيل التقنية

### إعدادات PWA في vite.config.ts:
```typescript
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'fonts/*.woff2'],
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: 'CacheFirst',
        options: { cacheName: 'google-fonts-stylesheets' }
      }
    ]
  },
  manifest: {
    name: 'نظام إدارة الوقف',
    short_name: 'إدارة الوقف',
    description: 'منصة متكاملة لإدارة أملاك الوقف',
    theme_color: '#1a365d',
    background_color: '#faf8f5',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    icons: [...]
  }
})
```

### مكون UpdatePrompt:
```typescript
// يستخدم useRegisterSW من vite-plugin-pwa/virtual
// يعرض شريط في أسفل الشاشة عند توفر تحديث
// زر "تحديث الآن" يستدعي updateServiceWorker(true)
```

### إشعار التوزيعات:
```typescript
// في AccountsPage عند حفظ التوزيعة:
import { notifyUser } from '@/utils/notifications';
notifyUser(beneficiary.user_id, 'توزيعة جديدة', `تم إضافة توزيعة بمبلغ ${amount} ريال`, 'payment', '/beneficiary/share');
```

### ترتيب التنفيذ:
1. Migration لتفعيل Realtime على distributions
2. تثبيت vite-plugin-pwa
3. تعديل vite.config.ts
4. تعديل index.html
5. إنشاء UpdatePrompt.tsx
6. إنشاء InstallApp.tsx
7. تعديل App.tsx (مسار /install + UpdatePrompt)
8. تعديل AccountsPage.tsx (إشعارات التوزيعات)
9. تعديل BeneficiaryDashboard.tsx (Realtime)

