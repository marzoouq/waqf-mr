/**
 * الحقول الأساسية لنموذج إنشاء الفاتورة + ربط العقد/العقار + بيانات المشتري
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { AlertCircle } from 'lucide-react';
import type { Contract } from '@/types/database';
import { ID_TYPE_LABELS } from '../invoiceTemplateUtils';

interface InvoiceFormFieldsProps {
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  invoiceDate: string;
  setInvoiceDate: (v: string) => void;
  invoiceType: string;
  setInvoiceType: (v: string) => void;
  invoiceTypeOptions: { value: string; label: string }[];
  contractId: string;
  handleContractChange: (v: string) => void;
  contracts: Contract[];
  propertyId: string;
  setPropertyId: (v: string) => void;
  properties: { id: string; property_number: string; location: string }[];
  selectedContract: Contract | null;
  buyerAddress: string;
}

export default function InvoiceFormFields({
  invoiceNumber, setInvoiceNumber,
  invoiceDate, setInvoiceDate,
  invoiceType, setInvoiceType, invoiceTypeOptions,
  contractId, handleContractChange, contracts,
  propertyId, setPropertyId, properties,
  selectedContract, buyerAddress,
}: InvoiceFormFieldsProps) {
  return (
    <>
      {/* بيانات أساسية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="create-invoice-from-template-field-1">رقم الفاتورة</Label>
          <Input name="invoiceNumber" id="create-invoice-from-template-field-1" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001 (تلقائي)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-from-template-field-2">التاريخ *</Label>
          <Input name="invoiceDate" id="create-invoice-from-template-field-2" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-from-template-select-1">نوع الفاتورة *</Label>
          <NativeSelect id="create-invoice-from-template-select-1" value={invoiceType} onValueChange={setInvoiceType} options={invoiceTypeOptions} />
        </div>
      </div>

      {/* ربط العقد والعقار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="create-invoice-from-template-select-2">العقد (تعبئة تلقائية لبيانات المشتري)</Label>
          <NativeSelect id="create-invoice-from-template-select-2" value={contractId}
            onValueChange={handleContractChange}
            placeholder="اختر العقد"
            options={contracts.map(c => ({ value: c.id, label: `${c.contract_number} — ${c.tenant_name}` }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-invoice-from-template-select-3">العقار</Label>
          <NativeSelect id="create-invoice-from-template-select-3" value={propertyId}
            onValueChange={setPropertyId}
            placeholder="اختر العقار"
            options={properties.map(p => ({ value: p.id, label: `${p.property_number} — ${p.location}` }))}
          />
        </div>
      </div>

      {/* بيانات المشتري من العقد */}
      {selectedContract && (
        <div className="bg-muted/30 rounded-lg p-4 border space-y-1">
          <h4 className="text-sm font-semibold mb-2">بيانات المشتري (من العقد)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <span><span className="text-muted-foreground">الاسم:</span> {selectedContract.tenant_name}</span>
            {selectedContract.tenant_tax_number && (
              <span><span className="text-muted-foreground">الرقم الضريبي:</span> <span className="font-mono">{selectedContract.tenant_tax_number}</span></span>
            )}
            {selectedContract.tenant_crn && (
              <span><span className="text-muted-foreground">السجل التجاري:</span> {selectedContract.tenant_crn}</span>
            )}
            {selectedContract.tenant_id_type && selectedContract.tenant_id_number && (
              <span><span className="text-muted-foreground">{ID_TYPE_LABELS[selectedContract.tenant_id_type] || 'الهوية'}:</span> {selectedContract.tenant_id_number}</span>
            )}
            {buyerAddress && <span className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {buyerAddress}</span>}
          </div>
          {!selectedContract.tenant_tax_number && (
            <p className="text-xs text-warning mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              لا يوجد رقم ضريبي — ستُصدر كفاتورة مبسطة
            </p>
          )}
        </div>
      )}
    </>
  );
}
