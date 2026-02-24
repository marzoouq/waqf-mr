
# تشغيل جميع الاختبارات ومعالجة نتائج الفحص الأمني

## المهمة 1: تشغيل جميع اختبارات المشروع

تشغيل مجموعة الاختبارات الكاملة (~427+ اختبار) للتأكد من عدم حدوث تراجع بعد التحديثات الأمنية الخمسة:

- اختبارات الحسابات المالية (`useComputedFinancials`, `useRawFinancialData`, `accountsCalculations`)
- اختبارات CRUD (`useAccounts`, `useContracts`, `useIncome`, `useExpenses`, `useBeneficiaries`, `useProperties`, `useInvoices`, `useTenantPayments`)
- اختبارات الأمان الجديدة (`notificationRpcSecurity`, `guardSignupSecurity`, `edgeFunctionAuth`, `roles-security`)
- اختبارات المكونات (`DashboardLayout`, `ErrorBoundary`, `ProtectedRoute`, `SecurityGuard`)
- اختبارات الصفحات (`PublicPages`, `AdminDashboard`, `BeneficiaryDashboard`, جميع صفحات dashboard و beneficiary)
- اختبارات الأدوات المساعدة (`maskData`, `forensicAudit`)

## المهمة 2: تحديث نتائج الفحص الأمني القديمة

الفحص الحالي يحتوي على نتائج قديمة (outdated). سيتم:

1. **تحديث الفحص الأمني** لإعادة تقييم جميع النتائج بناءً على الإصلاحات المنفذة
2. **معالجة التحذير الجديد** "Users Could Discover Other Users Through Conversation Creation":
   - فحص سياسة RLS على جدول `conversations` — السياسة الحالية تتحقق من وجود `participant_id` في `user_roles` لكن لا تقيد من يمكنه مراسلة من
   - هذا سلوك مقبول في نظام الوقف لأن المستفيدين يحتاجون التواصل مع الناظر، والناظر يتواصل مع الجميع
   - سيتم تجاهل هذه النتيجة مع توثيق السبب

3. **التأكد من تجاهل النتائج المحلولة مسبقاً** (PII exposure, beneficiaries_safe view, إلخ)

## المهمة 3: التحقق من Edge Functions المنشورة

اختبار سريع للوظائف المعدلة:
- `lookup-national-id`: التأكد من أن البريد يُرجع محجوباً
- `guard-signup`: التأكد من أن التسجيل مرفوض (معطل حالياً)

## التفاصيل التقنية

### ترتيب التنفيذ:
1. تشغيل `vitest` على جميع ملفات الاختبار
2. إعادة تشغيل الفحص الأمني (`run_security_scan`)
3. تحديث/تجاهل النتائج القديمة بأسباب موثقة
4. اختبار Edge Functions عبر HTTP

### الملفات المتأثرة:
لا توجد تعديلات على الكود — فقط تشغيل اختبارات وتحديث حالة الفحص الأمني.
