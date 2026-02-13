import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** Skeleton for stat cards grid (AdminDashboard) */
export const StatsGridSkeleton = ({ count = 9 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Skeleton for a data table */
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <Card className="shadow-sm">
    <CardHeader>
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 pb-2 border-b">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/** Skeleton for KPI panel */
export const KpiSkeleton = () => (
  <Card className="shadow-sm">
    <CardHeader>
      <Skeleton className="h-6 w-56" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2 p-4 rounded-lg bg-muted/30">
            <Skeleton className="h-4 w-20 mx-auto" />
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/** Skeleton for chart cards */
export const ChartSkeleton = () => (
  <Card className="shadow-sm">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[300px] w-full rounded-md" />
    </CardContent>
  </Card>
);

/** Full dashboard skeleton */
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
    <StatsGridSkeleton />
    <KpiSkeleton />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    <TableSkeleton />
  </div>
);
