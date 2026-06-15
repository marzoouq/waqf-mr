# الموجة 1 — البنية الجذرية، الإقلاع، CI/CD، DX

**التاريخ:** 2026-06-15
**النطاق:** `src/main.tsx`, `src/App.tsx`, `src/app/**`, `index.html`, `vite.config.ts`, `tsconfig*`, `tailwind.config.ts`, `package.json`, `public/**`, `.github/**`, `.husky/**`, `scripts/**`, `vitest.config.ts`.
**نمط:** قراءة فقط — لا تعديل كود.
**الملفات الممسوحة:** 37 ملف + 7 سكربتات + 5 workflows.

---

## 1. الملخص التنفيذي

| الخطورة | العدد |
|---|---|
| 🔴 Critical | **0** |
| 🟠 High | **5** |
| 🟡 Medium | **8** |
| 🔵 Low | **6** |
| ⚪ Info | **9** |

البنية الجذرية **سليمة بنيوياً وموثّقة جيداً**: `main.tsx` منسّق نظيف (28 سطراً)، `src/app/bootstrap/**` يفصل كل side-effect في وحدة مستقلة قابلة للاختبار (8 ملفات، 312 سطراً)، و `AppProviders` مرتّب بترتيب صحيح للـ ErrorBoundary/Helmet/Theme/Query/Auth/FiscalYear. مع ذلك توجد **5 مشاكل عالية** تتمحور حول: تعارض في **مصادر الـ manifest**، **CSP غير مكتمل**، **تعارض clickjacking**، **`@types/node@25` لبيئة Node 22**، و **خلل في robots.txt يمنع زحف صفحة `/install` العامة**.

---

## 2. النتائج المفصّلة

### 🟠 High

#### W1-001 — مصدران متعارضان لـ Web App Manifest
**الملف:** `public/manifest.webmanifest` + `vite.config.ts` (`VitePWA.manifest`)
**التفاصيل:** يوجد ملف static `public/manifest.webmanifest` يحدد:
- `name`: "نظام إدارة وقف مرزوق بن علي الثبيتي"
- `background_color`: `#ffffff`
- `orientation`: `portrait`
- `icons[].purpose`: `"any maskable"` (مدموجة)

بينما `vite-plugin-pwa` يولّد `manifest.webmanifest` من config مغاير:
- `name`: "نظام إدارة الوقف - وقف مرزوق بن علي الثبيتي"
- `background_color`: `#faf8f5`
- لا `orientation`
- `icons` ثلاث (any + maskable منفصلين)

**الأثر:** عند `vite build`، الإضافة تُنتج ملفها وتدوس على static (أو العكس حسب ترتيب copy). تثبيت PWA قد يعرض اسماً/لوناً مختلفاً بين بيئات. iOS قد يلتقط الـ static أولاً.
**التوصية:** احذف `public/manifest.webmanifest` بالكامل واعتمد VitePWA كمصدر وحيد، وأضف `orientation` و `lang` و `dir` فيه.

---

#### W1-002 — CSP غير مكتمل في `public/_headers`
**الملف:** `public/_headers`
**التفاصيل:** الهيدر الوحيد المتعلق بـ CSP هو:
```
Content-Security-Policy: frame-ancestors 'self'
```
لا توجد توجيهات `default-src` ولا `script-src` ولا `connect-src` ولا `style-src` ولا `img-src`. تعليق `index.html` يقول "CSP enforced server-side" لكن `_headers` لا يفعل ذلك. حماية XSS تعتمد فقط على React escaping وفحص `dangerouslySetInnerHTML` (يُفحص في W7).
**الأثر:** سطح هجوم XSS مفتوح؛ لا توجد قائمة origins مسموحة للـ scripts/connections؛ لا حماية ضد injection لو حصل bypass في مكان ما.
**التوصية:** CSP كاملة بصيغة:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://nuzdeamtujezrsxbvpfi.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
img-src 'self' data: https://storage.googleapis.com;
style-src 'self' 'unsafe-inline';
font-src 'self';
frame-ancestors 'self';
```
يدرس W7 الصياغة النهائية مع تكاملات Lovable AI و OG image الخارجية.

---

#### W1-003 — تعارض ظاهري بين `X-Frame-Options: DENY` و `frame-ancestors 'self'`
**الملف:** `public/_headers`
**التفاصيل:**
```
Content-Security-Policy: frame-ancestors 'self'
X-Frame-Options: DENY
```
- `frame-ancestors 'self'` يسمح بتأطير من نفس الأصل (للمعاينات الداخلية).
- `X-Frame-Options: DENY` يمنع التأطير حتى من نفس الأصل.

المتصفحات الحديثة تُعطي `frame-ancestors` الأولوية وتتجاهل XFO، لكن بعض المتصفحات القديمة وأدوات الفحص قد تطبّق DENY. الأكثر إرباكاً: `index.html` يحوي script `frame-busting` يستثني `*.lovable.app` و `*.lovableproject.com`، لكن `_headers` لا يستثنيها في `frame-ancestors`.
**الأثر:** قد تنكسر معاينات Lovable داخل iframe في بعض المتصفحات.
**التوصية:** اختر إستراتيجية واحدة موثّقة: إما `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self' https://*.lovable.app https://*.lovableproject.com`، أو احذف XFO تماماً واعتمد على CSP الحديثة.

