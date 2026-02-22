/**
 * صفحة عرض العقارات للمستفيد (قراءة فقط)
 */
import { useProperties } from '@/hooks/useProperties';
import { useAllUnits } from '@/hooks/useUnits';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Maximize2, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const PropertiesViewPage = () => {
  const { data: properties, isLoading: propsLoading, isError: propsError, refetch: refetchProps } = useProperties();
  const { data: units, isLoading: unitsLoading, isError: unitsError, refetch: refetchUnits } = useAllUnits();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const isLoading = propsLoading || unitsLoading;
  const isError = propsError || unitsError;

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">حدث خطأ في تحميل العقارات</h2>
          <p className="text-muted-foreground">يرجى المحاولة مرة أخرى</p>
          <Button onClick={() => { refetchProps(); refetchUnits(); }} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getUnitsForProperty = (propertyId: string) =>
    units?.filter(u => u.property_id === propertyId) ?? [];

  const totalUnits = units?.length ?? 0;
  const occupiedUnits = units?.filter(u => u.status === 'مؤجرة').length ?? 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">العقارات</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي العقارات</p>
                <p className="text-xl font-bold">{properties?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الوحدات</p>
                <p className="text-xl font-bold">{totalUnits}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm font-bold">{occupiedUnits}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">مؤجرة</p>
                <p className="text-xl font-bold">{occupiedUnits}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 text-sm font-bold">{totalUnits - occupiedUnits}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">شاغرة</p>
                <p className="text-xl font-bold">{totalUnits - occupiedUnits}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-3">
            {properties?.map(prop => {
              const propUnits = getUnitsForProperty(prop.id);
              const isExpanded = expandedId === prop.id;
              return (
                <Card key={prop.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : prop.id)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{prop.property_number}</p>
                        <p className="text-sm text-muted-foreground">{prop.property_type}</p>
                      </div>
                      <Badge variant="outline">{propUnits.length} وحدة</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {prop.location}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Maximize2 className="w-3 h-3" /> {prop.area} م²
                    </div>
                    {isExpanded && propUnits.length > 0 && (
                      <div className="mt-3 border-t pt-3 space-y-2">
                        <p className="text-sm font-semibold text-foreground">الوحدات:</p>
                        {propUnits.map(unit => (
                          <div key={unit.id} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                            <span>{unit.unit_number} - {unit.unit_type}</span>
                            <Badge variant={unit.status === 'مؤجرة' ? 'default' : 'secondary'}>
                              {unit.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Desktop Table View */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم العقار</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">المساحة (م²)</TableHead>
                    <TableHead className="text-right">الوحدات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties?.map(prop => {
                    const propUnits = getUnitsForProperty(prop.id);
                    const isExpanded = expandedId === prop.id;
                    return (
                      <React.Fragment key={prop.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedId(isExpanded ? null : prop.id)}
                        >
                          <TableCell className="font-medium">{prop.property_number}</TableCell>
                          <TableCell>{prop.property_type}</TableCell>
                          <TableCell>{prop.location}</TableCell>
                          <TableCell>{prop.area}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{propUnits.length} وحدة</Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && propUnits.length > 0 && (
                          <TableRow key={`${prop.id}-units`}>
                            <TableCell colSpan={5} className="bg-muted/30 p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-right">رقم الوحدة</TableHead>
                                    <TableHead className="text-right">النوع</TableHead>
                                    <TableHead className="text-right">الدور</TableHead>
                                    <TableHead className="text-right">المساحة</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {propUnits.map(unit => (
                                    <TableRow key={unit.id}>
                                      <TableCell>{unit.unit_number}</TableCell>
                                      <TableCell>{unit.unit_type}</TableCell>
                                      <TableCell>{unit.floor || '-'}</TableCell>
                                      <TableCell>{unit.area || '-'}</TableCell>
                                      <TableCell>
                                        <Badge variant={unit.status === 'مؤجرة' ? 'default' : 'secondary'}>
                                          {unit.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropertiesViewPage;
