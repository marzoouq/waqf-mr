/**
 * مكونات العرض الهرمي للشجرة المحاسبية — CategoryRow + TreeBranch
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Pencil, Trash2, ChevronDown,
  DollarSign, Receipt, Calculator, ArrowDownUp,
} from 'lucide-react';
import type { CategoryTreeNode } from '@/hooks/data/financial/useAccountCategories';
import type { AccountCategory } from '@/types';

// ─── ثوابت الألوان والأنواع ───
// eslint-disable-next-line react-refresh/only-export-components
export const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof DollarSign }> = {
  income: { label: 'إيراد', color: 'bg-success-muted text-success-foreground', icon: DollarSign },
  expense: { label: 'مصروف', color: 'bg-destructive/10 text-destructive', icon: Receipt },
  tax: { label: 'ضريبة', color: 'bg-warning/10 text-warning-foreground', icon: Calculator },
  distribution: { label: 'توزيع', color: 'bg-info-muted text-info-foreground', icon: ArrowDownUp },
};

// ─── مكوّن الصف الفرعي ───
export function CategoryRow({
  node,
  depth,
  onEdit,
  onDelete,
  onToggle,
  hasChildren,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (cat: AccountCategory) => void;
  onDelete: (cat: AccountCategory) => void;
  onToggle: (id: string, active: boolean) => void;
  hasChildren: boolean;
}) {
  const cfg = TYPE_CONFIG[node.category_type] ?? TYPE_CONFIG.expense!;
  const Icon = cfg.icon;

  return (
    <div
      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
      style={{ paddingRight: `${Math.min(12 + depth * 16, 64)}px` }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground hidden sm:inline">{node.code}</span>
        <span className={`text-sm font-medium truncate ${!node.is_active ? 'line-through text-muted-foreground' : ''}`}>
          {node.name}
        </span>
        <Badge variant="secondary" className={`text-[11px] px-1.5 py-0 ${cfg.color}`}>
          {cfg.label}
        </Badge>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={node.is_active}
          onCheckedChange={(v) => onToggle(node.id, v)}
          className="scale-75"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(node)}
          disabled={hasChildren}
          title={hasChildren ? 'لا يمكن حذف فئة لها فروع' : 'حذف'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── مكوّن الشجرة المتداخلة ───
export function TreeBranch({
  nodes,
  depth,
  onEdit,
  onDelete,
  onToggle,
  searchTerm,
}: {
  nodes: CategoryTreeNode[];
  depth: number;
  onEdit: (cat: AccountCategory) => void;
  onDelete: (cat: AccountCategory) => void;
  onToggle: (id: string, active: boolean) => void;
  searchTerm: string;
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;

        if (hasChildren) {
          return (
            <Collapsible key={node.id} defaultOpen>
              <CollapsibleTrigger asChild>
                <div className="cursor-pointer">
                  <div className="flex items-center gap-1">
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=closed]:rotate-90 group-data-[state=closed]:rtl:-rotate-90" />
                    <div className="flex-1">
                      <CategoryRow
                        node={node}
                        depth={depth}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggle={onToggle}
                        hasChildren={hasChildren}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-r-2 border-muted mr-4">
                  <TreeBranch
                    nodes={node.children}
                    depth={depth + 1}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    searchTerm={searchTerm}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        return (
          <CategoryRow
            key={node.id}
            node={node}
            depth={depth}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            hasChildren={false}
          />
        );
      })}
    </>
  );
}
