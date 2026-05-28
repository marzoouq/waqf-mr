
## خطة المتابعة — البنود الثلاثة المتبقية (جراحي، بدون توسعة)

تنفيذ بالترتيب الذي طلبه المستخدم: (1) أصفار السنة النشطة → (2) `net_after_zakat` كنوع → (3) اختبار سالب.

---

### البند 1 — أصفار الحصص في السنة النشطة (تحسين UI فقط)

**التشخيص:** `useEndUserFinancials` يقرأ `account.admin_share` و `account.waqif_share` من DB، وهي مُخزَّنة بـ 0 في السنة النشطة (قاعدة أساسية موثّقة). `AccountsSummaryCards` يعرض تنبيهاً عاماً عبر `isClosed=false`، لكن بطاقتي "حصة الناظر" و"حصة الواقف" تعرضان `0 ر.س` بدون شارة بصرية مميزة فتُفهم كأرقام نهائية.

**الملف:** `src/components/accounts/AccountsSummaryCards.tsx`
**التغيير:** إضافة شارة صغيرة (Badge) "تقديري" بجانب قيم `adminShare`/`waqifShare`/`waqfRevenue` عندما `isClosed=false`. لا تغيير على الأرقام أو الحسابات.
**حدود:** لا تعديل على الـ hook، لا حساب ديناميكي محلي (الحساب موجود في `accountsCalculations.ts` ويُستخدم في صفحات الإدارة فقط). الهدف توضيح بصري للمستفيد/الواقف.

---

### البند 2 — تمرير `net_after_zakat` من DB بدلاً من إعادة حسابه

**التشخيص:** RPC الـ `get_beneficiary_dashboard` تحسب `v_net_after_zakat` داخلياً لكن لا تُرجعها في كائن `account` JSON. لذلك `useEndUserFinancials` يُعيد حسابها محلياً مع `Math.max(0, ...)` الذي يخفي العجز.

**الخطوات:**

أ. **Migration:**
- إضافة `'net_after_zakat', v_net_after_zakat` إلى `jsonb_build_object` داخل دالتي `get_beneficiary_dashboard` و `get_waqif_dashboard` (إن وُجدت بنفس النمط).
- بدون تغيير على بنية `accounts` table أو RLS.

ب. **TypeScript types:** `src/hooks/data/dashboard/types.ts` — إضافة `net_after_zakat: number;` إلى الحقل `account`.

ج. **Hook:** `src/hooks/application/dashboard/useEndUserFinancials.ts` — تفضيل القيمة الرسمية من `account?.net_after_zakat`، مع الإبقاء على `Math.max(0, ...)` كحماية UI (مذكور في memory: Negative Value Guards). لا تغيير على أي مستهلك آخر.

**حدود:** لا تعديل على Math.max(0) (مكفول بالذاكرة)، لا تعديل على RLS أو grants، لا تعديل على RPC الناظر/المحاسب.

---

### البند 3 — اختبار للقيم السالبة في التوزيع

**الملف:** `src/utils/financial/distributionCalcPure.test.ts`
**التغيير:** إضافة حالتين فقط:
1. `availableAmount = -1000` → جميع الحصص الصافية = 0.
2. `availableAmount = 0` → سلوك سابق محفوظ (regression).

**حدود:** لا تعديل على ملف المنطق نفسه (طُبّق في P0).

---

### معايير القبول
- شارة "تقديري" تظهر فقط للسنة النشطة على البطاقات الثلاث.
- `net_after_zakat` يأتي من DB في الـ RPC، والـ hook يستخدمه كمصدر أوّل.
- جميع اختبارات `vitest` تمر، مع 2 اختبار جديد.
- لا تغيير على ملفات غير مذكورة، ولا migrations تمس grants/RLS.

### ترتيب التنفيذ
1 → 3 → 2 (لأن 2 يحتاج موافقة migration).
