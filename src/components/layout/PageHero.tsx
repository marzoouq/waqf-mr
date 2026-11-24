import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PageHeroFact {
  label: string;
  /** قيمة جاهزة للعرض — المكوّن لا يحسب شيئاً */
  value: ReactNode;
  hint?: string;
}

interface PageHeroProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  facts?: PageHeroFact[];
  children?: ReactNode;
  className?: string;
}

/**
 * رأس الصفحة الوقفي الرئيسي (شريط أخضر بإطار برونزي) — عرض فقط.
 * يُستخدم في صفحات الواجهة الرئيسية بدل PageHeaderCard لإبراز ملخص الصفحة.
 */
const PageHero = ({ title, description, icon: Icon, eyebrow, actions, facts, children, className }: PageHeroProps) => (
  <section
    aria-label={title}
    className={cn('relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground waqf-frame animate-slide-up', className)}
  >
    <div className="pointer-events-none absolute inset-2 rounded-xl border border-sidebar-primary/20" aria-hidden="true" />
    <div className="relative space-y-5 p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/20 ring-1 ring-sidebar-primary/40">
              <Icon className="h-6 w-6 text-sidebar-primary" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-xs text-primary-foreground/70">{eyebrow}</p>}
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-xs text-primary-foreground/75 sm:text-sm">{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 print:hidden [&_button]:border-primary-foreground/25 [&_button]:bg-primary-foreground/10 [&_button]:text-primary-foreground [&_button:hover]:bg-primary-foreground/20 [&_button.bg-primary]:border-sidebar-primary [&_button.bg-primary]:bg-sidebar-primary [&_button.bg-primary]:text-sidebar-primary-foreground [&_button.bg-primary]:font-bold [&_button.gradient-primary]:bg-none [&_button.gradient-primary]:border-sidebar-primary [&_button.gradient-primary]:bg-sidebar-primary [&_button.gradient-primary]:text-sidebar-primary-foreground [&_button.gradient-primary]:font-bold">
            {actions}
          </div>
        )}
      </div>
      {facts && facts.length > 0 && (
        <dl className={cn('grid gap-2 sm:gap-3', facts.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : facts.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2.5 backdrop-blur-sm">
              <dt className="truncate text-[11px] text-primary-foreground/70 sm:text-xs">{f.label}</dt>
              <dd className="num mt-0.5 text-lg font-bold tabular-nums sm:text-xl">{f.value}</dd>
              {f.hint && <p className="mt-0.5 truncate text-[10px] text-primary-foreground/60">{f.hint}</p>}
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  </section>
);

export default PageHero;
