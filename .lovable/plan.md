## نتيجة التحقق المباشر على الكود

- `bun.lock` موجود فعلياً (337KB) رغم `packageManager: "npm@11.6.2"` — يجب حذفه.
- `.gitignore` يحوي `bun.lock` و `bun.lockb` بالفعل (سطران 32-33) — لا حاجة لتعديله.
- `.env` ما زال متعقّباً (`git ls-files` أرجعه) — يحتاج تدخّل المالك.
- Drift مؤكد: `package.json = 3.0.372` بينما `package-lock.json = 3.0.371` في الجذر و `packages[""]`.
- Edge Functions: `README.md` و `SECURITY.md` كلاهما 22 = الفعلي 22 — لا تناقض حالي (خلافاً للتقرير الخارجي).
- `noFallthroughCasesInSwitch`: معرّف فقط في `tsconfig.base.json` بقيمة `true`، ولا يوجد override في `app` أو `node` — لا تناقض حالي (خلافاً للتقرير الخارجي).
- `vitest.config.ts` allowlist محدود ومبرَّر لكل نمط — ليس blocker.

## خطة التنفيذ (بعد الاعتماد)

1. حذف `bun.lock`: `rm -f bun.lock`.
2. مزامنة `package-lock.json` مع 3.0.372: `npm install --package-lock-only --ignore-scripts`.
3. تشغيل التحقق النهائي:
   - `test ! -f bun.lock`
   - قراءة الإصدارات الثلاثة والتأكد من تطابقها.
   - `node scripts/dependency-drift-check.mjs`
   - `node scripts/count-edge-functions.mjs --check`

## خارج النطاق

- `git rm --cached .env` وأي `git commit` — أوامر Git stateful ممنوعة داخلياً، تبقى مسؤولية المالك:
  ```
  git rm --cached .env
  git commit -m "chore(security): untrack .env (keep local only)"
  ```
- لا تعديل على README/SECURITY (متطابقان)، ولا على tsconfig (لا تناقض)، ولا على vitest.config.

## معيار الإغلاق

- لا يوجد `bun.lock`.
- الإصدارات الثلاثة متطابقة على `3.0.372`.
- `dependency-drift-check.mjs` وعدّاد Edge Functions ينجحان.
- نقطة `.env` تبقى مفتوحة حتى ينفّذ المالك أمر Git يدوياً.