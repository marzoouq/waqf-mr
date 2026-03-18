import { fmt } from '@/utils/format';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';

interface AccountsSettingsBarProps {
  fiscalYear: string;
  adminPercent: number;
  waqifPercent: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  calculatedVat: number;
  commercialRent: number;
  vatPercentage: number;
  onFiscalYearChange: (val: string) => void;
  onAdminPercentChange: (val: string) => void;
  onWaqifPercentChange: (val: string) => void;
  onWaqfCorpusPreviousChange: (val: number) => void;
  onManualVatChange: (val: number) => void;
  onZakatAmountChange: (val: number) => void;
  onWaqfCorpusManualChange: (val: number) => void;
  onManualDistributionsChange: (val: number) => void;
}

const AccountsSettingsBar = ({
  fiscalYear, adminPercent, waqifPercent, waqfCorpusPrevious,
  manualVat, zakatAmount, waqfCorpusManual, manualDistributions,
  calculatedVat, commercialRent, vatPercentage,
  onFiscalYearChange, onAdminPercentChange, onWaqifPercentChange,
  onWaqfCorpusPreviousChange, onManualVatChange, onZakatAmountChange,
  onWaqfCorpusManualChange, onManualDistributionsChange,
}: AccountsSettingsBarProps) => {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">إعدادات:</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">السنة المالية:</Label>
            <Input
              value={fiscalYear}
              onChange={(e) => onFiscalYearChange(e.target.value)}
              className="h-8 w-52"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">نسبة الناظر (%):</Label>
            <Input
              type="number"
              value={adminPercent}
              onChange={(e) => onAdminPercentChange(e.target.value)}
              className="h-8 w-20"
              min={0}
              max={100}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">نسبة الواقف (%):</Label>
            <Input
              type="number"
              value={waqifPercent}
              onChange={(e) => onWaqifPercentChange(e.target.value)}
              className="h-8 w-20"
              min={0}
              max={100}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">رقبة وقف مرحلة من عام سابق (ر.س):</Label>
            <Input
              type="number"
              value={waqfCorpusPrevious}
              onChange={(e) => onWaqfCorpusPreviousChange(safeNumber(e.target.value))}
              className="h-8 w-28"
              min={0}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">ضريبة القيمة المضافة (ر.س):</Label>
            <Input
              type="number"
              value={manualVat}
              onChange={(e) => onManualVatChange(safeNumber(e.target.value))}
              className="h-8 w-28"
              min={0}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">مبلغ الزكاة (ر.س):</Label>
            <Input
              type="number"
              value={zakatAmount}
              onChange={(e) => onZakatAmountChange(safeNumber(e.target.value))}
              className="h-8 w-28"
              min={0}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">رقبة الوقف للعام الحالي (ر.س):</Label>
            <Input
              type="number"
              value={waqfCorpusManual}
              onChange={(e) => onWaqfCorpusManualChange(safeNumber(e.target.value))}
              className="h-8 w-28"
              min={0}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">مبلغ التوزيعات (ر.س):</Label>
            <Input
              type="number"
              value={manualDistributions}
              onChange={(e) => onManualDistributionsChange(safeNumber(e.target.value))}
              className="h-8 w-28"
              min={0}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          ضريبة تجارية محسوبة (استرشادي): {calculatedVat.toLocaleString()} ر.س (من إيجارات {commercialRent.toLocaleString()} تجاري × {vatPercentage}%)
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountsSettingsBar;
