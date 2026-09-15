import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimeInputProps {
  value: string; // "HH:mm" format e.g. "17:00"
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  id?: string;
}

// Format "HH:mm:ss" or "HH:mm" to "HH:mm"
export function formatHHmm(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return timeStr;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  required,
  className = '',
  disabled,
  readOnly,
  placeholder = 'HH:mm',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayVal = formatHHmm(value);

  // Parse hour and minute
  const parseHourMinute = () => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        return {
          hour: Math.min(23, Math.max(0, h)),
          minute: Math.min(59, Math.max(0, m)),
        };
      }
    }
    return { hour: 8, minute: 0 };
  };

  const [selectedTime, setSelectedTime] = useState(parseHourMinute());

  useEffect(() => {
    setSelectedTime(parseHourMinute());
  }, [value]);

  // Handle outside click to close
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

  const pad = (n: number) => String(n).padStart(2, '0');

  const updateTime = (h: number, m: number) => {
    const newH = Math.min(23, Math.max(0, h));
    const newM = Math.min(59, Math.max(0, m));
    setSelectedTime({ hour: newH, minute: newM });
    onChange(`${pad(newH)}:${pad(newM)}`);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(raw);
    if (raw.length === 5 && raw.includes(':')) {
      const [h, m] = raw.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setSelectedTime({ hour: h, minute: m });
      }
    }
  };

  const quickPresets = ['08:00', '09:00', '12:00', '13:00', '17:00', '18:00', '20:00', '21:00'];

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
        <Clock className="w-4 h-4" />
      </button>

      {/* Interactive Time Picker Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 p-3 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] shadow-2xl w-64 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Pilih Waktu (Jam : Menit)
          </div>

          {/* Stepper Display */}
          <div className="flex items-center justify-center gap-3 py-2 bg-slate-50 dark:bg-[#121215] rounded-xl border border-slate-200 dark:border-[#27272a]">
            {/* Hour Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => updateTime((selectedTime.hour + 1) % 24, selectedTime.minute)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 dark:hover:bg-[#27272a] rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5">
                {pad(selectedTime.hour)}
              </div>
              <button
                type="button"
                onClick={() => updateTime((selectedTime.hour + 23) % 24, selectedTime.minute)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 dark:hover:bg-[#27272a] rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xl font-mono font-bold text-slate-400">:</span>

            {/* Minute Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => updateTime(selectedTime.hour, (selectedTime.minute + 5) % 60)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 dark:hover:bg-[#27272a] rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5">
                {pad(selectedTime.minute)}
              </div>
              <button
                type="button"
                onClick={() => updateTime(selectedTime.hour, (selectedTime.minute + 55) % 60)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 dark:hover:bg-[#27272a] rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="mt-3">
            <div className="text-[10px] text-slate-400 mb-1 font-semibold">Pilihan Cepat:</div>
            <div className="grid grid-cols-4 gap-1">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const [h, m] = preset.split(':').map(Number);
                    updateTime(h, m);
                  }}
                  className={`py-1 text-[11px] font-mono font-medium rounded-lg border transition-colors ${
                    displayVal === preset
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                      : 'border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                updateTime(now.getHours(), now.getMinutes());
              }}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Waktu Sekarang
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
