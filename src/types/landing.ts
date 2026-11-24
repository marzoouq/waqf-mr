/**
 * نوع محتوى الصفحة الرئيسية (Landing Page)
 * يُستخدم في إعدادات الناظر وعرض الصفحة العامة
 */
export interface LandingPageContent {
  hero_title: string;
  hero_subtitle: string;
  hero_tagline: string;
  cta_text: string;
  features_title: string;
  features_subtitle: string;
  testament_title: string;
  testament_text: string;
  verify_title: string;
  verify_subtitle: string;
  cta_section_title: string;
  cta_section_subtitle: string;
  footer_text: string;
  /** أقسام يتحكم الناظر بظهورها */
  show_stats: boolean;
  show_testament: boolean;
  show_pillars: boolean;
  show_verify: boolean;
  show_cta: boolean;
}

export type LandingTextKey = { [K in keyof LandingPageContent]: LandingPageContent[K] extends string ? K : never }[keyof LandingPageContent];
export type LandingToggleKey = { [K in keyof LandingPageContent]: LandingPageContent[K] extends boolean ? K : never }[keyof LandingPageContent];
