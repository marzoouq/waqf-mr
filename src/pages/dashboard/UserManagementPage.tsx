import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, CheckCircle, XCircle, Key, Mail, Shield, UserPlus, Settings, Lock, Unlock } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const res = await supabase.functions.invoke('admin-manage-users', {
    body,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Fetch registration setting
  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .single();
      if (data) setRegistrationEnabled(data.value === 'true');
    };
    fetchSetting();
  }, []);

  const toggleRegistration = async (enabled: boolean) => {
    try {
      await callAdminApi({ action: 'toggle_registration', enabled });
      setRegistrationEnabled(enabled);
      toast.success(enabled ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام');
    } catch (e: unknown) {
      toast.error('خطأ: ' + (e instanceof Error ? e.message : 'حدث خطأ غير متوقع'));
    }
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = await callAdminApi({ action: 'list_users' });
      return result.users as ManagedUser[];
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
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const confirmEmail = useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'confirm_email', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تفعيل البريد الإلكتروني');
    },
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const updateEmail = useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث البريد الإلكتروني');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const updatePassword = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور');
      setPasswordDialog(null);
      setNewPassword('');
    },
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const setRole = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث الدور');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف المستخدم');
    },
    onError: (e: Error) => toast.error('خطأ: ' + e.message),
  });

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/20 text-primary">ناظر</Badge>;
      case 'beneficiary':
        return <Badge className="bg-secondary/20 text-secondary">مستفيد</Badge>;
      case 'waqif':
        return <Badge className="bg-accent/20 text-accent-foreground">واقف</Badge>;
      default:
        return <Badge variant="outline">بدون دور</Badge>;
    }
  };

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">إنشاء وتعديل حسابات المستخدمين وصلاحياتهم</p>
          </div>
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
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">ناظر (Admin)</SelectItem>
                      <SelectItem value="beneficiary">مستفيد</SelectItem>
                      <SelectItem value="waqif">واقف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={createUser.isPending}>
                  {createUser.isPending ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              المستخدمون ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : (
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
                      <TableCell dir="ltr">{user.email}</TableCell>
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
                              disabled={confirmEmail.isPending}
                            >
                              <CheckCircle className="w-3 h-3" />
                              تفعيل
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المستخدم</DialogTitle>
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
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">ناظر (Admin)</SelectItem>
                    <SelectItem value="beneficiary">مستفيد</SelectItem>
                    <SelectItem value="waqif">واقف</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => editingUser && editRole && setRole.mutate({ userId: editingUser.id, role: editRole })}
                  disabled={setRole.isPending}
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
                disabled={updatePassword.isPending || newPassword.length < 6}
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
                    setDeleteUserId(null);
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
