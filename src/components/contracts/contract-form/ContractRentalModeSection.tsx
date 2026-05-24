/**
 * قسم اختيار نوع التأجير + اختيار الوحدات/التعدد + التسعير
 */
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { type ContractFormData, type RentalMode } from '@/types/forms/contract';
import type { Contract, Unit } from '@/types';
import ContractMultiUnitBlock from './ContractMultiUnitBlock';

interface ContractRentalModeSectionProps {
  formData: ContractFormData;
  setFormData: (fn: ContractFormData | ((prev: ContractFormData) => ContractFormData)) => void;
  propertyUnits: Unit[];
  occupiedUnitIds: Map<string, string>;
  editingContract: Contract | null;
  isMulti: boolean;
  selectedCount: number;
  toggleUnit: (unitId: string) => void;
}

export default function ContractRentalModeSection({
  formData, setFormData, propertyUnits, occupiedUnitIds,
  editingContract, isMulti, selectedCount, toggleUnit,
}: ContractRentalModeSectionProps) {
  if (!formData.property_id) return null;

  const unitOptions = propertyUnits.map(u => ({
    value: u.id,
    label: `${u.unit_type} ${u.unit_number} ${u.floor ? `(${u.floor})` : ''} ${occupiedUnitIds.has(u.id) ? `— مؤجرة: ${occupiedUnitIds.get(u.id)}` : ''}`,
    disabled: occupiedUnitIds.has(u.id),
  }));

  const unitEditOptions = [
    { value: 'full', label: 'العقار كامل' },
    ...propertyUnits.map(u => ({ value: u.id, label: `${u.unit_type} ${u.unit_number}` })),
  ];

  return (
    <>
      {!editingContract && (
        <div className="space-y-2">
          <Label>نوع التأجير</Label>
          <RadioGroup
            value={formData.rental_mode}
            onValueChange={(value: RentalMode) => setFormData({ ...formData, rental_mode: value, unit_id: '', selected_unit_ids: [], rent_per_unit: {} })}
            className="flex flex-wrap gap-2"
            dir="rtl"
          >
            <Label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${formData.rental_mode === 'full' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="full" />
              <span className="text-sm">العقار كامل</span>
            </Label>
            <Label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${formData.rental_mode === 'single' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="single" />
              <span className="text-sm">وحدة واحدة</span>
            </Label>
            {propertyUnits.length > 1 && (
              <Label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${formData.rental_mode === 'multi' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
                <RadioGroupItem value="multi" />
                <span className="text-sm">وحدات متعددة</span>
              </Label>
            )}
          </RadioGroup>
        </div>
      )}

      {formData.rental_mode === 'single' && !editingContract && (
        <div className="space-y-2">
          <Label htmlFor="contract-form-dialog-select-2">الوحدة</Label>
          <NativeSelect id="contract-form-dialog-select-2" value={formData.unit_id}
            onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
            options={unitOptions}
            placeholder="اختر الوحدة"
          />
        </div>
      )}

      {editingContract && (
        <div className="space-y-2">
          <Label htmlFor="contract-form-dialog-select-3">الوحدة</Label>
          <NativeSelect id="contract-form-dialog-select-3" value={formData.unit_id || 'full'}
            onValueChange={(value) => setFormData({ ...formData, unit_id: value === 'full' ? '' : value })}
            options={unitEditOptions}
          />
        </div>
      )}

      {isMulti && !editingContract && (
        <ContractMultiUnitBlock
          formData={formData}
          setFormData={setFormData}
          propertyUnits={propertyUnits}
          occupiedUnitIds={occupiedUnitIds}
          selectedCount={selectedCount}
          toggleUnit={toggleUnit}
        />
      )}
    </>
  );
}
