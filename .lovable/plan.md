
# خطة إصلاح المشاكل المتبقية الحقيقية

بعد فحص كل الملفات المذكورة في التقرير، تبين أن معظم المشاكل (7 من 9) مُصلحة مسبقا. المشاكل الحقيقية المتبقية هي 3 فقط:

---

## المشكلة 1 -- CRITICAL: ai-assistant يستخدم serviceClient ويتجاوز RLS

**الملف:** `supabase/functions/ai-assistant/index.ts` السطر 88

**المشكلة:** `fetchWaqfData(serviceClient, ...)` يتجاوز كل سياسات RLS. مستفيد يسال المساعد الذكي عن الدخل فيحصل على بيانات السنوات غير المنشورة.

**الاصلاح:**
1. استبدال `serviceClient` بـ `userClient` في استدعاء `fetchWaqfData` (السطر 88)
2. اضافة فلتر `published` على استعلامات `accounts` و `income` و `expenses` داخل `fetchWaqfData` عندما يكون المستخدم غير admin/accountant
3. ابقاء `serviceClient` فقط للعمليات الادارية (rate_limit, user_roles)

**التفاصيل:**
- السطر 88: تغيير `fetchWaqfData(serviceClient, ...)` الى `fetchWaqfData(userClient, ...)`
- داخل `fetchWaqfData` (السطر 235-268): اضافة فلتر للسنوات المنشورة عند جلب accounts لغير الادمن
- السطور 310-360: اضافة شرط `activeFY.published` قبل جلب income/expenses لغير الادمن

---

## المشكلة 2 -- MEDIUM: PDF paid_months/12 ثابت

**الملف:** `src/utils/pdf/entities.ts` السطر 163

**المشكلة:** `${u.paid_months}/12` يعرض 12 دائما حتى للعقود الربعية (4 دفعات) او السنوية (1 دفعة).

**الاصلاح:**
- حساب عدد الدفعات الفعلي بناء على `payment_type` من بيانات العقد
- عرض `paid_months/actual_count` بدلا من `/12` الثابت

---

## المشكلة 3 -- LOW: semi_annual vs semi-annual تناقض ترميز

**الملف:** `src/utils/contractAllocation.ts` السطر 135

**المشكلة:** الكود يتحقق من `semi_annual` فقط (underscore)، لكن بعض العقود قد تكون محفوظة بـ `semi-annual` (hyphen).

**الاصلاح:**
- اضافة التحقق من كلا الصيغتين في `getPaymentCount` و `generatePaymentDueDates`

---

## ترتيب التنفيذ

1. اصلاح ai-assistant (الاهم -- ثغرة امنية حقيقية)
2. اصلاح PDF paid_months
3. اصلاح semi_annual/semi-annual

## القسم التقني

### الملفات المتاثرة:
- `supabase/functions/ai-assistant/index.ts` -- تعديل استدعاء fetchWaqfData + اضافة فلاتر النشر
- `src/utils/pdf/entities.ts` -- تعديل حساب عدد الدفعات
- `src/utils/contractAllocation.ts` -- اضافة دعم semi-annual بجانب semi_annual

### ملاحظة عن المشاكل "المفتوحة" في التقرير:
المشاكل التالية تم التحقق من اصلاحها مسبقا ولا تحتاج عملا:
- WebAuthn token_hash: مُصلح (server-side session)
- PDF fallback صامت: مُصلح (toast.error موجود)
- isEnabled localStorage: مُصلح (DB sync موجود)
- useBeneficiaries fallback: محمي بـ isAuthorized
- accounts RESTRICTIVE RLS: موجود في DB
- distributions RESTRICTIVE RLS: موجود في DB
- DEFAULT_ROLE_PERMS: موحد في rolePermissions.ts
