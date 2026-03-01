import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Clock, Search, TrendingDown, TrendingUp, Banknote, FileWarning, Bell, Pencil } from 'lucide-react';
import { Contract } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import ExportMenu from '@/components/ExportMenu';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { allocateContractToFiscalYears } from '@/utils/contractAllocation';
import type { FiscalYear } from '@/hooks/useFiscalYears';

interface CollectionReportProps {
  contracts: Contract[];
  paymentsMap: Map<string, number>;
  isLoading: boolean;
  fiscalYears?: FiscalYear[];
  fiscalYearId?: string;
}

type FilterStatus = 'all' | 'overdue' | 'partial' | 'complete';

interface CollectionRow {
  contract: Contract;
  paymentCount: number;       // total payments in this FY (or contract total for 'all')
  paid: number;
  expected: number;
  overdue: number;
  overdueAmount: number;
  collectedAmount: number;
  totalAmount: number;        // allocated amount for this FY
  paymentAmount: number;      // per-payment amount
  status: 'complete' | 'partial' | 'overdue' | 'not_started';
}

/**
 * Fallback: date-based expected payments (used when fiscalYearId === 'all')
 */
function getExpectedPaymentsFallback(contract: Contract): number {
  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const now = new Date();

  if (now < start) return 0;

  const paymentCount = contract.payment_type === 'monthly' ? 12
    : contract.payment_type === 'annual' ? 1
    : (contract.payment_count || 1);

  // N3 fix: cap at actual contract duration, not hardcoded 12
  const contractDurationMonths = Math.max(1, Math.round(
    (end.getTime() - start.getTime()) / (1000 * 3600 * 24 * 30.44)
  ));

  if (contract.payment_type === 'monthly') {
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.min(Math.max(0, months), contractDurationMonths);
  }

  if (contract.payment_type === 'annual') {
    const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return monthsSinceStart >= 1 ? 1 : 0;
  }

  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 3600 * 24));
  return Math.min(Math.floor(paymentCount * elapsedDays / totalDays), paymentCount);
}

