

# إصلاح البندين المتبقيين — الوصول إلى 10/10

---

## F-01: استبدال `as never` بأنواع آمنة

### `src/hooks/useCrudFactory.ts` (3 مواضع)

استبدال `as never` بتحويلات أكثر دقة باستخدام `Parameters` type:

| السطر | الحالي | الجديد |
|-------|--------|--------|
| 99 | `payload as never` | `payload as Tables[T]['Insert']` |
| 127 | `payload as never` | `payload as Tables[T]['Update']` |
| 128 | `'id' as never` | `'id' as string & keyof Tables[T]['Row']` |
| 156 | `'id' as never` | `'id' as string & keyof Tables[T]['Row']` |

### `src/hooks/useAnnualReport.ts` (3 مواضع)

هن