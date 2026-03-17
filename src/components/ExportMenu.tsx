import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Printer, FileDown, FileSpreadsheet } from 'lucide-react';

interface ExportMenuProps {
  onPrint?: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  /** Hide the print option */
  hidePrint?: boolean;
  /** Hide the PDF option */
  hidePdf?: boolean;
}

const ExportMenu = ({ onPrint, onExportPdf, onExportCsv, hidePrint, hidePdf }: ExportMenuProps) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // عدد الخيارات المتاحة
  const options = [
    !hidePrint && { key: 'print', label: 'طباعة', icon: Printer, action: handlePrint },
    !hidePdf && onExportPdf && { key: 'pdf', label: 'تصدير PDF', icon: FileDown, action: onExportPdf },
    onExportCsv && { key: 'csv', label: 'تصدير Excel', icon: FileSpreadsheet, action: onExportCsv },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Printer; action: () => void }[];

  // إذا لا يوجد خيارات
  if (options.length === 0) return null;

  // إذا خيار واحد فقط، عرض زر مباشر
  if (options.length === 1) {
    const opt = options[0];
    const Icon = opt.icon;
    return (
      <Button variant="outline" size="sm" onClick={opt.action} className="gap-2">
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{opt.label}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">تصدير</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <DropdownMenuItem key={opt.key} onClick={opt.action} className="gap-2 cursor-pointer">
              <Icon className="w-4 h-4" />
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
