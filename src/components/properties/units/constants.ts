/** ثوابت مشتركة لمكونات وحدات العقار */

export const UNIT_TYPES = ['شقة', 'محل', 'مكتب', 'مستودع', 'أخرى'];
export const FLOORS = ['بدروم', 'أرضي', 'ميزانين', 'أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سطح'];
export const UNIT_STATUSES = ['شاغرة', 'مؤجرة', 'صيانة'];

export const PAYMENT_TYPES = [
  { value: 'annual', label: 'سنوي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'multi', label: 'دفعات متعددة' },
];

export const statusColor = (status: string) => {
  switch (status) {
    case 'مؤجرة': return 'default' as const;
    case 'شاغرة': return 'secondary' as const;
    case 'صيانة': return 'destructive' as const;
    default: return 'outline' as const;
  }
};
