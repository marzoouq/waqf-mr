# src/hooks/

هوكات React الموحّدة للمشروع، مقسّمة حسب المسؤولية لتطبيق نمط فصل الطبقات (Layered Architecture).

## الهيكل

```
hooks/
├── auth/        — مصادقة، أدوار، WebAuthn، إدارة المستخدمين
├── data/        — استعلامات Supabase موحّدة (CRUD + caching)
├── financial/   — حسابات مالية مشتركة (مشتقة من data/)
├── page/        — منطق صفحات كامل (ينظّم data + financial + UI state)
└── ui/          — هوكات UI عامة (toast, debounce, media query, ...)
```

## v7 Layered Architecture

المرجع الرسمي: `mem://technical/architecture/core-modularization-standard-v7`.

### اتجاه التبعيات (one-way)

```
pages/  →  hooks/page/  →  hooks/financial/  →  hooks/data/  →  lib/services/  →  supabase
                       ↘  hooks/auth/      ↗
                       ↘  hooks/ui/
```

**ممنوع** أي تبعية عكسية:
- ❌ `hooks/data/` يستورد من `hooks/page/`
- ❌ `hooks/financial/` يستورد `supabase` مباشرة
- ❌ `hooks/page/` يستدعي `supabase.from(...)` — يجب أن يمرّ عبر `hooks/data/`
- ❌ `pages/` تحتوي على منطق أعمال — يجب أن تكون logic-less

## القواعد

| المجلد | المسؤولية | يستهلك | لا يستهلك |
|--------|-----------|--------|-----------|
| `auth/` | جلسات وأدوار | Supabase, AuthContext | UI components |
| `data/` | استعلامات DB | Supabase, queryClient | UI state, navigation |
| `financial/` | حسابات مشتقة | `data/` | استعلامات DB مباشرة |
| `page/` | منطق صفحة كامل | `data/`, `financial/`, `auth/` | DOM، `document.*`، `supabase` مباشرة |
| `ui/` | تأثيرات DOM | React, browser APIs | Supabase |

## نمط Page Hook

كل صفحة في `pages/` يجب أن تكون **logic-less** — كل المنطق ينتقل إلى hook مقابل في `hooks/page/<role>/<page>.ts`.

مثال:
```tsx
// pages/admin/PropertiesPage.tsx
export default function PropertiesPage() {
  const ctx = usePropertiesPage();   // ← كل المنطق هنا
  return <PropertiesView {...ctx} />; // ← UI خالص
}
```

## استخراج Side-Effects من Context

عند الحاجة لمنطق تنظيف مشترك (signOut, idle logout, session expiry)، استخرج إلى hook مخصّص بدل تكرار الكود في Context.

**نموذج معتمد**: `hooks/auth/useAuthCleanup.ts` — يوفّر `performCleanup()` يُستخدم في:
- `AuthContext.signOut()` كمسار افتراضي
- `IdleTimeoutManager` عند فشل `signOut` (دفاعياً)

هذا يضمن سلوكاً موحّداً ويسهّل الاختبار (mock واحد بدل اثنين).

## الاختبارات

- اختبارات الهوك مُوطّنة بجوار الكود (`useFoo.test.ts` بجانب `useFoo.ts`).
- الهوكات المالية الحرجة (distribution, advance, fiscal closure) لها تغطية كاملة.
- Vitest + `@testing-library/react` + `renderHook`.
