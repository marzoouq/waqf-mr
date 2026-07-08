# فحص إضافي — لوحة الناظر (كل الصفحات)

فحصت 15 صفحة داخلية للناظر بجلسة حقيقية (`alkayala3`) + قرأت الكود. جميع الصفحات تُحمَّل بدون تعطّل، لكن ظهرت مشاكل جديدة إضافة إلى الأربع في الخطة السابقة.

## 🔴 مشاكل جديدة مؤكَّدة

### 5. صفحة المستفيدين — فك تشفير معطَّل للناظر
**الشاهد:** console warning:
> `فك التشفير غير متاح، عرض البيانات المشفرة: permission denied for function get_beneficiary_decrypted`

**التحقق من قاعدة البيانات:**
```
proacl = {postgres, service_role, sandbox_exec} — لا يوجد authenticated
```

الدالة `get_beneficiary_decrypted` بلا `GRANT EXECUTE ... TO authenticated`، فالتطبيق يرجع للعرض المشفَّر (`****fA==` بدل الاسم/الهوية). النتيجة: الناظر يرى بيانات المستفيدين **بشكل مشفَّر ومقطوع** كما في اللقطة.

**الحل:** ترحيل SQL:
```sql
GRANT EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) TO authenticated;
```
مع اعتماد الدالة على `has_role(auth.uid(), 'admin')` داخلياً (يجب التحقق من المنطق قبل الترحيل).

### 6. صفحة سجل المراجعة — تحذير Fragment
**الشاهد:** console error:
> `Invalid prop 'data-state' supplied to React.Fragment. React.Fragment can only have 'key' and 'children' props.`

**السبب المُحتمل:** أحد Radix components (Tabs/Tooltip/DropdownMenu) بـ`asChild` يلفّ `<>...</>` بدلاً من عنصر HTML واحد.

**الحل:** استبدال الـ`<>...</>` بـ`<div>` أو `<span>` في المكان المُصاب — يحتاج تتبّع دقيق داخل `AuditLogPage.tsx` وشجرة `AuditLogTable`.

## 🟢 نتائج إيجابية

| الصفحة | الحالة |
|---|---|
| العقارات/العقود/الفواتير/المصروفات/الدخل | ✅ تحميل نظيف بدون أخطاء |
| التوزيعات/التقارير/الحسابات | ✅ نظيفة |
| الإعدادات/المستخدمين/الرسائل | ✅ نظيفة |
| ZATCA/التشخيصات | ✅ نظيفة |

لا توجد صفحة تعيد `err=true` من الفحص الآلي، ولا أخطاء JavaScript غير متوقعة، ولا 404/redirect غير مقصود.

## خلاصة المشاكل الكلية (الخطة السابقة + الجديدة)

| # | ملف/موضع | الشدة |
|---|-----------|-------|
| 1 | `DashboardLayout.tsx` — `inert=""` معطَّل | 🔴 |
| 2 | `PageHeaderCard.tsx` — `truncate` يقطع العناوين | 🔴 |
| 3 | `DashboardStatsGrid.tsx` — `truncate` يقطع القيم النصية | 🔴 |
| 4 | `_shared/cors.ts` — localhost محجوب (اختبار فقط) | 🟡 |
| 5 | DB — `get_beneficiary_decrypted` بلا GRANT authenticated | 🔴 |
| 6 | `AuditLogPage` — Fragment يستقبل `data-state` | 🟠 |

## خطة الإصلاح المُوسَّعة

### إصلاحات كود (Frontend)
1. `DashboardLayout.tsx:82` → `inert: true` مع كتابة صحيحة للـ prop.
2. `PageHeaderCard.tsx:39` → إزالة `truncate`، اعتماد `break-words`.
3. `DashboardStatsGrid.tsx:31` → `truncate` مشروط بـ`typeof value === 'number'` وإلا `break-words`.
4. `AuditLogPage.tsx:33-52` → استبدال `<>...</>` بـ`<div className="contents">` (يحفظ التخطيط) للتخلّص من تحذير Fragment، مع مراجعة أي child آخر مشابه.

### إصلاحات قاعدة البيانات (Migration)
5. ترحيل SQL:
```sql
GRANT EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) TO authenticated;
```
(مع تأكيد أن الدالة تتحقق داخلياً من `has_role(auth.uid(),'admin')` — إن لم تفعل، نضيف الحماية قبل الترحيل).

### إصلاح Edge Function (اختياري)
6. `_shared/cors.ts` → إضافة `http://localhost:8080` و`http://localhost:5173` للـ`ALLOWED_ORIGINS` لتسهيل الاختبار الآلي. لا يُغيّر سلوك الإنتاج.

## لن يُعدَّل

- منطق hooks اللوحة (`useAdminDashboardPage`, `useAdminDashboardData`) — نظيف
- ملفات المصادقة/RLS/`client.ts`/`types.ts`/`config.toml`
- أي صفحة عاملة بدون أخطاء

## التحقق بعد التنفيذ

- إعادة تشغيل Playwright على `/dashboard` و`/dashboard/beneficiaries` و`/dashboard/audit-log`
- التأكد من:
  - عرض "لوحة التحكم" كاملاً
  - اختفاء تحذير `inert`
  - اختفاء تحذير Fragment
  - ظهور أسماء المستفيدين بدل `****`
