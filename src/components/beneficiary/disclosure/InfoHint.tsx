import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** أيقونة معلومات صغيرة يظهر شرحها عند اللمس فقط */
const InfoHint = ({ text, label }: { text: string; label: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={label} className="inline-flex text-muted-foreground hover:text-foreground align-middle">
        <Info className="w-3.5 h-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="text-xs max-w-[260px]" side="top">{text}</PopoverContent>
  </Popover>
);

export default InfoHint;
