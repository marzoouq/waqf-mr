import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUnits } from '@/hooks/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { getContractSpanInfo } from '@/utils/contractAllocation';
import { Contract } from '@/types/database';
import { TENANT_ID_TYPES } from '@/constants';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Building2, CheckSquare, Info } from 'lucide-react';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContract: Contract | null;
  properties: Array<{ id: string; property_number: string; location: string }>;
  activeContracts?: Contract[];
  onSubmit: (formData: ContractFormData, isEditing: boolean) => Promise<void>;
  onReset: () => void;
  isPending: boolean;
  initialFormData?: ContractFormData;
}

export type RentalMode = 'full' | 'single' | 'multi';
export type PricingMode = 'total' | 'per_unit';

export interface ContractFormData {
  contract_number: string;
  property_id: string;
  unit_id: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  status: string;
  notes: string;
  payment_type: string;
  payment_count: string;
  // Multi-unit fields
  rental_mode: RentalMode;
  selected_unit_ids: string[];
  pricing_mode: PricingMode;
  rent_per_unit: Record<string, string>;
  // VAT
  vat_applicable: boolean;
  // Tenant identity
  tenant_id_type: string;
  tenant_id_number: string;
  tenant_tax_number: string;
  tenant_crn: string;
  tenant_street: string;
  tenant_building: string;
  tenant_district: string;
  tenant_city: string;
  tenant_postal_code: string;
}

export const emptyFormData: ContractFormData = {
  contract_number: '', property_id: '', unit_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '',
  payment_type: 'annual', payment_count: '1',
  rental_mode: 'single', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {},
  vat_applicable: false,
  tenant_id_type: 'NAT', tenant_id_number: '', tenant_tax_number: '', tenant_crn: '', tenant_street: '', tenant_building: '', tenant_district: '', tenant_city: '', tenant_postal_code: '',
};

