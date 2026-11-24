/**
 * ركائز الحوكمة — مبادئ عامة بلا أي بيانات تشغيلية للوقف
 */
import { Scale, ShieldCheck, FileCheck2, Landmark } from 'lucide-react';
import LandingSection from './LandingSection';

const PILLARS = [
  { icon: Landmark, title: 'إنفاذ شرط الواقف', description: 'صرف الغلّة على مستحقيها وفق شرط الواقف' },
  { icon: Scale, title: 'العدل في التوزيع', description: 'قسمة الريع بالنسب المقررة لكل مستحق' },
  { icon: FileCheck2, title: 'الإفصاح للمستحقين', description: 'تقارير سنوية تصل لأصحاب الحق داخل المنصة' },
  { icon: ShieldCheck, title: 'حماية البيانات', description: 'لا تُعرض بيانات المستحقين أو المستأجرين للعموم' },
];

interface LandingPillarsProps {
  title: string;
  subtitle: string;
}

const LandingPillars = ({ title, subtitle }: LandingPillarsProps) => (
  <LandingSection id="pillars" eyebrow="ركائز الحوكمة" title={title} subtitle={subtitle} className="bg-muted/60 pattern-islamic">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {PILLARS.map(p => (
        <div key={p.title} className="relative overflow-hidden rounded-2xl bg-card border border-secondary/20 p-6">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-l from-primary to-secondary" />
          <div className="w-12 h-12 rounded-xl bg-primary grid place-items-center mb-4">
            <p.icon className="w-6 h-6 text-secondary" aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl font-bold text-primary mb-2">{p.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
        </div>
      ))}
    </div>
  </LandingSection>
);

export default LandingPillars;
