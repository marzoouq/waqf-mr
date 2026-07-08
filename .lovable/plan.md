# Runbook الإغلاق النهائي — نسخة تنفيذية

## الحالة الفعلية المُتحقَّق منها الآن

```
package.json          = 3.0.369   ← تغيّر مجدداً
package-lock.json     = 3.0.368
lock.packages[""]     = 3.0.368
.gitignore            = يحوي .env و .env.*  ✓
git ls-files .env     = tracked  ✗ (المشكلة الحرجة)
```

**⚠️ drift جديد ظهر**: `package.json` قفز إلى `3.0.369` (على الأرجح من workflow `auto-version.yml`) بينما lockfile ما زال `3.0.368`. لذلك الخطوة رقم 2 لم تعد "تأكيد فقط" — تحتاج إعادة مزامنة.

---

## 1) إزالة `.env` من التتبع (المالك فقط — Git stateful)

```bash
git rm --cached .env
git commit -m "chore(security): untrack .env (keep local only)"
git ls-files --error-unmatch .env   # يجب أن يفشل exit≠0
```

**حوكمة أمنية موثَّقة:**
- المفاتيح الحالية في `.env` كلها publishable/anon (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID).
- **لا يوجد** `SUPABASE_SERVICE_ROLE_KEY` أو `sk_live_*` أو `ghp_*` أو أي أسرار حقيقية في التاريخ (تم التحقق من محتوى `.env` الحالي في context).
- **لا حاجة لتدوير مفاتيح** — إزالة من التتبع فقط للانضباط.

---

## 2) إعادة مزامنة lockfile (الوكيل — بعد الانتقال لوضع البناء)

```bash
npm install --package-lock-only --ignore-scripts
node scripts/dependency-drift-check.mjs   # ✅ Version sync OK (3.0.369)
```

---

## 3) توحيد عدد Edge Functions في الوثائق (الوكيل)

```bash
node scripts/count-edge-functions.mjs --write
node scripts/count-edge-functions.mjs --check
```

يحدّث markers في `README.md` و `SECURITY.md` تلقائياً.

---

## 4) توثيق سياسة TS (الوكيل — تعليق فقط)

`noFallthroughCasesInSwitch` موحَّد فعلياً من `tsconfig.base.json`. الاختلاف الوحيد في `tsconfig.node.json` هو `noUnusedLocals/Parameters = false` — أُضيف تعليقاً واضحاً يشرح السبب (متغيّرات env مشروطة في `vite.config.ts`). لا تغيير سلوكي.

---

## 5) تقليص allowlist في Vitest — **PR منفصل بعد الإغلاق الأمني**

**تعديل حسب توصيتك:** لا نؤخر إغلاق `.env` + lockfile بسببه. سيُنفَّذ في PR مستقل بعنوان `test(vitest): tighten console suppression allowlist`. الأنماط المرشحة للحذف: `useAuth called outside AuthProvider`, `[ProtectedRoute]` (نقلها إلى `vi.spyOn` داخل الاختبارات المعنية).

---

## 6) Checklist القبول قبل push (نسخة copy/paste)

```bash
# 1) النسخة الفعلية (مصدر الحقيقة الوحيد)
node -p "require('./package.json').version"
node -p "require('./package-lock.json').version"
node -p "require('./package-lock.json').packages[''].version"

# 2) drift
node scripts/dependency-drift-check.mjs
node scripts/count-edge-functions.mjs --check

# 3) .env untracked
! git ls-files --error-unmatch .env

# 4) typecheck + lint (حسب CONTRIBUTING.md)
npx tsc --noEmit
npm run lint

# 5) tests
npx vitest run

# 6) build
npm run build

# 7) البوابة الرسمية
npm run audit
npm run audit:gate
```

**النجاح =** كل الأوامر exit 0، والأمر رقم 3 exit ≠ 0.

---

## ترتيب التنفيذ الموصى به

1. **المالك**: نفّذ خطوة 1 (`git rm --cached .env` + commit).
2. **انتقل لوضع البناء** لأتمكن من تنفيذ 2 و 3 و 4.
3. **المالك**: نفّذ Checklist القبول (6).
4. `git push`.
5. لاحقاً: افتح PR مستقل للخطوة 5.

---

## خارج النطاق (مؤكَّد)

- محتوى `.env` أو تدوير أي مفتاح.
- `src/integrations/supabase/{client,types}.ts`, `supabase/config.toml`, ملفات المصادقة.
- تحسينات `vite.config.ts` أو ألوان `index.html`.
- workflow `auto-version.yml` (سبب drift المتكرر — يستحق مراجعة منفصلة).
