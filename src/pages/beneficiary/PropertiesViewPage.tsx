/**
 * صفحة عرض العقارات للمستفيد (قراءة فقط)
 * تعرض نفس المؤشرات المالية والتشغيلية الموجودة لدى الناظر مع فلترة حسب السنة المالية
 */
import { useProperties } from '@/hooks/useProperties';
import { computePropertyFinancials } from '@/hooks/usePropertyFinancials';
import { useAllUnits } from '@/hooks/useUnits';
import { useContractsSafeByFiscalYear } from '@/hooks/useContracts';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import DashboardLayout from '@/components/DashboardLayout';
import RequirePublishedYears from '@/components/RequirePublishedYears';
import ExportMenu from '@/components/ExportMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { safeNumber } from '@/utils/safeNumber';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Building2, MapPin, Layers, AlertCircle, RefreshCw, Home, DoorOpen, Ruler, TrendingUp, CircleDollarSign, Receipt, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { generatePropertiesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import PageHeaderCard from '@/components/PageHeaderCard';
import { fmt, fmtInt } from '@/utils/format';

const PropertiesViewPage = () => {
  const { data: properties, isLoading: propsLoading, isError: propsError, refetch: refetchProps } = useProperties();
  const { data: units, isLoading: unitsLoading, isError: unitsError, refetch: refetchUnits } = useAllUnits();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const isSpecificYear = fiscalYearId !== 'all';
  const isClosed = fiscalYear?.status === 'closed';
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);
  const { accounts } = useFinancialSummary(fiscalYearId, fiscalYear?.label, { fiscalYearStatus: fiscalYear?.status });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pdfWaqfInfo = usePdfWaqfInfo();

  const isLoading = propsLoading || unitsLoading;
  const isError = propsError || unitsError;

  const getUnitsForProperty = (propertyId: string) =>
    units?.filter(u => u.property_id === propertyId) ?? [];

  const totalUnits = units?.length ?? 0;

  const rentedUnitIds = new Set(
    (contracts ?? []).filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id)
  );
  const wholePropertyIds = new Set(
    (contracts ?? []).filter(c => (isSpecificYear || c.status === 'active') && c.property_id && !c.unit_id).map(c => c.property_id)
  );
  const occupiedUnits = units?.filter(u =>
    rentedUnitIds.has(u.id) || wholePropertyIds.has(u.property_id)
  ).length ?? 0;

  const propertiesWithoutUnitsNoContract = (properties ?? []).filter(p => {
    const pUnits = units?.filter(u => u.property_id === p.id) ?? [];
    return pUnits.length === 0 && !wholePropertyIds.has(p.id);
  }).length;

  const summaryData = useMemo(() => {
    const totalProperties = properties?.length ?? 0;
    const totalVacant = totalUnits - occupiedUnits + propertiesWithoutUnitsNoContract;
    const contractualRevenue = (contracts ?? []).reduce((s, c) => s + safeNumber(c.rent_amount), 0);

    // في السنة المغلقة: استخدم بيانات الحساب الختامي
    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesAll: number;
    if (isClosed && currentAccount) {
      activeIncome = safeNumber(currentAccount.total_income);
      totalExpensesAll = safeNumber(currentAccount.total_expenses);
    } else {
      activeIncome = (contracts ?? []).filter(c => c.status === 'active').reduce((s, c) => s + safeNumber(c.rent_amount), 0);
      const propExpensesAll = (expenses ?? []).filter(e => e.property_id);
      totalExpensesAll = propExpensesAll.reduce((s, e) => s + safeNumber(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesAll;
    const overallOccupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const occColor = overallOccupancy >= 80 ? 'text-success' : overallOccupancy >= 50 ? 'text-warning' : 'text-destructive';
    const occBarColor = overallOccupancy >= 80 ? '[&>div]:bg-success' : overallOccupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';
    return { totalProperties, totalVacant, contractualRevenue, activeIncome, totalExpensesAll, netIncome, overallOccupancy, occColor, occBarColor };
  }, [properties, totalUnits, occupiedUnits, propertiesWithoutUnitsNoContract, contracts, expenses, isClosed, accounts]);

  const { totalProperties, totalVacant, contractualRevenue, activeIncome, totalExpensesAll, netIncome, overallOccupancy, occColor, occBarColor } = summaryData;


  if (isLoading) {
    return <DashboardLayout><div className="p-4 md:p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div></DashboardLayout>;
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">حدث خطأ في تحميل العقارات</h2>
          <p className="text-muted-foreground">يرجى المحاولة مرة أخرى</p>
          <Button onClick={() => { refetchProps(); refetchUnits(); }} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RequirePublishedYears title="العقارات" icon={Building2} description="عرض العقارات والوحدات">
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard
          title="العقارات"
          description="عرض العقارات والوحدات والمؤشرات التشغيلية"
          icon={Building2}
          actions={
            <ExportMenu onExportPdf={async () => {
              try {
                await generatePropertiesPDF(
                  (properties ?? []).map(p => ({
                    property_number: p.property_number,
                    property_type: p.property_type,
                    location: p.location,
                    area: p.area,
                    description: p.description,
                  })),
                  pdfWaqfInfo
                );
                toast.success('تم تصدير العقارات بنجاح');
              } catch {
                toast.error('حدث خطأ أثناء تصدير PDF');
              }
            }} />
          }
        />

        {/* بطاقات الملخص الإجمالية */}
        <div className="space-y-4 animate-slide-up">
          {/* الصف الأول - المؤشرات التشغيلية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">إجمالي العقارات</p><p className="text-xl font-bold">{totalProperties}</p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50"><Layers className="w-5 h-5 text-accent-foreground" /></div>
                <div><p className="text-xs text-muted-foreground">إجمالي الوحدات</p><p className="text-xl font-bold">{totalUnits}</p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10"><div className="w-5 h-5 rounded-full bg-success" /></div>
                <div><p className="text-xs text-muted-foreground">مؤجرة</p><p className="text-xl font-bold text-success">{occupiedUnits}</p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10"><div className="w-5 h-5 rounded-full bg-warning" /></div>
                <div><p className="text-xs text-muted-foreground">شاغرة</p><p className="text-xl font-bold text-warning">{totalVacant}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* الصف الثاني - المؤشرات المالية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-lg font-bold">{fmt(contractualRevenue)} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10"><CircleDollarSign className="w-5 h-5 text-success" /></div>
                <div><p className="text-xs text-muted-foreground">{isClosed ? 'دخل السنة' : 'الدخل النشط'}</p><p className="text-lg font-bold text-success">{fmt(activeIncome)} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><Receipt className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">المصروفات</p><p className="text-lg font-bold">{fmt(totalExpensesAll)} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Wallet className="w-5 h-5 text-foreground" /></div>
                <div><p className="text-xs text-muted-foreground">صافي الدخل</p><p className={`text-lg font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netIncome)} <span className="text-xs font-normal">ريال</span></p></div>
              </CardContent>
            </Card>
          </div>

          {/* نسبة الإشغال الإجمالية */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">نسبة الإشغال الإجمالية</span>
                <span className={`text-sm font-bold ${occColor}`}>{overallOccupancy}%</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <Progress value={overallOccupancy} className={`h-3 ${occBarColor}`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>مؤجرة: {occupiedUnits} من {totalUnits} وحدة | شاغرة: {totalVacant}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {!properties?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد عقارات مسجلة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => {
              const pf = computePropertyFinancials({
                propertyId: property.id,
                contracts,
                expenses,
                units: units ?? [],
                isSpecificYear,
              });
              const { rented, vacant, maintenance, occupancy, occupancyColor, progressColor, monthlyRent, activeAnnualRent, totalExpenses, netIncome, contractualRevenue } = pf;
              const propertyUnits = (units ?? []).filter(u => u.property_id === property.id);
              const total = propertyUnits.length;

              const isExpanded = expandedId === property.id;

              return (
                <Card
                  key={property.id}
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : property.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{property.property_number}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{property.property_type}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{property.location}</span>
                      <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area} م²</span>
                    </div>

                    {/* المؤشرات التشغيلية */}
                    <div className="border-t pt-3 space-y-2">
                      {total > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex gap-3 flex-wrap">
                              <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5 text-success" />مؤجرة: <strong>{rented}</strong></span>
                              <span className="flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />شاغرة: <strong>{vacant}</strong></span>
                              {maintenance > 0 && <span className="flex items-center gap-1 text-destructive">صيانة: <strong>{maintenance}</strong></span>}
                            </div>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <Progress value={occupancy} className={`h-2 flex-1 ${progressColor}`} />
                                  <span className={`text-xs font-semibold ${occupancyColor}`}>{occupancy}%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>مؤجرة: {rented} من {total} وحدة | شاغرة: {vacant}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      ) : contracts.some(c => c.property_id === property.id) ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Home className="w-3.5 h-3.5 text-success" />
                            <span className="font-medium text-success">مؤجر بالكامل</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <Progress value={100} className="h-2 flex-1 [&>div]:bg-success" />
                                  <span className="text-xs font-semibold text-success">100%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>العقار مؤجر بالكامل</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">لا توجد وحدات مسجلة</div>
                      )}
                    </div>

                    {/* المؤشرات المالية */}
                    <div className="border-t pt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الإيرادات التعاقدية:</span>
                        <span className="font-semibold">{fmt(contractualRevenue)} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الدخل النشط:</span>
                        <span className="font-medium text-success">{fmt(activeAnnualRent)} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الشهري:</span>
                        <span className="font-medium">{fmtInt(monthlyRent)} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المصروفات:</span>
                        <span className="font-medium">{fmt(totalExpenses)} ريال</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-muted-foreground">الصافي:</span>
                        <span className={`font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {fmt(netIncome)} ريال
                        </span>
                      </div>
                    </div>

                    {/* الوحدات عند التوسيع */}
                    {isExpanded && propertyUnits.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <DoorOpen className="w-3.5 h-3.5" /> الوحدات ({propertyUnits.length})
                        </p>
                        {propertyUnits.map(unit => (
                          <div key={unit.id} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                            <div>
                              <span className="font-medium">{unit.unit_number}</span>
                              <span className="text-muted-foreground mr-2">- {unit.unit_type}</span>
                              {unit.floor && <span className="text-muted-foreground mr-2">| {unit.floor}</span>}
                              {unit.area && <span className="text-muted-foreground mr-2">| {unit.area} م²</span>}
                            </div>
                            <Badge variant={(rentedUnitIdsForProp.has(unit.id) || isWholePropertyRented) ? 'default' : unit.status === 'صيانة' ? 'destructive' : 'secondary'}>
                              {(rentedUnitIdsForProp.has(unit.id) || isWholePropertyRented) ? 'مؤجرة' : unit.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {propertyUnits.length > 0 && (
                      <div className="border-t pt-2 mt-1 flex items-center gap-2 text-xs text-primary">
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>اضغط لعرض الوحدات ({propertyUnits.length})</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default PropertiesViewPage;
