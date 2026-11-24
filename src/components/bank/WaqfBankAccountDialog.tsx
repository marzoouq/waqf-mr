/**
 * نافذة الناظر: بيانات الحساب البنكي، الرصيد، رفع الكشف، والتحكم في الإظهار للمستفيدين.
 */
import { Loader2, Save, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { fmtDate } from '@/utils/format/format';
import type { WaqfBankSectionController } from '@/hooks/application/bank/useWaqfBankSection';

const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>
);

const Toggle = ({ id, label, hint, checked, disabled, onChange }: {
  id: string; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
    <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </div>
);

const WaqfBankAccountDialog = ({ c }: { c: WaqfBankSectionController }) => {
  const f = c.form;
  if (!f) return null;
  return (
    <Dialog open={c.editOpen} onOpenChange={c.setEditOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>الحساب البنكي للوقف</DialogTitle>
          <DialogDescription>تعديل الرصيد يُسجَّل في سجل تغيّر الرصيد باسمك.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="bank-name" label="اسم البنك">
              <Input id="bank-name" value={f.bank_name} onChange={e => c.patchForm({ bank_name: e.target.value })} placeholder="مثال: البنك الأهلي السعودي" />
            </Field>
            <Field id="bank-holder" label="اسم صاحب الحساب">
              <Input id="bank-holder" value={f.account_holder} onChange={e => c.patchForm({ account_holder: e.target.value })} />
            </Field>
            <Field id="bank-number" label="رقم الحساب">
              <Input id="bank-number" dir="ltr" value={f.account_number} onChange={e => c.patchForm({ account_number: e.target.value })} />
            </Field>
            <Field id="bank-iban" label="الآيبان">
              <Input id="bank-iban" dir="ltr" className="font-mono" maxLength={29} value={f.iban} onChange={e => c.patchForm({ iban: e.target.value })} placeholder="SA0000000000000000000000" />
            </Field>
            <Field id="bank-balance" label="الرصيد المرصود (ر.س)">
              <Input id="bank-balance" type="number" min="0" step="0.01" dir="ltr" value={Number.isFinite(f.recorded_balance) ? f.recorded_balance : ''}
                onChange={e => c.patchForm({ recorded_balance: e.target.value === '' ? Number.NaN : Number(e.target.value) })} />
            </Field>
            <Field id="bank-asof" label="تاريخ الرصيد">
              <Input id="bank-asof" type="date" value={f.balance_as_of} onChange={e => c.patchForm({ balance_as_of: e.target.value })} />
            </Field>
          </div>
          <Field id="bank-notes" label="ملاحظة">
            <Input id="bank-notes" value={f.notes} onChange={e => c.patchForm({ notes: e.target.value })} maxLength={200} />
          </Field>

          <div className="space-y-2">
            <Toggle id="bank-visible" label="إظهار القسم للمستفيدين" hint="عند الإيقاف يختفي القسم كاملاً عن المستفيدين والواقف."
              checked={f.visible_to_beneficiaries}
              onChange={v => c.patchForm({ visible_to_beneficiaries: v, ...(v ? {} : { statement_visible_to_beneficiaries: false }) })} />
            <Toggle id="bank-statement-visible" label="إتاحة تنزيل الكشف البنكي" hint="زر التنزيل لا يظهر للمستفيد إلا بعد رفع الكشف وتفعيل هذا الخيار."
              checked={f.statement_visible_to_beneficiaries} disabled={!f.visible_to_beneficiaries}
              onChange={v => c.patchForm({ statement_visible_to_beneficiaries: v })} />
          </div>

          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">الكشف البنكي</p>
            <p className="text-xs text-muted-foreground">
              {c.statement ? `الكشف الحالي: ${c.statement.file_name}${c.statement.statement_date ? ` — ${fmtDate(c.statement.statement_date)}` : ''}` : 'لم يُرفع كشف بعد.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input type="file" accept="application/pdf,image/jpeg,image/png" aria-label="ملف الكشف البنكي" onChange={e => c.setFile(e.target.files?.[0] ?? null)} />
              <Input type="date" aria-label="تاريخ الكشف" value={c.statementDate} onChange={e => c.setStatementDate(e.target.value)} />
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={c.uploadStatement} disabled={c.uploading || !c.file}>
              {c.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {c.statement ? 'استبدال الكشف' : 'رفع الكشف'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={c.save} disabled={c.saving} className="gap-1.5">
            {c.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WaqfBankAccountDialog;
