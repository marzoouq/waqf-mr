/**
 * الصفحة الرئيسية (Landing Page)
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings, useWaqfInfo } from '@/hooks/page/useAppSettings';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import type { LandingPageContent } from '@/components/settings/LandingPageTab';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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

const placeholderStats = [
  { label: 'عقار مُدار', value: '0' },
  { label: 'مستفيد', value: '0' },
  { label: 'تقرير سنوي', value: '0' },
];

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // كشف وجود جلسة سابقة لمنع وميض Landing Page قبل شاشة التحميل
  const [maybeAuthenticated] = useState(() => {
    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      return !!storageKey && !!localStorage.getItem(storageKey);
    } catch { return false; }
  });

  const { getJsonSetting } = useAppSettings();
  const content = getJsonSetting<LandingPageContent>('landing_page_content', defaultLanding);
  const { data: waqfInfo } = useWaqfInfo();

  const [roleTimeout, setRoleTimeout] = useState(false);

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

  // Fallback: إذا مرّ 5 ثوانٍ ولم يُحدد الدور، توجيه لصفحة المصادقة
  useEffect(() => {
    if (!loading && user && !role) {
      const timer = setTimeout(() => {
        logger.warn('[Index] role=null timeout after 5s, redirecting to /auth');
        setRoleTimeout(true);
        toast.error('تعذّر تحديد صلاحياتك — يرجى تسجيل الدخول مجدداً');
        navigate('/auth', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
    setRoleTimeout(false);
    return undefined;
  }, [loading, user, role, navigate]);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (error) throw error;
      const d = data as { properties: number; beneficiaries: number; fiscal_years: number };
      return [
        { label: 'عقار مُدار', value: String(d.properties ?? 0) },
        { label: 'مستفيد', value: String(d.beneficiaries ?? 0) },
        { label: 'تقرير سنوي', value: String(d.fiscal_years ?? 0) },
      ];
    },
    staleTime: STALE_STATIC,
    gcTime: 10 * 60 * 1000,
    placeholderData: placeholderStats,
  });

  const stats = statsData ?? placeholderStats;

  const handleNavigateAuth = useCallback(() => navigate('/auth'), [navigate]);

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

  // عرض skeleton للمستخدم المسجّل أثناء التحميل بدلاً من Landing Page
  if ((loading && user) || (!loading && user && !role && !roleTimeout)) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-5 w-32 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

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
