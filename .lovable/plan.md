
## خطة P0 — إصلاح أخطاء React Hooks الحرجة

### المرحلة 1: استكشاف الأخطاء
تشغيل ESLint للحصول على القائمة الدقيقة للأخطاء وأماكنها قبل البدء بأي إصلاح.

### المرحلة 2: إصلاح `rules-of-hooks` (الخطأ الواحد)
هذا أعلى أولوية — يكسر runtime مباشرة. عادةً يكون hook مُستدعى داخل condition أو callback.

**نمط الإصلاح**:
```ts
// ❌ خطأ
if (cond) {
  const x = useFoo();
}

// ✅ صحيح
const x = useFoo();
if (cond) { /* use x */ }
```

### المرحلة 3: إصلاح `set-state-in-effect` (16 خطأ — موجة DashboardLayout + useBeneficiaryMessages)

السبب: React Compiler يرفض `setState` داخل `useEffect` بدون مبرر — يسبب re-render إضافي وأحياناً loops.

**أنماط الإصلاح المتاحة** (حسب الحالة):

| النمط | متى | الحل |
|-------|-----|------|
| **مشتق من props/state** | القيمة محسوبة من inputs | `useMemo` بدلاً من `useState + useEffect` |
| **sync مع external store** | اشتراك realtime/event | `useSyncExternalStore` أو callback ref |
| **initialization من prop** | تعيين أولي فقط | lazy initial state: `useState(() => derive(prop))` |
| **derived + reset key** | يعتمد على prop يتغير | إعادة mount عبر `key=` بدل effect |
| **حقاً يحتاج side-effect** | لا بديل | `useEffectEvent` أو dependency cleanup |

### المرحلة 4: التحقق
- `npx eslint` على الملفات المتأثرة → 0 أخطاء P0
- `vitest run` على الاختبارات المتأثرة (DashboardLayout, useBeneficiaryMessages) → اخضر
- لا تغيير في السلوك المرئي

### الضمانات
- ✅ لا تعديل على ملفات الإنتاج خارج الأخطاء المُحددة
- ✅ كل إصلاح يحافظ على نفس السلوك (no behavioral changes)
- ✅ التزام بـ logger بدلاً من console
- ✅ لا تعديل على ملفات المصادقة أو الملفات المحمية

### الخطوة التالية
بعد المسح، سأعرض القائمة الدقيقة (file:line + نوع الخطأ) ثم أبدأ الإصلاح ملف-بـ-ملف بشكل متوازي حيث آمن.
