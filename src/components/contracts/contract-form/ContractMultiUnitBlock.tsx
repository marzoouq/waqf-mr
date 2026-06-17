/**
 * كتلة الوحدات المتعددة + التسعير (إجمالي / لكل وحدة)
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, CheckSquare } from 'lucide-react';
import { type ContractFormData, type PricingMode } from '@/types/forms/contract';
import { fmt } from '@/utils/format/format';
import type { Unit } from '@/types';

interface Props {
  formData: ContractFormData;
  setFormData: (fn: ContractFormData | ((prev: ContractFormData) => ContractFormData)) => void;
  propertyUnits: Unit[];
  occupiedUnitIds: Map<string, string>;
  selectedCount: number;
  toggleUnit: (unitId: string) => void;
}

export default function ContractMultiUnitBlock({
  formData, setFormData, propertyUnits, occupiedUnitIds, selectedCount, toggleUnit,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          اختر الوحدات
        </Label>
        {selectedCount > 0 && (
          <span className="text-xs text-primary font-medium flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            تم اختيار {selectedCount} وحدة
          </span>
        )}
      </div>
      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
        {propertyUnits.map((u) => {
          const isOccupied = occupiedUnitIds.has(u.id);
          const isSelected = formData.selected_unit_ids.includes(u.id);
          return (
            <TooltipProvider key={u.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isOccupied ? 'opacity-50 cursor-not-allowed bg-muted/30' : isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => !isOccupied && toggleUnit(u.id)}
                      disabled={isOccupied}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{u.unit_type} {u.unit_number}</span>
                      {u.floor && <span className="text-xs text-muted-foreground ms-2">({u.floor})</span>}
                    </div>
                    {isOccupied && <span className="text-[11px] text-destructive">مؤجرة</span>}
                  </label>
                </TooltipTrigger>
                {isOccupied && (
                  <TooltipContent side="left">
                    <p>مؤجرة لـ: {occupiedUnitIds.get(u.id)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
          <Label className="text-sm font-medium">طريقة التسعير</Label>
          <RadioGroup
            value={formData.pricing_mode}
            onValueChange={(value: PricingMode) => setFormData({ ...formData, pricing_mode: value })}
            className="flex gap-4"
            dir="rtl"
          >
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="total" />
              إيجار إجمالي
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="per_unit" />
              إيجار لكل وحدة
            </Label>
          </RadioGroup>

          {formData.pricing_mode === 'per_unit' && (
            <div className="space-y-2">
              {formData.selected_unit_ids.map((unitId) => {
                const unit = propertyUnits.find(u => u.id === unitId);
                return (
                  <div key={unitId} className="flex items-center gap-2">
                    <span className="text-xs min-w-[80px]">{unit?.unit_type} {unit?.unit_number}:</span>
                    <Input name="rent_per_unit" id="contract-form-dialog-field-1" type="number"
                      value={formData.rent_per_unit[unitId] || ''}
                      onChange={(e) => setFormData({ ...formData, rent_per_unit: { ...formData.rent_per_unit, [unitId]: e.target.value } })}
                      placeholder="الإيجار"
                      className="h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">ر.س</span>
                  </div>
                );
              })}
              <div className="text-xs text-muted-foreground pt-1">
                الإجمالي: {fmt(formData.selected_unit_ids.reduce((sum, id) => sum + (parseFloat(formData.rent_per_unit[id] ?? '0') || 0), 0))} ر.س
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
