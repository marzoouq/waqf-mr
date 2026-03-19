/**
 * تبويبات متجاوبة: تعرض Select على الجوال وتبويبات عادية على سطح المكتب.
 */
import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NativeSelect, type NativeSelectOption } from '@/components/ui/native-select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TabItem {
  value: string;
  label: string;
  /** التسمية المختصرة للجوال (في وضع سطح المكتب) */
  shortLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ResponsiveTabsProps {
  items: TabItem[];
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  className?: string;
  tabsListClassName?: string;
}

const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  items,
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  dir = 'rtl',
  className,
  tabsListClassName,
}) => {
  const isMobile = useIsMobile();
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = controlledValue ?? internalValue;

  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  const selectOptions: NativeSelectOption[] = items.map((item) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled,
  }));

  return (
    <Tabs value={currentValue} onValueChange={handleChange} dir={dir} className={className}>
      {/* الجوال: NativeSelect */}
      {isMobile && (
        <div className="mb-3 print:hidden">
          <NativeSelect
            value={currentValue}
            onValueChange={handleChange}
            options={selectOptions}
            triggerClassName="text-sm font-medium"
          />
        </div>
      )}

      {/* سطح المكتب: TabsList عادية */}
      {!isMobile && (
        <TabsList className={cn('print:hidden w-auto', tabsListClassName)}>
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              disabled={item.disabled}
              className="text-sm gap-1.5"
            >
              {item.icon}
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}

      {children}
    </Tabs>
  );
};

export { ResponsiveTabs, TabsContent };
export type { TabItem, ResponsiveTabsProps };