export default function CollectionReport({ contracts, paymentsMap, isLoading, fiscalYears = [], fiscalYearId = 'all' }: CollectionReportProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [editRow, setEditRow] = useState<CollectionRow | null>(null);
  const [editPaidMonths, setEditPaidMonths] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const pdfWaqfInfo = usePdfWaqfInfo();
  const upsertPayment = useUpsertTenantPayment();

  const useDynamicAllocation = fiscalYearId !== 'all' && fiscalYears.length > 0;

  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active'), [contracts]);

  const rows: CollectionRow[] = useMemo(() => {
    return activeContracts.map(contract => {
      const contractPaymentCount = contract.payment_type === 'monthly' ? 12
        : contract.payment_type === 'annual' ? 1
        : (contract.payment_count || 1);
      const perPayment = contract.payment_amount || (Number(contract.rent_amount) / contractPaymentCount);
      const paid = paymentsMap.get(contract.id) ?? 0;

      let allocatedPayments: number;
      let allocatedAmount: number;

      if (useDynamicAllocation) {
        // Dynamic allocation: compute payments allocated to the selected fiscal year
        const allocations = allocateContractToFiscalYears(
          {
            id: contract.id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            rent_amount: Number(contract.rent_amount),
            payment_type: contract.payment_type,
            payment_count: contract.payment_count,
            payment_amount: contract.payment_amount ?? undefined,
          },
          fiscalYears as any
        );
        const fyAlloc = allocations.find(a => a.fiscal_year_id === fiscalYearId);
        allocatedPayments = fyAlloc?.allocated_payments ?? 0;
        allocatedAmount = fyAlloc?.allocated_amount ?? 0;
      } else {
        // Fallback: use full contract values
        allocatedPayments = contractPaymentCount;
        allocatedAmount = Number(contract.rent_amount);
      }

      const expected = useDynamicAllocation ? allocatedPayments : getExpectedPaymentsFallback(contract);
      const overdue = Math.max(0, expected - paid);
      const overdueAmount = overdue * perPayment;
      const collectedAmount = paid * perPayment;

      let status: CollectionRow['status'];
      if (paid >= allocatedPayments) status = 'complete';
      else if (overdue > 0) status = 'overdue';
      else if (paid > 0) status = 'partial';
      else status = 'not_started';

      return {
        contract,
        paymentCount: allocatedPayments,
        paid,
        expected,
        overdue,
        overdueAmount,
        collectedAmount,
        totalAmount: allocatedAmount,
        paymentAmount: perPayment,
        status,
      };
    });
  }, [activeContracts, paymentsMap, useDynamicAllocation, fiscalYears, fiscalYearId]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filter === 'overdue') result = result.filter(r => r.overdue > 0);
    else if (filter === 'partial') result = result.filter(r => r.status === 'partial');
    else if (filter === 'complete') result = result.filter(r => r.status === 'complete');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.contract.contract_number.toLowerCase().includes(q) ||
        r.contract.tenant_name.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.overdue - a.overdue);
  }, [rows, filter, search]);

  const summary = useMemo(() => {
    const totalExpected = rows.reduce((s, r) => s + r.totalAmount, 0);
    const totalCollected = rows.reduce((s, r) => s + r.collectedAmount, 0);
    const totalOverdue = rows.reduce((s, r) => s + r.overdueAmount, 0);
    const overdueCount = rows.filter(r => r.overdue > 0).length;
    const completeCount = rows.filter(r => r.status === 'complete').length;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    return { totalExpected, totalCollected, totalOverdue, overdueCount, completeCount, collectionRate, total: rows.length };
  }, [rows]);

  const handleSendAlerts = async () => {
    const overdueRows = rows.filter(r => r.overdue > 0);
    if (overdueRows.length === 0) {
      toast.info('لا توجد دفعات متأخرة');
      return;
    }
    setSendingAlerts(true);
    try {
      // N7 fix: check RPC error properly
      const { error } = await supabase.rpc('cron_check_late_payments' as never);
      if (error) throw error;
      toast.success(`تم إرسال تنبيهات لـ ${overdueRows.length} عقد متأخر`);
    } catch {
      toast.error('حدث خطأ أثناء إرسال التنبيهات');
    } finally {
      setSendingAlerts(false);
    }
  };

  const getStatusBadge = (status: CollectionRow['status']) => {
    switch (status) {
      case 'complete': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مكتمل</Badge>;
      case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخر</Badge>;
      case 'partial': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />جزئي</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-0">لم يبدأ</Badge>;
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>;

  const expectedLabel = useDynamicAllocation ? 'المتوقع في هذه السنة' : 'إجمالي الإيجارات';

  return (
    <div className="space-y-5">
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{expectedLabel}</p>
              <p className="text-lg font-bold">{summary.totalExpected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المحصّل</p>
              <p className="text-lg font-bold text-success">{summary.totalCollected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المتأخر</p>
              <p className="text-lg font-bold text-destructive">{summary.totalOverdue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
              <p className="text-lg font-bold">{summary.collectionRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* شريط التحصيل العام */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">معدل التحصيل العام</span>
            <span className="text-sm text-muted-foreground">
              {summary.completeCount} مكتمل من {summary.total} عقد
              {summary.overdueCount > 0 && <span className="text-destructive mr-2">• {summary.overdueCount} متأخر</span>}
            </span>
          </div>
          <Progress
            value={summary.collectionRate}
            className={`h-3 ${
              summary.collectionRate >= 80 ? '[&>div]:bg-success' :
              summary.collectionRate >= 50 ? '[&>div]:bg-warning' :
              '[&>div]:bg-destructive'
            }`}
          />
        </CardContent>
      </Card>

      {/* أدوات الفلترة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالعقد أو المستأجر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({rows.length})</SelectItem>
            <SelectItem value="overdue">متأخر ({rows.filter(r => r.overdue > 0).length})</SelectItem>
            <SelectItem value="partial">جزئي ({rows.filter(r => r.status === 'partial').length})</SelectItem>
            <SelectItem value="complete">مكتمل ({rows.filter(r => r.status === 'complete').length})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSendAlerts} disabled={sendingAlerts}>
          <Bell className="w-4 h-4" />
          {sendingAlerts ? 'جاري الإرسال...' : 'إرسال تنبيهات التأخير'}
        </Button>
      </div>

      {/* جدول التفاصيل */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">{filter === 'overdue' ? 'لا توجد دفعات متأخرة 🎉' : 'لا توجد عقود مطابقة'}</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {filteredRows.map(row => (
                  <Card key={row.contract.id} className={`shadow-sm ${row.overdue > 0 ? 'border-destructive/30' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{row.contract.contract_number}</span>
                          <p className="text-xs text-muted-foreground">{row.contract.tenant_name}</p>
                        </div>
                        {getStatusBadge(row.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground text-xs">الدفعات</span>
                          <div className="flex items-center gap-1">
                            <p className="font-medium">{row.paid}/{row.paymentCount}</p>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditRow(row); setEditPaidMonths(row.paid); setEditNotes(''); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div><span className="text-muted-foreground text-xs">قيمة الدفعة</span><p className="font-medium">{row.paymentAmount.toLocaleString()} ر.س</p></div>
                        <div><span className="text-muted-foreground text-xs">المحصّل</span><p className="font-medium text-success">{row.collectedAmount.toLocaleString()} ر.س</p></div>
                        {row.overdue > 0 && (
                          <div><span className="text-muted-foreground text-xs">المتأخر</span><p className="font-medium text-destructive">{row.overdueAmount.toLocaleString()} ر.س</p></div>
                        )}
                      </div>
                      <Progress
                        value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
                        className={`h-2 ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-right">{expectedLabel}</TableHead>
                      <TableHead className="text-right">قيمة الدفعة</TableHead>
                      <TableHead className="text-center">الدفعات</TableHead>
                      <TableHead className="text-right">المحصّل</TableHead>
                      <TableHead className="text-right">المتأخر</TableHead>
                      <TableHead className="text-center">التقدم</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map(row => (
                      <TableRow key={row.contract.id} className={row.overdue > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{row.contract.contract_number}</TableCell>
                        <TableCell>{row.contract.tenant_name}</TableCell>
                        <TableCell>{row.contract.property?.property_number || '-'}</TableCell>
                        <TableCell>{row.totalAmount.toLocaleString()} ر.س</TableCell>
                        <TableCell>{row.paymentAmount.toLocaleString()} ر.س</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-bold ${row.overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>
                              {row.paid}/{row.paymentCount}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditRow(row); setEditPaidMonths(row.paid); setEditNotes(''); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                          {row.overdue > 0 && (
                            <span className="text-xs text-destructive block">({row.overdue} متأخرة)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-success font-medium">{row.collectedAmount.toLocaleString()} ر.س</TableCell>
                        <TableCell className={`font-medium ${row.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {row.overdueAmount > 0 ? `${row.overdueAmount.toLocaleString()} ر.س` : '-'}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
                            className={`h-2 w-20 mx-auto ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* حوار تصحيح الدفعات */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تصحيح عدد الدفعات المسددة</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">العقد:</span> {editRow.contract.contract_number}</p>
                <p><span className="text-muted-foreground">المستأجر:</span> {editRow.contract.tenant_name}</p>
                <p><span className="text-muted-foreground">إجمالي الدفعات:</span> {editRow.paymentCount}</p>
                <p><span className="text-muted-foreground">قيمة الدفعة:</span> {editRow.paymentAmount.toLocaleString()} ر.س</p>
              </div>

              <div className="space-y-2">
                <Label>عدد الدفعات المسددة (الحالي: {editRow.paid})</Label>
                <Input
                  type="number"
                  min={0}
                  max={editRow.paymentCount}
                  value={editPaidMonths}
                  onChange={e => setEditPaidMonths(Math.max(0, Math.min(editRow.paymentCount, parseInt(e.target.value) || 0)))}
                />
              </div>

              <div className="space-y-2">
                <Label>سبب التصحيح</Label>
                <Textarea
                  placeholder="اذكر سبب التعديل..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                />
              </div>

              {editPaidMonths !== editRow.paid && (
                <div className={`text-sm p-2 rounded-lg ${editPaidMonths > editRow.paid ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                  {editPaidMonths > editRow.paid
                    ? `⚠️ سيتم زيادة الدفعات من ${editRow.paid} إلى ${editPaidMonths} (بدون إنشاء سجلات دخل)`
                    : `سيتم تقليل الدفعات من ${editRow.paid} إلى ${editPaidMonths}`
                  }
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRow(null)}>إلغاء</Button>
            <Button
              disabled={!editRow || editPaidMonths === editRow.paid || upsertPayment.isPending}
              onClick={async () => {
                if (!editRow) return;
                const note = `تصحيح يدوي: من ${editRow.paid} إلى ${editPaidMonths}${editNotes ? ' - ' + editNotes : ''}`;
                upsertPayment.mutate({
                  contract_id: editRow.contract.id,
                  paid_months: editPaidMonths,
                  notes: note,
                  // payment_amount = 0 to prevent creating income records
                }, {
                  onSuccess: () => setEditRow(null),
                });
              }}
            >
              {upsertPayment.isPending ? 'جاري الحفظ...' : 'حفظ التصحيح'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
