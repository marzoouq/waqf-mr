# تنفيذ المرحلة A (P0) — توحيد حساب الحصة بين الناظر والمستفيد

## ما تم
- **Migration**: `get_beneficiary_dashboard` تحسب الآن `available_amount` و `my_share` للسنة النشطة بنفس صيغة `get_dashboard_full_summary` (`waqf_revenue − waqf_corpus_manual`)، مع علم `my_share_is_estimated = true` والشارة في الواجهة.
- إضافة `total_received` لنفس الدالة (تطابق `types.ts`).
- حماية `GREATEST(0, ...)` ضد القيم السالبة.
- `useMyShare`: تم التحقق أن المنطق الحالي (تقبل `0` من الخادم) صحيح بعد إصلاح RPC — لا حاجة للتعديل.

## نتائج التحقق
- 78/78 اختبار في `hooks/domain/financial/` يمر.
- التحذيرات الأمنية الـ42 موجودة مسبقاً (SECURITY DEFINER functions) — ليست ناتجة عن هذا التعديل.

## ما تبقى (مراحل B/C/D من التقرير)
PRs منفصلة عند الحاجة — لا تنفّذ ضمن هذه الموجة.
