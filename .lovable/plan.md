

## التحليل الجنائي الحقيقي لمشكلة زر تسجيل الخروج

### السبب الجذري الفعلي

المشكلة ليست في أحداث اللمس (تم إصلاحها بالفعل). السبب الحقيقي هو **خطأ في بنية المكونات المتداخلة**.

في `Sidebar.tsx` سطر 120-144، هذا هو الكود الحالي:

```text
AlertDialogTrigger (asChild)
  └─ Tooltip              ← ❌ هذا ليس عنصر DOM
       └─ TooltipTrigger (asChild)
            └─ Button      ← الزر الفعلي
```

`AlertDialogTrigger` مع `asChild` يحاول دمج props (بما في ذلك `onClick`) على العنصر الأول المباشر. لكن العنصر المباشر هو `<Tooltip>` وهو **مكون React وليس عنصر DOM**، فلا يستطيع تمرير `onClick` أو `ref` إلى `<Button>` الفعلي.

**المتغير `sidebarOpen` يبدأ بقيمة `false`** (من localStorage)، لذلك على الجوال يتم دائماً عرض الفرع الأول (مع Tooltip) بدلاً من الفرع البسيط (Button مباشرة).

### الحل

**ملف**: `src/components/Sidebar.tsx` — إعادة هيكلة زر الخروج

1. **إزالة Tooltip من داخل AlertDialogTrigger**: على الجوال لا حاجة لـ tooltip أصلاً. نقل Tooltip ليكون خارج AlertDialog أو استخدام شرط يفصل بين الجوال وسطح المكتب.

2. **الهيكل الصحيح**:
```text
الجوال (دائماً):
  AlertDialogTrigger (asChild)
    └─ Button  ← مباشرة، بدون Tooltip

سطح المكتب (sidebar مطوي):
  Tooltip
    └─ TooltipTrigger (asChild)
         └─ AlertDialogTrigger (asChild)
              └─ Button
```

3. **التنفيذ**: استخدام شرط واحد يعرض على الجوال دائماً `Button` مباشر داخل `AlertDialogTrigger`، وعلى سطح المكتب فقط عند طي الشريط يُغلّف بـ `Tooltip`. يتم ذلك عبر CSS classes (`lg:hidden` / `hidden lg:block`) أو شرط JavaScript.

**لا تغييرات أخرى مطلوبة** — إصلاحات `stopPropagation` و dead zone السابقة صحيحة ومفيدة.

