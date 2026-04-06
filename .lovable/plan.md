
# تقرير تدقيق الكود — النظافة والتكرارات والكود الميت

## ✅ نقاط قوة (لا تغيير مطلوب)

1. **EMAIL_REGEX موحّد** — تم توحيده في `src/utils/validation.ts` ويُستورد من 3 ملفات ✅
2. **لا يوجد TODO/FIXME/HACK** في الكود ✅
3. **لا يوجد console.log أو debugger** متروك ✅
4. **لا تكرار مكونات** — كل مكون له دور واضح ✅

---

## 🗑️ كود ميت — ملفات غير مستخدمة (9 ملفات)

### مكونات UI غير مستخدمة (3)
| الملف | السبب |
|-------|-------|
| `src/components/ui/avatar.tsx` | لا يُستورد من أي مكان |
| `src/components/ui/command.tsx` | لا يُستورد من أي مكان |
| `src/components/ui/drawer.tsx` | لا يُستورد من أي مكان |

### Hooks غير مستخدمة (5)
| الملف | السبب |
|-------|-------|
| `src/hooks/ui/useFieldErrors.ts` | أُنشئ في الطوبة ٣ لكن لم يُدمج بعد في LoginForm/SignupForm |
| `src/hooks/ui/useDebounce.ts` | لا يُستورد من أي مكون |
| `src/hooks/ui/useSafeStorage.ts` | لا يُستورد من أي مكون |
| `src/hooks/ui/useStableCallback.ts` | لا يُستورد من أي مكون |
| `src/hooks/data/financial/useDashboardKpis.ts` | لا يُستورد — ربما استُبدل بـ `get_dashboard_kpis` RPC مباشر |
| `src/hooks/data/financial/useFiscalYearSummary.ts` | لا يُستورد — ربما استُبدل بـ view |

---

## 📋 خطة التنفيذ المقترحة

### المرحلة 1: حذف الكود الميت الآمن (بدون أثر جانبي)
- حذف `avatar.tsx`, `command.tsx`, `drawer.tsx` (مكونات UI غير مستخدمة)
- حذف `useDebounce.ts`, `useSafeStorage.ts`, `useStableCallback.ts` (hooks يتيمة)
- حذف `useDashboardKpis.ts`, `useFiscalYearSummary.ts` (hooks مالية بديلة موجودة)

### المرحلة 2: قرار بشأن useFieldErrors
- **خيار أ**: دمجه في LoginForm/SignupForm (إكمال الطوبة ٣)
- **خيار ب**: حذفه إذا لم يعد مطلوباً

### ⚠️ ملاحظة
- لن نحذف أي ملف يُصدّر عبر `index.ts` (barrel export) دون التحقق أنه لا يُستورد عبره
- لن نمس أي ملف يعمل حالياً
