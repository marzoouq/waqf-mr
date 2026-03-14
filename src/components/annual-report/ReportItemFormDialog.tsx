/**
 * ديالوج إضافة/تعديل عنصر في التقرير السنوي
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AnnualReportItem, SectionType } from '@/hooks/useAnnualReport';

interface Property {
  id: string;
  property_number: string;
  location: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AnnualReportItem | null;
  sectionType: SectionType;
  properties?: Property[];
  onSubmit: (data: { title: string; content: string; section_type: SectionType; property_id?: string | null }) => void;
  isPending?: boolean;
}

const sectionLabels: Record<SectionType, string> = {
  achievement: 'إنجاز',
  challenge: 'تحدي',
  future_plan: 'خطة مستقبلية',
  property_status: 'حالة عقار',
};

const ReportItemFormDialog: React.FC<Props> = ({
  open, onOpenChange, item, sectionType, properties, onSubmit, isPending,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [propertyId, setPropertyId] = useState<string>('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setContent(item.content);
      setPropertyId(item.property_id || '');
    } else {
      setTitle('');
      setContent('');
      setPropertyId('');
    }
  }, [item, open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      section_type: sectionType,
      property_id: sectionType === 'property_status' ? (propertyId || null) : null,
    });
  };

  const isEdit = !!item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل' : 'إضافة'} {sectionLabels[sectionType]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {sectionType === 'property_status' && properties && (
            <div className="space-y-1.5">
              <Label>العقار</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.property_number} — {p.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>العنوان</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان العنصر" />
          </div>
          <div className="space-y-1.5">
            <Label>التفاصيل</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="اكتب التفاصيل هنا..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportItemFormDialog;
