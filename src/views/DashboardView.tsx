import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Scan,
  Maximize2,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingUp,
  X,
  ExternalLink,
} from 'lucide-react';
import { Employee, AttendanceLog, LeaveRequest, OvertimeRequest, User, PayrollSlip, CompanyProfile } from '../types';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { getContrastTextColorStyle, getAccessibleAccentColor } from '../lib/companyUtils';
import { formatDateDDMMYYYY } from '../lib/formatUtils';

interface DashboardViewProps {
  currentUser: User;
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  payrollSlips?: PayrollSlip[];
  accentColor: string;
  isDarkMode?: boolean;
  companyName?: string;
  companyProfile?: CompanyProfile;
  onNavigate: (tab: any) => void;
  onApproveLeave: (id: number, status: 'approved' | 'rejected') => void;
  onApproveOvertime: (id: number, status: 'approved' | 'rejected') => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  employees,
  attendanceLogs,
  leaveRequests,
  overtimeRequests,
  payrollSlips = [],
  accentColor,
  isDarkMode = true,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  companyProfile,
  onNavigate,
  onApproveLeave,
  onApproveOvertime,
  onRefresh,
}) => {
  const accessibleColor = useMemo(
    () => getAccessibleAccentColor(accentColor, isDarkMode !== false),
    [accentColor, isDarkMode]
  );
  // Sorting state for Presensi table
  const [sortKey, setSortKey] = useState<string | null>('scan_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Detail modal state for pending approvals
  const [selectedRequest, setSelectedRequest] = useState<{
    type: 'leave' | 'overtime' | 'swap';
    data: any;
  } | null>(null);

  // Fullscreen/expanded log modal
  const [showLogModal, setShowLogModal] = useState(false);

  // Refresh status state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshedAt(new Date().toLocaleTimeString('id-ID'));
      setTimeout(() => setLastRefreshedAt(null), 4000);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const activeEmployees = employees.filter((e) => e.status === 'active');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayScans = attendanceLogs.filter((l) => l.log_date === todayStr);
  const lateScans = todayScans.filter((l) => l.status === 'late');

  const pendingLeaves = leaveRequests.filter((r) => r.status === 'pending');
  const pendingOvertimes = overtimeRequests.filter((r) => r.status === 'pending');
  const totalPending = pendingLeaves.length + pendingOvertimes.length;

  const canApprove = ['super_admin', 'hr_admin', 'manager'].includes(currentUser.role_key);

  // Total payroll net pay calculation
  const totalNetPay = useMemo(() => {
    if (payrollSlips.length > 0) {
      return payrollSlips.reduce((acc, curr) => acc + (Number(curr.net_salary) || 0), 0);
    }
    // Fallback default realistic total if slips haven't generated yet
    return 44008000;
  }, [payrollSlips]);

  // Sorting handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Attendance table filter mode: 'today' vs 'all'
  const [logFilterMode, setLogFilterMode] = useState<'today' | 'all'>('today');

  // Sorted attendance logs based on selected filter
  const displayLogs = logFilterMode === 'today' ? todayScans : attendanceLogs.slice(0, 10);
  const sortedLogs = useMemo(() => {
    return sortTableData(displayLogs, sortKey, sortDirection);
  }, [displayLogs, sortKey, sortDirection]);

  // Format currency
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* 1. ELEGANT TOP GREETING BANNER (Fluid, Soft Curvature) */}
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-xl transition-colors">
        <div className="relative z-10 max-w-3xl">
          <div
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest mb-2"
            style={{ color: accessibleColor }}
          >
            <Sparkles className="w-4 h-4" />
            <span><span className="font-company">{companyName || 'PT. NINDYA KRIDA UTAMA'}</span> &bull; HR MANAGEMENT PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white font-sans tracking-tight">
            {getGreeting()}, <span className="font-semibold text-slate-950 dark:text-white">{currentUser.employee_name || currentUser.username}</span>
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-sans">
            Sistem pemantauan presensi real-time, manajemen shift batching plant ready-mix, dan otomasi administrasi penggajian terintegrasi.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('kiosk')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider font-mono shadow-md hover:scale-105 active:scale-95"
              style={{
                backgroundColor: accentColor,
                color: getContrastTextColorStyle(accentColor),
              }}
            >
              Buka Terminal Kiosk
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('payroll')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#171b2f] border border-slate-200 dark:border-[#2c3454] dark:hover:bg-[#202642] transition-colors tracking-wide"
            >
              Kelola Slip Gaji Periode
            </button>
            <button
              onClick={() => onNavigate('ai_assistant')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Asisten AI (Gemini)
            </button>
            <button
              onClick={handleTriggerRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500 active:scale-95 disabled:opacity-50"
              title="Segarkan Data Seluruh Dashboard"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ color: accessibleColor }}
              />
              <span>{isRefreshing ? 'Menyegarkan...' : 'Segarkan'}</span>
            </button>
            {lastRefreshedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 rounded-full animate-fade-in">
                <CheckCircle2 className="w-3 h-3" />
                Data Baru ({lastRefreshedAt})
              </span>
            )}
          </div>
        </div>

        {/* Ambient background glow */}
        <div
          className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full blur-3xl opacity-10 dark:opacity-20 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* 2. METRIC SUMMARY CARDS (Fluid Rounded-3xl, non-stiff) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Karyawan Aktif */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Active Manpower
            </span>
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
              TOTAL SDM
            </span>
          </div>
          <div className="mt-3 flex items-end space-x-2">
            <span className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white font-mono">
              {activeEmployees.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mb-1 font-mono">
              / {employees.length} pax
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#18181b] h-1.5 mt-3 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all"
              style={{
                width: `${employees.length ? (activeEmployees.length / employees.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Presensi Hari Ini */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Daily Attendance
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              KIOSK NIP/QR
            </span>
          </div>
          <div className="mt-3 flex items-end space-x-2">
            <span className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white font-mono">
              {todayScans.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mb-1 font-mono">scans today</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#18181b] h-1.5 mt-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{
                width: `${activeEmployees.length ? Math.min((todayScans.length / activeEmployees.length) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Terlambat Masuk */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Late Arrivals
            </span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              &gt;15 MIN
            </span>
          </div>
          <div className="mt-3 flex items-end space-x-2">
            <span className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white font-mono">
              {lateScans.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mb-1 font-mono">karyawan</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#18181b] h-1.5 mt-3 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{
                width: `${todayScans.length ? (lateScans.length / todayScans.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Perlu Persetujuan */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Pending Approvals
            </span>
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
              ACTION REQ
            </span>
          </div>
          <div className="mt-3 flex items-end space-x-2">
            <span className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white font-mono">
              {totalPending}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mb-1 font-mono">requests</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#18181b] h-1.5 mt-3 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{
                width: `${totalPending > 0 ? Math.min(totalPending * 25, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2.5. HIGH-CONTRAST DEDICATED AI SHORTCUT BANNER */}
      <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-transparent border border-purple-200 dark:border-purple-900/40 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Asisten AI HR Aktif
              <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded-sm">LIVE</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal mt-0.5 max-w-xl">
              Butuh slip gaji cepat, rekap kedisiplinan bulan ini, atau ingin tahu siapa saja yang sering terlambat? Biarkan AI membaca data presensi secara aman dan menyusun laporannya untuk Anda sekarang.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('ai_assistant')}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span>Tanyakan Asisten AI HR</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. MAIN SECTION: PRESENSI LOG TABLE & PENDING APPROVALS + PAYROLL (EXACT PICT 1 LAYOUT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (COL-SPAN-7 / COL-SPAN-8): LOG PRESENSI KARYAWAN HARI INI */}
        <div className="xl:col-span-7 2xl:col-span-8 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] p-6 shadow-xl flex flex-col">
          {/* Header matching Pict 1 with interactive filter tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-slate-200 dark:border-[#27272a] gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                  {logFilterMode === 'today' ? 'Log Presensi Karyawan Hari Ini' : 'Riwayat Pemindaian Terakhir'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-sans mt-0.5">
                  {logFilterMode === 'today'
                    ? `Data pemindaian aktif tanggal ${formatDateDDMMYYYY(todayStr)} dari Terminal Kiosk`
                    : `Semua riwayat pemindaian presensi terekam (${attendanceLogs.length} total log)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Tab Selector */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl text-xs">
                <button
                  onClick={() => setLogFilterMode('today')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    logFilterMode === 'today'
                      ? 'bg-white dark:bg-[#27272a] text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Hari Ini ({todayScans.length})
                </button>
                <button
                  onClick={() => setLogFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    logFilterMode === 'all'
                      ? 'bg-white dark:bg-[#27272a] text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semua Log ({attendanceLogs.length})
                </button>
              </div>

              <button
                onClick={() => setShowLogModal(true)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-[#27272a] transition-colors"
                title="Perbesar Tampilan Log"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('calendar')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-sky-500/10"
              >
                <span>Kalender</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table matching Pict 1 */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#27272a]">
                  <th className="w-12 py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    No
                  </th>
                  <SortableTh
                    sortKey="employee_name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans normal-case text-xs"
                  >
                    Karyawan
                  </SortableTh>
                  <SortableTh
                    sortKey="division_name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans normal-case text-xs"
                  >
                    Divisi
                  </SortableTh>
                  <SortableTh
                    sortKey="scan_time"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans normal-case text-xs"
                  >
                    Jam Masuk
                  </SortableTh>
                  <SortableTh
                    sortKey="method"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans normal-case text-xs"
                  >
                    Metode
                  </SortableTh>
                  <SortableTh
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans normal-case text-xs"
                  >
                    Status
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-300 text-xs font-mono">
                      {logFilterMode === 'today' ? (
                        <div className="space-y-2">
                          <p>Belum ada pemindaian presensi yang terekam hari ini ({todayStr}).</p>
                          <button
                            onClick={() => setLogFilterMode('all')}
                            className="text-sky-500 hover:underline text-xs"
                          >
                            Lihat riwayat pemindaian sebelumnya ({attendanceLogs.length} total log) &rarr;
                          </button>
                        </div>
                      ) : (
                        'Belum ada riwayat pemindaian presensi.'
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedLogs.slice(0, 6).map((log, idx) => {
                    const emp = employees.find((e) => e.id === log.employee_id || e.full_name === log.employee_name);
                    const nip = emp?.nip || `NIP-2026${String(log.employee_id || 1).padStart(3, '0')}`;
                    const timeStr = log.scan_time ? log.scan_time.slice(11, 16) : '07:54';
                    const dateStr = log.log_date || (log.scan_time ? log.scan_time.slice(0, 10) : todayStr);
                    const isLate = log.status === 'late';

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* No Index */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        {/* Karyawan (Avatar + Name + NIP) */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                              {emp?.photo_url ? (
                                <img
                                  src={emp.photo_url}
                                  alt={log.employee_name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xs font-bold text-white font-mono">
                                  {log.employee_name?.charAt(0) || 'K'}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans">
                                {log.employee_name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-300">
                                {nip}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Divisi */}
                        <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-300 font-sans">
                          {log.division_name || emp?.division_name || 'Divisi Operasional & Proyek'}
                        </td>

                        {/* Jam Masuk / Waktu */}
                        <td className="py-3.5 px-3 font-mono">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{timeStr}</div>
                          {logFilterMode === 'all' && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-300 font-sans">{formatDateDDMMYYYY(dateStr)}</div>
                          )}
                        </td>

                        {/* Metode */}
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {log.method || 'NIP'}
                          </span>
                        </td>

                        {/* Status (Pill with dot matching Pict 1) */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isLate
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLate ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                            />
                            {isLate ? 'TERLAMBAT' : 'HADIR'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN (COL-SPAN-5 / COL-SPAN-4): PERSETUJUAN TERTUNDA & PERIODE PENGGAJIAN AKTIF */}
        <div className="xl:col-span-5 2xl:col-span-4 space-y-6 flex flex-col justify-between">
          {/* TOP CARD: PERSETUJUAN TERTUNDA (EXACT PICT 1 DESIGN, NEUTRAL BLACK BACKGROUND) */}
          <div className="rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] p-6 shadow-xl flex-1 flex flex-col">
            {/* Header with warning icon & refresh */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                  Persetujuan Tertunda ({totalPending})
                </h3>
              </div>

              <button
                onClick={onRefresh}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="Segarkan data persetujuan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of Pending Items */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {totalPending === 0 ? (
                <div className="py-10 text-center text-slate-500 dark:text-slate-300 text-xs font-mono">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 dark:text-emerald-400 mb-2 opacity-80" />
                  Semua pengajuan telah disetujui. Tidak ada pending.
                </div>
              ) : (
                <>
                  {/* Leaves */}
                  {pendingLeaves.map((leave) => {
                    const empName = leave.employee_name || employees.find((e) => e.id === leave.employee_id)?.full_name || 'Karyawan';
                    const leaveType = leave.leave_type_name || (leave.leave_type_id === 2 ? 'Izin Sakit' : 'Cuti');
                    return (
                      <div
                        key={`leave-${leave.id}`}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs truncate">
                            <span className="font-bold text-purple-600 dark:text-purple-400">{leaveType}:</span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">{empName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono mt-0.5">
                            {Number(leave.total_days)} hari &bull; {formatDateDDMMYYYY(leave.date_start)}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans truncate mt-0.5 italic">
                            {leave.reason || 'Keperluan keluarga'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canApprove && (
                            <button
                              onClick={() => onApproveLeave(leave.id, 'approved')}
                              className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-xs"
                            >
                              ✓ Setujui
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRequest({ type: 'leave', data: { ...leave, employee_name: empName, leave_type_name: leaveType } })}
                            className="px-3 py-1 rounded-full bg-slate-200 dark:bg-[#27272a] hover:bg-slate-300 dark:hover:bg-[#323238] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#3f3f46] text-[11px] font-medium transition-colors"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Overtimes */}
                  {pendingOvertimes.map((ot) => (
                    <div
                      key={`ot-${ot.id}`}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs truncate">
                          <span className="font-bold text-amber-600 dark:text-amber-400">Lembur:</span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">{ot.employee_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono mt-0.5">
                          {ot.total_hours} Jam &bull; {formatDateDDMMYYYY(ot.overtime_date)}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans truncate mt-0.5 italic">
                          {ot.reason || 'Pengawasan pengecoran'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canApprove && (
                          <button
                            onClick={() => onApproveOvertime(ot.id, 'approved')}
                            className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-xs"
                          >
                            ✓ Setujui
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRequest({ type: 'overtime', data: ot })}
                          className="px-3 py-1 rounded-full bg-slate-200 dark:bg-[#27272a] hover:bg-slate-300 dark:hover:bg-[#323238] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#3f3f46] text-[11px] font-medium transition-colors"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* BOTTOM CARD: PERIODE PENGGAJIAN AKTIF (NEUTRAL BLACK BACKGROUND MATCHING PICT 1) */}
          <div className="rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-sans">
                Periode Penggajian Aktif
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-amber-500 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 uppercase tracking-wider">
                DRAFT
              </span>
            </div>

            <div className="my-2">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
                Periode Agustus 2026
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1">
                Gaji Bersih Total: {formatRupiah(totalNetPay)}
              </p>
            </div>

            <button
              onClick={() => onNavigate('payroll')}
              className="mt-4 w-full py-3 px-4 rounded-2xl text-xs font-bold shadow-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
            >
              <span>Buka Wizard Penggajian</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. DETAIL MODAL FOR PENDING APPROVAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase font-mono ${
                    selectedRequest.type === 'leave'
                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                  }`}
                >
                  Detail {selectedRequest.type === 'leave' ? 'Cuti / Izin' : 'SPKL Lembur'}
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-600 dark:text-slate-300 block mb-0.5">Nama Karyawan:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedRequest.data.employee_name || employees.find((e) => e.id === selectedRequest.data.employee_id)?.full_name || 'Karyawan'}
                </span>
              </div>

              {selectedRequest.type === 'leave' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]">
                      <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Tipe Pengajuan</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {selectedRequest.data.leave_type_name || (selectedRequest.data.leave_type_id === 2 ? 'Izin Sakit' : 'Cuti Tahunan')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]">
                      <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Total Hari</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{Number(selectedRequest.data.total_days)} Hari</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-300 block mb-0.5">Rentang Tanggal:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {formatDateDDMMYYYY(selectedRequest.data.date_start)} s/d {formatDateDDMMYYYY(selectedRequest.data.date_end)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]">
                      <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Tanggal Lembur</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatDateDDMMYYYY(selectedRequest.data.overtime_date)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]">
                      <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Durasi</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedRequest.data.total_hours} Jam</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-300 block mb-0.5">Waktu Kerja Lembur:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {selectedRequest.data.time_start} - {selectedRequest.data.time_end} WIB
                    </span>
                  </div>
                </>
              )}

              <div>
                <span className="text-slate-600 dark:text-slate-300 block mb-0.5">Alasan / Keterangan:</span>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 italic">
                  "{selectedRequest.data.reason || 'Tidak ada catatan tambahan.'}"
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-end gap-2">
              {canApprove && (
                <>
                  <button
                    onClick={() => {
                      if (selectedRequest.type === 'leave') {
                        onApproveLeave(selectedRequest.data.id, 'rejected');
                      } else {
                        onApproveOvertime(selectedRequest.data.id, 'rejected');
                      }
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs"
                  >
                    Tolak
                  </button>
                  <button
                    onClick={() => {
                      if (selectedRequest.type === 'leave') {
                        onApproveLeave(selectedRequest.data.id, 'approved');
                      } else {
                        onApproveOvertime(selectedRequest.data.id, 'approved');
                      }
                      setSelectedRequest(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                  >
                    ✓ Setujui Pengajuan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPANDED LOG PRESENSI MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Semua Log Presensi Karyawan Hari Ini
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    Total {displayLogs.length} rekaman presensi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#27272a]">
                    <th className="w-12 py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">No</th>
                    <SortableTh sortKey="employee_name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="text-slate-600 dark:text-slate-300">Karyawan</SortableTh>
                    <SortableTh sortKey="division_name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="text-slate-600 dark:text-slate-300">Divisi</SortableTh>
                    <SortableTh sortKey="scan_time" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="text-slate-600 dark:text-slate-300">Jam Masuk</SortableTh>
                    <SortableTh sortKey="method" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="text-slate-600 dark:text-slate-300">Metode</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="text-slate-600 dark:text-slate-300">Status</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {sortedLogs.map((log, idx) => {
                    const emp = employees.find((e) => e.id === log.employee_id || e.full_name === log.employee_name);
                    const nip = emp?.nip || `NIP-2026${String(log.employee_id || 1).padStart(3, '0')}`;
                    const timeStr = log.scan_time ? log.scan_time.slice(11, 19) : '07:54:00';
                    const isLate = log.status === 'late';

                    return (
                      <tr key={`modal-${log.id}`} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#18181b] border border-slate-300 dark:border-[#27272a] flex items-center justify-center font-bold text-slate-800 dark:text-white text-xs">
                              {log.employee_name?.charAt(0) || 'K'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{log.employee_name}</div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-300">{nip}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">{log.division_name || 'Divisi Operasional'}</td>
                        <td className="py-3 px-3 text-xs font-bold text-slate-900 dark:text-white font-mono">{timeStr} WIB</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold uppercase">
                            {log.method || 'NIP'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isLate
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isLate ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {isLate ? 'TERLAMBAT' : 'HADIR'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-[#27272a] flex justify-end">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#323238] text-slate-800 dark:text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
