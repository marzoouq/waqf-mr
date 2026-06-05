# خطة مراجعة شاملة للمكوّنات والتبويبات والأزرار — الناظر والمستفيد

## السياق الحالي

- **31 صفحة ناظر/محاسب** (`src/pages/dashboard/*`) + **21 صفحة مستفيد** (`src/pages/beneficiary/*`).
- المصفوفة الرسمية `audit/ui-permissions-matrix.csv` = **156 صف** (39 مسار × 4 أدوار) ومحمية بـ CI gate.
- ماسح `scripts/audit-ui-permissions.mjs` (regex، 449 ملف) يكشف 4 فئات فجوات: `GAP-NO-HANDLER`، `GAP-DEAD-LINK`، `GAP-DEAD-TAB`، `GAP-DIRECT-DB` — **النتيجة الحالية: 0 فجوة**.
- اختبارات `roleRouteAccess` و `uiPermissionsMatrix` و `permissionKeysCoverage` و `buttonHandlerAudit` خضراء (1985/1985).

## فجوات التغطية في الفحص الحالي

الماسح الحالي يلتقط الأنماط الشائعة لكن لا يُجيب صراحة عن:
1. **هل كل تبويب (Tab) داخل الصفحات يُعرض حسب الدور؟** (مثلاً تبويبات `SettingsPage` فقط للناظر؛ تبويبات `BeneficiaryDashboard` تحترم `featureVisibilityRegistry`).
2. **هل كل زر إجراء مالي حساس (إقفال سنة / حذف فاتورة مدفوعة جزئياً / تنفيذ توزيع / فتح سنة مُقفلة) محميّ بـ `usePermissionCheck` أو `RequirePermission`؟**
3. **هل كل زر داخل قوائم منسدلة (DropdownMenu/CommandItem) موصول بـ handler يحترم الدور؟**
4. **هل أزرار صفحات المستفيد (Disclosure/MyShare/Carryforward) محجوبة فعلاً عن `accountant` و `waqif`؟**

## النطاق

- **قراءة فقط** — لا تعديل واجهة، لا منطق أعمال، لا RLS، لا migrations.
- المخرَج النهائي: تقرير Markdown مفصّل + توسيع سكربت الفحص (إن لزم) ليُولّد جدول لكل صفحة.

## خطة التنفيذ (4 مراحل)

### المرحلة 1 — تشغيل المصفوفة الكاملة (تأكيد خط الأساس)
- `npm run lint:conventions` + `audit-ui-permissions` + `build-permissions-matrix` + `security-gates` + `vitest run` بشكل متوازي.
- يجب أن تظل كلها خضراء قبل المتابعة.

### المرحلة 2 — جرد آلي لكل تبويب وزرار في صفحات الناظر والمستفيد
كتابة سكربت قراءة `scripts/audit-page-controls.mjs` (لا يعدّل المشروع) يولّد `audit/page-controls-audit.csv` بأعمدة:
```
page, role_required, control_type, control_label, handler_kind, permission_gate, status
```
حيث:
- `control_type` ∈ {Tab, Button, DropdownItem, Link, FormSubmit}
- `handler_kind` ∈ {onClick, asChild, type=submit, parent-Trigger, Link-to}
- `permission_gate` = أقرب `RequirePermission` / `usePermissionCheck` / حارس مسار يحيط بالزر
- `status` ∈ {OK, WARN-NO-GATE, GAP-NO-HANDLER, GAP-ROLE-MISMATCH}

### المرحلة 3 — مراجعة يدوية للأزرار المالية الحساسة
قائمة محددة (≤15 زراً) تستحق فحصاً يدوياً مع citation `file:line`:
- إقفال/إعادة فتح سنة مالية (`FiscalYearManagement`)
- تنفيذ التوزيع (`DistributionsPage`)
- حذف فاتورة مدفوعة جزئياً (`InvoicesPage`)
- إنشاء/حذف مستخدم (`UserManagementPage`)
- تعديل صلاحيات الأدوار (`SettingsPage`)
- ZATCA onboard/renew/report
- تصدير سجل المراجعة
- التحكم بالإحصاءات العامة في الهبوط

لكل زر: تأكيد دور المسار + وجود `usePermissionCheck` + رسالة Toast عند المنع.

### المرحلة 4 — تقرير نهائي
ملف واحد `audit/role-controls-review.md` يحوي:
1. ملخص خط الأساس (الفحوصات السبعة).
2. جدول لكل صفحة من 52 صفحة (31 ناظر + 21 مستفيد): عدد التبويبات، عدد الأزرار، عدد الـ gated، الحالة.
3. الأزرار الحساسة الـ 15 مع citation.
4. أي فجوة مكتشفة (إن وُجدت) كبند عمل صريح — **بدون إصلاحها في هذه الجولة** (تنتظر موافقة منفصلة).

## الاستبعادات

- لا تعديل ملفات `routes/*` أو `permissions.ts` أو `routeRoles.ts`.
- لا إصلاح الفجوات إن وُجدت — تُسرد للموافقة لاحقاً.
- لا تفعيل/تعطيل لأي ميزة.
- لا تغيير في الملفات المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`).

## معايير القبول

- `audit/page-controls-audit.csv` يحوي صفاً لكل عنصر تحكم في الصفحات الـ 52.
- `audit/role-controls-review.md` يقدّم تقريراً نهائياً ≤ 800 سطر يكشف بوضوح: ✅ سليم / ⚠ تحذير / 🔴 فجوة.
- جميع فحوصات CI تظل خضراء.
