

# خطة الإصلاح — حل مشكلة توقف التطبيق على شاشة البداية

## السبب الجذري المؤكد

كتلة `define` في `vite.config.ts` تُعرّف مفاتيح داخل `import.meta.env.*` يدوياً، مما يتداخل مع آلية Vite التلقائية لحقن `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY`. النتيجة: `undefined` → خطأ `supabaseUrl is required` → التطبيق لا يُقلع.

## الملفات المتأثرة (3 ملفات فقط)

### 1. `vite.config.ts` — تغيير كتلة `define`
```typescript
// قبل:
define: {
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(pkg.version),
},

// بعد:
define: {
  '__APP_VERSION__': JSON.stringify(pkg.version),
  '__APP_BUILD_ID__': JSON.stringify(pkg.version),
},
```

### 2. `src/vite-env.d.ts` — إضافة تعريفات TypeScript
```typescript
/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare const __APP_BUILD_ID__: string;
```

### 3. `src/lib/pwaBootstrap.ts` (سطر 10) — تحديث المرجع
```typescript
// قبل:
const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION || '0.0.0';

// بعد:
const APP_BUILD_ID = __APP_BUILD_ID__ || __APP_VERSION__ || '0.0.0';
```

## لماذا سينجح

- يُحرر `import.meta.env` بالكامل لآلية Vite التلقائية
- أضيق نطاق ممكن (3 أسطر في 3 ملفات)
- لا يمس الملفات المحمية (`client.ts`, `.env`, `types.ts`)

## بعد التنفيذ

يجب النشر (Publish → Update) ثم التحقق من `https://waqf-wise-net.lovable.app` على اللابتوب.

