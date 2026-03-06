

# خطة: إضافة Swipe للقائمة الجانبية + إصلاحات متبقية

## التحقق من الوضع الحالي

| العنصر | الحالة |
|--------|--------|
| isActive للمسارات الفرعية | مُنفَّذ (سطر 67-69 في Sidebar.tsx) |
| localStorage لحالة الطي | مُنفَّذ (سطر 135-143 في DashboardLayout.tsx) |
| Swipe لإغلاق القائمة | غير مُنفَّذ -- فقط نقر على overlay |
| UserManagementPage overflow-x-auto | غير مُنفَّذ -- `min-w-[700px]` بدون wrapper |
| CarryforwardHistoryPage min-w | مُنفَّذ -- `overflow-x-auto` موجود |

## التغييرات المطلوبة

### 1. إضافة Swipe لإغلاق القائمة الجانبية (DashboardLayout.tsx)

إضافة touch event handlers على `<aside>` الجوال لدعم السحب لليمين (RTL) لإغلاق القائمة:

```tsx
// إضافة refs و handlers قبل return
const touchStartX = useRef<number>(0);
const touchDeltaX = useRef<number>(0);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
  touchDeltaX.current = 0;
};

const handleTouchMove = (e: React.TouchEvent) => {
  touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
};

const handleTouchEnd = () => {
  // في RTL: السحب لليمين (delta > 0) يعني إغلاق القائمة
  if (touchDeltaX.current > 60) {
    setMobileSidebarOpen(false);
  }
};
```

ثم تطبيقها على `<aside>` الجوال:
```tsx
<aside
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  className={cn(...)}
>
```

### 2. إضافة overflow-x-auto لـ UserManagementPage (سطر ~338)

```tsx
// من:
<CardContent>
  {isLoading ? (...) : (
    <Table className="min-w-[700px]">

// إلى:
<CardContent className="p-0 sm:p-6">
  {isLoading ? (...) : (
    <div className="overflow-x-auto">
      <Table className="min-w-[700px]">
      ...
      </Table>
    </div>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/DashboardLayout.tsx` | إضافة touch handlers + useRef للسحب |
| `src/pages/dashboard/UserManagementPage.tsx` | تغليف الجدول بـ overflow-x-auto |

