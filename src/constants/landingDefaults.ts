/**
 * المحتوى الافتراضي لصفحة الهبوط — مصدر واحد للعرض والإعدادات.
 * الأرقام التشغيلية مخفية افتراضياً (show_stats=false): الواجهة العامة تعريفية لا تكشف بيانات الوقف.
 */
import type { LandingPageContent } from '@/types/landing';

export const LANDING_DEFAULTS: LandingPageContent = {
  hero_title: 'وقف مرزوق بن علي الثبيتي',
  hero_subtitle: 'منصة النظارة الرسمية لحفظ أصول الوقف وإدارتها وفق شرط الواقف، بحوكمة وشفافية للمستحقين',
  hero_tagline: 'حفظ الأمانة · إنفاذ شرط الواقف · إفصاح للمستحقين',
  cta_text: 'الدخول الآمن',
  features_title: 'ركائز الحوكمة',
  features_subtitle: 'مبادئ تلتزم بها النظارة في إدارة الوقف',
  testament_title: 'ميثاق الوقف',
  testament_text: 'وقفٌ أُنشئ ابتغاء الأجر، تُحفظ أصوله وتُصرف غلّته على مستحقيه وفق شرط الواقف رحمه الله، وتلتزم النظارة بالأمانة والعدل والإفصاح.',
  verify_title: 'التحقق من الوثائق',
  verify_subtitle: 'أدخل الرقم المرجعي المطبوع على السند أو المستند للتأكد من صحته',
  cta_section_title: 'بوابة المستحقين والنظارة',
  cta_section_subtitle: 'الدخول متاح للمصرّح لهم فقط',
  footer_text: 'وقف مرزوق بن علي الثبيتي © {year} — جميع الحقوق محفوظة',
  contact_phone: '0500060098',
  show_stats: false,
  show_testament: true,
  show_pillars: true,
  show_verify: true,
  show_cta: true,
};

/** دمج المحفوظ مع الافتراضي حتى لا تسقط الحقول الجديدة من إعدادات قديمة */
export const withLandingDefaults = (saved: Partial<LandingPageContent> | null | undefined): LandingPageContent => ({
  ...LANDING_DEFAULTS,
  ...(saved ?? {}),
});
