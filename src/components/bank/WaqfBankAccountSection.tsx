/**
 * قسم الحساب البنكي للوقف — عرض فقط؛ المنطق في useWaqfBankSection.
 * يختفي كاملاً عن المستفيد ما لم يفعّل الناظر إظهاره، وزر الكشف لا يظهر إلا بعد رفعه وإتاحته.
 */
import { CalendarDays, Download, EyeOff, Pencil, Eye as EyeIcon, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { useWaqfBankSection } from '@/hooks/application/bank/useWaqfBankSection';
import { bankBalanceSourceLabel, bankNoteToShow } from '@/utils/bank/bankSectionView';
import { fmt, fmtDate } from '@/utils/format/format';
import { ltrYears } from '@/utils/format/bidi';
import WaqfBankAccountDialog from './WaqfBankAccountDialog';

const BankIcon = DOMAIN_ICONS.bankAccount;

const DetailRow = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className={mono ? 'font-mono tabular-nums break-all text-end' : 'font-medium text-end'} dir={mono ? 'ltr' : undefined}>
      {value || '—'}
    </span>
  </div>
);

const WaqfBankAccountSection = () => {
  const c = useWaqfBankSection();
  if (c.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!c.view.showSection || !c.account) return null;
  const a = c.account;
  const sourceHint = bankBalanceSourceLabel(a.balance_source, a.source_fiscal_year_label);
  const note = bankNoteToShow(a.notes, sourceHint);

  return (
    <Card className="shadow-sm" aria-labelledby="waqf-bank-title">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="waqf-bank-title" className="flex items-center gap-2 text-base sm:text-lg">
            <BankIcon className="w-5 h-5 text-primary" aria-hidden="true" />
            الحساب البنكي للوقف
          </CardTitle>
          {c.view.canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                {a.visible_to_beneficiaries ? <EyeIcon className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {a.visible_to_beneficiaries ? 'ظاهر للمستفيدين' : 'مخفي عن المستفيدين'}
              </Badge>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={c.openEdit}>
                <Pencil className="w-3.5 h-3.5" />تعديل
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">رصيد رقبة الوقف المحفوظ في الحساب البنكي للوقف</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <FigureTileGrid cols="lg:grid-cols-2">
          <FigureTile label="الرصيد المرصود" value={a.recorded_balance} icon={BankIcon} tone="share"
            hint={sourceHint} />
          <FigureTile label="تاريخ الرصيد" value={a.balance_as_of ? fmtDate(a.balance_as_of) : '—'} unit="text" icon={CalendarDays} />
        </FigureTileGrid>

        <div className="rounded-xl border bg-card px-4 py-1">
          <DetailRow label="البنك" value={a.bank_name} />
          <DetailRow label="اسم صاحب الحساب" value={a.account_holder} />
          <DetailRow label="رقم الحساب" value={a.account_number} mono />
          <DetailRow label="الآيبان" value={a.iban} mono />
        </div>

        {note && <p className="text-xs text-muted-foreground">{ltrYears(note)}</p>}

        {c.view.showStatementDownload && c.statement && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="text-sm">
              <p className="font-medium">الكشف البنكي المعتمد</p>
              {c.statement.statement_date && <p className="text-xs text-muted-foreground">بتاريخ {fmtDate(c.statement.statement_date)}</p>}
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={c.downloadStatement}>
              <Download className="w-4 h-4" />تنزيل الكشف
            </Button>
          </div>
        )}

        {c.view.showHistory && c.history.length > 0 && (
          <details className="rounded-xl border px-4 py-2 text-sm">
            <summary className="cursor-pointer flex items-center gap-1.5 text-muted-foreground">
              <History className="w-4 h-4" />سجل تغيّر الرصيد
            </summary>
            <ul className="mt-2 divide-y">
              {c.history.map(h => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{bankBalanceSourceLabel(h.source)}</span>
                  <span className="tabular-nums font-medium">{fmt(h.new_balance)} ر.س</span>
                  <span className="text-xs text-muted-foreground w-full">{fmtDate(h.created_at)}{h.note ? ` — ${ltrYears(h.note)}` : ''}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
      {c.view.canEdit && <WaqfBankAccountDialog c={c} />}
    </Card>
  );
};

export default WaqfBankAccountSection;
