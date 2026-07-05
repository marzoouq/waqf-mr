## إجابة مباشرة على أسئلتك

### هل تحققت من الخطة مقابل الكود؟
نعم. تمت مطابقة الخطة مع الكود الحالي:

- `package.json` يحتوي على:
  - `@lovable.dev/mcp-js`
- `vite.config.ts` يستورد:
  - `mcpPlugin` من `@lovable.dev/mcp-js/stacks/supabase/vite`
- `package-lock.json` لا يحتوي على الحزمة الجديدة في جذر الاعتمادات.
- `package-lock.json` ما زال بإصدار `3.0.342` بينما `package.json` على `3.0.344`.

النتيجة: الخطة متطابقة مع حالة الكود، وليست تخميناً.

---

### هل تحققت من نجاح الخطة مقابل المشكلة؟
لم يتم تنفيذ الإصلاح بعد، لذلك لا يصح أن أقول إن الخطة نجحت بعد.

لكن تم التحقق من أن سبب الخطة يطابق رسالة فشل النشر عبر محاكاة مسار النشر:

```text
npm ci can only install packages when your package.json and package-lock.json are in sync.
Please update your lock file with npm install before continuing.

Missing: @lovable.dev/mcp-js@0.20.0 from lock file
Missing: @modelcontextprotocol/sdk@1.28.0 from lock file
Missing: esbuild@0.27.7 from lock file
Missing: jose@6.2.3 from lock file
...
```

هذا هو النوع نفسه من الفشل الذي يحدث في بيئات النشر لأنها تعتمد غالباً على `npm ci` وليس `npm install`.

---

### هل تم اختبار المشكلة مع الإصلاح في بيئة مستقلة؟
لا، لأن الإصلاح لم يُطبق بعد.

ما تم الآن هو:

- إعادة إنتاج المشكلة بأمر شبيه ببيئة النشر:
  - `npm ci --dry-run --ignore-scripts`
- النتيجة أكدت فشل التثبيت بسبب عدم توافق `package.json` و `package-lock.json`.

بعد الموافقة على التنفيذ، سأختبر الإصلاح في مسار مستقل كالتالي:

1. تحديث lockfile فقط.
2. تشغيل محاكاة تثبيت نظيف مرة أخرى.
3. تشغيل build.
4. تشغيل فحص الاعتمادات.
5. التحقق أن MCP manifest/function ما زالت صحيحة.

---

### هل تم تعميق الفحص إلى جذر المشكلة؟
نعم. الجذر المؤكد هو:

```text
إضافة MCP أدخلت اعتماداً جديداً في package.json
لكن package-lock.json لم يُحدّث معه
فـ npm ci في النشر يفشل قبل بناء التطبيق
وتظهر للمستخدم رسالة نشر عامة داخل Lovable
```

الدليل المباشر:

```text
packageVersion: 3.0.344
lockVersion: 3.0.342
rootLockVersion: 3.0.342
missingDeps: [ '@lovable.dev/mcp-js' ]
missingRootPackages: [ '@lovable.dev/mcp-js' ]
```

هذا يربط بين:

```text
آخر تغيير مؤثر: إضافة MCP
↓
package.json تغيّر
↓
package-lock.json لم يواكب التغيير
↓
npm ci يفشل
↓
النشر يفشل برسالة داخلية عامة
```

---

## ما ثبت أنه ليس السبب الرئيسي

- ليس بسبب RLS.
- ليس بسبب تحذيرات SECURITY DEFINER الحالية.
- ليس بسبب `ws@8.20.1`؛ لم يعد موجوداً في الشجرة الحالية.
- ليس بسبب `dompurify@3.4.5`؛ الحالي `3.4.11`.
- ليس بسبب publish visibility؛ الموقع public.
- ليس بسبب حالة Live backend؛ backend يعمل طبيعياً.

---

## خطة التنفيذ بعد الموافقة

### 1. إصلاح lockfile
- تحديث `package-lock.json` ليطابق `package.json`.
- التأكد أن `@lovable.dev/mcp-js` وكل اعتماداته موجودة في lockfile.
- توحيد رقم الإصدار في lockfile مع `package.json`.

### 2. اختبار مستقل لمسار التثبيت
- تشغيل محاكاة تثبيت نظيف بعد الإصلاح.
- يجب أن تختفي رسالة:

```text
package.json and package-lock.json are in sync
Missing: @lovable.dev/mcp-js from lock file
```

### 3. اختبار البناء
- تشغيل build للتأكد أن `vite.config.ts` يستطيع تحميل `mcpPlugin`.
- التأكد أن البناء لا يفشل قبل مرحلة Vite.

### 4. اختبار الاعتمادات
- تشغيل فحص dependency scan.
- التأكد من عدم عودة:
  - `ws@8.20.1`
  - `dompurify@3.4.5`

### 5. اختبار MCP بعد الإصلاح
- استخراج/تحديث MCP manifest.
- التأكد أن تعريف الأدوات لا يكسر build.
- نشر/اختبار دالة `mcp` إذا لزم الأمر بعد نجاح build.

### 6. معالجة `.env` كملف منفصل
- `.env` متعقب رغم وجوده في `.gitignore`.
- هذا ليس الجذر الحالي لفشل النشر، لكنه خطر على CI وجودة المستودع.
- سأعزله كإصلاح منفصل حتى لا نخلط سبب النشر الأساسي بمشكلة ثانوية.

---

## معيار النجاح النهائي

لن أعتبر المشكلة محلولة إلا إذا تحققت هذه النقاط:

```text
npm ci / محاكاة تثبيت النشر: يمر
build: يمر
dependency scan: بلا High/Critical متعلق بالحزم السابقة
MCP manifest/function: لا يظهر خطأ جديد
النشر بعد ذلك: لا يعيد رسالة internal error نفسها
```

## القرار المطلوب

وافق على تنفيذ الخطة، وسأبدأ بإصلاح `package-lock.json` ثم أختبر المسار كاملاً قبل إعلان أن مشكلة النشر حُلت.