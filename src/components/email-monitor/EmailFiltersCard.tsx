/**
 * EmailFiltersCard — لوحة الفلاتر (نطاق + قالب + حالة)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailRange, EmailStatusFilter } from '@/hooks/page/admin/management/useEmailMonitorPage';

interface EmailFiltersCardProps {
  range: EmailRange;
  setRange: (r: EmailRange) => void;
  showCustom: boolean;
  setShowCustom: (v: boolean) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  templates: string[];
  templateFilter: string;
  setTemplateFilter: (v: string) => void;
  statusFilter: EmailStatusFilter;
  setStatusFilter: (v: EmailStatusFilter) => void;
}

export const EmailFiltersCard = ({
  range, setRange, showCustom, setShowCustom,
  customStart, setCustomStart, customEnd, setCustomEnd,
  templates, templateFilter, setTemplateFilter,
  statusFilter, setStatusFilter,
}: EmailFiltersCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">الفلاتر</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['24h', '7d', '30d'] as EmailRange[]).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? 'default' : 'outline'}
            onClick={() => { setRange(r); setShowCustom(false); }}
          >
            {r === '24h' ? 'آخر 24 ساعة' : r === '7d' ? 'آخر 7 أيام' : 'آخر 30 يوم'}
          </Button>
        ))}
        <Button
          size="sm"
          variant={range === 'custom' ? 'default' : 'outline'}
          onClick={() => { setRange('custom'); setShowCustom(true); }}
        >
          نطاق مخصص
        </Button>
      </div>

      {showCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">من</label>
            <Input
              type="datetime-local"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">إلى</label>
            <Input
              type="datetime-local"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">نوع القالب</label>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع القوالب</SelectItem>
              {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EmailStatusFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="sent">مُرسلة</SelectItem>
              <SelectItem value="pending">قيد الإرسال</SelectItem>
              <SelectItem value="failed">فشلت</SelectItem>
              <SelectItem value="dlq">فشل نهائي (DLQ)</SelectItem>
              <SelectItem value="suppressed">محجوبة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
);
