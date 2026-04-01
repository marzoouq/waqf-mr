/**
 * مكوّن اختيار المستهدفين للرسائل الجماعية
 */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

interface Beneficiary {
  id: string;
  name: string;
  user_id: string | null;
}

interface RecipientSelectorProps {
  beneficiaries: Beneficiary[];
  target: 'all' | 'selected';
  setTarget: (t: 'all' | 'selected') => void;
  selectedIds: string[];
  toggleBeneficiary: (id: string) => void;
}

const RecipientSelector = ({ beneficiaries, target, setTarget, selectedIds, toggleBeneficiary }: RecipientSelectorProps) => (
  <div className="space-y-3 border-t pt-4">
    <Label className="flex items-center gap-2">
      <Users className="w-4 h-4" />
      المستهدفون
    </Label>
    <div className="flex gap-3">
      <Button variant={target === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTarget('all')}>
        جميع المستفيدين ({beneficiaries.length})
      </Button>
      <Button variant={target === 'selected' ? 'default' : 'outline'} size="sm" onClick={() => setTarget('selected')}>
        اختيار محدد
      </Button>
    </div>

    {target === 'selected' && (
      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
        {beneficiaries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مستفيدون مرتبطون بحسابات</p>
        ) : (
          beneficiaries.map(b => (
            <label key={b.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
              <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggleBeneficiary(b.id)} />
              <span className="text-sm">{b.name}</span>
            </label>
          ))
        )}
      </div>
    )}
  </div>
);

export default RecipientSelector;