const ContractFormDialog = ({ open, onOpenChange, editingContract, properties, activeContracts = [], onSubmit, onReset, isPending, initialFormData }: ContractFormDialogProps) => {
  const [formData, setFormData] = useState<ContractFormData>(initialFormData || emptyFormData);
  const { data: propertyUnits = [] } = useUnits(formData.property_id || undefined);
  const { fiscalYears } = useFiscalYear();

  // Sync form when initialFormData changes
  const [lastInitial, setLastInitial] = useState(initialFormData);
  if (initialFormData !== lastInitial) {
    setLastInitial(initialFormData);
    if (initialFormData) setFormData(initialFormData);
  }

  // Find units that already have active contracts
  const occupiedUnitIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of activeContracts) {
      if (c.unit_id && c.status === 'active' && c.property_id === formData.property_id) {
        map.set(c.unit_id, c.tenant_name);
      }
    }
    return map;
  }, [activeContracts, formData.property_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number || !formData.property_id || !formData.tenant_name || !formData.start_date || !formData.end_date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (formData.rental_mode === 'multi') {
      if (formData.selected_unit_ids.length === 0) {
        toast.error('يرجى اختيار وحدة واحدة على الأقل');
        return;
      }
      if (formData.pricing_mode === 'per_unit') {
        const allFilled = formData.selected_unit_ids.every(id => parseFloat(formData.rent_per_unit[id]) > 0);
        if (!allFilled) {
          toast.error('يرجى تحديد قيمة الإيجار لكل وحدة');
          return;
        }
      } else if (!formData.rent_amount || parseFloat(formData.rent_amount) <= 0) {
        toast.error('يرجى إدخال قيمة الإيجار الإجمالي');
        return;
      }
    } else if (!formData.rent_amount) {
      toast.error('يرجى إدخال قيمة الإيجار');
      return;
    }
    await onSubmit(formData, !!editingContract);
    onOpenChange(false);
    setFormData(emptyFormData);
    onReset();
  };

  const toggleUnit = (unitId: string) => {
    setFormData(prev => {
      const ids = prev.selected_unit_ids.includes(unitId)
        ? prev.selected_unit_ids.filter(id => id !== unitId)
        : [...prev.selected_unit_ids, unitId];
      return { ...prev, selected_unit_ids: ids };
    });
  };

  const isMulti = formData.rental_mode === 'multi';
  const selectedCount = formData.selected_unit_ids.length;

  // Calculate per-unit amount for total pricing mode
  const perUnitAmount = isMulti && formData.pricing_mode === 'total' && selectedCount > 0 && formData.rent_amount
    ? parseFloat(formData.rent_amount) / selectedCount
    : 0;

  // Suffix letters
  const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setFormData(emptyFormData); onReset(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل عقد إيجار</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>رقم العقد *</Label><Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder="مثال: C-2024-001" /></div>
          <div className="space-y-2">
            <Label>العقار *</Label>
            <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value, unit_id: '', selected_unit_ids: [], rent_per_unit: {} })}>
              <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
              <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          {/* Rental Mode Selection */}
          {formData.property_id && !editingContract && (
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

          {/* Single unit select */}
          {formData.property_id && formData.rental_mode === 'single' && (
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
                <SelectTrigger><SelectValue placeholder="اختر الوحدة" /></SelectTrigger>
                <SelectContent>
                  {propertyUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} disabled={occupiedUnitIds.has(u.id)}>
                      {u.unit_type} {u.unit_number} {u.floor ? `(${u.floor})` : ''} {occupiedUnitIds.has(u.id) ? `— مؤجرة: ${occupiedUnitIds.get(u.id)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Editing mode - keep original unit select */}
          {formData.property_id && editingContract && (
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value === 'full' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="العقار كامل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">العقار كامل</SelectItem>
                  {propertyUnits.map((u) => (<SelectItem key={u.id} value={u.id}>{u.unit_type} {u.unit_number}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Multi-unit checkboxes */}
          {formData.property_id && isMulti && !editingContract && (
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
                              {u.floor && <span className="text-xs text-muted-foreground mr-2">({u.floor})</span>}
                            </div>
                            {isOccupied && <span className="text-[10px] text-destructive">مؤجرة</span>}
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

              {/* Pricing mode */}
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
                            <Input
                              type="number"
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
                        الإجمالي: {formData.selected_unit_ids.reduce((sum, id) => sum + (parseFloat(formData.rent_per_unit[id]) || 0), 0).toLocaleString('ar-SA')} ر.س
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2"><Label>اسم المستأجر *</Label><Input value={formData.tenant_name} onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })} placeholder="اسم المستأجر" /></div>

          {/* بيانات هوية المستأجر */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <Label className="text-sm font-medium">بيانات هوية المستأجر</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">نوع الهوية</Label>
                <Select value={formData.tenant_id_type} onValueChange={(value) => setFormData({ ...formData, tenant_id_type: value })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENANT_ID_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">رقم الهوية</Label>
                <Input className="h-9" value={formData.tenant_id_number} onChange={(e) => setFormData({ ...formData, tenant_id_number: e.target.value })} placeholder="رقم الهوية" maxLength={20} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الرقم الضريبي (VAT)</Label>
                <Input className="h-9" value={formData.tenant_tax_number} onChange={(e) => setFormData({ ...formData, tenant_tax_number: e.target.value })} placeholder="3xxxxxxxxxx0003" maxLength={15} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">رقم السجل التجاري</Label>
                <Input className="h-9" value={formData.tenant_crn} onChange={(e) => setFormData({ ...formData, tenant_crn: e.target.value })} placeholder="رقم السجل التجاري" maxLength={15} />
              </div>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">عنوان المستأجر (اختياري — مطلوب للفواتير القياسية)</summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1"><Label className="text-xs">الشارع</Label><Input className="h-8 text-xs" value={formData.tenant_street} onChange={(e) => setFormData({ ...formData, tenant_street: e.target.value })} maxLength={100} /></div>
                <div className="space-y-1"><Label className="text-xs">المبنى</Label><Input className="h-8 text-xs" value={formData.tenant_building} onChange={(e) => setFormData({ ...formData, tenant_building: e.target.value })} maxLength={50} /></div>
                <div className="space-y-1"><Label className="text-xs">الحي</Label><Input className="h-8 text-xs" value={formData.tenant_district} onChange={(e) => setFormData({ ...formData, tenant_district: e.target.value })} maxLength={100} /></div>
                <div className="space-y-1"><Label className="text-xs">المدينة</Label><Input className="h-8 text-xs" value={formData.tenant_city} onChange={(e) => setFormData({ ...formData, tenant_city: e.target.value })} maxLength={100} /></div>
                <div className="space-y-1"><Label className="text-xs">الرمز البريدي</Label><Input className="h-8 text-xs" value={formData.tenant_postal_code} onChange={(e) => setFormData({ ...formData, tenant_postal_code: e.target.value })} maxLength={10} /></div>
              </div>
            </details>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
          </div>

          {/* Rent amount - shown for non-multi or multi with total pricing */}
          {(!isMulti || formData.pricing_mode === 'total') && (
            <div className="space-y-2">
              <Label>{isMulti ? 'الإيجار الإجمالي (ر.س) *' : 'قيمة الإيجار السنوي (ر.س) *'}</Label>
              <Input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder="10000" />
              {isMulti && perUnitAmount > 0 && (
                <p className="text-xs text-muted-foreground">= {perUnitAmount.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س لكل وحدة</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>نوع الدفع *</Label>
            <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value, payment_count: value === 'monthly' ? '12' : value === 'annual' ? '1' : formData.payment_count })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">سنوي (دفعة واحدة)</SelectItem>
                <SelectItem value="monthly">شهري (12 دفعة)</SelectItem>
                <SelectItem value="multi">دفعات متعددة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.payment_type === 'multi' && (
            <div className="space-y-2">
              <Label>عدد الدفعات *</Label>
              <Input type="number" min="2" max="12" value={formData.payment_count} onChange={(e) => setFormData({ ...formData, payment_count: e.target.value })} placeholder="2-12" />
            </div>
          )}
          {/* VAT Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="vat-switch" className="text-sm font-medium">خاضع لضريبة القيمة المضافة (15%)</Label>
              <p className="text-xs text-muted-foreground">تفعيل VAT على فواتير هذا العقد</p>
            </div>
            <Switch
              id="vat-switch"
              checked={formData.vat_applicable}
              onCheckedChange={(checked) => setFormData({ ...formData, vat_applicable: checked })}
            />
          </div>

          {formData.rent_amount && !isMulti && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">قيمة الدفعة الواحدة:</span>
                <span className="font-bold text-primary">
                  {(parseFloat(formData.rent_amount) / (formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1))).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
              {formData.vat_applicable && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة (15%):</span>
                    <span className="text-muted-foreground">
                      {((parseFloat(formData.rent_amount) / (formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1))) * 0.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                    <span className="font-medium">الإجمالي شاملاً الضريبة:</span>
                    <span className="font-bold text-primary">
                      {((parseFloat(formData.rent_amount) / (formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1))) * 1.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Multi-unit contract number preview */}
          {isMulti && selectedCount > 0 && formData.contract_number && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p className="text-muted-foreground text-xs">سيتم إنشاء {selectedCount} عقد:</p>
              <div className="flex flex-wrap gap-1.5">
                {formData.selected_unit_ids.map((_, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                    {formData.contract_number}-{suffixLetters[i] || (i + 1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fiscal year span alert */}
          {formData.start_date && formData.end_date && formData.rent_amount && parseFloat(formData.rent_amount) > 0 && (() => {
            const paymentCount = formData.payment_type === 'monthly' ? 12 : (formData.payment_type === 'annual' ? 1 : parseInt(formData.payment_count) || 1);
            const spanInfo = getContractSpanInfo(
              {
                id: 'preview',
                start_date: formData.start_date,
                end_date: formData.end_date,
                rent_amount: parseFloat(formData.rent_amount),
                payment_type: formData.payment_type,
                payment_count: paymentCount,
                payment_amount: parseFloat(formData.rent_amount) / paymentCount,
              },
              fiscalYears
            );
            if (spanInfo.spansMultiple) {
              return (
                <Alert className="border-primary/40 bg-primary/5">
                  <Info className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-sm space-y-1">
                    <p className="font-medium text-primary">هذا العقد يمتد عبر {spanInfo.allocations.length} سنوات مالية</p>
                    {spanInfo.allocations.map(a => {
                      const fy = fiscalYears.find(f => f.id === a.fiscal_year_id);
                      return (
                        <p key={a.fiscal_year_id} className="text-muted-foreground">
                          {fy?.label || 'سنة مالية'}: {a.allocated_payments} دفعة = {a.allocated_amount.toLocaleString('ar-SA')} ر.س
                        </p>
                      );
                    })}
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="expired">منتهي</SelectItem><SelectItem value="pending">معلق</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>
              {isMulti && selectedCount > 1 ? `إنشاء ${selectedCount} عقود` : editingContract ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setFormData(emptyFormData); onReset(); }}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractFormDialog;