---

#### W1-004 — `@types/node@25` لبيئة Node 22 LTS
**الملف:** `package.json`
**التفاصيل:** `"@types/node": "^25.5.2"` لكن CI و health-check و .nvmrc غير الموثقة كلها تشير إلى Node 22. ذاكرة المشروع تنص صراحة: **"Node 22 LTS. No preview/alpha versions"**. أنواع v25 قد تكشف APIs غير متاحة في v22 runtime، مما يسمح بكود يمر TS لكنه يفشل وقت التشغيل.
**الأثر:** تسرّب APIs غير موجودة + خرق صريح للقاعدة الأساسية في الذاكرة.
**التوصية:** خفّض إلى `^22.x` ليتطابق مع runtime CI/Cloud functions.

---

#### W1-005 — `robots.txt` يمنع زحف صفحة `/install` العامة
**الملف:** `public/robots.txt`
**التفاصيل:** `/install` صفحة عامة (PWA install instructions) موثّقة في `public/llms.txt` كصفحة عامة، لكن `robots.txt` يحجبها لكل الـ bots:
```
Disallow: /install
```
**الأثر:** Google لا يفهرس الصفحة → فقد فرصة SEO، وتعارض داخلي مع `llms.txt` الذي يدرجها كصفحة قابلة للوصول للـ LLMs. نفس المشكلة لـ `/auth` و `/unauthorized` (مقبول حجبها) لكن `/install` يجب أن تكون متاحة.
**التوصية:** احذف `Disallow: /install` من كل كتل User-agent.

---

### 🟡 Medium

#### W1-006 — `sourcemap: false` في الإنتاج
**الملف:** `vite.config.ts`
**التفاصيل:** `sourcemap: mode === 'production' ? false : true`. لا توجد sourcemaps في الإنتاج → استكشاف أخطاء `errorReporter` يصبح صعب جداً (سطور minified، أسماء غير قابلة للقراءة). آمن من ناحية تسريب الكود لكنه يضرّ بقدرة المراقبة.
**التوصية:** اعتمد `sourcemap: 'hidden'` للإنتاج: لا تُنشر في dist إلا برفعها يدوياً لمنصة مراقبة، لكنها تُولَّد وتُربط بـ symbols.

---

#### W1-007 — `npm ci --legacy-peer-deps` يخفي نزاعات peer
**الملف:** `.github/workflows/ci.yml`, `.github/workflows/test.yml`
**التفاصيل:** الاثنان يستخدمان `--legacy-peer-deps`. هذا عادة لأن React 19 + بعض حزم Radix/dnd-kit تعلن peerDependency على React 18. التجاوز يخفي مشاكل توافق حقيقية.
**التوصية:** افحص بـ `npm ls --legacy-peer-deps=false` وحدّد الحزم المتأخرة عن React 19؛ ثبّت بدائل أو ارفع الإصدارات في W7.

---

#### W1-008 — `sitemap.xml` قديم وغير كامل
**الملف:** `public/sitemap.xml`
**التفاصيل:** `lastmod` للصفحة الرئيسية `2026-05-25` (قديم 3 أسابيع)، و `privacy/terms` بـ `2026-03-18`. لا يحتوي `/install` رغم أنها صفحة عامة. لا workflow يحدّث `lastmod` تلقائياً.
**التوصية:** أضف خطوة في `auto-version.yml` تحدّث `lastmod` عند كل bump version، وأضف `/install`.

