

# تغيير logger.warn إلى logger.info في fetchRole

## الملف المتأثر
`src/contexts/AuthContext.tsx`

## التغييرات (5 مواقع)

| السطر | قبل | بعد |
|-------|------|------|
| 106 | `logger.warn('[Auth] fetchRole started for user:', user.id)` | `logger.info(...)` |
| 111 | `logger.warn('[Auth] fetchRole timeout after 3s, forcing loading=false')` | `logger.info(...)` |
| 119 | `logger.warn('[Auth] fetchRole aborted (stale)')` | `logger.info(...)` |
| 134 | `logger.warn('[Auth] fetchRole success:', data.role, ...)` | `logger.info(...)` |
| 157 | `logger.warn('[Auth] fetchRole failed after all retries', ...)` | `logger.info(...)` |

## السبب
هذه أحداث تشغيلية عادية وليست تحذيرات. استخدام `warn` يلوّث الـ console في بيئة التطوير بتحذيرات وهمية.

