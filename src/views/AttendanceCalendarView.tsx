import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Printer,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Briefcase,
  LayoutGrid,
  List,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  LogIn,
  LogOut,
  Calendar,
  RotateCcw,
  CalendarRange,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
  Info,
  Timer,
  Calculator,
  Award,
  TrendingUp,
  Eye,
  Flame,
  Banknote,
  RefreshCw,
  Activity,
  Stethoscope,
  FileCheck2,
  MapPin,
  Building2,
  Smartphone,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { DateInput } from '../components/DateInput';
import { AttendanceLog, Employee, LeaveRequest, OvertimeRequest, Holiday, CompanyProfile, WorkSchedule, SchedulePlot, Division, JobGrade, CompanyLocation } from '../types';
import { WorkLocationManagerModal } from '../components/WorkLocationManagerModal';
import { MobilePortalSimulationModal } from '../components/MobilePortalSimulationModal';
import { exportToExcel, exportToPdfPrint, formatRupiah } from '../lib/exportUtils';
import { getContrastTextColorStyle } from '../lib/companyUtils';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { formatDateDDMMYYYY } from '../lib/formatUtils';
import { ExportDropdown } from '../components/ExportDropdown';
import {
  calculateEmployeeWorkHours,
  getPlottedScheduleForEmployee,
  getScheduleShiftHours,
} from '../lib/payrollCalculator';

interface AttendanceCalendarViewProps {
  employees: Employee[];
  divisions?: Division[];
  jobGrades?: JobGrade[];
  attendanceLogs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  holidays?: Holiday[];
  schedules?: WorkSchedule[];
  schedulePlots?: SchedulePlot[];
  accentColor: string;
  companyName?: string;
  companyProfile?: CompanyProfile;
  locations?: CompanyLocation[];
  onRefreshLocations?: () => Promise<void> | void;
  onUpdateAttendanceLog?: (id: number, data: Partial<AttendanceLog>) => Promise<any>;
  onDeleteAttendanceLog?: (id: number) => Promise<any>;
  onSyncHolidays?: (year?: number) => Promise<any>;
  onRefreshData?: () => Promise<void> | void;
  onAddAttendanceLog?: (data: any) => Promise<any>;
}

type GroupingDimension = 'employee' | 'log_type' | 'status' | 'date' | 'division' | 'location';
type PeriodFilterMode = 'single_month' | 'last_and_current' | 'current_and_next' | 'custom_range';

