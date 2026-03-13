import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, BarChart3, ArrowRight, Shield, Wallet, Star, ChevronDown, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings, useWaqfInfo } from '@/hooks/useAppSettings';
import type { LandingPageContent } from '@/components/settings/LandingPageTab';

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

  useEffect(() => {
    if (!loading && user) {
      if (role === 'admin' || role === 'accountant') {
        navigate('/dashboard');
      } else if (role === 'waqif') {
        navigate('/waqif');
      } else if (role === 'beneficiary') {
        navigate('/beneficiary');
      }
    }
  }, [user, role, loading, navigate]);

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
    staleTime: 5 * 60 * 1000, // cache 5 minutes to reduce DB load
    gcTime: 10 * 60 * 1000,
  });

  const stats = statsData ?? [
    { label: 'عقار مُدار', value: '0' },
    { label: 'مستفيد', value: '0' },
    { label: 'تقرير سنوي', value: '0' },
  ];

  const features = [
    { icon: Building2, title: 'إدارة العقارات', description: 'تسجيل ومتابعة جميع عقارات الوقف وتفاصيلها' },
    { icon: FileText, title: 'إدارة العقود', description: 'تنظيم عقود الإيجار ومتابعة المستأجرين والمدفوعات' },
    { icon: Wallet, title: 'الدخل والمصروفات', description: 'تتبع شامل لجميع المعاملات المالية والتدفقات النقدية' },
    { icon: Users, title: 'إدارة المستفيدين', description: 'توزيع الحصص ومتابعة مستحقات المستفيدين' },
    { icon: BarChart3, title: 'التقارير والإفصاحات', description: 'إعداد التقارير السنوية والحسابات الختامية بدقة' },
    { icon: Shield, title: 'أمان وخصوصية', description: 'حماية متقدمة للبيانات مع إدارة دقيقة للصلاحيات' },
  ];

  const siteUrl = window.location.origin;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "وقف مرزوق بن علي الثبيتي",
    description: "نظام إلكتروني شامل لإدارة أوقاف مرزوق بن علي الثبيتي - إدارة العقارات والعقود والحسابات الختامية والإفصاحات السنوية",
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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "SAR",
    },
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <header className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center" role="banner">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
            <defs>
              <pattern id="islamicPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M60 0L120 60L60 120L0 60Z" fill="none" stroke="#d4af37" strokeWidth="0.8"/>
                <path d="M60 15L105 60L60 105L15 60Z" fill="none" stroke="#d4af37" strokeWidth="0.5"/>
                <path d="M60 30L90 60L60 90L30 60Z" fill="none" stroke="#d4af37" strokeWidth="0.4"/>
                <circle cx="60" cy="60" r="10" fill="none" stroke="#d4af37" strokeWidth="0.4"/>
                <circle cx="60" cy="60" r="4" fill="none" stroke="#d4af37" strokeWidth="0.3"/>
                <line x1="60" y1="0" x2="60" y2="120" stroke="#d4af37" strokeWidth="0.2"/>
                <line x1="0" y1="60" x2="120" y2="60" stroke="#d4af37" strokeWidth="0.2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#islamicPattern)"/>
          </svg>
        </div>
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-secondary/5 blur-3xl -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-secondary/8 blur-3xl translate-x-1/3 translate-y-1/3" aria-hidden="true" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-10">
              {waqfInfo?.waqf_logo_url ? (
                <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-gold animate-glow mb-8 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <img src={waqfInfo.waqf_logo_url} alt="شعار الوقف" className="w-20 h-20 object-contain" loading="eager" fetchPriority="high" />
                </div>
              ) : (
                <div className="mx-auto w-24 h-24 gradient-gold rounded-3xl flex items-center justify-center shadow-gold animate-glow mb-8">
                  <Building2 className="w-12 h-12 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-16 bg-gradient-to-l from-secondary/60 to-transparent" />
                <Star className="w-4 h-4 text-secondary fill-secondary/30" />
                <div className="h-px w-16 bg-gradient-to-r from-secondary/60 to-transparent" />
              </div>
              <h1 className="font-arabic text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                {content.hero_title}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed font-arabic">
                {content.hero_subtitle}
              </p>
              <p className="text-sm md:text-base text-secondary mb-10 font-arabic font-medium">
                {content.hero_tagline}
              </p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button
                onClick={() => navigate('/auth')}
                size="lg"
                className="gradient-gold text-primary-foreground gap-3 shadow-gold hover:scale-105 transition-all duration-300 text-lg px-10 py-6 rounded-2xl font-bold"
              >
                <ArrowLeft className="w-5 h-5" />
                {content.cta_text}
              </Button>
            </div>
            <div className="mt-16 flex justify-center gap-8 md:gap-16 animate-fade-in" style={{ animationDelay: '500ms' }}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  {statsLoading ? (
                    <Skeleton className="h-10 w-16 mx-auto mb-1 bg-white/20" />
                  ) : (
                    <div className="text-3xl md:text-4xl font-bold text-gradient-gold font-display">{stat.value}</div>
                  )}
                  <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>
      </header>
      <section className="py-20 md:py-28 relative" style={{ contain: 'layout' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <div className="ornament-divider mb-6">
              <span className="bg-background px-6 text-secondary font-display text-lg">✦</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              {content.features_title}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              {content.features_subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group border border-border/60 bg-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 animate-fade-in rounded-2xl overflow-hidden"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <CardHeader className="p-6 md:p-8">
                  <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg font-bold text-card-foreground mb-2">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 gradient-primary pattern-islamic relative overflow-hidden" aria-label="دعوة للبدء">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/20" aria-hidden="true" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            {content.cta_section_title}
          </h3>
          <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
            {content.cta_section_subtitle}
          </p>
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="gradient-gold text-primary-foreground gap-2 shadow-gold hover:scale-105 transition-all duration-300 rounded-xl font-bold px-8"
          >
            <ArrowRight className="w-5 h-5" />
            {content.cta_text}
          </Button>
        </div>
      </section>
      <footer className="bg-primary py-8 border-t border-primary-foreground/10" role="contentinfo">
        <div className="container mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
            <button onClick={() => navigate('/privacy')} className="text-primary-foreground/70 hover:text-secondary transition-colors">
              سياسة الخصوصية
            </button>
            <span className="text-primary-foreground/30">|</span>
            <button onClick={() => navigate('/terms')} className="text-primary-foreground/70 hover:text-secondary transition-colors">
              شروط الاستخدام
            </button>
            <span className="text-primary-foreground/30">|</span>
            <button onClick={() => navigate('/install')} className="text-primary-foreground/70 hover:text-secondary transition-colors inline-flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              تثبيت التطبيق
            </button>
          </div>
          <p className="text-primary-foreground/60 text-sm">
            {content.footer_text.replace('{year}', String(new Date().getFullYear()))}
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;