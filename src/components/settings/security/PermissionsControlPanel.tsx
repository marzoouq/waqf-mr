/**
 * لوحة إدارة الصلاحيات الموحدة — presentational orchestrator
 */
import { ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS } from '@/constants/sections';
import { BENEFICIARY_WIDGET_KEYS, BENEFICIARY_WIDGET_LABELS } from '@/constants/beneficiaryWidgets';
import AdminCapabilitiesSummary from './AdminCapabilitiesSummary';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PermissionsSummaryCards,
  RolePermissionsMatrix,
  SectionVisibilityCard,
  PermissionsActionBar,
} from '../permissions';
import { usePermissionsControlPanel, PERMISSIONS_ROLES } from '@/hooks/page/admin/settings/usePermissionsControlPanel';

const PermissionsControlPanel = () => {
  const {
    perms, adminSections, beneficiarySections, widgets, notifSettings, saving, isLoading, summaries,
    toggleRolePerm, selectAllForRole, toggleAdminSection, toggleBeneficiarySection, toggleWidget,
    toggleNotifyExpiry, toggleNotifyExpired, handleSave, handleReset,
  } = usePermissionsControlPanel();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <AdminCapabilitiesSummary />
      <PermissionsSummaryCards summaries={summaries} />
      <RolePermissionsMatrix roles={PERMISSIONS_ROLES} perms={perms} onToggle={toggleRolePerm} onSelectAll={selectAllForRole} />
      <SectionVisibilityCard
        title="أقسام لوحة التحكم"
        description="إظهار/إخفاء أقسام من القائمة الجانبية للناظر والمحاسب"
        sectionKeys={ADMIN_SECTION_KEYS}
        values={adminSections}
        onToggle={toggleAdminSection}
      />
      <SectionVisibilityCard
        title="أقسام واجهة المستفيد"
        description="التحكم بالأقسام الظاهرة للمستفيدين والواقف"
        sectionKeys={BENEFICIARY_SECTION_KEYS}
        values={beneficiarySections}
        onToggle={toggleBeneficiarySection}
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">عناصر لوحة المستفيد</CardTitle>
          <CardDescription>التحكم بإظهار/إخفاء بطاقات وعناصر الصفحة الرئيسية للمستفيد</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFICIARY_WIDGET_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
              <Checkbox checked={widgets[key] ?? true} onCheckedChange={() => toggleWidget(key)} />
              <span className="text-sm">{BENEFICIARY_WIDGET_LABELS[key]}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">إشعارات المستفيدين</CardTitle>
          <CardDescription>
            تحكّم بإرسال إشعارات العقود إلى المستفيدين. الناظر يستمر باستلامها دائماً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-start gap-2 py-2 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
            <Checkbox
              checked={notifSettings.notify_beneficiary_contract_expiry}
              onCheckedChange={toggleNotifyExpiry}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">إشعار المستفيدين عند اقتراب انتهاء العقد</span>
              <p className="text-xs text-muted-foreground">يُفضّل إيقافه لأن المستفيد لا يملك صلاحية التجديد.</p>
            </div>
          </label>
          <label className="flex items-start gap-2 py-2 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
            <Checkbox
              checked={notifSettings.notify_beneficiary_expired_contracts}
              onCheckedChange={toggleNotifyExpired}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">تذكير أسبوعي للمستفيدين بالعقود المنتهية</span>
              <p className="text-xs text-muted-foreground">يُرسل أيام الأحد فقط عند وجود عقود منتهية.</p>
            </div>
          </label>
        </CardContent>
      </Card>
      <PermissionsActionBar saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  );
};

export default PermissionsControlPanel;
