## المرحلة 2 — A1: ترقيات Patch آمنة فقط

### الحزم (6)

| الحزمة | من → إلى |
|--------|---------|
| `vitest` | 4.1.2 → 4.1.9 |
| `@vitest/coverage-v8` | 4.1.2 → 4.1.9 |
| `postcss` | 8.5.14 → 8.5.15 |
| `@types/react` | 19.2.14 → 19.2.17 |
| `jspdf-autotable` | 5.0.7 → 5.0.8 |
| `eslint-plugin-react-refresh` | 0.5.2 → 0.5.3 |

### الاستبعادات
- ❌ ESLint/typescript-eslint/react-hooks (Minor — مخاطر قواعد جديدة)
- ❌ vite-plugin-pwa, lovable-tagger, modern-screenshot (Minor — مخاطر runtime)
- ❌ jsdom, @types/node, globals, web-vitals, rollup-plugin-visualizer (Minor — مؤجّل)

### بوابات التحقق
1. `bun install`
2. `tsgo` — TypeScript clean
3. `bunx vitest run` — 2168/2168 يجب أن تنجح
4. `bunx eslint .` — لا زيادة في عدد الأخطاء (يبقى 0 errors / 22 warnings)

### المخاطر
🟢 منخفضة — جميعها Patch داخل نفس Minor، لا breaking changes متوقعة.

### Rollback
في حال فشل أي بوابة: استرجاع `package.json` و `bun.lockb` من git.

جاهز للتنفيذ.