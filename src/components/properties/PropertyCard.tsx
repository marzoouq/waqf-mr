/**
 * بطاقة عقار واحد — مستخرج من PropertiesPage
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Edit, Trash2, Building2, MapPin, Ruler, Home, DoorOpen, AlertTriangle } from 'lucide-react';
import { fmt, fmtInt } from '@/utils/format';
import type { Property } from '@/types/database';

interface PropertyFinancials {
  totalUnits: number;
  rented: number;
  vacant: number;
  maintenance: number;
  statusMismatch: number;
  occupancy: number;
  occupancyColor: string;
  progressColor: string;
  monthlyRent: number;
  activeAnnualRent: number;
  totalExpenses: number;
  netIncome: number;
  contractualRevenue: number;
}

interface PropertyCardProps {
  property: Property;
  financials: PropertyFinancials;
  hasActiveContracts: boolean;
  onSelect: (property: Property) => void;
  onEdit: (property: Property, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string) => void;
}

const PropertyCard = ({ property, financials, hasActiveContracts, onSelect, onEdit, onDelete }: PropertyCardProps) => {
  const {
    totalUnits, rented, vacant, maintenance, statusMismatch,
    occupancy, occupancyColor, progressColor, monthlyRent,
    activeAnnualRent, totalExpenses, netIncome, contractualRevenue,
  } = financials;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(property)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{property.property_number}</CardTitle>
            {property.vat_exempt && (
              <span className="text-[11px] bg-success/10 text-success px-1.5 py-0.5 rounded font-medium">معفى VAT</span>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => onEdit(property, e)} aria-label="تعديل العقار"><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(property.id, `العقار ${property.property_number}`); }} className="text-destructive hover:text-destructive" aria-label="حذف العقار"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{property.property_type}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{property.location}</span>
          <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area} م²</span>
        </div>

        <div className="border-t pt-3 space-y-2">
          {totalUnits > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5 text-success" />مؤجرة: <strong>{rented}</strong></span>
                  <span className="flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />شاغرة: <strong>{vacant}</strong></span>
                  {maintenance > 0 && <span className="flex items-center gap-1 text-destructive">صيانة: <strong>{maintenance}</strong></span>}
                  {statusMismatch > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 text-warning cursor-help">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <strong>{statusMismatch}</strong>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{statusMismatch} وحدة بها تناقض بين الحالة والعقود - يرجى المراجعة</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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
                  <TooltipContent>مؤجرة: {rented} من {totalUnits} وحدة | شاغرة: {vacant}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : hasActiveContracts ? (
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

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">الإيرادات التعاقدية:</span><span className="font-semibold">{fmt(contractualRevenue)} ريال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الدخل النشط:</span><span className="font-medium text-success">{fmt(activeAnnualRent)} ريال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الاستحقاق الشهري:</span><span className="font-medium">{fmtInt(monthlyRent)} ريال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">المصروفات:</span><span className="font-medium">{fmt(totalExpenses)} ريال</span></div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">الصافي:</span>
            <span className={`font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netIncome)} ريال</span>
          </div>
        </div>

        <div className="border-t pt-2 mt-1 flex items-center gap-2 text-xs text-primary">
          <DoorOpen className="w-3.5 h-3.5" /><span>اضغط لعرض الوحدات</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;
