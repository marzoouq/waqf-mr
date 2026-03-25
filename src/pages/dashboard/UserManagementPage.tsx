/**
 * صفحة إدارة المستخدمين — مُفكّكة إلى hook + مكونات فرعية
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Lock, Unlock, AlertTriangle, Search } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useUserManagement } from '@/hooks/auth/useUserManagement';
import UsersTable from '@/components/user-management/UsersTable';
import CreateUserForm from '@/components/user-management/CreateUserForm';
import { UserEditDialog, UserPasswordDialog, UserDeleteDialog } from '@/components/user-management/UserDialogs';

const UserManagementPage = () => {
  const mgmt = useUserManagement();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* إعداد التسجيل العام */}
        <Card className="shadow-xs border-dashed">
          <CardContent className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-3">
              {mgmt.registrationEnabled ? <Unlock className="w-5 h-5 text-success" /> : <Lock className="w-5 h-5 text-destructive" />}
              <div>
                <p className="font-medium">التسجيل العام</p>
                <p className="text-sm text-muted-foreground">
                  {mgmt.registrationEnabled ? 'التسجيل مفتوح للجميع' : 'التسجيل مقفل - فقط من لوحة الناظر'}
                </p>
              </div>
            </div>
            <Switch checked={mgmt.registrationEnabled} onCheckedChange={mgmt.toggleRegistration} disabled={mgmt.toggling} />
          </CardContent>
        </Card>

        <PageHeaderCard
          title="إدارة المستخدمين"
          icon={Users}
          description="إنشاء وتعديل حسابات المستخدمين وصلاحياتهم"
          actions={
            <CreateUserForm
              open={mgmt.isCreateOpen}
              onOpenChange={mgmt.setIsCreateOpen}
              form={mgmt.createForm}
              setForm={mgmt.setCreateForm}
              onSubmit={(data) => mgmt.createUser.mutate(data)}
              isPending={mgmt.createUser.isPending}
            />
          }
        />

        {/* تنبيه المستفيدين غير المربوطين */}
        {mgmt.orphanedBeneficiaries.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>تنبيه:</strong> يوجد {mgmt.orphanedBeneficiaries.length} مستفيد بدون بريد إلكتروني أو بدون ربط بحساب مستخدم.
              تسجيل الدخول بالهوية لن يعمل لهم.
              <ul className="mt-2 list-disc list-inside text-sm">
                {mgmt.orphanedBeneficiaries.map((b) => (
                  <li key={b.id}>
                    {b.name} — {!b.email ? 'بدون بريد' : ''}{!b.email && !b.user_id ? ' و ' : ''}{!b.user_id ? 'غير مربوط بحساب' : ''}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* شريط البحث والفلاتر */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالبريد الإلكتروني..." value={mgmt.userSearch} onChange={(e) => mgmt.setUserSearch(e.target.value)} className="pr-10" dir="ltr" />
          </div>
          <NativeSelect
            value={mgmt.roleFilter}
            onValueChange={mgmt.setRoleFilter}
            options={[
              { value: 'all', label: 'كل الأدوار' },
              { value: 'admin', label: 'ناظر' },
              { value: 'accountant', label: 'محاسب' },
              { value: 'beneficiary', label: 'مستفيد' },
              { value: 'waqif', label: 'واقف' },
              { value: 'none', label: 'بدون دور' },
            ]}
          />
          <NativeSelect
            value={mgmt.statusFilterUser}
            onValueChange={mgmt.setStatusFilterUser}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'confirmed', label: 'مفعّل' },
              { value: 'unconfirmed', label: 'غير مفعّل' },
            ]}
          />
        </div>

        {/* جدول المستخدمين */}
        <UsersTable
          users={mgmt.users}
          totalUsers={mgmt.totalUsers}
          nextPage={mgmt.nextPage}
          currentPage={mgmt.currentPage}
          setCurrentPage={mgmt.setCurrentPage}
          isLoading={mgmt.isLoading}
          isError={mgmt.isError}
          error={mgmt.error}
          pendingConfirmId={mgmt.pendingConfirmId}
          orphanedBeneficiaries={mgmt.orphanedBeneficiaries}
          isSelf={mgmt.isSelf}
          onConfirmEmail={(id) => mgmt.confirmEmail.mutate(id)}
          onEdit={(user) => {
            mgmt.setEditingUser(user);
            mgmt.setEditEmail(user.email);
            mgmt.setEditRole(user.role || '');
          }}
          onPasswordChange={(id) => mgmt.setPasswordDialog(id)}
          onDelete={(user) => mgmt.setDeleteTarget(user)}
          onRetry={() => mgmt.queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />

        {/* حوارات */}
        <UserEditDialog
          editingUser={mgmt.editingUser}
          onClose={() => mgmt.setEditingUser(null)}
          editEmail={mgmt.editEmail}
          setEditEmail={mgmt.setEditEmail}
          editRole={mgmt.editRole}
          setEditRole={mgmt.setEditRole}
          onUpdateEmail={(data) => mgmt.updateEmail.mutate(data)}
          onSetRole={(data) => mgmt.setRole.mutate(data)}
          isEmailPending={mgmt.updateEmail.isPending}
          isRolePending={mgmt.setRole.isPending}
          isSelf={mgmt.isSelf}
          unlinkedBeneficiaries={mgmt.unlinkedBeneficiaries}
          onLinkBeneficiary={(data) => mgmt.linkBeneficiary.mutate(data)}
        />

        <UserPasswordDialog
          open={!!mgmt.passwordDialog}
          onClose={() => { mgmt.setPasswordDialog(null); mgmt.setNewPassword(''); mgmt.setShowPassword(false); }}
          passwordDialog={mgmt.passwordDialog}
          newPassword={mgmt.newPassword}
          setNewPassword={mgmt.setNewPassword}
          showPassword={mgmt.showPassword}
          setShowPassword={mgmt.setShowPassword}
          onSubmit={(data) => mgmt.updatePassword.mutate(data)}
          isPending={mgmt.updatePassword.isPending}
        />

        <UserDeleteDialog
          deleteTarget={mgmt.deleteTarget}
          onClose={() => mgmt.setDeleteTarget(null)}
          onDelete={(id) => mgmt.deleteUser.mutate(id)}
        />
      </div>
    </DashboardLayout>
  );
};

export default UserManagementPage;
