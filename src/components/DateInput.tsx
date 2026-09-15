import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateInputProps {
  value: string; // ISO format "YYYY-MM-DD"
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  id?: string;
  min?: string;
  max?: string;
}

// Convert YYYY-MM-DD to dd-MM-yyyy
export function formatISOToDDMMYYYY(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d && y.length === 4) {
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
  }
  return isoStr;
}

// Convert dd-MM-yyyy or dd/MM/yyyy to YYYY-MM-DD
export function parseDDMMYYYYToISO(formattedStr: string): string {
  if (!formattedStr) return '';
  const clean = formattedStr.replace(/\//g, '-').trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && y.length === 4) {
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }
  return formattedStr;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  required,
  className = '',
  disabled,
  readOnly,
  placeholder = 'dd-MM-yyyy',
  id,
  min,
  max,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayVal = formatISOToDDMMYYYY(value);

  // Parsing current selected or fallback to today
  const getInitialYearMonth = () => {
    if (value && value.includes('-')) {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        return { year: y, month: m - 1 };
      }
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const [viewState, setViewState] = useState(getInitialYearMonth());

  // Update view when value changes
  useEffect(() => {
    if (value && value.includes('-')) {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewState({ year: y, month: m - 1 });
      }
    }
  }, [value]);

  // Handle outside click to close popup
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length === 10) {
      const parsedIso = parseDDMMYYYYToISO(raw);
      if (parsedIso.length === 10 && !isNaN(Date.parse(parsedIso))) {
        onChange(parsedIso);
      }
    } else if (raw === '') {
      onChange('');
    }
  };

  const prevMonth = () => {
    setViewState((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewState((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const selectDate = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${viewState.year}-${pad(viewState.month + 1)}-${pad(day)}`;
    onChange(iso);
    setIsOpen(false);
  };

  const selectToday = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(iso);
    setIsOpen(false);
  };

  // Generate calendar days
  const daysInMonth = new Date(viewState.year, viewState.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewState.year, viewState.month, 1).getDay();

  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <input
        type="text"
        id={id}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        value={displayVal}
        onChange={handleTextChange}
        onClick={() => {
          if (!readOnly && !disabled) setIsOpen(true);
        }}
        className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
      />

      <button
        type="button"
        onClick={() => {
          if (!readOnly && !disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled || readOnly}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4" />
      </button>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 p-3 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] shadow-2xl w-72 animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '280px' }}
        >
          {/* Header navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewState.month}
                onChange={(e) => setViewState({ ...viewState, month: Number(e.target.value) })}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent border-0 cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i} className="bg-white dark:bg-[#18181b]">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewState.year}
                onChange={(e) => setViewState({ ...viewState, year: Number(e.target.value) })}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent border-0 cursor-pointer focus:outline-none font-mono"
              >
                {Array.from({ length: 25 }, (_, i) => 2020 + i).map((yr) => (
                  <option key={yr} value={yr} className="bg-white dark:bg-[#18181b]">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((d, idx) => (
              <div
                key={d}
                className={`text-[10px] font-bold py-1 ${
                  idx === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day tiles */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const curIso = `${viewState.year}-${pad(viewState.month + 1)}-${pad(day)}`;
              const isSelected = value === curIso;
              const isToday = curIso === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-7 w-7 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center mx-auto ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : isToday
                      ? 'border border-amber-500/50 text-amber-500 dark:text-amber-400 font-bold hover:bg-slate-100 dark:hover:bg-[#27272a]'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#27272a]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Today and Clear button */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={selectToday}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
