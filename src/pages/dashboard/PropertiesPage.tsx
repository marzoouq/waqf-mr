import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { Property } from '@/types/database';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler } from 'lucide-react';
import { toast } from 'sonner';

const PropertiesPage = () => {
  const { data: properties = [], isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    property_number: '',
    property_type: '',
    location: '',
    area: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      property_number: '',
      property_type: '',
      location: '',
      area: '',
      description: '',
    });
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.property_number || !formData.property_type || !formData.location || !formData.area) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const propertyData = {
      property_number: formData.property_number,
      property_type: formData.property_type,
      location: formData.location,
      area: parseFloat(formData.area),
      description: formData.description || undefined,
    };

    if (editingProperty) {
      await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
    } else {
      await createProperty.mutateAsync(propertyData);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      property_number: property.property_number,
      property_type: property.property_type,
      location: property.location,
      area: property.area.toString(),
      description: property.description || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العقار؟')) {
      await deleteProperty.mutateAsync(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة العقارات</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة جميع عقارات الوقف</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                إضافة عقار
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProperty ? 'تعديل العقار' : 'إضافة عقار جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم العقار *</Label>
                  <Input
                    value={formData.property_number}
                    onChange={(e) => setFormData({ ...formData, property_number: e.target.value })}
                    placeholder="مثال: W-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع العقار *</Label>
                  <Input
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    placeholder="شقة، محل تجاري، مبنى..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="المدينة، الحي، الشارع"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المساحة (م²) *</Label>
                  <Input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف إضافي للعقار"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 gradient-primary" disabled={createProperty.isPending || updateProperty.isPending}>
                    {editingProperty ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : properties.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد عقارات مسجلة</p>
              <p className="text-sm text-muted-foreground mt-1">ابدأ بإضافة عقار جديد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Card key={property.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{property.property_number}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(property)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(property.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{property.property_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{property.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ruler className="w-4 h-4" />
                    <span>{property.area} م²</span>
                  </div>
                  {property.description && (
                    <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                      {property.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropertiesPage;
