/**
 * BeneficiaryPropertyCard — بطاقة عرض عقار واحد للمستفيد (قراءة فقط).
 * استُخرجت من PropertiesViewPage للالتزام بحد 200 سطر.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Building2, MapPin, Home, DoorOpen, Ruler } from 'lucide-react';
import { fmt, fmtInt } from '@/utils/format/format';

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_type: string;
  floor?: string | null;
  area?: number | null;
  status: string;
}

interface PropertyFinancials {
  rented: number;
  vacant: number;
  maintenance: number;
  occupancy: number;
  occupancyColor: string;
  progressColor: string;
  monthlyRent: number;
  activeAnnualRent: number;
  totalExpenses: number;
  netIncome: number;
}

interface BeneficiaryPropertyCardProps {
  property: {
    id: string;
    property_number: string;
    property_type: string;
    location: string;
    area: number;
  };
  financials: PropertyFinancials;
  units: PropertyUnit[];
  hasAnyContract: boolean;
  isWholePropertyRented: boolean;
  rentedUnitIds: Set<string>;
  isExpanded: boolean;
  onToggle: () => void;
}

const BeneficiaryPropertyCard = ({
  property, financials, units, hasAnyContract, isWholePropertyRented,
  rentedUnitIds, isExpanded, onToggle,
}: BeneficiaryPropertyCardProps) => {
  const { rented, vacant, maintenance, occupancy, occupancyColor, progressColor,
    monthlyRent, activeAnnualRent, totalExpenses, netIncome } = financials;
  const total = units.length;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onToggle}>
      <CardHeader className="pb-2"><CardTitle className="text-lg">{property.property_number}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{property.property_type}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{property.location}</span>
          <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area} م²</span>
        </div>

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
              <Tooltip><TooltipTrigger asChild><div className="flex items-center gap-2 cursor-help"><Progress value={occupancy} className={`h-2 flex-1 ${progressColor}`} /><span className={`text-xs font-semibold ${occupancyColor}`}>{occupancy}%</span></div></TooltipTrigger><TooltipContent>مؤجرة: {rented} من {total} وحدة | شاغرة: {vacant}</TooltipContent></Tooltip>
            </>
          ) : hasAnyContract ? (
            <>
              <div className="flex items-center gap-2 text-sm"><Home className="w-3.5 h-3.5 text-success" /><span className="font-medium text-success">مؤجر بالكامل</span></div>
              <Tooltip><TooltipTrigger asChild><div className="flex items-center gap-2 cursor-help"><Progress value={100} className="h-2 flex-1 [&>div]:bg-success" /><span className="text-xs font-semibold text-success">100%</span></div></TooltipTrigger><TooltipContent>العقار مؤجر بالكامل</TooltipContent></Tooltip>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">لا توجد وحدات مسجلة</div>
          )}
        </div>

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">الدخل النشط:</span><span className="font-medium text-success">{fmt(activeAnnualRent)} ريال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الاستحقاق الشهري:</span><span className="font-medium">{fmtInt(monthlyRent)} ريال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">المصروفات:</span><span className="font-medium">{fmt(totalExpenses)} ريال</span></div>
          <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">الصافي:</span><span className={`font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netIncome)} ريال</span></div>
        </div>

        {isExpanded && units.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5" /> الوحدات ({units.length})</p>
            {units.map(unit => {
              const isUnitRented = rentedUnitIds.has(unit.id) || isWholePropertyRented;
              return (
                <div key={unit.id} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                  <div>
                    <span className="font-medium">{unit.unit_number}</span>
                    <span className="text-muted-foreground mr-2">- {unit.unit_type}</span>
                    {unit.floor && <span className="text-muted-foreground mr-2">| {unit.floor}</span>}
                    {unit.area && <span className="text-muted-foreground mr-2">| {unit.area} م²</span>}
                  </div>
                  <Badge variant={isUnitRented ? 'default' : unit.status === 'صيانة' ? 'destructive' : 'secondary'}>
                    {isUnitRented ? 'مؤجرة' : unit.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {units.length > 0 && (
          <div className="border-t pt-2 mt-1 flex items-center gap-2 text-xs text-primary">
            <DoorOpen className="w-3.5 h-3.5" /><span>اضغط لعرض الوحدات ({units.length})</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BeneficiaryPropertyCard;
