import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Printer, FileDown } from 'lucide-react';

interface ExportMenuProps {
  onPrint?: () => void;
  onExportPdf?: () => void;
  /** Hide the print option */
  hidePrint?: boolean;
  /** Hide the PDF option */
  hidePdf?: boolean;
}

const ExportMenu = ({ onPrint, onExportPdf, hidePrint, hidePdf }: ExportMenuProps) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // If only one action available, render a single button
  if (hidePrint && !hidePdf && onExportPdf) {
    return (
      <Button variant="outline" size="sm" onClick={onExportPdf} className="gap-2">
        <FileDown className="w-4 h-4" />
        <span className="hidden sm:inline">تصدير PDF</span>
      </Button>
    );
  }

  if (hidePdf && !hidePrint) {
    return (
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">طباعة</span>
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
        {!hidePrint && (
          <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
            <Printer className="w-4 h-4" />
            طباعة
          </DropdownMenuItem>
        )}
        {!hidePdf && onExportPdf && (
          <DropdownMenuItem onClick={onExportPdf} className="gap-2 cursor-pointer">
            <FileDown className="w-4 h-4" />
            تصدير PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
