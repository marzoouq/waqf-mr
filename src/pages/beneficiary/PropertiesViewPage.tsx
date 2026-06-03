/**
 * صفحة عرض العقارات للمستفيد (قراءة فقط)
 *
 * #3/#4/#20/#61 — تحسينات أداء:
 * - الخرائط المسبقة من usePropertiesViewData (لا filter داخل .map)
 * - TooltipProvider مرفوع لمستوى الصفحة (مرة واحدة)
 * - إزالة non-null assertion (!)
 */

import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Building2, Layers, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import BeneficiaryPropertyCard from '@/components/beneficiary/properties/BeneficiaryPropertyCard';
import { usePropertiesViewPage } from '@/hooks/page/beneficiary/views/usePropertiesViewPage';

const PropertiesViewPage = () => {
  const {
    properties, isLoading, isError,
    refetchProps, refetchUnits,
    expandedId, setExpandedId,
    
    totalUnits, occupiedUnits,
    summaryData,
    propertyFinancialsMap,
    propertyContractsMap,
    propertyUnitsMap,
    wholePropertyRentedSet,
    rentedUnitIdsByPropertyMap,
    handleExportPdf,
  } = usePropertiesViewPage();

  const { totalProperties, totalVacant, vacantUnits, propertiesWithoutUnits, overallOccupancy, occColor, occBarColor } = summaryData;

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
      {/* #20: TooltipProvider مرة واحدة فقط لكل الصفحة */}
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard
            title="العقارات"
            description="عرض العقارات والوحدات والمؤشرات التشغيلية"
            icon={Building2}
            actions={<ExportMenu onExportPdf={handleExportPdf} />}
          />

          {/* بطاقات الملخص الإجمالية */}
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">إجمالي العقارات</p><p className="text-xl font-bold">{totalProperties}</p></div></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/50"><Layers className="w-5 h-5 text-accent-foreground" /></div><div><p className="text-xs text-muted-foreground">إجمالي الوحدات</p><p className="text-xl font-bold">{totalUnits}</p></div></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><div className="w-5 h-5 rounded-full bg-success" /></div><div><p className="text-xs text-muted-foreground">مؤجرة</p><p className="text-xl font-bold text-success">{occupiedUnits}</p></div></CardContent></Card>
              <Tooltip><TooltipTrigger asChild><Card className="shadow-sm cursor-help"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><div className="w-5 h-5 rounded-full bg-warning" /></div><div><p className="text-xs text-muted-foreground">وحدات شاغرة</p><p className="text-xl font-bold text-warning">{vacantUnits}</p></div></CardContent></Card></TooltipTrigger><TooltipContent>وحدات مسجَّلة غير مؤجَّرة</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Card className="shadow-sm cursor-help"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><Building2 className="w-5 h-5 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">عقارات بدون وحدات</p><p className="text-xl font-bold text-muted-foreground">{propertiesWithoutUnits}</p></div></CardContent></Card></TooltipTrigger><TooltipContent>عقارات لم تُسجَّل لها وحدات ولا تتبعها عقود</TooltipContent></Tooltip>
            </div>
            <p className="sr-only">إجمالي الشواغر: {totalVacant}</p>

            <Card className="shadow-sm bg-muted/30">
              <CardContent className="p-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="text-muted-foreground">للاطلاع على التفاصيل المالية، انتقل إلى صفحات الاختصاص.</span>
                <div className="flex items-center gap-3 shrink-0">
                  <Link to="/dashboard/reports" className="inline-flex items-center gap-1 text-primary hover:underline">التقارير المالية <ArrowLeft className="w-3.5 h-3.5" /></Link>
                  <Link to="/dashboard/my-share" className="inline-flex items-center gap-1 text-primary hover:underline">حصتي <ArrowLeft className="w-3.5 h-3.5" /></Link>
                </div>
              </CardContent>
            </Card>


            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة الإشغال الإجمالية</span>
                  <span className={`text-sm font-bold ${occColor}`}>{overallOccupancy}%</span>
                </div>
                <Tooltip><TooltipTrigger asChild><div className="cursor-help"><Progress value={overallOccupancy} className={`h-3 ${occBarColor}`} /></div></TooltipTrigger><TooltipContent>مؤجرة: {occupiedUnits} من {totalUnits} وحدة | وحدات شاغرة: {vacantUnits} | عقارات بدون وحدات: {propertiesWithoutUnits}</TooltipContent></Tooltip>
              </CardContent>
            </Card>
          </div>

          {!properties?.length ? (
            <EmptyState icon={Building2} title="لا توجد عقارات مسجلة" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => {
                const pf = propertyFinancialsMap.get(property.id);
                if (!pf) return null;

                // استخدام الخرائط المسبقة بدل filter جديد لكل عقار (perf O(n) بدل O(n²))
                const propertyUnits = propertyUnitsMap.get(property.id) ?? [];
                const propertyContracts = propertyContractsMap.get(property.id) ?? [];
                const rentedUnitIdsForProp = rentedUnitIdsByPropertyMap.get(property.id) ?? new Set<string>();
                const isWholePropertyRented = wholePropertyRentedSet.has(property.id);
                const hasAnyContract = propertyContracts.length > 0;
                const isExpanded = expandedId === property.id;

                return (
                  <BeneficiaryPropertyCard
                    key={property.id}
                    property={property}
                    financials={pf}
                    units={propertyUnits}
                    hasAnyContract={hasAnyContract}
                    isWholePropertyRented={isWholePropertyRented}
                    rentedUnitIds={rentedUnitIdsForProp}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : property.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default PropertiesViewPage;
