import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  DollarSign,
  Calculator,
  Plus,
  Filter,
  Download,
  Printer,
  FileText,
  Clock,
  AlertTriangle,
  Award,
  CheckCircle2,
  X,
  Sparkles,
  Building2,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  RefreshCw,
  Users,
  Percent,
  Coins,
  ShieldCheck,
  Sliders,
  Check,
  Settings,
  AlertCircle,
  Copy,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../lib/api';
import { DateInput } from '../components/DateInput';
import {
  Employee,
  PayrollSlip,
  OvertimeRule,
  OvertimeTierSlot,
  DeductionRule,
  AllowanceRule,
  AttendanceLog,
  OvertimeRequest,
  CompanyProfile,
  WorkSchedule,
  SchedulePlot,
  Division,
  JobGrade,
  RuleScope,
  CalcType,
} from '../types';
import { exportToExcel, exportToPdfPrint, formatRupiah } from '../lib/exportUtils';
import { getCompanyInitials, getContrastTextColorStyle } from '../lib/companyUtils';
import { evaluateFormula, evaluateSafeFormula } from '../lib/formulaEvaluator';

export interface PresetFormulaItem {
  label: string;
  desc: string;
  formula: string;
  targetCalcType?: CalcType;
  defaultMultiplier?: number;
  defaultFixedAmount?: number;
  defaultPercentage?: number;
}

interface FormulaBuilderPanelProps {
  ruleType: 'overtime' | 'deduction' | 'allowance';
  formulaValue: string;
  onFormulaChange: (val: string) => void;
  onPresetSelect?: (preset: PresetFormulaItem) => void;
  sampleContext?: {
    multiplier?: number;
    fixed_amount?: number;
    percentage?: number;
  };
}

const FormulaBuilderPanel: React.FC<FormulaBuilderPanelProps> = ({
  ruleType,
  formulaValue,
  onFormulaChange,
  onPresetSelect,
  sampleContext = {} as any,
}) => {
  const [showHelper, setShowHelper] = useState(false);

  // Sample evaluation context for realistic preview
  const sampleEvalContext = useMemo(() => {
    return {
      base_salary: 25000,
      monthly_base_salary: 4325000,
      gaji_pokok: 4325000,
      upah_jam: 25000,
      hours: 10,
      jam: 10,
      point: 173,
      points: 173,
      jam_kerja: 173,
      ot_hours: 10,
      jam_lembur: 10,
      ot_days: 3,
      hari_lembur: 3,
      spkl_count: 2,
      jumlah_spkl: 2,
      late_count: 2,
      jumlah_telat: 2,
      gross_salary: 4500000,
      gaji_kotor: 4500000,
      multiplier: sampleContext.multiplier ?? 1.5,
      kelipatan: sampleContext.multiplier ?? 1.5,
      fixed_amount: sampleContext.fixed_amount ?? 25000,
      amount: sampleContext.fixed_amount ?? 25000,
      nominal: sampleContext.fixed_amount ?? 25000,
      percentage: sampleContext.percentage ?? 2,
      persentase: sampleContext.percentage ?? 2,
    };
  }, [sampleContext]);

  const testResult = useMemo(() => {
    if (!formulaValue || !formulaValue.trim()) return null;
    return evaluateSafeFormula(formulaValue, sampleEvalContext);
  }, [formulaValue, sampleEvalContext]);

  const handleAppendToken = (token: string) => {
    const current = formulaValue ? formulaValue.trim() : '';
    if (!current) {
      onFormulaChange(token);
    } else {
      const lastChar = current.slice(-1);
      if (['+', '-', '*', '/', '(', ')'].includes(token) || ['+', '-', '*', '/', '(', ')'].includes(lastChar)) {
        onFormulaChange(`${current} ${token}`);
      } else {
        onFormulaChange(`${current} * ${token}`);
      }
    }
  };

  const presets = useMemo<PresetFormulaItem[]>(() => {
    if (ruleType === 'overtime') {
      return [
        {
          label: '⚡ Standar Upah x Multiplier x Jam',
          desc: 'Upah/Jam x Pengali x Jam OT',
          formula: 'base_salary * multiplier * hours',
          targetCalcType: 'multiplier',
          defaultMultiplier: 1.5,
        },
        {
          label: '⚡ Depnaker 1/173 Gaji Pokok',
          desc: '(Gaji Pokok / 173) x Multiplier x Jam OT',
          formula: '(gaji_pokok / 173) * multiplier * ot_hours',
          targetCalcType: 'multiplier',
          defaultMultiplier: 1.5,
        },
        {
          label: '⚡ Flat Nominal per Jam',
          desc: 'Nominal Tetap per Jam OT',
          formula: 'fixed_amount * hours',
          targetCalcType: 'fixed',
          defaultFixedAmount: 10000,
        },
        {
          label: '⚡ Flat Nominal per 3 Jam Lembur',
          desc: 'Nominal Tetap dihitung per blok 3 jam OT',
          formula: 'fixed_amount * (hours / 3)',
          targetCalcType: 'fixed',
          defaultFixedAmount: 50000,
        },
        {
          label: '⚡ Flat Nominal per Hari Masuk Lembur',
          desc: 'Nominal Tetap x Jumlah Hari Lembur',
          formula: 'fixed_amount * ot_days',
          targetCalcType: 'fixed',
          defaultFixedAmount: 75000,
        },
        {
          label: '⚡ Flat Nominal per SPKL / Tugas',
          desc: 'Nominal Tetap x Jumlah Dokumen SPKL Disetujui',
          formula: 'fixed_amount * spkl_count',
          targetCalcType: 'fixed',
          defaultFixedAmount: 50000,
        },
        {
          label: '⚡ Persentase Upah per Jam',
          desc: '(Persentase % x Upah/Jam) x Jam OT',
          formula: '(percentage / 100) * base_salary * hours',
          targetCalcType: 'multiplier',
          defaultMultiplier: 1.5,
          defaultPercentage: 10,
        },
      ];
    }
    if (ruleType === 'deduction') {
      return [
        {
          label: '⚡ Denda Telat per Kejadian',
          desc: 'Jumlah Terlambat x Nominal Denda',
          formula: 'late_count * fixed_amount',
          targetCalcType: 'fixed',
          defaultFixedAmount: 25000,
        },
        {
          label: '⚡ Denda Telat % Upah x Kejadian',
          desc: 'Jumlah Terlambat x (Persentase % x Upah/Jam)',
          formula: 'late_count * (percentage / 100) * base_salary',
          targetCalcType: 'percentage',
          defaultPercentage: 1,
        },
        {
          label: '⚡ BPJS % dari Gaji Pokok',
          desc: 'Persentase % x Gaji Pokok Bulanan',
          formula: '(percentage / 100) * gaji_pokok',
          targetCalcType: 'percentage',
          defaultPercentage: 2,
        },
        {
          label: '⚡ BPJS % dari Gaji Kotor',
          desc: 'Persentase % x Gaji Kotor',
          formula: '(percentage / 100) * gross_salary',
          targetCalcType: 'percentage',
          defaultPercentage: 2,
        },
        {
          label: '⚡ Potongan Flat Fixed',
          desc: 'Potongan Tetap Sekali Potong',
          formula: 'fixed_amount',
          targetCalcType: 'fixed',
          defaultFixedAmount: 50000,
        },
      ];
    }
    return [
      {
        label: '⚡ Tunjangan per Jam/Poin',
        desc: 'Nominal Per Jam x Poin Jam Kerja',
        formula: 'fixed_amount * points',
        targetCalcType: 'fixed',
        defaultFixedAmount: 25000,
      },
      {
        label: '⚡ Tunjangan % dari Gaji Pokok',
        desc: 'Persentase % x Gaji Pokok Bulanan',
        formula: '(percentage / 100) * gaji_pokok',
        targetCalcType: 'percentage',
        defaultPercentage: 10,
      },
      {
        label: '⚡ Tunjangan % dari Gaji Kotor',
        desc: 'Persentase % x Gaji Kotor',
        formula: '(percentage / 100) * gross_salary',
        targetCalcType: 'percentage',
        defaultPercentage: 10,
      },
      {
        label: '⚡ Tunjangan Flat Tetap',
        desc: 'Nominal Tunjangan Tetap',
        formula: 'fixed_amount',
        targetCalcType: 'fixed',
        defaultFixedAmount: 50000,
      },
    ];
  }, [ruleType]);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <label className="font-bold text-xs text-slate-800 dark:text-slate-200">
            Formula Ekspresi & Preset Kalkulasi
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold transition-colors flex items-center gap-1 border border-purple-200/80 dark:border-purple-800/80"
        >
          {showHelper ? 'Sembunyikan Helper' : 'Tampilkan Preset & Variabel'}
        </button>
      </div>

      {showHelper && (
        <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-[#27272a] max-h-72 overflow-y-auto pr-1">
          {/* Preset Formula Cepat */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">
              1. Preset Formula Cepat (Klik Untuk Pilih):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onFormulaChange(p.formula);
                    if (onPresetSelect) {
                      onPresetSelect(p);
                    }
                  }}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    formulaValue === p.formula
                      ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-200 font-bold shadow-xs'
                      : 'bg-white dark:bg-[#121215] border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{p.formula}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Variabel Sisip */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">
              2. Sisipkan Variabel ke Rumus:
            </span>

            <div className="space-y-1.5 text-[10px]">
              {/* Row Gaji */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 font-medium w-16 shrink-0">Upah/Gaji:</span>
                <button
                  type="button"
                  onClick={() => handleAppendToken('gaji_pokok')}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-semibold hover:bg-emerald-100"
                  title="Gaji Pokok Bulanan (Rp 4.325.000)"
                >
                  + gaji_pokok
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('base_salary')}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-semibold hover:bg-emerald-100"
                  title="Upah Dasar Per Jam (Rp 25.000)"
                >
                  + base_salary
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('gross_salary')}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-semibold hover:bg-emerald-100"
                  title="Total Gaji Kotor Sebelum Potongan"
                >
                  + gross_salary
                </button>
              </div>

              {/* Row Presensi */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 font-medium w-16 shrink-0">Jam/Telat:</span>
                <button
                  type="button"
                  onClick={() => handleAppendToken('points')}
                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-semibold hover:bg-blue-100"
                  title="Poin Jam Kerja Reguler (misal 173 Jam)"
                >
                  + points
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('ot_hours')}
                  className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono font-semibold hover:bg-purple-100"
                  title="Jam Lembur SPKL Disetujui"
                >
                  + ot_hours
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('ot_days')}
                  className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono font-semibold hover:bg-purple-100"
                  title="Jumlah Hari Hadir Lembur"
                >
                  + ot_days
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('spkl_count')}
                  className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono font-semibold hover:bg-purple-100"
                  title="Jumlah Dokumen Tugas SPKL Disetujui"
                >
                  + spkl_count
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('late_count')}
                  className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono font-semibold hover:bg-rose-100"
                  title="Jumlah Frekuensi Keterlambatan"
                >
                  + late_count
                </button>
              </div>

              {/* Row Parameter */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 font-medium w-16 shrink-0">Aturan:</span>
                <button
                  type="button"
                  onClick={() => handleAppendToken('multiplier')}
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-semibold hover:bg-amber-100"
                  title="Multiplier Kelipatan (misal 1.5x)"
                >
                  + multiplier
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('fixed_amount')}
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-semibold hover:bg-amber-100"
                  title="Nominal Fixed Aturan (Nominal Tetap)"
                >
                  + fixed_amount
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendToken('percentage')}
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-semibold hover:bg-amber-100"
                  title="Nilai Persentase % Aturan"
                >
                  + percentage
                </button>
              </div>
            </div>
          </div>

          {/* Operator Matematika */}
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <span className="text-[10px] text-slate-400 font-medium mr-1">Simbol:</span>
            {['+', '-', '*', '/', '(', ')', '%'].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => handleAppendToken(op)}
                className="w-7 h-6 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs hover:bg-slate-300 dark:hover:bg-zinc-700 flex items-center justify-center"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box Utama Multi-line dengan Tombol Kosongkan berdampingan */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
          Ekspresi Formula Aktif:
        </label>
        <div className="flex items-start gap-2">
          <textarea
            rows={3}
            value={formulaValue}
            placeholder="e.g. (gaji_pokok / 173) * multiplier * ot_hours"
            onChange={(e) => onFormulaChange(e.target.value)}
            className="flex-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-purple-500 leading-relaxed resize-y min-h-[68px] max-h-36 transition-all shadow-2xs"
          />
          <button
            type="button"
            onClick={() => onFormulaChange('')}
            disabled={!formulaValue || formulaValue.trim() === ''}
            className="shrink-0 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 font-semibold text-xs border border-rose-200/80 dark:border-rose-900/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 self-stretch min-h-[68px]"
            title="Kosongkan isi formula"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Kosongkan</span>
          </button>
        </div>
      </div>

      {/* Live Uji Coba Result */}
      {formulaValue && formulaValue.trim() !== '' && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-[11px] space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Uji Coba Hasil Formula (Simulasi Sample):</span>
            {testResult?.success ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Syntax Valid
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" /> Syntax Error
              </span>
            )}
          </div>
          {testResult?.success ? (
            <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pt-1 border-t border-dashed border-slate-100 dark:border-[#27272a]">
              <span className="text-slate-600 dark:text-slate-300">Hasil Estimasi Nilai:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {formatRupiah(testResult.result)}
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-rose-500 italic pt-1">{testResult?.error}</p>
          )}
        </div>
      )}
    </div>
  );
};
import { formatThousandNumber, parseThousandNumber, formatDateDDMMYYYY } from '../lib/formatUtils';
import { ExportDropdown } from '../components/ExportDropdown';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { calculateEmployeeWorkHours } from '../lib/payrollCalculator';
import { toast, useToast } from '../lib/toast';

interface PayrollManagementViewProps {
  divisions?: Division[];
  jobGrades?: JobGrade[];
  employees: Employee[];
  payrollSlips: PayrollSlip[];
  overtimeRules: OvertimeRule[];
  deductionRules: DeductionRule[];
  allowanceRules: AllowanceRule[];
  attendanceLogs: AttendanceLog[];
  overtimeRequests: OvertimeRequest[];
  schedules?: WorkSchedule[];
  schedulePlots?: SchedulePlot[];
  accentColor: string;
  companyName: string;
  companyProfile?: CompanyProfile;
  onGeneratePayroll: (data: {
    employee_id: number;
    period_start: string;
    period_end: string;
    total_hours: number;
    overtime_hours: number;
    base_salary_earned: number;
    overtime_pay: number;
    allowances_amount: number;
    deductions_amount: number;
    net_salary: number;
  }) => Promise<any>;
  onUpdatePayrollSlip?: (id: number, data: Partial<PayrollSlip>) => Promise<any>;
  onDeletePayrollSlip?: (id: number) => Promise<any>;
  onAddOvertimeRule: (data: Partial<OvertimeRule>) => Promise<any>;
  onUpdateOvertimeRule?: (id: number, data: Partial<OvertimeRule>) => Promise<any>;
  onDeleteOvertimeRule?: (id: number) => Promise<any>;
  onAddDeductionRule: (data: Partial<DeductionRule>) => Promise<any>;
  onUpdateDeductionRule?: (id: number, data: Partial<DeductionRule>) => Promise<any>;
  onDeleteDeductionRule?: (id: number) => Promise<any>;
  onAddAllowanceRule: (data: Partial<AllowanceRule>) => Promise<any>;
  onUpdateAllowanceRule?: (id: number, data: Partial<AllowanceRule>) => Promise<any>;
  onDeleteAllowanceRule?: (id: number) => Promise<any>;
}

