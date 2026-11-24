/**
 * useLandingPage — Page Hook لصفحة الهبوط (Index.tsx)
 *
 * يُجمّع كل منطق التحويل التلقائي حسب الدور، تجميع محتوى الهبوط،
 * إحصاءات عامة، وإعداد JSON-LD للـ SEO.
 * الصفحة تبقى UI-only تلتزم بمعيار v7.
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useAppSettings, useWaqfInfo, useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { usePublicStats } from '@/hooks/data/content/usePublicStats';
import type { LandingPageContent } from '@/types/landing';
import { LANDING_DEFAULTS, withLandingDefaults } from '@/constants/landingDefaults';


/** تهريب JSON-LD ضد XSS — JSON.stringify لا يهرّب </script> */
function safeJsonLdString(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function useLandingPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { getJsonSetting } = useAppSettings();
  const saved = getJsonSetting<Partial<LandingPageContent>>('landing_page_content', LANDING_DEFAULTS);
  // تثبيت المرجع حتى لا يُعاد ضبط النموذج في كل رسم
  const savedKey = JSON.stringify(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(() => withLandingDefaults(saved), [savedKey]);
  const { data: waqfInfo } = useWaqfInfo();
  const landingLogoUrl = useSetting('landing_logo_url');
  const { stats, statsLoading } = usePublicStats();

  // إعادة توجيه تلقائية حسب الدور
  useEffect(() => {
    if (!loading && user) {
      if (role === 'admin' || role === 'accountant') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'waqif') {
        navigate('/waqif', { replace: true });
      } else if (role === 'beneficiary') {
        navigate('/beneficiary', { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  const handleNavigateAuth = useCallback(() => navigate('/auth'), [navigate]);
  const handleVerify = useCallback((code: string) => navigate(`/verify/document/${encodeURIComponent(code)}`), [navigate]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const waqfName = waqfInfo?.waqf_name ?? 'نظام إدارة الوقف';

  const orgJsonLd = useMemo(() => safeJsonLdString({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: waqfName,
    description: `نظام إلكتروني شامل لإدارة أوقاف ${waqfName}`,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    foundingDate: '2024',
    areaServed: { '@type': 'Country', name: 'SA' },
    knowsAbout: ['إدارة الأوقاف', 'العقارات', 'توزيع الريع', 'الحسابات الختامية'],
  }), [waqfName, siteUrl]);

  const webAppJsonLd = useMemo(() => safeJsonLdString({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: waqfName,
    description: 'منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين',
    url: siteUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'ar',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  }), [waqfName, siteUrl]);

  const navLinks = useMemo(() => [
    content.show_testament && { href: '#testament', label: content.testament_title },
    content.show_pillars && { href: '#pillars', label: content.features_title },
    content.show_verify && { href: '#verify', label: content.verify_title },
  ].filter((l): l is { href: string; label: string } => Boolean(l)), [content]);

  // المستخدم المسجّل سيُعاد توجيهه — إشارة لرندر loader فقط
  const shouldShowRedirectLoader = !loading && !!user;

  return {
    content,
    waqfLogoUrl: landingLogoUrl || waqfInfo?.waqf_logo_url,
    stats: content.show_stats ? stats : [],
    statsLoading,
    handleNavigateAuth,
    handleVerify,
    waqfName,
    navLinks,
    orgJsonLd,
    webAppJsonLd,
    shouldShowRedirectLoader,
  };
}
