/**
 * رقم الإصدار الظاهر + زر «ما الجديد» (الهوية الوقفية).
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChangelog, APP_VERSION } from '@/hooks/data/settings/release/useChangelog';
import ChangelogDialog from './ChangelogDialog';

const AppVersionBadge = () => {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useChangelog(open);
  return (
    <>
      <Button
        type="button" variant="outline" size="sm"
        className="gap-2 rounded-full border-bronze-line bg-bronze-soft/60 text-bronze-foreground hover:bg-bronze-soft"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>ما الجديد</span>
        {APP_VERSION && (
          <span className="text-xs text-muted-foreground">
            الإصدار <bdi dir="ltr" className="num">{APP_VERSION}</bdi>
          </span>
        )}
      </Button>
      <ChangelogDialog
        open={open} onOpenChange={setOpen} entries={data ?? []}
        status={isLoading ? 'loading' : isError ? 'error' : 'ready'}
      />
    </>
  );
};

export default AppVersionBadge;
