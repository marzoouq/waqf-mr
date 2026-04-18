

## خطة موجة P10 — إصلاح إحصائيات الهبوط + نسب المستحقين + تدقيق توزيع المستفيدين

سأقسم الطلب إلى 3 مهام مستقلة بعد فحص الكود الفعلي.

---

### 🔍 الفحص المطلوب قبل التنفيذ

سأفحص:
1. `get_public_stats` RPC + `usePublicStats.ts` + مكون عرض الإحصائيات في الهبوط
2. مدخلات `share_percentage` في نماذج إضافة/تعديل المستفيد (هل تقبل عشرية؟)
3. حساب توزيع "عبدالله" في السنة المقفلة + مقارنة `distributions.amount` مع `share_percentage * net_after_zakat`

---

### المهمة 1 — إحصائيات الهبوط (أرقام واقعية + تحكم ناظر)

**المشكلة الحالية حسب memory `mem://security/privacy/public-stats-anonymization`:**
- `get_public_stats` يُقرّب عدد المستفيدين لأقرب 10 (لذا يظهر 10 بدلاً من العدد الفعلي)
- لا يوجد تحكم بالناظر بالإخفاء أو override

**الحل:**

أ) **تعديل `get_public_stats` RPC**:
- إضافة قراءة من `app_settings` لمفاتيح:
  - `public_stat_properties_mode`: `auto` | `manual` | `hidden` (افتراضي `auto`)
  - `public_stat_properties_value`: رقم يدوي (عند `manual`)
  - نفس المفاتيح لـ `beneficiaries` و `fiscal_years`
- عند `auto` للمستفيدين: **إرجاع العدد الحقيقي بدون تقريب** (الناظر يقرر الإخفاء بدلاً من التقريب الإجباري)
- عند `hidden`: إخراج البطاقة من الـ payload
- بنية الإرجاع الجديدة: `{ stats: [{key, label, value, visible}] }`

ب) **تحديث `usePublicStats.ts`**: التكيف مع البنية الجديدة + فلترة المخفي

ج) **قسم جديد في صفحة إعدادات الناظر**: "إحصائيات صفحة الهبوط"
- 3 بطاقات (واحدة لكل إحصائية) تحوي:
  - Radio: تلقائي / مخصص / مخفي
  - Input للرقم (يظهر عند مخصص)
  - معاينة فورية
- حفظ عبر upsert في `app_settings`

د) **تحديث memory** `mem://security/privacy/public-stats-anonymization` لعكس السلوك الجديد

---

### المهمة 2 — قبول النسب العشرية للمستفيدين (10.28% مثلاً)

**الفحص المطلوب**: 
- نموذج إضافة/تعديل المستفيد (BeneficiaryForm)
- التحقق من `step` و `min/max` على input النسبة
- التحقق من validation schema (Zod)
- التأكد أن `distributions` تستخدم النسبة العشرية في حساباتها (server-side في `execute_distribution`)

**الحل المتوقع**:
- تغيير `step="1"` → `step="0.01"` على input النسبة
- تحديث Zod schema لقبول decimals (`.multipleOf(0.01)`)
- التأكد من validation أن المجموع ≤ 100% بدقة عشرية
- DB: `share_percentage` بالفعل `numeric` (يدعم العشرية ✅)

---

### المهمة 3 — تدقيق توزيع "عبدالله" في السنة المقفلة

**خطوات التحقيق الجنائي**:
1. استعلام `beneficiaries` للعثور على ID عبدالله + نسبته
2. استعلام `distributions` للسنة المقفلة لحساب ما استلمه فعلياً
3. استعلام `accounts` للسنة المقفلة لمعرفة `net_after_zakat` و `distributions_amount`
4. حساب الحصة المتوقعة = `share_percentage × (net_after_zakat - admin_share - waqif_share)`
5. مقارنة المتوقع مع الفعلي + فحص:
   - هل توجد `advance_carryforward` تم خصمها؟
   - هل توجد `advance_requests` مدفوعة؟
   - هل هناك خطأ في `largest remainder method` (memory `distribution-calculation-method`)?

**النتيجة**: تقرير تشخيصي بسبب الفرق + إصلاح إن وُجد bug فعلي. **لن أعدّل بيانات السنة المقفلة بدون موافقة صريحة** (memory `overseer-closed-year-access`).

---

### الترتيب التنفيذي
1. **أولاً**: تشخيص توزيع عبدالله (read-only) لأنه قد يكشف bug يجب إصلاحه قبل أي شيء آخر
2. **ثانياً**: إصلاح نسب عشرية (تغييرات frontend + validation)
3. **ثالثاً**: إحصائيات الهبوط (RPC + UI إعدادات)

### الملفات المتأثرة (متوقعة)
- migration: تحديث `get_public_stats`
- `src/hooks/data/content/usePublicStats.ts`
- `src/components/landing/...` (مكون الإحصائيات)
- `src/pages/admin/settings/...` أو إنشاء `LandingStatsSettings.tsx`
- `src/components/admin/beneficiaries/BeneficiaryForm.tsx` (نسب عشرية)
- Zod schema للمستفيد

### الضمانات
- ✅ لا تعديل لبيانات السنة المقفلة دون موافقة
- ✅ القيم الافتراضية للإحصائيات = `auto` (لا انكسار للسلوك)
- ✅ نسب عشرية متوافقة مع `numeric` في DB
- ✅ RLS موجود على `app_settings` (admin only للكتابة)

### سؤال قبل التنفيذ
بخصوص إحصائية المستفيدين: حسب memory الحالي، الـ RPC يُقرّب لأقرب 10 لحماية الخصوصية. الآن ستُكشف الأرقام الحقيقية للزوار غير المسجلين عند `auto`. هل توافق على إزالة التقريب التلقائي والاكتفاء بآلية الإخفاء/override الجديدة؟

