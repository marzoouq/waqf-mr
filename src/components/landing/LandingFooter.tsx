/**
 * التذييل المؤسسي للصفحة الرئيسية
 */
import { Link } from 'react-router-dom';
import type { LandingPageContent } from '@/types/landing';

interface LandingFooterProps {
  content: LandingPageContent;
  waqfName: string;
}

const linkCls = 'text-primary-foreground/70 hover:text-secondary transition-colors';

const LandingFooter: React.FC<LandingFooterProps> = ({ content, waqfName }) => (
  <footer className="bg-primary text-primary-foreground pt-12 pb-6 text-sm" role="contentinfo">
    <div className="container mx-auto px-5">
      <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
        <div className="col-span-2 md:col-span-1">
          <h4 className="font-display text-lg text-secondary mb-3">{waqfName}</h4>
          <p className="text-primary-foreground/70 leading-loose">{content.hero_subtitle}</p>
        </div>
        <div>
          <h4 className="font-display text-lg text-secondary mb-3">المنصة</h4>
          <ul className="space-y-2">
            <li><Link to="/auth" className={linkCls}>بوابة الدخول</Link></li>
            {content.show_verify && <li><a href="#verify" className={linkCls}>التحقق من الوثائق</a></li>}
            <li><Link to="/install" className={linkCls}>تثبيت التطبيق</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg text-secondary mb-3">الحوكمة</h4>
          <ul className="space-y-2">
            <li><Link to="/privacy" className={linkCls}>سياسة الخصوصية</Link></li>
            <li><Link to="/terms" className={linkCls}>شروط الاستخدام</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg text-secondary mb-3">التواصل</h4>
          <p className="text-primary-foreground/70" dir="ltr">waqf-wise.net</p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 mt-10 pt-5 text-xs text-primary-foreground/60 text-center md:text-right">
        {content.footer_text.replace('{year}', String(new Date().getFullYear()))}
      </div>
    </div>
  </footer>
);

export default LandingFooter;
