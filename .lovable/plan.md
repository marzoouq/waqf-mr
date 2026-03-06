

# خطة: إصلاح isActive + حفظ طي القائمة + بطاقات جوال لـ MySharePage

## التحقق من الوضع الحالي

- **ContractsViewPage**: لديه بالفعل بطاقات جوال عبر `isMobile` (سطر 150-191) -- لا يحتاج تعديل
- **MySharePage**: يحتوي على 3 جداول (توزيعات، سلف، فروق مرحّلة) بدون أي عرض بطاقات جوال -- يحتاج إضافة
- **Sidebar isActive**: يستخدم `===` فقط (سطر 67) -- لا يدعم مسارات فرعية
- **sidebarOpen**: يبدأ بـ `useState(false)` بدون حفظ في localStorage

## التغييرات المطلوبة

### 1. إصلاح isActive في Sidebar.tsx (سطر 67)

```tsx
// من:
const isActive = location.pathname === link.to;

// إلى:
const isActive = location.pathname === link.to ||
  (link.to !== '/dashboard' && link.to !== '/beneficiary' && link.to !== '/waqif' &&
   location.pathname.startsWith(link.to + '/'));
```

هذا يحمي الصفحات الرئيسية من التفعيل الخاطئ (مثلاً `/dashboard` لا يُفعَّل عند `/dashboard/contracts`) بينما يدعم المسارات الفرعية مثل `/dashboard/contracts/123`.

### 2. حفظ sidebarOpen في localStorage (DashboardLayout.tsx سطر 135)

```tsx
// من:
const [sidebarOpen, setSidebarOpen] = useState(false);

// إلى:
const [sidebarOpen, setSidebarOpen] = useState(() => {
  try { return localStorage.getItem('sidebar-open') === 'true'; }
  catch { return false; }
});

// + useEffect لحفظ التغيير:
useEffect(() => {
  try { localStorage.setItem('sidebar-open', String(sidebarOpen)); }
  catch {}
}, [sidebarOpen]);
```

### 3. بطاقات جوال لـ MySharePage (3 جداول)

إضافة `useIsMobile` ثم لكل جدول من الثلاثة (التوزيعات سطر 448، السلف سطر 484، الفروق المرحّلة سطر 525):

- **جدول التوزيعات**: عرض بطاقات بـ `md:hidden` يظهر التاريخ، السنة المالية، المبلغ، الحالة
- **جدول السلف**: بطاقات تظهر التاريخ، المبلغ، السبب، الحالة
- **جدول الفروق المرحّلة**: بطاقات تظهر التاريخ، المبلغ، الحالة، الملاحظات

كل جدول يُغلَّف بـ `hidden md:block` وبطاقات بـ `block md:hidden`.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/Sidebar.tsx` | إصلاح isActive |
| `src/components/DashboardLayout.tsx` | حفظ sidebarOpen في localStorage |
| `src/pages/beneficiary/MySharePage.tsx` | إضافة بطاقات جوال لـ 3 جداول + import useIsMobile |

