/**
 * مكون الشريط الجانبي (Sidebar) — حاوية ضوء تجمع الأجزاء العرضية الثلاثة.
 * - SidebarBrand: الشعار وأزرار التبديل
 * - SidebarNavList: قائمة الروابط
 * - SidebarUserFooter: معلومات المستخدم + خروج
 */
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { SidebarBrand } from './sidebar/SidebarBrand';
import { SidebarNavList, type NavLinkItem, type NavGroupItem } from './sidebar/SidebarNavList';
import { SidebarUserFooter } from './sidebar/SidebarUserFooter';

interface SidebarContentProps {
  links: NavLinkItem[] & { groups?: NavGroupItem[] };
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  onSignOut: () => void;
  unreadCount?: number;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  links, sidebarOpen, setSidebarOpen, setMobileSidebarOpen, onSignOut, unreadCount = 0,
}) => {
  const { user, role } = useAuth();
  const waqfName = useSetting('waqf_name', 'إدارة الوقف');
  const waqfLogoUrl = useSetting('waqf_logo_url');

  return (
    <>
      <SidebarBrand
        waqfName={waqfName}
        waqfLogoUrl={waqfLogoUrl}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <SidebarNavList
        links={links}
        sidebarOpen={sidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        unreadCount={unreadCount}
      />
      <SidebarUserFooter
        email={user?.email}
        role={role}
        sidebarOpen={sidebarOpen}
        onSignOut={onSignOut}
      />
    </>
  );
};

export default SidebarContent;
