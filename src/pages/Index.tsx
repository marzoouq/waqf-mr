import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, BarChart3, ArrowLeft, Shield, Wallet, Star, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState([
    { label: 'عقار مُدار', value: '...' },
    { label: 'مستفيد', value: '...' },
    { label: 'تقرير سنوي', value: '...' },
  ]);

  useEffect(() => {
    if (!loading && user) {
      if (role === 'admin') {
        navigate('/dashboard');
      } else if (role === 'beneficiary' || role === 'waqif') {
        navigate('/beneficiary');
      }
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (!error && data) {
        const d = data as { properties: number; beneficiaries: number; fiscal_years: number };
        setStats([
          { label: 'عقار مُدار', value: String(d.properties ?? 0) },
          { label: 'مستفيد', value: String(d.beneficiaries ?? 0) },
          { label: 'تقرير سنوي', value: String(d.fiscal_years ?? 0) },
        ]);
      }
    };
    fetchStats();
  }, []);

  const features = [
    { icon: Building2, title: 'إدارة العقارات', description: 'تسجيل ومتابعة جميع عقارات الوقف وتفاصيلها' },
    { icon: FileText, title: 'إدارة العقود', description: 'تنظيم عقود الإيجار ومتابعة المستأجرين والمدفوعات' },
    { icon: Wallet, title: 'الدخل والمصروفات', description: 'تتبع شامل لجميع المعاملات المالية والتدفقات النقدية' },
    { icon: Users, title: 'إدارة المستفيدين', description: 'توزيع الحصص ومتابعة مستحقات المستفيدين' },
    { icon: BarChart3, title: 'التقارير والإفصاحات', description: 'إعداد التقارير السنوية والحسابات الختامية بدقة' },
    { icon: Shield, title: 'أمان وخصوصية', description: 'حماية متقدمة للبيانات مع إدارة دقيقة للصلاحيات' },
  ];


  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "وقف مرزوق بن علي الثبيتي",
    description: "نظام إلكتروني شامل لإدارة أوقاف مرزوق بن علي الثبيتي - إدارة العقارات والعقود والحسابات الختامية والإفصاحات السنوية",
    url: "https://waqf-mr.lovable.app",
    logo: "https://waqf-mr.lovable.app/favicon.ico",
    foundingDate: "1446",
    areaServed: { "@type": "Country", name: "SA" },
    knowsAbout: ["إدارة الأوقاف", "العقارات", "توزيع الريع", "الحسابات الختامية"],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "نظام إدارة الوقف",
    description: "منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين",
    url: "https://waqf-mr.lovable.app",
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
    <main className="min-h-screen bg-background">
      {/* SEO: JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      {/* Hero Section */}
      <header className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center" role="banner">
        {/* Islamic geometric SVG decoration */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
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
        {/* Decorative glows */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-secondary/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-secondary/8 blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="animate-slide-up mb-10">
              <div className="mx-auto w-24 h-24 gradient-gold rounded-3xl flex items-center justify-center shadow-gold animate-glow mb-8">
                <Building2 className="w-12 h-12 text-primary-foreground" />
              </div>
              
              {/* Ornamental divider */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-16 bg-gradient-to-l from-secondary/60 to-transparent" />
                <Star className="w-4 h-4 text-secondary fill-secondary/30" />
                <div className="h-px w-16 bg-gradient-to-r from-secondary/60 to-transparent" />
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                نظام إدارة الوقف
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed font-arabic">
                منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين
              </p>
              <p className="text-sm md:text-base text-secondary mb-10 font-arabic font-medium">
                حفظ الأمانة · إدارة الممتلكات · توزيع عادل
              </p>
            </div>

            {/* CTA Button */}
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button
                onClick={() => navigate('/auth')}
                size="lg"
                className="gradient-gold text-primary-foreground gap-3 shadow-gold hover:scale-105 transition-all duration-300 text-lg px-10 py-6 rounded-2xl font-bold"
              >
                <ArrowLeft className="w-5 h-5" />
                دخول النظام
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 flex justify-center gap-8 md:gap-16 animate-fade-in" style={{ animationDelay: '500ms' }}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gradient-gold font-display">{stat.value}</div>
                  <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 md:py-28 relative">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-16 animate-slide-up">
            <div className="ornament-divider mb-6">
              <span className="bg-background px-6 text-secondary font-display text-lg">✦</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              مميزات النظام
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              أدوات شاملة لإدارة الوقف بكفاءة وشفافية تامة
            </p>
          </div>

          {/* Features grid */}
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

      {/* CTA Section */}
      <section className="py-16 gradient-primary pattern-islamic relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/20" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            ابدأ بإدارة وقفك بكفاءة اليوم
          </h3>
          <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
            سجّل دخولك للوصول إلى لوحة التحكم وإدارة جميع جوانب الوقف
          </p>
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="gradient-gold text-primary-foreground gap-2 shadow-gold hover:scale-105 transition-all duration-300 rounded-xl font-bold px-8"
          >
            <ArrowLeft className="w-5 h-5" />
            دخول النظام
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8 border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-4 text-sm">
            <button onClick={() => navigate('/privacy')} className="text-primary-foreground/70 hover:text-secondary transition-colors">
              سياسة الخصوصية
            </button>
            <span className="text-primary-foreground/30">|</span>
            <button onClick={() => navigate('/terms')} className="text-primary-foreground/70 hover:text-secondary transition-colors">
              شروط الاستخدام
            </button>
          </div>
          <p className="text-primary-foreground/60 text-sm">
            نظام إدارة الوقف © {new Date().getFullYear()} — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
