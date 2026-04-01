/** حوار إدارة وحدات العقار — مكون عرضي يستخدم usePropertyUnits */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Property, Contract } from '@/types/database';
import { Plus, Building2, Home, DoorOpen } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import type { UnitPdfRow } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { usePropertyUnits } from '@/hooks/data/usePropertyUnits';
import { getTenantFromContracts } from './units/helpers';

import UnitFormCard from './units/UnitFormCard';
import MobileUnitCard from './units/MobileUnitCard';
import MobileSummaryCard from './units/MobileSummaryCard';
import DesktopUnitsTable from './units/DesktopUnitsTable';
import WholePropertyTab from './units/WholePropertyTab';
import DeleteUnitDialog from './units/DeleteUnitDialog';

interface PropertyUnitsDialogProps {
  property: Property;
  contracts: Contract[];
  onClose: () => void;
}

const PropertyUnitsDialog = ({ property, contracts, onClose }: PropertyUnitsDialogProps) => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const pu = usePropertyUnits(property, contracts);

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5" />
              عقار {property.property_number} - {property.location}
            </DialogTitle>
            <DialogDescription className="sr-only">إدارة وحدات العقار</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">النوع</p>
              <p className="font-medium text-sm">{property.property_type}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">الموقع</p>
              <p className="font-medium text-sm">{property.location}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">المساحة</p>
              <p className="font-medium text-sm">{property.area} م²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">إجمالي الوحدات</p>
              <p className="font-medium text-sm">{pu.units.length}</p>
            </div>
          </div>

          <Tabs value={pu.rentalMode} onValueChange={(v) => pu.setRentalMode(v as 'units' | 'whole')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="units">وحدات منفصلة</TabsTrigger>
              <TabsTrigger value="whole">العقار كامل</TabsTrigger>
            </TabsList>

            <TabsContent value="units" className="space-y-4 mt-4">
              {pu.units.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default" className="gap-1"><Home className="w-3 h-3" /> مؤجرة: {pu.rented}</Badge>
                  <Badge variant="secondary" className="gap-1"><DoorOpen className="w-3 h-3" /> شاغرة: {pu.vacant}</Badge>
                  {pu.maintenance > 0 && <Badge variant="destructive" className="gap-1">صيانة: {pu.maintenance}</Badge>}
                </div>
              )}

              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-semibold">الوحدات السكنية</h3>
                <div className="flex gap-2 flex-wrap print:hidden">
                  <ExportMenu onExportPdf={() => {
                    const pdfRows: UnitPdfRow[] = pu.units.map(u => {
                      const tenant = getTenantFromContracts(u.id, contracts);
                      return {
                        unit_number: u.unit_number, unit_type: u.unit_type, status: u.status,
                        tenant_name: tenant?.name || null, start_date: tenant?.start_date || null, end_date: tenant?.end_date || null,
                        rent_amount: tenant?.rent_amount || null, paid_months: tenant ? pu.getPaymentInfo(tenant.contract_id) : 0,
                        payment_type: tenant?.payment_type, payment_count: tenant?.payment_count,
                      };
                    });
                    const { generateUnitsPDF } = await import('@/utils/pdf');
                    generateUnitsPDF(property.property_number, property.location, pdfRows, pdfWaqfInfo);
                  }} />
                  <Button size="sm" className="gap-1" onClick={() => { pu.resetUnitForm(); pu.setIsUnitFormOpen(true); }}>
                    <Plus className="w-4 h-4" /> إضافة وحدة
                  </Button>
                </div>
              </div>

              {pu.isUnitFormOpen && (
                <UnitFormCard
                  form={pu.unitForm}
                  onChange={pu.setUnitForm}
                  onSubmit={pu.handleUnitSubmit}
                  onCancel={pu.resetUnitForm}
                  isEditing={!!pu.editingUnit}
                  isPending={pu.isPending}
                />
              )}

              {pu.isLoading ? (
                <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
              ) : pu.units.length === 0 ? (
                <div className="text-center py-8">
                  <DoorOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">لا توجد وحدات مسجلة لهذا العقار</p>
                  <p className="text-xs text-muted-foreground mt-1">اضغط "إضافة وحدة" لبدء تسجيل الوحدات السكنية</p>
                </div>
              ) : (
                <div>
                  <div className="space-y-3 md:hidden">
                    {pu.units.map((unit) => {
                      const tenant = getTenantFromContracts(unit.id, contracts);
                      const paid = tenant ? pu.getPaymentInfo(tenant.contract_id) : 0;
                      return (
                        <MobileUnitCard
                          key={unit.id} unit={unit} tenant={tenant} paidMonths={paid}
                          paymentInvoices={pu.paymentInvoices}
                          onEdit={pu.handleEditUnit} onDelete={pu.setDeleteUnitTarget}
                        />
                      );
                    })}
                  </div>
                  <MobileSummaryCard units={pu.units} contracts={contracts} wholePropertyContracts={pu.wholePropertyContracts} />
                  <DesktopUnitsTable
                    units={pu.units} contracts={contracts} wholePropertyContracts={pu.wholePropertyContracts}
                    tenantPayments={pu.tenantPayments} paymentInvoices={pu.paymentInvoices}
                    onEdit={pu.handleEditUnit} onDelete={pu.setDeleteUnitTarget}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="whole">
              <WholePropertyTab
                wholePropertyContract={pu.wholePropertyContract}
                onSave={pu.handleWholePropertySave}
                isPending={pu.isPending}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DeleteUnitDialog
        unit={pu.deleteUnitTarget}
        onClose={() => pu.setDeleteUnitTarget(null)}
        onConfirm={pu.handleConfirmDeleteUnit}
      />
    </>
  );
};

export default PropertyUnitsDialog;
