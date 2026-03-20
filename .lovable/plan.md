

# تقرير التحقق من الملاحظات — تنفيذ سيناريوهات حقيقية

---

## F-01: بطاقات "0 ر.س *تقديري" في لوحة الناظر ✅ تم الإصلاح

**السيناريو:** الناظر يدخل لوحة التحكم → يختار السنة النشطة 2025-2026

**التحقق من الكود (سطر 161-163):**
```text
حصة الناظر → "تُحسب عند الإقفال" (بدل "0 ر.س *تقديري")
حصة الواقف → "تُحسب عند الإقفال"
ريع الوقف  → "تُحسب عند الإقفال"
```

**النتيجة:** ✅ الإصلاح مطبّق بشكل صحيح. القيم النصية تظهر بدل الأرقام الصفرية المربكة.

**ملاحظة متبقية:** المتغير `sharesNote` (سطر 128) لا يزال موجوداً ويُستخدم في بطاقات أخرى مثل "صافي الريع" و"التدفق النقدي". هذا **مقبول** لأن هذه البطاقات تعرض قيماً حقيقية (876,300 ر.س مثلاً) وليست صفرية.

---

## F-02: ساعة الواقف لا تتوقف عند hidden ✅ تم الإصلاح

**السيناريو:** الواقف يفتح لوحته → ينتقل لتبويب آخر → يعود

**التحقق من الكود (سطر 123-129):**
```text
start() → setInterval
stop()  → clearInterval + id = undefined
onVisibility → hidden? stop() : start()
cleanup → stop() + removeEventListener
```

**النتيجة:** ✅ مطابق تماماً لنمط BeneficiaryDashboard. الـ interval يتوقف عند الإخفاء ويُعاد تشغيله عند الظهور.

---

## F-03: زر PDF نشط رغم حظر التصدير ✅ تم الإصلاح

**السيناريو:** مستفيد يفتح "حصتي" → السنة النشطة → يحاول التصدير

**التحقق من الكود (سطر 361-368):**
```text
onExportPdf={isClosed ? handleDownloadPDF : undefined}
extraItems={isClosed ? [...] : undefined}
```

**النتيجة:** ✅ عند السنة النشطة (`isClosed = false`):
- خيار PDF يختفي تماماً من القائمة (undefined)
- خيار "تقرير شامل" يختفي أيضاً
- يبقى فقط زر الطباعة

---

## F-04: تناقض guard بين الصفحات ✅ تم الإصلاح

**السيناريو:** مستفيد يختار السنة النشطة 2025-2026 (لها حساب بقيم صفرية seed)

**التحقق من قاعدة البيانات:**
- السنة النشطة `ad5da366` لها حساب `672a6ffc` ← `isAccountMissing = false`
- الدخل الحي: 876,300 ر.س (الحساب يحتوي 0 لكن الكود يحسب من البيانات الحية)

**التحقق من الكود — جميع الصفحات الأربع متسقة الآن:**

| الصفحة | الشرط | السطر |
|--------|-------|-------|
| DisclosurePage | `isAccountMissing && selectedFY?.status === 'closed'` | 227 |
| MySharePage | `isAccountMissing && isClosed` | 322 |
| FinancialReportsPage | `isAccountMissing && selectedFY?.status === 'closed'` | 130 |
| AccountsViewPage | `isAccountMissing && selectedFY?.status === 'closed'` | 78 |

**النتيجة:** ✅ جميع الصفحات تمرّر السنة النشطة وتعرض البيانات الحية.

**سيناريو حافة:** إذا حُذف حساب السنة النشطة يدوياً → `isAccountMissing = true` + `status = 'active'` → الصفحات تمرّر ← **صحيح** (البيانات الحية متاحة).

---

## S-01: security_barrier للعروض الآمنة ✅ مُطبّق مسبقاً

**التحقق من قاعدة البيانات:**
```text
beneficiaries_safe → [security_invoker=true, security_barrier=true]
contracts_safe     → [security_invoker=false, security_barrier=true]
```

**النتيجة:** ✅ `security_barrier = true` موجود بالفعل في كلا العرضين. لا يحتاج إجراء.

**ملاحظة:** `beneficiaries_safe` يستخدم `security_invoker=true` بينما `contracts_safe` يستخدم `security_invoker=false`. هذا **تناقض طفيف** لكنه لا يؤثر أمنياً لأن كلاهما يعتمد على `has_role(auth.uid())` داخلياً.

---

## S-03: سياسة UPDATE مفقودة لـ webauthn_credentials ⚠️ لا تزال مفقودة

**التحقق من قاعدة البيانات:**
| السياسة | العملية |
|---------|---------|
| Users can delete own | DELETE |
| Users can insert own | INSERT |
| Admins can view all | SELECT |
| Users can view own | SELECT |
| **UPDATE** | **مفقودة** |

**التأثير:** منخفض عملياً (التحديث يتم عبر service role في Edge Function). لكن بدون سياسة UPDATE صريحة، أي محاولة UPDATE عبر client SDK ستُرفض — وهذا سلوك آمن بالتصميم.

**التوصية:** إضافة سياسة UPDATE كطبقة حماية إضافية (defense-in-depth).

---

## U-01: timeout تراكمي 10 ثوانٍ ⚠️ لا يزال كما هو

**التحقق من الكود:**
- ProtectedRoute سطر 60: `setTimeout(() => setShowSignOut(true), 5000)` — **لا يزال 5 ثوانٍ**

**التوصية:** تقليل إلى 3 ثوانٍ.

---

## ملخص التنفيذ

| # | الملاحظة | الحالة | ملاحظة |
|---|----------|--------|--------|
| **F-01** | بطاقات الحصص الصفرية | ✅ مُصلح | "تُحسب عند الإقفال" |
| **F-02** | ساعة الواقف | ✅ مُصلح | start/stop pattern |
| **F-03** | زر PDF | ✅ مُصلح | يختفي في السنة النشطة |
| **F-04** | تناقض guard | ✅ مُصلح | 4 صفحات متسقة |
| **S-01** | security_barrier | ✅ مُطبّق مسبقاً | لا يحتاج إجراء |
| **S-03** | UPDATE policy webauthn | ⚠️ مفقودة | إصلاح بسيط: migration |
| **U-01** | timeout 5→3 ثوانٍ | ⚠️ لم يُنفّذ | إصلاح بسيط: سطر واحد |

### الإصلاحات المتبقية (سطران فقط)
1. **S-03:** إضافة سياسة UPDATE لـ `webauthn_credentials` عبر migration
2. **U-01:** تقليل timeout في `ProtectedRoute.tsx` سطر 60 من `5000` إلى `3000`

هل تريد تنفيذ هذين الإصلاحين المتبقيين؟

