/**
 * قسم بيانات هوية المستأجر وعنوانه — مستخرج من ContractFormDialog
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { TENANT_ID_TYPES } from '@/constants';
import type { ContractFormData } from './contractForm.types';

interface Props {
  formData: ContractFormData;
  onChange: (patch: Partial<ContractFormData>) => void;
}

const tenantIdTypeOptions = TENANT_ID_TYPES.map(t => ({ value: t.value, label: t.label }));

const ContractTenantIdSection = ({ formData, onChange }: Props) => (
  <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
    <Label className="text-sm font-medium">بيانات هوية المستأجر</Label>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">نوع الهوية</Label>
        <NativeSelect
          value={formData.tenant_id_type}
          onValueChange={(value) => onChange({ tenant_id_type: value })}
          options={tenantIdTypeOptions}
          triggerClassName="h-9"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">رقم الهوية</Label>
        <Input id="tenant-id-number" name="tenant_id_number" className="h-9" value={formData.tenant_id_number} onChange={(e) => onChange({ tenant_id_number: e.target.value })} placeholder="رقم الهوية" maxLength={20} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">الرقم الضريبي (VAT)</Label>
        <Input id="tenant-tax-number" name="tenant_tax_number" className="h-9" value={formData.tenant_tax_number} onChange={(e) => onChange({ tenant_tax_number: e.target.value })} placeholder="3xxxxxxxxxx0003" maxLength={15} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">رقم السجل التجاري</Label>
        <Input className="h-9" value={formData.tenant_crn} onChange={(e) => onChange({ tenant_crn: e.target.value })} placeholder="رقم السجل التجاري" maxLength={15} />
      </div>
    </div>
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">عنوان المستأجر (اختياري — مطلوب للفواتير القياسية)</summary>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="space-y-1"><Label className="text-xs">الشارع</Label><Input className="h-8 text-xs" value={formData.tenant_street} onChange={(e) => onChange({ tenant_street: e.target.value })} maxLength={100} /></div>
        <div className="space-y-1"><Label className="text-xs">المبنى</Label><Input className="h-8 text-xs" value={formData.tenant_building} onChange={(e) => onChange({ tenant_building: e.target.value })} maxLength={50} /></div>
        <div className="space-y-1"><Label className="text-xs">الحي</Label><Input className="h-8 text-xs" value={formData.tenant_district} onChange={(e) => onChange({ tenant_district: e.target.value })} maxLength={100} /></div>
        <div className="space-y-1"><Label className="text-xs">المدينة</Label><Input className="h-8 text-xs" value={formData.tenant_city} onChange={(e) => onChange({ tenant_city: e.target.value })} maxLength={100} /></div>
        <div className="space-y-1"><Label className="text-xs">الرمز البريدي</Label><Input className="h-8 text-xs" value={formData.tenant_postal_code} onChange={(e) => onChange({ tenant_postal_code: e.target.value })} maxLength={10} /></div>
      </div>
    </details>
  </div>
);

export default ContractTenantIdSection;
