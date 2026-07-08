# قرار: حذف `bun.lock`

## المبرر

- `package.json` يعلن صراحةً: `"packageManager": "npm@11.6.2"`
- كل السكربتات والـ CI تعتمد `npm` (لا يوجد `bun install` في أي workflow)
- `package-lock.json` = مصدر الحقيقة الوحيد للتبعيات
- وجود `bun.lock` (337KB) بجانب `package-lock.json` (452KB) يخلق:
  - خطر drift إذا شغّل أحد `bun install` عن طريق الخطأ
  - ازدواجية صيانة عند كل تحديث تبعيات
  - إشارة مضلِّلة لأدوات الفحص/CI

**القرار: احذف `bun.lock`.**

## خطوات التنفيذ

1. حذف الملف من نظام الملفات:
   ```bash
   rm bun.lock
   ```
2. تحديث `.gitignore` لإضافة `bun.lock` و `bun.lockb` (حماية مستقبلية):
   ```
   bun.lock
   bun.lockb
   ```
3. التحقق النهائي:
   ```bash
   ls bun.lock 2>&1                          # لا وجود له
   node -p "require('./package.json').version"
   node -p "require('./package-lock.json').version"
   node scripts/dependency-drift-check.mjs
   ```

## خارج النطاق

- `git rm --cached .env` (يبقى بيد المالك — Git stateful)
- أي تحديث تبعيات فعلي
