import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FY_STATE_COPY } from '@/constants/beneficiaryCopy';

const NoPublishedYearsNotice = () => (
  <Card className="shadow-sm border-warning/30 bg-warning/5">
    <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
      <AlertCircle className="w-12 h-12 text-warning" />
      <h2 className="text-lg font-bold text-foreground">{FY_STATE_COPY.noPublished.title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {FY_STATE_COPY.noPublished.body}
      </p>
    </CardContent>
  </Card>
);

export default NoPublishedYearsNotice;

