

# خطة: سحب تفاعلي للقائمة الجانبية + فتح من حافة الشاشة

## التغييرات المطلوبة

### 1. سحب تفاعلي يتبع الإصبع (Interactive Swipe) عند إغلاق القائمة

**الحالي**: عند السحب > 60px يتم الإغلاق فوراً بدون حركة تتبع الإصبع.

**المطلوب**: القائمة تتحرك مع الإصبع أثناء السحب، ثم تُغلق أو ترتد حسب المسافة.

في `DashboardLayout.tsx`:
- تحويل `touchDeltaX` إلى `useState` بدلاً من `useRef` لتحديث الواجهة أثناء السحب
- إضافة `sidebarDragOffset` state يُطبَّق كـ `transform: translateX(${offset}px)` على `<aside>` الجوال
- عند `touchEnd`: إذا `offset > 80` → إغلاق مع `transition`، وإلا → ارتداد إلى 0
- أثناء السحب: تعطيل `transition-transform` لتكون الحركة فورية مع الإصبع

```tsx
const [dragOffset, setDragOffset] = useState(0);
const isDragging = useRef(false);

handleTouchMove → setDragOffset(Math.max(0, delta));  // فقط لليمين في RTL
handleTouchEnd → if dragOffset > 80: close, else: animate back to 0

// على aside:
style={{ transform: `translateX(${dragOffset}px)` }}
className={cn(..., isDragging.current ? '' : 'transition-transform duration-300')}
```

### 2. فتح القائمة بالسحب من حافة الشاشة اليمنى (Edge Swipe to Open)

إضافة touch listener على `<main>` أو div wrapper:
- عند بداية اللمس: تحقق إذا كان `touchStartX > window.innerWidth - 20` (حافة يمنى)
- أثناء السحب لليسار (RTL): اعرض القائمة تدريجياً بإزاحة
- عند الإفلات: إذا سُحب > 80px → افتح القائمة

```tsx
// على main أو div wrapper
const edgeTouchStartX = useRef(0);
const [edgeDragOffset, setEdgeDragOffset] = useState(0);
const isEdgeSwiping = useRef(false);

handleMainTouchStart → if touch.clientX > window.innerWidth - 25: start edge swipe
handleMainTouchMove → setEdgeDragOffset(delta) // القائمة تظهر تدريجياً
handleMainTouchEnd → if pulled > 80: open sidebar
```

### 3. تحديث overlay الخلفية

- شفافية الـ overlay تتغير تدريجياً مع السحب بدلاً من ظهور/اختفاء مفاجئ
- `opacity` مربوطة بنسبة الإزاحة: `opacity: 1 - (dragOffset / 256)`

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/DashboardLayout.tsx` | سحب تفاعلي + edge swipe + overlay متدرج |

