
## موجة P7 — تنظيف 3 shims P1 آمن (مُتحقَّق جنائياً)

### التحقق المُنجَز
| البند | الحالة |
|---|---|
| `filterByVisibility` shim | مستهلَك في `BottomNav.tsx` + `useNavLinks.ts` فقط |
| `BENEFICIARIES_PAGE_SIZE` alias | يحتاج فحص grep قبل الحذف |
| `STALE_SETTINGS` alias | مستهلَك في 4 ملفات (useAppSettings + Read + Write + useWaqfInfo) |

### الخطوات

**1. هجرة `filterByVisibility` shim:**
- تحديث `BottomNav.tsx`: `from '@/lib/permissions/filterByVisibility'` → `from '@/utils/auth/filterByVisibility'`
- تحديث `useNavLinks.ts`: نفس التغيير
- حذف `src/lib/permissions/filterByVisibility.ts`

**2. حذف `BENEFICIARIES_PAGE_SIZE` alias:**
- فحص جميع الاستهلاكات بـ grep
- استبدال كل `BENEFICIARIES_PAGE_SIZE` → `PAGE_SIZE_BENEFICIARIES`
- حذف السطر `export const BENEFICIARIES_PAGE_SIZE = PAGE_SIZE_BENEFICIARIES;` من `src/constants/pagination.ts`

**3. حذف `STALE_SETTINGS` alias:**
- استبدال كل `STALE_SETTINGS` → `STALE_STATIC` في 4 ملفات
- حذف السطر `export const STALE_SETTINGS = STALE_STATIC;` من `src/lib/queryStaleTime.ts`

**4. التحقق النهائي:**
- `npx tsc --noEmit` → 0 أخطاء
- `npx eslint src` → 0 أخطاء
- `npm run build` → نجاح

### الضمانات
- ✅ لا لمس لـ AuthContext / ProtectedRoute / SecurityGuard / supabase files
- ✅ لا تغيير سلوكي — كل الاستبدالات alias-to-canonical (مرادفات حرفية)
- ✅ ملفات `@/types/database` (78 ملف) **لا تُلمس** — مؤجَّلة لـ P10
- ✅ PDF helpers + MONTH_NAMES + diagnostics **لا تُلمس** — مؤجَّلة لموجات لاحقة

### النتيجة المتوقعة
- −1 ملف (`filterByVisibility.ts` shim)
- −2 سطر alias مكرر
- 0 انحدار سلوكي
- baseline `0 ESLint / 0 TS / build pass` محفوظ

### مؤجَّل (لا يُنفَّذ الآن)
- P8: توحيد `MONTH_NAMES` في `constants/calendar.ts`
- P9: تنقية PDF re-exports غير المستهلكة
- P10: هجرة 78 ملف من `@/types/database` → `@/types`
- P11: فحص backend الجنائي (RLS + Edge Functions)
- P12: تقسيم ملفات > 200 سطر
