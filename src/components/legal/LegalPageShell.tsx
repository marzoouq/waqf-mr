/**
 * قشرة موحّدة للصفحات القانونية (الخصوصية / الشروط) — تمنع تكرار التخطيط.
 */
import type { LucideIcon } from 'lucide-react';
import { LegalPageFooter } from '@/components/common';
import { RouteHead } from '@/components/seo/RouteHead';

export interface LegalSection {
  title: string;
  content: string;
}

interface LegalPageShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string;
  sections: LegalSection[];
}

export function LegalPageShell({ icon: Icon, title, description, path, sections }: LegalPageShellProps) {
  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <RouteHead title={title} description={description} path={path} />
      {/* Header */}
      <div className="gradient-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center shadow-gold mb-6">
            <Icon className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {title}
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section key={section.title} className="border-b border-border/40 pb-8 last:border-0">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">
                {index + 1}. {section.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </div>
      <LegalPageFooter />
    </main>
  );
}

export default LegalPageShell;
