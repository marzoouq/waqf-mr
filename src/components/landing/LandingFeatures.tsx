/**
 * قسم مميزات النظام في الصفحة الرئيسية
 */
import { Building2, Users, FileText, BarChart3, Shield, Wallet } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LandingPageContent } from '@/components/settings';

const FEATURES = [
  { icon: Building2, title: 'إدارة العقارات', description: 'تسجيل ومتابعة جميع عقارات الوقف وتفاصيلها' },
  { icon: FileText, title: 'إدارة العقود', description: 'تنظيم عقود الإيجار ومتابعة المستأجرين والمدفوعات' },
  { icon: Wallet, title: 'الدخل والمصروفات', description: 'تتبع شامل لجميع المعاملات المالية والتدفقات النقدية' },
  { icon: Users, title: 'إدارة المستفيدين', description: 'توزيع الحصص ومتابعة مستحقات المستفيدين' },
  { icon: BarChart3, title: 'التقارير والإفصاحات', description: 'إعداد التقارير السنوية والحسابات الختامية بدقة' },
  { icon: Shield, title: 'أمان وخصوصية', description: 'حماية متقدمة للبيانات مع إدارة دقيقة للصلاحيات' },
];

interface LandingFeaturesProps {
  content: LandingPageContent;
}

const LandingFeatures: React.FC<LandingFeaturesProps> = ({ content }) => (
  <section id="features" className="py-20 md:py-28 relative" style={{ contain: 'layout' }}>
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
        {FEATURES.map((feature, index) => (
          <Card
            key={index}
            className="group border border-border/60 bg-card hover:shadow-card-hover transition-[transform,box-shadow] duration-500 hover:-translate-y-2 animate-fade-in rounded-2xl overflow-hidden"
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
);

export default LandingFeatures;
