/**
 * الصفحة الرئيسية (Landing Page) — UI only
 * المنطق مستخرج إلى useLandingPage()
 */
import { Loader2 } from 'lucide-react';
import { useLandingPage } from '@/hooks/application/useLandingPage';
import LandingHero from '@/components/landing/LandingHero';
import LandingNav from '@/components/landing/LandingNav';
import LandingTestament from '@/components/landing/LandingTestament';
import LandingPillars from '@/components/landing/LandingPillars';
import LandingVerify from '@/components/landing/LandingVerify';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import { RouteHead } from '@/components/seo/RouteHead';

const Index = () => {
  const {
    content,
    waqfLogoUrl,
    stats,
    statsLoading,
    handleNavigateAuth,
    handleVerify,
    waqfName,
    navLinks,
    orgJsonLd,
    webAppJsonLd,
    shouldShowRedirectLoader,
  } = useLandingPage();

  if (shouldShowRedirectLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <RouteHead
        title="نظام إدارة الوقف | وقف مرزوق بن علي الثبيتي"
        description="المنصة الرسمية لنظارة وقف مرزوق بن علي الثبيتي: حفظ الأصول وإنفاذ شرط الواقف والإفصاح للمستحقين."
        path="/"
        jsonLd={[orgJsonLd, webAppJsonLd]}
      />
      <LandingNav waqfName={waqfName} waqfLogoUrl={waqfLogoUrl} ctaText={content.cta_text} links={navLinks} onNavigateAuth={handleNavigateAuth} />
      <LandingHero
        content={content}
        waqfLogoUrl={waqfLogoUrl}
        stats={stats}
        statsLoading={statsLoading}
        onNavigateAuth={handleNavigateAuth}
      />
      {content.show_testament && <LandingTestament title={content.testament_title} text={content.testament_text} />}
      {content.show_pillars && <LandingPillars title={content.features_title} subtitle={content.features_subtitle} />}
      {content.show_verify && <LandingVerify title={content.verify_title} subtitle={content.verify_subtitle} onVerify={handleVerify} />}
      {content.show_cta && <LandingCTA content={content} onNavigateAuth={handleNavigateAuth} />}
      <LandingFooter content={content} />
    </main>
  );
};

export default Index;
