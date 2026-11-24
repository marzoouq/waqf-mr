/**
 * ميثاق الوقف — نص يحرره الناظر داخل بطاقة مذهبة
 */
interface LandingTestamentProps {
  title: string;
  text: string;
}

const LandingTestament = ({ title, text }: LandingTestamentProps) => (
  <section id="testament" className="py-14 md:py-24 scroll-mt-20" aria-labelledby="testament-title">
    <div className="container mx-auto px-5 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      <div>
        <p className="text-secondary font-bold text-xs md:text-sm mb-2">الواقف والوصية</p>
        <h2 id="testament-title" className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3">{title}</h2>
        <p className="text-muted-foreground leading-loose text-sm md:text-base">
          أُوقفت هذه الأصول ابتغاء وجه الله، وتقوم النظارة على حفظ أصلها وتنمية ريعها وصرفه في مصارفه الشرعية وفق شرط الواقف.
        </p>
      </div>
      <figure className="rounded-3xl border border-secondary/40 bg-gradient-to-b from-card to-secondary/10 p-6 md:p-10 text-center ring-8 ring-inset ring-card">
        <blockquote className="font-display text-lg md:text-2xl leading-loose text-primary">«{text}»</blockquote>
        <figcaption className="text-secondary font-bold text-sm mt-4">— ميثاق النظارة</figcaption>
      </figure>
    </div>
  </section>
);

export default LandingTestament;
