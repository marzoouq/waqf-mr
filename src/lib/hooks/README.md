# `src/lib/hooks/` — React Compiler Helpers

هوكات بنية تحتية تقنية (technical infrastructure) تحلّ مشاكل React Compiler
ولوازم النقاء (purity rules)، وليست هوكات منطق أعمال.

## لماذا `lib/hooks/` وليس `src/hooks/`؟

`src/hooks/` يحوي هوكات **منطق المشروع** (auth, data, financial, page, ui).
`lib/hooks/` يحوي **أدوات React عامة** لا علاقة لها بالنطاق (domain):

- لا تستدعي Supabase
- لا تعرف بالأدوار أو السنة المالية
- قابلة للنقل إلى أي مشروع React آخر دون تعديل

هذا يطابق مبدأ `lib-vs-utils-boundary`: `lib/` للبنية التحتية ذات الحالة،
لكن هنا الحالة تقنية بحتة (refs, intervals) لا حالة بيانات.

## الهوكات المتاحة

| الهوك | الغرض |
|-------|-------|
| `useStableRef` | يحتفظ بمرجع ثابت لآخر قيمة دون كسر قواعد React Compiler (التعيين داخل `useEffect` بدلاً من render body) |
| `useNowClock` | يوفّر `Date.now()` متحدّث دورياً عبر `useState/useEffect` بدلاً من استدعاء `Date.now()` في render body (يحلّ `react-hooks/purity`) |

## متى تضيف هوكاً هنا؟

أضف هنا فقط إذا كان الهوك:
1. يحلّ مشكلة React Compiler / lint عامة
2. لا يعرف بنطاق المشروع (وقف، مالية، عقود)
3. مستقل عن Supabase والخدمات الخارجية

غير ذلك ضعه في `src/hooks/<category>/`.