---

#### W1-009 — `navigateFallback: null` + استبعاد `index.html` من precache
**الملف:** `vite.config.ts` (VitePWA)
**التفاصيل:** تعليق الكود يشرح أن `index.html` مستبعد عمداً لمنع invalidation عشوائي عند bump version. التنقل يخدم عبر NetworkFirst (timeout 3s) ضمن `runtimeCaching`. لكن في حالة **offline كامل + لا cache صالح**، المستخدم يحصل على شاشة فارغة بدون أي fallback. لا توجد `offline.html` بديلة.
**التوصية:** أنشئ `public/offline.html` بسيطة وأشر إليها في runtimeCaching كـ catch handler.

---

#### W1-010 — pre-commit pattern يولّد false positives على `service_role`
**الملف:** `.husky/pre-commit`
**التفاصيل:** النمط `'service_role'` يحجب أي ذكر للكلمة، بما في ذلك تعليقات `-- GRANT ALL ... TO service_role;` في migrations، وتوثيق `audit/**`، و edge function helpers. يحتاج المطورون `--no-verify` بشكل متكرر، مما يقوّض الحماية.
**التوصية:** قيّد النمط بأنماط القيم: `SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]ey[A-Za-z0-9._-]+` (JWT prefix) بدل الاسم النصي العام.

---

#### W1-011 — `og:image` يستضاف على نطاق خارجي
**الملف:** `index.html`
**التفاصيل:** `og:image` و `twitter:image` يشيران إلى `https://storage.googleapis.com/gpt-engineer-file-uploads/...`. هذا CDN خارجي (Lovable upload service) قد يتغير URL له أو يُحذف. كما يُسرّب أن المشروع مبني على Lovable في كل share.
**التوصية:** انسخ الصورة إلى `public/og-image.webp` (موجودة فعلاً 27KB!) واستخدم URL محلي `https://waqf-wise.net/og-image.webp`.

---

#### W1-012 — `chunkSizeWarningLimit: 600` متساهل
**الملف:** `vite.config.ts`
**التفاصيل:** الحد 600KB لكل chunk فوق المعدل الموصى به (500KB). vendor-pdf و vendor-recharts قد يتجاوزان ذلك بسهولة دون تحذير. CI يُنبّه فقط عند تجاوز إجمالي البناء 5MB.
**التوصية:** خفّض إلى 500KB وأضف per-chunk size budget في CI step.

---

#### W1-013 — `google-site-verification` hard-coded في `index.html`
**الملف:** `index.html`
**التفاصيل:** `<meta name="google-site-verification" content="sjyX3FrreUlSH243hg-aU9xogh7lxcObPly38SyCjaM" />`. مقبول، لكن مكشوف لكل محتوى الـ repo. الأفضل DNS TXT verification.
**التوصية:** بدّل إلى DNS verification في Google Search Console ثم احذف الـ meta.

---

### 🔵 Low

#### W1-014 — `public/changelog.json` يبلغ 208KB
يُحمَّل كأصل ثابت من قِبَل صفحات التحكم. غير مضغوط ولا lazy. يفضّل ترقيمه أو نقله لـ endpoint مع pagination.

#### W1-015 — `manifest.webmanifest` (static) لا يحتوي `description` بنص متعدد اللغات
بينما VitePWA يحوي description عربي. تفاوت أخرى بين المصدرين (راجع W1-001).

#### W1-016 — لا `<noscript>` fallback في `index.html`
المستخدمون بدون JS يرون splash جامد. مقبول لـ SPA لكن غير ودود.

#### W1-017 — `theme-color` ثابت `#1a5c3a` دون `prefers-color-scheme`
لا `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="...">`. dark mode في `next-themes` لكن شريط المتصفح لا يتبع.

#### W1-018 — `_headers` لا يحوي `Strict-Transport-Security`
HSTS غير محدّد في `_headers`. مقبول إذا كان Lovable يضيفه افتراضياً، لكن غير موثّق.

#### W1-019 — `dependabot.yml` يرفع 10 PRs أسبوعياً
كثير. ينصح بـ `groups` أوسع أو خفض السقف إلى 5.

