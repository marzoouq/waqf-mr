# خدمات البيانات (Services)

طبقة بنية تحتية ذات حالة (stateful) تتعامل مع Supabase والخدمات الخارجية.
يستخدمها `hooks/data/` و `hooks/page/` — لا تُستدعى مباشرة من `pages/` أو `components/`.

## الخدمات المتاحة

| الخدمة | المسؤولية |
|--------|-----------|
| `accessLogService` | تسجيل أحداث الوصول والمراجعة في `access_log` |
| `advanceService` | منطق طلبات السلف وحدودها وترحيلها |
| `dataFetcher` | أدوات جلب موحّدة (pagination، fetchAll حتى 2000 سجل) |
| `diagnosticsService` | فحوصات صحة النظام (DB connectivity، RLS، Edge Functions) |
| `fiscalYearService` | عمليات السنة المالية (إقفال، إعادة فتح، snapshots) |
| `invoiceStorageService` | رفع وتنزيل ملفات الفواتير من Supabase Storage |
| `notificationService` | إنشاء وبثّ الإشعارات للمستخدمين والأدوار |
| `securityService` | تشفير PII، فحص rate limits، حماية الأدوار |
| `zatcaService` | تكامل ZATCA (Onboard، Report، QR، ICV chain) |

## القاعدة

- ✅ مسموح: استيراد `supabase`, `logger`, تخزين، Edge Functions
- ❌ ممنوع: استيراد `react`, `sonner toast`, مكونات UI
- ❌ ممنوع: state حسب جلسة المستخدم — استخدم `hooks/` لذلك

راجع `src/lib/README.md` للحدود الكاملة بين `lib/` و `utils/`.
