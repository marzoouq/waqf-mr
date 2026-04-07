/**
 * الصفحة الرئيسية (Landing Page)
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppSettings, useWaqfInfo, useSetting } from '@/hooks/data/settings/useAppSettings';
import { usePublicStats } from '@/hooks/data/content/usePublicStats';
import type { LandingPageContent } from '@/components/settings';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';

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

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { getJsonSetting } = useAppSettings();
  const content = getJsonSetting<LandingPageContent>('landing_page_content', defaultLanding);
  const { data: waqfInfo } = useWaqfInfo();
  const landingLogoUrl = useSetting('landing_logo_url');
  const { stats, statsLoading } = usePublicStats();

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

  // المستخدم المسجّل سيُعاد توجيهه — لا داعي لرندر Landing Page الثقيلة
  if (!loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const siteUrl = window.location.origin;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "وقف مرزوق بن علي الثبيتي",
    description: "نظام إلكتروني شامل لإدارة أوقاف مرزوق بن علي الثبيتي",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    foundingDate: "2024",
    areaServed: { "@type": "Country", name: "SA" },
    knowsAbout: ["إدارة الأوقاف", "العقارات", "توزيع الريع", "الحسابات الختامية"],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "نظام إدارة الوقف",
    description: "منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "ar",
    offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <LandingHero
        content={content}
        waqfLogoUrl={waqfInfo?.waqf_logo_url}
        stats={stats}
        statsLoading={statsLoading}
        onNavigateAuth={handleNavigateAuth}
      />
      <LandingFeatures content={content} />
      <LandingCTA content={content} onNavigateAuth={handleNavigateAuth} />
      <LandingFooter content={content} />
    </main>
  );
};

export default Index;
