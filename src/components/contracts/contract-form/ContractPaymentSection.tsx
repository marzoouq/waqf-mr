/**
 * قسم نوع الدفع + VAT + ملخص الدفعة + تنبيه السنوات المالية
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { type ContractFormData } from '../contractForm.types';
import { fmt } from '@/utils/format';
import { getContractSpanInfo } from '@/utils/contractAllocation';

import type { FiscalYear } from '@/types/database';

interface ContractPaymentSectionProps {
  formData: ContractFormData;
  setFormData: (data: ContractFormData) => void;
  isMulti: boolean;
  perUnitAmount: number;
  fiscalYears: FiscalYear[];
  suffixLetters: string[];
  selectedCount: number;
}

const paymentTypeOptions = [
  { value: 'annual', label: 'دفعة واحدة (سنوي)' },
  { value: 'semi_annual', label: 'نصف سنوي (دفعتان)' },
  { value: 'quarterly', label: 'ربعي (4 دفعات)' },
  { value: 'monthly', label: 'شهري (12 دفعة)' },
  { value: 'multi', label: 'دفعات متعددة (مخصص)' },
];

export default function ContractPaymentSection({
  formData, setFormData, isMulti, perUnitAmount, fiscalYears, suffixLetters, selectedCount,
}: ContractPaymentSectionProps) {
  const paymentDivisor = formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1);

  return (
    <>
      {/* Rent amount */}
      {(!isMulti || formData.pricing_mode === 'total') && (
        <div className="space-y-2">
          <Label htmlFor="contract-form-dialog-field-4">{isMulti ? 'الإيجار الإجمالي (ر.س) *' : 'قيمة الإيجار السنوي (ر.س) *'}</Label>
          <Input name="rent_amount" id="contract-form-dialog-field-4" type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder="10000" />
          {isMulti && perUnitAmount > 0 && (
            <p className="text-xs text-muted-foreground">= {fmt(perUnitAmount)} ر.س لكل وحدة</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="contract-form-dialog-select-4">نوع الدفع *</Label>
        <NativeSelect id="contract-form-dialog-select-4" value={formData.payment_type}
          onValueChange={(value) => setFormData({ ...formData, payment_type: value, payment_count: value === 'monthly' ? '12' : value === 'quarterly' ? '4' : value === 'semi_annual' ? '2' : value === 'annual' ? '1' : formData.payment_count })}
          options={paymentTypeOptions}
        />
      </div>
      {formData.payment_type === 'multi' && (
        <div className="space-y-2">
          <Label htmlFor="contract-form-dialog-field-6">عدد الدفعات *</Label>
          <Input name="payment_count" id="contract-form-dialog-field-6" type="number" min="2" max="12" value={formData.payment_count} onChange={(e) => setFormData({ ...formData, payment_count: e.target.value })} placeholder="2-12" />
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

      {/* ملخص الدفعة */}
      {formData.rent_amount && !isMulti && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">قيمة الدفعة الواحدة:</span>
            <span className="font-bold text-primary">
              {fmt(parseFloat(formData.rent_amount) / paymentDivisor)} ر.س
            </span>
          </div>
          {formData.vat_applicable && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ضريبة القيمة المضافة (15%):</span>
                <span className="text-muted-foreground">
                  {fmt((parseFloat(formData.rent_amount) / paymentDivisor) * 0.15)} ر.س
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                <span className="font-medium">الإجمالي شاملاً الضريبة:</span>
                <span className="font-bold text-primary">
                  {fmt((parseFloat(formData.rent_amount) / paymentDivisor) * 1.15)} ر.س
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
                      {fy?.label || 'سنة مالية'}: {a.allocated_payments} دفعة = {fmt(a.allocated_amount)} ر.س
                    </p>
                  );
                })}
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}
    </>
  );
}