export const PayrollManagementView: React.FC<PayrollManagementViewProps> = ({
  divisions = [],
  jobGrades = [],
  employees,
  payrollSlips,
  overtimeRules,
  deductionRules,
  allowanceRules,
  attendanceLogs,
  overtimeRequests,
  schedules,
  schedulePlots,
  accentColor,
  companyName,
  companyProfile,
  onGeneratePayroll,
  onUpdatePayrollSlip,
  onDeletePayrollSlip,
  onAddOvertimeRule,
  onUpdateOvertimeRule,
  onDeleteOvertimeRule,
  onAddDeductionRule,
  onUpdateDeductionRule,
  onDeleteDeductionRule,
  onAddAllowanceRule,
  onUpdateAllowanceRule,
  onDeleteAllowanceRule,
}) => {
  const toast = useToast();
  const [subTab, setSubTab] = useState<'slips' | 'master' | 'overtime_rules' | 'deductions' | 'allowances' | 'simulation'>('slips');
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);

  // Helper functions for Division and Job Grade lookups
  const getDivisionName = (divisionId?: number | null) => {
    if (!divisionId) return 'Semua Divisi';
    const div = divisions.find((d) => Number(d.id) === Number(divisionId));
    if (div) return div.division_name;
    const empWithDiv = employees.find((e) => Number(e.division_id) === Number(divisionId));
    if (empWithDiv?.division_name) return empWithDiv.division_name;
    return `Divisi #${divisionId}`;
  };

  const getJobGradeName = (gradeId?: number | null) => {
    if (!gradeId) return 'Semua Golongan';
    const grade = jobGrades.find((g) => Number(g.id) === Number(gradeId));
    if (grade) return grade.grade_name || grade.grade_code;
    const empWithGrade = employees.find((e) => Number(e.job_grade_id) === Number(gradeId));
    if (empWithGrade?.job_grade_name) return empWithGrade.job_grade_name;
    return `Golongan #${gradeId}`;
  };

  // Edit Slip State
  const [editingSlip, setEditingSlip] = useState<PayrollSlip | null>(null);
  const [showEditSlipModal, setShowEditSlipModal] = useState(false);
  const [editSlipForm, setEditSlipForm] = useState<Partial<PayrollSlip>>({});
  const [isUpdatingSlip, setIsUpdatingSlip] = useState(false);

  // Delete Slip Confirmation Modal State
  const [slipToDelete, setSlipToDelete] = useState<PayrollSlip | null>(null);
  const [isDeletingSlip, setIsDeletingSlip] = useState(false);

  // Delete Rule Confirmation Modal State
  const [ruleToDelete, setRuleToDelete] = useState<{ id: number; type: 'ot' | 'ded' | 'allow'; name: string } | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  // Editing Rule state
  const [editingOtRule, setEditingOtRule] = useState<OvertimeRule | null>(null);
  const [editingDedRule, setEditingDedRule] = useState<DeductionRule | null>(null);
  const [editingAllRule, setEditingAllRule] = useState<AllowanceRule | null>(null);

  // Rule Form States with Scope & Calculation Type Support
  const [showOtRuleModal, setShowOtRuleModal] = useState(false);
  const [otRuleForm, setOtRuleForm] = useState<Partial<OvertimeRule>>({
    rule_name: '',
    scope_type: 'general',
    scope_id: null,
    calc_type: 'timeslot',
    rate_unit: 'per_hour',
    multiplier_value: 1.5,
    fixed_amount: 50000,
    percentage_value: 10,
    tier_slots: [
      { id: '1', time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot Sore (+Rp 50.000)' },
      { id: '2', time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot Malam (2x Gaji Pokok 1 Hari)' },
      { id: '3', time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot Dini Hari (3x Gaji Pokok 1 Hari)' },
    ],
    custom_formula: '',
    is_active: true,
  });

  const [showDedRuleModal, setShowDedRuleModal] = useState(false);
  const [dedRuleForm, setDedRuleForm] = useState<Partial<DeductionRule>>({
    rule_name: '',
    scope_type: 'general',
    scope_id: null,
    calc_type: 'percentage',
    percentage_value: 1,
    fixed_amount: 25000,
    multiplier_value: 1,
    custom_formula: '',
    is_active: true,
  });

  const [showAllRuleModal, setShowAllRuleModal] = useState(false);
  const [allRuleForm, setAllRuleForm] = useState<Partial<AllowanceRule>>({
    rule_name: '',
    scope_type: 'general',
    scope_id: null,
    calc_type: 'fixed',
    rate_unit: 'per_month',
    fixed_amount: 25000,
    percentage_value: 10,
    multiplier_value: 1,
    custom_formula: '',
    is_active: true,
  });

  // Modal Sizing States: 'normal' (default max-w-xl/2xl) | 'wide' (max-w-4xl) | 'full' (max-w-6xl / 95vw)
  const [otModalSize, setOtModalSize] = useState<'normal' | 'wide' | 'full'>('normal');
  const [dedModalSize, setDedModalSize] = useState<'normal' | 'wide' | 'full'>('normal');
  const [allModalSize, setAllModalSize] = useState<'normal' | 'wide' | 'full'>('normal');

  // Table Sync State
  const [isSyncingTable, setIsSyncingTable] = useState<string | null>(null);
  const handleSyncTable = async (tableName: string) => {
    setIsSyncingTable(tableName);
    try {
      const res = await api.syncTable(tableName);
      toast.success('Sync Berhasil', res.message || `Tabel ${tableName} berhasil disinkronkan (${res.rowCount || 0} baris)`);
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || `Gagal sinkronisasi ${tableName}`);
    } finally {
      setIsSyncingTable(null);
    }
  };

  const handleOpenEditSlip = (slip: PayrollSlip) => {
    setEditingSlip(slip);
    setEditSlipForm({
      period_start: slip.period_start,
      period_end: slip.period_end,
      total_hours: slip.total_hours !== undefined ? slip.total_hours : ((slip as any).total_points || 0),
      overtime_hours: slip.overtime_hours || 0,
      base_salary: slip.base_salary || 0,
      base_salary_earned: slip.base_salary_earned !== undefined ? slip.base_salary_earned : ((slip as any).gross_base_pay || 0),
      overtime_pay: slip.overtime_pay !== undefined ? slip.overtime_pay : ((slip as any).total_overtime || 0),
      allowances_amount: slip.allowances_amount !== undefined ? slip.allowances_amount : ((slip as any).total_allowance || 0),
      deductions_amount: slip.deductions_amount !== undefined ? slip.deductions_amount : ((slip as any).total_deduction || 0),
      net_salary: slip.net_salary || 0,
      status: slip.status || 'final',
    });
    setShowEditSlipModal(true);
  };

  const handleRecalculateEditNetSalary = () => {
    const base = Number(editSlipForm.base_salary_earned || 0);
    const ot = Number(editSlipForm.overtime_pay || 0);
    const allow = Number(editSlipForm.allowances_amount || 0);
    const ded = Number(editSlipForm.deductions_amount || 0);
    const net = Math.max(0, base + ot + allow - ded);
    setEditSlipForm((prev) => ({ ...prev, net_salary: net }));
    toast.info('Dihitung Ulang', `Take home pay: ${formatRupiah(net)}`);
  };

  const handleSaveEditSlip = async () => {
    if (!editingSlip || !onUpdatePayrollSlip) return;
    setIsUpdatingSlip(true);
    try {
      const res = await onUpdatePayrollSlip(editingSlip.id, editSlipForm);
      if (res?.success) {
        toast.success('Berhasil Diupdate', `Slip gaji #${editingSlip.id} berhasil disimpan ke database.`);
        setShowEditSlipModal(false);
        setEditingSlip(null);
      } else {
        toast.error('Gagal Menyimpan', res?.message || 'Gagal memperbarui slip gaji');
      }
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsUpdatingSlip(false);
    }
  };

  const handlePromptDeleteSlip = (slip: PayrollSlip) => {
    setSlipToDelete(slip);
  };

  const handleConfirmDeleteSlip = async () => {
    if (!slipToDelete) return;
    setIsDeletingSlip(true);
    try {
      if (onDeletePayrollSlip) {
        const res = await onDeletePayrollSlip(slipToDelete.id);
        if (res?.success) {
          toast.success('Berhasil Dihapus', `Slip gaji #${slipToDelete.id} telah dihapus dari database.`);
          setSlipToDelete(null);
        } else {
          toast.error('Gagal Menghapus', res?.message || 'Gagal menghapus slip');
        }
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message);
    } finally {
      setIsDeletingSlip(false);
    }
  };

  const handleOpenEditOtRule = (rule: OvertimeRule) => {
    setEditingOtRule(rule);
    let slots = rule.tier_slots;
    if (!slots && rule.custom_formula && rule.custom_formula.trim().startsWith('[')) {
      try {
        slots = JSON.parse(rule.custom_formula);
      } catch {}
    }
    if (!slots || slots.length === 0) {
      slots = [
        { id: '1', time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot Sore (+Rp 50.000)' },
        { id: '2', time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot Malam (2x Gaji Pokok 1 Hari)' },
        { id: '3', time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot Dini Hari (3x Gaji Pokok 1 Hari)' },
      ];
    }
    setOtRuleForm({
      rule_name: rule.rule_name || '',
      scope_type: (rule.scope_type as RuleScope) || 'general',
      scope_id: rule.scope_id ?? null,
      calc_type: (rule.calc_type as CalcType) || (rule.fixed_amount ? 'fixed' : (rule.percentage_value ? 'percentage' : 'multiplier')),
      rate_unit: rule.rate_unit || 'per_hour',
      multiplier_value: rule.multiplier_value ?? rule.multiplier ?? 1.5,
      fixed_amount: rule.fixed_amount ?? (rule.calc_type === 'fixed' ? 50000 : 0),
      percentage_value: rule.percentage_value ?? (rule.calc_type === 'percentage' ? 10 : 0),
      tier_slots: slots,
      custom_formula: rule.custom_formula || rule.formula || '',
      is_active: rule.is_active !== undefined ? rule.is_active : true,
    });
    setShowOtRuleModal(true);
  };

  const handlePromptDeleteRule = (id: number, type: 'ot' | 'ded' | 'allow', name: string) => {
    setRuleToDelete({ id, type, name });
  };

  const handleConfirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      if (ruleToDelete.type === 'ot' && onDeleteOvertimeRule) {
        const res = await onDeleteOvertimeRule(ruleToDelete.id);
        if (res?.success) toast.success('Berhasil Dihapus', `Aturan lembur "${ruleToDelete.name}" telah dihapus.`);
        else toast.error('Gagal Menghapus', res?.message);
      } else if (ruleToDelete.type === 'ded' && onDeleteDeductionRule) {
        const res = await onDeleteDeductionRule(ruleToDelete.id);
        if (res?.success) toast.success('Berhasil Dihapus', `Aturan potongan "${ruleToDelete.name}" telah dihapus.`);
        else toast.error('Gagal Menghapus', res?.message);
      } else if (ruleToDelete.type === 'allow' && onDeleteAllowanceRule) {
        const res = await onDeleteAllowanceRule(ruleToDelete.id);
        if (res?.success) toast.success('Berhasil Dihapus', `Aturan tunjangan "${ruleToDelete.name}" telah dihapus.`);
        else toast.error('Gagal Menghapus', res?.message);
      }
      setRuleToDelete(null);
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message);
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleOpenEditDedRule = (rule: DeductionRule) => {
    setEditingDedRule(rule);
    setDedRuleForm({
      rule_name: rule.rule_name || '',
      scope_type: (rule.scope_type as RuleScope) || 'general',
      scope_id: rule.scope_id ?? null,
      calc_type: (rule.calc_type as CalcType) || (rule.fixed_amount ? 'fixed' : 'percentage'),
      percentage_value: rule.percentage_value ?? 1,
      fixed_amount: rule.fixed_amount ?? rule.amount ?? 25000,
      multiplier_value: rule.multiplier_value ?? 1,
      custom_formula: rule.custom_formula || rule.formula || '',
      is_active: rule.is_active !== undefined ? rule.is_active : true,
    });
    setShowDedRuleModal(true);
  };

  const handleOpenEditAllRule = (rule: AllowanceRule) => {
    setEditingAllRule(rule);
    setAllRuleForm({
      rule_name: rule.rule_name || '',
      scope_type: (rule.scope_type as RuleScope) || 'general',
      scope_id: rule.scope_id ?? null,
      calc_type: (rule.calc_type as CalcType) || (rule.percentage_value ? 'percentage' : 'fixed'),
      rate_unit: rule.rate_unit || 'per_month',
      fixed_amount: rule.fixed_amount ?? rule.amount ?? 25000,
      percentage_value: rule.percentage_value ?? 10,
      multiplier_value: rule.multiplier_value ?? 1,
      custom_formula: rule.custom_formula || rule.formula || '',
      is_active: rule.is_active !== undefined ? rule.is_active : true,
    });
    setShowAllRuleModal(true);
  };

  // Sorting for Slips
  const [slipSortKey, setSlipSortKey] = useState<string | null>('period_start');
  const [slipSortDir, setSlipSortDir] = useState<SortDirection>('desc');

  const handleSortSlip = (key: string) => {
    if (slipSortKey === key) {
      if (slipSortDir === 'asc') setSlipSortDir('desc');
      else if (slipSortDir === 'desc') {
        setSlipSortKey(null);
        setSlipSortDir(null);
      }
    } else {
      setSlipSortKey(key);
      setSlipSortDir('asc');
    }
  };

  const sortedSlips = sortTableData(payrollSlips, slipSortKey, slipSortDir);

  // Sorting for Master Employees
  const [masterEmpSortKey, setMasterEmpSortKey] = useState<string | null>('nip');
  const [masterEmpSortDir, setMasterEmpSortDir] = useState<SortDirection>('asc');

  const handleSortMasterEmp = (key: string) => {
    if (masterEmpSortKey === key) {
      if (masterEmpSortDir === 'asc') setMasterEmpSortDir('desc');
      else if (masterEmpSortDir === 'desc') {
        setMasterEmpSortKey(null);
        setMasterEmpSortDir(null);
      }
    } else {
      setMasterEmpSortKey(key);
      setMasterEmpSortDir('asc');
    }
  };

  const sortedMasterEmployees = sortTableData(employees, masterEmpSortKey, masterEmpSortDir);

  // Active employees filter (excludes inactive status)
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status !== 'inactive');
  }, [employees]);

  // Simulator State
  const [simEmployeeId, setSimEmployeeId] = useState<number | 'custom'>('custom');
  const [simBaseRate, setSimBaseRate] = useState<number>(25000);
  const [simWorkedDays, setSimWorkedDays] = useState<number>(22);
  const [simWorkedHours, setSimWorkedHours] = useState<number>(176);
  const [simOtHours, setSimOtHours] = useState<number>(10);
  const [simOtMultiplier, setSimOtMultiplier] = useState<number>(1.5);
  const [simLateCount, setSimLateCount] = useState<number>(2);
  const [simIsExemptFromLateness, setSimIsExemptFromLateness] = useState<boolean>(false);
  const [simSelectedAllowances, setSimSelectedAllowances] = useState<number[]>([]);
  const [simSelectedDeductions, setSimSelectedDeductions] = useState<number[]>([]);
  const [simRuleUnits, setSimRuleUnits] = useState<Record<number, 'per_day' | 'per_month'>>({});

  // Auto initialize active rules into simulator
  useEffect(() => {
    if (allowanceRules.length > 0 && simSelectedAllowances.length === 0) {
      setSimSelectedAllowances(allowanceRules.filter(r => r.is_active !== false).map(r => r.id));
    }
    if (deductionRules.length > 0 && simSelectedDeductions.length === 0) {
      setSimSelectedDeductions(deductionRules.filter(r => r.is_active !== false).map(r => r.id));
    }
  }, [allowanceRules, deductionRules]);

  // Handle employee selection in simulator
  const handleSimEmployeeChange = (empIdStr: string) => {
    if (empIdStr === 'custom') {
      setSimEmployeeId('custom');
      return;
    }
    const empId = Number(empIdStr);
    setSimEmployeeId(empId);
    const emp = employees.find((e) => Number(e.id) === empId);
    if (emp) {
      setSimBaseRate(emp.base_salary || 25000);
      const jgName = (emp.job_grade_name || '').toLowerCase();
      const isExempt = jgName.includes('direksi') || jgName.includes('manager') || jgName.includes('pejabat') || jgName.includes('supervisor');
      setSimIsExemptFromLateness(isExempt);
    }
  };

  // Live simulation calculation variables
  const simEarnedBase = useMemo(() => simWorkedHours * simBaseRate, [simWorkedHours, simBaseRate]);
  const simEarnedOt = useMemo(() => simOtHours * (simBaseRate * simOtMultiplier), [simOtHours, simBaseRate, simOtMultiplier]);

  const simAllowanceItems = useMemo(() => {
    if (simWorkedHours === 0 && simWorkedDays === 0) return [];
    return allowanceRules
      .filter((r) => simSelectedAllowances.includes(r.id))
      .map((r) => {
        let baseAmount = 0;
        if (r.calc_type === 'percentage') {
          baseAmount = ((r.percentage_value || 0) / 100) * simEarnedBase;
        } else {
          baseAmount = Number(r.fixed_amount ?? r.amount ?? 0);
        }
        const unitChoice = simRuleUnits[r.id] || r.rate_unit || 'per_month';
        const isPerDay = unitChoice === 'per_day';
        const amount = isPerDay ? baseAmount * (simWorkedDays || 22) : baseAmount;
        return {
          id: r.id,
          name: r.rule_name,
          calcType: r.calc_type,
          rateUnit: unitChoice,
          val: isPerDay
            ? `${formatRupiah(baseAmount)}/Hari (${simWorkedDays || 22}h = ${formatRupiah(amount)})`
            : (r.calc_type === 'percentage' ? `${r.percentage_value}% (${formatRupiah(amount)})` : `${formatRupiah(amount)}/Bulan`),
          amount,
        };
      });
  }, [allowanceRules, simSelectedAllowances, simEarnedBase, simWorkedHours, simWorkedDays, simRuleUnits]);

  const simTotalAllowances = useMemo(() => {
    if (simWorkedHours === 0 && simWorkedDays === 0) return 0;
    return simAllowanceItems.reduce((sum, item) => sum + item.amount, 0);
  }, [simAllowanceItems, simWorkedHours, simWorkedDays]);
  const simGrossSalary = useMemo(() => simEarnedBase + simEarnedOt + simTotalAllowances, [simEarnedBase, simEarnedOt, simTotalAllowances]);

  const simDeductionItems = useMemo(() => {
    return deductionRules
      .filter((r) => simSelectedDeductions.includes(r.id))
      .map((r) => {
        const isLateRule = /terlambat|telat|denda|late/i.test(r.rule_name || '');
        let amount = 0;
        let note = '';

        if (isLateRule) {
          if (simIsExemptFromLateness) {
            amount = 0;
            note = 'Bebas Denda (Pengecualian Jabatan)';
          } else if (r.calc_type === 'percentage') {
            const perLate = ((r.percentage_value || 1) / 100) * simEarnedBase;
            amount = simLateCount * perLate;
            note = `${simLateCount}x Telat @ ${r.percentage_value}%/kejadian`;
          } else {
            const perLate = Number(r.fixed_amount ?? r.amount ?? 25000);
            amount = simLateCount * perLate;
            note = `${simLateCount}x Telat @ ${formatRupiah(perLate)}`;
          }
        } else if (r.calc_type === 'percentage') {
          amount = ((r.percentage_value || 0) / 100) * simEarnedBase;
          note = `${r.percentage_value}% dari Upah Pokok`;
        } else {
          amount = Number(r.fixed_amount ?? r.amount ?? 0);
          note = 'Tetap (Fixed)';
        }

        return {
          id: r.id,
          name: r.rule_name,
          calcType: r.calc_type,
          note,
          amount,
        };
      });
  }, [deductionRules, simSelectedDeductions, simEarnedBase, simLateCount, simIsExemptFromLateness]);

  const simTotalDeductions = useMemo(() => simDeductionItems.reduce((sum, item) => sum + item.amount, 0), [simDeductionItems]);
  const simNetSalary = useMemo(() => Math.max(0, simGrossSalary - simTotalDeductions), [simGrossSalary, simTotalDeductions]);

  // Preset handlers
  const handleApplySimPreset = (type: 'standard' | 'overtime' | 'exempt' | 'parttime') => {
    if (type === 'standard') {
      setSimWorkedDays(22);
      setSimWorkedHours(176);
      setSimOtHours(0);
      setSimLateCount(0);
      setSimIsExemptFromLateness(false);
      toast.info('Preset Diterapkan', 'Standard 1 Bulan Full: 176 Jam, 0 Lembur, 0 Telat');
    } else if (type === 'overtime') {
      setSimWorkedDays(24);
      setSimWorkedHours(192);
      setSimOtHours(20);
      setSimOtMultiplier(1.5);
      setSimLateCount(2);
      toast.info('Preset Diterapkan', 'Standard + 20 Jam Lembur SPKL & 2x Telat');
    } else if (type === 'exempt') {
      setSimWorkedDays(22);
      setSimWorkedHours(176);
      setSimOtHours(10);
      setSimLateCount(3);
      setSimIsExemptFromLateness(true);
      toast.info('Preset Diterapkan', 'Karyawan Senior: Bebas Denda Keterlambatan');
    } else if (type === 'parttime') {
      setSimWorkedDays(10);
      setSimWorkedHours(80);
      setSimOtHours(0);
      setSimLateCount(0);
      setSimIsExemptFromLateness(false);
      toast.info('Preset Diterapkan', 'Part-Time / Contract: 80 Jam Kerja');
    }
  };

  // Copy simulation summary to clipboard
  const handleCopySimSummary = () => {
    const text = `=== HASIL SIMULASI GAJI KARYAWAN ===
Upah Pokok per Jam: ${formatRupiah(simBaseRate)}
Total Jam Kerja: ${simWorkedHours} Jam (${simWorkedDays} Hari)
Upah Pokok Diperoleh: ${formatRupiah(simEarnedBase)}
SPKL Lembur: ${simOtHours} Jam (${simOtMultiplier}x) = ${formatRupiah(simEarnedOt)}
Total Tunjangan: ${formatRupiah(simTotalAllowances)}
---------------------------------------------
TOTAL GAJI KOTOR: ${formatRupiah(simGrossSalary)}
TOTAL POTONGAN: ${formatRupiah(simTotalDeductions)}
=============================================
ESTIMASI TAKE HOME PAY: ${formatRupiah(simNetSalary)}`;

    navigator.clipboard.writeText(text);
    toast.success('Disalin ke Clipboard', 'Ringkasan simulasi gaji telah disalin.');
  };

  // Export PDF of simulation
  const handlePrintSimulationPdf = () => {
    const activeComp = companyProfile || companyName;
    const compLabel = companyProfile?.company_name || companyName;
    const targetEmpObj = employees.find(e => e.id === simEmployeeId);
    const empName = targetEmpObj ? `${targetEmpObj.full_name} (${targetEmpObj.nip})` : 'Simulasi Kustom / Manual';
    
    const headers = ['Komponen Perhitungan Gaji', 'Keterangan', 'Jumlah (IDR)'];
    const rows = [
      ['Upah Pokok Kerja', `${simWorkedHours} Jam @ ${formatRupiah(simBaseRate)}/Jam`, formatRupiah(simEarnedBase)],
      ['Upah Lembur SPKL', `${simOtHours} Jam (Kelipatan ${simOtMultiplier}x)`, formatRupiah(simEarnedOt)],
      ...simAllowanceItems.map(a => [`Tunjangan: ${a.name}`, a.val, formatRupiah(a.amount)]),
      ['TOTAL PENDAPATAN (GAJI KOTOR)', 'Subtotal Penerimaan', formatRupiah(simGrossSalary)],
      ...simDeductionItems.map(d => [`Potongan: ${d.name}`, d.note, `-${formatRupiah(d.amount)}`]),
      ['TOTAL POTONGAN GAJI', 'Subtotal Potongan', `-${formatRupiah(simTotalDeductions)}`],
      ['ESTIMASI GAJI BERSIH (TAKE HOME PAY)', 'Bersih Diterima Karyawan', formatRupiah(simNetSalary)],
    ];

    exportToPdfPrint(
      `SIMULASI PERHITUNGAN GAJI - ${compLabel}`,
      `Target: ${empName} | Rate: ${formatRupiah(simBaseRate)}/jam | Mode Sandbox Simulator`,
      headers,
      rows,
      activeComp
    );
  };

  // Generator State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genEmployeeId, setGenEmployeeId] = useState<number | 'all'>('all');
  const [genPeriodStart, setGenPeriodStart] = useState('2026-09-01');
  const [genPeriodEnd, setGenPeriodEnd] = useState('2026-09-30');
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const [showDailyBreakdownInModal, setShowDailyBreakdownInModal] = useState(false);

  // Calculate live preview for generator using strict payroll rules
  const targetEmployee = employees.find((e) => e.id === Number(genEmployeeId)) || activeEmployees[0] || employees[0];
  // Dynamically determine applicable overtime rule for targetEmployee based on division/job_grade/general
  const applicableOtRule = useMemo(() => {
    if (!targetEmployee) return null;
    const activeRules = overtimeRules.filter((r) => r.is_active !== false);
    return (
      activeRules.find((r) => r.scope_type === 'division' && Number(r.scope_id) === Number(targetEmployee.division_id)) ||
      activeRules.find((r) => r.scope_type === 'job_grade' && Number(r.scope_id) === Number(targetEmployee.job_grade_id)) ||
      activeRules.find((r) => r.scope_type === 'general') ||
      activeRules[0] ||
      null
    );
  }, [targetEmployee, overtimeRules]);

  const otMultiplier = applicableOtRule?.multiplier_value ?? applicableOtRule?.multiplier ?? 1.5;

  const workHoursSummary = useMemo(() => {
    if (!targetEmployee || genEmployeeId === 'all') return null;
    let tierSlots = applicableOtRule?.tier_slots;
    if (!tierSlots && applicableOtRule?.custom_formula && applicableOtRule.custom_formula.trim().startsWith('[')) {
      try {
        tierSlots = JSON.parse(applicableOtRule.custom_formula);
      } catch {}
    }
    return calculateEmployeeWorkHours(
      targetEmployee,
      attendanceLogs,
      overtimeRequests,
      genPeriodStart,
      genPeriodEnd,
      otMultiplier,
      schedules,
      schedulePlots,
      tierSlots
    );
  }, [targetEmployee, genEmployeeId, attendanceLogs, overtimeRequests, genPeriodStart, genPeriodEnd, otMultiplier, schedules, schedulePlots, applicableOtRule]);

  const totalWorkedDays = workHoursSummary?.totalWorkedDays || 0;
  const estimatedHours = workHoursSummary?.totalRegularHours || 0;
  const totalOtHours = workHoursSummary?.totalOvertimeHours || 0;

  const baseRate = targetEmployee?.base_salary || 25000;
  const earnedBase = workHoursSummary?.earnedBasePay ?? (estimatedHours * baseRate);
  
  // Calculate overtime pay based on calculation type and rate unit of applicable rule
  const earnedOt = useMemo(() => {
    if (!applicableOtRule) {
      return workHoursSummary?.earnedOvertimePay ?? (totalOtHours * baseRate * otMultiplier);
    }
    const unit = applicableOtRule.rate_unit || 'per_hour';
    
    // Approved overtimes count and unique days
    const empApprovedOvertimes = overtimeRequests.filter(
      (o) =>
        targetEmployee &&
        Number(o.employee_id) === Number(targetEmployee.id) &&
        o.status === 'approved' &&
        o.overtime_date >= genPeriodStart &&
        o.overtime_date <= genPeriodEnd
    );
    const spklCount = empApprovedOvertimes.length;
    const otDaysCount = new Set(empApprovedOvertimes.map((o) => o.overtime_date)).size;

    if (applicableOtRule.calc_type === 'fixed' && applicableOtRule.fixed_amount) {
      const fixed = applicableOtRule.fixed_amount;
      if (unit === 'per_3_hours') {
        return Math.round((totalOtHours / 3) * fixed);
      } else if (unit === 'per_day') {
        return (otDaysCount > 0 ? otDaysCount : (totalOtHours > 0 ? 1 : 0)) * fixed;
      } else if (unit === 'per_spkl') {
        return (spklCount > 0 ? spklCount : (totalOtHours > 0 ? 1 : 0)) * fixed;
      }
      return Math.round(totalOtHours * fixed);
    }

    if (applicableOtRule.calc_type === 'multiplier') {
      if (unit === 'per_3_hours') {
        return Math.round((totalOtHours / 3) * baseRate * otMultiplier);
      } else if (unit === 'per_day') {
        const dailyRate = targetEmployee?.daily_salary || (baseRate * 8);
        return Math.round((otDaysCount > 0 ? otDaysCount : (totalOtHours > 0 ? 1 : 0)) * dailyRate * otMultiplier);
      } else if (unit === 'per_spkl') {
        return Math.round((spklCount > 0 ? spklCount : (totalOtHours > 0 ? 1 : 0)) * baseRate * otMultiplier);
      }
    }

    return workHoursSummary?.earnedOvertimePay ?? (totalOtHours * baseRate * otMultiplier);
  }, [applicableOtRule, totalOtHours, baseRate, otMultiplier, workHoursSummary, overtimeRequests, targetEmployee, genPeriodStart, genPeriodEnd]);

  // Dynamically resolve applicable allowance rules for employee
  const applicableAllowances = useMemo(() => {
    if (!targetEmployee) return [];
    return allowanceRules.filter((r) => {
      if (r.is_active === false) return false;
      if (r.scope_type === 'division') return Number(r.scope_id) === Number(targetEmployee.division_id);
      if (r.scope_type === 'job_grade') return Number(r.scope_id) === Number(targetEmployee.job_grade_id);
      return true; // general
    });
  }, [targetEmployee, allowanceRules]);

  const totalAllowances = useMemo(() => {
    // jika 0 poin / 0 jam kerja / 0 hari hadir, tidak usah dikeluarkan allowance nya
    if (estimatedHours === 0 && totalWorkedDays === 0) {
      return 0;
    }
    if (applicableAllowances.length === 0) {
      return (totalWorkedDays * 25000) + (totalWorkedDays * 15000);
    }
    return applicableAllowances.reduce((sum, r) => {
      let baseAmt = 0;
      if (r.calc_type === 'percentage' && r.percentage_value) {
        baseAmt = ((r.percentage_value / 100) * earnedBase);
      } else {
        baseAmt = Number(r.fixed_amount ?? r.amount ?? 0);
      }
      return sum + (r.rate_unit === 'per_day' ? baseAmt * (totalWorkedDays || 1) : baseAmt);
    }, 0);
  }, [applicableAllowances, totalWorkedDays, baseRate, estimatedHours, earnedBase]);

  // Dynamically resolve applicable deduction rules for employee
  const applicableDeductions = useMemo(() => {
    if (!targetEmployee) return [];
    return deductionRules.filter((r) => {
      if (r.is_active === false) return false;
      if (r.scope_type === 'division') return Number(r.scope_id) === Number(targetEmployee.division_id);
      if (r.scope_type === 'job_grade') return Number(r.scope_id) === Number(targetEmployee.job_grade_id);
      return true; // general
    });
  }, [targetEmployee, deductionRules]);

  const targetGrade = jobGrades?.find((g) => Number(g.id) === Number(targetEmployee?.job_grade_id));
  const isTargetExemptFromLateness = Boolean(targetGrade?.is_exempt_from_lateness);

  const empLogs = attendanceLogs.filter(
    (l) => l.employee_id === targetEmployee?.id && l.log_date >= genPeriodStart && l.log_date <= genPeriodEnd
  );
  const lateCount = isTargetExemptFromLateness ? 0 : empLogs.filter((l) => l.status === 'late').length;

  const grossSalary = earnedBase + earnedOt + totalAllowances;

  const totalDeductions = useMemo(() => {
    return applicableDeductions.reduce((sum, r) => {
      const isLateRule = /terlambat|telat|denda|late/i.test(r.rule_name || '');
      if (isLateRule) {
        if (isTargetExemptFromLateness) return sum;
        if (r.calc_type === 'percentage' && r.percentage_value) {
          return sum + (lateCount * ((r.percentage_value / 100) * earnedBase));
        }
        return sum + (lateCount * Number(r.fixed_amount ?? r.amount ?? 0));
      }
      if (r.calc_type === 'percentage' && r.percentage_value) {
        return sum + ((r.percentage_value / 100) * earnedBase);
      }
      return sum + Number(r.fixed_amount ?? r.amount ?? 0);
    }, 0);
  }, [applicableDeductions, lateCount, earnedBase, isTargetExemptFromLateness]);

  const deductionItems = useMemo(() => {
    return applicableDeductions.map((r) => {
      const isLateRule = /terlambat|telat|denda|late/i.test(r.rule_name || '');
      let amount = 0;
      if (isLateRule) {
        if (isTargetExemptFromLateness) {
          amount = 0;
        } else if (r.calc_type === 'percentage' && r.percentage_value) {
          amount = lateCount * ((r.percentage_value / 100) * earnedBase);
        } else {
          amount = lateCount * Number(r.fixed_amount ?? r.amount ?? 0);
        }
      } else if (r.calc_type === 'percentage' && r.percentage_value) {
        amount = (r.percentage_value / 100) * earnedBase;
      } else {
        amount = Number(r.fixed_amount ?? r.amount ?? 0);
      }
      return {
        id: r.id,
        rule_name: r.rule_name,
        isLateRule,
        calc_type: r.calc_type,
        percentage_value: r.percentage_value,
        fixed_amount: Number(r.fixed_amount ?? r.amount ?? 0),
        amount,
      };
    });
  }, [applicableDeductions, lateCount, earnedBase, isTargetExemptFromLateness]);

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Batch calculations for ACTIVE employees only
  const allCalculations = useMemo(() => {
    if (genEmployeeId !== 'all') return [];
    return activeEmployees.map((emp) => {
      const activeOtRule = overtimeRules.filter(r => r.is_active !== false).find(r =>
        (r.scope_type === 'division' && Number(r.scope_id) === Number(emp.division_id)) ||
        (r.scope_type === 'job_grade' && Number(r.scope_id) === Number(emp.job_grade_id)) ||
        (r.scope_type === 'general')
      ) || overtimeRules[0];
      const otMult = activeOtRule?.multiplier_value ?? activeOtRule?.multiplier ?? 1.5;

      const summary = calculateEmployeeWorkHours(
        emp,
        attendanceLogs,
        overtimeRequests,
        genPeriodStart,
        genPeriodEnd,
        otMult,
        schedules,
        schedulePlots
      );

      const bRate = emp.base_salary || 25000;
      const eBase = summary.earnedBasePay;
      let eOt = summary.earnedOvertimePay;

      if (activeOtRule) {
        const unit = activeOtRule.rate_unit || 'per_hour';
        const empOts = overtimeRequests.filter(
          (o) =>
            Number(o.employee_id) === Number(emp.id) &&
            o.status === 'approved' &&
            o.overtime_date >= genPeriodStart &&
            o.overtime_date <= genPeriodEnd
        );
        const spklCount = empOts.length;
        const otDaysCount = new Set(empOts.map((o) => o.overtime_date)).size;

        if (activeOtRule.calc_type === 'fixed' && activeOtRule.fixed_amount) {
          const fixed = activeOtRule.fixed_amount;
          if (unit === 'per_3_hours') {
            eOt = Math.round((summary.totalOvertimeHours / 3) * fixed);
          } else if (unit === 'per_day') {
            eOt = (otDaysCount > 0 ? otDaysCount : (summary.totalOvertimeHours > 0 ? 1 : 0)) * fixed;
          } else if (unit === 'per_spkl') {
            eOt = (spklCount > 0 ? spklCount : (summary.totalOvertimeHours > 0 ? 1 : 0)) * fixed;
          } else {
            eOt = Math.round(summary.totalOvertimeHours * fixed);
          }
        } else if (activeOtRule.calc_type === 'multiplier') {
          if (unit === 'per_3_hours') {
            eOt = Math.round((summary.totalOvertimeHours / 3) * bRate * otMult);
          } else if (unit === 'per_day') {
            const dailyRate = emp.daily_salary || (bRate * 8);
            eOt = Math.round((otDaysCount > 0 ? otDaysCount : (summary.totalOvertimeHours > 0 ? 1 : 0)) * dailyRate * otMult);
          } else if (unit === 'per_spkl') {
            eOt = Math.round((spklCount > 0 ? spklCount : (summary.totalOvertimeHours > 0 ? 1 : 0)) * bRate * otMult);
          }
        }
      }

      const appAllowances = allowanceRules.filter(r => {
        if (r.is_active === false) return false;
        if (r.scope_type === 'division') return Number(r.scope_id) === Number(emp.division_id);
        if (r.scope_type === 'job_grade') return Number(r.scope_id) === Number(emp.job_grade_id);
        return true;
      });

      const isZeroPoints = summary.totalRegularHours === 0 && summary.totalWorkedDays === 0;
      const tAllow = isZeroPoints
        ? 0
        : (appAllowances.length === 0
          ? (summary.totalWorkedDays * 25000) + (summary.totalWorkedDays * 15000)
          : appAllowances.reduce((sum, r) => {
              let baseAmt = 0;
              if (r.calc_type === 'percentage' && r.percentage_value) {
                baseAmt = ((r.percentage_value / 100) * eBase);
              } else {
                baseAmt = Number(r.fixed_amount ?? r.amount ?? 0);
              }
              return sum + (r.rate_unit === 'per_day' ? baseAmt * (summary.totalWorkedDays || 1) : baseAmt);
            }, 0));

      const empGrade = jobGrades?.find(g => Number(g.id) === Number(emp.job_grade_id));
      const isExempt = Boolean(empGrade?.is_exempt_from_lateness);
      const eLogs = attendanceLogs.filter(l => l.employee_id === emp.id && l.log_date >= genPeriodStart && l.log_date <= genPeriodEnd);
      const late = isExempt ? 0 : eLogs.filter(l => l.status === 'late').length;

      const appDeductions = deductionRules.filter(r => {
        if (r.is_active === false) return false;
        if (r.scope_type === 'division') return Number(r.scope_id) === Number(emp.division_id);
        if (r.scope_type === 'job_grade') return Number(r.scope_id) === Number(emp.job_grade_id);
        return true;
      });

      const tDed = appDeductions.reduce((sum, r) => {
        const isLateRule = /terlambat|telat|denda|late/i.test(r.rule_name || '');
        if (isLateRule) {
          if (isExempt) return sum;
          if (r.calc_type === 'percentage' && r.percentage_value) {
            return sum + (late * ((r.percentage_value / 100) * eBase));
          }
          return sum + (late * Number(r.fixed_amount ?? r.amount ?? 0));
        }
        if (r.calc_type === 'percentage' && r.percentage_value) {
          return sum + ((r.percentage_value / 100) * eBase);
        }
        return sum + Number(r.fixed_amount ?? r.amount ?? 0);
      }, 0);

      const net = Math.max(0, eBase + eOt + tAllow - tDed);

      return {
        employee: emp,
        summary,
        hours: summary.totalRegularHours,
        otHours: summary.totalOvertimeHours,
        earnedBase: eBase,
        earnedOt: eOt,
        totalAllowances: tAllow,
        totalDeductions: tDed,
        netSalary: net,
      };
    });
  }, [genEmployeeId, activeEmployees, attendanceLogs, overtimeRequests, genPeriodStart, genPeriodEnd, overtimeRules, allowanceRules, deductionRules, schedules, schedulePlots, jobGrades]);

  const handleRunGenerate = async () => {
    if (genEmployeeId === 'all') {
      setShowBatchConfirmModal(true);
      return;
    }
    await onGeneratePayroll({
      employee_id: targetEmployee.id,
      period_start: genPeriodStart,
      period_end: genPeriodEnd,
      total_hours: estimatedHours,
      overtime_hours: totalOtHours,
      base_salary_earned: earnedBase,
      overtime_pay: earnedOt,
      allowances_amount: totalAllowances,
      deductions_amount: totalDeductions,
      net_salary: netSalary,
    });
    setShowGenerateModal(false);
  };

  const handleBatchGenerateConfirm = async () => {
    setIsGeneratingBatch(true);
    try {
      for (const calc of allCalculations) {
        await onGeneratePayroll({
          employee_id: calc.employee.id,
          period_start: genPeriodStart,
          period_end: genPeriodEnd,
          total_hours: calc.hours,
          overtime_hours: calc.otHours,
          base_salary_earned: calc.earnedBase,
          overtime_pay: calc.earnedOt,
          allowances_amount: calc.totalAllowances,
          deductions_amount: calc.totalDeductions,
          net_salary: calc.netSalary,
        });
      }
      setShowBatchConfirmModal(false);
      setShowGenerateModal(false);
    } catch (err) {
      console.error('Batch generation error:', err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Export Slips
  const handleExportSlipsExcel = () => {
    const data = sortedSlips.map((s, idx) => ({
      No: idx + 1,
      NIP: s.employee_nip || '-',
      Nama_Karyawan: s.employee_name || '-',
      Tanggal_Mulai: formatDateDDMMYYYY(s.period_start),
      Tanggal_Selesai: formatDateDDMMYYYY(s.period_end),
      Total_Jam_Kerja: s.total_hours,
      Jam_Lembur: s.overtime_hours,
      Upah_Pokok_Rp: s.base_salary_earned,
      Upah_Lembur_Rp: s.overtime_pay,
      Tunjangan_Rp: s.allowances_amount,
      Potongan_Rp: s.deductions_amount,
      Gaji_Bersih_Rp: s.net_salary,
      Status: s.status.toUpperCase(),
    }));
    const activeComp = companyProfile || companyName;
    const compLabel = companyProfile?.company_name || companyName;
    exportToExcel(
      data,
      `Rekapitulasi_Payroll_${getCompanyInitials(compLabel)}`,
      'Payroll',
      activeComp,
      'Rekapitulasi Slip Gaji Karyawan'
    );
  };

  const handleExportSlipsPdf = () => {
    const activeComp = companyProfile || companyName;
    const compLabel = companyProfile?.company_name || companyName;
    const headers = ['NIP', 'Karyawan', 'Tgl Mulai', 'Tgl Selesai', 'Jam', 'Upah Pokok', 'Lembur', 'Tunjangan', 'Potongan', 'Take Home Pay'];
    const rows = sortedSlips.map((s) => [
      s.employee_nip || '-',
      s.employee_name || '-',
      formatDateDDMMYYYY(s.period_start),
      formatDateDDMMYYYY(s.period_end),
      `${s.total_hours}h`,
      formatRupiah(s.base_salary_earned),
      formatRupiah(s.overtime_pay),
      formatRupiah(s.allowances_amount),
      formatRupiah(s.deductions_amount),
      formatRupiah(s.net_salary),
    ]);
    exportToPdfPrint(
      `Rekapitulasi Slip Gaji Karyawan ${compLabel}`,
      `Total: ${rows.length} Slip Periode Terbit`,
      headers,
      rows,
      activeComp
    );
  };

  // Print individual slip
  const handlePrintIndividualSlip = (slip: PayrollSlip) => {
    const activeComp = companyProfile || companyName;
    const compLabel = companyProfile?.company_name || companyName;
    const headers = ['Komponen Penghasilan & Potongan', 'Jumlah (IDR)'];
    const rows = [
      ['Upah Pokok Kerja (' + slip.total_hours + ' Jam @ ' + formatRupiah((employees.find(e => e.id === slip.employee_id)?.base_salary || 25000)) + ')', formatRupiah(slip.base_salary_earned)],
      ['Upah Lembur SPKL (' + slip.overtime_hours + ' Jam)', formatRupiah(slip.overtime_pay)],
      ['Tunjangan Makan & Operasional Batching', formatRupiah(slip.allowances_amount)],
      ['Total Potongan Gaji', '-' + formatRupiah(slip.deductions_amount)],
      ['TOTAL GAJI BERSIH (TAKE HOME PAY)', formatRupiah(slip.net_salary)],
    ];
    exportToPdfPrint(
      `SLIP GAJI KARYAWAN - ${compLabel}`,
      `NIP: ${slip.employee_nip || '-'} | Nama: ${slip.employee_name || '-'} | Periode: ${formatDateDDMMYYYY(slip.period_start)} s/d ${formatDateDDMMYYYY(slip.period_end)}`,
      headers,
      rows,
      activeComp
    );
  };

  return (
    <div id="payroll-management-view" className="space-y-6">
      {/* Title & Sub-tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-600" />
            Management Gaji & Slip Payroll
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Kalkulasi otomatis gaji karyawan berdasarkan presensi kerja, SPKL lembur, rule tunjangan, dan denda keterlambatan
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl">
          <button
            onClick={() => setSubTab('slips')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'slips'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'slips'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Dashboard Slip Gaji ({payrollSlips.length})
          </button>
          <button
            onClick={() => setSubTab('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'master'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'master'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Master Data Payroll
          </button>
          <button
            onClick={() => setSubTab('simulation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'simulation'
                ? 'shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'simulation'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulasi Gaji</span>
          </button>
          <button
            onClick={() => setSubTab('overtime_rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'overtime_rules'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'overtime_rules'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Rule Lembur
          </button>
          <button
            onClick={() => setSubTab('allowances')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'allowances'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'allowances'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Rule Tunjangan
          </button>
          <button
            onClick={() => setSubTab('deductions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'deductions'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'deductions'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Rule Potongan
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DASHBOARD SLIP GAJI */}
      {subTab === 'slips' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Daftar slip gaji periode yang telah di-generate, siap cetak atau ekspor
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncTable('payroll_slips')}
                disabled={isSyncingTable === 'payroll_slips'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data slip gaji dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'payroll_slips' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'payroll_slips' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportSlipsExcel}
                onExportPdf={handleExportSlipsPdf}
                label="Export Slip Gaji"
              />
              <button
                onClick={() => setSubTab('simulation')}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shadow-xs"
                title="Buka simulator & sandbox kalkulasi gaji"
              >
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Simulasi Gaji</span>
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Calculator className="w-4 h-4" />
                Kalkulasi & Generate Slip Gaji
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <SortableTh sortKey="employee_name" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Karyawan
                    </SortableTh>
                    <SortableTh sortKey="period_start" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Tgl Mulai
                    </SortableTh>
                    <SortableTh sortKey="period_end" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Tgl Selesai
                    </SortableTh>
                    <SortableTh sortKey="total_hours" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Jam Kerja
                    </SortableTh>
                    <SortableTh sortKey="base_salary_earned" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Upah Pokok
                    </SortableTh>
                    <SortableTh sortKey="overtime_pay" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Lembur
                    </SortableTh>
                    <SortableTh sortKey="allowances_amount" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Tunjangan
                    </SortableTh>
                    <SortableTh sortKey="deductions_amount" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Potongan
                    </SortableTh>
                    <SortableTh sortKey="net_salary" currentSortKey={slipSortKey} currentSortDirection={slipSortDir} onSort={handleSortSlip}>
                      Take Home Pay
                    </SortableTh>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {sortedSlips.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-300">
                        Belum ada slip gaji yang di-generate. Klik tombol "Kalkulasi & Generate Slip Gaji" untuk memulai.
                      </td>
                    </tr>
                  ) : (
                    sortedSlips.map((slip, idx) => (
                      <tr key={slip.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {slip.employee_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
                            NIP: {slip.employee_nip}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {slip.period_start ? formatDateDDMMYYYY(slip.period_start) : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {slip.period_end ? formatDateDDMMYYYY(slip.period_end) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {slip.total_hours} Jam
                          </div>
                          <div className="text-[10px] text-purple-600 font-semibold">
                            +{slip.overtime_hours}h Lembur
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatRupiah(slip.base_salary_earned)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-purple-600 dark:text-purple-400">
                          +{formatRupiah(slip.overtime_pay)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          +{formatRupiah(slip.allowances_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-rose-600 dark:text-rose-400">
                          -{formatRupiah(slip.deductions_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                          {formatRupiah(slip.net_salary)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedSlip(slip)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Lihat Detail Slip"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintIndividualSlip(slip)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Cetak PDF Slip Gaji"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditSlip(slip)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                              title="Edit Slip Gaji"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptDeleteSlip(slip)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Hapus Slip Gaji"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MASTER DATA PAYROLL */}
      {subTab === 'master' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tabel upah dasar per jam, outstanding point jam kerja, & estimasi gaji seluruh karyawan
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubTab('deductions')}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Setting Rate Potongan Telat</span>
              </button>
              <button
                onClick={() => handleSyncTable('employees')}
                disabled={isSyncingTable === 'employees'}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data master karyawan dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'employees' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'employees' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <SortableTh sortKey="nip" currentSortKey={masterEmpSortKey} currentSortDirection={masterEmpSortDir} onSort={handleSortMasterEmp}>
                    NIP
                  </SortableTh>
                  <SortableTh sortKey="full_name" currentSortKey={masterEmpSortKey} currentSortDirection={masterEmpSortDir} onSort={handleSortMasterEmp}>
                    Nama Karyawan
                  </SortableTh>
                  <SortableTh sortKey="division_name" currentSortKey={masterEmpSortKey} currentSortDirection={masterEmpSortDir} onSort={handleSortMasterEmp}>
                    Divisi & Golongan
                  </SortableTh>
                  <SortableTh sortKey="base_salary" currentSortKey={masterEmpSortKey} currentSortDirection={masterEmpSortDir} onSort={handleSortMasterEmp}>
                    Upah / Jam (IDR)
                  </SortableTh>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400">
                    Outstanding Point (Jam Kerja)
                  </th>
                  <th className="py-3 px-4">Estimasi Gaji Bulanan</th>
                  <SortableTh sortKey="status" currentSortKey={masterEmpSortKey} currentSortDirection={masterEmpSortDir} onSort={handleSortMasterEmp}>
                    Status
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                {sortedMasterEmployees.map((emp, idx) => {
                  const empAttendance = attendanceLogs.filter((l) => Number(l.employee_id) === Number(emp.id));
                  const outstandingPoints = empAttendance.reduce((sum, log) => {
                    if (log.work_hours && log.work_hours > 0) return sum + log.work_hours;
                    if (log.clock_in && log.clock_out) return sum + 8;
                    return sum + 8;
                  }, 0);
                  const displayPoints = outstandingPoints > 0 ? outstandingPoints : 176;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{emp.nip}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{emp.full_name}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.division_name} ({emp.job_grade_name})</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">{formatRupiah(emp.base_salary)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {displayPoints} Poin <span className="text-[10px] text-slate-400 font-normal">({formatRupiah(displayPoints * emp.base_salary)})</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">{formatRupiah(emp.base_salary * 176)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {emp.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RULE MAPPING LEMBUR */}
      {subTab === 'overtime_rules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Aturan Perhitungan Upah Lembur</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Aturan besaran upah lembur per jam berdasarkan target cakupan divisi, golongan, atau berlaku umum
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncTable('overtime_rules')}
                disabled={isSyncingTable === 'overtime_rules'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi rule lembur dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'overtime_rules' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'overtime_rules' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <button
                onClick={() => {
                  setEditingOtRule(null);
                  setOtRuleForm({
                    rule_name: '',
                    scope_type: 'general',
                    scope_id: null,
                    calc_type: 'timeslot',
                    multiplier_value: 1.5,
                    fixed_amount: 50000,
                    percentage_value: 10,
                    custom_formula: '',
                    tier_slots: [
                      { id: '1', time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot Sore (+Rp 50.000)' },
                      { id: '2', time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot Malam (2x Gaji Pokok 1 Hari)' },
                      { id: '3', time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot Dini Hari (3x Gaji Pokok 1 Hari)' },
                    ],
                    is_active: true,
                  });
                  setShowOtRuleModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Rule Lembur
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {overtimeRules.map((rule) => (
              <div
                key={rule.id}
                className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-[#27272a] shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200 space-y-3.5"
              >
                {/* Top: Scope & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                      {rule.scope_type === 'division' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span>Divisi: {getDivisionName(rule.scope_id)}</span>
                        </span>
                      ) : rule.scope_type === 'job_grade' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                          <Award className="w-3 h-3 shrink-0" />
                          <span>Golongan: {getJobGradeName(rule.scope_id)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>Semua Karyawan (Umum)</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight truncate" title={rule.rule_name}>
                      {rule.rule_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditOtRule(rule)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                      title="Edit Rule Lembur"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePromptDeleteRule(rule.id, 'ot', rule.rule_name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus Rule Lembur"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calculation Value */}
                <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/90 border border-slate-200/70 dark:border-[#27272a] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Besaran Upah Lembur
                    </span>
                    <div className="w-full">
                      {rule.calc_type === 'timeslot' ? (
                        <div className="space-y-1.5 w-full pt-0.5">
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">
                            Slot Jam Berjenjang ({((rule.tier_slots && rule.tier_slots.length > 0)
                              ? rule.tier_slots
                              : (rule.custom_formula && rule.custom_formula.trim().startsWith('[')
                                  ? (() => { try { return JSON.parse(rule.custom_formula); } catch { return []; } })()
                                  : []
                                )
                            ).length || 3} Tier):
                          </span>
                          <div className="space-y-1">
                            {((rule.tier_slots && rule.tier_slots.length > 0)
                              ? rule.tier_slots
                              : (rule.custom_formula && rule.custom_formula.trim().startsWith('[')
                                  ? (() => { try { return JSON.parse(rule.custom_formula); } catch { return []; } })()
                                  : [
                                      { time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot Sore' },
                                      { time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot Malam' },
                                      { time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot Dini Hari' },
                                    ]
                                )
                            ).map((slot: any, sIdx: number) => (
                              <div key={sIdx} className="flex items-center justify-between text-[11px] bg-purple-50/60 dark:bg-purple-950/30 px-2 py-0.5 rounded-md border border-purple-100/60 dark:border-purple-900/30">
                                <span className="font-mono font-bold text-purple-800 dark:text-purple-300">
                                  {slot.time_start} - {slot.time_end}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10.5px]">
                                  {slot.rate_type === 'fixed'
                                    ? `+${formatRupiah(slot.rate_value)}`
                                    : slot.rate_type === 'daily_multiplier'
                                    ? `${slot.rate_value}x Gaji 1 Hari`
                                    : `${slot.rate_value}x Upah/Jam`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : rule.calc_type === 'fixed' ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                            {formatRupiah(rule.fixed_amount || 0)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {rule.rate_unit === 'per_3_hours' ? '/ 3 Jam' : rule.rate_unit === 'per_day' ? '/ Hari' : rule.rate_unit === 'per_spkl' ? '/ SPKL (Tugas)' : '/ Jam'}
                          </span>
                        </div>
                      ) : rule.calc_type === 'percentage' ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                            {rule.percentage_value ?? 0}%
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">dari Gaji Pokok</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                            {rule.multiplier_value ?? rule.multiplier ?? 1.5}x
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {rule.rate_unit === 'per_3_hours' ? 'Kelipatan / 3 Jam' : rule.rate_unit === 'per_day' ? 'Kelipatan / Hari' : rule.rate_unit === 'per_spkl' ? 'Kelipatan / SPKL' : 'Kelipatan Upah'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                {/* Optional formula display */}
                {(rule.custom_formula || rule.formula) && (
                  <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-zinc-800/50 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-zinc-700/50 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{rule.custom_formula || rule.formula}</span>
                  </div>
                )}

                {/* Footer: Active Status & ID */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${rule.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className={`text-[11px] font-semibold ${rule.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {rule.is_active !== false ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">#OT-{rule.id}</span>
                </div>
              </div>
            ))}
            {overtimeRules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                Belum ada aturan lembur yang terdaftar. Klik tombol Tambah Rule Lembur untuk membuat aturan baru.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: RULE MAPPING ALLOWANCE */}
      {subTab === 'allowances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Aturan Tunjangan Karyawan</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tunjangan operasional, uang makan, dan transport terarah per divisi, golongan, atau seluruh karyawan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncTable('allowance_rules')}
                disabled={isSyncingTable === 'allowance_rules'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi rule tunjangan dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'allowance_rules' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'allowance_rules' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <button
                onClick={() => {
                  setEditingAllRule(null);
                  setAllRuleForm({
                    rule_name: '',
                    scope_type: 'general',
                    scope_id: null,
                    calc_type: 'fixed',
                    fixed_amount: 25000,
                    percentage_value: 10,
                    multiplier_value: 1,
                    custom_formula: '',
                    is_active: true,
                  });
                  setShowAllRuleModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Rule Tunjangan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allowanceRules.map((rule) => (
              <div
                key={rule.id}
                className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-[#27272a] shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200 space-y-3.5"
              >
                {/* Top: Scope & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                      {rule.scope_type === 'division' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span>Divisi: {getDivisionName(rule.scope_id)}</span>
                        </span>
                      ) : rule.scope_type === 'job_grade' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                          <Award className="w-3 h-3 shrink-0" />
                          <span>Golongan: {getJobGradeName(rule.scope_id)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>Semua Karyawan (Umum)</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight truncate" title={rule.rule_name}>
                      {rule.rule_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditAllRule(rule)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      title="Edit Rule Tunjangan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePromptDeleteRule(rule.id, 'allow', rule.rule_name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus Rule Tunjangan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calculation Value */}
                <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/90 border border-slate-200/70 dark:border-[#27272a] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Besaran Tunjangan
                    </span>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {rule.calc_type === 'percentage' ? (
                        <>
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {rule.percentage_value ?? 0}%
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">dari Gaji Pokok</span>
                        </>
                      ) : rule.calc_type === 'multiplier' ? (
                        <>
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {rule.multiplier_value ?? 1}x
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">Kelipatan</span>
                        </>
                      ) : (
                        <>
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatRupiah(rule.fixed_amount ?? rule.amount ?? 0)}
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                              {rule.rate_unit === 'per_day' ? '/ Hari' : '/ Bulan'}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Optional formula display */}
                {(rule.custom_formula || rule.formula) && (
                  <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-zinc-800/50 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-zinc-700/50 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{rule.custom_formula || rule.formula}</span>
                  </div>
                )}

                {/* Footer: Active Status & ID */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${rule.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className={`text-[11px] font-semibold ${rule.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {rule.is_active !== false ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">#AL-{rule.id}</span>
                </div>
              </div>
            ))}
            {allowanceRules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                Belum ada aturan tunjangan yang terdaftar. Klik tombol Tambah Rule Tunjangan untuk membuat aturan baru.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: RULE MAPPING POTONGAN */}
      {subTab === 'deductions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Aturan Potongan Gaji Karyawan</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Potongan denda keterlambatan presensi, BPJS Kesehatan & Ketenagakerjaan, kasbon, serta iuran koperasi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncTable('deduction_rules')}
                disabled={isSyncingTable === 'deduction_rules'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi rule potongan dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'deduction_rules' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'deduction_rules' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <button
                onClick={() => {
                  setEditingDedRule(null);
                  setDedRuleForm({
                    rule_name: 'Potongan Denda Keterlambatan Presensi',
                    scope_type: 'general',
                    scope_id: null,
                    calc_type: 'fixed',
                    percentage_value: 1,
                    fixed_amount: 25000,
                    multiplier_value: 1,
                    custom_formula: 'late_count * amount',
                    is_active: true,
                  });
                  setShowDedRuleModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Rule Potongan
              </button>
            </div>
          </div>

          {/* Info Banner Potongan Keterlambatan */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border border-rose-200/80 dark:border-rose-900/50 flex items-start gap-3 text-xs">
            <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-900 dark:text-rose-200 text-xs">Rule Potongan Denda Keterlambatan Presensi</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 uppercase tracking-wider">Kalkulasi Otomatis</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                Sistem menghitung keterlambatan secara otomatis dari log scan absensi vs toleransi jam masuk shift. Nilai denda potongan keterlambatan di bawah dikalkulasikan per frekuensi/durasi telat karyawan saat memproses slip gaji.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deductionRules.map((rule) => {
              const isLateDeduction = /keterlambatan|telat|absensi/i.test(rule.rule_name);
              return (
                <div
                  key={rule.id}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#121215] border shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 ${
                    isLateDeduction
                      ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/20'
                      : 'border-slate-200/90 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Top: Scope & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                        {isLateDeduction && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Denda Keterlambatan</span>
                          </span>
                        )}
                        {rule.scope_type === 'division' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span>Divisi: {getDivisionName(rule.scope_id)}</span>
                          </span>
                        ) : rule.scope_type === 'job_grade' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                            <Award className="w-3 h-3 shrink-0" />
                            <span>Golongan: {getJobGradeName(rule.scope_id)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            <Users className="w-3 h-3 shrink-0" />
                            <span>Semua Karyawan (Umum)</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight truncate" title={rule.rule_name}>
                        {rule.rule_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditDedRule(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Edit Rule Potongan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePromptDeleteRule(rule.id, 'ded', rule.rule_name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Hapus Rule Potongan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Calculation Value */}
                  <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/90 border border-slate-200/70 dark:border-[#27272a] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Besaran Potongan
                      </span>
                      <div className="flex items-baseline gap-1">
                        {rule.calc_type === 'percentage' ? (
                          <>
                            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                              {rule.percentage_value ?? 0}%
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">dari Gaji Pokok</span>
                          </>
                        ) : rule.calc_type === 'multiplier' ? (
                          <>
                            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                              {rule.multiplier_value ?? 1}x
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">Kelipatan</span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                              {formatRupiah(rule.fixed_amount ?? rule.amount ?? 0)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">{isLateDeduction ? 'Flat / Pelanggaran Telat' : 'Flat / Pelanggaran'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                      {isLateDeduction ? <Clock className="w-4 h-4" /> : <Percent className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Optional formula display */}
                  {(rule.custom_formula || rule.formula) && (
                    <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-zinc-800/50 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-zinc-700/50 flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{rule.custom_formula || rule.formula}</span>
                    </div>
                  )}

                  {/* Footer: Active Status & ID */}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${rule.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className={`text-[11px] font-semibold ${rule.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {rule.is_active !== false ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">#DD-{rule.id}</span>
                  </div>
                </div>
              );
            })}
            {deductionRules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                Belum ada aturan potongan yang terdaftar. Klik tombol Tambah Rule Potongan untuk membuat aturan baru.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SIMULASI PERHITUNGAN GAJI KARYAWAN */}
      {subTab === 'simulation' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-800/40">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                <span>Interactive Payroll Sandbox & Simulator</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Simulasi & Sandbox Perhitungan Gaji Karyawan
              </h2>
              <p className="text-xs text-purple-100 max-w-2xl leading-relaxed">
                Uji simulasi perhitungan gaji secara real-time dengan mengubah variabel upah, jam kerja, lembur SPKL, keterlambatan, serta kombinasi aturan tunjangan & potongan tanpa mempengaruhi data resmi database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleCopySimSummary}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors backdrop-blur-xs border border-white/10"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Ringkasan</span>
              </button>
              <button
                onClick={handlePrintSimulationPdf}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Simulasi</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Preset Uji Cepat:</span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleApplySimPreset('standard')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition-colors"
              >
                📅 Standard 1 Bulan Full
              </button>
              <button
                onClick={() => handleApplySimPreset('overtime')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition-colors"
              >
                ⚡ Standard + 20h Lembur
              </button>
              <button
                onClick={() => handleApplySimPreset('exempt')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition-colors"
              >
                🛡️ Senior / Bebas Telat
              </button>
              <button
                onClick={() => handleApplySimPreset('parttime')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition-colors"
              >
                ⏱️ Part-Time (80 Jam)
              </button>
            </div>
          </div>

          {/* Main Grid: Inputs (Left) vs Calculations (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT PANEL: PARAMETER INPUTS (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-[#27272a] pb-3">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>Parameter Utama Simulasi</span>
                </h3>

                {/* Employee Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Karyawan Target (Auto-Fill Rate)
                  </label>
                  <select
                    value={simEmployeeId}
                    onChange={(e) => handleSimEmployeeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    <option value="custom">-- Simulasi Kustom / Manual --</option>
                    {activeEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} — {e.nip} ({formatRupiah(e.base_salary)}/jam)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base Salary Hourly Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Upah Pokok per Jam (IDR)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-emerald-600">
                      {formatRupiah(simBaseRate)}/jam
                    </span>
                  </div>
                  <input
                    type="number"
                    value={simBaseRate}
                    onChange={(e) => setSimBaseRate(Math.max(0, Number(e.target.value)))}
                    step={1000}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                    Standard 1 bulan (176h @ Rp 25.000) = Rp 4.400.000
                  </p>
                </div>

                {/* Worked Hours & Days */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Jam Kerja (Poin)</span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">⚡ Auto-Sync (8h/hari)</span>
                    </label>
                    <input
                      type="number"
                      value={simWorkedHours}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setSimWorkedHours(val);
                        setSimWorkedDays(val > 0 ? Number((val / 8).toFixed(1)) : 0);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Jumlah Hari Hadir</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">⚡ Auto-Sync (8h/hari)</span>
                    </label>
                    <input
                      type="number"
                      value={simWorkedDays}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setSimWorkedDays(val);
                        setSimWorkedHours(Math.round(val * 8));
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Overtime SPKL */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      Lembur SPKL
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-600">
                      +{formatRupiah(simEarnedOt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Jam Lembur (SPKL)
                      </label>
                      <input
                        type="number"
                        value={simOtHours}
                        onChange={(e) => setSimOtHours(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Kelipatan (Rate)
                      </label>
                      <select
                        value={simOtMultiplier}
                        onChange={(e) => setSimOtMultiplier(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                      >
                        <option value={1.5}>1.5x (Normal)</option>
                        <option value={2.0}>2.0x (Hari Libur)</option>
                        <option value={1.0}>1.0x (Flat)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lateness Penalty & Exemption */}
                <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Keterlambatan (Denda)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Frekuensi Telat Masuk (Kali)
                    </label>
                    <input
                      type="number"
                      value={simLateCount}
                      onChange={(e) => setSimLateCount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={simIsExemptFromLateness}
                      onChange={(e) => setSimIsExemptFromLateness(e.target.checked)}
                      className="w-4 h-4 rounded-md text-purple-600 focus:ring-purple-500 border-rose-300 dark:border-rose-800"
                    />
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      Bebas Denda Keterlambatan (Pengecualian Jabatan)
                    </span>
                  </label>
                </div>
              </div>

              {/* Rule Active Toggles Panel */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-[#27272a] pb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kombinasi Rule Tunjangan & Potongan</span>
                </h3>

                {/* Allowances Toggles */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                    Rule Tunjangan Diaktifkan:
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {allowanceRules.map((r) => {
                      const isSelected = simSelectedAllowances.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white font-semibold'
                              : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSimSelectedAllowances([...simSelectedAllowances, r.id]);
                                } else {
                                  setSimSelectedAllowances(simSelectedAllowances.filter((id) => id !== r.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{r.rule_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {r.calc_type === 'percentage' ? `${r.percentage_value}%` : formatRupiah(r.fixed_amount || r.amount || 0)}
                            </span>
                            {r.calc_type !== 'percentage' && (
                              <select
                                value={simRuleUnits[r.id] || r.rate_unit || 'per_month'}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSimRuleUnits({ ...simRuleUnits, [r.id]: e.target.value as 'per_day' | 'per_month' });
                                }}
                                className="text-[10px] font-bold py-0.5 px-1.5 rounded border bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                              >
                                <option value="per_month">/ Bulan</option>
                                <option value="per_day">/ Hari</option>
                              </select>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {allowanceRules.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Tidak ada rule tunjangan</p>
                    )}
                  </div>
                </div>

                {/* Deductions Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#27272a]">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block uppercase tracking-wider">
                    Rule Potongan Diaktifkan:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {deductionRules.map((r) => {
                      const isSelected = simSelectedDeductions.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white font-semibold'
                              : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSimSelectedDeductions([...simSelectedDeductions, r.id]);
                                } else {
                                  setSimSelectedDeductions(simSelectedDeductions.filter((id) => id !== r.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span>{r.rule_name}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-rose-600">
                            {r.calc_type === 'percentage' ? `${r.percentage_value}%` : formatRupiah(r.fixed_amount || r.amount || 0)}
                          </span>
                        </label>
                      );
                    })}
                    {deductionRules.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Tidak ada rule potongan</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: LIVE SIMULATION BREAKDOWN & TAKE HOME PAY (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Big Take Home Pay Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#18181b] to-emerald-950 text-white shadow-2xl border border-emerald-500/30 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Calculator className="w-40 h-40 text-emerald-400" />
                </div>

                <div className="flex items-center justify-between relative z-10">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Hasil Simulasi Gaji Bersih (Take Home Pay)
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                    LIVE SIMULATOR
                  </span>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                      {formatRupiah(simNetSalary)}
                    </span>
                    <p className="text-xs text-slate-300 mt-1">
                      Gaji kotor {formatRupiah(simGrossSalary)} − Total potongan {formatRupiah(simTotalDeductions)}
                    </p>
                  </div>
                </div>

                {/* Quick Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10 pt-1">
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium block">Upah Pokok</span>
                    <span className="text-sm font-extrabold text-white font-mono">{formatRupiah(simEarnedBase)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-0.5">
                    <span className="text-[10px] text-purple-300 font-medium block">Lembur SPKL</span>
                    <span className="text-sm font-extrabold text-purple-300 font-mono">+{formatRupiah(simEarnedOt)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                    <span className="text-[10px] text-emerald-300 font-medium block">Total Tunjangan</span>
                    <span className="text-sm font-extrabold text-emerald-300 font-mono">+{formatRupiah(simTotalAllowances)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
                    <span className="text-[10px] text-rose-300 font-medium block">Total Potongan</span>
                    <span className="text-sm font-extrabold text-rose-300 font-mono">-{formatRupiah(simTotalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Card */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] pb-3">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Rincian Komponen Hasil Simulasi</span>
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    Rate: {formatRupiah(simBaseRate)}/jam
                  </span>
                </h3>

                {/* Component 1: Penerimaan (Earnings) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Plus className="w-3.5 h-3.5" />
                      KOMPONEN PENDAPATAN (PENERIMAAN)
                    </span>
                    <span className="font-mono text-emerald-600">{formatRupiah(simGrossSalary)}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Upah Pokok Diperoleh ({simWorkedHours} Jam @ {formatRupiah(simBaseRate)}):</span>
                      <span className="font-mono font-bold">{formatRupiah(simEarnedBase)}</span>
                    </div>
                    <div className="flex justify-between text-purple-600 dark:text-purple-400">
                      <span>Upah Lembur SPKL ({simOtHours} Jam x {simOtMultiplier}x):</span>
                      <span className="font-mono font-bold">+{formatRupiah(simEarnedOt)}</span>
                    </div>
                    {simAllowanceItems.map((a) => (
                      <div key={a.id} className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>{a.name} ({a.val}):</span>
                        <span className="font-mono font-bold">+{formatRupiah(a.amount)}</span>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 flex justify-between font-black text-emerald-700 dark:text-emerald-400 text-xs">
                      <span>Total Pendapatan (Gaji Kotor):</span>
                      <span className="font-mono">{formatRupiah(simGrossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Component 2: Potongan (Deductions) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      KOMPONEN POTONGAN GAJI
                    </span>
                    <span className="font-mono text-rose-600">-{formatRupiah(simTotalDeductions)}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2 text-xs">
                    {simDeductionItems.map((d) => (
                      <div key={d.id} className="flex justify-between text-rose-700 dark:text-rose-400">
                        <span>
                          {d.name} <span className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">({d.note})</span>:
                        </span>
                        <span className="font-mono font-bold">-{formatRupiah(d.amount)}</span>
                      </div>
                    ))}
                    {simDeductionItems.length === 0 && (
                      <div className="text-slate-600 dark:text-slate-300 italic">Tidak ada potongan aktif</div>
                    )}

                    <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 flex justify-between font-black text-rose-700 dark:text-rose-400 text-xs">
                      <span>Total Potongan Gaji:</span>
                      <span className="font-mono">-{formatRupiah(simTotalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Visual Percentage Distribution Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Proporsi Penerimaan vs Potongan</span>
                    <span className="font-mono text-emerald-600">
                      Take Home Pay: {simGrossSalary > 0 ? Math.round((simNetSalary / simGrossSalary) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 dark:bg-[#18181b] rounded-full overflow-hidden flex border border-slate-200 dark:border-zinc-700">
                    <div
                      style={{ width: `${simGrossSalary > 0 ? (simEarnedBase / simGrossSalary) * 100 : 0}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Upah Pokok: ${formatRupiah(simEarnedBase)}`}
                    />
                    <div
                      style={{ width: `${simGrossSalary > 0 ? (simEarnedOt / simGrossSalary) * 100 : 0}%` }}
                      className="bg-purple-500 h-full"
                      title={`Lembur SPKL: ${formatRupiah(simEarnedOt)}`}
                    />
                    <div
                      style={{ width: `${simGrossSalary > 0 ? (simTotalAllowances / simGrossSalary) * 100 : 0}%` }}
                      className="bg-teal-500 h-full"
                      title={`Tunjangan: ${formatRupiah(simTotalAllowances)}`}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Upah Pokok
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Lembur SPKL
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Tunjangan
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KALKULASI & GENERATE SLIP GAJI */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden transition-all duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] p-5 pb-3.5 shrink-0 bg-white dark:bg-[#121215]">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Kalkulasi Otomatis Slip Gaji
              </h2>
              <button onClick={() => setShowGenerateModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Karyawan Target *
                </label>
                <select
                  value={genEmployeeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') setGenEmployeeId('all');
                    else setGenEmployeeId(Number(val));
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                >
                  <option value="all">-- (ALL) Semua Karyawan Aktif ({activeEmployees.length} Orang - Batch Generate) --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} — {e.nip} ({e.division_name || 'Staff'}) {e.status === 'inactive' ? '(NON-AKTIF)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mulai Periode *
                  </label>
                  <DateInput
                    value={genPeriodStart || ''}
                    onChange={(v) => setGenPeriodStart(v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selesai Periode *
                  </label>
                  <DateInput
                    value={genPeriodEnd || ''}
                    onChange={(v) => setGenPeriodEnd(v)}
                  />
                </div>
              </div>

              {/* Realtime Live Preview of Calculation */}
              {genEmployeeId === 'all' ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-3 text-xs">
                  <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 text-xs">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-bold">Mode Batch Generate (Semua Karyawan):</span> Anda memilih untuk membuat slip gaji sekaligus untuk seluruh <span className="font-extrabold">{allCalculations.length} karyawan aktif</span>.
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Total Karyawan Diproses:</span>
                      <span className="font-bold">{allCalculations.length} Orang</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Total Est. Upah Pokok:</span>
                      <span className="font-mono font-semibold">{formatRupiah(allCalculations.reduce((acc, c) => acc + c.earnedBase, 0))}</span>
                    </div>
                    <div className="flex justify-between text-purple-600 dark:text-purple-400">
                      <span>Total Est. Lembur SPKL:</span>
                      <span className="font-mono font-semibold">+{formatRupiah(allCalculations.reduce((acc, c) => acc + c.earnedOt, 0))}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Total Est. Tunjangan:</span>
                      <span className="font-mono font-semibold">+{formatRupiah(allCalculations.reduce((acc, c) => acc + c.totalAllowances, 0))}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>Total Est. Potongan:</span>
                      <span className="font-mono font-semibold">-{formatRupiah(allCalculations.reduce((acc, c) => acc + c.totalDeductions, 0))}</span>
                    </div>
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-900 flex justify-between items-center text-sm font-black">
                      <span className="text-slate-900 dark:text-white">Total Pengeluaran Gaji Bersih:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                        {formatRupiah(allCalculations.reduce((acc, c) => acc + c.netSalary, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-2.5 text-xs">
                  {/* Rule Notice */}
                  <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-900 dark:text-blue-300 text-[11px] leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="font-bold">Ketentuan Jam Kerja & Lembur:</span> Clock-out jam berapapun tanpa form lembur (SPKL) yang disetujui, jam kerja dasar dihitung sesuai plot jadwal yang bersangkutan tanpa pengali lembur.
                    </div>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white pt-1 flex items-center justify-between">
                    <span>Rincian Kalkulasi Periode:</span>
                    <span className="font-mono text-emerald-600 font-black">{formatRupiah(baseRate)} / jam</span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Hari Hadir & Poin Jam Kerja:</span>
                    <span className="font-semibold">{totalWorkedDays} Hari (<span className="font-extrabold text-slate-900 dark:text-white">{estimatedHours} Poin</span> Jam Kerja Sesuai Plot)</span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold">
                    <span>Upah Pokok Diperoleh:</span>
                    <span className="font-mono font-bold">{formatRupiah(earnedBase)}</span>
                  </div>
                  <div className="flex justify-between text-purple-600 dark:text-purple-400">
                    <span>SPKL Lembur ({totalOtHours} Jam x {otMultiplier}x):</span>
                    <span className="font-mono font-semibold">+{formatRupiah(earnedOt)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Tunjangan Makan & Operasional:</span>
                    <span className="font-mono font-semibold">+{formatRupiah(totalAllowances)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-1.5 border-t border-dashed border-slate-200 dark:border-zinc-800">
                    <span>Total Pendapatan (Gaji Kotor):</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(grossSalary)}</span>
                  </div>
                  {/* Rincian Potongan Gaji */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Rincian Potongan:
                    </div>

                    {deductionItems.length > 0 && (
                      <div className="pl-3 space-y-1 border-l-2 border-rose-200 dark:border-rose-900/60 text-[11px] text-slate-600 dark:text-slate-300">
                        {deductionItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <span>
                              • {item.rule_name}{' '}
                              {item.isLateRule
                                ? isTargetExemptFromLateness
                                  ? '(Bebas Telat - Golongan)'
                                  : `(${lateCount}x telat @ ${item.calc_type === 'percentage' ? `${item.percentage_value}%` : formatRupiah(item.fixed_amount)})`
                                : item.calc_type === 'percentage'
                                ? `(${item.percentage_value}% dari Gaji Pokok)`
                                : ''}
                            </span>
                            <span className="font-mono text-rose-600 font-semibold">
                              -{formatRupiah(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold pt-1.5 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <span>Total Potongan Gaji:</span>
                      <span className="font-mono font-bold">-{formatRupiah(totalDeductions)}</span>
                    </div>
                  </div>

                  {workHoursSummary && workHoursSummary.dailyBreakdown.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-[#27272a]">
                      <button
                        type="button"
                        onClick={() => setShowDailyBreakdownInModal(!showDailyBreakdownInModal)}
                        className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span>Lihat Rincian Harian Presensi & Aturan Lembur ({workHoursSummary.dailyBreakdown.length} hari)</span>
                        {showDailyBreakdownInModal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showDailyBreakdownInModal && (
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {workHoursSummary.dailyBreakdown.map((day) => (
                            <div
                              key={day.date}
                              className="p-2 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-[10px] space-y-0.5"
                            >
                              <div className="flex justify-between font-bold">
                                <span>{formatDateDDMMYYYY(day.date)}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">{day.regularHours} Jam Reguler {day.overtimeHours > 0 ? `+ ${day.overtimeHours} Jam OT` : ''}</span>
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 flex justify-between">
                                <span>In: {day.inTime ? day.inTime.slice(11, 16) : '-'} | Out: {day.outTime ? day.outTime.slice(11, 16) : '-'}</span>
                                <span className={day.hasApprovedOtForm ? 'text-purple-600 font-semibold' : 'text-slate-400'}>
                                  {day.hasApprovedOtForm ? '✓ SPKL Lembur Disetujui' : `Shift Plot: ${day.scheduleName || 'Standar'}`}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 italic">{day.notes}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-[#27272a] flex justify-between items-center text-sm font-black">
                    <span className="text-slate-900 dark:text-white">Estimasi Take Home Pay:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                      {formatRupiah(netSalary)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="flex justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 dark:border-[#27272a] bg-slate-50/90 dark:bg-[#161619] backdrop-blur-xs shrink-0">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunGenerate}
                className="px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                {genEmployeeId === 'all' ? `Terbitkan Semua Slip (${allCalculations.length} Karyawan)` : 'Terbitkan Slip Gaji Resmi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP KONFIRMASI BATCH GENERATE (ALL) */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-[#27272a] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Terbitkan Semua Slip Gaji
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batch Process ({allCalculations.length} Karyawan)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#18181b] p-3.5 rounded-2xl border border-slate-200 dark:border-[#27272a]">
              Apakah Anda yakin ingin membuat slip gaji secara otomatis untuk seluruh <span className="font-bold text-slate-900 dark:text-white">{allCalculations.length} karyawan</span> untuk periode <span className="font-mono font-semibold">{formatDateDDMMYYYY(genPeriodStart)}</span> s/d <span className="font-mono font-semibold">{formatDateDDMMYYYY(genPeriodEnd)}</span>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isGeneratingBatch}
                onClick={() => setShowBatchConfirmModal(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isGeneratingBatch}
                onClick={handleBatchGenerateConfirm}
                className="px-5 py-2 text-xs font-bold rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingBatch ? 'Memproses Batch...' : 'Ya, Terbitkan Semua Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL SLIP GAJI INDIVIDUAL */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  {getCompanyInitials(companyName)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    SLIP GAJI RESMI KARYAWAN
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">{companyName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSlip(null)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-[#18181b] border border-transparent dark:border-[#27272a]/60 rounded-xl">
                <div>
                  <span className="text-slate-500 dark:text-slate-300 block text-[10px]">Nama Karyawan:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSlip.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300 block text-[10px]">NIP:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedSlip.employee_nip}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300 block text-[10px]">Periode Kerja:</span>
                  <span className="font-mono">{selectedSlip.period_start} s/d {selectedSlip.period_end}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300 block text-[10px]">Jam Kerja / Lembur:</span>
                  <span className="font-bold">{selectedSlip.total_hours} Jam / {selectedSlip.overtime_hours} Jam</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-b border-slate-100 dark:border-[#27272a] py-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Upah Pokok:</span>
                  <span className="font-mono font-bold">{formatRupiah(selectedSlip.base_salary_earned)}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Upah Lembur SPKL:</span>
                  <span className="font-mono font-bold">+{formatRupiah(selectedSlip.overtime_pay)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Tunjangan Operasional:</span>
                  <span className="font-mono font-bold">+{formatRupiah(selectedSlip.allowances_amount)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Potongan Gaji:</span>
                  <span className="font-mono font-bold">-{formatRupiah(selectedSlip.deductions_amount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-black p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-300">
                <span>TAKE HOME PAY:</span>
                <span className="text-lg font-mono">{formatRupiah(selectedSlip.net_salary)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handlePrintIndividualSlip(selectedSlip)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / Download Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Modals for Adding / Editing Rules */}
      {showOtRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div
            className={`w-full ${
              otModalSize === 'full'
                ? 'max-w-6xl'
                : otModalSize === 'wide'
                ? 'max-w-4xl'
                : otRuleForm.calc_type === 'timeslot'
                ? 'max-w-2xl'
                : 'max-w-xl'
            } max-h-[92vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] transition-all duration-200 overflow-hidden sm:resize-both`}
            style={{
              maxWidth: otModalSize === 'full' ? 'min(98vw, 1200px)' : otModalSize === 'wide' ? 'min(96vw, 980px)' : 'min(95vw, 680px)',
              minWidth: '320px',
              maxHeight: '92vh',
              minHeight: '440px',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] p-5 pb-3.5 shrink-0 bg-white dark:bg-[#121215]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingOtRule ? 'Edit Aturan Upah Lembur' : 'Tambah Aturan Upah Lembur Baru'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tentukan formula dan target karyawan (divisi / golongan / umum)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Segmented Sizing Controls: [Normal] [Lebar] [Luas] */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setOtModalSize('normal')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      otModalSize === 'normal'
                        ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Normal"
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtModalSize('wide')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      otModalSize === 'wide'
                        ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Lebar"
                  >
                    Lebar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtModalSize('full')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      otModalSize === 'full'
                        ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Luas (Maksimal)"
                  >
                    Luas
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowOtRuleModal(false);
                    setEditingOtRule(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5 text-xs">
              {/* Nama Aturan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Aturan Lembur</label>
                <input
                  type="text"
                  placeholder="e.g. Lembur Hari Kerja Standar / Lembur Shift Lapangan"
                  value={otRuleForm.rule_name || ''}
                  onChange={(e) => setOtRuleForm({ ...otRuleForm, rule_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Scope Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a] space-y-2.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  Target Cakupan Karyawan (Scope)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOtRuleForm({ ...otRuleForm, scope_type: 'general', scope_id: null })}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      otRuleForm.scope_type === 'general'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Semua (Umum)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstDiv = divisions[0]?.id || null;
                      setOtRuleForm({ ...otRuleForm, scope_type: 'division', scope_id: firstDiv });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      otRuleForm.scope_type === 'division'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Per Divisi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstGrade = jobGrades[0]?.id || null;
                      setOtRuleForm({ ...otRuleForm, scope_type: 'job_grade', scope_id: firstGrade });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      otRuleForm.scope_type === 'job_grade'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>Per Golongan</span>
                  </button>
                </div>

                {/* Conditional scope selector */}
                {otRuleForm.scope_type === 'division' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Divisi yang Berlaku:
                    </label>
                    <select
                      value={otRuleForm.scope_id ?? ''}
                      onChange={(e) => setOtRuleForm({ ...otRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Divisi --</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.division_name || (d as any).name || d.division_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {otRuleForm.scope_type === 'job_grade' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Golongan / Jabatan yang Berlaku:
                    </label>
                    <select
                      value={otRuleForm.scope_id ?? ''}
                      onChange={(e) => setOtRuleForm({ ...otRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Golongan / Grade --</option>
                      {jobGrades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name || (g as any).name || g.grade_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Calculation Type */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">Metode Perhitungan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOtRuleForm({ ...otRuleForm, calc_type: 'timeslot' })}
                    className={`col-span-2 px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 ${
                      otRuleForm.calc_type === 'timeslot'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Multi-Tier Slot Jam (17-21, 21-00, 00-07)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtRuleForm({ ...otRuleForm, calc_type: 'multiplier' })}
                    className={`px-3 py-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      otRuleForm.calc_type === 'multiplier'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex items-center gap-1.5 leading-snug">
                      <span>Multiplier</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span>(x Upah)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtRuleForm({ ...otRuleForm, calc_type: 'fixed' })}
                    className={`px-3 py-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      otRuleForm.calc_type === 'fixed'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="flex items-center gap-1.5 leading-snug">
                      <span>Nominal Tetap</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span>
                        {otRuleForm.rate_unit === 'per_3_hours'
                          ? 'Per 3 Jam'
                          : otRuleForm.rate_unit === 'per_day'
                          ? 'Per Hari'
                          : otRuleForm.rate_unit === 'per_spkl'
                          ? 'Per SPKL'
                          : 'Per Jam'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Satuan Tarif Lembur Selector */}
              {otRuleForm.calc_type !== 'timeslot' && (
                <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Satuan Dasar Tarif Lembur:</span>
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      {otRuleForm.rate_unit === 'per_3_hours'
                        ? 'Tarif Setiap 3 Jam Lembur'
                        : otRuleForm.rate_unit === 'per_day'
                        ? 'Tarif Harian (Hari Lembur)'
                        : otRuleForm.rate_unit === 'per_spkl'
                        ? 'Tarif per Dokumen SPKL/Tugas'
                        : 'Tarif Reguler / Jam'}
                    </span>
                  </div>
                  <select
                    value={otRuleForm.rate_unit || 'per_hour'}
                    onChange={(e) => {
                      const newUnit = e.target.value as 'per_hour' | 'per_3_hours' | 'per_day' | 'per_spkl';
                      setOtRuleForm({ ...otRuleForm, rate_unit: newUnit });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="per_hour">🕒 / Jam (Per 1 Jam Lembur - Standar)</option>
                    <option value="per_3_hours">⏳ / 3 Jam (Dihitung Setiap Blok Kelipatan 3 Jam Lembur)</option>
                    <option value="per_day">📅 / Hari (Dihitung Berdasarkan Jumlah Hari Ada Lembur)</option>
                    <option value="per_spkl">📋 / SPKL (Tugas) (Dihitung per Dokumen/Surat Penugasan SPKL yang Disetujui)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pilihan ini menentukan basis pengali tarif nominal tetap maupun kelipatan multiplier pada slip gaji karyawan.
                  </p>
                </div>
              )}

              {/* Dynamic Value Input */}
              {otRuleForm.calc_type === 'timeslot' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                        Atur Fleksibilitas Slot Jam & Tarif Lembur
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtRuleForm({
                          ...otRuleForm,
                          tier_slots: [
                            { id: '1', time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot Sore (+Rp 50rb)' },
                            { id: '2', time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot Malam (2x Gaji Harian)' },
                            { id: '3', time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot Dini Hari (3x Gaji Harian)' },
                          ],
                        });
                      }}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Default
                    </button>
                  </div>

                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 leading-relaxed">
                    Anda bebas menentukan jam mulai & selesai untuk tiap jenjang/shift, serta tipe rumusnya (Flat Nominal, Kelipatan Gaji Pokok 1 Hari, atau Kelipatan Upah Per Jam).
                  </p>

                  {/* List of Tier Slots */}
                  <div className="space-y-3">
                    {(otRuleForm.tier_slots || []).map((slot, index) => (
                      <div
                        key={slot.id || index}
                        className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-purple-200/70 dark:border-purple-900/60 shadow-xs space-y-2.5"
                      >
                        {/* Header: Badge + Label Input + Hapus */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={slot.label || ''}
                              onChange={(e) => {
                                const updated = [...(otRuleForm.tier_slots || [])];
                                updated[index] = { ...updated[index], label: e.target.value };
                                setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                              }}
                              placeholder={`Nama Slot ${index + 1} (e.g. Slot Sore / Malam)`}
                              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/80 text-slate-800 dark:text-slate-200 w-full font-semibold focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-purple-500 focus:outline-hidden transition-all"
                            />
                          </div>

                          {(otRuleForm.tier_slots || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (otRuleForm.tier_slots || []).filter((_, i) => i !== index);
                                setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                              title="Hapus Tier Slot Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Parameter Grid: 4 Kolom Rapi (Jam Mulai, Jam Selesai, Perhitungan, Nilai Tarif) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-0.5">
                          {/* Jam Mulai */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>Jam Mulai</span>
                            </label>
                            <input
                              type="time"
                              value={slot.time_start}
                              onChange={(e) => {
                                const updated = [...(otRuleForm.tier_slots || [])];
                                updated[index] = { ...updated[index], time_start: e.target.value };
                                setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Jam Selesai */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>Jam Selesai</span>
                            </label>
                            <input
                              type="time"
                              value={slot.time_end}
                              onChange={(e) => {
                                const updated = [...(otRuleForm.tier_slots || [])];
                                updated[index] = { ...updated[index], time_end: e.target.value };
                                setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Skema / Jenis Perhitungan */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                              Perhitungan
                            </label>
                            <select
                              value={slot.rate_type}
                              onChange={(e) => {
                                const updated = [...(otRuleForm.tier_slots || [])];
                                const newType = e.target.value as any;
                                const defaultVal = newType === 'fixed' ? 50000 : (newType === 'daily_multiplier' ? 2 : 1.5);
                                updated[index] = { ...updated[index], rate_type: newType, rate_value: defaultVal };
                                setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                            >
                              <option value="fixed">Flat Nominal (Rp)</option>
                              <option value="daily_multiplier">x Gaji Pokok 1 Hari</option>
                              <option value="hourly_multiplier">x Upah per Jam</option>
                            </select>
                          </div>

                          {/* Nilai Tarif */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider truncate" title={
                              slot.rate_type === 'fixed'
                                ? 'Nominal Flat (IDR)'
                                : slot.rate_type === 'daily_multiplier'
                                ? 'Kelipatan Gaji 1 Hari (x)'
                                : 'Kelipatan Upah/Jam (x)'
                            }>
                              {slot.rate_type === 'fixed'
                                ? 'Nominal (Rp)'
                                : slot.rate_type === 'daily_multiplier'
                                ? 'Kelipatan Gaji (x)'
                                : 'Kelipatan Upah (x)'}
                            </label>
                            {slot.rate_type === 'fixed' ? (
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Rp</span>
                                <input
                                  type="text"
                                  value={formatThousandNumber(slot.rate_value)}
                                  onChange={(e) => {
                                    const updated = [...(otRuleForm.tier_slots || [])];
                                    updated[index] = { ...updated[index], rate_value: parseThousandNumber(e.target.value) };
                                    setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                                  }}
                                  className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                                  placeholder="50.000"
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={slot.rate_value}
                                  onChange={(e) => {
                                    const updated = [...(otRuleForm.tier_slots || [])];
                                    updated[index] = { ...updated[index], rate_value: Number(e.target.value) };
                                    setOtRuleForm({ ...otRuleForm, tier_slots: updated });
                                  }}
                                  className="w-full pl-2.5 pr-6 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                                  placeholder="2"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">x</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tombol Tambah Tier Baru */}
                  <button
                    type="button"
                    onClick={() => {
                      const current = otRuleForm.tier_slots || [];
                      const nextTier: OvertimeTierSlot = {
                        id: String(Date.now()),
                        time_start: '07:00',
                        time_end: '12:00',
                        rate_type: 'daily_multiplier',
                        rate_value: 2,
                        label: `Slot ${current.length + 1}`,
                      };
                      setOtRuleForm({
                        ...otRuleForm,
                        tier_slots: [...current, nextTier],
                      });
                    }}
                    className="w-full py-2.5 px-3 border border-dashed border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Baris Tier Slot Jam Baru</span>
                  </button>
                </div>
              ) : otRuleForm.calc_type === 'multiplier' ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Multiplier Kelipatan (x Upah)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={otRuleForm.multiplier_value ?? otRuleForm.multiplier ?? 1.5}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOtRuleForm({ ...otRuleForm, multiplier_value: val, multiplier: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Standar Depnaker: 1.5x jam pertama, 2x jam berikutnya.</p>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nominal Upah Tetap{' '}
                    {otRuleForm.rate_unit === 'per_3_hours'
                      ? 'per 3 Jam'
                      : otRuleForm.rate_unit === 'per_day'
                      ? 'per Hari'
                      : otRuleForm.rate_unit === 'per_spkl'
                      ? 'per SPKL (Tugas)'
                      : 'per Jam'}{' '}
                    (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(otRuleForm.fixed_amount ?? 50000)}
                    onChange={(e) => setOtRuleForm({ ...otRuleForm, fixed_amount: parseThousandNumber(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    placeholder="e.g. 50.000"
                  />
                </div>
              )}

              {/* Formula Matematika Builder & Display (hanya untuk tipe formula non-timeslot) */}
              {otRuleForm.calc_type !== 'timeslot' && (
                <FormulaBuilderPanel
                  ruleType="overtime"
                  formulaValue={otRuleForm.custom_formula || otRuleForm.formula || ''}
                  onFormulaChange={(newVal) =>
                    setOtRuleForm({ ...otRuleForm, custom_formula: newVal, formula: newVal })
                  }
                  onPresetSelect={(preset) => {
                    setOtRuleForm((prev) => {
                      const updates: Partial<OvertimeRule> = {
                        custom_formula: preset.formula,
                        formula: preset.formula,
                      };
                      if (preset.targetCalcType) {
                        updates.calc_type = preset.targetCalcType;
                      }
                      if (preset.defaultMultiplier !== undefined) {
                        updates.multiplier_value = preset.defaultMultiplier;
                        updates.multiplier = preset.defaultMultiplier;
                      }
                      if (preset.defaultFixedAmount !== undefined) {
                        updates.fixed_amount = preset.defaultFixedAmount;
                      }
                      if (preset.defaultPercentage !== undefined) {
                        updates.percentage_value = preset.defaultPercentage;
                      }
                      return { ...prev, ...updates };
                    });
                  }}
                  sampleContext={{
                    multiplier: otRuleForm.multiplier || 1.5,
                    fixed_amount: otRuleForm.fixed_amount || 25000,
                    percentage: otRuleForm.percentage_value || 10,
                  }}
                />
              )}

            </div>

            {/* Sticky Modal Action Footer */}
            <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 dark:border-[#27272a] bg-slate-50/90 dark:bg-[#161619] backdrop-blur-xs shrink-0">
              {/* Subtle visual resize handle icon for desktop drag */}
              <div className="hidden sm:block absolute bottom-1 right-1 text-slate-300 dark:text-zinc-600 pointer-events-none" title="Ukuran modal dapat diubah (resizable)">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              {/* Status Toggle on Left */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Status:</span>
                <button
                  type="button"
                  onClick={() => setOtRuleForm({ ...otRuleForm, is_active: !otRuleForm.is_active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    otRuleForm.is_active !== false
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${otRuleForm.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{otRuleForm.is_active !== false ? 'Aktif' : 'Non-Aktif'}</span>
                </button>
              </div>

              {/* Action Buttons on Right */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtRuleModal(false);
                    setEditingOtRule(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const isTimeslot = otRuleForm.calc_type === 'timeslot';
                      const customFormula = isTimeslot && otRuleForm.tier_slots
                        ? JSON.stringify(otRuleForm.tier_slots)
                        : (otRuleForm.custom_formula || otRuleForm.formula || 'base_salary * multiplier * hours');

                      const payload = {
                        ...otRuleForm,
                        multiplier: otRuleForm.multiplier_value ?? otRuleForm.multiplier ?? 1.5,
                        custom_formula: customFormula,
                        formula: customFormula,
                        tier_slots: otRuleForm.tier_slots,
                      };
                      if (editingOtRule && onUpdateOvertimeRule) {
                        const res = await onUpdateOvertimeRule(editingOtRule.id, payload);
                        if (res?.success) toast.success('Berhasil Diupdate', 'Aturan lembur berhasil diperbarui.');
                        else toast.error('Gagal Update', res?.message);
                      } else {
                        const res = await onAddOvertimeRule(payload);
                        if (res?.success) toast.success('Berhasil Ditambahkan', 'Aturan lembur baru tersimpan.');
                        else toast.error('Gagal Menyimpan', res?.message);
                      }
                      setShowOtRuleModal(false);
                      setEditingOtRule(null);
                    } catch (err: any) {
                      toast.error('Error', err.message);
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  Simpan Aturan Lembur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT RULE POTONGAN */}
      {showDedRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div
            className={`w-full ${
              dedModalSize === 'full'
                ? 'max-w-6xl'
                : dedModalSize === 'wide'
                ? 'max-w-4xl'
                : 'max-w-xl'
            } max-h-[92vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden transition-all duration-200 sm:resize-both`}
            style={{
              maxWidth: dedModalSize === 'full' ? 'min(98vw, 1200px)' : dedModalSize === 'wide' ? 'min(96vw, 980px)' : 'min(95vw, 680px)',
              minWidth: '320px',
              maxHeight: '92vh',
              minHeight: '440px',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] p-5 pb-3.5 shrink-0 bg-white dark:bg-[#121215]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingDedRule ? 'Edit Aturan Potongan' : 'Tambah Aturan Potongan Baru'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aturan pemotongan presensi, kasbon, atau BPJS terarah
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Segmented Sizing Controls: [Normal] [Lebar] [Luas] */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setDedModalSize('normal')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      dedModalSize === 'normal'
                        ? 'bg-white dark:bg-zinc-700 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Normal"
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setDedModalSize('wide')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      dedModalSize === 'wide'
                        ? 'bg-white dark:bg-zinc-700 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Lebar"
                  >
                    Lebar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDedModalSize('full')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      dedModalSize === 'full'
                        ? 'bg-white dark:bg-zinc-700 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Luas (Maksimal)"
                  >
                    Luas
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowDedRuleModal(false);
                    setEditingDedRule(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5 text-xs">
              {/* Nama Potongan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Potongan</label>
                <input
                  type="text"
                  placeholder="e.g. Potongan Denda Keterlambatan Presensi / BPJS Ketenagakerjaan"
                  value={dedRuleForm.rule_name || ''}
                  onChange={(e) => setDedRuleForm({ ...dedRuleForm, rule_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDedRuleForm({
                        ...dedRuleForm,
                        rule_name: 'Potongan Denda Keterlambatan Presensi',
                        calc_type: 'fixed',
                        fixed_amount: 25000,
                        amount: 25000,
                        custom_formula: 'late_count * amount',
                      })
                    }
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                  >
                    + Denda Telat (Rp 25.000)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDedRuleForm({
                        ...dedRuleForm,
                        rule_name: 'BPJS Kesehatan',
                        calc_type: 'percentage',
                        percentage_value: 1,
                      })
                    }
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    + BPJS Kesehatan (1%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDedRuleForm({
                        ...dedRuleForm,
                        rule_name: 'BPJS Ketenagakerjaan',
                        calc_type: 'percentage',
                        percentage_value: 2,
                      })
                    }
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    + BPJS TK (2%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDedRuleForm({
                        ...dedRuleForm,
                        rule_name: 'Potongan Koperasi Karyawan',
                        calc_type: 'fixed',
                        fixed_amount: 25000,
                        amount: 25000,
                      })
                    }
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                  >
                    + Koperasi (Rp 25.000)
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a] space-y-2.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  Target Cakupan Potongan (Scope)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDedRuleForm({ ...dedRuleForm, scope_type: 'general', scope_id: null })}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      dedRuleForm.scope_type === 'general'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Semua (Umum)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstDiv = divisions[0]?.id || null;
                      setDedRuleForm({ ...dedRuleForm, scope_type: 'division', scope_id: firstDiv });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      dedRuleForm.scope_type === 'division'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Per Divisi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstGrade = jobGrades[0]?.id || null;
                      setDedRuleForm({ ...dedRuleForm, scope_type: 'job_grade', scope_id: firstGrade });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      dedRuleForm.scope_type === 'job_grade'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>Per Golongan</span>
                  </button>
                </div>

                {dedRuleForm.scope_type === 'division' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Divisi yang Berlaku:
                    </label>
                    <select
                      value={dedRuleForm.scope_id ?? ''}
                      onChange={(e) => setDedRuleForm({ ...dedRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Divisi --</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.division_name || (d as any).name || d.division_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dedRuleForm.scope_type === 'job_grade' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Golongan / Jabatan yang Berlaku:
                    </label>
                    <select
                      value={dedRuleForm.scope_id ?? ''}
                      onChange={(e) => setDedRuleForm({ ...dedRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Golongan / Grade --</option>
                      {jobGrades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name || (g as any).name || g.grade_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Calculation Type */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">Metode Perhitungan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDedRuleForm({ ...dedRuleForm, calc_type: 'percentage' })}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 ${
                      dedRuleForm.calc_type === 'percentage'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Persentase Pokok (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDedRuleForm({ ...dedRuleForm, calc_type: 'fixed' })}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 ${
                      dedRuleForm.calc_type === 'fixed'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Nominal Tetap (IDR)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Value Input */}
              {dedRuleForm.calc_type === 'percentage' ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Persentase dari Upah Pokok (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.1}
                      value={dedRuleForm.percentage_value ?? 1}
                      onChange={(e) => setDedRuleForm({ ...dedRuleForm, percentage_value: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Contoh: BPJS Ketenagakerjaan 2% atau Denda Terlambat 1%.</p>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nominal Tetap Potongan (IDR)</label>
                  <input
                    type="text"
                    value={formatThousandNumber(dedRuleForm.fixed_amount ?? dedRuleForm.amount ?? 25000)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setDedRuleForm({ ...dedRuleForm, fixed_amount: val, amount: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    placeholder="e.g. 50.000"
                  />
                </div>
              )}

              {/* Formula Matematika Builder & Display */}
              <FormulaBuilderPanel
                ruleType="deduction"
                formulaValue={dedRuleForm.custom_formula || dedRuleForm.formula || ''}
                onFormulaChange={(newVal) =>
                  setDedRuleForm({ ...dedRuleForm, custom_formula: newVal, formula: newVal })
                }
                onPresetSelect={(preset) => {
                  setDedRuleForm((prev) => {
                    const updates: Partial<DeductionRule> = {
                      custom_formula: preset.formula,
                      formula: preset.formula,
                    };
                    if (preset.targetCalcType) {
                      updates.calc_type = preset.targetCalcType;
                    }
                    if (preset.defaultFixedAmount !== undefined) {
                      updates.fixed_amount = preset.defaultFixedAmount;
                      updates.amount = preset.defaultFixedAmount;
                    }
                    if (preset.defaultPercentage !== undefined) {
                      updates.percentage_value = preset.defaultPercentage;
                    }
                    return { ...prev, ...updates };
                  });
                }}
                sampleContext={{
                  fixed_amount: dedRuleForm.fixed_amount || dedRuleForm.amount || 25000,
                  percentage: dedRuleForm.percentage_value || 1,
                }}
              />

            </div>

            {/* Sticky Modal Action Footer */}
            <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 dark:border-[#27272a] bg-slate-50/90 dark:bg-[#161619] backdrop-blur-xs shrink-0">
              {/* Subtle visual resize handle icon for desktop drag */}
              <div className="hidden sm:block absolute bottom-1 right-1 text-slate-300 dark:text-zinc-600 pointer-events-none" title="Ukuran modal dapat diubah (resizable)">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              {/* Status Toggle on Left */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Status:</span>
                <button
                  type="button"
                  onClick={() => setDedRuleForm({ ...dedRuleForm, is_active: !dedRuleForm.is_active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    dedRuleForm.is_active !== false
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${dedRuleForm.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{dedRuleForm.is_active !== false ? 'Aktif' : 'Non-Aktif'}</span>
                </button>
              </div>

              {/* Action Buttons on Right */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDedRuleModal(false);
                    setEditingDedRule(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const payload = {
                        ...dedRuleForm,
                        amount: dedRuleForm.fixed_amount ?? dedRuleForm.amount ?? 25000,
                        formula: dedRuleForm.custom_formula || dedRuleForm.formula || 'fixed_amount',
                      };
                      if (editingDedRule && onUpdateDeductionRule) {
                        const res = await onUpdateDeductionRule(editingDedRule.id, payload);
                        if (res?.success) toast.success('Berhasil Diupdate', 'Aturan potongan berhasil diperbarui.');
                        else toast.error('Gagal Update', res?.message);
                      } else {
                        const res = await onAddDeductionRule(payload);
                        if (res?.success) toast.success('Berhasil Ditambahkan', 'Aturan potongan baru tersimpan.');
                        else toast.error('Gagal Menyimpan', res?.message);
                      }
                      setShowDedRuleModal(false);
                      setEditingDedRule(null);
                    } catch (err: any) {
                      toast.error('Error', err.message);
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  Simpan Aturan Potongan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT RULE TUNJANGAN */}
      {showAllRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div
            className={`w-full ${
              allModalSize === 'full'
                ? 'max-w-6xl'
                : allModalSize === 'wide'
                ? 'max-w-4xl'
                : 'max-w-xl'
            } max-h-[92vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden transition-all duration-200 sm:resize-both`}
            style={{
              maxWidth: allModalSize === 'full' ? 'min(98vw, 1200px)' : allModalSize === 'wide' ? 'min(96vw, 980px)' : 'min(95vw, 680px)',
              minWidth: '320px',
              maxHeight: '92vh',
              minHeight: '440px',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] p-5 pb-3.5 shrink-0 bg-white dark:bg-[#121215]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingAllRule ? 'Edit Aturan Tunjangan' : 'Tambah Aturan Tunjangan Baru'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aturan tunjangan makan, transport, atau insentif kinerja
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Segmented Sizing Controls: [Normal] [Lebar] [Luas] */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAllModalSize('normal')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      allModalSize === 'normal'
                        ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Normal"
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllModalSize('wide')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      allModalSize === 'wide'
                        ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Lebar"
                  >
                    Lebar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllModalSize('full')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      allModalSize === 'full'
                        ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    title="Ukuran Luas (Maksimal)"
                  >
                    Luas
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowAllRuleModal(false);
                    setEditingAllRule(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5 text-xs">
              {/* Nama Tunjangan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Tunjangan</label>
                <input
                  type="text"
                  placeholder="e.g. Uang Makan Batching / Tunjangan Lapangan Proyek"
                  value={allRuleForm.rule_name || ''}
                  onChange={(e) => setAllRuleForm({ ...allRuleForm, rule_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Scope Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a] space-y-2.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  Target Cakupan Tunjangan (Scope)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllRuleForm({ ...allRuleForm, scope_type: 'general', scope_id: null })}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      allRuleForm.scope_type === 'general'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Semua (Umum)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstDiv = divisions[0]?.id || null;
                      setAllRuleForm({ ...allRuleForm, scope_type: 'division', scope_id: firstDiv });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      allRuleForm.scope_type === 'division'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Per Divisi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstGrade = jobGrades[0]?.id || null;
                      setAllRuleForm({ ...allRuleForm, scope_type: 'job_grade', scope_id: firstGrade });
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border ${
                      allRuleForm.scope_type === 'job_grade'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>Per Golongan</span>
                  </button>
                </div>

                {allRuleForm.scope_type === 'division' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Divisi yang Berlaku:
                    </label>
                    <select
                      value={allRuleForm.scope_id ?? ''}
                      onChange={(e) => setAllRuleForm({ ...allRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Divisi --</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.division_name || (d as any).name || d.division_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {allRuleForm.scope_type === 'job_grade' && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Pilih Golongan / Jabatan yang Berlaku:
                    </label>
                    <select
                      value={allRuleForm.scope_id ?? ''}
                      onChange={(e) => setAllRuleForm({ ...allRuleForm, scope_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Golongan / Grade --</option>
                      {jobGrades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name || (g as any).name || g.grade_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Calculation Type */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">Metode Perhitungan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllRuleForm({ ...allRuleForm, calc_type: 'fixed' })}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 ${
                      allRuleForm.calc_type === 'fixed'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nominal Tetap (IDR)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllRuleForm({ ...allRuleForm, calc_type: 'percentage' })}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 ${
                      allRuleForm.calc_type === 'percentage'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Persentase Pokok (%)</span>
                  </button>
                </div>
              </div>

              {/* Satuan Perhitungan Tunjangan Selector */}
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Satuan Perhitungan Tunjangan:</span>
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    {allRuleForm.rate_unit === 'per_day' ? 'Tarif Dihitung per Hari Kehadiran' : 'Tarif Bulanan Tetap (Per Periode)'}
                  </span>
                </div>
                <select
                  value={allRuleForm.rate_unit || 'per_month'}
                  onChange={(e) => setAllRuleForm({ ...allRuleForm, rate_unit: e.target.value as 'per_day' | 'per_month' })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="per_month">📅 / Bulan (Tunjangan Tetap Bulanan / Per Periode Slip Gaji)</option>
                  <option value="per_day">☀️ / Hari (Tunjangan Dihitung Kelipatan per Hari Kehadiran Kerja)</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pilihan ini menentukan apakah tunjangan dihitung secara harian (dikali jumlah hari kerja) atau bulanan tetap pada slip dan simulasi gaji.
                </p>
              </div>

              {/* Dynamic Value Input */}
              {allRuleForm.calc_type === 'percentage' ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Persentase dari Upah Pokok (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.1}
                      value={allRuleForm.percentage_value ?? 10}
                      onChange={(e) => setAllRuleForm({ ...allRuleForm, percentage_value: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nominal Tetap Tunjangan {allRuleForm.rate_unit === 'per_day' ? 'per Hari' : 'per Bulan'} (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(allRuleForm.fixed_amount ?? allRuleForm.amount ?? 25000)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setAllRuleForm({ ...allRuleForm, fixed_amount: val, amount: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    placeholder="e.g. 50.000"
                  />
                </div>
              )}

              {/* Formula Matematika Builder & Display */}
              <FormulaBuilderPanel
                ruleType="allowance"
                formulaValue={allRuleForm.custom_formula || allRuleForm.formula || ''}
                onFormulaChange={(newVal) =>
                  setAllRuleForm({ ...allRuleForm, custom_formula: newVal, formula: newVal })
                }
                onPresetSelect={(preset) => {
                  setAllRuleForm((prev) => {
                    const updates: Partial<AllowanceRule> = {
                      custom_formula: preset.formula,
                      formula: preset.formula,
                    };
                    if (preset.targetCalcType) {
                      updates.calc_type = preset.targetCalcType;
                    }
                    if (preset.defaultFixedAmount !== undefined) {
                      updates.fixed_amount = preset.defaultFixedAmount;
                      updates.amount = preset.defaultFixedAmount;
                    }
                    if (preset.defaultPercentage !== undefined) {
                      updates.percentage_value = preset.defaultPercentage;
                    }
                    return { ...prev, ...updates };
                  });
                }}
                sampleContext={{
                  fixed_amount: allRuleForm.fixed_amount || allRuleForm.amount || 25000,
                  percentage: allRuleForm.percentage_value || 10,
                }}
              />

            </div>

            {/* Sticky Modal Action Footer */}
            <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 dark:border-[#27272a] bg-slate-50/90 dark:bg-[#161619] backdrop-blur-xs shrink-0">
              {/* Subtle visual resize handle icon for desktop drag */}
              <div className="hidden sm:block absolute bottom-1 right-1 text-slate-300 dark:text-zinc-600 pointer-events-none" title="Ukuran modal dapat diubah (resizable)">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              {/* Status Toggle on Left */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Status:</span>
                <button
                  type="button"
                  onClick={() => setAllRuleForm({ ...allRuleForm, is_active: !allRuleForm.is_active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    allRuleForm.is_active !== false
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${allRuleForm.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{allRuleForm.is_active !== false ? 'Aktif' : 'Non-Aktif'}</span>
                </button>
              </div>

              {/* Action Buttons on Right */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllRuleModal(false);
                    setEditingAllRule(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const payload = {
                        ...allRuleForm,
                        amount: allRuleForm.fixed_amount ?? allRuleForm.amount ?? 25000,
                        formula: allRuleForm.custom_formula || allRuleForm.formula || 'fixed_amount',
                      };
                      if (editingAllRule && onUpdateAllowanceRule) {
                        const res = await onUpdateAllowanceRule(editingAllRule.id, payload);
                        if (res?.success) toast.success('Berhasil Diupdate', 'Aturan tunjangan berhasil diperbarui.');
                        else toast.error('Gagal Update', res?.message);
                      } else {
                        const res = await onAddAllowanceRule(payload);
                        if (res?.success) toast.success('Berhasil Ditambahkan', 'Aturan tunjangan baru tersimpan.');
                        else toast.error('Gagal Menyimpan', res?.message);
                      }
                      setShowAllRuleModal(false);
                      setEditingAllRule(null);
                    } catch (err: any) {
                      toast.error('Error', err.message);
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  Simpan Aturan Tunjangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SLIP GAJI */}
      {showEditSlipModal && editingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden transition-all duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] p-5 pb-3.5 shrink-0 bg-white dark:bg-[#121215]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Edit Slip Gaji #{editingSlip.id}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingSlip.employee_name} (NIP: {editingSlip.employee_nip})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditSlipModal(false);
                  setEditingSlip(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5 text-xs">
              {/* Period Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mulai Periode *
                  </label>
                  <DateInput
                    value={editSlipForm.period_start || ''}
                    onChange={(v) => setEditSlipForm((prev) => ({ ...prev, period_start: v }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selesai Periode *
                  </label>
                  <DateInput
                    value={editSlipForm.period_end || ''}
                    onChange={(v) => setEditSlipForm((prev) => ({ ...prev, period_end: v }))}
                  />
                </div>
              </div>

              {/* Hours Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Total Jam Kerja Dasar / Poin (Jam)</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                      ± {((editSlipForm.total_hours ?? 0) / 8).toFixed(1)} Hari Hadir
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editSlipForm.total_hours ?? 0}
                    onChange={(e) => setEditSlipForm((prev) => ({ ...prev, total_hours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Lembur SPKL (Jam)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editSlipForm.overtime_hours ?? 0}
                    onChange={(e) => setEditSlipForm((prev) => ({ ...prev, overtime_hours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Financial Breakdown Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Upah Pokok Diperoleh (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(editSlipForm.base_salary_earned)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setEditSlipForm((prev) => ({ ...prev, base_salary_earned: val }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    placeholder="e.g. 3.500.000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">
                    Upah Lembur SPKL (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(editSlipForm.overtime_pay)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setEditSlipForm((prev) => ({ ...prev, overtime_pay: val }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#18181b] text-purple-700 dark:text-purple-300 font-mono font-bold"
                    placeholder="e.g. 450.000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Tunjangan Operasional (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(editSlipForm.allowances_amount)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setEditSlipForm((prev) => ({ ...prev, allowances_amount: val }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-[#18181b] text-emerald-700 dark:text-emerald-300 font-mono font-bold"
                    placeholder="e.g. 500.000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                    Potongan Keterlambatan/Denda (IDR)
                  </label>
                  <input
                    type="text"
                    value={formatThousandNumber(editSlipForm.deductions_amount)}
                    onChange={(e) => {
                      const val = parseThousandNumber(e.target.value);
                      setEditSlipForm((prev) => ({ ...prev, deductions_amount: val }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#18181b] text-rose-700 dark:text-rose-300 font-mono font-bold"
                    placeholder="e.g. 50.000"
                  />
                </div>
              </div>

              {/* Status and Take Home Pay Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Status Slip
                    </label>
                    <select
                      value={editSlipForm.status || 'final'}
                      onChange={(e) => setEditSlipForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="draft">DRAFT (Penyusunan)</option>
                      <option value="final">FINAL (Resmi / Siap Cetak)</option>
                      <option value="paid">PAID (Telah Ditransfer / Lunas)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleRecalculateEditNetSalary}
                    className="px-3 py-1.5 text-xs rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Hitung Ulang Otomatis
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#27272a]">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Take Home Pay (Gaji Bersih Diterima)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={formatThousandNumber(editSlipForm.net_salary)}
                      onChange={(e) => {
                        const val = parseThousandNumber(e.target.value);
                        setEditSlipForm((prev) => ({ ...prev, net_salary: val }));
                      }}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-[#27272a] bg-white dark:bg-[#121215] text-emerald-600 dark:text-emerald-400 font-mono font-black"
                    />
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      {formatRupiah(editSlipForm.net_salary || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Modal Action Footer */}
            <div className="flex justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 dark:border-[#27272a] bg-slate-50/90 dark:bg-[#161619] backdrop-blur-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEditSlipModal(false);
                  setEditingSlip(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUpdatingSlip}
                onClick={handleSaveEditSlip}
                className="px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                {isUpdatingSlip ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE SLIP GAJI */}
      {slipToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Slip Gaji #{slipToDelete.id}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini permanen di sistem & database MySQL.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Karyawan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{slipToDelete.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">NIP:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{slipToDelete.employee_nip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Periode:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateDDMMYYYY(slipToDelete.period_start)} s/d {formatDateDDMMYYYY(slipToDelete.period_end)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-[#27272a] font-bold">
                <span className="text-slate-700 dark:text-slate-300">Take Home Pay:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatRupiah(slipToDelete.net_salary)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingSlip}
                onClick={() => setSlipToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingSlip}
                onClick={handleConfirmDeleteSlip}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isDeletingSlip ? 'Menghapus...' : 'Ya, Hapus Slip Gaji'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE RULE */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Aturan {ruleToDelete.type === 'ot' ? 'Lembur' : ruleToDelete.type === 'ded' ? 'Potongan' : 'Tunjangan'}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  "{ruleToDelete.name}" akan dihapus dari database.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingRule}
                onClick={() => setRuleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingRule}
                onClick={handleConfirmDeleteRule}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
              >
                {isDeletingRule ? 'Menghapus...' : 'Ya, Hapus Aturan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
