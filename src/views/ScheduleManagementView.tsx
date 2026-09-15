import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Building2,
  Sparkles,
  Edit2,
  Trash2,
  Briefcase,
  RefreshCw,
  Database,
  Loader2,
  Info,
} from 'lucide-react';
import { DateInput } from '../components/DateInput';
import { TimeInput } from '../components/TimeInput';
import { WorkSchedule, SchedulePlot, Division, JobGrade, CompanyProfile, User, Employee } from '../types';
import { exportToExcel, exportToPdfPrint } from '../lib/exportUtils';
import { getCompanyInitials, getContrastTextColorStyle, getAccessibleAccentColor } from '../lib/companyUtils';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { formatDateDDMMYYYY } from '../lib/formatUtils';
import { isEmployeeMatchingScheduleDivision } from '../lib/payrollCalculator';
import { ExportDropdown } from '../components/ExportDropdown';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

interface ScheduleManagementViewProps {
  currentUser?: User | null;
  schedules: WorkSchedule[];
  schedulePlots: SchedulePlot[];
  divisions: Division[];
  jobGrades: JobGrade[];
  employees?: Employee[];
  accentColor: string;
  isDarkMode?: boolean;
  companyName?: string;
  company?: CompanyProfile;
  companyProfile?: CompanyProfile;
  onAddSchedule: (data: Partial<WorkSchedule>) => Promise<any>;
  onUpdateSchedule?: (id: number, data: Partial<WorkSchedule>) => Promise<any>;
  onDeleteSchedule?: (id: number) => Promise<any>;
  onAddSchedulePlot: (data: Partial<SchedulePlot>) => Promise<any>;
  onUpdateSchedulePlot?: (id: number, data: Partial<SchedulePlot>) => Promise<any>;
  onDeleteSchedulePlot?: (id: number) => Promise<any>;
  onRefreshData?: () => Promise<any>;
}

