/**
 * محدد القالب (TemplateSelector)
 */
import { Button } from '@/components/ui/button';
import { FileText, Receipt } from 'lucide-react';

export function TemplateSelector({ value, onChange }: { value: 'professional' | 'simplified'; onChange: (v: 'professional' | 'simplified') => void }) {
  return (
    <div className="flex gap-2 justify-center">
      <Button variant={value === 'professional' ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => onChange('professional')}>
        <FileText className="w-4 h-4" />الاحترافي
      </Button>
      <Button variant={value === 'simplified' ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => onChange('simplified')}>
        <Receipt className="w-4 h-4" />المبسط
      </Button>
    </div>
  );
}
