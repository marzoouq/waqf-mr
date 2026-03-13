import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { Users, Plus, Edit, Trash2, CheckCircle, XCircle, Key, Mail, Shield, UserPlus, Settings, Lock, Unlock, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManagedUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("يجب تسجيل الدخول أولاً");
  const res = await supabase.functions.invoke('admin-manage-users', {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // BUG-11 fix: استخدام useQuery بدلاً من useEffect + setState
  const { data: registrationEnabled = false } = useQuery({
    queryKey: ['registration-enabled'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .maybeSingle();
      return data?.value === 'true';
    },
  });

  const toggleRegistration = async (enabled: boolean) => {
    try {
      await callAdminApi({ action: 'toggle_registration', enabled });
      queryClient.invalidateQueries({ queryKey: ['registration-enabled'] });
      toast.success(enabled ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام');
    } catch (e: unknown) {
      toast.error(getSafeErrorMessage(e));
    }
  };

  const { data: usersResult = { users: [] as ManagedUser[], total: 0, nextPage: null as number | null }, isLoading } = useQuery({
    queryKey: ['admin-users', currentPage],
    queryFn: async () => {
      const result = await callAdminApi({ action: 'list_users', page: currentPage });
      return {
        users: result.users as ManagedUser[],
        total: (result.total as number) ?? (result.users as ManagedUser[]).length,
        nextPage: (result.nextPage as number | null) ?? null,
      };
    },
  });
  const users = usersResult.users;
  const totalUsers = usersResult.total;
  const nextPage = usersResult.nextPage;

  // تحقق وقائي: كشف المستفيدين بدون بريد أو بدون ربط بحساب مستخدم
  const { data: orphanedBeneficiaries = [] } = useQuery({
    queryKey: ['orphaned-beneficiaries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, email, user_id')
        .or('email.is.null,email.eq.,user_id.is.null');
      return data || [];
    },
  });

  const createUser = useMutation({
    mutationFn: (data: { email: string; password: string; role: string; nationalId: string; name: string }) =>
      callAdminApi({ action: 'create_user', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم إنشاء المستخدم بنجاح');
      setIsCreateOpen(false);
      setCreateForm({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  // BUG-4 fix: تتبع الـ userId قيد التنفيذ بشكل منفصل
  const confirmEmail = useMutation({
    mutationFn: async (userId: string) => {
      setPendingConfirmId(userId);
      return callAdminApi({ action: 'confirm_email', userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تفعيل البريد الإلكتروني');
      setPendingConfirmId(null);
    },
    onError: (e: Error) => {
      toast.error(getSafeErrorMessage(e));
      setPendingConfirmId(null);
    },
  });

  const updateEmail = useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث البريد الإلكتروني');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const updatePassword = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور');
      setPasswordDialog(null);
      setNewPassword('');
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const setRole = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث الدور');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  // BUG-3 fix: إغلاق الـ Dialog بعد نجاح الحذف
  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف المستخدم');
      setDeleteUserId(null);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/20 text-primary">ناظر</Badge>;
      case 'beneficiary':
        return <Badge className="bg-secondary/20 text-secondary">مستفيد</Badge>;
      case 'waqif':
        return <Badge className="bg-accent/20 text-accent-foreground">واقف</Badge>;
      case 'accountant':
        return <Badge className="bg-success/20 text-success">محاسب</Badge>;
      default:
        return <Badge variant="outline">بدون دور</Badge>;
    }
  };

  const isSelf = (userId: string) => userId === currentUser?.id;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Registration Settings Card */}
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-3">
              {registrationEnabled ? (
                <Unlock className="w-5 h-5 text-success" />
              ) : (
                <Lock className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">التسجيل العام</p>
                <p className="text-sm text-muted-foreground">
                  {registrationEnabled ? 'التسجيل مفتوح للجميع' : 'التسجيل مقفل - فقط من لوحة الناظر'}
                </p>
              </div>
            </div>
            <Switch
              checked={registrationEnabled}
              onCheckedChange={toggleRegistration}
            />
          </CardContent>
        </Card>

        <PageHeaderCard
          title="إدارة المستخدمين"
          icon={Users}
          description="إنشاء وتعديل حسابات المستخدمين وصلاحياتهم"
          actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <UserPlus className="w-4 h-4" />
                إنشاء مستخدم
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
                <DialogDescription className="sr-only">نموذج إنشاء حساب مستخدم جديد</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createUser.mutate(createForm);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@example.com"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                    dir="ltr"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهوية الوطنية</Label>
                  <Input
                    type="text"
                    value={createForm.nationalId}
                    onChange={(e) => setCreateForm({ ...createForm, nationalId: e.target.value })}
                    placeholder="1234567890"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>الدور</Label>
                  <NativeSelect value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })} options={[
                    { value: 'admin', label: 'ناظر (Admin)' },
                    { value: 'accountant', label: 'محاسب' },
                    { value: 'beneficiary', label: 'مستفيد' },
                    { value: 'waqif', label: 'واقف' },
                  ]} />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={createUser.isPending}>
                  {createUser.isPending ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </Button>
              </form>
            </DialogContent>
           </Dialog>
          }
        />

        {/* تنبيه المستفيدين بدون بريد أو بدون ربط */}
        {orphanedBeneficiaries.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>تنبيه:</strong> يوجد {orphanedBeneficiaries.length} مستفيد بدون بريد إلكتروني أو بدون ربط بحساب مستخدم.
              تسجيل الدخول بالهوية لن يعمل لهم.
              <ul className="mt-2 list-disc list-inside text-sm">
                {orphanedBeneficiaries.map((b) => (
                  <li key={b.id}>
                    {b.name} — {!b.email ? 'بدون بريد' : ''}{!b.email && !b.user_id ? ' و ' : ''}{!b.user_id ? 'غير مربوط بحساب' : ''}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Users Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              المستخدمون ({totalUsers})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {isLoading ? (
              <>
                {/* Mobile skeleton */}
                <div className="space-y-3 p-4 md:hidden">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Desktop skeleton */}
<div className="hidden md:block">
                  <TableSkeleton rows={4} cols={5} />
                </div>
              </>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {users.map((user) => (
                    <Card key={user.id} className="shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm" dir="ltr">{user.email}</span>
                              {isSelf(user.id) && <Badge variant="outline" className="text-[10px]">أنت</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getRoleBadge(user.role)}
                              {user.email_confirmed_at ? (
                                <Badge className="bg-success/20 text-success gap-1 text-[10px]">
                                  <CheckCircle className="w-3 h-3" />
                                  مفعل
                                </Badge>
                              ) : (
                                <Badge className="bg-destructive/20 text-destructive gap-1 text-[10px]">
                                  <XCircle className="w-3 h-3" />
                                  غير مفعل
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground">آخر دخول</p>
                            <p className="text-sm font-medium">
                              {user.last_sign_in_at
                                ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA')
                                : 'لم يسجل دخول'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">تاريخ الإنشاء</p>
                            <p className="text-sm font-medium">
                              {new Date(user.created_at).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-wrap pt-1 border-t">
                          {!user.email_confirmed_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-8"
                              onClick={() => confirmEmail.mutate(user.id)}
                              disabled={pendingConfirmId === user.id}
                              aria-label={`تفعيل بريد ${user.email}`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              {pendingConfirmId === user.id ? 'جاري...' : 'تفعيل'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-8"
                            onClick={() => {
                              setEditingUser(user);
                              setEditEmail(user.email);
                              setEditRole(user.role || '');
                            }}
                            aria-label={`تعديل ${user.email}`}
                          >
                            <Edit className="w-3 h-3" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-8"
                            onClick={() => setPasswordDialog(user.id)}
                            aria-label={`تغيير كلمة مرور ${user.email}`}
                          >
                            <Key className="w-3 h-3" />
                            كلمة المرور
                          </Button>
                          {!isSelf(user.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteUserId(user.id)}
                              aria-label={`حذف ${user.email}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">آخر دخول</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell dir="ltr">
                          <span className="flex items-center gap-1">
                            {user.email}
                            {isSelf(user.id) && <Badge variant="outline" className="mr-2 text-[10px]">أنت</Badge>}
                            {user.role === 'beneficiary' && orphanedBeneficiaries.some((b) => b.email === user.email || (!b.email && b.user_id === user.id)) && (
                              <span title="مستفيد بدون ربط صحيح"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /></span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.email_confirmed_at ? (
                            <Badge className="bg-success/20 text-success gap-1">
                              <CheckCircle className="w-3 h-3" />
                              مفعل
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive gap-1">
                              <XCircle className="w-3 h-3" />
                              غير مفعل
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA')
                            : 'لم يسجل دخول'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {!user.email_confirmed_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs"
                                onClick={() => confirmEmail.mutate(user.id)}
                                disabled={pendingConfirmId === user.id}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {pendingConfirmId === user.id ? 'جاري التفعيل...' : 'تفعيل'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => {
                                setEditingUser(user);
                                setEditEmail(user.email);
                                setEditRole(user.role || '');
                              }}
                            >
                              <Edit className="w-3 h-3" />
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => setPasswordDialog(user.id)}
                            >
                              <Key className="w-3 h-3" />
                              كلمة المرور
                            </Button>
                            {!isSelf(user.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs text-destructive hover:text-destructive"
                                onClick={() => setDeleteUserId(user.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </>
            )}

            {/* Pagination */}
            {(currentPage > 1 || nextPage) && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <span className="text-sm text-muted-foreground">صفحة {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!nextPage}
                  onClick={() => nextPage && setCurrentPage(nextPage)}
                >
                  التالي
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المستخدم</DialogTitle>
              <DialogDescription className="sr-only">تعديل بيانات المستخدم وصلاحياته</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  dir="ltr"
                />
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => editingUser && updateEmail.mutate({ userId: editingUser.id, email: editEmail })}
                  disabled={updateEmail.isPending}
                >
                  <Mail className="w-3 h-3" />
                  تحديث البريد
                </Button>
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <NativeSelect value={editRole} onValueChange={setEditRole} placeholder="اختر الدور" options={[
                  { value: 'admin', label: 'ناظر (Admin)' },
                  { value: 'accountant', label: 'محاسب' },
                  { value: 'beneficiary', label: 'مستفيد' },
                  { value: 'waqif', label: 'واقف' },
                ]} />
                {/* BUG-6 fix: تحذير ومنع الناظر من تغيير دوره */}
                {editingUser && isSelf(editingUser.id) && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      لا يمكنك تغيير دورك الخاص لتجنب فقدان صلاحيات الإدارة.
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => editingUser && editRole && setRole.mutate({ userId: editingUser.id, role: editRole })}
                  disabled={setRole.isPending || (editingUser ? isSelf(editingUser.id) : false)}
                >
                  <Shield className="w-3 h-3" />
                  تحديث الدور
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setNewPassword(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تغيير كلمة المرور</DialogTitle>
              <DialogDescription className="sr-only">إدخال كلمة مرور جديدة للمستخدم</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => passwordDialog && newPassword && updatePassword.mutate({ userId: passwordDialog, password: newPassword })}
                disabled={updatePassword.isPending || newPassword.length < 8}
              >
                {updatePassword.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteUserId) {
                    deleteUser.mutate(deleteUserId);
                  }
                }}
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagementPage;
