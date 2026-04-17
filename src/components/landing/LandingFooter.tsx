/**
 * تذييل الصفحة الرئيسية
 */
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import type { LandingPageContent } from '@/types/landing';

interface LandingFooterProps {
  content: LandingPageContent;
}

const LandingFooter: React.FC<LandingFooterProps> = ({ content }) => (
  <footer className="bg-primary py-8 border-t border-primary-foreground/10" role="contentinfo">
    <div className="container mx-auto px-4 text-center space-y-3">
      <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
        <Link to="/privacy" className="text-primary-foreground/70 hover:text-secondary transition-colors">
          سياسة الخصوصية
        </Link>
        <span className="text-primary-foreground/30">|</span>
        <Link to="/terms" className="text-primary-foreground/70 hover:text-secondary transition-colors">
          شروط الاستخدام
        </Link>
        <span className="text-primary-foreground/30">|</span>
        <Link to="/install" className="text-primary-foreground/70 hover:text-secondary transition-colors inline-flex items-center gap-1">
          <Smartphone className="w-3.5 h-3.5" />
          تثبيت التطبيق
        </Link>
      </div>
      <p className="text-primary-foreground/60 text-sm">
        {content.footer_text.replace('{year}', String(new Date().getFullYear()))}
      </p>
    </div>
  </footer>
);

export default LandingFooter;
