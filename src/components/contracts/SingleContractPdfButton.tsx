/** زر طباعة العقد الرسمي (PDF) — يظهر في صفوف العقود للناظر والمستفيد. */
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSingleContractPdf } from '@/hooks/application/contracts/useSingleContractPdf';
import type { SingleContractSource } from '@/utils/contracts/singleContractPdfData';

interface Props {
  contract: SingleContractSource & { id?: string | null };
  /** يضمّن جدول كل الدفعات (الناظر) */
  withPayments?: boolean;
  propertyLabel?: string | null;
  withLabel?: boolean;
}

export const SingleContractPdfButton = ({ contract, withPayments = false, propertyLabel, withLabel }: Props) => {
  const { download, busy } = useSingleContractPdf();
  const Icon = busy ? Loader2 : Printer;
  return (
    <Button
      variant="ghost" size={withLabel ? 'sm' : 'icon'}
      className={withLabel ? 'h-8 gap-1.5 text-primary' : 'w-7 h-7 text-primary'}
      onClick={() => download(contract, withPayments, propertyLabel)} disabled={busy}
      title="طباعة العقد الرسمي" aria-label={`طباعة العقد الرسمي ${contract.contract_number ?? ''}`}
    >
      <Icon className={busy ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
      {withLabel && 'طباعة العقد'}
    </Button>
  );
};

export default SingleContractPdfButton;
