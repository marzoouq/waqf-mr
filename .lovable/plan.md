

# تحقق من بنود الجولة السابعة — الكل إنذارات كاذبة

من 11 بنداً: **0 مشاكل حقيقية تحتاج إصلاح**، **11 إنذار كاذب أو ملاحظة تصميمية**.

---

## إنذارات كاذبة مفصّلة

### CRIT-16 — `getSession()` في `useWebAuthn` — **إنذار كاذب**

الاستخدامان (سطر 39 و 66) هما لقراءة `session.user.id` لاستعلام `webauthn_credentials`. لكن:
- RLS على `webauthn_credentials` يُفلتر بـ `user_id = auth.uid()` — حتى لو زُوِّر `session.user.id` في localStorage، PostgreSQL يستخدم JWT الفعلي في `auth.uid()` ولن يُعيد صفوفاً لمستخدم آخر.
- `registerBiometric` يستخدم `getUser()` أولاً (سطر 94) ✅ ثم `getSession()` فقط للحصول على `access_token` لإرساله للـ Edge Function — وهذا صحيح لأن الـ Edge Function تتحقق منه بـ `getUser()`.
- القاعدة "لا تستخدم getSession" تخص **Edge Functions** (server-side) — ليس client-side حيث الـ session محلية بطبيعتها.

### CRIT-17 — `getSession()` في `useGenerateInvoicePdf` — **إنذار كاذب**

نفس المنطق: الـ token يُرسل لـ Edge Function التي تتحقق منه بـ `getUser()`. إذا زُوِّر، يُرفض. لا توجد عملية حساسة على العميل قبل الإرسال. هذا هو النمط الصحيح للحصول على `access_token` لاستدعاء Edge Functions.

### HIGH-29 — Memory Leak في `getInvoiceSignedUrl` — **إنذار كاذب**

- **`InvoiceViewer.tsx`** (المستدعي الوحيد): يعمل `URL.revokeObjectURL(blobUrl)` في **ثلاثة مواقع**: عند إغلاق الحوار (سطر 25)، عند فتح ملف جديد (سطر 33)، وعند abort (سطر 42). **Cleanup موجود ومُتقَن**.
- **`paymentInvoice.ts`**: يُعيد blob URL → المستدعي `PaymentInvoicesTab.tsx` سطر 111 يعمل `URL.revokeObjectURL(blobUrl)` فوراً بعد التحميل. **Cleanup موجود**.

### HIGH-30 — CSS Injection عبر ThemeColorPicker — **إنذار كاذب**

localStorage يُخزِّن **فقط معرّف الثيم** (مثل `'royal-blue'`). الكود يبحث في مصفوفة مُشفَّرة `themes.find(t => t.id === savedId)` — إذا لم يتطابق المعرّف مع أي ثيم مُعرَّف مسبقاً، لا يحدث شيء. **لا توجد قيم CSS عشوائية من localStorage**.

### HIGH-31 — أحداث مكررة في `useIdleTimeout` — **إنذار كاذب**

نمط React قياسي: عند تغيير `resetTimer`، الـ cleanup function (سطر 100-106) تُزيل **كل** الأحداث المسجلة قبل إعادة التسجيل. لا يوجد تكرار. React StrictMode يُنفِّذ mount→unmount→mount ولكن مع cleanup صحيح بين كل دورة.

### HIGH-32 — `selectedId` بدون UUID validation — **إنذار كاذب**

Supabase PostgREST يستخدم **استعلامات مُعلَّمة** (parameterized queries). أي قيمة غير UUID صالحة تُرجع ببساطة 0 نتائج. "Prototype Pollution" من سلسلة نصية عادية — مفهوم لا ينطبق هنا. الفحص `fiscalYears.some(fy => fy.id === selectedId)` في useEffect (سطر 35-42) يُصفِّر القيم غير المتطابقة.

### MED-31 — Mock في AuthContext.test — **ملاحظة اختبارات**

ملاحظة صحيحة عن جودة الاختبار لكنها لا تؤثر على الإنتاج.

### MED-32 — اختبارات edgeFunctionAuth — **ملاحظة اختبارات**

نفس التقييم — تحسين اختبارات مستقبلي.

### MED-33 — limit(100) في useAdvanceRequests — **تصميم مقصود**

100 سلفة في سنة مالية واحدة سقف كافٍ. النظام يعمل بسنة مالية واحدة نشطة.

### MED-34 — clearToasts عند logout — **سلوك مقصود**

حذف جميع الإشعارات عند تسجيل الخروج سلوك صحيح ومتوقع.

### MED-35 — رفع PDF بدون client-side auth check — **تصميم صحيح**

Storage RLS هو الطبقة الصحيحة للتحقق. التحقق client-side إضافي وليس بديلاً. سياسة `invoices` bucket تتطلب `authenticated` — وهذا كافٍ مع RLS.

---

## الخلاصة

**لا توجد إصلاحات مطلوبة.** جميع البنود الـ 11 إما إنذارات كاذبة مبنية على فهم خاطئ للكود الفعلي، أو ملاحظات تصميمية لا تمثل ثغرات أمنية.

