

# خطة معالجة ملاحظات الجودة #26–#40

## الفحص قبل التخطيط
- **#26** `/waqif` ليس يتيماً فعلياً (مستخدم في 9+ مواضع) → **توثيق فقط**
- **#28, #29** `DEDUP_MS = 2000` قرار منتجي → **توثيق + `__resetDedup`** للاختبارات
- **#31, #32** سلوك `logger` في Production مقصود → **توثيق فقط**
- **#34** `accountant` يُعامَل كـ admin في FiscalYearContext → **توثيق فقط**
- **#37, #38** أنواع `invoices.ts`/`advance.ts` المركّبة مفصولة بشكل مقصود → **توثيق فقط**

## الإصلاحات الفعلية

| # | إصلاح | ملف |
|---|------|-----|
| #27 | إعادة تسمية `_supabaseUrl` → `supabaseUrl` | `main.tsx` |
| #30 | إضافة `onWarning` إلى `CrudNotifications` + `__resetDedup` | `lib/notify.ts` |
| #33 | تقليل default `staleTime` من 5د إلى 60ث | `lib/queryClient.ts` |
| #35 | تصدير `*Insert`/`*Update` لكل النماذج | `types/models.ts` |
| #36 | توسعة barrel ليشمل invoices/advance/zatca/... | `types/database.ts` |
| #39/#40 | دمج sorting+filters+export في `ui.ts` (re-exports للتوافق) | `types/ui.ts` (جديد) + 3 ملفات |
| 📝 | تعليقات توثيقية | 6 ملفات (انظر أعلاه) |

## الضمانات
- صفر تغيير سلوكي على API عام — الـ re-exports تحافظ على الاستيرادات القديمة
- staleTime ↓: queries بـ `STALE_STATIC` تتجاوز الافتراضي وتحتفظ بـ 5د
- `npx tsc --noEmit` بعد التنفيذ
- لا مساس بملفات المصادقة المحمية

