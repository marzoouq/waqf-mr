/**
 * حوار إنشاء فاتورة ضريبية من قالب — يتيح تعبئة البيانات ومعاينة فورية
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeNumber } from '@/utils/safeNumber';
import { FileText, Eye, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Contract } from '@/types/database';
import { ProfessionalTemplate, SimplifiedTemplate, TemplateSelector, type AllowanceChargeItem } from './InvoiceTemplates';


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

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

const INVOICE_TYPES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'maintenance', label: 'صيانة ومقاولات' },
  { value: 'utilities', label: 'خدمات (كهرباء/مياه)' },
  { value: 'other', label: 'أخرى' },
];

const ID_TYPE_LABELS: Record<string, string> = {
  NAT: 'هوية وطنية', IQA: 'إقامة', PAS: 'جواز سفر',
  CRN: 'سجل تجاري', GCC: 'هوية خليجية', OTH: 'أخرى',
};

export default function CreateInvoiceFromTemplate({
  open, onOpenChange, contracts, properties, sellerInfo, onSave, isSaving,
}: CreateInvoiceFromTemplateProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceType, setInvoiceType] = useState('rent');
  const [contractId, setContractId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 },
  ]);
  const [allowances, setAllowances] = useState<AllowanceChargeItem[]>([]);
  const [charges, setCharges] = useState<AllowanceChargeItem[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<'professional' | 'simplified'>('professional');

  const selectedContract = contracts.find(c => c.id === contractId);

  // عند اختيار عقد — تعبئة تلقائية
  const handleContractChange = (cId: string) => {
    setContractId(cId);
    const c = contracts.find(ct => ct.id === cId);
    if (c) {
      setPropertyId(c.property_id);
      if (c.payment_amount) {
        setItems([{
          id: crypto.randomUUID(),
          description: `إيجار — عقد ${c.contract_number}`,
          quantity: 1,
          unitPrice: safeNumber(c.payment_amount),
          vatRate: 15,
        }]);
      }
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // حسابات
  const computedItems = useMemo(() => items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  }), [items]);

  const totalExVat = computedItems.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = computedItems.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = Math.round((totalExVat + totalVat) * 100) / 100;

  const isStandard = !!selectedContract?.tenant_tax_number;

  // حقول ناقصة
  const missingFields: string[] = [];
  if (isStandard) {
    if (!selectedContract?.tenant_tax_number) missingFields.push('الرقم الضريبي للمشتري');
    if (!selectedContract?.tenant_street) missingFields.push('عنوان المشتري');
  }
  if (!sellerInfo.vatNumber) missingFields.push('الرقم الضريبي للبائع');

  const buyerAddress = selectedContract
    ? [selectedContract.tenant_street, selectedContract.tenant_building, selectedContract.tenant_district, selectedContract.tenant_city, selectedContract.tenant_postal_code].filter(Boolean).join('، ')
    : '';

  const handleSave = async () => {
    if (!invoiceType || !invoiceDate) return;
    if (grandTotal <= 0) return;

    await onSave({
      invoice_number: invoiceNumber || null as unknown as string,
      invoice_type: invoiceType,
      amount: grandTotal,
      date: invoiceDate,
      property_id: propertyId || null,
      contract_id: contractId || null,
      description: items.map(i => i.description).filter(Boolean).join(' | ') || notes || null,
      status: 'pending',
      vat_rate: items[0]?.vatRate || 15,
      vat_amount: totalVat,
    });

    // إعادة تهيئة
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setContractId('');
    setPropertyId('');
    setNotes('');
    setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 }]);
    setAllowances([]);
    setCharges([]);
    setActiveTab('form');
  };

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
                <Label>رقم الفاتورة</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001 (تلقائي)" />
              </div>
              <div className="space-y-2">
                <Label>التاريخ *</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نوع الفاتورة *</Label>
                <NativeSelect value={invoiceType} onValueChange={setInvoiceType} options={INVOICE_TYPES} />
              </div>
            </div>

            {/* ربط العقد والعقار */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العقد (تعبئة تلقائية لبيانات المشتري)</Label>
                <NativeSelect
                  value={contractId}
                  onValueChange={handleContractChange}
                  placeholder="اختر العقد"
                  options={contracts.map(c => ({ value: c.id, label: `${c.contract_number} — ${c.tenant_name}` }))}
                />
              </div>
              <div className="space-y-2">
                <Label>العقار</Label>
                <NativeSelect
                  value={propertyId}
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
                          <Input
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            placeholder="وصف البند"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            min={1}
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            value={item.vatRate}
                            onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="p-1.5 text-center text-xs font-semibold">
                          {item.total.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
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
                  <div className="flex justify-between"><span className="text-muted-foreground">بدون الضريبة</span><span>{totalExVat.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ضريبة القيمة المضافة</span><span>{totalVat.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span></div>
                  <div className="border-t pt-1.5 flex justify-between font-bold text-primary">
                    <span>الإجمالي</span><span>{grandTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
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
                <div key={`a-${i}`} className="flex gap-2 items-center bg-green-50 dark:bg-green-950/20 rounded p-2">
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium shrink-0">خصم</span>
                  <Input value={a.reason} onChange={e => { const n = [...allowances]; n[i] = { ...a, reason: e.target.value }; setAllowances(n); }} placeholder="السبب" className="h-8 text-xs flex-1" />
                  <Input type="number" value={a.amount || ''} onChange={e => { const n = [...allowances]; n[i] = { ...a, amount: parseFloat(e.target.value) || 0 }; setAllowances(n); }} placeholder="المبلغ" className="h-8 text-xs w-24" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setAllowances(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {charges.map((c, i) => (
                <div key={`c-${i}`} className="flex gap-2 items-center bg-orange-50 dark:bg-orange-950/20 rounded p-2">
                  <span className="text-xs text-orange-700 dark:text-orange-400 font-medium shrink-0">رسوم</span>
                  <Input value={c.reason} onChange={e => { const n = [...charges]; n[i] = { ...c, reason: e.target.value }; setCharges(n); }} placeholder="السبب" className="h-8 text-xs flex-1" />
                  <Input type="number" value={c.amount || ''} onChange={e => { const n = [...charges]; n[i] = { ...c, amount: parseFloat(e.target.value) || 0 }; setCharges(n); }} placeholder="المبلغ" className="h-8 text-xs w-24" />
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
                date: invoiceDate,
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
