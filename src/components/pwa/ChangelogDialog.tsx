import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Bug, Wrench, Star } from 'lucide-react';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'feature' | 'fix' | 'improvement'; text: string }[];
}

const typeIcon = {
  feature: <Star className="h-3.5 w-3.5 text-primary" />,
  fix: <Bug className="h-3.5 w-3.5 text-destructive" />,
  improvement: <Wrench className="h-3.5 w-3.5 text-warning" />,
};

const typeLabel = {
  feature: 'جديد',
  fix: 'إصلاح',
  improvement: 'تحسين',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: ChangelogEntry[];
}

const ChangelogDialog = ({ open, onOpenChange, entries }: Props) => (
  