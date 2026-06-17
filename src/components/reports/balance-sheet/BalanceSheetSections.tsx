import { Table, TableBody, TableRow, TableCell, TableFooter } from '@/components/ui/table';
import { fmt as fmtNum } from '@/utils/format/format';

const fmt = (n: number) => fmtNum(n);

export const AssetsSection = ({ waqfCorpusPrevious, totalIncome, totalAssets }: {
  waqfCorpusPrevious: number; totalIncome: number; totalAssets: number;
}) => (
  <div>
    <h3 className="font-bold text-sm text-primary mb-2 border-b-2 border-primary pb-1">الأصول (الموارد)</h3>
    <Table>
      <TableBody>
        {waqfCorpusPrevious > 0 && (
          <TableRow>
            <TableCell className="text-muted-foreground">رقبة الوقف المرحّلة</TableCell>
            <TableCell className="text-start font-medium">{fmt(waqfCorpusPrevious)} ر.س</TableCell>
          </TableRow>
        )}
        <TableRow>
          <TableCell className="text-muted-foreground">إجمالي الإيرادات</TableCell>
          <TableCell className="text-start font-medium text-success">{fmt(totalIncome)} ر.س</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow className="bg-primary/5">
          <TableCell className="font-bold">إجمالي الأصول</TableCell>
          <TableCell className="text-start font-bold text-primary">{fmt(totalAssets)} ر.س</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

export const LiabilitiesSection = ({ totalExpenses, vatAmount, zakatAmount, totalLiabilities }: {
  totalExpenses: number; vatAmount: number; zakatAmount: number; totalLiabilities: number;
}) => (
  <div>
    <h3 className="font-bold text-sm text-destructive mb-2 border-b-2 border-destructive pb-1">الالتزامات</h3>
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="text-muted-foreground">المصروفات التشغيلية</TableCell>
          <TableCell className="text-start font-medium text-destructive">{fmt(totalExpenses)} ر.س</TableCell>
        </TableRow>
        {vatAmount > 0 && (
          <TableRow>
            <TableCell className="text-muted-foreground">ضريبة القيمة المضافة</TableCell>
            <TableCell className="text-start font-medium text-destructive">{fmt(vatAmount)} ر.س</TableCell>
          </TableRow>
        )}
        {zakatAmount > 0 && (
          <TableRow>
            <TableCell className="text-muted-foreground">الزكاة</TableCell>
            <TableCell className="text-start font-medium text-destructive">{fmt(zakatAmount)} ر.س</TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow className="bg-destructive/5">
          <TableCell className="font-bold">إجمالي الالتزامات</TableCell>
          <TableCell className="text-start font-bold text-destructive">{fmt(totalLiabilities)} ر.س</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

export const EquitySection = ({
  adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
  distributionsAmount, availableAmount, totalEquity,
}: {
  adminShare: number; waqifShare: number; waqfRevenue: number; waqfCorpusManual: number;
  distributionsAmount: number; availableAmount: number; totalEquity: number;
}) => (
  <div>
    <h3 className="font-bold text-sm text-accent-foreground mb-2 border-b-2 border-accent pb-1">حقوق الملكية</h3>
    <Table>
      <TableBody>
        {adminShare > 0 && (
          <TableRow>
            <TableCell className="text-muted-foreground">حصة الناظر</TableCell>
            <TableCell className="text-start font-medium">{fmt(adminShare)} ر.س</TableCell>
          </TableRow>
        )}
        {waqifShare > 0 && (
          <TableRow>
            <TableCell className="text-muted-foreground">حصة الواقف</TableCell>
            <TableCell className="text-start font-medium">{fmt(waqifShare)} ر.س</TableCell>
          </TableRow>
        )}
        <TableRow>
          <TableCell className="text-muted-foreground font-semibold">ريع الوقف (للمستفيدين)</TableCell>
          <TableCell className="text-start font-medium text-primary">{fmt(waqfRevenue)} ر.س</TableCell>
        </TableRow>
        {waqfCorpusManual > 0 && (
          <TableRow className="bg-muted/30">
            <TableCell className="text-muted-foreground ps-8 text-xs">↳ رقبة الوقف اليدوية (مُرحّلة)</TableCell>
            <TableCell className="text-start text-xs text-muted-foreground">{fmt(waqfCorpusManual)} ر.س</TableCell>
          </TableRow>
        )}
        {distributionsAmount > 0 && (
          <TableRow className="bg-muted/30">
            <TableCell className="text-muted-foreground ps-8 text-xs">↳ التوزيعات المُنفّذة</TableCell>
            <TableCell className="text-start text-xs text-success">{fmt(distributionsAmount)} ر.س</TableCell>
          </TableRow>
        )}
        {availableAmount > 0 && (
          <TableRow className="bg-muted/30">
            <TableCell className="text-muted-foreground ps-8 text-xs">↳ الرصيد المتبقي</TableCell>
            <TableCell className="text-start text-xs">{fmt(availableAmount - distributionsAmount)} ر.س</TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow className="bg-accent/10">
          <TableCell className="font-bold">إجمالي حقوق الملكية</TableCell>
          <TableCell className="text-start font-bold">{fmt(totalEquity)} ر.س</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

export const BalanceSummary = ({ netAfterExpenses, netAfterVat, netAfterZakat, availableAmount }: {
  netAfterExpenses: number; netAfterVat: number; netAfterZakat: number; availableAmount: number;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t-2 border-border">
    <div className="text-center p-3 rounded-lg bg-primary/5">
      <p className="text-xs text-muted-foreground">صافي بعد المصروفات</p>
      <p className="text-lg font-bold">{fmt(netAfterExpenses)}</p>
    </div>
    <div className="text-center p-3 rounded-lg bg-primary/5">
      <p className="text-xs text-muted-foreground">صافي بعد الضريبة</p>
      <p className="text-lg font-bold">{fmt(netAfterVat)}</p>
    </div>
    <div className="text-center p-3 rounded-lg bg-primary/5">
      <p className="text-xs text-muted-foreground">صافي بعد الزكاة</p>
      <p className="text-lg font-bold">{fmt(netAfterZakat)}</p>
    </div>
    <div className="text-center p-3 rounded-lg bg-success/10">
      <p className="text-xs text-muted-foreground">المتاح للتوزيع</p>
      <p className="text-lg font-bold text-success">{fmt(availableAmount)}</p>
    </div>
  </div>
);
