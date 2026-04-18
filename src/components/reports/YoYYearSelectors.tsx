/**
 * YoYYearSelectors — اختيار السنتين + زر تصدير PDF
 * مكوّن UI خالص مستخرج من YearOverYearComparison
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, FileDown } from 'lucide-react';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';

interface YoYYearSelectorsProps {
  fiscalYears: FiscalYear[];
  year1Id: string;
  year2Id: string;
  onYear1Change: (id: string) => void;
  onYear2Change: (id: string) => void;
  onExportPDF: () => void;
}

const YoYYearSelectors = ({
  fiscalYears, year1Id, year2Id, onYear1Change, onYear2Change, onExportPDF,
}: YoYYearSelectorsProps) => {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full">
            <span className="text-sm font-medium whitespace-nowrap">السنة الأولى:</span>
            <Select value={year1Id} onValueChange={onYear1Change}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
              <SelectContent>
                {fiscalYears.map(fy => (
                  <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year2Id}>{fy.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowUpDown className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 flex-1 w-full">
            <span className="text-sm font-medium whitespace-nowrap">السنة الثانية:</span>
            <Select value={year2Id} onValueChange={onYear2Change}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
              <SelectContent>
                {fiscalYears.map(fy => (
                  <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year1Id}>{fy.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onExportPDF}>
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير PDF</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default YoYYearSelectors;
