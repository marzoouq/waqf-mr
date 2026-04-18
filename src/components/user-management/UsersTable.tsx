/**
 * جدول المستخدمين — منظِّم نحيف يجمع UserRow + UserMobileCard
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { TableSkeleton } from '@/components/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card as CardSk, CardContent as CardSkCont } from '@/components/ui/card';
import { Users, AlertTriangle } from 'lucide-react';
import type { ManagedUser } from '@/hooks/auth/useUserManagement';
import UserRow from './UserRow';
import UserMobileCard from './UserMobileCard';

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
              <CardSk key={i} className="shadow-sm">
                <CardSkCont className="p-4 space-y-3">
                  <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  </div>
                </CardSkCont>
              </CardSk>
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
              <UserMobileCard
                key={user.id}
                user={user}
                isSelf={isSelf(user.id)}
                pendingConfirmId={pendingConfirmId}
                onConfirmEmail={onConfirmEmail}
                onEdit={onEdit}
                onPasswordChange={onPasswordChange}
                onDelete={onDelete}
              />
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
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={isSelf(user.id)}
                    pendingConfirmId={pendingConfirmId}
                    isOrphaned={orphanedBeneficiaries.some((b) => b.email === user.email || (!b.email && b.user_id === user.id))}
                    onConfirmEmail={onConfirmEmail}
                    onEdit={onEdit}
                    onPasswordChange={onPasswordChange}
                    onDelete={onDelete}
                  />
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
