/**
 * ملخص صلاحيات الناظر — عرض مرئي شامل لكل ما يتحكم به الناظر
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, FileText, DollarSign, Receipt, Users, BarChart3,
  Wallet, UserCog, Settings, MessageSquare, ShieldCheck, BookOpen,
  Lock, Headset, ClipboardList, GitBranch, Palette, Globe,
  Bell, Calendar, Banknote, Database, Upload, Eye, KeyRound, Crown,
} from 'lucide-react';

interface CapabilityItem {
  icon: React.ElementType;
  label: string;
  details: string;
}

interface CapabilityGroup {
  title: string;
  /** CSS class for text color — يستخدم متغيرات CSS */
  colorClass: string;
  /** CSS class for background */
  bgClass: string;
  /** CSS class for border */
  borderClass: string;
  items: CapabilityItem[];
}

const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    title: 'إدارة العقارات والعقود',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/5',
    borderClass: 'border-primary/20',
    items: [
      { icon: Building2, label: 'العقارات', details: 'إضافة، تعديل، حذف، عرض جميع العقارات والوحدات' },
      { icon: FileText, label: 'العقود', details: 'إنشاء عقود جديدة، تعديل، إنهاء، تجديد' },
      { icon: Receipt, label: 'الفواتير', details: 'إصدار فواتير، تحصيل، إلغاء، ربط ZATCA' },
    ],
  },
  {
    title: 'الإدارة المالية',
    colorClass: 'text-success',
    bgClass: 'bg-success/5',
    borderClass: 'border-success/20',
    items: [
      { icon: DollarSign, label: 'الدخل', details: 'تسجيل إيرادات، ربط بعقود وعقارات' },
      { icon: Receipt, label: 'المصروفات', details: 'تسجيل مصروفات، ميزانيات، تصنيف' },
      { icon: Wallet, label: 'الحسابات', details: 'إقفال سنة مالية، توزيع أرباح، تعديل بيانات مقفلة' },
      { icon: Calendar, label: 'السنوات المالية', details: 'إنشاء، إقفال، إعادة فتح — الوحيد القادر على تعديل المقفلة' },
      { icon: Banknote, label: 'السُلف', details: 'الموافقة على طلبات السلف، صرف، ترحيل' },
      { icon: GitBranch, label: 'الشجرة المحاسبية', details: 'إدارة التصنيفات والحسابات المحاسبية' },
    ],
  },
  {
    title: 'المستخدمون والصلاحيات',
    colorClass: 'text-[hsl(var(--chart-4))]',
    bgClass: 'bg-[hsl(var(--chart-4)/0.05)]',
    borderClass: 'border-[hsl(var(--chart-4)/0.2)]',
    items: [
      { icon: UserCog, label: 'إدارة المستخدمين', details: 'إضافة مستخدمين، تعيين أدوار، تعطيل حسابات' },
      { icon: Users, label: 'المستفيدين', details: 'إضافة مستفيدين، تعديل حصص، ربط حسابات' },
      { icon: Crown, label: 'إدارة الصلاحيات', details: 'التحكم بما يراه كل دور — مُستثنى من أي قيود' },
      { icon: KeyRound, label: 'الأمان', details: 'إعدادات الأمان، مهلة الخمول، تعقيد كلمة المرور' },
    ],
  },
  {
    title: 'المظهر والتخصيص',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/5',
    borderClass: 'border-warning/20',
    items: [
      { icon: Palette, label: 'المظهر والألوان', details: 'تغيير الثيم، الألوان، الوضع الليلي' },
      { icon: Globe, label: 'الواجهة الرئيسية', details: 'تخصيص صفحة الهبوط، النصوص، الصور' },
      { icon: Upload, label: 'الشعار والبيانات', details: 'رفع شعار الوقف، تعديل الاسم والوصف' },
      { icon: Settings, label: 'القائمة', details: 'تغيير أسماء عناصر القائمة الجانبية' },
      { icon: Bell, label: 'شريط التنبيه', details: 'إظهار/إخفاء شريط الإعلانات العلوي' },
    ],
  },
  {
    title: 'المراقبة والتقارير',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/5',
    borderClass: 'border-destructive/20',
    items: [
      { icon: ShieldCheck, label: 'سجل المراجعة', details: 'عرض كل العمليات على النظام بالتفصيل' },
      { icon: BarChart3, label: 'التقارير', details: 'تقارير مالية، مقارنات تاريخية، تصدير' },
      { icon: ClipboardList, label: 'التقرير السنوي', details: 'إعداد ونشر التقرير السنوي للمستفيدين' },
      { icon: Database, label: 'تصدير البيانات', details: 'تصدير كامل البيانات بصيغ متعددة' },
      { icon: Eye, label: 'تشخيص النظام', details: 'فحص صحة النظام والأداء' },
    ],
  },
  {
    title: 'التواصل والدعم',
    colorClass: 'text-info',
    bgClass: 'bg-info/5',
    borderClass: 'border-info/20',
    items: [
      { icon: MessageSquare, label: 'المراسلات', details: 'إرسال رسائل فردية وجماعية لجميع المستخدمين' },
      { icon: Bell, label: 'الإشعارات', details: 'إرسال إشعارات فردية وجماعية' },
      { icon: Headset, label: 'الدعم الفني', details: 'إدارة تذاكر الدعم، الرد، الإغلاق' },
      { icon: BookOpen, label: 'اللائحة التنظيمية', details: 'إضافة وتعديل بنود اللائحة' },
    ],
  },
  {
    title: 'التكاملات',
    colorClass: 'text-[hsl(var(--chart-1))]',
    bgClass: 'bg-[hsl(var(--chart-1)/0.05)]',
    borderClass: 'border-[hsl(var(--chart-1)/0.2)]',
    items: [
      { icon: Lock, label: 'ZATCA / الضريبة', details: 'إدارة شهادات ZATCA، إرسال الفواتير للهيئة' },
    ],
  },
];

const AdminCapabilitiesSummary = () => {
  const totalItems = CAPABILITY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            ملخص صلاحيات الناظر
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalItems} صلاحية في {CAPABILITY_GROUPS.length} مجموعات
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {CAPABILITY_GROUPS.map(group => (
          <div key={group.title} className={`rounded-lg border p-3 ${group.bgClass} ${group.borderClass}`}>
            <h3 className={`font-semibold text-sm mb-2 ${group.colorClass}`}>{group.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.items.map(item => (
                <div key={item.label} className="flex items-start gap-2 bg-background/60 rounded-md p-2">
                  <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${group.colorClass}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{item.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminCapabilitiesSummary;
