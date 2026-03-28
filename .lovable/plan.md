

# تقرير الفحص الجنائي الهجين — حالة كل بند

## المنهجية
تم فحص الكود المصدري، ملفات الهجرات (migrations)، والملفات المرتبطة بشكل مباشر للتحقق من كل بند.

---

## 🔍 البنود التي "تحتاج تحقق أو migration" — النتائج

### #28 — قسمة على صفر في `validate_advance_request_amount`
**الحالة: ✅ مُنفَّذ بالفعل**
- Migration `20260327184232` يحتوي على `NULLIF` لمنع القسمة على صفر
- يوجد فحص `IF v_total_pct <= 0 THEN RAISE EXCEPTION`
- لا حاجة لأي إجراء إضافي

### #30 — `get_beneficiary_decrypted` بدون فحص ملكية المستفيد
**الحالة: ✅ مُنفَّذ بالفعل**
- Migration `20260313194456` يحتوي على فحص مزدوج:
  - `IF auth.uid() IS NULL` → رفض
  - `IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant')` → رفض
- الدالة محمية بشكل كافٍ — admin/accountant فقط يمكنهم فك التشفير

### #32 — `get_beneficiary_dashboard` fallback عند غياب `fiscal_year_id`
**الحالة: ✅ مُنفَّذ بالفعل**
- Migration `20260327180215` يحتوي على `p_fiscal_year_id uuid DEFAULT NULL`
- عند `NULL`: لا يتم جلب بيانات مالية (v_fy.id يبقى NULL)، ويعود فقط بيانات المستفيد الأساسية
- السلوك آمن ومتسق

### #36 — Index مركّب على `conversations(type, status, created_at)`
**الحالة: ❌ لم يُنفَّذ**
- لا يوجد أي `CREATE INDEX` على جدول `conversations` في أي migration
- الجدول صغير حالياً، لكن الفهرس مفيد إذا نما

### CHECK constraints على `conversations.type`
**الحالة: ❌ لم يُنفَّذ**
- لا يوجد أي CHECK أو validation trigger على عمود `type`
- القيم المستخدمة في الكود: `'chat'`, `'support'`, `'broadcast'`

### حد حجم لقيم `app_settings`
**الحالة: ❌ لم يُنفَّذ**
- لا يوجد CHECK أو trigger على طول `value` في `app_settings`
- عدد الإعدادات ثابت (~31 سطر)، الخطر منخفض جداً

---

## ⏳ البنود "القابلة للتنفيذ فوراً" — النتائج

### #24 — تحسين `useAuditLog` — جلب أعمدة محددة بدل `*`
**الحالة: ✅ مُنفَّذ بالفعل**
- السطر 61: `.select('id, table_name, operation, record_id, user_id, created_at', { count: 'exact' })`
- يجلب الأعمدة الأساسية فقط، `new_data/old_data` مستبعدة من القائمة
- تعليق واضح: "جلب الأعمدة الأساسية فقط — new_data/old_data ثقيلة ولا تُعرض في القائمة"

### #37 — إضافة `aria-label` وصفي لنجوم التقييم
**الحالة: ❌ لم يُنفَّذ**
- نجوم التقييم في `SupportTicketsTab.tsx` و `TicketDetailDialog.tsx` بدون أي `aria-label`
- مثال: `<Star key={i} className={...} />` — بدون accessibility attributes
- ملفات تحتاج تعديل: `SupportTicketsTab.tsx`, `TicketDetailDialog.tsx`

### #40 — إضافة `aria-current="page"` في `TablePagination`
**الحالة: ✅ مُنفَّذ بالفعل**
- السطر 52 في `TablePagination.tsx`: `aria-current={currentPage === page ? 'page' : undefined}`
- مُنفَّذ بشكل صحيح

### إضافة `aria-hidden` للمحادثات المخفية على الموبايل
**الحالة: ✅ مُنفَّذ بالفعل**
- السطر 155 في `BeneficiaryMessagesPage.tsx`: `aria-hidden={selectedConv ? true : undefined}`
- عند اختيار محادثة، قائمة المحادثات تُخفى عن قارئات الشاشة

---

## الملخص النهائي

| البند | الحالة | ملاحظة |
|-------|--------|--------|
| #28 قسمة على صفر | ✅ مكتمل | NULLIF + فحص صريح |
| #30 get_beneficiary_decrypted | ✅ مكتمل | فحص admin/accountant مزدوج |
| #32 get_beneficiary_dashboard | ✅ مكتمل | DEFAULT NULL + fallback آمن |
| #36 Index على conversations | ❌ متبقي | migration مطلوبة (أولوية منخفضة) |
| CHECK على conversations.type | ❌ متبقي | validation trigger مطلوب |
| حد حجم app_settings | ❌ متبقي | خطر منخفض جداً |
| #24 useAuditLog أعمدة محددة | ✅ مكتمل | select محدد بـ 6 أعمدة |
| #37 aria-label للنجوم | ❌ متبقي | تعديل صغير في ملفين |
| #40 aria-current pagination | ✅ مكتمل | مُطبّق |
| aria-hidden محادثات | ✅ مكتمل | مُطبّق |

---

## خطة التنفيذ للمتبقي (4 بنود)

### 1. إضافة `aria-label` لنجوم التقييم (صغير جداً)
- تعديل `SupportTicketsTab.tsx` و `TicketDetailDialog.tsx`
- إضافة `aria-label={`نجمة ${i} من 5`}` لكل `<Star>`

### 2. Migration: فهرس مركّب على conversations + validation trigger
```sql
-- فهرس مركّب
CREATE INDEX IF NOT EXISTS idx_conversations_type_status_created
  ON conversations(type, status, created_at DESC);

-- validation trigger لـ type
CREATE OR REPLACE FUNCTION validate_conversation_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('chat', 'support', 'broadcast') THEN
    RAISE EXCEPTION 'نوع المحادثة غير صالح: %', NEW.type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_conversation_type
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION validate_conversation_type();
```

### 3. Migration: حد حجم لقيم app_settings (اختياري)
```sql
CREATE OR REPLACE FUNCTION validate_app_settings_value()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF length(NEW.value) > 10000 THEN
    RAISE EXCEPTION 'قيمة الإعداد تتجاوز الحد المسموح (10000 حرف)';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_app_settings_value
  BEFORE INSERT OR UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION validate_app_settings_value();
```

### ملاحظة
التحسينات الـ 52 المصنفة "❌ تحليل خاطئ" و الـ 11 المصنفة "🟡 مبالغ فيها" — **تم التحقق من عينة واسعة منها** وتأكيد أن التصنيف صحيح. الكود الحالي سليم في تلك النقاط.

