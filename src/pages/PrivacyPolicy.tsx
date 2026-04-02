import { Shield } from 'lucide-react';
import LegalPageFooter from '@/components/LegalPageFooter';

const PrivacyPolicy = () => {

  const sections = [
    {
      title: 'المقدمة',
      content: 'نلتزم في نظام إدارة وقف مرزوق بن علي الثبيتي بحماية خصوصية مستخدمي النظام. توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك الشخصية عند استخدامك لمنصتنا.',
    },
    {
      title: 'البيانات التي نجمعها',
      content: 'نقوم بجمع البيانات التالية: الاسم الكامل، البريد الإلكتروني، رقم الهاتف، رقم الهوية الوطنية، معلومات الحساب البنكي للمستفيدين. تُجمع هذه البيانات لأغراض إدارة الوقف وتوزيع المستحقات فقط.',
    },
    {
      title: 'كيفية استخدام البيانات',
      content: 'نستخدم بياناتك لإدارة حسابك في النظام، توزيع حصص الريع، إرسال الإشعارات والتقارير المالية، التواصل معك بخصوص مستحقاتك، وإعداد التقارير والإفصاحات السنوية المطلوبة نظاماً.',
    },
    {
      title: 'حماية البيانات',
      content: 'نتخذ إجراءات أمنية صارمة لحماية بياناتك، تشمل: التشفير أثناء النقل والتخزين، نظام صلاحيات متعدد المستويات، سجلات تدقيق لجميع العمليات، ونسخ احتياطية دورية.',
    },
    {
      title: 'ملفات تعريف الارتباط',
      content: 'يستخدم النظام ملفات تعريف الارتباط (Cookies) الضرورية لتشغيل الخدمة، مثل الحفاظ على جلسة تسجيل الدخول. لا نستخدم ملفات تعريف الارتباط لأغراض إعلانية أو تتبعية.',
    },
    {
      title: 'حقوق المستخدم',
      content: 'يحق لك الاطلاع على بياناتك الشخصية المخزنة في النظام، طلب تصحيح أي بيانات غير دقيقة، وطلب حذف بياناتك وفقاً للأنظمة المعمول بها. يمكنك ممارسة هذه الحقوق بالتواصل مع ناظر الوقف.',
    },
    {
      title: 'مشاركة البيانات',
      content: 'لا نشارك بياناتك الشخصية مع أي طرف ثالث إلا في الحالات التالية: بموافقتك الصريحة، للامتثال لمتطلبات قانونية أو تنظيمية، أو لحماية حقوق الوقف ومستفيديه.',
    },
    {
      title: 'التعديلات على السياسة',
      content: 'نحتفظ بحق تعديل هذه السياسة في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر النظام. يُعد استمرارك في استخدام النظام بعد التعديل موافقة على السياسة المحدّثة.',
    },
    {
      title: 'التواصل',
      content: 'لأي استفسارات حول سياسة الخصوصية أو لممارسة حقوقك، يرجى التواصل مع ناظر الوقف عبر نظام الرسائل الداخلي في المنصة.',
    },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center shadow-gold mb-6">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            سياسة الخصوصية
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

      </div>
      <LegalPageFooter />
    </main>
  );
};

export default PrivacyPolicy;
