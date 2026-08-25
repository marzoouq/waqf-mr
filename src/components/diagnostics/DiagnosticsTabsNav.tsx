/**
 * شريط تنقّل مركز التشخيص — مجموعات هرمية على الشاشات الكبيرة
 * وقائمة اختيار أصلية على الجوال (بدلاً من 16 تبويباً متزاحماً).
 */
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DiagnosticsTab {
  value: string;
  label: string;
}

export interface DiagnosticsTabGroup {
  id: string;
  label: string;
  tabs: DiagnosticsTab[];
}

/** مصدر الحقيقة الوحيد لتبويبات مركز التشخيص */
export const DIAGNOSTICS_TAB_GROUPS: DiagnosticsTabGroup[] = [
  {
    id: 'general',
    label: 'عام',
    tabs: [
      { value: 'overview', label: 'نظرة عامة' },
      { value: 'fixes', label: '🛠 التوصيات والإصلاحات' },
      { value: 'checks', label: 'الفحوصات' },
    ],
  },
  {
    id: 'security',
    label: 'الأمان',
    tabs: [
      { value: 'security', label: '🛡 الأمان والاختراق' },
      { value: 'blocked', label: '🚫 العناوين المحجوبة' },
      { value: 'tracking', label: '🧭 تتبع المستخدمين' },
    ],
  },
  {
    id: 'performance',
    label: 'الأداء',
    tabs: [
      { value: 'db', label: '💾 أداء قاعدة البيانات' },
      { value: 'edge', label: '⚡ Edge Functions' },
      { value: 'performance', label: 'الأداء الحي' },
    ],
  },
  {
    id: 'logs',
    label: 'السجلات',
    tabs: [
      { value: 'errors', label: '⚠️ الأخطاء الحيّة' },
      { value: 'alerts', label: '🔔 التنبيهات' },
      { value: 'backend', label: 'سجل Backend' },
      { value: 'history', label: 'السجل والتصدير' },
    ],
  },
  {
    id: 'map',
    label: 'الخريطة والتشغيل',
    tabs: [
      { value: 'appmap', label: 'خريطة التطبيق' },
      { value: 'interactions', label: 'التفاعلات' },
      { value: 'maintenance', label: '🛠️ وضع الصيانة' },
    ],
  },
];

export const DIAGNOSTICS_TABS: DiagnosticsTab[] = DIAGNOSTICS_TAB_GROUPS.flatMap((g) => g.tabs);

interface Props {
  value: string;
  onValueChange: (value: string) => void;
}

export default function DiagnosticsTabsNav({ value, onValueChange }: Props) {
  return (
    <>
      {/* الجوال: قائمة اختيار واحدة */}
      <div className="md:hidden">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger aria-label="اختر قسم التشخيص">
            <SelectValue placeholder="اختر القسم" />
          </SelectTrigger>
          <SelectContent>
            {DIAGNOSTICS_TAB_GROUPS.map((group) =>
              group.tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {group.label} — {tab.label}
                </SelectItem>
              )),
            )}
          </SelectContent>
        </Select>
      </div>

      {/* سطح المكتب: مجموعات مرتّبة */}
      <div className="hidden md:block space-y-2">
        {DIAGNOSTICS_TAB_GROUPS.map((group) => (
          <div key={group.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-32 shrink-0">{group.label}</span>
            <TabsList className="flex-wrap h-auto">
              {group.tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        ))}
      </div>
    </>
  );
}
