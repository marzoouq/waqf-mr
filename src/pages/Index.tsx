/**
 * الصفحة الرئيسية (Landing Page) — UI only
 * المنطق مستخرج إلى useLandingPage()
 */
import { Loader2 } from 'lucide-react';
import { useLandingPage } from '@/hooks/page/shared/useLandingPage';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';

const Index = () => {
  const {
    content,
    waqfLogoUrl,
    stats,
    statsLoading,
    handleNavigateAuth,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webAppJsonLd }} />
      <LandingHero
        content={content}
        waqfLogoUrl={waqfLogoUrl}
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
