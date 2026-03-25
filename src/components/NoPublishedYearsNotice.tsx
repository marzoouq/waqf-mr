import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const NoPublishedYearsNotice = () => (
  <Card className="shadow-sm border-warning/30 bg-warning/5">
    <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
      <AlertCircle className="w-12 h-12 text-warning" />
      <h2 className="text-lg font-bold text-foreground">لا توجد سنوات مالية منشورة</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        لم ينشر الناظر أي سنة مالية بعد. ستظهر البيانات المالية فور نشر سنة مالية من قبل الناظر.
      </p>
    </CardContent>
  </Card>
);

export default NoPublishedYearsNotice;
