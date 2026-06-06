# خطة محققة بصرامة — Pre-commit + HIBP

## التحقق من الواقع الحالي

| العنصر | الحالة الفعلية في الريبو |
|---|---|
| `.gitignore` يحجب `.env*` (مع استثناء `.env.example`) | موجود (أسطر 26-29) ✅ |
| `.github/workflows/ci.yml` يحجب `.env` المتعقّب | موجود (أسطر 44-56) ✅ |
| Gitleaks في CI | موجود (سطر 58-61) ✅ |
| `.husky/pre-push` (بوابة audit) | موجود — يشغّل `npm run audit` + `audit:gate` فقط، **لا يفحص .env أو الأسرار** ❌ |
| `scripts/install-git-hooks.sh` | موجود — يثبّت pre-push فقط، **لا pre-commit** ❌ |
| `.husky/pre-commit` | **غير موجود** ❌ |
| HIBP على المصادقة | غير مفعّل ❌ |

النقاط الثلاث المطلوبة كلها لها فجوات حقيقية → الخطة صحيحة وضرورية.

## التغييرات

### 1) `.husky/pre-commit` (ملف جديد)
يمنع `git commit` إذا:
- staged يحوي `.env` أو `.env.*` (ما عدا `.env.example`) عبر `git diff --cached --name-only --diff-filter=ACM`.
- diff المُجهَّز يحوي أنماط أسرار: `SUPABASE_SERVICE_ROLE_KEY`، JWT بدور `service_role` (`eyJ...` مع decode سريع للـ payload عبر grep)، `sk_live_`، `sk_test_`، `ghp_`، `gho_`، `xox[bpars]-`، `AKIA[0-9A-Z]{16}`، `-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----`.
- يعرض رسائل عربية واضحة + أمر العلاج (`git rm --cached <file>` أو `git restore --staged`).
- مخرج طوارئ: `git commit --no-verify`.

### 2) `.husky/pre-push` (تحديث)
إضافة فحص أولي **قبل** بوابة audit الحالية:
```bash
TRACKED_ENV=$(git ls-files | grep -E '^\.env(\.|$)' | grep -v '\.example$' || true)
[ -n "$TRACKED_ENV" ] && { echo "✗ .env متعقّب: $TRACKED_ENV"; exit 1; }
```
يطابق سلوك CI تماماً → فشل محلي مبكر بدل انتظار CI.

### 3) `scripts/install-git-hooks.sh` (تحديث)
نسخ `pre-commit` إلى `.git/hooks/pre-commit` (بنفس نمط pre-push الحالي) + `chmod +x`.

### 4) إعدادات المصادقة — تفعيل HIBP
استدعاء `supabase--configure_auth` بـ:
- `password_hibp_enabled: true` ← المطلوب
- `disable_signup: false` (الإبقاء على الحالي)
- `auto_confirm_email: false` (الإبقاء — التحقق إلزامي حسب قواعد المشروع)
- `external_anonymous_users_enabled: false` (الإبقاء)

### 5) توثيق
إضافة قسم قصير في `CONTRIBUTING.md` يشرح:
- تثبيت hooks محلياً: `bash scripts/install-git-hooks.sh`
- ما يحجبه pre-commit/pre-push
- مخرج الطوارئ `--no-verify` ومتى يُستخدم

## ملفات بدون مساس
- `.env`, `supabase/config.toml`, `src/integrations/supabase/{client,types}.ts` (محمية)
- `.github/workflows/ci.yml` (الحماية موجودة بالفعل ومطابقة لما سنضيفه محلياً)
- أي كود UI أو منطق عمل

## التحقق بعد التنفيذ
1. `bash scripts/install-git-hooks.sh` → التحقق من وجود `.git/hooks/pre-commit`.
2. اختبار سلبي: `git add .env.test && git commit -m x` → يجب أن يُرفض.
3. اختبار إيجابي: commit عادي بدون أسرار → يمر.
4. التحقق من HIBP عبر `supabase--configure_auth` (يعيد الحالة الجديدة).

## الخطر والتكلفة
- لا تأثير على المستخدمين النهائيين (HIBP يفحص فقط كلمات مرور جديدة/مغيَّرة عند التسجيل).
- لا تأثير على البناء أو CI (الفحوصات محلية وقت commit/push).
- المطورون قد يحتاجون تشغيل `scripts/install-git-hooks.sh` مرة واحدة → يُذكر في CONTRIBUTING.
