/**
 * ملخص العقارات (الهوية الوقفية) — أعداد الوحدات والإشغال كما تصل، ومتوسط الإيجار بنفس الصيغة السابقة.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Wallet, AlertTriangle, KeyRound, DoorOpen } from 'lucide-react';
import { FigureTile, FigureTileGrid, ProgressSummaryBar } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';

interface PropertySummary {
  totalProperties: number;
  totalUnitsCount: number;
  totalRented: number;
  totalVacant: number;
  overallOccupancy: number;
  /** عدد العقارات بدون وحدات معرّفة (مفصول عن الوحدات الشاغرة) */
  propertiesWithoutUnits: number;
  /** عدد العقارات بدون وحدات والمؤجَّرة كاملة (whole-property) */
  propertiesWithoutUnitsRented: number;
  contractualRevenue: number;
  activeIncome: number;
  collectedIncome: number;
  totalExpensesAll: number;
  netIncome: number;
  isClosed?: boolean;
}

interface PropertySummaryCardsProps {
  summary: PropertySummary;
  isLoading: boolean;
}

const PropertySummaryCards = ({ summary, isLoading }: PropertySummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-slide-up">
        <FigureTileGrid isLoading cols="sm:grid-cols-3 lg:grid-cols-6" skeletonCount={6} />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  // متوسط الإيجار = حصة السنة من قيمة العقود ÷ عدد الوحدات المؤجرة (مرحَّل من لوحة الناظر)
  const avgRent = summary.totalRented > 0 && summary.contractualRevenue > 0
    ? Math.round(summary.contractualRevenue / summary.totalRented)
    : 0;

  return (
    <div className="space-y-4 animate-slide-up">
      <FigureTileGrid cols="sm:grid-cols-3 lg:grid-cols-6">
        <FigureTile label="إجمالي العقارات" value={summary.totalProperties} icon={DOMAIN_ICONS.property} unit="count" />
        <FigureTile label="إجمالي الوحدات" value={summary.totalUnitsCount} icon={Layers} unit="count" />
        <FigureTile label="مؤجرة" value={summary.totalRented} icon={KeyRound} tone="success" unit="count" />
        <FigureTile
          label="وحدات شاغرة" value={summary.totalVacant} icon={DoorOpen} tone={summary.totalVacant > 0 ? 'warning' : 'neutral'} unit="count"
          hint="دون عقد فعّال" title="وحدات بدون عقد فعّال (لا تشمل العقارات بدون وحدات)."
        />
        <FigureTile
          label="عقارات بدون وحدات" value={summary.propertiesWithoutUnits} icon={AlertTriangle}
          tone={summary.propertiesWithoutUnits > 0 ? 'expense' : 'neutral'} unit="count"
          title="عقارات لم تُعرَّف لها وحدات بعد — تحتاج إدخال الوحدات لاحتسابها ضمن الإشغال."
          hint={summary.propertiesWithoutUnitsRented > 0 ? `منها ${summary.propertiesWithoutUnitsRented} مؤجَّر كاملاً` : 'تحتاج تعريف الوحدات'}
        />
        <FigureTile label="متوسط الإيجار" value={avgRent} icon={Wallet} tone="share" hint="للوحدة المؤجرة في السنة" />
      </FigureTileGrid>

      <ProgressSummaryBar label="نسبة الإشغال الإجمالية" rate={summary.overallOccupancy} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs sm:text-sm">
        <span className="text-muted-foreground">للاطلاع على الإيرادات والمصروفات وصافي الدخل، انتقل إلى صفحات الاختصاص.</span>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/dashboard/reports" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            التقارير المالية <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Link to="/dashboard/invoices" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            الفواتير <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertySummaryCards;
