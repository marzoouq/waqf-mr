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
  <LandingSection id="pillars" title={title} subtitle={subtitle} className="bg-muted/40">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {PILLARS.map(p => (
        <div key={p.title} className="rounded-2xl bg-card border border-border border-t-4 border-t-secondary p-6">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
            <p.icon className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold mb-2">{p.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
        </div>
      ))}
    </div>
  </LandingSection>
);

export default LandingPillars;
