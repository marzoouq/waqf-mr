
# خطة إصلاح ESLint وتنظيف المشروع

## المشكلة
1. `eslint@^10.1.0` غير متوافق مع `eslint-plugin-react-hooks@^7.0.1` (يحتاج ESLint 9)
2. وجود ملفات وتبعيات قديمة/غير مستخدمة تثقل المشروع

---

## الخطوات

### 1. إصلاح تعارض ESLint
تعديل `package.json` — تنزيل ESLint إلى v9:
- `"eslint": "^10.1.0"` → `"eslint": "^9.27.0"`
- `"@eslint/js": "^10.0.1"` → `"@eslint/js": "^9.27.0"`

### 2. حذف تبعيات غير مستخدمة من `package.json`
| الحزمة | السبب |
|--------|-------|
| `@vitejs/plugin-react` (v6) | المشروع يستخدم `@vitejs/plugin-react-swc` فقط |
| `autoprefixer` | غير مطلوب مع Tailwind v4 (`@tailwindcss/postcss` يتولى المهمة) |
| `@tailwindcss/typography` | غير مستخدم في الكود |
| `react-is` | غير مستخدم مباشرة |

### 3. تنظيف overrides غير ضرورية
حذف overrides التي لا تحل مشاكل فعلية:
- `minimatch`, `lodash`, `dompurify`, `flatted`, `serialize-javascript`, `workbox-build`, `@rollup/plugin-terser`

### 4. حذف ملفات غير ضرورية
| الملف | السبب |
|-------|-------|
| `bun.lock` | المشروع يستخدم npm — والملف في `.gitignore` أصلاً |
| `tsconfig.app.tsbuildinfo` | ملف كاش مؤقت لا يُرفع |
| `tsconfig.node.tsbuildinfo` | ملف كاش مؤقت لا يُرفع |
| `AUDIT_REPORT_2026-03-31.md` | تقرير قديم — المشاكل المذكورة فيه تم حلها |

### 5. إضافة tsbuildinfo إلى .gitignore
إضافة `*.tsbuildinfo` لمنع رفعها مستقبلاً.

### 6. فحص الجودة
تشغيل `tsc --noEmit` + `eslint .` + `vite build` للتأكد من سلامة كل شيء بعد التغييرات.

---

## الملفات المتأثرة
- `package.json` — تعديل إصدارات + حذف تبعيات
- `.gitignore` — إضافة سطر
- حذف: `bun.lock`, `*.tsbuildinfo`, `AUDIT_REPORT_2026-03-31.md`
