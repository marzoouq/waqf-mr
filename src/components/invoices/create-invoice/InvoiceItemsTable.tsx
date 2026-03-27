/**
 * جدول بنود الفاتورة + خصومات/رسوم إضافية + إجماليات
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { fmt } from '@/utils/format';

interface ComputedItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface AllowanceCharge {
  reason: string;
  amount: number;
  vatRate: number;
}

interface InvoiceItemsTableProps {
  items: { id: string }[];
  computedItems: ComputedItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, field: string, value: string | number) => void;
  totalExVat: number;
  totalVat: number;
  grandTotal: number;
  notes: string;
  setNotes: (v: string) => void;
  allowances: AllowanceCharge[];
  setAllowances: React.Dispatch<React.SetStateAction<AllowanceCharge[]>>;
  charges: AllowanceCharge[];
  setCharges: React.Dispatch<React.SetStateAction<AllowanceCharge[]>>;
}

export default function InvoiceItemsTable({
  items, computedItems, addItem, removeItem, updateItem,
  totalExVat, totalVat, grandTotal,
  notes, setNotes,
  allowances, setAllowances, charges, setCharges,
}: InvoiceItemsTableProps) {
  return (
    <>
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
    </>
  );
}
