/**
 * useLandingPage — Page Hook لصفحة الهبوط (Index.tsx)
 *
 * يُجمّع كل منطق التحويل التلقائي حسب الدور، تجميع محتوى الهبوط،
 * إحصاءات عامة، وإعداد JSON-LD للـ SEO.
 * الصفحة تبقى UI-only تلتزم بمعيار v7.
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAppSettings, useWaqfInfo, useSetting } from '@/hooks/data/settings/useAppSettings';
import { usePublicStats } from '@/hooks/data/content/usePublicStats';
import type { LandingPageContent } from '@/types/landing';

const defaultLanding: LandingPageContent = {
  hero_title: 'نظام إدارة الوقف',
  hero_subtitle: 'منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين',
  hero_tagline: 'حفظ الأمانة · إدارة الممتلكات · توزيع عادل',
  cta_text: 'دخول النظام',
  features_title: 'مميزات النظام',
  features_subtitle: 'أدوات شاملة لإدارة الوقف بكفاءة وشفافية تامة',
  cta_section_title: 'ابدأ بإدارة وقفك بكفاءة اليوم',
  cta_section_subtitle: 'سجّل دخولك للوصول إلى لوحة التحكم وإدارة جميع جوانب الوقف',
  footer_text: 'نظام إدارة الوقف © {year} — جميع الحقوق محفوظة',
};

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
  const content = getJsonSetting<LandingPageContent>('landing_page_content', defaultLanding);
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

  // المستخدم المسجّل سيُعاد توجيهه — إشارة لرندر loader فقط
  const shouldShowRedirectLoader = !loading && !!user;

  return {
    content,
    waqfLogoUrl: landingLogoUrl || waqfInfo?.waqf_logo_url,
    stats,
    statsLoading,
    handleNavigateAuth,
    orgJsonLd,
    webAppJsonLd,
    shouldShowRedirectLoader,
  };
}
