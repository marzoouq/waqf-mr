

# فحص جنائي عميق — لوحة المستفيد

---

## المنهجية

فحص: Route Guards، Sidebar filtering، BottomNav، RPC `get_beneficiary_dashboard` (SECURITY DEFINER)، تسرب بيانات السنوات غير المنشورة، quickLinks، تناسق الصلاحيات بين الأدوار الثلاثة (مستفيد، واقف، ناظر).

---

## النتائج

### 🔴 F-01: تسرب توزيعات السنوات غير المنشورة عبر RPC (أمنية - متوسطة)

**الملف:** `get_beneficiary_dashboard` — السطر 73-81

```sql
SELECT id, amount, date, status
  FROM distributions
 WHERE beneficiary_id = v_ben.id
 ORDER BY date DESC
 LIMIT 3
```

**المشكلة:** الدالة `SECURITY DEFINER` تتجاوز كل سياسات RLS بما فيها سياسة RESTRICTIVE `is_fiscal_year_accessible(fiscal_year_id)`. استعلام التوزيعات لا يُفلتر حسب السنة المالية ولا يتحقق من حالة النشر (`published`).

**سيناريو التسرب:** الناظر يُنشئ سنة مالية جديدة (غير منشورة) ويُدخل توزيعات تجريبية ← المستفيد يفتح لوحته ← يرى التوزيع التجريبي في "آخر التوزيعات" رغم أن السنة غير منشورة.

**الإصلاح:** إضافة `JOIN` مع `fiscal_years` وشرط `published = true`:

```sql
SELECT d.id, d.amount, d.date, d.status
  FROM distributions d
  LEFT JOIN fiscal_years fy ON fy.id = d.fiscal_year_id
 WHERE d.beneficiary_id = v_ben.id
   AND (d.fiscal_year_id IS NULL OR fy.published = true
        OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'accountant'))
 ORDER BY d.date DESC
 LIMIT 3
```

---

### ✅ بنود تم فحصها وأثبتت سلامتها

| البند | النتيجة | التفصيل |
|-------|---------|---------|
| Route Guards — تناسق 16 مسار | ✅ | كل مسار `/beneficiary/*` محمي بـ `ProtectedRoute` مع الأدوار الصحيحة |
| Sidebar — فلترة الواقف | ✅ | `disclosure: false, share: false` في `DEFAULT_ROLE_PERMS.waqif` ← لا يرى الإفصاح وحصتي |
| Sidebar — فلترة المستفيد | ✅ | كل الأقسام `true` ← يرى 15 رابط كاملة |
| BottomNav — 4 روابط مناسبة | ✅ | الرئيسية، حصتي، الإفصاح، المراسلات |
| quickLinks في Dashboard | ✅ | يستبعد الإفصاح وحصتي للواقف (`role !== 'waqif'`) |
| RPC — نطاق المستخدم | ✅ | `WHERE user_id = auth.uid()` — لا يمكن لمستفيد رؤية بيانات مستفيد آخر |
| RPC — فحص السنة المنشورة (مالية) | ✅ | `published = true OR has_role(admin/accountant)` — الدخل والمصروفات محمية |
| RPC — REVOKE anon | ✅ | `REVOKE FROM anon` + `GRANT TO authenticated` |
| RPC — طلبات السُلف | ✅ | مُفلترة بـ `fiscal_year_id` المُتحقق منه + `beneficiary_id` |
| بطاقة السُلفة — إخفاء للواقف | ✅ | `role !== 'waqif'` يمنع ظهورها |
| حالة "حسابك غير مرتبط" | ✅ | يعرض رسالة واضحة عند عدم وجود سجل مستفيد مرتبط |
| حالة "لا سنوات منشورة" | ✅ | `NoPublishedYearsNotice` يظهر بشكل صحيح |
| Realtime invalidation | ✅ | يستمع لتغييرات `distributions` مُفلترة بـ `beneficiary_id` |
| Console/Network errors | ✅ | صفر أخطاء |

---

## ملخص

| # | البند | الحالة | أولوية |
|---|-------|--------|--------|
| F-01 | تسرب توزيعات سنوات غير منشورة عبر RPC | 🔴 ثغرة | متوسطة |
| الباقي (14 بند) | Route Guards, Sidebar, BottomNav, RPC scope | ✅ سليم | — |

---

## الإصلاح المطلوب

**Migration واحدة** — تحديث دالة `get_beneficiary_dashboard` لإضافة فلتر `published` على استعلام التوزيعات (السطر 73-81). يمنع ظهور توزيعات السنوات غير المنشورة للمستفيد.

