## نتيجة التحقق من التقرير

التقرير صحيح جزئياً، لكن فيه أرقام قديمة:

- **عدم تطابق الإصدار مؤكد**: `package.json` حالياً `3.0.367` بينما `package-lock.json` ما زال `3.0.364`.
- **ملف `.env` مؤكد أنه متعقّب**: `.gitignore` يمنعه، لكن `git ls-files` يؤكد أنه ما زال tracked.
- **تعارض `noFallthroughCasesInSwitch` غير مؤكد حالياً**: القيمة موجودة في `tsconfig.base.json` فقط كـ `true`، ولا يوجد override في `tsconfig.app.json` أو `tsconfig.node.json` حسب الملفات الحالية.
- **كبت logs في Vitest لم يعد واسعاً كما وصف التقرير**: الموجود الآن allowlist محدود ومعلّق بأسباب، وأي log آخر يظهر؛ لا يبدو كبند إصلاح عاجل.

## خطة التنفيذ

### 1) مزامنة lockfile مع `package.json`

- تحديث `package-lock.json` ليطابق إصدار الجذر الحالي `3.0.367` في الموضعين:
  - `version` في الجذر.
  - `packages[""].version`.
- عدم تغيير dependencies أو package manager.

### 2) إزالة `.env` من التتبع مع إبقاء الحماية

- إزالة `.env` من المستودع فقط، لأن `.gitignore` يمنعه بالفعل.
- عدم عرض أو نسخ محتوى `.env`.
- إبقاء `.env.example` مسموحاً كما هو.

### 3) تحديث الخطة/التوثيق الداخلي للحالة الفعلية

- تحديث `.lovable/plan.md` ليعكس أن إصلاح build السابق تغيّر إلى إزالة اعتماد `vite.config.ts` على `build/*.ts`، وأن البنود المتبقية هي lockfile و `.env` فقط.
- إزالة الادعاءات القديمة مثل `3.0.364 = 3.0.364` إذا لم تعد صحيحة.

### 4) التحقق بعد التنفيذ

- تشغيل فحص drift: `node scripts/dependency-drift-check.mjs`.
- التحقق أن `.env` لم يعد tracked عبر `git ls-files --error-unmatch .env`.
- التحقق أن إعداد Vite ما زال لا يستورد `./build/chunks.ts` أو `./build/pwa-runtime-caching.ts`.
- تشغيل فحص تحميل إعداد Vite أو build عند السماح بالتنفيذ في build mode.

## خارج النطاق

- لا تعديل على ملفات المصادقة أو صلاحيات المستخدمين.
- لا تغيير على منطق `vitest.config.ts` لأن الوضع الحالي ليس مطابقاً لملاحظة التقرير القديمة.
- لا تعديل على `tsconfig.app.json` أو `tsconfig.node.json` بخصوص `noFallthroughCasesInSwitch` لأن القيمة موحّدة حالياً من `tsconfig.base.json`.
- لا تغيير على أي أسرار أو مفاتيح، ولا قراءة محتوى `.env`.  
  
توصيات   
خطة ممتازة جدًا 👌 وتقييمك **أدق من التقرير السابق**.  
  رأيي: خطتك صحيحة 90%، وأقترح تحسينات احترافية صغيرة لتقليل المخاطر.
  ## رأيي على خطتك الحالية
  - ✅ **صحيح جدًا**: حصر الإصلاح في مشكلتين فعليتين الآن `version drift` + `.env tracked`).
  - ✅ **صحيح**: عدم فتح ملفات خارج النطاق (Auth/Security logic).
  - ✅ **ممتاز**: التحقق بعد التنفيذ بدل الاكتفاء بالتعديل.
  - ⚠️ **تحسين مهم**: تحديث `package-lock.json` يدويًا غير مفضل؛ الأفضل توليده بأمر npm لضمان سلامة التكامل.
  - ⚠️ **تحسين مهم**: إزالة `.env` من التتبع يجب أن تتم مع **تدوير المفاتيح** لاحقًا احترازيًا (حتى لو publishable).
  ---
  ## خطة إصلاح دقيقة واحترافية (Execution Plan)
  ## Phase 0 — Baseline (إجباري)
  1. توثيق الحالة:
     - `git status --short`
     - `git branch --show-current`
     - `git log --oneline -5`
  2. لقطة تحقق:
     - `node -p "require('./package.json').version"`
     - `node -p "require('./package-lock.json').version"`
     - `git ls-files --error-unmatch .env && echo TRACKED`
  ---
  ## Phase 1 — إصلاح drift للإصدار
  > الهدف: توحيد `package-lock.json` مع `package.json` (3.0.367) **بدون تعديل تبعيات**.
  1. نفّذ:
     - `npm install --package-lock-only`
  2. تحقق:
     - `node -p "require('./package-lock.json').version"`
     - `node -p "require('./package-lock.json').packages[''].version"`
     - يجب أن تكون كلها `3.0.367`.
  > ملاحظة: هذا أفضل من التعديل اليدوي لأنه يحافظ على سلامة lockfile format.
  ---
  ## Phase 2 — إزالة `.env` من التتبع
  > الهدف: إبقاء الملف محلي فقط، وغير موجود في Git history القادمة.
  1. نفّذ:
     - `git rm --cached .env`
  2. تأكيد:
     - `git ls-files --error-unmatch .env`  
       (المفروض يفشل = ممتاز)
  3. تحقق أن `.gitignore` يحتوي:
     - `.env`
     - `.env.*`
     - `!.env.example`
  ---
  ## Phase 3 — تحديث التوثيق/الخطة
  1. حدّث `.lovable/plan.md` كما ذكرت:
     - إزالة البنود القديمة.
     - ذكر أن المتبقي كان: lockfile + tracked .env.
  2. لا تغيّر أي ملفات خارج النطاق.
  ---
  ## Phase 4 — Verification Matrix (قبل commit)
  1. `node scripts/dependency-drift-check.mjs`
  2. `npm run lint`
  3. `npx tsc --noEmit`
  4. `npm run build`
  5. تحقق إضافي خاص بك:
     - عدم وجود imports لـ `./build/chunks.ts` أو `./build/pwa-runtime-caching.ts` في `vite.config.ts`.
  ---
  ## Phase 5 — Commit احترافي
  **Commit 1 (مفضل فصلًا):**
  - `chore(lockfile): sync package-lock version with package.json (3.0.367)`
  **Commit 2:**
  - `security(repo): stop tracking .env and keep env policy via .gitignore`
  (ممكن commit واحد، لكن الفصل أفضل للمراجعة والرجوع).
  ---
  ## ملاحظات أمنية مهمة (بعد الدمج)
  - لأن `.env` كان tracked سابقًا:  
    **أوصي بتدوير مفاتيح Supabase publishable key** كإجراء احترازي.
  - إن كان تم كشف أي key حساس تاريخيًا (حتى خطأً)، يجب تدويره فورًا.
  ---
  ## الخلاصة
  - خطتك **قوية ومهنية**.
  - التعديل المقترح الوحيد الجوهري:  
    **استخدم `npm install --package-lock-only` بدل التعديل اليدوي**.
  - غير كذا: أنت على المسار الصحيح 100%.
  إذا تريد، أكتب لك الآن **Checklist تنفيذ جاهز للنسخ** (أوامر فقط، خطوة بخطوة).