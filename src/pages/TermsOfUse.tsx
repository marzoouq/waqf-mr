import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText } from 'lucide-react';

const TermsOfUse = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'القبول بالشروط',
      content: 'باستخدامك لنظام إدارة وقف مرزوق بن علي الثبيتي، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم توافق على أي من هذه الشروط، يُرجى عدم استخدام النظام.',
    },
    {
      title: 'وصف الخدمة',
      content: 'يوفر النظام منصة إلكترونية لإدارة أملاك الوقف، تشمل: إدارة العقارات والعقود، تتبع الدخل والمصروفات، توزيع حصص الريع على المستفيدين، وإعداد التقارير والإفصاحات السنوية.',
    },
    {
      title: 'حسابات المستخدمين',
      content: 'يتم إنشاء الحسابات بواسطة ناظر الوقف حصراً. يلتزم المستخدم بالحفاظ على سرية بيانات تسجيل الدخول وعدم مشاركتها مع أي شخص آخر. يتحمل المستخدم مسؤولية جميع الأنشطة التي تتم من خلال حسابه.',
    },
    {
      title: 'الصلاحيات والأدوار',
      content: 'يعمل النظام بنظام صلاحيات متعدد المستويات: ناظر الوقف (صلاحيات كاملة لإدارة جميع جوانب الوقف)، المستفيدون (صلاحيات عرض التقارير والحصص فقط)، والواقف (صلاحيات عرض). لا يحق لأي مستخدم تجاوز الصلاحيات الممنوحة له.',
    },
    {
      title: 'الاستخدام المقبول',
      content: 'يلتزم المستخدم باستخدام النظام للأغراض المشروعة فقط، وعدم محاولة الوصول غير المصرح به إلى بيانات أو وظائف النظام، وعدم إدخال بيانات مضللة أو غير صحيحة.',
    },
    {
      title: 'حقوق الملكية الفكرية',
      content: 'جميع حقوق الملكية الفكرية للنظام وتصميمه ومحتواه محفوظة. لا يجوز نسخ أو توزيع أو تعديل أي جزء من النظام دون إذن كتابي مسبق.',
    },
    {
      title: 'دقة البيانات',
      content: 'يبذل ناظر الوقف جهده لضمان دقة البيانات المالية والتقارير المعروضة في النظام. ومع ذلك، قد تحتوي البيانات على أخطاء غير مقصودة. يُنصح المستفيدون بالتواصل مع ناظر الوقف للتحقق من أي بيانات.',
    },
    {
      title: 'إخلاء المسؤولية',
      content: 'يُقدَّم النظام "كما هو" دون أي ضمانات صريحة أو ضمنية. لا نتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام النظام أو عدم القدرة على استخدامه.',
    },
    {
      title: 'تعديل الشروط',
      content: 'نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بالتعديلات الجوهرية. يُعد استمرارك في استخدام النظام بعد التعديل قبولاً للشروط المحدّثة.',
    },
    {
      title: 'القانون الواجب التطبيق',
      content: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية. أي نزاع ينشأ عن استخدام النظام يُحال إلى الجهات القضائية المختصة في المملكة العربية السعودية.',
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center shadow-gold mb-6">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            شروط الاستخدام
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
            <section key={index} className="border-b border-border/40 pb-8 last:border-0">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">
                {index + 1}. {section.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-12 text-center">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="gap-2 rounded-xl"
          >
            العودة للصفحة الرئيسية
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </main>
  );
};

export default TermsOfUse;
