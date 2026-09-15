import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortDirection } from '../lib/sortUtils';

interface SortableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: SortDirection;
  onSort?: (key: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export const SortableTh: React.FC<SortableThProps> = ({
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  children,
  align = 'left',
  className = '',
  ...props
}) => {
  const isSortable = !!sortKey && !!onSort;
  const isActive = isSortable && currentSortKey === sortKey && currentSortDirection !== null;

  const handleClick = () => {
    if (isSortable && onSort) {
      onSort(sortKey);
    }
  };

  const alignClasses =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
      ? 'justify-center text-center'
      : 'justify-start text-left';

  return (
    <th
      {...props}
      onClick={isSortable ? handleClick : undefined}
      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider select-none transition-colors ${
        isSortable
          ? 'cursor-pointer hover:text-white group text-slate-400'
          : 'text-slate-400'
      } ${className}`}
    >
      <div className={`inline-flex items-center gap-1.5 ${alignClasses} w-full`}>
        <span>{children}</span>
        {isSortable && (
          <span className="shrink-0 transition-transform">
            {isActive ? (
              currentSortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-amber-400 dark:text-sky-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-amber-400 dark:text-sky-400" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-80 transition-opacity" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};
