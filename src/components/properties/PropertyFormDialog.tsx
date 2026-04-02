/**
 * مودال إضافة/تعديل عقار — مستخرج من PropertiesPage
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';

interface PropertyFormData {
  property_number: string;
  property_type: string;
  location: string;
  area: string;
  description: string;
  vat_exempt: boolean;
}

interface PropertyFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingProperty: unknown;
  formData: PropertyFormData;
  setFormData: (data: PropertyFormData) => void;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  createPending: boolean;
  updatePending: boolean;
}

const PropertyFormDialog = ({
  isOpen, setIsOpen, editingProperty, formData, setFormData,
  resetForm, handleSubmit, createPending, updatePending,
}: PropertyFormDialogProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
    <DialogTrigger asChild>
      <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة عقار</Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{editingProperty ? 'تعديل العقار' : 'إضافة عقار جديد'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج إضافة أو تعديل عقار</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="property-number">رقم العقار *</Label><Input id="property-number" name="property-number" value={formData.property_number} onChange={(e) => setFormData({ ...formData, property_number: e.target.value })} placeholder="مثال: W-001" /></div>
        <div className="space-y-2"><Label htmlFor="property-type">نوع العقار *</Label><Input id="property-type" name="property-type" value={formData.property_type} onChange={(e) => setFormData({ ...formData, property_type: e.target.value })} placeholder="شقة، محل تجاري، مبنى..." /></div>
        <div className="space-y-2"><Label htmlFor="property-location">الموقع *</Label><Input id="property-location" name="property-location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="المدينة، الحي، الشارع" /></div>
        <div className="space-y-2"><Label htmlFor="property-area">المساحة (م²) *</Label><Input id="property-area" name="property-area" type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} placeholder="100" /></div>
        <div className="space-y-2"><Label htmlFor="property-description">الوصف</Label><Input id="property-description" name="property-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي للعقار" /></div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">معفى من الضريبة (سكني)</Label>
            <p className="text-xs text-muted-foreground">العقارات السكنية معفاة من VAT حسب نظام ZATCA</p>
          </div>
          <Switch checked={formData.vat_exempt} onCheckedChange={(checked) => setFormData({ ...formData, vat_exempt: checked })} />
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1 gradient-primary" disabled={createPending || updatePending}>{editingProperty ? 'تحديث' : 'إضافة'}</Button>
          <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default PropertyFormDialog;
