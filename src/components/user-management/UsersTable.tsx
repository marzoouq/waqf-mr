/**
 * جدول المستخدمين — عرض واحد حسب الشاشة (viewport-aware)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Edit, Trash2, CheckCircle, XCircle, Key, AlertTriangle } from 'lucide-react';
import type { ManagedUser } from '@/hooks/auth/useUserManagement';
import { useIsDesktop } from '@/hooks/ui/useIsDesktop';

const getRoleBadge = (role: string | null) => {
  switch (role) {
    case 'admin': return <Badge className="bg-primary/20 text-primary">ناظر</Badge>;
    case 'beneficiary': return <Badge className="bg-secondary/20 text-secondary">مستفيد</Badge>;
    case 'waqif': return <Badge className="bg-accent/20 text-accent-foreground">واقف</Badge>;
    case 'accountant': return <Badge className="bg-success/20 text-success">محاسب</Badge>;
    default: return <Badge variant="outline">بدون دور</Badge>;
  }
};

interface Props {
  users: ManagedUser[];
  totalUsers: number;
  nextPage: number | null;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pendingConfirmId: string | null;
  orphanedBeneficiaries: { id: string; email: string | null; user_id: string | null }[];
  isSelf: (id: string) => boolean;
  onConfirmEmail: (userId: string) => void;
  onEdit: (user: ManagedUser) => void;
  onPasswordChange: (userId: string) => void;
  onDelete: (user: { id: string; email: string }) => void;
  onRetry: () => void;
}

const UsersTable = ({
  users, totalUsers, nextPage, currentPage, setCurrentPage,
  isLoading, isError, error, pendingConfirmId, orphanedBeneficiaries,
  isSelf, onConfirmEmail, onEdit, onPasswordChange, onDelete, onRetry,
}: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        المستخدمون ({users.length}{users.length !== totalUsers ? ` من ${totalUsers}` : ''})
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6">
      {isLoading ? (
        <>
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
          <div className="hidden md:block"><TableSkeleton rows={4} cols={5} /></div>
        </>
      ) : isError ? (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              تعذّر تحميل قائمة المستخدمين: {error instanceof Error ? error.message : 'خطأ غير متوقع'}
              <Button variant="outline" size="sm" className="mr-3" onClick={onRetry}>إعادة المحاولة</Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 p-4 md:hidden">
            {users.map((user) => (
              <Card key={user.id} className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" dir="ltr">{user.email}</span>
                        {isSelf(user.id) && <Badge variant="outline" className="text-xs">أنت</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(user.role)}
                        {user.email_confirmed_at ? (
                          <Badge className="bg-success/20 text-success gap-1 text-xs"><CheckCircle className="w-3 h-3" />مفعل</Badge>
                        ) : (
                          <Badge className="bg-destructive/20 text-destructive gap-1 text-xs"><XCircle className="w-3 h-3" />غير مفعل</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-[11px] text-muted-foreground">آخر دخول</p>
                      <p className="text-sm font-medium">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' }) : 'لم يسجل دخول'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">تاريخ الإنشاء</p>
                      <p className="text-sm font-medium">{new Date(user.created_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap pt-1 border-t">
                    {!user.email_confirmed_at && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onConfirmEmail(user.id)} disabled={pendingConfirmId === user.id}>
                        <CheckCircle className="w-3 h-3" />{pendingConfirmId === user.id ? 'جاري...' : 'تفعيل'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onEdit(user)}><Edit className="w-3 h-3" />تعديل</Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onPasswordChange(user.id)}><Key className="w-3 h-3" />كلمة المرور</Button>
                    {!isSelf(user.id) && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: user.id, email: user.email })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop */}
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
                        {isSelf(user.id) && <Badge variant="outline" className="mr-2 text-xs">أنت</Badge>}
                        {user.role === 'beneficiary' && orphanedBeneficiaries.some((b) => b.email === user.email || (!b.email && b.user_id === user.id)) && (
                          <span title="مستفيد بدون ربط صحيح"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /></span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.email_confirmed_at ? (
                        <Badge className="bg-success/20 text-success gap-1"><CheckCircle className="w-3 h-3" />مفعل</Badge>
                      ) : (
                        <Badge className="bg-destructive/20 text-destructive gap-1"><XCircle className="w-3 h-3" />غير مفعل</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' }) : 'لم يسجل دخول'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {!user.email_confirmed_at && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onConfirmEmail(user.id)} disabled={pendingConfirmId === user.id}>
                            <CheckCircle className="w-3 h-3" />{pendingConfirmId === user.id ? 'جاري التفعيل...' : 'تفعيل'}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onEdit(user)}><Edit className="w-3 h-3" />تعديل</Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onPasswordChange(user.id)}><Key className="w-3 h-3" />كلمة المرور</Button>
                        {!isSelf(user.id) && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => onDelete({ id: user.id, email: user.email })}>
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
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p: number) => p - 1)}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {currentPage}</span>
          <Button variant="outline" size="sm" disabled={!nextPage} onClick={() => nextPage && setCurrentPage(nextPage)}>التالي</Button>
        </div>
      )}
    </CardContent>
  </Card>
);

export default UsersTable;
