/**
 * PropertyFigureGrid — مربعات أرقام العقار (عرض فقط، القيم تصل جاهزة دون أي حساب).
 */
interface PropertyFigure { label: string; value: string; className?: string }

interface PropertyFigureGridProps {
  figures: PropertyFigure[];
  netLabel: string;
  netValue: string;
  netPositive: boolean;
}

const PropertyFigureGrid = ({ figures, netLabel, netValue, netPositive }: PropertyFigureGridProps) => (
  <div className="grid grid-cols-2 gap-2 text-sm">
    {figures.map((f) => (
      <div key={f.label} className="rounded-lg bg-muted/40 px-2.5 py-2">
        <div className="text-[11px] text-muted-foreground">{f.label}</div>
        <div className={f.className ?? 'font-medium'}>{f.value}</div>
      </div>
    ))}
    <div className="col-span-2 flex items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2">
      <span className="text-muted-foreground">{netLabel}</span>
      <span className={`font-bold ${netPositive ? 'text-success' : 'text-destructive'}`}>{netValue}</span>
    </div>
  </div>
);

export default PropertyFigureGrid;
