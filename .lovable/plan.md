

# إصلاح مشكلة إعدادات السُلف — السبب الجذري

## المشكلة الفعلية

السبب ليس في زر الحفظ — الكود الحالي فيه خلل في **`useEffect`** يجعل أي تغيير في النموذج يرتد فوراً للقيمة القديمة:

```text
المستخدم يغير Switch → setForm({enabled: false})
    ↓ إعادة رسم
getJsonSetting() تُعيد كائن جديد {enabled: true} (من قاعدة البيانات)
    ↓ useEffect يُشغَّل (لأن settings كائن جديد كل مرة)
يقارن: JSON({enabled:false}) ≠ JSON({enabled:true})
    ↓ يُعيد form للقيمة القديمة!
```

**النتيجة**: كل تعديل يختفي فوراً لأن `useEffect` يُعيد الحالة لقيمة قاعدة البيانات في كل render.

## الحل

إعادة كتابة `AdvanceSettingsTab.tsx` بمنطق سليم:

1. **حذف `useEffect` المُسبب للمشكلة** — لا حاجة له
2. **استخدام `useState` مع تهيئة كسولة** (`lazy initializer`) حتى لا يتم إعادة التهيئة عند كل render
3. **إضافة flag `initialized`** لتحميل القيم من قاعدة البيانات مرة واحدة فقط عند أول تحميل ناجح
4. **إبقاء منطق الحفظ والتحقق كما هو** — لا مشكلة فيه

### التغيير التقني

```typescript
// بدلاً من:
const settings = getJsonSetting('advance_settings', defaults);
const [form, setForm] = useState(settings);
useEffect(() => { /* يعيد form للقيمة القديمة! */ }, [settings]);

// الحل:
const [form, setForm] = useState(defaults);
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  if (!isLoading && !initialized) {
    setForm(getJsonSetting('advance_settings', defaults));
    setInitialized(true);
  }
}, [isLoading, initialized]);
```

هذا يضمن:
- تحميل القيم من قاعدة البيانات **مرة واحدة فقط**
- تعديلات المستخدم (Switch، المبالغ) **تبقى محفوظة محلياً** حتى يضغط "حفظ"
- ز