---

### ⚪ Info / إيجابيات

- **W1-I1** — `main.tsx` 28 سطراً + كل side-effect معزول في `bootstrap/**` ← هندسة ممتازة.
- **W1-I2** — `bootstrap.smoke.test.ts` يغطي كل وحدات الإقلاع ✅.
- **W1-I3** — `AppProviders` بترتيب صحيح: `ErrorBoundary → Helmet → Theme → Query → Auth → FiscalYear → Tooltip → Sonner`.
- **W1-I4** — `RootLayout` يلفّ كل lazy component في `<ErrorBoundary>` مستقل (5 boundaries). مقاومة عالية للأخطاء.
- **W1-I5** — `lazyWithRetry` يعالج stale chunk errors بأناقة (TTL 10s + cache invalidation + reload مرة واحدة).
- **W1-I6** — `logger.ts` يفصل تماماً بين dev (console) و prod (errorReporter → access_log).
- **W1-I7** — `installRuntimeCollector` يحفظ window.error + unhandledrejection في sessionStorage (100 max) للتشخيص.
- **W1-I8** — CI شامل: env-block + gitleaks + tsc + eslint + conventions + audit + vitest + npm audit + security-gates + supabase-lint + DEFINER sync + build + bundle report.
- **W1-I9** — `tsconfig.app.json` صارم: `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`. تكوين متفوّق.
- **W1-I10** — `tailwind.config.ts` يعتمد كلياً على CSS variables (`hsl(var(--token))`). لا hex مباشر في components ✅.
- **W1-I11** — `vitest.config.ts` يفرض threshold تغطية 60% على branches/statements/functions/lines.
- **W1-I12** — `pre-commit` يحجب 13 نمط أسرار شائعة (Stripe, GitHub PAT, AWS, JWT, PGP, Google API).
- **W1-I13** — `pre-push` يشغّل `audit:gate` (Vitest) قبل أي push.
- **W1-I14** — `health-check` workflow كل 30 دقيقة + alerting عبر exit code.
- **W1-I15** — `auto-version.yml` يرفع patch تلقائياً + يولّد changelog عربي مع أرقام عربية.

---

## 3. ملاحظات مهمة على البنية

### نقاط القوة
1. **فصل bootstrap ممتاز** — كل خطوة (preconnect/PWA/monitoring/mount/splash) في ملف مستقل ≤30 سطراً، قابلة للاختبار.
2. **5 طبقات ErrorBoundary** في RootLayout — أي عطل في AiAssistant/SecurityGuard/PwaUpdate لا يكسر التطبيق.
3. **lazyWithRetry جذري** — لا loops infinite عند stale chunks بفضل TTL.
4. **CI صارم جداً** — 156-row permissions matrix مفروض كـ gate.

### نقاط الضعف الجذرية
1. **CSP اسمي فقط** — يحتاج صياغة كاملة قبل أي مراجعة أمنية جدية في W7.
2. **تكرار مصادر الإعداد** — manifest في مكانين، headers في واحد فقط، CSP في none، theme-color في 3 أماكن.
3. **`@types/node@25`** ينتهك قاعدة الذاكرة الصريحة.

---

## 4. ما يحتاج التحقق في موجات لاحقة

| مرجع W1 | يحتاج تأكيد في |
|---|---|
| W1-002 (CSP) | W7 — اقترح CSP نهائية بعد جرد كل origins |
| W1-009 (offline) | W4 — اختبر سيناريو PWA offline حقيقي |
| W1-006 (sourcemaps) | W7 — قرّر استراتيجية sourcemap لمنصة المراقبة |
| W1-004 (@types/node) | W7 — npm audit + dependency_scan |
| W1-007 (legacy-peer-deps) | W7 — احصر الحزم المتأخرة |

---

## 5. التوصية للموجة 2

W2 (Routing/Auth/RBAC) جاهزة للبدء. اعتمد على:
- `coverage-ledger.csv` (مرفق) — لا تعيد مسح ملفات W1.
- مصفوفة الصلاحيات الموجودة بالفعل في `audit/ui-permissions-matrix.csv` كنقطة بداية.
- ركّز على fail-closed paths و WebAuthn E2E flow.

---

**نهاية الموجة 1.**
