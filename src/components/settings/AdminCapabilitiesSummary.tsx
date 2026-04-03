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
  color: string;
  bgColor: string;
  borderColor: string;
  items: CapabilityItem[];
}

const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    title: 'إدارة العقارات والعقود',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    items: [
      { icon: Building2, label: 'العقارات', details: 'إضافة، تعديل، حذف، عرض جميع العقارات والوحدات' },
      { icon: FileText, label: 'العقود', details: 'إنشاء عقود جديدة، تعديل، إنهاء، تجديد' },
      { icon: Receipt, label: 'الفواتير', details: 'إصدار فواتير، تحصيل، إلغاء، ربط ZATCA' },
    ],
  },
  {
    title: 'الإدارة المالية',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
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
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    items: [
      { icon: UserCog, label: 'إدارة المستخدمين', details: 'إضافة مستخدمين، تعيين أدوار، تعطيل حسابات' },
      { icon: Users, label: 'المستفيدين', details: 'إضافة مستفيدين، تعديل حصص، ربط حسابات' },
      { icon: Crown, label: 'إدارة الصلاحيات', details: 'التحكم بما يراه كل دور — مُستثنى من أي قيود' },
      { icon: KeyRound, label: 'الأمان', details: 'إعدادات الأمان، مهلة الخمول، تعقيد كلمة المرور' },
    ],
  },
  {
    title: 'المظهر والتخصيص',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
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
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800',
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
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    items: [
      { icon: MessageSquare, label: 'المراسلات', details: 'إرسال رسائل فردية وجماعية لجميع المستخدمين' },
      { icon: Bell, label: 'الإشعارات', details: 'إرسال إشعارات فردية وجماعية' },
      { icon: Headset, label: 'الدعم الفني', details: 'إدارة تذاكر الدعم، الرد، الإغلاق' },
      { icon: BookOpen, label: 'اللائحة التنظيمية', details: 'إضافة وتعديل بنود اللائحة' },
    ],
  },
  {
    title: 'التكاملات',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
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
          <div key={group.title} className={`rounded-lg border p-3 ${group.bgColor} ${group.borderColor}`}>
            <h3 className={`font-semibold text-sm mb-2 ${group.color}`}>{group.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.items.map(item => (
                <div key={item.label} className="flex items-start gap-2 bg-background/60 rounded-md p-2">
                  <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${group.color}`} />
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