export const ScheduleManagementView: React.FC<ScheduleManagementViewProps> = ({
  currentUser,
  schedules,
  schedulePlots,
  divisions,
  jobGrades,
  employees = [],
  accentColor,
  isDarkMode = true,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  company,
  companyProfile,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAddSchedulePlot,
  onUpdateSchedulePlot,
  onDeleteSchedulePlot,
  onRefreshData,
}) => {
  const isDark = typeof isDarkMode === 'boolean'
    ? isDarkMode
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);
  const accessibleColor = getAccessibleAccentColor(accentColor, isDark);

  const [subTab, setSubTab] = useState<'templates' | 'plotting'>('templates');
  const [searchSchedule, setSearchSchedule] = useState('');
  const [plotScopeFilter, setPlotScopeFilter] = useState<'all' | 'general' | 'division' | 'job_grade'>('all');
  const [plotScheduleFilter, setPlotScheduleFilter] = useState<string>('all');
  const [searchPlot, setSearchPlot] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setSyncStatusMsg('Database tersinkronisasi!');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (err: any) {
      setSyncStatusMsg('Gagal menyinkronkan data.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Modals & Edit States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState<Partial<WorkSchedule>>({
    schedule_name: '',
    target_division: 'Semua Divisi (Umum)',
    time_in: '08:00',
    time_out: '17:00',
    break_start: '12:00',
    break_end: '13:00',
    tolerance_minutes: 15,
    earliest_clock_in_minutes: 120,
    is_lateness_disabled: false,
    exempt_job_grades: [],
    working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  });

  const fallbackDivisions: Division[] = [
    { id: 1, division_code: 'PROD', division_name: 'Operasional & Produksi Ready-Mix', description: '', is_active: true },
    { id: 2, division_code: 'LOG', division_name: 'Logistik & Armada Truk Mixer', description: '', is_active: true },
    { id: 3, division_code: 'HRD', division_name: 'HRD & Umum', description: '', is_active: true },
    { id: 4, division_code: 'FIN', division_name: 'Keuangan & Akuntansi', description: '', is_active: true },
    { id: 5, division_code: 'QC', division_name: 'Quality Control & Laboratorium Beton', description: '', is_active: true },
  ];

  const [isRefreshingDivisions, setIsRefreshingDivisions] = useState(false);
  const [localDivisions, setLocalDivisions] = useState<Division[]>(divisions || []);

  React.useEffect(() => {
    if (divisions && divisions.length > 0) {
      setLocalDivisions(divisions);
    }
  }, [divisions]);

  const handleRefreshDivisions = async () => {
    setIsRefreshingDivisions(true);
    try {
      const freshDivs = await api.getDivisions();
      if (Array.isArray(freshDivs) && freshDivs.length > 0) {
        setLocalDivisions(freshDivs);
      }
      if (onRefreshData) {
        await onRefreshData();
      }
      toast.success('Data divisi berhasil diperbarui langsung dari tabel division!');
    } catch (err: any) {
      toast.error('Gagal memperbarui tabel divisi: ' + (err.message || 'Error'));
    } finally {
      setIsRefreshingDivisions(false);
    }
  };

  const currentAvailableDivisions = (localDivisions && localDivisions.length > 0)
    ? localDivisions
    : (divisions && divisions.length > 0 ? divisions : fallbackDivisions);

  const isAllDivisionsSelected =
    !schedForm.target_division ||
    schedForm.target_division === 'Semua Divisi (Umum)' ||
    schedForm.target_division === 'Semua Divisi' ||
    schedForm.target_division === 'Umum';

  const selectedDivisionList = React.useMemo(() => {
    if (!schedForm.target_division || isAllDivisionsSelected) return [];
    return schedForm.target_division
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [schedForm.target_division, isAllDivisionsSelected]);

  const isDivisionCardSelected = (divName: string) => {
    if (isAllDivisionsSelected) return false;
    return selectedDivisionList.some(
      (item) =>
        item.toLowerCase() === divName.toLowerCase() ||
        item.toLowerCase().includes(divName.toLowerCase()) ||
        divName.toLowerCase().includes(item.toLowerCase())
    );
  };

  const handleToggleDivisionCard = (divName: string) => {
    let currentList = isAllDivisionsSelected ? [] : [...selectedDivisionList];
    const existingIndex = currentList.findIndex(
      (item) =>
        item.toLowerCase() === divName.toLowerCase() ||
        item.toLowerCase().includes(divName.toLowerCase()) ||
        divName.toLowerCase().includes(item.toLowerCase())
    );

    if (existingIndex >= 0) {
      currentList.splice(existingIndex, 1);
    } else {
      currentList.push(divName);
    }

    setSchedForm((prev) => ({
      ...prev,
      target_division: currentList.length > 0 ? currentList.join(', ') : 'Semua Divisi (Umum)',
    }));
  };

  const [showPlotModal, setShowPlotModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState<SchedulePlot | null>(null);
  const [isSubmittingPlot, setIsSubmittingPlot] = useState(false);
  const [plotForm, setPlotForm] = useState<Partial<SchedulePlot>>({
    schedule_id: schedules[0]?.id || 1,
    scope_type: 'division',
    scope_id: divisions[0]?.id || null,
    date_start: new Date().toISOString().slice(0, 10),
    date_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: '',
  });

  // Confirmation Modal state for edit & delete operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    details?: { label: string; value: string }[];
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Sorting for Schedule Plots
  const [plotSortKey, setPlotSortKey] = useState<string | null>('date_start');
  const [plotSortDir, setPlotSortDir] = useState<SortDirection>('desc');

  const handleSortPlot = (key: string) => {
    if (plotSortKey === key) {
      if (plotSortDir === 'asc') setPlotSortDir('desc');
      else if (plotSortDir === 'desc') {
        setPlotSortKey(null);
        setPlotSortDir(null);
      }
    } else {
      setPlotSortKey(key);
      setPlotSortDir('asc');
    }
  };

  // State for viewing assigned employees modal (Pict 1)
  const [viewAssignedModalSched, setViewAssignedModalSched] = useState<WorkSchedule | null>(null);
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');

  // Helper to compute employees plotted to a specific schedule
  const getAssignedEmployeesForSchedule = (sched: WorkSchedule) => {
    const directPlots = schedulePlots.filter((p) => Number(p.schedule_id) === Number(sched.id));
    const resultMap = new Map<number, { employee: Employee; plotReason: string; dateRange: string; source: 'direct_plot' | 'template_target' }>();

    directPlots.forEach((p) => {
      const dateRangeStr = `${formatDateDDMMYYYY(p.date_start)} s/d ${formatDateDDMMYYYY(p.date_end)}`;
      if (p.scope_type === 'general') {
        employees.forEach((emp) => {
          if (isEmployeeMatchingScheduleDivision(emp, sched.target_division)) {
            resultMap.set(emp.id, {
              employee: emp,
              plotReason: `Plotting General${p.notes ? ` - ${p.notes}` : ''}`,
              dateRange: dateRangeStr,
              source: 'direct_plot',
            });
          }
        });
      } else if (p.scope_type === 'division') {
        employees.forEach((emp) => {
          const matchId = emp.division_id === p.scope_id;
          const matchName = p.scope_name && emp.division_name && emp.division_name.toLowerCase() === p.scope_name.toLowerCase();
          if (matchId || matchName) {
            resultMap.set(emp.id, {
              employee: emp,
              plotReason: `Plotting Divisi: ${p.scope_name || emp.division_name || 'Terkait'}`,
              dateRange: dateRangeStr,
              source: 'direct_plot',
            });
          }
        });
      } else if (p.scope_type === 'job_grade') {
        employees.forEach((emp) => {
          const matchId = emp.job_grade_id === p.scope_id;
          const matchName = p.scope_name && emp.job_grade_name && emp.job_grade_name.toLowerCase() === p.scope_name.toLowerCase();
          const matchDivision = isEmployeeMatchingScheduleDivision(emp, sched.target_division);
          if ((matchId || matchName) && matchDivision) {
            resultMap.set(emp.id, {
              employee: emp,
              plotReason: `Plotting Golongan: ${p.scope_name || emp.job_grade_name || 'Terkait'}`,
              dateRange: dateRangeStr,
              source: 'direct_plot',
            });
          }
        });
      } else if (p.scope_type === 'employee') {
        const emp = employees.find((e) => e.id === p.scope_id);
        if (emp) {
          resultMap.set(emp.id, {
            employee: emp,
            plotReason: 'Plotting Personal Khusus',
            dateRange: dateRangeStr,
            source: 'direct_plot',
          });
        }
      }
    });

    // If no direct plots found, fallback to target divisions configured on the schedule template
    if (resultMap.size === 0 && sched.target_division) {
      const targetDivText = sched.target_division.toLowerCase();
      if (targetDivText.includes('semua divisi') || targetDivText.includes('umum')) {
        employees.forEach((emp) => {
          resultMap.set(emp.id, {
            employee: emp,
            plotReason: 'Target Divisi Template (Semua Divisi)',
            dateRange: 'Permanen / Default Shift',
            source: 'template_target',
          });
        });
      } else {
        employees.forEach((emp) => {
          if (emp.division_name && targetDivText.includes(emp.division_name.toLowerCase())) {
            resultMap.set(emp.id, {
              employee: emp,
              plotReason: `Target Divisi: ${emp.division_name}`,
              dateRange: 'Permanen / Default Shift',
              source: 'template_target',
            });
          }
        });
      }
    }

    return Array.from(resultMap.values());
  };

  const filteredSchedules = schedules.filter((s) => {
    const term = (searchSchedule || '').toLowerCase();
    return (
      (s.schedule_name || '').toLowerCase().includes(term) ||
      (s.time_in || '').toLowerCase().includes(term) ||
      (s.time_out || '').toLowerCase().includes(term)
    );
  });

  // Dynamically resolve schedule_name and scope_name for all plots
  const resolvedSchedulePlots = useMemo(() => {
    return schedulePlots.map((p) => {
      const sched = schedules.find((s) => Number(s.id) === Number(p.schedule_id));
      let scopeName = p.scope_name;
      if (!scopeName || scopeName === '-') {
        if (p.scope_type === 'general') {
          scopeName = 'Semua Karyawan (General)';
        } else if (p.scope_type === 'division') {
          const div = divisions.find((d) => Number(d.id) === Number(p.scope_id));
          scopeName = div ? div.division_name : (p.scope_id ? `Divisi #${p.scope_id}` : 'Semua Divisi');
        } else if (p.scope_type === 'job_grade') {
          const gr = jobGrades.find(
            (g) =>
              Number(g.id) === Number(p.scope_id) ||
              String(g.grade_code).toLowerCase() === String(p.scope_id).toLowerCase() ||
              String(g.grade_name).toLowerCase() === String(p.scope_id).toLowerCase()
          );
          scopeName = gr
            ? `${gr.grade_code ? `[${gr.grade_code}] ` : ''}${gr.grade_name}`
            : (p.scope_id ? `Golongan #${p.scope_id}` : 'Golongan');
        } else if (p.scope_type === 'employee') {
          const emp = employees.find(
            (e) =>
              Number(e.id) === Number(p.scope_id) ||
              String(e.nip).toLowerCase() === String(p.scope_id).toLowerCase()
          );
          scopeName = emp ? `${emp.nip} - ${emp.full_name}` : (p.scope_id ? `Karyawan #${p.scope_id}` : 'Karyawan');
        }
      }
      return {
        ...p,
        schedule_name: (sched && sched.schedule_name) ? sched.schedule_name : (p.schedule_name || `Jadwal #${p.schedule_id}`),
        scope_name: scopeName || '-',
      };
    });
  }, [schedulePlots, schedules, divisions, jobGrades, employees]);

  const filteredSchedulePlots = resolvedSchedulePlots.filter((p) => {
    const matchScope = plotScopeFilter === 'all' || p.scope_type === plotScopeFilter;
    const matchSched = plotScheduleFilter === 'all' || String(p.schedule_id) === plotScheduleFilter;
    const term = (searchPlot || '').toLowerCase();
    const matchSearch =
      (p.schedule_name || '').toLowerCase().includes(term) ||
      (p.scope_name || '').toLowerCase().includes(term) ||
      (p.notes || '').toLowerCase().includes(term) ||
      (p.date_start || '').toLowerCase().includes(term) ||
      (p.date_end || '').toLowerCase().includes(term);
    return matchScope && matchSched && matchSearch;
  });

  const sortedSchedulePlots = sortTableData(filteredSchedulePlots, plotSortKey, plotSortDir);

  // Table Sync Handlers
  const handleSyncPlots = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncTable('schedule_plots');
      toast.success('Sync Berhasil', res.message || 'Data plotting jadwal berhasil disinkronkan');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || 'Gagal sinkronisasi data plotting jadwal');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSchedules = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncTable('work_schedules');
      toast.success('Sync Berhasil', res.message || 'Data template jadwal kerja berhasil disinkronkan');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || 'Gagal sinkronisasi master jadwal');
    } finally {
      setIsSyncing(false);
    }
  };

  const activeCompanyBranding = companyProfile || company || {
    id: 1,
    company_name: companyName,
    logo_url: '/logo_nku.svg',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    timezone: 'Asia/Jakarta',
    theme_mode: 'dark' as const,
    color_palette: accentColor,
  };

  // Helper: Toggle Exempt Job Grade for Schedule Template
  const handleToggleExemptJobGrade = (gradeId: number) => {
    const current = Array.isArray(schedForm.exempt_job_grades) ? [...schedForm.exempt_job_grades] : [];
    const idx = current.indexOf(gradeId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(gradeId);
    }
    setSchedForm((prev) => ({ ...prev, exempt_job_grades: current }));
  };

  // Open Add Schedule Modal
  const handleOpenAddSchedule = () => {
    setEditingSchedule(null);
    setSchedForm({
      schedule_name: '',
      target_division: 'Semua Divisi (Umum)',
      time_in: '08:00',
      time_out: '17:00',
      break_start: '12:00',
      break_end: '13:00',
      tolerance_minutes: 15,
      earliest_clock_in_minutes: 120,
      is_lateness_disabled: false,
      exempt_job_grades: [],
      working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    });
    setShowScheduleModal(true);
  };

  // Open Edit Schedule Modal
  const handleOpenEditSchedule = (sched: WorkSchedule) => {
    setEditingSchedule(sched);
    setSchedForm({
      schedule_name: sched.schedule_name,
      target_division: sched.target_division || (
        sched.id === 1
          ? 'Keuangan & Akuntansi, HRD & Umum'
          : sched.id === 2
          ? 'Operasional & Produksi Ready-Mix'
          : sched.id === 3
          ? 'Operasional & Produksi Ready-Mix, Logistik & Armada'
          : 'Semua Divisi (Umum)'
      ),
      time_in: sched.time_in?.slice(0, 5) || '08:00',
      time_out: sched.time_out?.slice(0, 5) || '17:00',
      break_start: sched.break_start?.slice(0, 5) || '12:00',
      break_end: sched.break_end?.slice(0, 5) || '13:00',
      tolerance_minutes: sched.tolerance_minutes ?? 15,
      earliest_clock_in_minutes: sched.earliest_clock_in_minutes ?? 120,
      is_lateness_disabled: Boolean(sched.is_lateness_disabled),
      exempt_job_grades: Array.isArray(sched.exempt_job_grades) ? [...sched.exempt_job_grades] : [],
      working_days: sched.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
    });
    setShowScheduleModal(true);
  };

  // Delete Schedule with Confirmation
  const handleDeleteSchedule = (sched: WorkSchedule) => {
    setConfirmModal({
      isOpen: true,
      title: `Hapus Template Jadwal: ${sched.schedule_name}`,
      description: `Aksi ini akan menghapus master jadwal ID #${sched.id} beserta seluruh penugasan plotting yang menggunakan template ini dari database secara permanen.`,
      confirmLabel: 'Hapus Template Jadwal',
      variant: 'danger',
      details: [
        { label: 'Nama Jadwal', value: sched.schedule_name },
        { label: 'Jam Kerja', value: `${sched.time_in.slice(0, 5)} - ${sched.time_out.slice(0, 5)}` },
        { label: 'Toleransi Telat', value: `${sched.tolerance_minutes} Menit` },
      ],
      onConfirm: async () => {
        if (onDeleteSchedule) {
          await onDeleteSchedule(sched.id);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Open Add Plot Modal
  const handleOpenAddPlot = () => {
    setEditingPlot(null);
    setPlotForm({
      schedule_id: schedules[0]?.id || 1,
      scope_type: 'general',
      scope_id: null,
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: '',
    });
    setShowPlotModal(true);
  };

  // Open Edit Plot Modal
  const handleOpenEditPlot = (plot: SchedulePlot) => {
    setEditingPlot(plot);
    setPlotForm({
      schedule_id: plot.schedule_id,
      scope_type: plot.scope_type === 'division' ? 'general' : plot.scope_type,
      scope_id: plot.scope_type === 'job_grade' ? plot.scope_id : null,
      date_start: plot.date_start,
      date_end: plot.date_end,
      notes: plot.notes || '',
    });
    setShowPlotModal(true);
  };

  // Delete Plot with Confirmation
  const handleDeletePlot = (plot: SchedulePlot) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Plotting Penugasan Jadwal',
      description: `Aksi ini akan menghapus penugasan jadwal "${plot.schedule_name || '-'}" untuk "${plot.scope_name || '-'}" dari database.`,
      confirmLabel: 'Hapus Plotting',
      variant: 'danger',
      details: [
        { label: 'Template Jadwal', value: plot.schedule_name || '-' },
        { label: 'Scope Penugasan', value: plot.scope_name || '-' },
        { label: 'Periode Berlaku', value: `${plot.date_start} s/d ${plot.date_end}` },
        { label: 'Catatan', value: plot.notes || '-' },
      ],
      onConfirm: async () => {
        if (onDeleteSchedulePlot) {
          await onDeleteSchedulePlot(plot.id);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Submit Schedule (Add or Edit with Confirmation)
  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSchedule) return;

    if (editingSchedule) {
      setConfirmModal({
        isOpen: true,
        title: 'Konfirmasi Simpan Perubahan Jadwal',
        description: `Apakah Anda yakin ingin memperbarui template jadwal kerja "${schedForm.schedule_name || editingSchedule.schedule_name}" ke database?`,
        confirmLabel: 'Ya, Simpan Perubahan',
        variant: 'primary',
        details: [
          { label: 'Nama Jadwal', value: schedForm.schedule_name || editingSchedule.schedule_name },
          { label: 'Peruntukan Divisi', value: schedForm.target_division || 'Semua Divisi (Umum)' },
          { label: 'Jam Kerja', value: `${schedForm.time_in || '08:00'} - ${schedForm.time_out || '17:00'}` },
          { label: 'Istirahat', value: `${schedForm.break_start || '-'} s/d ${schedForm.break_end || '-'}` },
          { label: 'Toleransi Telat', value: `${schedForm.tolerance_minutes ?? 0} Menit` },
          {
            label: 'Aturan Terlambat',
            value: schedForm.is_lateness_disabled
              ? 'Bebas Keterlambatan (Semua Golongan)'
              : schedForm.exempt_job_grades && schedForm.exempt_job_grades.length > 0
              ? `${schedForm.exempt_job_grades.length} Golongan Bebas Terlambat`
              : 'Standar (Sesuai Toleransi)',
          },
          { label: 'Hari Kerja', value: (schedForm.working_days || []).join(', ').toUpperCase() },
        ],
        onConfirm: async () => {
          if (onUpdateSchedule) {
            await onUpdateSchedule(editingSchedule.id, schedForm);
          }
          setShowScheduleModal(false);
          setEditingSchedule(null);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setIsSubmittingSchedule(true);
      try {
        await onAddSchedule(schedForm);
        setShowScheduleModal(false);
        setEditingSchedule(null);
      } finally {
        setIsSubmittingSchedule(false);
      }
    }
  };

  // Submit Plot (Add or Edit with Confirmation)
  const handleSubmitPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPlot) return;

    const selectedSched = schedules.find((s) => s.id === plotForm.schedule_id);
    let scopeLabel = 'General (Semua Karyawan)';
    if (plotForm.scope_type === 'division') {
      const div = divisions.find((d) => d.id === plotForm.scope_id);
      scopeLabel = div ? `Divisi: ${div.division_name}` : `Divisi #${plotForm.scope_id}`;
    } else if (plotForm.scope_type === 'job_grade') {
      const gr = jobGrades.find((g) => g.id === plotForm.scope_id);
      scopeLabel = gr ? `Golongan: ${gr.grade_name}` : `Golongan #${plotForm.scope_id}`;
    }

    if (editingPlot) {
      setConfirmModal({
        isOpen: true,
        title: 'Konfirmasi Simpan Perubahan Plotting',
        description: 'Apakah Anda yakin ingin memperbarui data penugasan plotting jadwal ini ke database?',
        confirmLabel: 'Ya, Simpan Perubahan',
        variant: 'primary',
        details: [
          { label: 'Template Jadwal', value: selectedSched?.schedule_name || '-' },
          { label: 'Scope Penugasan', value: scopeLabel },
          { label: 'Periode Berlaku', value: `${plotForm.date_start} s/d ${plotForm.date_end}` },
          { label: 'Catatan', value: plotForm.notes || '-' },
        ],
        onConfirm: async () => {
          if (onUpdateSchedulePlot) {
            await onUpdateSchedulePlot(editingPlot.id, plotForm);
          }
          setShowPlotModal(false);
          setEditingPlot(null);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setIsSubmittingPlot(true);
      try {
        await onAddSchedulePlot({
          ...plotForm,
          created_by: currentUser?.id || 1,
        });
        setShowPlotModal(false);
        setEditingPlot(null);
      } finally {
        setIsSubmittingPlot(false);
      }
    }
  };

  // Export templates (filtered)
  const handleExportTemplatesExcel = () => {
    const data = filteredSchedules.map((s, idx) => ({
      No: idx + 1,
      Nama_Jadwal: s.schedule_name,
      Jam_Masuk: s.time_in,
      Jam_Pulang: s.time_out,
      Jam_Istirahat: `${s.break_start || '-'} s/d ${s.break_end || '-'}`,
      Toleransi_Menit: s.tolerance_minutes,
      Hari_Kerja: s.working_days.join(', '),
      Status: s.is_active ? 'Aktif' : 'Non-Aktif',
    }));
    exportToExcel(
      data,
      `Master_Jadwal_Kerja_${getCompanyInitials(activeCompanyBranding?.company_name || companyName)}`,
      'Jadwal',
      activeCompanyBranding,
      'Laporan Master Template Jadwal Kerja'
    );
  };

  const handleExportTemplatesPdf = () => {
    const headers = ['Nama Jadwal', 'Jam Masuk', 'Jam Pulang', 'Istirahat', 'Toleransi', 'Hari Kerja'];
    const rows = filteredSchedules.map((s) => [
      s.schedule_name,
      s.time_in,
      s.time_out,
      `${s.break_start || '-'} - ${s.break_end || '-'}`,
      `${s.tolerance_minutes} Menit`,
      s.working_days.join(', '),
    ]);
    exportToPdfPrint(
      `Laporan Master Template Jadwal Kerja`,
      `Total: ${rows.length} Template Jadwal`,
      headers,
      rows,
      activeCompanyBranding
    );
  };

  // Export plotting (filtered and sorted)
  const handleExportPlotsExcel = () => {
    const data = sortedSchedulePlots.map((p, idx) => ({
      No: idx + 1,
      Template_Jadwal: p.schedule_name || `Jadwal #${p.schedule_id}`,
      Tipe_Scope: p.scope_type.toUpperCase(),
      Target_Penerapan: p.scope_name || '-',
      Tanggal_Mulai: formatDateDDMMYYYY(p.date_start),
      Tanggal_Selesai: formatDateDDMMYYYY(p.date_end),
      Catatan: p.notes || '-',
    }));
    exportToExcel(
      data,
      `Plotting_Jadwal_Kerja_${getCompanyInitials(activeCompanyBranding?.company_name || companyName)}`,
      'Plotting',
      activeCompanyBranding,
      'Laporan Plotting Penugasan Jadwal Kerja'
    );
  };

  const handleExportPlotsPdf = () => {
    const headers = ['Template Jadwal', 'Scope', 'Target Penerapan', 'Mulai', 'Selesai', 'Catatan'];
    const rows = sortedSchedulePlots.map((p) => [
      p.schedule_name || `Jadwal #${p.schedule_id}`,
      p.scope_type.toUpperCase(),
      p.scope_name || '-',
      formatDateDDMMYYYY(p.date_start),
      formatDateDDMMYYYY(p.date_end),
      p.notes || '-',
    ]);
    exportToPdfPrint(
      'Laporan Plotting Jadwal Kerja Karyawan',
      `Total: ${rows.length} Penugasan Plotting`,
      headers,
      rows,
      activeCompanyBranding
    );
  };

  const toggleWorkingDay = (day: string) => {
    const current = schedForm.working_days || [];
    if (current.includes(day)) {
      setSchedForm({ ...schedForm, working_days: current.filter((d) => d !== day) });
    } else {
      setSchedForm({ ...schedForm, working_days: [...current, day] });
    }
  };

  return (
    <div id="schedule-management-view" className="space-y-6">
      {/* Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#27272a] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 shrink-0" style={{ color: accessibleColor }} />
            Management Jadwal Kerja
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pengaturan template shift jam kerja dan plotting penugasan jadwal per divisi/golongan kerja
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl">
          <button
            onClick={() => setSubTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'templates'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'templates'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Master Jadwal ({schedules.length})
          </button>
          <button
            onClick={() => setSubTab('plotting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'plotting'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              subTab === 'plotting'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Plotting Jadwal ({schedulePlots.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MASTER JADWAL */}
      {subTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari master jadwal..."
                  value={searchSchedule}
                  onChange={(e) => setSearchSchedule(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white w-48 sm:w-64 focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredSchedules.length} dari {schedules.length} template
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncSchedules}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasikan template jadwal dengan database server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportTemplatesExcel}
                onExportPdf={handleExportTemplatesPdf}
                label="Export Jadwal"
              />
              <button
                onClick={handleOpenAddSchedule}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: accentColor,
                  color: getContrastTextColorStyle(accentColor),
                }}
              >
                <Plus className="w-4 h-4" />
                Buat Template Jadwal
              </button>
            </div>
          </div>

          {/* Schedule Cards Grid (Compact, balanced card sizing with 3 columns on desktop) */}
          {filteredSchedules.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#27272a] bg-white/50 dark:bg-[#121215]/50 text-slate-500 text-xs">
              Tidak ada template jadwal yang cocok dengan filter pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 items-stretch auto-rows-fr">
              {filteredSchedules.map((sched) => (
                <div
                  key={sched.id}
                  className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 h-full"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2.5 h-8 shrink-0">
                      <span
                        className="p-1.5 rounded-lg border"
                        style={{
                          borderColor: `${accentColor}40`,
                          backgroundColor: `${accentColor}12`,
                          color: accessibleColor,
                        }}
                      >
                        <Clock className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        AKTIF
                      </span>
                    </div>

                    {/* Highlighted Schedule Template Name Banner - Compact & Uniform */}
                    <div
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-transparent transition-all relative overflow-hidden shadow-2xs h-[80px] flex flex-col justify-center shrink-0"
                      style={{
                        borderTopWidth: '4px',
                        borderTopColor: accentColor,
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider mb-0.5"
                        style={{ color: accessibleColor }}
                      >
                        <Clock className="w-3 h-3" style={{ color: accessibleColor }} />
                        <span>Template Shift Kerja</span>
                      </div>
                      <h3
                        className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-snug line-clamp-2"
                        title={sched.schedule_name}
                      >
                        {sched.schedule_name}
                      </h3>
                    </div>

                    {/* Status / Keterangan Jadwal untuk Divisi Apa - Compact & Uniform */}
                    <div
                      className="mt-2.5 p-2.5 rounded-xl border bg-transparent relative group cursor-help transition-colors shadow-2xs h-[78px] flex flex-col justify-center shrink-0"
                      style={{
                        borderColor: `${accentColor}40`,
                        backgroundColor: `${accentColor}08`,
                      }}
                      title={
                        sched.target_division ||
                        (sched.id === 1
                          ? 'Keuangan & Akuntansi, HRD & Umum'
                          : sched.id === 2
                          ? 'Operasional & Produksi Ready-Mix'
                          : sched.id === 3
                          ? 'Operasional & Produksi Ready-Mix, Logistik & Armada'
                          : 'Semua Divisi (Umum Perusahaan)')
                      }
                    >
                      <div
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider mb-0.5"
                        style={{ color: accessibleColor }}
                      >
                        <Briefcase className="w-3 h-3 shrink-0" style={{ color: accessibleColor }} />
                        <span>STATUS / PERUNTUKAN DIVISI:</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="font-black text-sm leading-none shrink-0" style={{ color: accessibleColor }}>•</span>
                        <span className="line-clamp-2 leading-tight text-[11px]">
                          {sched.target_division || (
                            sched.id === 1
                              ? 'Keuangan & Akuntansi, HRD & Umum'
                              : sched.id === 2
                              ? 'Operasional & Produksi Ready-Mix'
                              : sched.id === 3
                              ? 'Operasional & Produksi Ready-Mix, Logistik & Armada'
                              : 'Semua Divisi (Umum Perusahaan)'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs h-[58px] shrink-0">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#18181b] border border-slate-100 dark:border-[#27272a] flex flex-col justify-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Jam Masuk</div>
                        <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">
                          {sched.time_in.slice(0, 5)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#18181b] border border-slate-100 dark:border-[#27272a] flex flex-col justify-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Jam Pulang</div>
                        <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">
                          {sched.time_out.slice(0, 5)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 h-[40px] shrink-0 flex flex-col justify-between text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Jam Istirahat:</span>
                        <span className="font-mono font-medium">
                          {sched.break_start?.slice(0, 5)} - {sched.break_end?.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Toleransi Telat:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {sched.is_lateness_disabled ? 'Nonaktif (Bebas)' : `${sched.tolerance_minutes} Menit`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Buka Presensi:</span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          {sched.earliest_clock_in_minutes ?? 120} Mnt Sblm Shift
                        </span>
                      </div>
                    </div>

                    {sched.is_lateness_disabled ? (
                      <div className="mt-2 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-between">
                        <span>Status Terlambat:</span>
                        <span className="uppercase text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded">Bebas Terlambat</span>
                      </div>
                    ) : sched.exempt_job_grades && sched.exempt_job_grades.length > 0 ? (
                      <div className="mt-2 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-between">
                        <span>Pengecualian Telat:</span>
                        <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">{sched.exempt_job_grades.length} Golongan Bebas</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto flex flex-col">
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#27272a] h-[60px] shrink-0 flex flex-col justify-center">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">Hari Kerja:</div>
                      <div className="flex flex-wrap gap-1">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                          const isWork = sched.working_days?.includes(day);
                          return (
                            <span
                              key={day}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                !isWork
                                  ? 'bg-slate-100 text-slate-500 dark:bg-[#18181b] dark:text-slate-400 border border-transparent dark:border-[#27272a]'
                                  : ''
                              }`}
                              style={
                                isWork
                                  ? {
                                      backgroundColor: `${accentColor}18`,
                                      color: accessibleColor,
                                    }
                                  : undefined
                              }
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Link / Button: Karyawan Siapa Saja yang Di-Plot untuk Template Ini */}
                    {(() => {
                      const assignedEmployees = getAssignedEmployeesForSchedule(sched);
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-[#27272a] h-[52px] shrink-0 flex flex-col justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setViewAssignedModalSched(sched);
                              setAssignedSearchQuery('');
                            }}
                            className="w-full py-2 px-3 rounded-lg border bg-transparent text-xs font-bold flex items-center justify-between transition-all hover:bg-slate-100/50 dark:hover:bg-white/5 active:scale-[0.99] group shadow-xs cursor-pointer"
                            style={{
                              borderColor: `${accentColor}45`,
                            }}
                            title={`Klik untuk melihat daftar karyawan siapa saja yang di-plot untuk template ${sched.schedule_name}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" style={{ color: accessibleColor }} />
                              <span className="font-bold underline-offset-2 group-hover:underline text-slate-900 dark:text-white text-[11px]">
                                Karyawan Ter-Plot
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black shadow-xs transition-transform group-hover:scale-105 border"
                                style={{
                                  backgroundColor: accentColor,
                                  borderColor: accentColor,
                                  color: getContrastTextColorStyle(accentColor),
                                }}
                              >
                                {assignedEmployees.length} Orang
                              </span>
                              <span
                                className="text-xs group-hover:translate-x-0.5 transition-transform font-bold"
                                style={{ color: accessibleColor }}
                              >
                                &rarr;
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Edit & Delete Action Menu */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-[#27272a] h-[46px] shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditSchedule(sched)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Edit Master Jadwal"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(sched)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Hapus Master Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID #{sched.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PLOTTING JADWAL */}
      {subTab === 'plotting' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#121215] p-4 rounded-2xl border border-slate-200 dark:border-[#27272a]">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari plotting jadwal..."
                  value={searchPlot}
                  onChange={(e) => setSearchPlot(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white w-44 sm:w-56 focus:outline-hidden"
                />
              </div>

              <select
                value={plotScopeFilter}
                onChange={(e) => setPlotScopeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
              >
                <option value="all">Semua Scope</option>
                <option value="general">Scope: General</option>
                <option value="division">Scope: Divisi</option>
                <option value="job_grade">Scope: Golongan</option>
              </select>

              <select
                value={plotScheduleFilter}
                onChange={(e) => setPlotScheduleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
              >
                <option value="all">Semua Template Jadwal</option>
                {schedules.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.schedule_name}
                  </option>
                ))}
              </select>

              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ({sortedSchedulePlots.length} dari {schedulePlots.length} plotting)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncPlots}
                disabled={isSyncing}
                title="Sinkronisasikan data plotting jadwal dengan database"
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportPlotsExcel}
                onExportPdf={handleExportPlotsPdf}
                label="Export Plotting"
              />
              <button
                onClick={handleOpenAddPlot}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Plotting Jadwal
              </button>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <SortableTh sortKey="schedule_name" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Template Jadwal
                    </SortableTh>
                    <SortableTh sortKey="scope_type" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Scope Penugasan
                    </SortableTh>
                    <SortableTh sortKey="scope_name" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Target Penugasan
                    </SortableTh>
                    <SortableTh sortKey="date_start" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Tgl Mulai
                    </SortableTh>
                    <SortableTh sortKey="date_end" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Tgl Selesai
                    </SortableTh>
                    <SortableTh sortKey="notes" currentSortKey={plotSortKey} currentSortDirection={plotSortDir} onSort={handleSortPlot}>
                      Catatan Operasional
                    </SortableTh>
                    <th className="py-3 px-4 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {sortedSchedulePlots.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        Belum ada data plotting jadwal yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    sortedSchedulePlots.map((plot, idx) => (
                      <tr key={plot.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white" title={plot.schedule_name || `Jadwal #${plot.schedule_id}`}>
                          {plot.schedule_name || `Jadwal #${plot.schedule_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              plot.scope_type === 'general'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : plot.scope_type === 'division'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {plot.scope_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200" title={plot.scope_name || '-'}>
                          {plot.scope_name || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatDateDDMMYYYY(plot.date_start)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatDateDDMMYYYY(plot.date_end)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={plot.notes || '-'}>
                          {plot.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditPlot(plot)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-600 dark:text-slate-300 transition-colors"
                              title="Edit Plotting"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDeletePlot(plot)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Hapus Plotting"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
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

      {/* MODAL: Buat / Edit Template Jadwal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span>{editingSchedule ? 'Edit Template Jadwal Kerja' : 'Buat Template Jadwal Kerja'}</span>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingSchedule(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </h2>
            <form onSubmit={handleSubmitSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Template Jadwal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shift Siang Batching Plant"
                  value={schedForm.schedule_name || ''}
                  onChange={(e) => setSchedForm({ ...schedForm, schedule_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Pemilihan Divisi Berdasarkan Master Divisi (Style Card Multi-Selection) */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Peruntukan Divisi (Master Divisi) *
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleRefreshDivisions}
                      disabled={isRefreshingDivisions}
                      className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-all flex items-center gap-1 border border-sky-200/50 dark:border-sky-800/50 disabled:opacity-50 cursor-pointer"
                      title="Refresh & ambil data divisi terbaru langsung dari tabel division"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingDivisions ? 'animate-spin text-sky-500' : ''}`} />
                      <span>{isRefreshingDivisions ? 'Memperbarui...' : 'Refresh'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedForm({ ...schedForm, target_division: 'Semua Divisi (Umum)' })}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        isAllDivisionsSelected
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Semua Divisi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = currentAvailableDivisions.map((d) => d.division_name).join(', ');
                        setSchedForm({ ...schedForm, target_division: allNames });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                    >
                      Pilih Semua
                    </button>
                    {schedForm.target_division && (
                      <button
                        type="button"
                        onClick={() => setSchedForm({ ...schedForm, target_division: '' })}
                        className="text-[10px] px-2 py-0.5 rounded-md font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Pilih satu atau kombinasi beberapa divisi dari Master Divisi untuk menerapkan jadwal ini.
                </p>

                {/* Grid of Master Division Style Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/50 dark:bg-[#18181b]/50">
                  {/* General / All Division Option Card */}
                  <div
                    onClick={() => setSchedForm({ ...schedForm, target_division: 'Semua Divisi (Umum)' })}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                      isAllDivisionsSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 shadow-xs ring-1 ring-sky-500/30'
                        : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`p-1.5 rounded-lg ${
                        isAllDivisionsSelected ? 'bg-sky-500 text-white' : 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
                      }`}>
                        <Building2 className="w-3.5 h-3.5" />
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">Semua Divisi (Umum)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Seluruh divisi perusahaan</div>
                      </div>
                    </div>
                    {isAllDivisionsSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 ml-1.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#3f3f46] shrink-0 ml-1.5" />
                    )}
                  </div>

                  {/* Individual Master Division Cards */}
                  {currentAvailableDivisions.map((div) => {
                    const selected = isDivisionCardSelected(div.division_name);
                    return (
                      <div
                        key={div.id || div.division_code}
                        onClick={() => handleToggleDivisionCard(div.division_name)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                          selected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 shadow-xs ring-1 ring-sky-500/30'
                            : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase shrink-0 ${
                              selected
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {div.division_code || 'DIV'}
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate" title={div.division_name}>
                              {div.division_name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {div.description || 'Master Divisi Operasional'}
                            </div>
                          </div>
                        </div>
                        {selected ? (
                          <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 ml-1.5" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#3f3f46] shrink-0 ml-1.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Divisions Summary Pill Bar */}
                <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                    <span>
                      Kombinasi Terpilih ({isAllDivisionsSelected ? 'Semua Divisi' : `${selectedDivisionList.length} Divisi`}):
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isAllDivisionsSelected || selectedDivisionList.length === 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold text-xs">
                        Semua Divisi (Umum Perusahaan)
                      </span>
                    ) : (
                      selectedDivisionList.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold text-xs"
                        >
                          <span className="truncate max-w-[200px]">{name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDivisionCard(name);
                            }}
                            className="p-0.5 hover:bg-sky-200 dark:hover:bg-sky-900 rounded-full transition-colors cursor-pointer text-sky-600 dark:text-sky-400 hover:text-red-500 dark:hover:text-red-400"
                            title={`Hapus ${name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Masuk *
                  </label>
                  <TimeInput
                    required
                    value={schedForm.time_in || ''}
                    onChange={(v) => setSchedForm({ ...schedForm, time_in: v })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Pulang *
                  </label>
                  <TimeInput
                    required
                    value={schedForm.time_out || ''}
                    onChange={(v) => setSchedForm({ ...schedForm, time_out: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mulai Istirahat
                  </label>
                  <TimeInput
                    value={schedForm.break_start || ''}
                    onChange={(v) => setSchedForm({ ...schedForm, break_start: v })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selesai Istirahat
                  </label>
                  <TimeInput
                    value={schedForm.break_end || ''}
                    onChange={(v) => setSchedForm({ ...schedForm, break_end: v })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Toleransi Keterlambatan (Menit)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  disabled={Boolean(schedForm.is_lateness_disabled)}
                  value={schedForm.tolerance_minutes ?? 0}
                  onChange={(e) => setSchedForm({ ...schedForm, tolerance_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {schedForm.is_lateness_disabled && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    *Toleransi tidak berlaku karena status keterlambatan dinonaktifkan (bebas terlambat).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Paling Awal Boleh Clock In (Menit Sebelum Jam Masuk)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={schedForm.earliest_clock_in_minutes ?? 120}
                    onChange={(e) => setSchedForm({ ...schedForm, earliest_clock_in_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">Menit</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  *Standar 120 menit (2 jam). Mencegah presensi masuk di jam yang tidak wajar (misal jam 1 pagi untuk shift 08:00).
                </p>
              </div>

              {/* Lateness Exemption & Specific Job Grades Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    id="sched-disable-lateness"
                    type="checkbox"
                    checked={Boolean(schedForm.is_lateness_disabled)}
                    onChange={(e) =>
                      setSchedForm({ ...schedForm, is_lateness_disabled: e.target.checked })
                    }
                    className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="sched-disable-lateness" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Nonaktifkan Perhitungan Keterlambatan (Bebas Terlambat Seluruh Karyawan)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Jika dicentang, seluruh karyawan yang memakai jadwal ini tidak akan pernah dihitung terlambat saat presensi masuk.
                    </p>
                  </div>
                </div>

                {!schedForm.is_lateness_disabled && (
                  <div className="space-y-2.5 pt-2.5 border-t border-slate-200/80 dark:border-[#27272a]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Bebaskan Golongan Tertentu (Disable Lateness per Golongan)
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {(schedForm.exempt_job_grades || []).length} Golongan Bebas
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tentukan golongan mana saja yang dibebaskan dari toleransi/status terlambat pada template ini (karyawan dengan golongan terpilih selalu tepat waktu):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {jobGrades.map((grade) => {
                        const isExempt = (schedForm.exempt_job_grades || []).includes(grade.id);
                        return (
                          <div
                            key={grade.id}
                            onClick={() => handleToggleExemptJobGrade(grade.id)}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                              isExempt
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500/50 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/30 shadow-xs'
                                : 'bg-white dark:bg-[#121215] border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#3f3f46]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isExempt}
                                onChange={() => {}}
                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="truncate">
                                <div className="font-bold truncate text-[11px]">{grade.grade_name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {grade.grade_code}
                                </div>
                              </div>
                            </div>
                            {isExempt ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                                BEBAS
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">
                                Dihitung Telat
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hari Kerja Berlaku
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    { id: 'mon', name: 'Sen' },
                    { id: 'tue', name: 'Sel' },
                    { id: 'wed', name: 'Rab' },
                    { id: 'thu', name: 'Kam' },
                    { id: 'fri', name: 'Jum' },
                    { id: 'sat', name: 'Sab' },
                    { id: 'sun', name: 'Min' },
                  ].map((d) => {
                    const active = schedForm.working_days?.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleWorkingDay(d.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          active
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-[#18181b] text-slate-700 dark:text-slate-300 border border-transparent dark:border-[#27272a]'
                        }`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingSchedule}
                  onClick={() => {
                    setShowScheduleModal(false);
                    setEditingSchedule(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingSchedule ? 'Menyimpan...' : (editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Plotting Jadwal */}
      {showPlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span>{editingPlot ? 'Edit Plotting Penugasan Jadwal' : 'Plotting Penugasan Jadwal'}</span>
              <button
                type="button"
                onClick={() => {
                  setShowPlotModal(false);
                  setEditingPlot(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </h2>
            <form onSubmit={handleSubmitPlot} className="space-y-3">
              {/* Combobox 1: Pilih Template Jadwal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Template Jadwal *
                </label>
                <select
                  required
                  value={plotForm.schedule_id ?? ''}
                  onChange={(e) => setPlotForm({ ...plotForm, schedule_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-medium"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schedule_name} ({s.time_in.slice(0, 5)} - {s.time_out.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Kolom Readonly: Divisi Sesuai Template Jadwal yang Dipilih */}
              {(() => {
                const activeSched = schedules.find((s) => s.id === Number(plotForm.schedule_id));
                const activeTargetDivision =
                  activeSched?.target_division ||
                  (activeSched?.id === 1
                    ? 'Keuangan & Akuntansi, HRD & Umum'
                    : activeSched?.id === 2
                    ? 'Operasional & Produksi Ready-Mix'
                    : activeSched?.id === 3
                    ? 'Operasional & Produksi Ready-Mix, Logistik & Armada'
                    : 'Semua Divisi (Umum)');

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Divisi Peruntukan Template (Read-Only)
                      </label>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                        <Info className="w-3 h-3" /> Arahkan kursor untuk melihat lengkap
                      </span>
                    </div>

                    <div
                      title={activeTargetDivision}
                      className="relative group flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b] text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-help transition-colors hover:border-sky-400 dark:hover:border-sky-500"
                    >
                      <Building2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed break-words" title={activeTargetDivision}>
                          {activeTargetDivision}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold shrink-0 self-start">
                        Otomatis
                      </span>

                      {/* Tooltip Card Popover on Hover */}
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-full max-w-md p-2.5 rounded-xl bg-slate-900 text-white dark:bg-[#1f1f23] dark:text-slate-100 text-xs shadow-2xl border border-slate-700 dark:border-[#3f3f46] pointer-events-none transition-all">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">
                          <Building2 className="w-3 h-3" />
                          <span>Daftar Divisi Lengkap:</span>
                        </div>
                        <p className="leading-snug text-slate-200">{activeTargetDivision}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Data divisi diambil otomatis sesuai konfigurasi template jadwal yang Anda pilih di atas.
                    </span>
                  </div>
                );
              })()}

              {/* Combobox 2: Tipe Scope Penugasan (Hanya General & Golongan Saja) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Scope Penugasan *
                </label>
                <select
                  value={plotForm.scope_type === 'division' ? 'general' : (plotForm.scope_type || 'general')}
                  onChange={(e) => {
                    const newType = e.target.value as 'general' | 'job_grade';
                    let newScopeId: number | null = null;
                    if (newType === 'job_grade') {
                      newScopeId = jobGrades[0]?.id || null;
                    }
                    setPlotForm({ ...plotForm, scope_type: newType, scope_id: newScopeId });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-medium"
                >
                  <option value="general">General (Seluruh Karyawan / Universal)</option>
                  <option value="job_grade">Golongan Tertentu (Sesuai Database Master)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {plotForm.scope_type === 'general' || plotForm.scope_type === 'division' || !plotForm.scope_type ? (
                    <span className="text-sky-600 dark:text-sky-400 font-medium">
                      Scope General berlaku ke seluruh karyawan pada divisi template terkait.
                    </span>
                  ) : (
                    <span>Pilih salah satu golongan jabatan yang terdaftar di database MySQL.</span>
                  )}
                </p>
              </div>

              {/* Pilihan Golongan Jabatan jika scope_type === 'job_grade' */}
              {plotForm.scope_type === 'job_grade' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Golongan Jabatan (Database Master) *
                  </label>
                  <select
                    value={plotForm.scope_id ?? (jobGrades[0]?.id || '')}
                    onChange={(e) => setPlotForm({ ...plotForm, scope_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    {jobGrades.length === 0 ? (
                      <option value="">Belum ada data golongan</option>
                    ) : (
                      jobGrades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Mulai Berlaku *
                    </label>
                    <DateInput
                      required
                      value={plotForm.date_start || ''}
                      onChange={(v) => setPlotForm({ ...plotForm, date_start: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Selesai Berlaku *
                    </label>
                    <DateInput
                      required
                      value={plotForm.date_end || ''}
                      onChange={(v) => setPlotForm({ ...plotForm, date_end: v })}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tanggal Mulai & Selesai menentukan rentang periode penugasan shift kerja aktif (misal 01-09-2026 s/d 30-09-2026). Saat mengedit plotting, Anda dapat menyesuaikan kembali tanggal ini jika terjadi rotasi jadwal atau perpanjangan periode.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Penugasan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jadwal bulan September batching"
                  value={plotForm.notes || ''}
                  onChange={(e) => setPlotForm({ ...plotForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingPlot}
                  onClick={() => {
                    setShowPlotModal(false);
                    setEditingPlot(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlot}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingPlot && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingPlot ? 'Menyimpan...' : (editingPlot ? 'Simpan Perubahan' : 'Simpan Plotting')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Daftar Karyawan Ter-Plot untuk Template Jadwal (Pict 1) */}
      {viewAssignedModalSched && (() => {
        const rawAssigned = getAssignedEmployeesForSchedule(viewAssignedModalSched);
        const filteredAssigned = rawAssigned.filter(({ employee, plotReason }) => {
          if (!assignedSearchQuery.trim()) return true;
          const q = assignedSearchQuery.toLowerCase();
          const matchName = (employee.full_name || '').toLowerCase().includes(q);
          const matchNip = (employee.nip || '').toLowerCase().includes(q);
          const matchDiv = (employee.division_name || '').toLowerCase().includes(q);
          const matchJob = (employee.job_grade_name || '').toLowerCase().includes(q);
          const matchReason = plotReason.toLowerCase().includes(q);
          return matchName || matchNip || matchDiv || matchJob || matchReason;
        });

        const handleExportAssignedExcel = () => {
          const exportData = filteredAssigned.map(({ employee, plotReason, dateRange }, idx) => ({
            No: idx + 1,
            NIP: employee.nip,
            Nama_Karyawan: employee.full_name,
            Divisi: employee.division_name || '-',
            Jabatan_Golongan: employee.job_grade_name || '-',
            Template_Jadwal: viewAssignedModalSched.schedule_name,
            Jam_Kerja: `${viewAssignedModalSched.time_in.slice(0, 5)} - ${viewAssignedModalSched.time_out.slice(0, 5)}`,
            Skema_Plotting: plotReason,
            Periode_Berlaku: dateRange,
            Status: employee.status === 'active' ? 'Aktif' : employee.status,
          }));

          exportToExcel(
            exportData,
            `Karyawan_Terplot_${viewAssignedModalSched.schedule_name.replace(/\s+/g, '_')}`,
            'Karyawan Terplot',
            activeCompanyBranding,
            `Daftar Karyawan Ter-Plot Template: ${viewAssignedModalSched.schedule_name}`
          );
        };

        const handleExportAssignedPdf = () => {
          const headers = ['NIP', 'Nama Karyawan', 'Divisi', 'Jabatan', 'Skema Plotting', 'Periode Berlaku'];
          const rows = filteredAssigned.map(({ employee, plotReason, dateRange }) => [
            employee.nip,
            employee.full_name,
            employee.division_name || '-',
            employee.job_grade_name || '-',
            plotReason,
            dateRange,
          ]);

          exportToPdfPrint(
            `Daftar Karyawan Ter-Plot: ${viewAssignedModalSched.schedule_name}`,
            `Jam Kerja: ${viewAssignedModalSched.time_in.slice(0, 5)} - ${viewAssignedModalSched.time_out.slice(0, 5)} | Total: ${filteredAssigned.length} Karyawan`,
            headers,
            rows,
            activeCompanyBranding
          );
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden">
              {/* Header */}
              <div
                className="p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: `${accentColor}08`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      borderColor: `${accentColor}35`,
                      color: accentColor,
                    }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        Karyawan Ter-Plot: {viewAssignedModalSched.schedule_name}
                      </h2>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          borderColor: `${accentColor}40`,
                          color: accentColor,
                        }}
                      >
                        {rawAssigned.length} Karyawan
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        Shift: {viewAssignedModalSched.time_in.slice(0, 5)} - {viewAssignedModalSched.time_out.slice(0, 5)}
                      </span>
                      <span>&bull;</span>
                      <span>Istirahat: {viewAssignedModalSched.break_start?.slice(0, 5) || '-'} - {viewAssignedModalSched.break_end?.slice(0, 5) || '-'}</span>
                      <span>&bull;</span>
                      <span>Toleransi: {viewAssignedModalSched.tolerance_minutes} Menit</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewAssignedModalSched(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toolbar: Search & Export */}
              <div className="p-4 border-b border-slate-200 dark:border-[#27272a] bg-slate-50/70 dark:bg-[#18181b]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, NIP, divisi, atau golongan..."
                    value={assignedSearchQuery}
                    onChange={(e) => setAssignedSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  {assignedSearchQuery && (
                    <button
                      onClick={() => setAssignedSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ExportDropdown
                    onExportExcel={handleExportAssignedExcel}
                    onExportPdf={handleExportAssignedPdf}
                    label="Export Daftar"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const targetSched = viewAssignedModalSched;
                      setViewAssignedModalSched(null);
                      setSubTab('plotting');
                      setPlotForm({
                        schedule_id: targetSched.id,
                        scope_type: 'division',
                        scope_id: divisions[0]?.id || null,
                        date_start: new Date().toISOString().slice(0, 10),
                        date_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                        notes: '',
                      });
                      setShowPlotModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: accentColor,
                      color: getContrastTextColorStyle(accentColor),
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Plotting</span>
                  </button>
                </div>
              </div>

              {/* Table / List */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredAssigned.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Tidak ada karyawan yang cocok
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {assignedSearchQuery
                        ? 'Coba gunakan kata kunci pencarian yang lain.'
                        : 'Belum ada karyawan yang ditugaskan ke template jadwal ini.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-[#27272a] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">No</th>
                          <th className="py-2.5 px-3">Karyawan</th>
                          <th className="py-2.5 px-3">Divisi</th>
                          <th className="py-2.5 px-3">Jabatan / Golongan</th>
                          <th className="py-2.5 px-3">Skema Plotting</th>
                          <th className="py-2.5 px-3">Masa Berlaku</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                        {filteredAssigned.map(({ employee, plotReason, dateRange }, idx) => (
                          <tr
                            key={employee.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-[#18181b]/50 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 shrink-0 bg-slate-100 dark:bg-slate-800"
                                >
                                  {employee.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {employee.full_name}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    NIP: {employee.nip}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {employee.division_name || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                              {employee.job_grade_name || '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                                style={{
                                  backgroundColor: `${accentColor}12`,
                                  borderColor: `${accentColor}30`,
                                  color: accentColor,
                                }}
                              >
                                {plotReason}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {dateRange}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {employee.status === 'active' ? 'AKTIF' : employee.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan {filteredAssigned.length} dari {rawAssigned.length} total karyawan ter-plot
                </span>
                <button
                  type="button"
                  onClick={() => setViewAssignedModalSched(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-[#27272a] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#3f3f46] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Universal Database Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        details={confirmModal.details}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
