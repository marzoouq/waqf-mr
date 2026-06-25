## فحص عميق — السبب الجذري الحقيقي

بعد قراءة `useSidebarSwipe.ts` و`DashboardLayout.tsx` و`useLayoutShell.ts` و`MobileHeader.tsx` و`BottomNav.tsx` و`index.css`، السبب الحقيقي للتعليق ليس مجرد "race condition" — بل **تعارض مباشر بين DOM mutation و React-managed style**.

### السبب #1 — الأخطر: `clearInlineStyles` يمسح transform الذي تُديره React

السايدبار `<aside>` يستقبل `{...swipe.sidebarProps}` الذي يحتوي على:
```js
style: { transform: `translateX(${mobileSidebarOpen ? 0 : 256}px)`, willChange: 'transform' }
```

أثناء touchmove، `applyTransform` يكتب مباشرة على `sidebarRef.current.style.transform` (تجاوز React).
عند touchend، `clearInlineStyles` يضع `style.transform = ''` — أي **يمسح القيمة كلياً من العنصر، بما فيها تلك التي تُديرها React**.

إذا لم يتغيّر `mobileSidebarOpen` (لأن العتبة لم تُتجاوز)، **لا يحدث re-render**، فيبقى DOM بدون transform → السايدبار يصبح مرئياً عند `right:0` ولا يختفي حتى تغيير حالة قسري.

**هذا تفسير "التعليق" بدقة**: المستخدم يلمس الحافة فيظهر السايدبار جزئياً، يرفع إصبعه قبل العتبة، ثم يبقى السايدبار مرئياً بشكل دائم بدون إمكانية إغلاق (إلا بتغيير route).

### السبب #2: edge swipe زاوية 25px تتعارض مع iOS Safari Back Gesture
`handleMainTouchStart` ينشّط السحب عند `x > innerWidth - 25`. إيماءة "العودة" في Safari iOS تستخدم نفس المنطقة. النتيجة:
- iOS يلتقط اللمسة كـ swipe-back فيُلغي `touchend` (يرسل `touchcancel` بدلاً منه).
- الكود **لا يستمع لـ `touchcancel`** → `isEdgeSwiping.current` يبقى `true` و`clearInlineStyles` لا يُستدعى.
- inline transform مكتوب من touchmove يبقى عالقاً.

### السبب #3: غياب `transition` يُضخّم الإحساس بالتعليق
لا يوجد `transition: transform` على style، فأي إعادة فتح/إغلاق تحدث بدون انسياب — تبدو كقفزة أو "freeze" بصري.

### السبب #4: BottomNav زر "المزيد" يستدعي `setMobileSidebarOpen(true)` دون reset لأي transform عالق
إذا كان transform عالقاً من سحب فاشل سابق، الضغط على زر "المزيد" يُغيّر الحالة لكن `useMemo` يُعيد توليد style بـ `translateX(0)` — React يطبّقه لكن DOM mutation السابق قد يكون لا يزال في `style.transform` (لأن empty string يجعل React يتركه فارغاً ثم يكتب القيمة الجديدة، لكن أحياناً يحدث flash).

## خطة الإصلاح المُعمَّقة

### 1) `src/hooks/ui/useSidebarSwipe.ts` — إصلاحات جوهرية

**أ. استبدال DOM mutation بـ React state للسحب الجاري** (الأنظف معمارياً):
- إضافة `const [dragOffset, setDragOffset] = useState<number | null>(null)`.
- `applyTransform` يصبح `setDragOffset(offset)` (مع rAF throttle عبر `useRef` للأداء).
- في `sidebarProps.style.transform` تُحسب القيمة:  
  `dragOffset !== null ? translateX(${dragOffset}px) : translateX(${mobileSidebarOpen ? 0 : sidebarWidth}px)`.
- `clearInlineStyles` يصبح `setDragOffset(null)` — يُجبر re-render فيستعيد React الـ style الصحيح.

**ب. إضافة معالج `touchcancel`** على كل من `sidebarProps` و`mainTouchProps`:
```js
onTouchCancel: handleTouchEnd  // والمعادل لـ edge
```
ضروري لـ iOS Safari عند تفعيل native gesture.

**ج. تقليص edge zone من 25px إلى 12px** ورفض السحب إذا كانت الحركة الرأسية > الأفقية:
```js
if (Math.abs(deltaY) > Math.abs(deltaX)) { isEdgeSwiping.current = false; return; }
```

**د. إضافة `transition`** متكيّفة:
```js
transition: dragOffset === null ? 'transform 250ms ease-out' : 'none'
```

**هـ. إضافة `touchAction: 'pan-y'`** إلى `mainTouchProps.style` لمنع iOS من الاستحواذ على اللمسة كـ horizontal pan.

### 2) `src/components/layout/DashboardLayout.tsx` — تعديل طفيف
- لا تغيير بنيوي. فقط إضافة `onTouchCancel={() => setMobileSidebarOpen(false)}` على overlay كحماية إضافية.

### 3) اختبارات جديدة `src/hooks/ui/useSidebarSwipe.test.ts`
- touchstart خارج edge zone → `sidebarProps.style.transform` بلا تغيير.
- touchstart داخل edge + touchcancel → السايدبار يعود لحالة مغلقة (لا transform عالق).
- touchmove ثم touchend بعتبة < 80px → `dragOffset` يعود `null` و transform يطابق `translateX(256px)`.
- حركة رأسية تُلغي edge swipe.

### 4) التحقق
- `bunx vitest run src/hooks/ui/useSidebarSwipe.test.ts`
- `bunx tsgo --noEmit`
- مراجعة بصرية على iPhone Simulator أو DevTools (Device Mode → iPhone 14 Pro، dir=rtl).

## ملاحظات

- **لا تغيير على المصادقة/RLS/Edge Functions.** التعديل محصور في طبقة UI touch.
- **التأثير صفر على الديسكتوب** — `lg:hidden` يحجب المنطق على الشاشات الكبيرة، والـ aside الديسكتوب لا يستخدم `swipe.sidebarProps`.
- بعد التنفيذ يلزم **نشر** التطبيق ليظهر الإصلاح في `waqf-wise.net` على iPhone.

هل أبدأ التنفيذ بهذا الترتيب؟