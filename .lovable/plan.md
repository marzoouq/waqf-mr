## الخطة: حذف التكرار في src/types/database.ts

### المشكلة
الملف `src/types/database.ts` يحتوي 214 سطرًا من أنواع يدوية تكرر ما يولّده Supabase تلقائياً في `types.ts`. أي تغيير في الجداول يتطلب تحديثين.

### الحل
**استبدال محتوى `database.ts`** (وليس حذفه) بملف رفيع يعيد التصدير من `Tables<>` و `Enums<>`:

1. **الأنواع البسيطة** (Property, Unit, Beneficiary, Account, UserRole, Conversation, Message, Notification, FiscalYear, AuditLog, AccountCategory):
   → `export type Property = Tables<'properties'>;`

2. **الأنواع مع علاقات Join** (Contract, Income, Expense, AdvanceRequest, Distribution):
   → `export type Contract = Tables<'contracts'> & { property?: Property; unit?: Unit | null; }`

3. **AppRole**:
   → `export type AppRole = Enums<'app_role'>;`

### المزايا
- **صفر تغييرات** في الملفات الـ 69 المستوردة — نفس أسماء الأنواع ونفس مسار الاستيراد
- مصدر حقيقة واحد (Supabase auto-generated)
- أي عمود جديد يظهر تلقائياً

### الخطوات
1. إعادة كتابة `src/types/database.ts` كملف re-export رفيع
2. التحقق من البناء (npm run build)
3. تشغيل الاختبارات