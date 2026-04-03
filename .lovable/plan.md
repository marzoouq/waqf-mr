
## تقييم الوضع الحالي

### ✅ نقاط مُنفَّذة مسبقاً (لا تحتاج عمل):
- **النقطة 6 — Rate Limiting**: موجود فعلاً (`rate_limits` + `check_rate_limit` + `lookup-national-id` يستخدمه)
- **النقطة 7 — التشفير**: AES-256 عبر `pgcrypto` (`encrypt_pii`/`decrypt_pii`) مع trigger تلقائي على `zatca_certificates`
- **النقطة 8 — عزل بيانات المستفيدين**: RLS يفرض `user_id = auth.uid()` + عروض آمنة (`beneficiaries_safe`, `contracts_safe`) بـ `security_barrier`
- **النقطة 10 — سجل التدقيق**: جدول `audit_log` + `access_log` مع triggers ومنع التعديل/الحذف

### ⚠️ النقطة 1 — استبدال `has_role` بـ JWT claims (93 سياسة):
**تحذير أمني مهم**: `has_role` يستعلم الجدول مباشرة = إلغاء فوري للصلاحية. JWT claims = تأخر حتى انتهاء التوكن (ساعة).
**الحل المقترح (هجين)**:
- سياسات SELECT → JWT claims (أداء أسرع، المخاطرة مقبولة)
- سياسات INSERT/UPDATE/DELETE → إبقاء `has_role` (أمان الكتابة أولوية)
- إنشاء دالة مساعدة `jwt_role()` لتبسيط الصياغة

### 🔧 نقاط تحتاج تنفيذ:

**النقطة 2 — فهارس FK المفقودة**: فقط 2 من 39:
- `account_categories.parent_id`
- `support_tickets.assigned_to`

**النقطة 3 — عرض ملخص مالي**:
- `v_fiscal_year_summary`: إجماليات الإيرادات/المصروفات/التوزيعات لكل سنة مالية

**النقطة 4 — RPC لمؤشرات الأداء**:
- `get_dashboard_kpis(p_fiscal_year_id)`: يُعيد KPIs محسوبة server-side

**النقطة 5 — SecurityGuard.tsx**:
المكون خفيف (4 event listeners فقط على `[data-sensitive]`) ويحمي بيانات حساسة في `BeneficiaryCard.tsx`. **أنصح بإبقائه** لكن القرار لك.

**النقطة 9 — منع الاستعلامات المفتوحة**:
- مراجعة وإضافة `.limit()` لكل استعلام بدون حد
