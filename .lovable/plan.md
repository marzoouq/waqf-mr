

# نتيجة الفحص الجنائي المنهجي — تقرير ZATCA المُقدّم

## تحقق من كل بند

### البند 1: "الرابط `/settings/zatca-electronic-invoicing` غير موجود"
**✅ صحيح** — لا يوجد route بهذا المسار في الكود. المسار الحقيقي هو `/dashboard/settings` مع تبويب ZATCA. لكن هذا **ليس مشكلة** — الرابط المذكور هو من برنامج "الأستاذ" الخارجي (المرجع)، وليس من نظامكم. لا يحتاج إصلاحاً.

### البند 2: "اسم المنشأة hardcoded"
**❌ خطأ** — سطر 103 في `zatca-xml-generator/index.ts`:
```typescript
const sellerName = escapeXml(settings.waqf_name || "");
```
القيمة تُقرأ **ديناميكياً** من `app_settings` (جدول قاعدة البيانات)، وليست hardcoded. المستخدم يحفظ `waqf_name` من صفحة الإعدادات العامة. هذا تصميم مقصود — اسم المنشأة = اسم الوقف.

### البند 3: "ZATCA-SELLER hardcoded في XML generator"
**❌ خطأ** — نفس السطر أعلاه. `seller_name` و `seller_vat` كلاهما يُقرآن من `settings` (أي من `app_settings`):
- `sellerName` ← `settings.waqf_name`
- `vatNumber` ← `settings.vat_registration_number`

لا يوجد أي hardcoding.

### البند 4: "ZATCA-FK — `invoice_chain.invoice_id` بدون FK"
**✅ كان صحيحاً — لكن تم إصلاحه** — الـ migration `20260316013519` يحتوي على:
- `validate_invoice_chain_ref()` trigger function
- `trg_validate_invoice_chain_ref` trigger على INSERT/UPDATE

هذا يتحقق من وجود `invoice_id` في الجدول المناسب (`invoices` أو `payment_invoices`) حسب `source_table`. **تم الإصلاح بالفعل.**

### البند 5: "ZATCA-WEBHOOK — لا webhook callback"
**❌ خطأ — غير مطلوب** — سطر 751-753 في `zatca-api/index.ts`:
```typescript
const newStatus = zatcaRes.ok ? (action === "clearance" ? "cleared" : "reported") : "rejected";
await admin.from(table).update({ zatca_status: newStatus }).eq("id", invoice_id);
```
ZATCA API هو **REST synchronous** — الرد يأتي فوراً والحالة تُحدَّث مباشرة. لا يوجد callback لاحق يحتاج webhook.

### البند 6: "OTP لا يُمسح بعد التهيئة"
**✅ صحيح** — سطر 347-350 في `zatca-api/index.ts`: OTP يُقرأ من `app_settings` لكن لا يوجد كود يحذفه بعد نجاح `onboard` (سطور 474-496). هذا **تحسين أمني صغير مشروع** — يجب حذف `zatca_otp_1` بعد نجاح التسجيل.

### البند 7: "لا توجد صفحة مستقلة بالمسار المذكور"
**مكرر مع البند 1** — والمسار ليس من نظامكم أصلاً.

---

## الخلاصة

| # | الادعاء | الحكم |
|---|---------|-------|
| 1 | Route مفقود | ✅ صحيح لكن غير مطلوب (مسار خارجي) |
| 2 | اسم المنشأة hardcoded | ❌ خطأ — يُقرأ من DB |
| 3 | SELLER hardcoded | ❌ خطأ — يُقرأ من DB |
| 4 | FK مفقود | ✅ كان صحيحاً — **تم إصلاحه** |
| 5 | Webhook مفقود | ❌ خطأ — ZATCA API synchronous |
| 6 | OTP لا يُمسح | ✅ **صحيح — يستحق الإصلاح** |
| 7 | صفحة مستقلة مفقودة | مكرر مع 1 |

**من أصل 7 بنود: 1 فقط يستحق الإصلاح (مسح OTP بعد التهيئة).**

---

## خطة التنفيذ — إصلاح واحد

### مسح OTP بعد نجاح Onboard
**ملف:** `supabase/functions/zatca-api/index.ts`

بعد سطر 482 (بعد `insert` الشهادة بنجاح)، إضافة:
```typescript
await admin.from("app_settings")
  .delete()
  .in("key", ["zatca_otp_1", "zatca_otp_2"]);
```

هذا يمنع إعادة استخدام OTP بعد التسجيل الناجح.

**إجمالي: ملف واحد، سطران.**

