/**
 * حوار إنشاء فاتورة ضريبية من قالب — يتيح تعبئة البيانات ومعاينة فورية
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmt } from '@/utils/format';
import { FileText, Eye, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Contract } from '@/types/database';
import { ProfessionalTemplate, SimplifiedTemplate, TemplateSelector } from './InvoiceTemplates';
import { ID_TYPE_LABELS } from './invoiceTemplateUtils';
import { useCreateInvoiceForm, INVOICE_TYPES } from '@/hooks/page/useCreateInvoiceForm';

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

  // إضافة تحقق من sellerInfo.vatNumber للحقول الناقصة
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
                <NativeSelect id="create-invoice-from-template-select-1" value={invoiceType} onValueChange={setInvoiceType} options={INVOICE_TYPES} />
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

            {/* جدول البنود */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">بنود الفاتورة</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5" />إضافة بند
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-right text-xs font-medium w-[35%]">الوصف</th>
                      <th className="p-2 text-center text-xs font-medium w-[12%]">الكمية</th>
                      <th className="p-2 text-center text-xs font-medium w-[18%]">سعر الوحدة</th>
                      <th className="p-2 text-center text-xs font-medium w-[12%]">نسبة ض.</th>
                      <th className="p-2 text-center text-xs font-medium w-[18%]">الإجمالي</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-1.5">
                          <Input name="item_description" id="create-invoice-from-template-field-1" value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            placeholder="وصف البند"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input name="amount" id="create-invoice-from-template-field-2" type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            min={1}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input name="amount" id="create-invoice-from-template-field-3" type="number"
                            value={item.unitPrice || ''}
                            onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input name="amount" id="create-invoice-from-template-field-4" type="number"
                            value={item.vatRate}
                            onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="p-1.5 text-center text-xs font-semibold">
                          {fmt(item.total)} ر.س
                        </td>
                        <td className="p-1.5">
                          {items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* إجماليات */}
              <div className="flex justify-start">
                <div className="w-full sm:w-72 space-y-1.5 bg-muted/20 rounded-lg p-3 border text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">بدون الضريبة</span><span>{fmt(totalExVat)} ر.س</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ضريبة القيمة المضافة</span><span>{fmt(totalVat)} ر.س</span></div>
                  <div className="border-t pt-1.5 flex justify-between font-bold text-primary">
                    <span>الإجمالي</span><span>{fmt(grandTotal)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label htmlFor="create-invoice-from-template-field-6">ملاحظات</Label>
              <Textarea id="create-invoice-from-template-field-6" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
            </div>

            {/* خصومات ورسوم إضافية */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">خصومات / رسوم إضافية</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setAllowances(prev => [...prev, { reason: '', amount: 0, vatRate: 15 }])}>
                    <Plus className="w-3 h-3" />خصم
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setCharges(prev => [...prev, { reason: '', amount: 0, vatRate: 15 }])}>
                    <Plus className="w-3 h-3" />رسوم
                  </Button>
                </div>
              </div>
              {allowances.map((a, i) => (
                <div key={`a-${i}`} className="flex gap-2 items-center bg-discount-muted rounded p-2">
                  <span className="text-xs text-discount-foreground font-medium shrink-0">خصم</span>
                  <Input name="allowances" id="create-invoice-from-template-field-5" value={a.reason} onChange={e => { const n = [...allowances]; n[i] = { ...a, reason: e.target.value }; setAllowances(n); }} placeholder="السبب" className="h-8 text-xs flex-1" />
                  <Input name="allowances" id="create-invoice-from-template-field-6" type="number" value={a.amount || ''} onChange={e => { const n = [...allowances]; n[i] = { ...a, amount: parseFloat(e.target.value) || 0 }; setAllowances(n); }} placeholder="المبلغ" className="h-8 text-xs w-24" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setAllowances(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {charges.map((c, i) => (
                <div key={`c-${i}`} className="flex gap-2 items-center bg-surcharge-muted rounded p-2">
                  <span className="text-xs text-surcharge-foreground font-medium shrink-0">رسوم</span>
                  <Input name="charges" id="create-invoice-from-template-field-7" value={c.reason} onChange={e => { const n = [...charges]; n[i] = { ...c, reason: e.target.value }; setCharges(n); }} placeholder="السبب" className="h-8 text-xs flex-1" />
                  <Input name="charges" id="create-invoice-from-template-field-8" type="number" value={c.amount || ''} onChange={e => { const n = [...charges]; n[i] = { ...c, amount: parseFloat(e.target.value) || 0 }; setCharges(n); }} placeholder="المبلغ" className="h-8 text-xs w-24" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setCharges(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

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

          {/* === تبويب المعاينة — يستخدم نظام القوالب === */}
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
