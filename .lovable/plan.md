

# فحص أداء صفحة المستفيد — النتائج والملاحظات

---

## الوضع الحالي

الكود بعد دمج الاستعلامات في RPC واحد **سليم هيكلياً**:
- التواريخ (هجري + ميلادي + الوقت) تُحسب بـ `useMemo` مع locale `ar-SA` — **تظهر بشكل صحيح**
- تواريخ التوزيعات والإشعارات تستخدم `toLocaleDateString('ar-SA')` — **صحيحة**
- RPC يجلب البيانات في استعلام واحد بدل 8 — **تحسين الأداء مطبّق**

---

## ملاحظة مكتشفة: تعارض في القيمة الافتراضية لـ `advanceEnabled`

**الملف:** `BeneficiaryDashboard.tsx` سطر 41-42

```text
const advanceSettings = dashData?.advance_settings ?? { enabled: true, ... };
const advanceEnabled = advanceSettings?.enabled ?? false;  // ← false!
```

عندما RPC يُرجع `advance_settings = null` (لم تُضبط بعد):
- `advanceSettings` = `{ enabled: true }` (من الفولباك)
- `advanceEnabled` = `true` ✅

لكن عندما RPC يُرجع `advance_settings = {}` (كائن فارغ):
- `advanceSettings` = `{}`
- `advanceEnabled` = `false` ← **تعارض مع MySharePage التي تُرجع `true` كافتراضي**

**الإصلاح:** توحيد المنطق ليطابق `MySharePage.tsx`:
```typescript
const advanceEnabled = advanceSettings?.enabled ?? true;
```

---

## ملخص

| البند | الحالة |
|-------|--------|
| التواريخ (هجري/ميلادي/وقت) | ✅ سليمة |
| RPC الموحد | ✅ يعمل |
| Loading guards | ✅ بالترتيب الصحيح |
| Realtime invalidation | ✅ يستهدف queryKey واحد |
| `advanceEnabled` default | ⚠️ يحتاج توحيد (سطر واحد) |

**الإصلاح المطلوب:** تغيير سطر 42 من `?? false` إلى `?? true` لمطابقة سلوك بقية التطبيق.

