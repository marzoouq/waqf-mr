# خطة الفحص الشاملة الصارمة — كل الأدوار

## الحالة الراهنة (مُتحقّقة)
- **Vitest**: 193 ملف / 1686 اختبار → كلها ناجحة ✅
- **Security scan**: 0 ملاحظات في جميع الماسحات (agent_security / connector / supabase / supabase_lov) ✅
- **Supabase linter**: 72 تحذير — جميعها ضمن allowlist موثّقة سابقاً (SECURITY DEFINER + Public bucket مبرّر)
- **System Diagnostics** (من جلسة سابقة): 3 بنود تحتاج معالجة → `zatca_unsubmitted`, `ui_csp`, `sec_notification`

## نطاق الفحص (5 طبقات)

### الطبقة 1 — لوحة الناظر (admin)
- `src/pages/dashboard/*` (16 صفحة) + `src/hooks/page/admin/*`
- التحقق: صلاحيات إقفال السنة، تعديل السنوات المقفلة، إدارة المستخدمين، إعدادات النظام، ZATCA، AuditLog
- اختبارات سلوكية في المتصفح: تسجيل دخول كناظر → فحص كل قسم (Properties/Contracts/Income/Expenses/Distribution/Settings)

### الطبقة 2 — لوحة المحاسب (accountant)
- التحقق من فلترة Waqf Revenue (mem://security/access-control/accountant-dashboard-filtering)
- منع الوصول إلى: إقفال السنة، إدارة المستخدمين، الإعدادات الحساسة
- اختبار CRUD مالي بدون صلاحيات الناظر

### الطبقة 3 — لوحة المستفيد (beneficiary)
- `src/pages/beneficiary/*` (15 صفحة) + `src/hooks/page/beneficiary/*`
- التحقق: عزل البيانات (beneficiaryIsolation)، عرض الحصة الصحيح، طلبات السلف، الإفصاح
- التحقق من Negative Value Guards وLargest Remainder
- اختبار في المتصفح: عرض MyShare/Carryforward/Advances/Notifications

### الطبقة 4 — الفحص الأمني المتعمّق
- إعادة تشغيل `security--run_security_scan` (الحالي قديم — up_to_date=false)
- إعادة `supabase--linter` ومطابقة الـ72 تحذير مع allowlist (`docs/security/security-definer-allowlist.md`)
- فحص RLS يدوياً عبر psql على الجداول الحرجة: `invoices/expenses/distributions/user_roles/audit_log/webauthn_credentials`
- التحقق من Edge Functions الـ11: `getUser()` وعدم استخدام `getSession()`/service-role bypass
- مراجعة `guard-signup` و`webauthn` و`admin-manage-users` (handlers)

### الطبقة 5 — التشخيص التشغيلي
- معالجة الـ3 ملاحظات السابقة من System Diagnostics:
  1. `zatca_unsubmitted` → downgrade إلى `info` عند غياب شهادة نشطة
  2. `ui_csp` → إضافة meta CSP في `index.html`
  3. `sec_notification` → توثيق فقط (سلوك متصفح)
- فحص `cloud_status` و`edge_function_logs` للأخطاء الحديثة

## التنفيذ (مراحل متسلسلة)

```text
المرحلة 1: إعادة تشغيل الفحوصات الحيّة
  ├── security--run_security_scan
  ├── supabase--linter (مطابقة allowlist)
  ├── cloud_status + edge_function_logs (آخر 24h)
  └── bunx vitest run (إعادة تأكيد 1686/1686)

المرحلة 2: فحص قاعدة البيانات (read_query)
  ├── RLS على 28 جدول → التأكد من تفعيلها
  ├── دوال SECURITY DEFINER → التأكد من مطابقتها allowlist
  └── التحقق من user_roles (لا تكرار، لا أدوار يتيمة)

المرحلة 3: فحص الكود الثابت
  ├── grep على console.log / localStorage('fiscal_year') / jwt_role
  ├── grep على supabase خام داخل pages/ (ضد الـ Page Hook Pattern)
  └── فحص حجم الملفات (≤200 سطر للمكونات)

المرحلة 4: اختبار سلوكي بالمتصفح (3 أدوار)
  ├── ناظر: /dashboard → سير عقد→فاتورة→تحصيل→توزيع
  ├── محاسب: التحقق من الأقسام المخفية
  └── مستفيد: /beneficiary → عرض الحصة + طلب سلفة

المرحلة 5: إصلاح الملاحظات (بعد موافقة)
  ├── src/utils/diagnostics/checks/zatca.ts (downgrade منطق)
  ├── index.html (meta CSP)
  └── تحديث security_memory + allowlist إن لزم
```

## مخرجات الخطة
- تقرير نهائي بصيغة جدول: الطبقة | عدد البنود المفحوصة | نجاح | تحذير | فشل | إجراء
- قائمة إصلاحات مرتبة بالأولوية (Critical → Info)
- تحديث `mem://security/*` و`security-memory` بأي اكتشاف جديد

## ما هو **خارج** النطاق (للحماية)
- لن أعدّل: `AuthContext.tsx`, `ProtectedRoute.tsx`, `client.ts`, `types.ts`, `config.toml`, `.env`
- لن أُعطّل أي اختبار قائم
- لن أعدّل سياسات RLS دون موافقة صريحة على الـ migration
- لن أغيّر `verify_jwt = false` (مقصود)

## ملاحظة فنية للناظر
الـ72 تحذير من supabase linter كلها من نوع SECURITY DEFINER على دوال داخلية مبرّرة (مثل `has_role`, `is_fiscal_year_accessible`, `execute_distribution`) — تركها مقصود لأن الـ RESTRICTIVE RLS أعلاها يحجب الوصول. الـ allowlist موثّق ومُحدَّث.

هل أبدأ التنفيذ؟
