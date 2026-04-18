

## موجة P6 — تنظيف ميت مؤكَّد (تم التحقق جنائياً)

### التحقق المُنجَز قبل الخطة
| الملف | المستهلكون الحقيقيون | حالة |
|---|---|---|
| `src/components/ui/form.tsx` | 0 | ✅ ميت |
| `src/components/ui/pagination.tsx` | 0 | ✅ ميت |
| `src/components/ui/sidebar.tsx` | 0 | ✅ ميت (641 سطراً) |
| `src/components/ui/sheet.tsx` | فقط `sidebar.tsx` (الميت نفسه) | ✅ ميت بعد حذف sidebar |
| `react-hook-form` | فقط داخل `form.tsx` + إشارة chunking في `vite.config.ts` | ✅ يمكن إزالته |
| `src/hooks/data/dashboard/index.ts` | 0 | ✅ ميت |

### الخطوات (بالترتيب)

**1. حذف 5 ملفات يتيمة مؤكَّدة:**
- `src/components/ui/form.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sheet.tsx` (بعد حذف sidebar الذي يستهلكه)
- `src/hooks/data/dashboard/index.ts`

**2. تنظيف `vite.config.ts` (السطر 185):**
- إزالة `react-hook-form` و `@hookform/` من قاعدة chunking `vendor-form` (الإبقاء على `zod` فقط أو دمج zod في chunk آخر)

**3. إزالة التبعيات من `package.json`:**
- `react-hook-form`
- `@hookform/resolvers` (إذا كان موجوداً)

**4. التحقق النهائي:**
- `npx tsc --noEmit` → 0 أخطاء
- `npx eslint src` → 0 أخطاء
- `npm run build` → نجاح

### الضمانات
- ✅ لا لمس لـ AuthContext / ProtectedRoute / SecurityGuard / supabase files
- ✅ لا تغيير سلوكي — كل الحذف على ملفات بـ 0 مستهلك حقيقي
- ✅ ملفات `@/types/database` (78 ملف) **لا تُلمس** في هذه الموجة — مؤجَّلة لـ P7 منفصلة

### النتيجة المتوقعة
- −5 ملفات مصدر
- −52KB من bundle (`react-hook-form` + `@hookform/resolvers`)
- 0 انحدار سلوكي
- baseline `0 ESLint / 0 TS / build pass` محفوظ

### ما **لن** يُنفَّذ في هذه الموجة (مؤجَّل)
- P7: هجرة 78 ملف من `@/types/database` → `@/types` ثم حذف الـ shim
- P8: توحيد `MONTH_NAMES` + تنقية PDF helpers المكررة
- P9: تقسيم ملفات > 200 سطر
- P10: فحص backend الجنائي (RLS + Edge Functions)

