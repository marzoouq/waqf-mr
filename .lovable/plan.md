

# خطة: Haptic feedback + تحسين أداء السحب + إصلاح تداخل زر المساعد الذكي

## التغييرات المطلوبة

### 1. إصلاح تداخل زر المساعد الذكي مع الشريط السفلي (AiAssistant.tsx)

**المشكلة**: الزر العائم في `bottom-4 left-4` (16px من الأسفل) بينما الشريط السفلي ارتفاعه `h-14` (56px) — الزر مخفي تحت الشريط.

**الحل**: تغيير موضع الزر العائم على الجوال ليكون فوق الشريط السفلي:
```tsx
// من:
'fixed bottom-4 left-4 z-50 ...'
// إلى:
'fixed bottom-20 left-4 lg:bottom-4 z-50 ...'
```
`bottom-20` = 80px — فوق الشريط السفلي (56px) بمسافة كافية. على الشاشات الكبيرة (`lg:bottom-4`) يعود للوضع الأصلي لأن الشريط السفلي مخفي.

نفس التعديل على نافذة المحادثة المفتوحة (`sm:bottom-4 sm:left-4` → `sm:bottom-20 lg:sm:bottom-4`).

### 2. إضافة Haptic Feedback (DashboardLayout.tsx)

إضافة اهتزاز خفيف عند فتح/إغلاق القائمة بالسحب باستخدام `navigator.vibrate`:
```tsx
// في handleTouchEnd عند الإغلاق:
if (dragOffset > CLOSE_THRESHOLD) {
  navigator.vibrate?.(15);
  setMobileSidebarOpen(false);
}

// في handleMainTouchEnd عند الفتح:
if (edgeDrag > CLOSE_THRESHOLD) {
  navigator.vibrate?.(15);
  setMobileSidebarOpen(true);
}
```

### 3. تحسين أداء السحب بـ `will-change` و `requestAnimationFrame` (DashboardLayout.tsx)

**المشكلة**: `setDragOffset` و `setEdgeDrag` يُستدعيان في كل `touchmove` مما يسبب re-render متكرر.

**الحل**: استخدام `useRef` + `requestAnimationFrame` لتحديث `transform` مباشرة على DOM بدون re-render:
```tsx
const sidebarRef = useRef<HTMLElement>(null);
const overlayRef = useRef<HTMLDivElement>(null);
const dragOffsetRef = useRef(0);

// في handleTouchMove — تحديث DOM مباشرة:
const handleTouchMove = useCallback((e: React.TouchEvent) => {
  const delta = Math.max(0, e.touches[0].clientX - sidebarTouchStartX.current);
  dragOffsetRef.current = delta;
  requestAnimationFrame(() => {
    if (sidebarRef.current) {
      sidebarRef.current.style.transform = `translateX(${delta}px)`;
    }
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0, 1 - delta / SIDEBAR_W) * 0.5);
    }
  });
}, []);
```

إضافة `will-change: transform` على `<aside>` الجوال و `will-change: opacity` على overlay أثناء السحب فقط.

عند `touchEnd`: قراءة `dragOffsetRef.current` للقرار، ثم إزالة inline styles وتطبيق setState مرة واحدة فقط.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AiAssistant.tsx` | رفع الزر العائم فوق الشريط السفلي |
| `src/components/DashboardLayout.tsx` | haptic + rAF بدلاً من setState المتكرر |

