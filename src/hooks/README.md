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

## القواعد

| المجلد | المسؤولية | يستهلك | لا يستهلك |
|--------|-----------|--------|-----------|
| `auth/` | جلسات وأدوار | Supabase, AuthContext | UI components |
| `data/` | استعلامات DB | Supabase, queryClient | UI state, navigation |
| `financial/` | حسابات مشتقة | `data/` | استعلامات DB مباشرة |
| `page/` | منطق صفحة كامل | `data/`, `financial/`, `auth/` | DOM، `document.*` |
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

انظر `mem://technical/architecture/core-modularization-standard-v7` لتفاصيل المعمارية.

## الاختبارات

- اختبارات الهوك مُوطّنة بجوار الكود (`useFoo.test.ts` بجانب `useFoo.ts`).
- الهوكات المالية الحرجة (distribution, advance, fiscal closure) لها تغطية كاملة.
- Vitest + `@testing-library/react` + `renderHook`.
