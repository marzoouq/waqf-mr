/**
 * حوار إنشاء فاتورة ضريبية من قالب — يتيح تعبئة البيانات ومعاينة فورية
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Eye, Save } from 'lucide-react';
import type { Contract } from '@/types/database';
import { ProfessionalTemplate, SimplifiedTemplate, TemplateSelector } from './InvoiceTemplates';
import { useCreateInvoiceForm, INVOICE_TYPES } from '@/hooks/page/admin/useCreateInvoiceForm';
import InvoiceFormFields from './create-invoice/InvoiceFormFields';
import InvoiceItemsTable from './create-invoice/InvoiceItemsTable';

interface CreateInvoiceFromTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Contract[];
  properties: { id: string; property_number: string; location: string }[];
  sellerInfo: {
    name: string;
    address?: string;
    vatNumber?: string;
    commercialReg?: string;
    bankName?: string;
    bankIBAN?: string;
    logoUrl?: string;
  };
  onSave: (data: {
    invoice_number: string;
    invoice_type: string;
    amount: number;
    date: string;
    property_id: string | null;
    contract_id: string | null;
    description: string | null;
    status: string;
    vat_rate: number;
    vat_amount: number;
  }) => Promise<void>;
  isSaving?: boolean;
}

export default function CreateInvoiceFromTemplate({
  open, onOpenChange, contracts, properties, sellerInfo, onSave, isSaving,
}: CreateInvoiceFromTemplateProps) {
  const {
    activeTab, setActiveTab,
    invoiceNumber, setInvoiceNumber,
    invoiceDate, setInvoiceDate,
    invoiceType, setInvoiceType,
    propertyId, setPropertyId,
    notes, setNotes,
    items,
    allowances, setAllowances,
    charges, setCharges,
    previewTemplate, setPreviewTemplate,
    selectedContract,
    handleContractChange,
    addItem, removeItem, updateItem,
    computedItems,
    totalExVat, totalVat, grandTotal,
    isStandard, missingFields, buyerAddress,
    handleSave,
    contractId,
  } = useCreateInvoiceForm({ contracts, onSave });

  const allMissingFields = [...missingFields];
  if (!sellerInfo.vatNumber) allMissingFields.push('الرقم الضريبي للبائع');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            إنشاء فاتورة ضريبية من قالب
          </DialogTitle>
          <DialogDescription className="sr-only">نموذج إنشاء فاتورة ضريبية</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'form' | 'preview')} className="w-full">
          <div className="px-6 pt-2">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="form" className="gap-1.5"><FileText className="w-4 h-4" />تعبئة البيانات</TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5"><Eye className="w-4 h-4" />معاينة الفاتورة</TabsTrigger>
            </TabsList>
          </div>

          {/* === تبويب النموذج === */}
          <TabsContent value="form" className="px-6 pb-6 space-y-5 mt-4">
            <InvoiceFormFields
              invoiceNumber={invoiceNumber} setInvoiceNumber={setInvoiceNumber}
              invoiceDate={invoiceDate ?? ''} setInvoiceDate={setInvoiceDate}
              invoiceType={invoiceType} setInvoiceType={setInvoiceType}
              invoiceTypeOptions={INVOICE_TYPES}
              contractId={contractId} handleContractChange={handleContractChange}
              contracts={contracts}
              propertyId={propertyId} setPropertyId={setPropertyId}
              properties={properties}
              selectedContract={selectedContract ?? null}
              buyerAddress={buyerAddress}
            />

            <InvoiceItemsTable
              items={items} computedItems={computedItems}
              addItem={addItem} removeItem={removeItem} updateItem={updateItem as (id: string, field: string, value: string | number) => void}
              totalExVat={totalExVat} totalVat={totalVat} grandTotal={grandTotal}
              notes={notes} setNotes={setNotes}
              allowances={allowances} setAllowances={setAllowances}
              charges={charges} setCharges={setCharges}
            />

            {/* أزرار */}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setActiveTab('preview')} variant="outline" className="gap-1.5">
                <Eye className="w-4 h-4" />معاينة
              </Button>
              <Button onClick={handleSave} className="flex-1 gradient-primary gap-1.5" disabled={isSaving || grandTotal <= 0}>
                <Save className="w-4 h-4" />{isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            </div>
          </TabsContent>

          {/* === تبويب المعاينة === */}
          <TabsContent value="preview" className="px-6 pb-6 mt-4">
            <div className="mb-4">
              <TemplateSelector value={previewTemplate} onChange={setPreviewTemplate} />
            </div>

            {(() => {
              const templateData = {
                invoiceNumber: invoiceNumber || '(تلقائي)',
                date: invoiceDate ?? new Date().toISOString().split('T')[0]!,
                type: (isStandard ? 'standard' : 'simplified') as 'standard' | 'simplified',
                sellerName: sellerInfo.name,
                sellerAddress: sellerInfo.address,
                sellerVatNumber: sellerInfo.vatNumber,
                sellerCR: sellerInfo.commercialReg,
                sellerLogo: sellerInfo.logoUrl,
                buyerName: selectedContract?.tenant_name || '-',
                buyerVatNumber: selectedContract?.tenant_tax_number || undefined,
                buyerCR: selectedContract?.tenant_crn || undefined,
                buyerIdType: selectedContract?.tenant_id_type || undefined,
                buyerIdNumber: selectedContract?.tenant_id_number || undefined,
                buyerStreet: selectedContract?.tenant_street || undefined,
                buyerDistrict: selectedContract?.tenant_district || undefined,
                buyerCity: selectedContract?.tenant_city || undefined,
                buyerPostalCode: selectedContract?.tenant_postal_code || undefined,
                buyerBuilding: selectedContract?.tenant_building || undefined,
                items: computedItems.map(i => ({ description: i.description || '—', quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate })),
                allowances: allowances.filter(a => a.amount > 0),
                charges: charges.filter(c => c.amount > 0),
                notes,
                status: 'pending',
                bankName: sellerInfo.bankName,
                bankIBAN: sellerInfo.bankIBAN,
              };
              return previewTemplate === 'professional'
                ? <ProfessionalTemplate data={templateData} />
                : <SimplifiedTemplate data={templateData} />;
            })()}

            {/* أزرار المعاينة */}
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setActiveTab('form')} variant="outline" className="gap-1.5">
                <FileText className="w-4 h-4" />تعديل البيانات
              </Button>
              <Button onClick={handleSave} className="flex-1 gradient-primary gap-1.5" disabled={isSaving || grandTotal <= 0}>
                <Save className="w-4 h-4" />{isSaving ? 'جاري الحفظ...' : 'حفظ وإصدار الفاتورة'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
