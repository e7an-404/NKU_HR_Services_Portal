import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface ExportDropdownProps {
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  label?: string;
  excelLabel?: string;
  pdfLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExportExcel,
  onExportPdf,
  label = 'Export',
  excelLabel = 'Unduh Excel (.xlsx)',
  pdfLabel = 'Cetak / Unduh PDF (.pdf)',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#27272a] hover:border-slate-300 dark:hover:border-[#3f3f46] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Pilihan Ekspor Dokumen"
      >
        <Download className="w-3.5 h-3.5 text-emerald-500" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 border-b border-slate-100 dark:border-[#27272a]">
            Format Dokumen
          </div>

          {onExportExcel && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{excelLabel}</span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportPdf();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{pdfLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
