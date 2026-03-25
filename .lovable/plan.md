

## الخطة

### 1. إضافة `bun.lock` إلى `.gitignore` (تغيير في الكود)
**الملف:** `.gitignore`

إضافة `bun.lock` بجانب `bun.lockb` الموجودة:
```
# Bun lockfiles (not used — npm is preferred)
bun.lockb
bun.lock
```

### 2. حذف `.env` و `bun.lock` من تاريخ Git (يدوي)
هذا **خارج نطاق Lovable** — يجب تنفيذه من Terminal على جهازك:

```bash
git rm --cached .env bun.lock
git commit -m "chore: remove .env and bun.lock from tracking"
git push
```

> ملاحظة: هذا يزيلهما من التتبع فقط. لحذفهما من **كامل التاريخ**، استخدم `git filter-repo` أو `BFG Repo-Cleaner`.

