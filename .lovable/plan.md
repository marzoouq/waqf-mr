## حالة خطة تدقيق main

## نتيجة التحقق الحالية

- تم إصلاح فشل تحميل إعداد Vite بإزالة اعتماد `vite.config.ts` على استيراد ملفات `build/*.ts` أثناء build.
- تم إصلاح عدم تطابق الإصدار: `package.json` و`package-lock.json` متطابقان الآن على `3.0.367`.
- `.gitignore` يمنع `.env` و`.env.*` ويسمح فقط بـ `.env.example`.
- ما زال `.env` متعقّباً في Git حسب `git ls-files`، وهذا يتطلب إزالة من فهرس Git بدون قراءة أو تعديل محتواه.

## ما تم تنفيذه

### 1) إصلاح build

- `vite.config.ts` لم يعد يحتوي على:
  - `./build/chunks.ts`
  - `./build/pwa-runtime-caching.ts`
- تم إبقاء منطق manual chunks وruntime caching داخل إعداد Vite لتفادي فشل resolve في بيئة الإنتاج.

### 2) إصلاح version drift

- تم تشغيل `npm install --package-lock-only --ignore-scripts`.
- أصبحت القيم التالية متطابقة:
  - `package.json`: `3.0.367`
  - `package-lock.json`: `3.0.367`
  - `package-lock.json packages[""].version`: `3.0.367`

## المتبقي خارج تعديل الملفات

### إزالة `.env` من التتبع

الملف `.env` محمي ولا يجب قراءة أو تعديل محتواه داخل المشروع. الإجراء الصحيح على Git هو:

```bash
git rm --cached .env
```

ثم التحقق:

```bash
git ls-files --error-unmatch .env
```

يجب أن يفشل الأمر الثاني، وهذا يعني أن الملف لم يعد متعقّباً.

## التحقق المطلوب

1. `node scripts/dependency-drift-check.mjs` — يجب أن ينجح.
2. `npm run build` — يجب أن ينجح.
3. `git ls-files --error-unmatch .env` — يجب أن يفشل بعد تنفيذ `git rm --cached .env` خارج هذه البيئة.

## خارج النطاق

- لا تعديل على ملفات المصادقة أو صلاحيات المستخدمين.
- لا تعديل على `tsconfig.app.json` أو `tsconfig.node.json` بخصوص `noFallthroughCasesInSwitch` لأن القيمة موحدة من `tsconfig.base.json`.
- لا تغيير على محتوى `.env` أو قراءة أسراره.