export const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  employees,
  divisions = [],
  jobGrades = [],
  attendanceLogs,
  leaveRequests,
  overtimeRequests,
  holidays = [],
  schedules = [],
  schedulePlots = [],
  accentColor,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  companyProfile,
  locations = [],
  onRefreshLocations,
  onUpdateAttendanceLog,
  onDeleteAttendanceLog,
  onSyncHolidays,
  onRefreshData,
  onAddAttendanceLog,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 1)); // September 2026 default

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Auto-sync holiday API state on year transition
  const lastSyncedYearRef = useRef<number>(year);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Otomatis sinkronisasi dengan API saat tahun berganti
  useEffect(() => {
    if (year !== lastSyncedYearRef.current) {
      const targetYear = year;
      lastSyncedYearRef.current = targetYear;
      if (onSyncHolidays) {
        setIsSyncingHolidays(true);
        setSyncNotice(`Menyinkronkan hari libur resmi tahun ${targetYear} dari API...`);
        onSyncHolidays(targetYear)
          .then((res: any) => {
            const count = res?.count || res?.holidays?.length;
            setSyncNotice(`Tahun ${targetYear}: ${count ? count + ' hari libur tersinkronisasi otomatis' : 'Sinkronisasi berhasil'}`);
            setTimeout(() => setSyncNotice(null), 4000);
          })
          .catch(() => {
            setSyncNotice(null);
          })
          .finally(() => {
            setIsSyncingHolidays(false);
          });
      }
    }
  }, [year, onSyncHolidays]);

  // Juga periksa otomatis jika belum ada data libur untuk tahun yang sedang ditampilkan
  useEffect(() => {
    const hasHolidaysForYear = (holidays || []).some(
      (h) => h.holiday_date && new Date(h.holiday_date).getFullYear() === year
    );
    if (!hasHolidaysForYear && onSyncHolidays && !isSyncingHolidays) {
      setIsSyncingHolidays(true);
      onSyncHolidays(year)
        .then(() => {
          setSyncNotice(`Hari libur tahun ${year} otomatis disinkronkan dari API.`);
          setTimeout(() => setSyncNotice(null), 4000);
        })
        .catch(() => {})
        .finally(() => {
          setIsSyncingHolidays(false);
        });
    }
  }, [year, holidays, onSyncHolidays, isSyncingHolidays]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Flexible Date & Period Filter State
  const [periodMode, setPeriodMode] = useState<PeriodFilterMode>('single_month');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-09-30');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const changeYear = (newYear: number) => setCurrentDate(new Date(newYear, month, 1));

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  // Adjust so Monday is 0: (day + 6) % 7
  const startDay = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedEmployee = employees.find((e) => String(e.id) === selectedEmpId);

  // View Mode: Visual Calendar, Sortable Data Table, or Work Hours & Overtime Points
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'work_hours'>('calendar');

  // Work Hours & Overtime Points sub-tab states
  const [workHoursSortKey, setWorkHoursSortKey] = useState<string>('name');
  const [workHoursSortDir, setWorkHoursSortDir] = useState<SortDirection>('asc');
  const [workHoursDivisionFilter, setWorkHoursDivisionFilter] = useState<string>('all');
  const [selectedWorkDetail, setSelectedWorkDetail] = useState<any | null>(null);
  const [selectedCalendarDayEvents, setSelectedCalendarDayEvents] = useState<{
    dateStr: string;
    day: number;
    events: any;
    isToday: boolean;
    hasHoliday: boolean;
    isOffDay: boolean;
  } | null>(null);

  // Table filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_time' | 'late'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'qr' | 'manual' | 'rfid' | 'mobile_gps'>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Master Location Manager & Mobile Simulation Modals
  const [showLocationManagerModal, setShowLocationManagerModal] = useState<boolean>(false);
  const [showMobileSimulatorModal, setShowMobileSimulatorModal] = useState<boolean>(false);

  // Edit / Delete Attendance Log states
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [editFormData, setEditFormData] = useState<{
    log_date: string;
    scan_time: string;
    log_type: 'in' | 'out';
    method: string;
    status: string;
    device_id: string;
    location_id: string;
    latitude: string;
    longitude: string;
    location_address: string;
    notes: string;
  }>({
    log_date: '',
    scan_time: '',
    log_type: 'in',
    method: 'qr',
    status: 'on_time',
    device_id: '',
    location_id: '',
    latitude: '',
    longitude: '',
    location_address: '',
    notes: '',
  });
  const [deletingLog, setDeletingLog] = useState<AttendanceLog | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Create Attendance Log States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createFormData, setCreateFormData] = useState<{
    employee_id: string;
    log_date: string;
    scan_time: string;
    log_type: 'in' | 'out';
    method: string;
    status: string;
    device_id: string;
    location_id: string;
    latitude: string;
    longitude: string;
    location_address: string;
    notes: string;
  }>({
    employee_id: '',
    log_date: new Date().toISOString().split('T')[0],
    scan_time: '08:00:00',
    log_type: 'in',
    method: 'manual',
    status: 'on_time',
    device_id: 'Manual HR/Admin',
    location_id: '',
    latitude: '',
    longitude: '',
    location_address: '',
    notes: 'Presensi manual ditambahkan oleh Admin',
  });

  // Target employee and assigned work schedule for HR reference in edit modal
  const targetEmp = useMemo(() => {
    if (!editingLog) return null;
    return employees.find((e) => e.id === editingLog.employee_id) || null;
  }, [editingLog, employees]);

  const targetSched = useMemo(() => {
    if (!targetEmp) {
      return (
        schedules[0] || {
          id: 1,
          schedule_name: 'Shift Normal Kantor (08:00 - 17:00)',
          time_in: '08:00:00',
          time_out: '17:00:00',
          break_start: '12:00:00',
          break_end: '13:00:00',
          tolerance_minutes: 15,
        }
      );
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const resolved = getPlottedScheduleForEmployee(targetEmp, todayStr, schedules, schedulePlots);
    return (
      resolved ||
      schedules[0] || {
        id: 1,
        schedule_name: 'Shift Normal Kantor (08:00 - 17:00)',
        time_in: '08:00:00',
        time_out: '17:00:00',
        break_start: '12:00:00',
        break_end: '13:00:00',
        tolerance_minutes: 15,
      }
    );
  }, [targetEmp, schedules, schedulePlots]);

  const handleOpenEdit = (log: AttendanceLog) => {
    setEditingLog(log);
    setEditFormData({
      log_date: log.log_date || '',
      scan_time: log.scan_time || '',
      log_type: log.log_type === 'out' ? 'out' : 'in',
      method: log.method || 'qr',
      status: log.status || 'on_time',
      device_id: log.device_id || 'Kiosk Utama Gate 1',
      location_id: log.location_id ? String(log.location_id) : '',
      latitude: log.latitude !== null && log.latitude !== undefined ? String(log.latitude) : '',
      longitude: log.longitude !== null && log.longitude !== undefined ? String(log.longitude) : '',
      location_address: log.location_address || '',
      notes: log.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !onUpdateAttendanceLog || isSubmittingAction) return;

    setIsSubmittingAction(true);
    try {
      let finalScanTime = editFormData.scan_time.trim();
      // If user only entered time e.g. "08:15:00" or "08:15", combine with log_date
      if (finalScanTime && !finalScanTime.includes('-')) {
        const timePart = finalScanTime.length === 5 ? `${finalScanTime}:00` : finalScanTime;
        finalScanTime = `${editFormData.log_date} ${timePart}`;
      }

      await onUpdateAttendanceLog(editingLog.id, {
        log_date: editFormData.log_date,
        scan_time: finalScanTime,
        log_type: editFormData.log_type,
        method: editFormData.method as any,
        status: editFormData.status as any,
        device_id: editFormData.device_id,
        location_id: editFormData.location_id ? Number(editFormData.location_id) : (null as any),
        latitude: editFormData.latitude ? Number(editFormData.latitude) : (null as any),
        longitude: editFormData.longitude ? Number(editFormData.longitude) : (null as any),
        location_address: editFormData.location_address || null,
        notes: editFormData.notes,
      });

      setEditingLog(null);
    } catch (err: any) {
      alert('Gagal mengupdate log presensi: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.employee_id || !onAddAttendanceLog || isSubmittingAction) {
      alert('Silakan pilih karyawan terlebih dahulu.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      let finalScanTime = createFormData.scan_time.trim();
      if (finalScanTime && !finalScanTime.includes('-')) {
        const timePart = finalScanTime.length === 5 ? `${finalScanTime}:00` : finalScanTime;
        finalScanTime = `${createFormData.log_date} ${timePart}`;
      }

      const res = await onAddAttendanceLog({
        employee_id: Number(createFormData.employee_id),
        log_date: createFormData.log_date,
        scan_time: finalScanTime,
        log_type: createFormData.log_type,
        method: createFormData.method,
        status: createFormData.status,
        device_id: createFormData.device_id,
        location_id: createFormData.location_id ? Number(createFormData.location_id) : null,
        latitude: createFormData.latitude ? Number(createFormData.latitude) : null,
        longitude: createFormData.longitude ? Number(createFormData.longitude) : null,
        location_address: createFormData.location_address || null,
        notes: createFormData.notes,
      });

      if (res && res.success) {
        setShowCreateModal(false);
        setCreateFormData({
          employee_id: '',
          log_date: new Date().toISOString().split('T')[0],
          scan_time: '08:00:00',
          log_type: 'in',
          method: 'manual',
          status: 'on_time',
          device_id: 'Manual HR/Admin',
          location_id: '',
          latitude: '',
          longitude: '',
          location_address: '',
          notes: 'Presensi manual ditambahkan oleh Admin',
        });
      } else {
        alert('Gagal menambahkan log presensi: ' + (res?.error || res?.message || 'Terjadi kesalahan'));
      }
    } catch (err: any) {
      alert('Gagal menambahkan log presensi: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLog || !onDeleteAttendanceLog || isSubmittingAction) return;

    setIsSubmittingAction(true);
    try {
      await onDeleteAttendanceLog(deletingLog.id);
      setDeletingLog(null);
    } catch (err: any) {
      alert('Gagal menghapus log presensi: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Grouping configuration (default: without grouping / flat)
  const [activeGrouping, setActiveGrouping] = useState<GroupingDimension[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sorting for Attendance Logs Table
  const [logSortKey, setLogSortKey] = useState<string | null>('log_date');
  const [logSortDir, setLogSortDir] = useState<SortDirection>('desc');

  // Table Sync State
  const [isSyncingTable, setIsSyncingTable] = useState(false);
  const handleSyncAttendance = async () => {
    setIsSyncingTable(true);
    try {
      const res = await api.syncTable('attendance_logs');
      if (onRefreshData) {
        await onRefreshData();
      }
      toast.success('Sync Berhasil', res.message || `Tabel attendance_logs berhasil disinkronkan (${res.rowCount || 0} baris)`);
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || 'Gagal sinkronisasi data absensi');
    } finally {
      setIsSyncingTable(false);
    }
  };

  const handleSortLog = (key: string) => {
    if (logSortKey === key) {
      if (logSortDir === 'asc') setLogSortDir('desc');
      else if (logSortDir === 'desc') {
        setLogSortKey(null);
        setLogSortDir(null);
      }
    } else {
      setLogSortKey(key);
      setLogSortDir('asc');
    }
  };

  const toggleGroupingDimension = (dim: GroupingDimension) => {
    setActiveGrouping((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const expandAllGroups = () => setCollapsedGroups({});
  const collapseAllGroups = (allGroupKeys: string[]) => {
    const nextCollapsed: Record<string, boolean> = {};
    allGroupKeys.forEach((k) => (nextCollapsed[k] = true));
    setCollapsedGroups(nextCollapsed);
  };

  const handleSortWorkHours = (key: string) => {
    if (workHoursSortKey === key) {
      if (workHoursSortDir === 'asc') setWorkHoursSortDir('desc');
      else if (workHoursSortDir === 'desc') {
        setWorkHoursSortKey('name');
        setWorkHoursSortDir('asc');
      }
    } else {
      setWorkHoursSortKey(key);
      setWorkHoursSortDir('asc');
    }
  };

  // Reset / Refresh all filters and grouping
  const handleResetFilters = () => {
    setIsResetting(true);
    setSelectedEmpId('all');
    setCurrentDate(new Date(2026, 8, 1));
    setPeriodMode('single_month');
    setCustomStartDate('2026-08-01');
    setCustomEndDate('2026-09-30');
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
    setActiveGrouping([]); // Clear all grouping as requested (flat table default)
    setCollapsedGroups({});
    setLogSortKey('log_date');
    setLogSortDir('desc');
    setWorkHoursDivisionFilter('all');
    setWorkHoursSortKey('name');
    setWorkHoursSortDir('asc');
    setTimeout(() => setIsResetting(false), 400);
  };

  // Computed active date range [startDate, endDate] strings in YYYY-MM-DD
  const { dateFrom, dateTo, periodLabel } = useMemo(() => {
    if (periodMode === 'single_month') {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      return {
        dateFrom: from,
        dateTo: to,
        periodLabel: `Bulan ${monthNames[month]} ${year}`,
      };
    } else if (periodMode === 'last_and_current') {
      // Last month + Current month
      const prevDate = new Date(year, month - 1, 1);
      const from = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      return {
        dateFrom: from,
        dateTo: to,
        periodLabel: `${monthNames[prevDate.getMonth()]} - ${monthNames[month]} ${year} (2 Bulan)`,
      };
    } else if (periodMode === 'current_and_next') {
      // Current month + Next month
      const nextDate = new Date(year, month + 1, 1);
      const nextDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const to = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDays).padStart(2, '0')}`;
      return {
        dateFrom: from,
        dateTo: to,
        periodLabel: `${monthNames[month]} - ${monthNames[nextDate.getMonth()]} ${nextDate.getFullYear()} (2 Bulan)`,
      };
    } else {
      // Custom Range
      const from = customStartDate || '2026-08-01';
      const to = customEndDate || '2026-09-30';
      return {
        dateFrom: from,
        dateTo: to,
        periodLabel: `Periode: ${formatDateDDMMYYYY(from)} s/d ${formatDateDDMMYYYY(to)}`,
      };
    }
  }, [periodMode, year, month, daysInMonth, customStartDate, customEndDate, monthNames]);

  // List of full calendar months to display in Visual Calendar Mode (supports cross-month display)
  const monthsToDisplay = useMemo(() => {
    if (periodMode === 'single_month') {
      return [{ year, month }];
    } else if (periodMode === 'last_and_current') {
      const prevDate = new Date(year, month - 1, 1);
      return [
        { year: prevDate.getFullYear(), month: prevDate.getMonth() },
        { year, month },
      ];
    } else if (periodMode === 'current_and_next') {
      const nextDate = new Date(year, month + 1, 1);
      return [
        { year, month },
        { year: nextDate.getFullYear(), month: nextDate.getMonth() },
      ];
    } else {
      // Custom range: include all months in range
      const s = new Date(customStartDate || `${year}-08-01`);
      const e = new Date(customEndDate || `${year}-09-30`);
      const list: { year: number; month: number }[] = [];
      let cur = new Date(s.getFullYear(), s.getMonth(), 1);
      const endLimit = new Date(e.getFullYear(), e.getMonth(), 1);
      while (cur <= endLimit && list.length < 12) {
        list.push({ year: cur.getFullYear(), month: cur.getMonth() });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      return list.length > 0 ? list : [{ year, month }];
    }
  }, [periodMode, year, month, customStartDate, customEndDate]);

  // Employee Lookup & Meta (Jabatan, Divisi, Golongan)
  const employeeMap = useMemo(() => {
    return new Map(employees.map((e) => [Number(e.id), e]));
  }, [employees]);

  const getEmployeeMeta = (empId?: number) => {
    const emp = empId !== undefined && empId !== null ? employeeMap.get(Number(empId)) : undefined;
    const division = (emp?.division_name && emp.division_name !== '-')
      ? emp.division_name
      : (divisions?.find((d) => Number(d.id) === Number(emp?.division_id))?.division_name || '-');
    const rawGrade = (emp?.job_grade_name && emp.job_grade_name !== '-')
      ? emp.job_grade_name
      : (jobGrades?.find((g) => Number(g.id) === Number(emp?.job_grade_id))?.grade_name || '-');
    let jabatan = '-';
    let golongan = rawGrade;

    if (rawGrade && rawGrade.includes(' - ')) {
      const parts = rawGrade.split(' - ');
      golongan = parts[0].trim();
      jabatan = parts[1].trim();
    } else if (rawGrade && rawGrade !== '-') {
      jabatan = rawGrade;
    }

    return { emp, division, golongan, jabatan };
  };

  // Base range logs
  const monthLogs = useMemo(() => {
    return attendanceLogs.filter((l) => {
      const inRange = l.log_date >= dateFrom && l.log_date <= dateTo;
      const matchEmp = selectedEmpId === 'all' || String(l.employee_id) === selectedEmpId;
      return inRange && matchEmp;
    });
  }, [attendanceLogs, dateFrom, dateTo, selectedEmpId]);

  // Filtered range logs taking into account table mode filters and searching across Jabatan, Divisi, Golongan
  const filteredMonthLogs = useMemo(() => {
    return monthLogs.filter((l) => {
      // Filter Type
      if (filterType !== 'all' && l.log_type !== filterType) {
        return false;
      }
      // Filter Status
      if (filterStatus !== 'all' && l.status !== filterStatus) {
        return false;
      }
      // Filter Method
      if (filterMethod !== 'all') {
        const m = (l.method || '').toLowerCase();
        const n = (l.notes || '').toLowerCase();
        if (filterMethod === 'qr') {
          if (m !== 'qr' && !n.includes('qr')) return false;
        } else if (filterMethod === 'manual') {
          if (m !== 'manual' && m !== 'nip_manual' && !n.includes('manual')) return false;
        } else if (filterMethod === 'rfid') {
          if (m !== 'rfid' && !n.includes('rfid')) return false;
        } else if (filterMethod === 'mobile_gps') {
          if (m !== 'mobile_gps' && !n.includes('mobile') && !n.includes('gps')) return false;
        }
      }
      // Filter Location
      if (filterLocation !== 'all') {
        if (filterLocation === 'none') {
          if (l.location_id || l.location_name) return false;
        } else {
          const locId = String(l.location_id || '');
          const locName = (l.location_name || '').toLowerCase();
          const targetLoc = (locations || []).find((loc) => String(loc.id) === filterLocation);
          const targetName = targetLoc?.location_name.toLowerCase() || '';
          if (locId !== filterLocation && (!targetName || !locName.includes(targetName))) {
            return false;
          }
        }
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = (l.employee_name || '').toLowerCase();
        const empNip = (l.employee_nip || '').toLowerCase();
        const formattedDate = formatDateDDMMYYYY(l.log_date).toLowerCase();
        const rawDate = (l.log_date || '').toLowerCase();
        const device = (l.device_id || '').toLowerCase();
        const locName = (l.location_name || '').toLowerCase();
        const locAddr = (l.location_address || '').toLowerCase();
        const notes = (l.notes || '').toLowerCase();
        const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
        if (
          !empName.includes(q) &&
          !empNip.includes(q) &&
          !formattedDate.includes(q) &&
          !rawDate.includes(q) &&
          !device.includes(q) &&
          !locName.includes(q) &&
          !locAddr.includes(q) &&
          !notes.includes(q) &&
          !division.toLowerCase().includes(q) &&
          !jabatan.toLowerCase().includes(q) &&
          !golongan.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [monthLogs, filterType, filterStatus, filterMethod, filterLocation, searchQuery, employeeMap, locations]);

  // Augmented month logs with Jabatan, Divisi, and Golongan for sorting and display
  const augmentedMonthLogs = useMemo(() => {
    return filteredMonthLogs.map((l) => {
      const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
      return {
        ...l,
        division_name: division,
        job_grade_name: golongan,
        jabatan,
        golongan,
      };
    });
  }, [filteredMonthLogs, employeeMap]);

  const sortedMonthLogs = useMemo(() => {
    return sortTableData(augmentedMonthLogs, logSortKey, logSortDir);
  }, [augmentedMonthLogs, logSortKey, logSortDir]);

  // Work Hours & Overtime Points Calculation for employees in selected period
  const employeeWorkSummaries = useMemo(() => {
    // If no attendance logs in month at all, return empty list so the table is blank
    if (monthLogs.length === 0) {
      return [];
    }

    return employees
      .map((emp) => {
        const calc = calculateEmployeeWorkHours(
          emp,
          attendanceLogs,
          overtimeRequests,
          dateFrom,
          dateTo,
          1.5,
          schedules,
          schedulePlots
        );

        const samplePlot = getPlottedScheduleForEmployee(emp, dateTo, schedules, schedulePlots);
        const scheduleName = samplePlot?.schedule_name || 'Shift Standar (08:00 - 17:00)';
        const shiftHours = getScheduleShiftHours(samplePlot);

        const { division, golongan, jabatan } = getEmployeeMeta(emp.id);

        const regularHours = calc.totalRegularHours;
        const overtimeHours = calc.totalOvertimeHours;
        const totalPointsHours = Math.round((regularHours + overtimeHours) * 10) / 10;
        const weightedPoints = Math.round((regularHours + overtimeHours * 1.5) * 10) / 10;

        return {
          employee: emp,
          id: emp.id,
          nip: emp.nip,
          name: emp.full_name,
          division,
          golongan,
          jabatan,
          scheduleName,
          shiftHours,
          totalWorkedDays: calc.totalWorkedDays,
          regularHours,
          overtimeHours,
          totalPointsHours,
          weightedPoints,
          baseRatePerHour: calc.baseRatePerHour,
          earnedBasePay: calc.earnedBasePay,
          earnedOvertimePay: calc.earnedOvertimePay,
          totalEstimatedPay: calc.earnedBasePay + calc.earnedOvertimePay,
          dailyBreakdown: calc.dailyBreakdown,
        };
      })
      .filter((item) => item.totalWorkedDays > 0 || item.overtimeHours > 0);
  }, [employees, attendanceLogs, overtimeRequests, dateFrom, dateTo, schedules, schedulePlots, employeeMap, monthLogs]);

  // Filtered & sorted work summaries
  const filteredWorkSummaries = useMemo(() => {
    return employeeWorkSummaries.filter((item) => {
      if (selectedEmpId !== 'all' && String(item.id) !== selectedEmpId) {
        return false;
      }
      if (workHoursDivisionFilter !== 'all' && item.division !== workHoursDivisionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.nip.toLowerCase().includes(q) &&
          !item.division.toLowerCase().includes(q) &&
          !item.jabatan.toLowerCase().includes(q) &&
          !item.golongan.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [employeeWorkSummaries, selectedEmpId, workHoursDivisionFilter, searchQuery]);

  const sortedEmployeeWorkSummaries = useMemo(() => {
    return sortTableData(filteredWorkSummaries, workHoursSortKey, workHoursSortDir);
  }, [filteredWorkSummaries, workHoursSortKey, workHoursSortDir]);

  // Unique list of divisions for filter dropdown
  const uniqueDivisions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      const divName = (e.division_name && e.division_name !== '-')
        ? e.division_name
        : divisions?.find((d) => Number(d.id) === Number(e.division_id))?.division_name;
      if (divName && divName !== '-') set.add(divName);
    });
    if (divisions && divisions.length > 0) {
      divisions.forEach((d) => {
        if (d.division_name && d.division_name !== '-') set.add(d.division_name);
      });
    }
    return Array.from(set).sort();
  }, [employees, divisions]);

  const monthLeaves = useMemo(() => {
    return leaveRequests.filter((lr) => {
      const inRange =
        (lr.date_start >= dateFrom && lr.date_start <= dateTo) ||
        (lr.date_end >= dateFrom && lr.date_end <= dateTo) ||
        (lr.date_start <= dateFrom && lr.date_end >= dateTo);
      const matchEmp = selectedEmpId === 'all' || String(lr.employee_id) === selectedEmpId;
      return inRange && matchEmp && lr.status === 'approved';
    });
  }, [leaveRequests, dateFrom, dateTo, selectedEmpId]);

  const monthOvertimes = useMemo(() => {
    return overtimeRequests.filter((ot) => {
      const inRange = ot.overtime_date >= dateFrom && ot.overtime_date <= dateTo;
      const matchEmp = selectedEmpId === 'all' || String(ot.employee_id) === selectedEmpId;
      return inRange && matchEmp && ot.status === 'approved';
    });
  }, [overtimeRequests, dateFrom, dateTo, selectedEmpId]);

  // Grouped structure builder
  const groupedData = useMemo(() => {
    if (activeGrouping.length === 0) {
      return null;
    }

    interface GroupNode {
      groupKey: string;
      dimension: GroupingDimension;
      label: string;
      subLabel?: string;
      items: AttendanceLog[];
      stats: {
        total: number;
        onTime: number;
        late: number;
      };
    }

    const groupsMap = new Map<string, GroupNode>();

    sortedMonthLogs.forEach((log) => {
      // Build composite group key based on active grouping dimensions
      const keyParts: string[] = [];
      const labelParts: string[] = [];

      activeGrouping.forEach((dim) => {
        if (dim === 'employee') {
          keyParts.push(`emp_${log.employee_id}`);
          labelParts.push(log.employee_name || `Karyawan #${log.employee_id}`);
        } else if (dim === 'log_type') {
          keyParts.push(`type_${log.log_type}`);
          labelParts.push(log.log_type === 'in' ? 'Masuk (IN)' : 'Pulang (OUT)');
        } else if (dim === 'status') {
          keyParts.push(`status_${log.status}`);
          labelParts.push(log.status === 'on_time' ? 'Tepat Waktu' : 'Terlambat');
        } else if (dim === 'date') {
          keyParts.push(`date_${log.log_date}`);
          labelParts.push(formatDateDDMMYYYY(log.log_date));
        } else if (dim === 'division') {
          const { division } = getEmployeeMeta(log.employee_id);
          keyParts.push(`div_${division}`);
          labelParts.push(`Divisi: ${division}`);
        } else if (dim === 'location') {
          const matchedLoc = (locations || []).find((loc) => Number(loc.id) === Number(log.location_id));
          const locName = log.location_name || matchedLoc?.location_name || (log.location_id ? `Lokasi #${log.location_id}` : (log.device_id || 'Kiosk / Umum'));
          keyParts.push(`loc_${log.location_id || locName}`);
          labelParts.push(`Lokasi: ${locName}`);
        }
      });

      const compositeKey = keyParts.join('__');
      const compositeLabel = labelParts.join(' • ');

      let node = groupsMap.get(compositeKey);
      if (!node) {
        node = {
          groupKey: compositeKey,
          dimension: activeGrouping[0],
          label: compositeLabel,
          subLabel: activeGrouping.includes('employee') ? log.employee_nip : undefined,
          items: [],
          stats: {
            total: 0,
            onTime: 0,
            late: 0,
          },
        };
        groupsMap.set(compositeKey, node);
      }

      node.items.push(log);
      node.stats.total++;
      if (log.status === 'on_time') node.stats.onTime++;
      if (log.status === 'late') node.stats.late++;
    });

    return Array.from(groupsMap.values());
  }, [sortedMonthLogs, activeGrouping, employeeMap, locations]);

  // Daily map for calendar mode
  const dailyEvents = useMemo(() => {
    const map: { [day: number]: { attendances: any[]; leaves: any[]; overtimes: any[] } } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = { attendances: [], leaves: [], overtimes: [] };
    }

    monthLogs.forEach((log) => {
      const day = parseInt(log.log_date.slice(8, 10), 10);
      if (map[day]) map[day].attendances.push(log);
    });

    monthLeaves.forEach((leave) => {
      const startDay = parseInt(leave.date_start.slice(8, 10), 10);
      const endDay = parseInt(leave.date_end.slice(8, 10), 10);
      for (let d = startDay; d <= endDay; d++) {
        if (map[d]) map[d].leaves.push(leave);
      }
    });

    monthOvertimes.forEach((ot) => {
      const day = parseInt(ot.overtime_date.slice(8, 10), 10);
      if (map[day]) map[day].overtimes.push(ot);
    });

    return map;
  }, [monthLogs, monthLeaves, monthOvertimes, daysInMonth]);

  // Statistics
  const totalHadir = filteredMonthLogs.filter((l) => l.status === 'on_time').length;
  const totalTelat = filteredMonthLogs.filter((l) => l.status === 'late').length;
  const totalCutiDays = monthLeaves.reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);
  const totalLemburHours = monthOvertimes.reduce((sum, ot) => sum + (Number(ot.total_hours) || 0), 0);

  // Work Hours Statistics for Work Hours Tab
  const totalRegHoursAll = filteredWorkSummaries.reduce((sum, s) => sum + s.regularHours, 0);
  const totalOtHoursAll = filteredWorkSummaries.reduce((sum, s) => sum + s.overtimeHours, 0);
  const totalPointsAll = filteredWorkSummaries.reduce((sum, s) => sum + s.totalPointsHours, 0);
  const totalEstPayAll = filteredWorkSummaries.reduce((sum, s) => sum + s.totalEstimatedPay, 0);

  // Exports (Strictly matching active table filters, grouping, and view modes)
  const activeComp = companyProfile || companyName;
  const compLabel = companyProfile?.company_name || companyName;

  const handleExportExcel = () => {
    // 1. Work Hours & Overtime Points Tab Export
    if (viewMode === 'work_hours') {
      const data = sortedEmployeeWorkSummaries.map((s, idx) => ({
        No: idx + 1,
        NIP: s.nip || '-',
        Nama_Karyawan: s.name || '-',
        Jabatan: s.jabatan || '-',
        Divisi: s.division || '-',
        Golongan: s.golongan || '-',
        Plot_Jadwal: `${s.scheduleName} (${s.shiftHours} Jam)`,
        Hadir_Hari: s.totalWorkedDays,
        Jam_Reguler: s.regularHours,
        Jam_Lembur_SPKL: s.overtimeHours,
        Total_Jam_Poin: s.totalPointsHours,
        Est_Upah_Dasar: s.earnedBasePay,
        Est_Upah_Lembur: s.earnedOvertimePay,
        Total_Est_Upah: s.totalEstimatedPay,
      }));

      const filterSummary: string[] = [
        periodLabel,
        selectedEmployee ? `Karyawan: ${selectedEmployee.full_name}` : `Semua Karyawan (${filteredWorkSummaries.length})`,
      ];
      if (workHoursDivisionFilter !== 'all') filterSummary.push(`Divisi: ${workHoursDivisionFilter}`);
      if (searchQuery.trim()) filterSummary.push(`Pencarian: "${searchQuery.trim()}"`);

      exportToExcel(
        data,
        `Rekap_Jam_Kerja_Lembur_${periodMode}_${year}`,
        'JamKerja_Lembur',
        activeComp,
        `Rekapitulasi Jam Kerja & Poin Lembur Karyawan (${filterSummary.join(' - ')})`
      );
      return;
    }

    // 2. Grouped Table Export
    if (activeGrouping.length > 0 && groupedData && groupedData.length > 0) {
      const data: Record<string, any>[] = [];
      let rowNum = 1;

      groupedData.forEach((group) => {
        // Group Header Row Banner
        data.push({
          No: `>>> GRUP: ${group.label}`,
          NIP: `Total: ${group.stats.total} Log`,
          Nama_Karyawan: `Tepat Waktu: ${group.stats.onTime}`,
          Jabatan: `Terlambat: ${group.stats.late}`,
          Divisi: '',
          Golongan: '',
          Tanggal: '',
          Waktu_Scan: '',
          Tipe: '',
          Metode: '',
          Status: '',
          Lokasi_Perangkat: '',
          Catatan: '',
        });

        group.items.forEach((l) => {
          const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
          data.push({
            No: rowNum++,
            NIP: l.employee_nip || '-',
            Nama_Karyawan: l.employee_name || '-',
            Jabatan: jabatan,
            Divisi: division,
            Golongan: golongan,
            Tanggal: formatDateDDMMYYYY(l.log_date),
            Waktu_Scan: l.scan_time,
            Tipe: l.log_type.toUpperCase(),
            Metode: (l.method || 'QR').toUpperCase(),
            Status: l.status === 'on_time' ? 'Tepat Waktu' : l.status === 'late' ? 'Terlambat' : l.status.toUpperCase(),
            Lokasi_Perangkat: l.device_id || 'Kiosk Utama Gate 1',
            Catatan: l.notes || '-',
          });
        });
      });

      const filterSummary: string[] = [
        periodLabel,
        selectedEmployee ? `Karyawan: ${selectedEmployee.full_name}` : 'Semua Karyawan',
        `Grouping: ${activeGrouping.join(', ')}`,
      ];
      if (filterType !== 'all') filterSummary.push(`Tipe: ${filterType.toUpperCase()}`);
      if (filterStatus !== 'all') filterSummary.push(`Status: ${filterStatus === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}`);
      if (searchQuery.trim()) filterSummary.push(`Pencarian: "${searchQuery.trim()}"`);

      exportToExcel(
        data,
        `Rekap_Presensi_Grouped_${periodMode}_${year}`,
        'Presensi_Grouped',
        activeComp,
        `Rekapitulasi Absensi Berdasarkan Grouping (${filterSummary.join(' - ')})`
      );
      return;
    }

    // 3. Flat Table Export (Default)
    const data = sortedMonthLogs.map((l, idx) => {
      const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
      return {
        No: idx + 1,
        NIP: l.employee_nip || '-',
        Nama_Karyawan: l.employee_name || '-',
        Jabatan: jabatan,
        Divisi: division,
        Golongan: golongan,
        Tanggal: formatDateDDMMYYYY(l.log_date),
        Waktu_Scan: l.scan_time,
        Tipe: l.log_type.toUpperCase(),
        Metode: (l.method || 'QR').toUpperCase(),
        Status: l.status === 'on_time' ? 'Tepat Waktu' : 'Terlambat',
        Lokasi_Perangkat: l.device_id || 'Kiosk Utama Gate 1',
        Catatan: l.notes || '-',
      };
    });

    const filterSummary: string[] = [
      periodLabel,
      selectedEmployee ? `Karyawan: ${selectedEmployee.full_name}` : 'Semua Karyawan',
    ];
    if (filterType !== 'all') filterSummary.push(`Tipe: ${filterType.toUpperCase()}`);
    if (filterStatus !== 'all') filterSummary.push(`Status: ${filterStatus === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}`);
    if (searchQuery.trim()) filterSummary.push(`Pencarian: "${searchQuery.trim()}"`);

    exportToExcel(
      data,
      `Rekap_Presensi_${periodMode}_${year}`,
      'Presensi',
      activeComp,
      `Rekapitulasi Absensi & Kehadiran (${filterSummary.join(' - ')})`
    );
  };

  const handleExportPdf = () => {
    // 1. Work Hours & Overtime Points Tab Export
    if (viewMode === 'work_hours') {
      const headers = ['No', 'NIP', 'Nama Karyawan', 'Jabatan', 'Divisi', 'Golongan', 'Plot Jadwal', 'Hadir', 'Jam Reguler', 'Lembur SPKL', 'Total Jam/Poin', 'Est. Upah Total'];
      const rows = sortedEmployeeWorkSummaries.map((s, idx) => [
        String(idx + 1),
        s.nip || '-',
        s.name || '-',
        s.jabatan || '-',
        s.division || '-',
        s.golongan || '-',
        `${s.scheduleName} (${s.shiftHours}j)`,
        `${s.totalWorkedDays} Hari`,
        `${s.regularHours} Jam`,
        `${s.overtimeHours} Jam`,
        `${s.totalPointsHours} Poin`,
        formatRupiah(s.totalEstimatedPay),
      ]);

      const filterSummary: string[] = [
        periodLabel,
        selectedEmployee ? `Karyawan: ${selectedEmployee.full_name}` : `Semua Karyawan (${filteredWorkSummaries.length} Orang)`,
      ];
      if (workHoursDivisionFilter !== 'all') filterSummary.push(`Divisi: ${workHoursDivisionFilter}`);
      if (searchQuery.trim()) filterSummary.push(`Pencarian: "${searchQuery.trim()}"`);

      exportToPdfPrint(
        `Rekapitulasi Jam Kerja & Poin Lembur Karyawan ${periodLabel}`,
        filterSummary.join(' | '),
        headers,
        rows,
        activeComp
      );
      return;
    }

    // 2. Grouped Table Export
    if (activeGrouping.length > 0 && groupedData && groupedData.length > 0) {
      const headers = ['No', 'NIP', 'Nama Karyawan', 'Jabatan', 'Divisi', 'Golongan', 'Tanggal', 'Scan Time', 'Tipe', 'Status', 'Catatan'];
      const rows: (string | number)[][] = [];
      let rowNum = 1;

      groupedData.forEach((group) => {
        // Group Header Banner Row
        rows.push([
          `>>> GRUP: ${group.label}`,
          `Total: ${group.stats.total} Log`,
          `Tepat Waktu: ${group.stats.onTime}`,
          `Terlambat: ${group.stats.late}`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);

        group.items.forEach((l) => {
          const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
          rows.push([
            String(rowNum++),
            l.employee_nip || '-',
            l.employee_name || '-',
            jabatan,
            division,
            golongan,
            formatDateDDMMYYYY(l.log_date),
            l.scan_time.slice(11, 19) || l.scan_time,
            l.log_type.toUpperCase(),
            l.status === 'on_time' ? 'Tepat Waktu' : l.status === 'late' ? 'Terlambat' : l.status.toUpperCase(),
            l.notes || '-',
          ]);
        });
      });

      const filterSummary: string[] = [
        periodLabel,
        selectedEmployee ? `Karyawan: ${selectedEmployee.full_name}` : `Semua Karyawan ${compLabel}`,
        `Grouping: ${activeGrouping.join(' + ')}`,
      ];
      if (filterType !== 'all') filterSummary.push(`Tipe: ${filterType.toUpperCase()}`);
      if (filterStatus !== 'all') filterSummary.push(`Status: ${filterStatus === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}`);
      if (searchQuery.trim()) filterSummary.push(`Filter: "${searchQuery.trim()}"`);

      exportToPdfPrint(
        `Rekapitulasi Absensi Berdasarkan Grouping ${periodLabel}`,
        filterSummary.join(' | '),
        headers,
        rows,
        activeComp
      );
      return;
    }

    // 3. Flat Table Export (Default)
    const headers = ['No', 'NIP', 'Nama Karyawan', 'Jabatan', 'Divisi', 'Golongan', 'Tanggal', 'Scan Time', 'Tipe', 'Metode', 'Status', 'Catatan'];
    const rows = sortedMonthLogs.map((l, idx) => {
      const { division, golongan, jabatan } = getEmployeeMeta(l.employee_id);
      return [
        String(idx + 1),
        l.employee_nip || '-',
        l.employee_name || '-',
        jabatan,
        division,
        golongan,
        formatDateDDMMYYYY(l.log_date),
        l.scan_time.slice(11, 19) || l.scan_time,
        l.log_type.toUpperCase(),
        (l.method || 'QR').toUpperCase(),
        l.status === 'on_time' ? 'Tepat Waktu' : 'Terlambat',
        l.notes || '-',
      ];
    });

    const filterSummary: string[] = [
      periodLabel,
      selectedEmployee ? `Karyawan: ${selectedEmployee.full_name} (${selectedEmployee.nip})` : `Semua Karyawan ${compLabel}`,
    ];
    if (filterType !== 'all') filterSummary.push(`Tipe: ${filterType.toUpperCase()}`);
    if (filterStatus !== 'all') filterSummary.push(`Status: ${filterStatus === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}`);
    if (searchQuery.trim()) filterSummary.push(`Filter: "${searchQuery.trim()}"`);

    exportToPdfPrint(
      `Rekapitulasi Absensi & Kehadiran ${periodLabel}`,
      filterSummary.join(' | '),
      headers,
      rows,
      activeComp
    );
  };

  const renderLocationCell = (log: AttendanceLog) => {
    const matchedLoc = (locations || []).find((l) => Number(l.id) === Number(log.location_id));
    const displayName = log.location_name || matchedLoc?.location_name || (log.location_id ? `Lokasi #${log.location_id}` : null);
    const deviceName = log.device_id || 'Kiosk Utama Gate 1';
    const hasGps = log.latitude !== null && log.latitude !== undefined && log.longitude !== null && log.longitude !== undefined;
    const isMock = Boolean(log.is_mock_location);

    return (
      <div className="flex flex-col gap-0.5 text-left">
        <div className="flex items-center gap-1.5 flex-wrap">
          {displayName ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{displayName}</span>
              </span>
              {matchedLoc?.category && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 uppercase">
                  {matchedLoc.category}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{deviceName}</span>
            </span>
          )}
        </div>

        {hasGps && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="text-slate-400 font-sans text-[9px]">GPS:</span>
            <span>
              {Number(log.latitude).toFixed(4)}, {Number(log.longitude).toFixed(4)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5 font-sans text-[10px]"
              title="Lihat Titik Koordinat di Google Maps"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Peta</span>
            </a>
            {isMock && (
              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                Mock GPS
              </span>
            )}
          </div>
        )}

        {log.location_address && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]" title={log.location_address}>
            {log.location_address}
          </span>
        )}
      </div>
    );
  };

  const renderMethodBadge = (log: AttendanceLog) => {
    const m = (log.method || 'qr').toLowerCase();
    const isMobile = m === 'mobile_gps' || (log.notes || '').toLowerCase().includes('mobile') || (log.device_id || '').toLowerCase().includes('mobile');

    if (isMobile) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 whitespace-nowrap">
          <Smartphone className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          MOBILE GPS
        </span>
      );
    }
    if (m === 'manual' || m === 'nip_manual') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-[#18181b] dark:text-slate-300 border border-slate-200 dark:border-[#27272a] whitespace-nowrap">
          MANUAL
        </span>
      );
    }
    if (m === 'rfid') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
          RFID CARD
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
        QR CODE
      </span>
    );
  };

  return (
    <div id="attendance-calendar-view" className="space-y-6">
      {/* Title & Top Action Ribbon (Responsive layout avoiding sidebar overlap) */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-200 dark:border-[#27272a] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-sky-500" />
            Kalender & Rekapitulasi Absensi
          </h1>
        </div>

        {/* View Switcher, Exports & Reset - Rata Kanan */}
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 xl:ml-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl p-1 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a]'
              }`}
              style={
                viewMode === 'calendar'
                  ? {
                      backgroundColor: accentColor,
                      color: getContrastTextColorStyle(accentColor),
                    }
                  : undefined
              }
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kalender
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a]'
              }`}
              style={
                viewMode === 'table'
                  ? {
                      backgroundColor: accentColor,
                      color: getContrastTextColorStyle(accentColor),
                    }
                  : undefined
              }
            >
              <List className="w-3.5 h-3.5" />
              Tabel Rekap
            </button>
            <button
              onClick={() => setViewMode('work_hours')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'work_hours'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a]'
              }`}
              style={
                viewMode === 'work_hours'
                  ? {
                      backgroundColor: accentColor,
                      color: getContrastTextColorStyle(accentColor),
                    }
                  : undefined
              }
            >
              <Calculator className="w-3.5 h-3.5" />
              Jam Kerja & Lembur (Poin)
            </button>
          </div>

          {/* Master Titik Lokasi Perusahaan */}
          <button
            onClick={() => setShowLocationManagerModal(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-[#202025] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Kelola Master Titik Lokasi Presensi Perusahaan (Head Office, Batching Plant, Purchasing, dll)"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Titik Lokasi ({locations?.length || 0})</span>
          </button>

          {/* Simulasi Mobile App Karyawan */}
          <button
            onClick={() => setShowMobileSimulatorModal(true)}
            className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Simulasi Clock-In Karyawan via Smartphone (Deteksi GPS & Geofencing Otomatis)"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Simulasi Mobile App</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSyncAttendance}
            disabled={isSyncingTable}
            className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            style={{
              borderColor: `${accentColor}50`,
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
            title="Sinkronisasi log presensi dengan database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
            <span>{isSyncingTable ? 'Menyinkronkan...' : 'Sync'}</span>
          </button>

          {/* Tambah Presensi Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs hover:opacity-90 text-white cursor-pointer"
            style={{
              backgroundColor: accentColor,
            }}
            title="Tambah Log Presensi Baru Secara Manual"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Presensi</span>
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            label="Export Rekap"
            excelLabel="Unduh Excel (.xlsx)"
            pdfLabel="Cetak / Unduh PDF (.pdf)"
          />
        </div>
      </div>

      {/* Summary KPI Cards (Hidden when in work_hours mode) */}
      {viewMode !== 'work_hours' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                Total Hadir Tepat Waktu
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalHadir} <span className="text-xs font-normal text-slate-400">Scan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                Presensi Terlambat
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {totalTelat} <span className="text-xs font-normal text-slate-400">Scan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                Cuti Disetujui
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {totalCutiDays} <span className="text-xs font-normal text-slate-400">Hari</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                Total Lembur (SPKL)
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {totalLemburHours} <span className="text-xs font-normal text-slate-400">Jam</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Ribbon (Period Mode, Date Picker, Employee Selector) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Preset Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <CalendarRange className="w-4 h-4 text-sky-500 shrink-0" />
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as PeriodFilterMode)}
              className="text-xs bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-white font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white max-w-[210px] sm:max-w-[260px] truncate"
            >
              <option value="single_month">Bulan Terpilih ({monthNames[month]} {year})</option>
              <option value="last_and_current">Bulan Lalu & Bulan Ini (Last Month - 2 Bulan)</option>
              <option value="current_and_next">Bulan Ini & Bulan Depan (Next Month - 2 Bulan)</option>
              <option value="custom_range">Rentang Tanggal Bebas (Custom Range)</option>
            </select>
          </div>

          {/* If Single Month: Month & Year Switcher with Auto API Sync */}
          {periodMode === 'single_month' && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl p-1 shadow-2xs">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-200 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-900 dark:text-white px-1.5 text-center">
                {monthNames[month]}
              </span>
              <select
                value={year}
                onChange={(e) => changeYear(Number(e.target.value))}
                className="bg-transparent text-xs font-black text-sky-600 dark:text-sky-400 border-none focus:outline-hidden cursor-pointer px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#27272a] transition-colors"
                title="Pilih Tahun (Otomatis Sinkronisasi Hari Libur API)"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y} className="bg-white text-slate-900 dark:bg-[#18181b] dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-200 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Auto-Sync Holiday Status Badge */}
          {isSyncingHolidays && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-xl text-xs font-medium text-sky-700 dark:text-sky-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
              <span>Auto-sync libur {year}...</span>
            </div>
          )}
          {syncNotice && !isSyncingHolidays && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* If Custom Range: Date Inputs with proportional font size */}
          {periodMode === 'custom_range' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Dari:</span>
              <DateInput
                value={customStartDate}
                onChange={(v) => setCustomStartDate(v)}
                className="w-36"
              />
              <span className="text-slate-400 font-medium text-xs">s/d</span>
              <DateInput
                value={customEndDate}
                onChange={(v) => setCustomEndDate(v)}
                className="w-36"
              />
            </div>
          )}

          {/* Employee Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <select
              value={selectedEmpId || 'all'}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-white font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white max-w-[200px] truncate"
            >
              <option value="all">Semua Karyawan ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.nip} - {emp.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Period Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 whitespace-nowrap">
            {periodLabel}
          </span>
        </div>
      </div>

      {/* Main View Area: Visual Calendar or Flexible Grouped Table */}
      {viewMode === 'calendar' ? (
        /* Multi-Month Visual Calendar Container */
        <div className="space-y-6">
          {monthsToDisplay.map(({ year: mYear, month: mMonth }) => {
            const dInMonth = new Date(mYear, mMonth + 1, 0).getDate();
            const sDay = (new Date(mYear, mMonth, 1).getDay() + 6) % 7;
            const monthPrefix = `${mYear}-${String(mMonth + 1).padStart(2, '0')}`;

            // Build daily map for this specific month
            const mapEvents: { [day: number]: { attendances: AttendanceLog[]; leaves: LeaveRequest[]; overtimes: OvertimeRequest[]; holidays: Holiday[] } } = {};
            for (let d = 1; d <= dInMonth; d++) {
              mapEvents[d] = { attendances: [], leaves: [], overtimes: [], holidays: [] };
            }

            // Map holidays
            (holidays || []).forEach((h) => {
              const hDate = (h.holiday_date || '').trim().slice(0, 10);
              if (hDate && hDate.startsWith(monthPrefix)) {
                const day = parseInt(hDate.slice(8, 10), 10);
                if (!isNaN(day) && mapEvents[day]) {
                  mapEvents[day].holidays.push(h);
                }
              }
            });

            // Map attendance logs - synchronized directly from all logs matching this month
            attendanceLogs.forEach((log) => {
              if (selectedEmpId !== 'all' && String(log.employee_id) !== selectedEmpId) return;
              const lDate = (log.log_date || (log.scan_time ? log.scan_time.slice(0, 10) : '')).trim().slice(0, 10);
              if (lDate.startsWith(monthPrefix)) {
                const day = parseInt(lDate.slice(8, 10), 10);
                if (!isNaN(day) && mapEvents[day]) {
                  mapEvents[day].attendances.push(log);
                }
              }
            });

            // Map leaves - timezone safe string comparison
            leaveRequests.forEach((leave) => {
              if (selectedEmpId !== 'all' && String(leave.employee_id) !== selectedEmpId) return;
              if (leave.status !== 'approved') return;
              const sDate = (leave.date_start || '').trim().slice(0, 10);
              const eDate = (leave.date_end || '').trim().slice(0, 10);
              if (!sDate || !eDate) return;
              for (let d = 1; d <= dInMonth; d++) {
                const curDateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
                if (curDateStr >= sDate && curDateStr <= eDate) {
                  if (mapEvents[d]) mapEvents[d].leaves.push(leave);
                }
              }
            });

            // Map overtimes
            overtimeRequests.forEach((ot) => {
              if (selectedEmpId !== 'all' && String(ot.employee_id) !== selectedEmpId) return;
              if (ot.status !== 'approved') return;
              const otDate = (ot.overtime_date || '').trim().slice(0, 10);
              if (otDate.startsWith(monthPrefix)) {
                const day = parseInt(otDate.slice(8, 10), 10);
                if (!isNaN(day) && mapEvents[day]) {
                  mapEvents[day].overtimes.push(ot);
                }
              }
            });

            return (
              <div
                key={`calendar-month-${mYear}-${mMonth}`}
                className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] p-4 sm:p-6 shadow-xl space-y-4"
              >
                {/* Month Title Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#27272a]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-500" />
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Bulan {monthNames[mMonth]} {mYear}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedEmployee && (() => {
                      const midDateStr = `${monthPrefix}-15`;
                      const empSched = getPlottedScheduleForEmployee(selectedEmployee, midDateStr, schedules, schedulePlots);
                      const wDays = empSched?.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'];
                      const wDaysStr = wDays.map((d) => d.toUpperCase()).join(', ');
                      return (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>Jadwal: <strong>{empSched?.schedule_name || 'Standar'}</strong> ({wDaysStr})</span>
                        </span>
                      );
                    })()}
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {dInMonth} Hari Kalender
                    </span>
                  </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-[#27272a]">
                  {[
                    { name: 'Senin', key: 'mon', defaultOff: false },
                    { name: 'Selasa', key: 'tue', defaultOff: false },
                    { name: 'Rabu', key: 'wed', defaultOff: false },
                    { name: 'Kamis', key: 'thu', defaultOff: false },
                    { name: 'Jumat', key: 'fri', defaultOff: false },
                    { name: 'Sabtu', key: 'sat', defaultOff: true },
                    { name: 'Minggu', key: 'sun', defaultOff: true },
                  ].map((d, dIdx) => {
                    let isOff = d.defaultOff;
                    if (selectedEmployee) {
                      const midDateStr = `${monthPrefix}-15`;
                      const empSched = getPlottedScheduleForEmployee(selectedEmployee, midDateStr, schedules, schedulePlots);
                      const wDays = (empSched?.working_days || ['mon', 'tue', 'wed', 'thu', 'fri']).map((item) => item.toLowerCase());
                      isOff = !wDays.includes(d.key);
                    }
                    return (
                      <div
                        key={d.name}
                        className={
                          isOff
                            ? dIdx === 6
                              ? 'text-rose-500 dark:text-rose-400 font-bold'
                              : 'text-amber-500 dark:text-amber-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 font-bold'
                        }
                      >
                        {d.name}
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Legend Bar */}
                <div className="flex flex-wrap items-center gap-3 py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/70 dark:border-[#27272a] text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Keterangan:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Presensi Masuk/Pulang</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>Izin Sakit</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    <span>Cuti Tahunan / Izin</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    <span>Lembur (SPKL)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Hari Libur Nasional</span>
                  </span>
                </div>

                {/* Calendar Day Cells */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Blank leading days */}
                  {Array.from({ length: sDay }).map((_, idx) => (
                    <div
                      key={`empty-${mYear}-${mMonth}-${idx}`}
                      className="h-24 sm:h-28 rounded-2xl bg-slate-50/50 dark:bg-[#18181b]/30 border border-transparent"
                    />
                  ))}

                  {/* Days of Month */}
                  {Array.from({ length: dInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const curDateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
                    const events = mapEvents[day] || { attendances: [], leaves: [], overtimes: [], holidays: [] };
                    const dayOfWeek = (sDay + idx) % 7;
                    const dayKey = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dayOfWeek];

                    // Resolve if this day is a working day or off-day for the selected employee / schedule
                    let isWorkDay = true;
                    if (selectedEmployee) {
                      const empSched = getPlottedScheduleForEmployee(selectedEmployee, curDateStr, schedules, schedulePlots);
                      const wDays = (empSched?.working_days || ['mon', 'tue', 'wed', 'thu', 'fri']).map((item) => item.toLowerCase());
                      isWorkDay = wDays.includes(dayKey);
                    } else {
                      isWorkDay = dayOfWeek < 5; // Default Mon-Fri for company view
                    }
                    const isOffDay = !isWorkDay;

                    const hasHoliday = events.holidays.length > 0;
                    const todayObj = new Date();
                    const isToday = todayObj.getFullYear() === mYear && todayObj.getMonth() === mMonth && todayObj.getDate() === day;

                    return (
                      <div
                        key={`day-${mYear}-${mMonth}-${day}`}
                        onClick={() => setSelectedCalendarDayEvents({ dateStr: curDateStr, day, events, isToday, hasHoliday, isOffDay })}
                        className={`h-24 sm:h-28 rounded-2xl p-2 border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                          isToday
                            ? 'ring-2 ring-sky-500 bg-sky-50/30 dark:bg-sky-950/20 border-sky-400'
                            : hasHoliday
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 ring-1 ring-rose-400/30'
                            : isOffDay
                            ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/40 dark:border-rose-900/30'
                            : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a]'
                        } hover:border-sky-400 hover:shadow-md hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isToday
                                ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                                : hasHoliday
                                ? 'text-rose-600 dark:text-rose-400'
                                : isOffDay
                                ? dayOfWeek === 6
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {day}
                            {isToday && (
                              <span className="ml-1 text-[9px] font-normal px-1 py-0.2 rounded bg-sky-500 text-white font-sans">
                                Hari Ini
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasHoliday && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Hari Libur Nasional/Perusahaan" />
                            )}
                            {events.leaves.some((l) => l.leave_type_id === 2 || (l.leave_type_name || '').toLowerCase().includes('sakit') || (l.reason || '').toLowerCase().includes('sakit')) && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Ada Izin Sakit" />
                            )}
                            {events.leaves.some((l) => !(l.leave_type_id === 2 || (l.leave_type_name || '').toLowerCase().includes('sakit') || (l.reason || '').toLowerCase().includes('sakit'))) && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" title="Ada Cuti" />
                            )}
                            {events.attendances.length > 0 && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ada Presensi" />
                            )}
                          </div>
                        </div>

                        {/* Badges list */}
                        <div className="space-y-1 overflow-y-auto max-h-[68px] pr-0.5">
                          {/* Holiday Event Badges */}
                          {events.holidays.map((h) => (
                            <div
                              key={`hol-${h.id || h.holiday_date}`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 flex items-center gap-1 shadow-2xs"
                              title={`Hari Libur: ${h.holiday_name}`}
                            >
                              <Calendar className="w-2.5 h-2.5 shrink-0 text-rose-600 dark:text-rose-400" />
                              <span className="truncate">Libur: {h.holiday_name}</span>
                            </div>
                          ))}

                          {/* Attendance tags */}
                          {events.attendances.map((att) => {
                            const { emp } = getEmployeeMeta(att.employee_id);
                            const empName = (att.employee_name && att.employee_name !== '-' && att.employee_name !== 'Unknown')
                              ? att.employee_name
                              : (emp?.full_name || `Karyawan #${att.employee_id}`);
                            const timeStr = att.scan_time ? att.scan_time.slice(11, 16) : '';
                            return (
                              <div
                                key={`att-${att.id}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 ${
                                  att.status === 'late'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                                title={`${empName} (${att.log_type === 'in' ? 'IN' : 'OUT'}${timeStr ? ` ${timeStr}` : ''}): ${att.scan_time}`}
                              >
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">
                                  {att.log_type === 'in' ? 'IN' : 'OUT'}{timeStr ? ` ${timeStr}` : ''}: {empName}
                                </span>
                              </div>
                            );
                          })}

                          {/* Leave / Sick Leave tags */}
                          {events.leaves.map((l) => {
                            const isSick =
                              l.leave_type_id === 2 ||
                              (l.leave_type_name || '').toLowerCase().includes('sakit') ||
                              (l.reason || '').toLowerCase().includes('sakit');
                            return (
                              <div
                                key={`l-${l.id}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 ${
                                  isSick
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300/60 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800/60'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                                title={`${isSick ? 'Izin Sakit' : 'Cuti'}: ${l.employee_name} (${l.leave_type_name || (isSick ? 'Izin Sakit' : 'Cuti')})${l.reason ? ` - ${l.reason}` : ''}`}
                              >
                                {isSick ? (
                                  <Stethoscope className="w-2.5 h-2.5 shrink-0 text-amber-700 dark:text-amber-400" />
                                ) : (
                                  <FileText className="w-2.5 h-2.5 shrink-0" />
                                )}
                                <span className="truncate">
                                  {isSick ? 'Sakit' : 'Cuti'}: {l.employee_name}
                                </span>
                              </div>
                            );
                          })}

                          {/* Overtime tags */}
                          {events.overtimes.map((ot) => (
                            <div
                              key={`ot-${ot.id}`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1"
                              title={`Lembur: ${ot.employee_name} (${ot.total_hours} Jam)`}
                            >
                              <Briefcase className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">Lembur {ot.total_hours}h: {ot.employee_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'work_hours' ? (
        /* Work Hours & Overtime Points Tab */
        <div className="space-y-4">
          {/* Summary KPI Cards for Work Hours & Overtime Points */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Total Jam Kerja Reguler
                </div>
                <div className="text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
                  {totalRegHoursAll.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-normal text-slate-400">Jam</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Sesuai durasi shift terplot HR
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Total Jam Lembur (SPKL)
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {totalOtHoursAll.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-normal text-slate-400">Jam</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Hanya lembur yang disetujui HR
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Total Poin Akumulasi
                </div>
                <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {totalPointsAll.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-normal text-slate-400">Poin</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Bobot jam reguler + lembur
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Est. Upah Kerja & Lembur
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  Rp {Math.round(totalEstPayAll).toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Upah pokok + lembur terhitung
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Toolbar */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan, NIP, divisi, jabatan, golongan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Divisi Filter */}
                <select
                  value={workHoursDivisionFilter}
                  onChange={(e) => setWorkHoursDivisionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white"
                >
                  <option value="all">Semua Divisi ({uniqueDivisions.length})</option>
                  {uniqueDivisions.map((div) => (
                    <option key={div} value={div}>
                      Divisi: {div}
                    </option>
                  ))}
                </select>

                {(searchQuery || workHoursDivisionFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setWorkHoursDivisionFilter('all');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* Info note regarding payroll & overtime rule */}
            <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-sky-500" />
              <span>
                <strong>Ketentuan Perhitungan Upah & Jam Kerja:</strong> Durasi jam reguler dihitung proporsional sesuai plot jadwal kerja yang diregisterkan HR. Clock-out jam berapapun tanpa Form Lembur (SPKL) yang disetujui <em>tidak akan dikalikan atau dihitung lembur</em> (tetap upah/jam &times; durasi shift yang diregisterkan).
              </span>
            </div>
          </div>

          {/* Work Hours Table */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] w-12 whitespace-nowrap">
                      No
                    </th>
                    <SortableTh sortKey="name" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Karyawan
                    </SortableTh>
                    <SortableTh sortKey="jabatan" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Jabatan / Divisi
                    </SortableTh>
                    <SortableTh sortKey="golongan" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Golongan & Upah/Jam
                    </SortableTh>
                    <SortableTh sortKey="scheduleName" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Plot Jadwal Shift
                    </SortableTh>
                    <SortableTh sortKey="totalWorkedDays" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Hadir
                    </SortableTh>
                    <SortableTh sortKey="regularHours" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Jam Reguler
                    </SortableTh>
                    <SortableTh sortKey="overtimeHours" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Jam Lembur (SPKL)
                    </SortableTh>
                    <SortableTh sortKey="totalPointsHours" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Poin Total
                    </SortableTh>
                    <SortableTh sortKey="earnedOvertimePay" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Est. Upah Lembur
                    </SortableTh>
                    <SortableTh sortKey="totalEstimatedPay" currentSortKey={workHoursSortKey} currentSortDirection={workHoursSortDir} onSort={handleSortWorkHours}>
                      Total Est. Upah
                    </SortableTh>
                    <th className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {sortedEmployeeWorkSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        Tidak ada log absensi atau kehadiran pada periode bulan yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployeeWorkSummaries.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            NIP: {item.nip || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.jabatan}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {item.division}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.golongan}
                            </span>
                            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              Rp {item.baseRatePerHour.toLocaleString('id-ID')}/jam
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 font-medium text-xs">
                            {item.scheduleName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Durasi Shift: <strong>{item.shiftHours} Jam</strong>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {item.totalWorkedDays} <span className="text-[10px] font-normal text-slate-400">hari</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {item.regularHours}{' '}
                          <span className="text-[10px] font-normal text-slate-400">Jam</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.overtimeHours > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                              +{item.overtimeHours} Jam
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 text-xs">0 Jam</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                            {item.totalPointsHours} Poin
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {item.earnedOvertimePay > 0
                            ? `Rp ${Math.round(item.earnedOvertimePay).toLocaleString('id-ID')}`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          Rp {Math.round(item.totalEstimatedPay).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedWorkDetail(item)}
                            className="px-2.5 py-1 rounded-xl text-xs bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-sky-200 dark:border-sky-800 whitespace-nowrap"
                            title="Lihat rincian harian presensi & jam kerja"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Rincian Harian</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Table Mode with Flexible Multi-Grouping System */
        <div className="space-y-4">
          {/* Grouping & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] p-3.5 sm:p-4 shadow-xs space-y-3.5">
            {/* 1. FILTER CONTROLS GROUP */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[240px] max-w-lg">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIP, tanggal, perangkat, catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Filter Select Dropdowns & Clear Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Tipe IN/OUT */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white"
                >
                  <option value="all">Semua Tipe (IN & OUT)</option>
                  <option value="in">Tipe: Masuk (IN)</option>
                  <option value="out">Tipe: Pulang (OUT)</option>
                </select>

                {/* Filter Status Kehadiran */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="on_time">Tepat Waktu Saja</option>
                  <option value="late">Terlambat Saja</option>
                </select>

                {/* Filter Metode Scan (Pindahan dari Terminal Kiosk & Mobile GPS) */}
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white"
                >
                  <option value="all">Semua Metode Scan</option>
                  <option value="mobile_gps">Metode: Mobile GPS (Aplikasi HP)</option>
                  <option value="qr">Metode: QR Scan / Barcode</option>
                  <option value="manual">Metode: Input Manual (NIP)</option>
                  <option value="rfid">Metode: Kartu RFID</option>
                </select>

                {/* Filter Lokasi Kerja */}
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white max-w-[210px] truncate"
                >
                  <option value="all">Semua Lokasi Kerja</option>
                  {(locations || []).map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      📍 {loc.location_name}
                    </option>
                  ))}
                  <option value="none">Tanpa Lokasi Khusus (Kiosk/Umum)</option>
                </select>

                {/* Reset / Clear Filter button for Table */}
                {(searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterMethod !== 'all' || filterLocation !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                      setFilterStatus('all');
                      setFilterMethod('all');
                      setFilterLocation('all');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Clear filter pencarian, tipe, status, metode, dan lokasi"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. GROUPING CONTROLS GROUP */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-[#27272a] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-sky-500" />
                  <span>Grouping:</span>
                </div>

                {/* Grouping Checkbox Chips */}
                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('location')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGrouping.includes('location')
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>Lokasi</span>
                  {activeGrouping.includes('location') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('employee')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeGrouping.includes('employee')
                      ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Karyawan</span>
                  {activeGrouping.includes('employee') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('log_type')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeGrouping.includes('log_type')
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <LogIn className="w-3 h-3" />
                  <span>Tipe IN / OUT</span>
                  {activeGrouping.includes('log_type') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('status')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeGrouping.includes('status')
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Ketepatan Waktu</span>
                  {activeGrouping.includes('status') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('date')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeGrouping.includes('date')
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Tanggal</span>
                  {activeGrouping.includes('date') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleGroupingDimension('division')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeGrouping.includes('division')
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Divisi</span>
                  {activeGrouping.includes('division') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              </div>

              {/* Quick Presets & Expand / Collapse Controls */}
              <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setActiveGrouping(['location', 'employee'])}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Preset: Lokasi + Karyawan
                </button>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveGrouping(['division', 'employee'])}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Preset: Divisi + Karyawan
                </button>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveGrouping(['employee', 'log_type'])}
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Preset: Karyawan + IN/OUT
                </button>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveGrouping([])}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Tanpa Grouping (Flat)
                </button>

                {groupedData && groupedData.length > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <button
                      type="button"
                      onClick={expandAllGroups}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-300"
                    >
                      Buka Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => collapseAllGroups(groupedData.map((g) => g.groupKey))}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-300"
                    >
                      Tutup Semua
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Render Grouped Tables or Flat Table */}
          {groupedData && groupedData.length > 0 ? (
            /* GROUPED MODE */
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                <span>
                  Menampilkan <strong>{groupedData.length}</strong> grup ({sortedMonthLogs.length} total rekaman terfilter)
                </span>
                <span>
                  Grouping aktif: <strong>{activeGrouping.map((g) => g === 'employee' ? 'Karyawan' : g === 'log_type' ? 'Status IN/OUT' : g === 'status' ? 'Ketepatan' : 'Tanggal').join(' &rarr; ')}</strong>
                </span>
              </div>

              {groupedData.map((group) => {
                const isCollapsed = !!collapsedGroups[group.groupKey];

                return (
                  <div
                    key={group.groupKey}
                    className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-md transition-all"
                  >
                    {/* Group Header Banner */}
                    <div
                      onClick={() => toggleGroupCollapse(group.groupKey)}
                      className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-[#18181b]/90 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-[#1f1f23] transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                              {group.label}
                            </h3>
                            {group.subLabel && (
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                NIP: {group.subLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{group.stats.total} Rekaman Presensi</span>
                            <span>&bull;</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {group.stats.onTime} Tepat Waktu
                            </span>
                            {group.stats.late > 0 && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  {group.stats.late} Terlambat
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                          {isCollapsed ? 'Buka Detail' : 'Tutup'}
                        </span>
                        <div className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Group Sub-Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50/50 dark:bg-[#151518] border-b border-slate-100 dark:border-[#27272a] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="w-12 py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                                No
                              </th>
                              {!activeGrouping.includes('employee') && (
                                <SortableTh sortKey="employee_name" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                  Karyawan
                                </SortableTh>
                              )}
                              <SortableTh sortKey="jabatan" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Jabatan / Divisi
                              </SortableTh>
                              <SortableTh sortKey="golongan" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Golongan
                              </SortableTh>
                              <SortableTh sortKey="log_date" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Tanggal Presensi
                              </SortableTh>
                              <SortableTh sortKey="scan_time" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Waktu Scan
                              </SortableTh>
                              <SortableTh sortKey="log_type" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Tipe Presensi
                              </SortableTh>
                              <SortableTh sortKey="method" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Metode
                              </SortableTh>
                              <SortableTh sortKey="device_id" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Lokasi Kerja & Koordinat GPS
                              </SortableTh>
                              <SortableTh sortKey="status" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Status Kehadiran
                              </SortableTh>
                              <SortableTh sortKey="notes" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                                Keterangan
                              </SortableTh>
                              <th className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                            {group.items.map((log, idx) => {
                              const { emp, division, golongan, jabatan } = getEmployeeMeta(log.employee_id);
                              const empName = (log.employee_name && log.employee_name !== 'Unknown') ? log.employee_name : (emp?.full_name || '-');
                              const empNip = (log.employee_nip && log.employee_nip !== '-') ? log.employee_nip : (emp?.nip || '-');
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-xs">
                                    {idx + 1}
                                  </td>
                                  {!activeGrouping.includes('employee') && (
                                    <td className="py-2.5 px-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900 dark:text-white">
                                        {empName}
                                      </div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        NIP: {empNip}
                                      </div>
                                    </td>
                                  )}
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                      {jabatan}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                      {division}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] font-semibold">
                                      {golongan}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {formatDateDDMMYYYY(log.log_date)}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                    {log.scan_time}
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 border whitespace-nowrap ${
                                        log.log_type === 'in'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                      }`}
                                    >
                                      {log.log_type === 'in' ? (
                                        <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <LogOut className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                      )}
                                      {log.log_type === 'in' ? 'MASUK (IN)' : 'PULANG (OUT)'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    {renderMethodBadge(log)}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {renderLocationCell(log)}
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                        log.status === 'on_time'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : log.status === 'late'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      }`}
                                    >
                                      {log.status === 'on_time'
                                        ? 'TEPAT WAKTU'
                                        : log.status === 'late'
                                        ? 'TERLAMBAT'
                                        : log.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 italic text-[11px] whitespace-nowrap">
                                    {log.notes || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(log)}
                                        className="p-1 rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50 transition-colors cursor-pointer"
                                        title="Edit Log Presensi"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingLog(log)}
                                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                        title="Hapus Log Presensi"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT TABLE MODE (OR NO GROUP MATCH) */
            <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="w-12 py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        No
                      </th>
                      <SortableTh sortKey="employee_name" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Karyawan
                      </SortableTh>
                      <SortableTh sortKey="jabatan" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Jabatan / Divisi
                      </SortableTh>
                      <SortableTh sortKey="golongan" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Golongan
                      </SortableTh>
                      <SortableTh sortKey="log_date" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Tanggal
                      </SortableTh>
                      <SortableTh sortKey="scan_time" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Waktu Scan
                      </SortableTh>
                      <SortableTh sortKey="log_type" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Tipe
                      </SortableTh>
                      <SortableTh sortKey="method" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Metode Scan
                      </SortableTh>
                      <SortableTh sortKey="device_id" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Lokasi Kerja & Koordinat GPS
                      </SortableTh>
                      <SortableTh sortKey="status" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Status Kehadiran
                      </SortableTh>
                      <SortableTh sortKey="notes" currentSortKey={logSortKey} currentSortDirection={logSortDir} onSort={handleSortLog}>
                        Keterangan
                      </SortableTh>
                      <th className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                    {sortedMonthLogs.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-500 dark:text-slate-300">
                          Tidak ada log presensi untuk periode atau filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      sortedMonthLogs.map((log, idx) => {
                        const { emp, division, golongan, jabatan } = getEmployeeMeta(log.employee_id);
                        const empName = (log.employee_name && log.employee_name !== 'Unknown') ? log.employee_name : (emp?.full_name || '-');
                        const empNip = (log.employee_nip && log.employee_nip !== '-') ? log.employee_nip : (emp?.nip || '-');
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {empName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
                                NIP: {empNip}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {jabatan}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {division}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] font-semibold">
                                {golongan}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDateDDMMYYYY(log.log_date)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {log.scan_time}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 border whitespace-nowrap ${
                                  log.log_type === 'in'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                {log.log_type === 'in' ? (
                                  <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <LogOut className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                )}
                                {log.log_type === 'in' ? 'MASUK (IN)' : 'PULANG (OUT)'}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {renderMethodBadge(log)}
                            </td>
                            <td className="py-3 px-4">
                              {renderLocationCell(log)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                  log.status === 'on_time'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : log.status === 'late'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                              {log.status === 'on_time' ? 'TEPAT WAKTU' : log.status === 'late' ? 'TERLAMBAT' : log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic text-[11px]">
                            {log.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(log)}
                                className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50 transition-colors cursor-pointer"
                                title="Edit Log Presensi"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingLog(log)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="Hapus Log Presensi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah Log Presensi Manual */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tambah Log Presensi Manual
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gunakan panel ini untuk memasukkan presensi manual (Clock In / Clock Out)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLogSubmit} className="space-y-4">
              {/* Karyawan Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                  Pilih Karyawan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createFormData.employee_id}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} (NIP: {emp.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Tanggal Presensi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={createFormData.log_date}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, log_date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {/* Waktu */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Waktu Scan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08:00:00 atau 17:00"
                    value={createFormData.scan_time}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, scan_time: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tipe Presensi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Tipe Presensi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createFormData.log_type}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, log_type: e.target.value as 'in' | 'out' }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="in">MASUK (IN)</option>
                    <option value="out">PULANG (OUT)</option>
                  </select>
                </div>

                {/* Status Kehadiran */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Status Kehadiran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createFormData.status}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="on_time">TEPAT WAKTU</option>
                    <option value="late">TERLAMBAT</option>
                    <option value="normal">NORMAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Metode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Metode Scan
                  </label>
                  <select
                    value={createFormData.method}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, method: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="manual">MANUAL (SISTEM)</option>
                    <option value="mobile_gps">MOBILE GPS (HP KARYAWAN)</option>
                    <option value="qr">QR CODE SCAN</option>
                    <option value="rfid">RFID CARD</option>
                  </select>
                </div>

                {/* Perangkat / Lokasi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                    Titik Lokasi Perusahaan
                  </label>
                  <select
                    value={createFormData.location_id}
                    onChange={(e) => {
                      const locId = e.target.value;
                      const selected = (locations || []).find((l) => String(l.id) === locId);
                      setCreateFormData((prev) => ({
                        ...prev,
                        location_id: locId,
                        latitude: selected ? String(selected.latitude) : '',
                        longitude: selected ? String(selected.longitude) : '',
                        location_address: selected ? (selected.address || selected.location_name) : '',
                        device_id: selected ? `Lokasi: ${selected.location_name}` : prev.device_id,
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">-- Tanpa Lokasi Khusus / Kiosk --</option>
                    {(locations || []).map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        📍 {loc.location_name} ({loc.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Perangkat / Keterangan Terminal */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                  Label Perangkat / Terminal Kiosk
                </label>
                <input
                  type="text"
                  value={createFormData.device_id}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, device_id: e.target.value }))}
                  placeholder="Contoh: Kiosk Gate 1 / Mobile Android"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                  Keterangan / Catatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Alasan presensi manual dimasukkan..."
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#27272a] rounded-xl hover:bg-slate-200 dark:hover:bg-[#3f3f46] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {isSubmittingAction ? 'Menyimpan...' : 'Simpan Presensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Log Presensi */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Log Presensi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingLog.employee_name} ({editingLog.employee_nip})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Acuan Jam Kerja Karyawan Info Banner */}
            <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
                  <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Acuan Jam Kerja Resmi: {targetEmp?.full_name || editingLog.employee_name}</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 font-bold border border-sky-200 dark:border-sky-800">
                  {targetSched.schedule_name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white dark:bg-[#18181b] p-2 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Jam Masuk</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                    {targetSched.time_in?.slice(0, 5) || '08:00'} WIB
                  </span>
                </div>
                <div className="bg-white dark:bg-[#18181b] p-2 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Jam Pulang</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                    {targetSched.time_out?.slice(0, 5) || '17:00'} WIB
                  </span>
                </div>
                <div className="bg-white dark:bg-[#18181b] p-2 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Toleransi Telat</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                    {targetSched.tolerance_minutes ?? 15} Menit
                  </span>
                </div>
                <div className="bg-white dark:bg-[#18181b] p-2 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Jam Istirahat</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {targetSched.break_start?.slice(0, 5) || '12:00'} - {targetSched.break_end?.slice(0, 5) || '13:00'}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-sky-800 dark:text-sky-300/90 flex items-start gap-1.5 pt-1.5 border-t border-sky-200/60 dark:border-sky-900/40">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                <span>
                  <strong>Panduan Verifikasi HR:</strong> Divisi <strong>{targetEmp?.division_name || 'Operasional'}</strong>. Karyawan yang scan masuk setelah pukul <strong>{targetSched.time_in ? `${targetSched.time_in.slice(0, 2)}:${String(Number(targetSched.time_in.slice(3, 5)) + (targetSched.tolerance_minutes ?? 15)).padStart(2, '0')}` : '08:15'} WIB</strong> wajib diverifikasi sebagai <em>Terlambat (Late)</em>.
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Datetime Picker Group */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/70 border border-slate-200 dark:border-[#27272a]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-sky-500" />
                    <span>Datetime Picker (Tanggal & Waktu Scan)</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-[#18181b] text-sky-700 dark:text-sky-300 font-bold border border-slate-200 dark:border-[#27272a]">
                    {editFormData.scan_time || 'Belum diatur'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Tanggal Presensi (dd-MM-yyyy format) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      1. Tanggal Presensi:
                    </label>
                    <DateInput
                      value={editFormData.log_date}
                      onChange={(v) => {
                        setEditFormData((prev) => {
                          const timePart = prev.scan_time.includes(' ')
                            ? prev.scan_time.split(' ')[1]
                            : prev.scan_time || '08:00:00';
                          return {
                            ...prev,
                            log_date: v,
                            scan_time: `${v} ${timePart}`,
                          };
                        });
                      }}
                      required
                      className="w-full"
                    />
                  </div>

                  {/* Timepicker input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      2. Jam Scan (HH:mm:ss):
                    </label>
                    <input
                      type="time"
                      step="1"
                      value={
                        editFormData.scan_time.includes(' ')
                          ? editFormData.scan_time.split(' ')[1].slice(0, 8)
                          : editFormData.scan_time.slice(0, 8) || '08:00:00'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const fullTime = val.length === 5 ? `${val}:00` : val;
                        setEditFormData((prev) => ({
                          ...prev,
                          scan_time: `${prev.log_date} ${fullTime}`,
                        }));
                      }}
                      required
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Presets for HR */}
                <div className="pt-1.5 border-t border-slate-200/60 dark:border-[#27272a]/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-semibold">Preset Cepat Berdasarkan Jadwal:</span>
                    <span className="text-[10px] text-slate-400">Klik tombol untuk sinkron otomatis</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const inTime = targetSched.time_in || '08:00:00';
                        setEditFormData((prev) => ({
                          ...prev,
                          log_type: 'in',
                          scan_time: `${prev.log_date} ${inTime}`,
                          status: 'on_time',
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <LogIn className="w-2.5 h-2.5" />
                      <span>Jam Masuk ({targetSched.time_in?.slice(0, 5)})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const outTime = targetSched.time_out || '17:00:00';
                        setEditFormData((prev) => ({
                          ...prev,
                          log_type: 'out',
                          scan_time: `${prev.log_date} ${outTime}`,
                          status: 'on_time',
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-2.5 h-2.5" />
                      <span>Jam Pulang ({targetSched.time_out?.slice(0, 5)})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const pad = (n: number) => String(n).padStart(2, '0');
                        const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                        setEditFormData((prev) => ({
                          ...prev,
                          scan_time: `${prev.log_date} ${nowTime}`,
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>Waktu Saat Ini (Now)</span>
                    </button>
                  </div>
                </div>

                {/* Direct exact string editing */}
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                    Teks Waktu Presensi (YYYY-MM-DD HH:mm:ss):
                  </label>
                  <input
                    type="text"
                    value={editFormData.scan_time}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, scan_time: e.target.value }))}
                    placeholder="2026-09-08 07:45:00"
                    required
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Tipe & Metode Presensi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Presensi
                  </label>
                  <select
                    value={editFormData.log_type}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, log_type: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="in">MASUK (IN)</option>
                    <option value="out">PULANG (OUT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Scan
                  </label>
                  <select
                    value={editFormData.method}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, method: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="qr">QR Scan / Barcode</option>
                    <option value="mobile_gps">Mobile GPS (Aplikasi HP)</option>
                    <option value="manual">Input Manual (NIP)</option>
                    <option value="rfid">Kartu RFID</option>
                  </select>
                </div>
              </div>

              {/* Titik Lokasi Perusahaan & Status Kehadiran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Titik Lokasi Perusahaan
                  </label>
                  <select
                    value={editFormData.location_id}
                    onChange={(e) => {
                      const locId = e.target.value;
                      const selected = (locations || []).find((l) => String(l.id) === locId);
                      setEditFormData((prev) => ({
                        ...prev,
                        location_id: locId,
                        latitude: selected ? String(selected.latitude) : prev.latitude,
                        longitude: selected ? String(selected.longitude) : prev.longitude,
                        location_address: selected ? (selected.address || selected.location_name) : prev.location_address,
                        device_id: selected ? `Lokasi: ${selected.location_name}` : prev.device_id,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="">-- Tanpa Lokasi Khusus / Kiosk --</option>
                    {(locations || []).map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        📍 {loc.location_name} ({loc.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="on_time">Tepat Waktu (On Time)</option>
                    <option value="late">Terlambat (Late)</option>
                    <option value="early_leave">Pulang Awal (Early Leave)</option>
                  </select>
                </div>
              </div>

              {/* Perangkat & Alamat Lokasi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi / Nama Perangkat
                  </label>
                  <input
                    type="text"
                    value={editFormData.device_id}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, device_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Koordinat GPS (Lat, Long)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={editFormData.latitude}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, latitude: e.target.value }))}
                      className="w-1/2 px-2 py-2 rounded-xl text-[11px] font-mono bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={editFormData.longitude}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, longitude: e.target.value }))}
                      className="w-1/2 px-2 py-2 rounded-xl text-[11px] font-mono bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Opsional, misal: Koreksi jam presensi oleh HR"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingAction ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Log Presensi */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hapus Log Presensi?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tindakan ini akan menghapus riwayat kehadiran ini secara permanen.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121215] border border-slate-100 dark:border-[#27272a] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Karyawan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{deletingLog.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">NIP:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{deletingLog.employee_nip || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Tanggal:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateDDMMYYYY(deletingLog.log_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Waktu & Tipe:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {deletingLog.scan_time} ({deletingLog.log_type === 'in' ? 'MASUK' : 'PULANG'})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingAction ? 'Menghapus...' : 'Ya, Hapus Log'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Detail Harian Jam Kerja & Lembur */}
      {selectedWorkDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#27272a] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#121215]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm">
                  {selectedWorkDetail.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedWorkDetail.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-[#27272a] text-slate-700 dark:text-slate-300">
                      {selectedWorkDetail.golongan}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    NIP: <span className="font-mono">{selectedWorkDetail.nip || '-'}</span> • {selectedWorkDetail.jabatan} ({selectedWorkDetail.division})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI stats bar */}
            <div className="p-4 bg-slate-50 dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0 text-xs">
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a]">
                <div className="text-[10px] text-slate-500">Plot Jadwal Shift</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {selectedWorkDetail.scheduleName}
                </div>
                <div className="text-[10px] text-sky-600 font-semibold">
                  {selectedWorkDetail.shiftHours} Jam / Hari
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a]">
                <div className="text-[10px] text-slate-500">Total Hari Hadir</div>
                <div className="font-black text-slate-900 dark:text-white mt-0.5 text-sm">
                  {selectedWorkDetail.totalWorkedDays} <span className="text-xs font-normal text-slate-400">Hari</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a]">
                <div className="text-[10px] text-slate-500">Total Jam Reguler</div>
                <div className="font-black text-sky-600 dark:text-sky-400 mt-0.5 text-sm">
                  {selectedWorkDetail.regularHours} <span className="text-xs font-normal text-slate-400">Jam</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a]">
                <div className="text-[10px] text-slate-500">Lembur Valid (SPKL)</div>
                <div className="font-black text-amber-600 dark:text-amber-400 mt-0.5 text-sm">
                  {selectedWorkDetail.overtimeHours} <span className="text-xs font-normal text-slate-400">Jam</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a]">
                <div className="text-[10px] text-slate-500">Total Est. Upah</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5 text-xs truncate">
                  Rp {Math.round(selectedWorkDetail.totalEstimatedPay).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Scrollable breakdown list */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Ketentuan Validasi Lembur:</strong> Sesuai SOP Perusahaan, jam kerja karyawan dibatasi berdasarkan durasi plot jadwal kerja yang didaftarkan HR ({selectedWorkDetail.shiftHours} jam). Karyawan yang melakukan clock-out melebihi jam kerja normal tanpa adanya <em>Form Pengajuan Lembur (SPKL) yang telah disetujui</em> tidak akan mendapatkan pengali lembur.
                </div>
              </div>

              <div className="border border-slate-200 dark:border-[#27272a] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="w-10 py-2.5 px-3 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Scan Masuk / Pulang</th>
                      <th className="py-2.5 px-3 text-center">Durasi Aktual</th>
                      <th className="py-2.5 px-3 text-center">Plot Shift HR</th>
                      <th className="py-2.5 px-3 text-center">Jam Reguler</th>
                      <th className="py-2.5 px-3 text-center">Lembur Valid</th>
                      <th className="py-2.5 px-3">Keterangan / Status Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                    {selectedWorkDetail.dailyBreakdown?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Tidak ada log presensi atau penugasan lembur pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      selectedWorkDetail.dailyBreakdown?.map((day: any, dIdx: number) => {
                        const inText = day.inTime ? day.inTime.slice(11, 16) : '-';
                        const outText = day.outTime ? day.outTime.slice(11, 16) : '-';
                        return (
                          <tr key={dIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-xs">
                              {dIdx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                              {formatDateDDMMYYYY(day.date)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                              <span className="text-emerald-600 font-bold">{inText}</span>
                              <span className="text-slate-400 mx-1.5">&rarr;</span>
                              <span className="text-sky-600 font-bold">{outText}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                              {day.rawElapsedHours !== null ? `${day.rawElapsedHours} Jam` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {day.scheduledShiftHours} Jam
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                              {day.regularHours} Jam
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {day.overtimeHours > 0 ? (
                                <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  +{day.overtimeHours} Jam
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                              {day.hasApprovedOtForm ? (
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>SPKL Lembur Disetujui ({day.otReason || 'Tugas Khusus'})</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">
                                  {day.notes || 'Reguler'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-end bg-slate-50/50 dark:bg-[#121215]/50">
              <button
                type="button"
                onClick={() => setSelectedWorkDetail(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#27272a] rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RINCIAN EVENT GRID TANGGAL */}
      {selectedCalendarDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#27272a] flex items-center justify-between bg-slate-50/50 dark:bg-[#18181b]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-black text-lg">
                  {selectedCalendarDayEvents.day}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Rincian Event Tanggal {formatDateDDMMYYYY(selectedCalendarDayEvents.dateStr)}</span>
                    {selectedCalendarDayEvents.isToday && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white">
                        Hari Ini
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCalendarDayEvents.isOffDay ? 'Hari Libur / Akhir Pekan' : 'Hari Kerja Reguler'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCalendarDayEvents(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Holidays */}
              {selectedCalendarDayEvents.events.holidays?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Hari Libur / Cuti Bersama ({selectedCalendarDayEvents.events.holidays.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCalendarDayEvents.events.holidays.map((h: any, i: number) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-rose-500 text-white font-bold shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-rose-900 dark:text-rose-200">{h.holiday_name}</div>
                          <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">{h.description || 'Libur Resmi Perusahaan / Nasional'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendances */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Presensi Masuk & Pulang ({selectedCalendarDayEvents.events.attendances?.length || 0})
                </h4>
                {selectedCalendarDayEvents.events.attendances?.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-xs text-slate-500 dark:text-slate-400 italic">
                    Tidak ada log scan presensi pada tanggal ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCalendarDayEvents.events.attendances.map((att: any, i: number) => {
                      const { emp } = getEmployeeMeta(att.employee_id);
                      const empName = att.employee_name || emp?.full_name || `Karyawan #${att.employee_id}`;
                      const empNip = att.employee_nip || emp?.nip || '-';
                      const timeStr = att.scan_time ? att.scan_time.slice(11, 19) : '-';
                      return (
                        <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">{empName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {empNip}</div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              att.log_type === 'in' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            }`}>
                              {att.log_type === 'in' ? 'MASUK (IN)' : 'PULANG (OUT)'}
                            </span>
                            <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{timeStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Leaves */}
              {selectedCalendarDayEvents.events.leaves?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4" />
                    Cuti & Izin Sakit ({selectedCalendarDayEvents.events.leaves.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCalendarDayEvents.events.leaves.map((l: any, i: number) => (
                      <div key={i} className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-blue-950 dark:text-blue-200">{l.employee_name || `Karyawan #${l.employee_id}`}</div>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">Tipe: {l.leave_type_name || 'Cuti'} &bull; Alasan: {l.reason || '-'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {l.status || 'Approved'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overtime (SPKL) */}
              {selectedCalendarDayEvents.events.overtimes?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Surat Perintah Kerja Lembur / SPKL ({selectedCalendarDayEvents.events.overtimes.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCalendarDayEvents.events.overtimes.map((ot: any, i: number) => (
                      <div key={i} className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-purple-950 dark:text-purple-200">{ot.employee_name || `Karyawan #${ot.employee_id}`}</div>
                          <div className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5">Tugas: {ot.reason || 'Lembur Operasional'} ({ot.duration_hours || 2} Jam)</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          {ot.status || 'Approved'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-end bg-slate-50/50 dark:bg-[#121215]/50">
              <button
                type="button"
                onClick={() => setSelectedCalendarDayEvents(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA MASTER TITIK LOKASI PRESENSI PERUSAHAAN */}
      <WorkLocationManagerModal
        isOpen={showLocationManagerModal}
        onClose={() => setShowLocationManagerModal(false)}
        locations={locations}
        onRefresh={onRefreshLocations || (() => {})}
        accentColor={accentColor}
      />

      {/* MODAL: SIMULASI MOBILE APP KARYAWAN (GPS & GEOFENCING) */}
      <MobilePortalSimulationModal
        isOpen={showMobileSimulatorModal}
        onClose={() => setShowMobileSimulatorModal(false)}
        employees={employees}
        locations={locations}
        accentColor={accentColor}
        onSuccess={() => {
          if (onRefreshLocations) onRefreshLocations();
          handleSyncAttendance();
        }}
      />
    </div>
  );
};
