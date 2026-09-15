import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { SdmManagementView } from './views/SdmManagementView';
import { ScheduleManagementView } from './views/ScheduleManagementView';
import { AttendanceCalendarView } from './views/AttendanceCalendarView';
import { RequestManagementView } from './views/RequestManagementView';
import { KioskTerminalView } from './views/KioskTerminalView';
import { PayrollManagementView } from './views/PayrollManagementView';
import { SystemDbConfigView } from './views/SystemDbConfigView';
import { AppConfigView } from './views/AppConfigView';
import { ManualOperationView } from './views/ManualOperationView';
import { OfficialLettersView } from './views/OfficialLettersView';
import { AiAssistantView } from './views/AiAssistantView';
import { FloatingDbConfigLog } from './components/FloatingDbConfigLog';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { toast } from './lib/toast';
import { getCompanyInitials } from './lib/companyUtils';
import { api } from './lib/api';
import {
  User,
  CompanyProfile,
  Employee,
  Division,
  JobGrade,
  WorkSchedule,
  SchedulePlot,
  Holiday,
  AttendanceLog,
  LeaveRequest,
  OvertimeRequest,
  OvertimeRule,
  DeductionRule,
  AllowanceRule,
  PayrollSlip,
  DatabaseConfig,
  CompanyLocation,
} from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nku_theme_mode');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [dbConfigSubTab, setDbConfigSubTab] = useState<'db_connection' | 'table_explorer' | 'company' | 'holidays' | 'user_management'>('db_connection');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nku_is_authenticated') === 'true';
    }
    return false;
  });

  // Handle dark mode class and colorScheme on html tag & sync to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
      try {
        localStorage.setItem('nku_theme_mode', 'dark');
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      try {
        localStorage.setItem('nku_theme_mode', 'light');
      } catch (e) {}
    }
  }, [isDarkMode]);

  // Application State
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    username: 'superadmin',
    email: 'admin@nku.co.id',
    role_key: 'super_admin',
    role_name: 'Super Admin',
    employee_name: 'Ir. Hendra Wijaya',
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<CompanyProfile>({
    id: 1,
    company_name: 'PT. NINDYA KRIDA UTAMA',
    color_palette: '#F59E0B',
    email: 'info@nku.co.id',
  });
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [jobGrades, setJobGrades] = useState<JobGrade[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [schedulePlots, setSchedulePlots] = useState<SchedulePlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([]);
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [allowanceRules, setAllowanceRules] = useState<AllowanceRule[]>([]);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>([]);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: 'mysql-ais-nku-aivencloud.com',
    port: 14389,
    user: 'avnadmin',
    password: '',
    database: 'defaultdb',
    ssl_mode: 'REQUIRED',
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const res = await api.getBootstrap();
      if (res.success && res.data) {
        const d = res.data;
        if (d.companies && Array.isArray(d.companies)) setCompanies(d.companies);
        if (d.company) setCompany(d.company);
        if (d.currentUser) setCurrentUser(d.currentUser);
        if (d.users) setAllUsers(d.users);
        const rawDivisions = d.divisions || [];
        const rawJobGrades = d.jobGrades || [];
        if (d.divisions) setDivisions(rawDivisions);
        if (d.jobGrades) setJobGrades(rawJobGrades);

        const enrichedEmployees = (d.employees || []).map((e: any) => {
          const foundDiv = rawDivisions.find((div: any) => Number(div.id) === Number(e.division_id));
          const foundGrade = rawJobGrades.find((gr: any) => Number(gr.id) === Number(e.job_grade_id));
          return {
            ...e,
            division_name: (e.division_name && e.division_name !== '-') ? e.division_name : (foundDiv?.division_name || '-'),
            job_grade_name: (e.job_grade_name && e.job_grade_name !== '-') ? e.job_grade_name : (foundGrade?.grade_name || '-'),
          };
        });
        setEmployees(enrichedEmployees);

        if (d.schedules) setSchedules(d.schedules);
        if (d.schedulePlots) {
          const rawScheds = d.schedules || [];
          const enrichedPlots = (d.schedulePlots || []).map((p: any) => {
            const sched = rawScheds.find((s: any) => Number(s.id) === Number(p.schedule_id));
            let scopeName = p.scope_name;
            if (!scopeName || scopeName === '-') {
              if (p.scope_type === 'general') {
                scopeName = 'Semua Karyawan (General)';
              } else if (p.scope_type === 'division') {
                const div = rawDivisions.find((divItem: any) => Number(divItem.id) === Number(p.scope_id));
                scopeName = div ? div.division_name : (p.scope_id ? `Divisi #${p.scope_id}` : 'Semua Divisi');
              } else if (p.scope_type === 'job_grade') {
                const gr = rawJobGrades.find((grItem: any) => Number(grItem.id) === Number(p.scope_id) || grItem.grade_code === String(p.scope_id) || grItem.grade_name === String(p.scope_id));
                scopeName = gr ? `${gr.grade_code ? `[${gr.grade_code}] ` : ''}${gr.grade_name}` : (p.scope_id ? `Golongan #${p.scope_id}` : 'Golongan');
              } else if (p.scope_type === 'employee') {
                const emp = enrichedEmployees.find((e: any) => Number(e.id) === Number(p.scope_id) || e.nip === String(p.scope_id));
                scopeName = emp ? `${emp.nip} - ${emp.full_name}` : (p.scope_id ? `Karyawan #${p.scope_id}` : 'Karyawan');
              }
            }
            return {
              ...p,
              schedule_name: p.schedule_name || sched?.schedule_name || `Jadwal #${p.schedule_id}`,
              scope_name: scopeName || '-',
            };
          });
          setSchedulePlots(enrichedPlots);
        }
        if (d.holidays && Array.isArray(d.holidays)) {
          setHolidays(
            d.holidays.map((h: any) => ({
              ...h,
              holiday_name: h.holiday_name || h.name || 'Hari Libur',
              name: h.name || h.holiday_name || 'Hari Libur',
              is_joint_leave: h.is_joint_leave !== undefined ? !!h.is_joint_leave : h.type === 'cuti_bersama',
            }))
          );
        }
        const rawLocations = d.locations || [];
        if (d.locations) setCompanyLocations(rawLocations);

        const enrichedLogs = (d.attendanceLogs || []).map((l: any) => {
          const emp = enrichedEmployees.find((e: any) => Number(e.id) === Number(l.employee_id));
          const foundDiv = emp ? rawDivisions.find((div: any) => Number(div.id) === Number(emp.division_id)) : null;
          const foundLoc = rawLocations.find((loc: any) => Number(loc.id) === Number(l.location_id));
          return {
            ...l,
            employee_name: (l.employee_name && l.employee_name !== 'Unknown') ? l.employee_name : (emp?.full_name || 'Unknown'),
            employee_nip: (l.employee_nip && l.employee_nip !== '-') ? l.employee_nip : (emp?.nip || '-'),
            division_name: (l.division_name && l.division_name !== '-') ? l.division_name : (foundDiv?.division_name || emp?.division_name || '-'),
            location_name: (l.location_name && l.location_name !== '-') ? l.location_name : (foundLoc?.location_name || (l.location_id ? `Lokasi #${l.location_id}` : null)),
          };
        });
        setAttendanceLogs(enrichedLogs);
        if (d.leaveRequests) setLeaveRequests(d.leaveRequests);
        if (d.overtimeRequests) setOvertimeRequests(d.overtimeRequests);
        if (d.overtimeRules) setOvertimeRules(d.overtimeRules);
        if (d.deductionRules) setDeductionRules(d.deductionRules);
        if (d.allowanceRules) setAllowanceRules(d.allowanceRules);
        if (d.payrollSlips) setPayrollSlips(d.payrollSlips);
        if (d.dbConfig) {
          const cachedCa = typeof window !== 'undefined' ? localStorage.getItem('nku_ca_certificate') || '' : '';
          setDbConfig({
            ...d.dbConfig,
            user: d.dbConfig.user || d.dbConfig.username || '',
            username: d.dbConfig.username || d.dbConfig.user || '',
            password: d.dbConfig.password || d.dbConfig.password_plain || '',
            password_plain: d.dbConfig.password_plain || d.dbConfig.password || '',
            database: d.dbConfig.database || d.dbConfig.database_name || '',
            database_name: d.dbConfig.database_name || d.dbConfig.database || '',
            ca_certificate: (d.dbConfig as any).ca_certificate || cachedCa || (d.dbConfig as any).ssl_ca_cert_name || '',
          });
          if ((d.dbConfig as any).ca_certificate && typeof window !== 'undefined') {
            try {
              localStorage.setItem('nku_ca_certificate', (d.dbConfig as any).ca_certificate);
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Color palette selection (debounced to avoid server rate limiting)
  const colorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectColor = (color: string) => {
    // 1. Instantly update UI and persist to localStorage
    setCompany((prev) => ({ ...prev, color_palette: color }));
    try {
      localStorage.setItem('nku_company_color', color);
    } catch {}

    // 2. Clear previous timeout to debounce rapid clicking
    if (colorUpdateTimeoutRef.current) {
      clearTimeout(colorUpdateTimeoutRef.current);
    }

    // 3. Debounce server request by 350ms
    colorUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.updateCompanyProfile({ color_palette: color });
        if (res && !res.success) {
          console.warn('Color palette server sync deferred due to rate limit');
        }
      } catch (err: any) {
        console.warn('Color palette sync note:', err?.message || err);
      }
    }, 350);
  };

  // User Switcher (Simulate role switch)
  const handleSwitchUser = (userId: number) => {
    const found = allUsers.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      // If kiosk role, automatically switch active tab to kiosk
      if (found.role_key === 'kiosk_device') {
        setActiveTab('kiosk');
      } else if (activeTab === 'db_config' && found.role_key !== 'super_admin') {
        setActiveTab('dashboard');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('nku_is_authenticated');
    } catch (e) {}
    toast.info('Sesi login telah diakhiri.');
  };

  // Handlers for SDM
  const handleAddEmployee = async (data: Partial<Employee>) => {
    const res = await api.createEmployee(data);
    if (res.data) setEmployees((prev) => [res.data, ...prev]);
    return res;
  };

  const handleUpdateEmployee = async (id: number, data: Partial<Employee>) => {
    const res = await api.updateEmployee(id, data);
    if (res.success && res.employee) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? res.employee : e)));
    }
    return res;
  };

  const handleDeleteEmployee = async (id: number) => {
    await api.deleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddDivision = async (data: Partial<Division>) => {
    const res = await api.createDivision(data);
    if (res.data) setDivisions((prev) => [...prev, res.data]);
    return res;
  };

  const handleUpdateDivision = async (id: number, data: Partial<Division>) => {
    const res = await api.updateDivision(id, data);
    if (res.success && res.division) {
      setDivisions((prev) => prev.map((d) => (d.id === id ? res.division : d)));
    }
    return res;
  };

  const handleDeleteDivision = async (id: number) => {
    await api.deleteDivision(id);
    setDivisions((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddJobGrade = async (data: Partial<JobGrade>) => {
    const res = await api.createJobGrade(data);
    if (res.data) setJobGrades((prev) => [...prev, res.data]);
    return res;
  };

  const handleUpdateJobGrade = async (id: number, data: Partial<JobGrade>) => {
    const res = await api.updateJobGrade(id, data);
    if (res.success && res.jobGrade) {
      setJobGrades((prev) => prev.map((g) => (g.id === id ? res.jobGrade : g)));
    }
    return res;
  };

  const handleDeleteJobGrade = async (id: number) => {
    await api.deleteJobGrade(id);
    setJobGrades((prev) => prev.filter((g) => g.id !== id));
  };

  // Handlers for Schedules
  const handleAddSchedule = async (data: Partial<WorkSchedule>) => {
    const res = await api.createSchedule(data);
    if (res.data) setSchedules((prev) => [...prev, res.data]);
    return res;
  };

  const handleUpdateSchedule = async (id: number, data: Partial<WorkSchedule>) => {
    const res = await api.updateSchedule(id, data);
    if (res.success && res.schedule) {
      setSchedules((prev) => prev.map((s) => (s.id === id ? res.schedule : s)));
    }
    return res;
  };

  const handleDeleteSchedule = async (id: number) => {
    const res = await api.deleteSchedule(id);
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setSchedulePlots((prev) => prev.filter((p) => p.schedule_id !== id));
    }
    return res;
  };

  const handleAddSchedulePlot = async (data: Partial<SchedulePlot>) => {
    const res = await api.createSchedulePlot(data);
    if (res.data) {
      setSchedulePlots((prev) => [...prev, res.data]);
    }
    // Also refresh schedule plots list from server/DB
    const freshPlots = await api.getSchedulePlots().catch(() => null);
    if (freshPlots && Array.isArray(freshPlots)) {
      setSchedulePlots(freshPlots);
    }
    return res;
  };

  const handleUpdateSchedulePlot = async (id: number, data: Partial<SchedulePlot>) => {
    const res = await api.updateSchedulePlot(id, data);
    if (res.success && res.plot) {
      setSchedulePlots((prev) => prev.map((p) => (p.id === id ? res.plot : p)));
    }
    const freshPlots = await api.getSchedulePlots().catch(() => null);
    if (freshPlots && Array.isArray(freshPlots)) {
      setSchedulePlots(freshPlots);
    }
    return res;
  };

  const handleDeleteSchedulePlot = async (id: number) => {
    const res = await api.deleteSchedulePlot(id);
    if (res.success) {
      setSchedulePlots((prev) => prev.filter((p) => p.id !== id));
    }
    const freshPlots = await api.getSchedulePlots().catch(() => null);
    if (freshPlots && Array.isArray(freshPlots)) {
      setSchedulePlots(freshPlots);
    }
    return res;
  };

  // Handlers for Requests
  const handleAddLeave = async (data: Partial<LeaveRequest>) => {
    const res = await api.createLeaveRequest(data);
    if (res.data) setLeaveRequests((prev) => [res.data, ...prev]);
    return res;
  };

  const handleUpdateLeave = async (id: number, data: Partial<LeaveRequest>) => {
    const res = await api.updateLeaveRequest(id, data);
    if (res.success && res.request) {
      setLeaveRequests((prev) => prev.map((l) => (l.id === id ? res.request! : l)));
    }
    return res;
  };

  const handleDeleteLeave = async (id: number) => {
    const res = await api.deleteLeaveRequest(id);
    if (res.success) {
      setLeaveRequests((prev) => prev.filter((l) => l.id !== id));
    }
    return res;
  };

  const handleApproveLeave = async (id: number, status: 'approved' | 'rejected') => {
    const approverId = currentUser?.id || 1;
    const res = await api.approveLeaveRequest(id, status, approverId);
    if (res.success && res.request) {
      setLeaveRequests((prev) => prev.map((l) => (l.id === id ? res.request! : l)));
    } else if (res.success) {
      setLeaveRequests((prev) => prev.map((l) => (l.id === id ? { ...l, status, approved_by: approverId } : l)));
    }
    return res;
  };

  const handleAddOvertime = async (data: any) => {
    const res = await api.createOvertimeRequest(data);
    if (res.requests && res.requests.length > 0) {
      setOvertimeRequests((prev) => [...res.requests, ...prev]);
    } else if (res.data) {
      setOvertimeRequests((prev) => [res.data, ...prev]);
    }
    return res;
  };

  const handleUpdateOvertime = async (id: number, data: Partial<OvertimeRequest>) => {
    const res = await api.updateOvertimeRequest(id, data);
    if (res.success && res.request) {
      setOvertimeRequests((prev) => prev.map((o) => (o.id === id ? res.request! : o)));
    }
    return res;
  };

  const handleDeleteOvertime = async (id: number) => {
    const target = overtimeRequests.find((o) => o.id === id);
    const res = await api.deleteOvertimeRequest(id);
    if (res.success) {
      if (target?.group_code) {
        setOvertimeRequests((prev) => prev.filter((o) => o.group_code !== target.group_code));
      } else {
        setOvertimeRequests((prev) => prev.filter((o) => o.id !== id));
      }
    }
    return res;
  };

  const handleApproveOvertime = async (id: number, status: 'approved' | 'rejected') => {
    const approverId = currentUser?.id || 1;
    const target = overtimeRequests.find((o) => o.id === id);
    const res = await api.approveOvertimeRequest(id, status, approverId);
    if (res.success) {
      if (target?.group_code) {
        setOvertimeRequests((prev) =>
          prev.map((o) => (o.group_code === target.group_code ? { ...o, status, approved_by: approverId } : o))
        );
      } else {
        setOvertimeRequests((prev) =>
          prev.map((o) => (o.id === id ? (res.request || { ...o, status, approved_by: approverId }) : o))
        );
      }
    }
    return res;
  };

  // Kiosk Attendance
  const handleRecordAttendance = async (data: {
    employee_id: number;
    log_type: 'clock_in' | 'clock_out';
    method: 'rfid' | 'qr' | 'manual' | 'nip_manual';
    notes?: string;
    log_date?: string;
    scan_time?: string;
  }) => {
    const res = await api.recordAttendance(data);
    if (res && res.data) {
      const incoming = res.data;
      const matchedEmp = employees.find((e) => Number(e.id) === Number(incoming.employee_id));
      const matchedDiv = matchedEmp ? divisions.find((d) => Number(d.id) === Number(matchedEmp.division_id)) : null;
      const enrichedIncoming = {
        ...incoming,
        employee_name: (incoming.employee_name && incoming.employee_name !== 'Unknown') ? incoming.employee_name : (matchedEmp?.full_name || 'Karyawan'),
        employee_nip: (incoming.employee_nip && incoming.employee_nip !== '-') ? incoming.employee_nip : (matchedEmp?.nip || '-'),
        division_name: (incoming.division_name && incoming.division_name !== '-') ? incoming.division_name : (matchedDiv?.division_name || matchedEmp?.division_name || '-'),
      };
      setAttendanceLogs((prev) => {
        const normIncoming = (String(enrichedIncoming.log_type) === 'clock_in' || enrichedIncoming.log_type === 'in') ? 'in' : 'out';
        const alreadyExists = prev.some((log) => {
          if (log.id && enrichedIncoming.id && log.id === enrichedIncoming.id) return true;
          const normLog = (String(log.log_type) === 'clock_in' || log.log_type === 'in') ? 'in' : 'out';
          return (
            Number(log.employee_id) === Number(enrichedIncoming.employee_id) &&
            (log.log_date === enrichedIncoming.log_date || (log.scan_time && enrichedIncoming.scan_time && log.scan_time.slice(0, 10) === enrichedIncoming.scan_time.slice(0, 10))) &&
            normLog === normIncoming
          );
        });
        if (alreadyExists) return prev;
        return [enrichedIncoming, ...prev];
      });
    }
    return res;
  };

  const handleRefreshLocations = useCallback(async () => {
    try {
      const res = await api.getLocations();
      if (res.success && res.data) {
        setCompanyLocations(res.data);
      }
    } catch (err) {
      console.error('Failed to reload locations:', err);
    }
  }, []);

  const handleCreateAttendanceLog = async (data: {
    employee_id: number;
    location_id?: number | null;
    log_date: string;
    scan_time: string;
    log_type: 'in' | 'out';
    method?: string;
    device_id?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_address?: string | null;
    is_mock_location?: boolean;
    status?: string;
    notes?: string;
  }) => {
    try {
      const res = await api.createAttendanceLog(data);
      if (res.success && res.data) {
        const enrichedIncoming = res.data as any;
        const matchedEmp = employees.find((e) => Number(e.id) === Number(enrichedIncoming.employee_id));
        const matchedDiv = matchedEmp ? divisions.find((d) => Number(d.id) === Number(matchedEmp.division_id)) : null;
        const matchedLoc = companyLocations.find((loc) => Number(loc.id) === Number(enrichedIncoming.location_id));
        const enriched = {
          ...enrichedIncoming,
          employee_name: (enrichedIncoming.employee_name && enrichedIncoming.employee_name !== 'Unknown') ? enrichedIncoming.employee_name : (matchedEmp?.full_name || 'Karyawan'),
          employee_nip: (enrichedIncoming.employee_nip && enrichedIncoming.employee_nip !== '-') ? enrichedIncoming.employee_nip : (matchedEmp?.nip || '-'),
          division_name: (enrichedIncoming.division_name && enrichedIncoming.division_name !== '-') ? enrichedIncoming.division_name : (matchedDiv?.division_name || matchedEmp?.division_name || '-'),
          location_name: (enrichedIncoming.location_name && enrichedIncoming.location_name !== '-') ? enrichedIncoming.location_name : (matchedLoc?.location_name || null),
        };
        setAttendanceLogs((prev) => [enriched, ...prev]);
      }
      return res;
    } catch (err) {
      console.error('Failed to create attendance log:', err);
      throw err;
    }
  };

  const handleUpdateAttendanceLog = async (id: number, data: Partial<AttendanceLog>) => {
    try {
      const res = await api.updateAttendanceLog(id, data);
      if (res.success) {
        const updated = res.log || data;
        setAttendanceLogs((prev) =>
          prev.map((log) => (log.id === id ? { ...log, ...updated } : log))
        );
      }
      return res;
    } catch (err) {
      console.error('Failed to update attendance log:', err);
      throw err;
    }
  };

  const handleDeleteAttendanceLog = async (id: number) => {
    try {
      const res = await api.deleteAttendanceLog(id);
      if (res.success) {
        setAttendanceLogs((prev) => prev.filter((log) => log.id !== id));
      }
      return res;
    } catch (err) {
      console.error('Failed to delete attendance log:', err);
      throw err;
    }
  };

  // Payroll
  const handleGeneratePayroll = async (data: any) => {
    const res = await api.generatePayrollSlip(data);
    if (res.data) {
      setPayrollSlips((prev) => [res.data, ...prev]);
    }
    return res;
  };

  const handleUpdatePayrollSlip = async (id: number, data: Partial<PayrollSlip>) => {
    const res = await api.updatePayrollSlip(id, data);
    if (res.success && res.slip) {
      setPayrollSlips((prev) => prev.map((s) => (s.id === id ? res.slip! : s)));
    }
    return res;
  };

  const handleDeletePayrollSlip = async (id: number) => {
    const res = await api.deletePayrollSlip(id);
    if (res.success) {
      setPayrollSlips((prev) => prev.filter((s) => s.id !== id));
    }
    return res;
  };

  const handleAddOvertimeRule = async (data: Partial<OvertimeRule>) => {
    const res = await api.createOvertimeRule(data);
    if (res.data) setOvertimeRules((prev) => [...prev, res.data as OvertimeRule]);
    return res;
  };

  const handleUpdateOvertimeRule = async (id: number, data: Partial<OvertimeRule>) => {
    const res = await api.updateOvertimeRule(id, data);
    if (res.success && res.rule) {
      setOvertimeRules((prev) => prev.map((r) => (r.id === id ? res.rule! : r)));
    }
    return res;
  };

  const handleDeleteOvertimeRule = async (id: number) => {
    const res = await api.deleteOvertimeRule(id);
    if (res.success) {
      setOvertimeRules((prev) => prev.filter((r) => r.id !== id));
    }
    return res;
  };

  const handleAddDeductionRule = async (data: Partial<DeductionRule>) => {
    const res = await api.createDeductionRule(data);
    if (res.data) setDeductionRules((prev) => [...prev, res.data as DeductionRule]);
    return res;
  };

  const handleUpdateDeductionRule = async (id: number, data: Partial<DeductionRule>) => {
    const res = await api.updateDeductionRule(id, data);
    if (res.success && res.rule) {
      setDeductionRules((prev) => prev.map((r) => (r.id === id ? res.rule! : r)));
    }
    return res;
  };

  const handleDeleteDeductionRule = async (id: number) => {
    const res = await api.deleteDeductionRule(id);
    if (res.success) {
      setDeductionRules((prev) => prev.filter((r) => r.id !== id));
    }
    return res;
  };

  const handleAddAllowanceRule = async (data: Partial<AllowanceRule>) => {
    const res = await api.createAllowanceRule(data);
    if (res.data) setAllowanceRules((prev) => [...prev, res.data as AllowanceRule]);
    return res;
  };

  const handleUpdateAllowanceRule = async (id: number, data: Partial<AllowanceRule>) => {
    const res = await api.updateAllowanceRule(id, data);
    if (res.success && res.rule) {
      setAllowanceRules((prev) => prev.map((r) => (r.id === id ? res.rule! : r)));
    }
    return res;
  };

  const handleDeleteAllowanceRule = async (id: number) => {
    const res = await api.deleteAllowanceRule(id);
    if (res.success) {
      setAllowanceRules((prev) => prev.filter((r) => r.id !== id));
    }
    return res;
  };

  // Multi-Company Handlers
  const handleSelectCompany = async (companyId: number) => {
    try {
      const res = await api.selectCompany(companyId);
      if (res.success && res.activeCompany) {
        setCompany(res.activeCompany);
        if (res.companies) {
          setCompanies(res.companies);
        } else {
          setCompanies((prev) =>
            prev.map((c) => (c.id === companyId ? { ...c, ...res.activeCompany } : c))
          );
        }
      }
      return res;
    } catch (err) {
      console.error('Failed to select company:', err);
      throw err;
    }
  };

  const handleAddCompany = async (data: Partial<CompanyProfile>) => {
    try {
      const res = await api.addCompany(data);
      if (res.success && res.company) {
        if (res.companies) {
          setCompanies(res.companies);
        } else {
          setCompanies((prev) => [...prev, res.company]);
        }
        if (!company.id || companies.length === 0) {
          setCompany(res.company);
        }
      }
      return res;
    } catch (err) {
      console.error('Failed to add company:', err);
      throw err;
    }
  };

  const handleUpdateCompany = async (
    idOrData: number | Partial<CompanyProfile>,
    dataOrId?: Partial<CompanyProfile> | number
  ) => {
    let targetId: number = company.id || 1;
    let payload: Partial<CompanyProfile> = {};

    if (typeof idOrData === 'number') {
      targetId = idOrData;
      payload = (dataOrId as Partial<CompanyProfile>) || {};
    } else if (typeof dataOrId === 'number') {
      targetId = dataOrId;
      payload = (idOrData as Partial<CompanyProfile>) || {};
    } else if (typeof idOrData === 'object' && idOrData !== null) {
      payload = idOrData;
      targetId = payload.id || company.id || 1;
    }

    try {
      const res = await api.updateCompany(targetId, payload);
      if (res.success) {
        if (res.companies) {
          setCompanies(res.companies);
        } else if (res.company) {
          setCompanies((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, ...res.company } : c))
          );
        }
        if (res.activeCompany && company.id === targetId) {
          setCompany(res.activeCompany);
        } else if (res.company && company.id === targetId) {
          setCompany((prev) => ({ ...prev, ...res.company }));
        }
      }
      return res;
    } catch (err) {
      console.error('Failed to update company:', err);
      throw err;
    }
  };

  const handleDeleteCompany = async (id: number) => {
    try {
      const res = await api.deleteCompany(id);
      if (res.success) {
        if (res.companies) {
          setCompanies(res.companies);
        } else {
          setCompanies((prev) => prev.filter((c) => c.id !== id));
        }
        if (res.activeCompany) {
          setCompany(res.activeCompany);
        }
      }
      return res;
    } catch (err) {
      console.error('Failed to delete company:', err);
      throw err;
    }
  };

  const handleUploadLogo = async (imageBase64: string, companyId?: number) => {
    try {
      const targetId = companyId || company.id;
      const res = await api.uploadLogo(imageBase64, targetId);
      if (res.success) {
        const logoUrl = res.url;
        if (res.companies) {
          setCompanies(res.companies);
        } else {
          setCompanies((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, logo_url: logoUrl } : c))
          );
        }
        if (res.activeCompany && company.id === targetId) {
          setCompany(res.activeCompany);
        } else if (company.id === targetId) {
          setCompany((prev) => ({ ...prev, logo_url: logoUrl }));
        }
      }
      return res;
    } catch (err) {
      console.error('Failed to upload logo:', err);
      throw err;
    }
  };

  const handleAddHoliday = async (data: Partial<Holiday>) => {
    const res = await api.createHoliday(data);
    if (res.data) {
      const h = res.data;
      const formatted: Holiday = {
        ...h,
        holiday_name: h.holiday_name || (h as any).name || data.holiday_name || (data as any).name || 'Hari Libur',
        name: (h as any).name || h.holiday_name || (data as any).name || data.holiday_name || 'Hari Libur',
        is_joint_leave: h.is_joint_leave !== undefined ? !!h.is_joint_leave : ((h as any).type === 'cuti_bersama' || !!data.is_joint_leave),
      };
      setHolidays((prev) => [...prev, formatted]);
    }
    return res;
  };

  const handleDeleteHoliday = async (id: number) => {
    await api.deleteHoliday(id);
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdateHoliday = async (id: number, data: Partial<Holiday>) => {
    const updated = await api.updateHoliday(id, data);
    if (updated) {
      const formatted: Holiday = {
        ...updated,
        holiday_name: updated.holiday_name || (updated as any).name || data.holiday_name || 'Hari Libur',
        name: (updated as any).name || updated.holiday_name || data.holiday_name || 'Hari Libur',
        is_joint_leave: updated.is_joint_leave !== undefined ? !!updated.is_joint_leave : ((updated as any).type === 'cuti_bersama' || !!data.is_joint_leave),
      };
      setHolidays((prev) => prev.map((h) => (h.id === id ? formatted : h)));
    }
  };

  const handleSyncHolidays = async (targetYear?: number) => {
    const res = await api.syncHolidaysFromInternet(targetYear);
    if (res.success && Array.isArray(res.holidays)) {
      setHolidays(
        res.holidays.map((h: any) => ({
          id: h.id,
          holiday_date: h.holiday_date,
          holiday_name: h.name || h.holiday_name,
          is_joint_leave: !!(h.is_joint_leave || h.type === 'cuti_bersama'),
        }))
      );
    }
    return res;
  };

  const handleSaveDbConfig = async (data: Partial<DatabaseConfig>) => {
    const res = await api.saveDatabaseConfig(data);
    if (res.data) setDbConfig(res.data);
    if (data.ca_certificate && typeof window !== 'undefined') {
      try {
        localStorage.setItem('nku_ca_certificate', data.ca_certificate);
      } catch {}
    }
    return res;
  };

  const handleTestDbConnection = async (data: Partial<DatabaseConfig>) => {
    return await api.testDatabaseConnection(data);
  };

  const handleInitDbSchema = async () => {
    const res = await api.initDatabaseSchema();
    await loadData(); // refresh app state after seeding
    return res;
  };

  const handleSyncPull = async () => {
    const res = await api.syncDbPull();
    if (res.success) {
      await loadData();
    }
    return res;
  };

  const handleSyncPush = async () => {
    return await api.syncDbPush();
  };

  const handleGetDdl = async () => {
    return await api.getDbDdl();
  };

  const handleFetchTableData = async (tableName: string) => {
    return await api.getTableData(tableName);
  };

  const handleAddUser = async (data: Partial<User>) => {
    const res = await api.createUser(data);
    if (res?.success) {
      loadData();
    }
    return res;
  };

  const handleUpdateUser = async (id: number, data: Partial<User>) => {
    const res = await api.updateUser(id, data);
    if (res?.success) {
      loadData();
    }
    return res;
  };

  const handleDeleteUser = async (id: number) => {
    const res = await api.deleteUser(id);
    if (res?.success) {
      loadData();
    }
    return res;
  };

  const handleResetOperatingData = async () => {
    const res = await api.resetOperatingData();
    if (res?.success) {
      loadData();
    }
    return res;
  };

  const accentColor = company.color_palette || '#F59E0B';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-white">
          Memuat Sistem Manajemen Proyek {company?.company_name || 'PT. NINDYA KRIDA UTAMA'}...
        </p>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Menghubungkan ke backend dan basis data MySQL
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        company={company}
        users={allUsers}
        accentColor={accentColor}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('nku_is_authenticated', 'true');
            localStorage.setItem('nku_user_id', String(user.id));
          } catch (e) {}
          if (user.role_key === 'kiosk_device') {
            setActiveTab('kiosk');
          } else {
            setActiveTab('dashboard');
          }
        }}
        onSelectKiosk={() => {
          const kiosk = allUsers.find((u) => u.role_key === 'kiosk_device') || {
            id: 99,
            username: 'kiosk_terminal',
            email: 'kiosk@nku.co.id',
            role_key: 'kiosk_device',
            role_name: 'Kiosk Device',
            employee_name: 'Terminal Presensi Lapangan',
            is_active: true,
          };
          setCurrentUser(kiosk as User);
          setIsAuthenticated(true);
          setActiveTab('kiosk');
        }}
      />
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-slate-100 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-100 font-sans transition-colors overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* App Top Header */}
      <Header
        company={company}
        companies={companies}
        currentUser={currentUser}
        allUsers={allUsers}
        isDarkMode={isDarkMode}
        dbConnected={dbConfig.is_connected ?? true}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onSelectColor={handleSelectColor}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onSelectCompany={handleSelectCompany}
        onUpdateCompany={handleUpdateCompany}
        onAddCompany={handleAddCompany}
        onDeleteCompany={handleDeleteCompany}
        onUploadLogo={handleUploadLogo}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Sidebar - Hidden only for dedicated kiosk_device role */}
        {currentUser.role_key !== 'kiosk_device' && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            userRole={currentUser.role_key}
            accentColor={accentColor}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto max-w-full min-h-0 ${activeTab === 'kiosk' ? 'p-2 sm:p-4' : 'p-4 sm:p-6 lg:p-8'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              employees={employees}
              attendanceLogs={attendanceLogs}
              leaveRequests={leaveRequests}
              overtimeRequests={overtimeRequests}
              payrollSlips={payrollSlips}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              onNavigate={setActiveTab}
              onApproveLeave={handleApproveLeave}
              onApproveOvertime={handleApproveOvertime}
              onRefresh={loadData}
            />
          )}

          {(activeTab === 'sdm' || activeTab === 'idcard_review') && (
            <SdmManagementView
              employees={employees}
              divisions={divisions}
              jobGrades={jobGrades}
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              initialSubTab={activeTab === 'idcard_review' ? 'idcard_review' : 'employees'}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onAddDivision={handleAddDivision}
              onUpdateDivision={handleUpdateDivision}
              onDeleteDivision={handleDeleteDivision}
              onAddJobGrade={handleAddJobGrade}
              onUpdateJobGrade={handleUpdateJobGrade}
              onDeleteJobGrade={handleDeleteJobGrade}
            />
          )}

          {activeTab === 'schedules' && (
            <ScheduleManagementView
              currentUser={currentUser}
              schedules={schedules}
              schedulePlots={schedulePlots}
              divisions={divisions}
              jobGrades={jobGrades}
              employees={employees}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              onAddSchedule={handleAddSchedule}
              onUpdateSchedule={handleUpdateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onAddSchedulePlot={handleAddSchedulePlot}
              onUpdateSchedulePlot={handleUpdateSchedulePlot}
              onDeleteSchedulePlot={handleDeleteSchedulePlot}
              onRefreshData={loadData}
            />
          )}

          {activeTab === 'calendar' && (
            <AttendanceCalendarView
              employees={employees}
              divisions={divisions}
              jobGrades={jobGrades}
              attendanceLogs={attendanceLogs}
              leaveRequests={leaveRequests}
              overtimeRequests={overtimeRequests}
              holidays={holidays}
              schedules={schedules}
              schedulePlots={schedulePlots}
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              onUpdateAttendanceLog={handleUpdateAttendanceLog}
              onDeleteAttendanceLog={handleDeleteAttendanceLog}
              onSyncHolidays={handleSyncHolidays}
              onRefreshData={loadData}
              onAddAttendanceLog={handleCreateAttendanceLog}
              locations={companyLocations}
              onRefreshLocations={handleRefreshLocations}
            />
          )}

          {activeTab === 'requests' && (
            <RequestManagementView
              currentUser={currentUser}
              employees={employees}
              divisions={divisions}
              leaveRequests={leaveRequests}
              overtimeRequests={overtimeRequests}
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              onAddLeave={handleAddLeave}
              onUpdateLeave={handleUpdateLeave}
              onDeleteLeave={handleDeleteLeave}
              onApproveLeave={handleApproveLeave}
              onAddOvertime={handleAddOvertime}
              onUpdateOvertime={handleUpdateOvertime}
              onDeleteOvertime={handleDeleteOvertime}
              onApproveOvertime={handleApproveOvertime}
            />
          )}

          {activeTab === 'official_letters' && (
            <OfficialLettersView
              currentUser={currentUser}
              employees={employees}
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
            />
          )}

          {activeTab === 'kiosk' && (
            <KioskTerminalView
              currentUser={currentUser}
              employees={employees}
              attendanceLogs={attendanceLogs}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              onRecordAttendance={handleRecordAttendance}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollManagementView
              divisions={divisions}
              jobGrades={jobGrades}
              employees={employees}
              payrollSlips={payrollSlips}
              overtimeRules={overtimeRules}
              deductionRules={deductionRules}
              allowanceRules={allowanceRules}
              attendanceLogs={attendanceLogs}
              overtimeRequests={overtimeRequests}
              schedules={schedules}
              schedulePlots={schedulePlots}
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              companyProfile={company}
              onGeneratePayroll={handleGeneratePayroll}
              onUpdatePayrollSlip={handleUpdatePayrollSlip}
              onDeletePayrollSlip={handleDeletePayrollSlip}
              onAddOvertimeRule={handleAddOvertimeRule}
              onUpdateOvertimeRule={handleUpdateOvertimeRule}
              onDeleteOvertimeRule={handleDeleteOvertimeRule}
              onAddDeductionRule={handleAddDeductionRule}
              onUpdateDeductionRule={handleUpdateDeductionRule}
              onDeleteDeductionRule={handleDeleteDeductionRule}
              onAddAllowanceRule={handleAddAllowanceRule}
              onUpdateAllowanceRule={handleUpdateAllowanceRule}
              onDeleteAllowanceRule={handleDeleteAllowanceRule}
            />
          )}


          {activeTab === 'app_config' && (
            <AppConfigView
              company={company}
              companies={companies}
              holidays={holidays}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              currentUserRole={currentUser.role_key}
              onUpdateCompany={handleUpdateCompany}
              onSelectCompany={handleSelectCompany}
              onAddCompany={handleAddCompany}
              onDeleteCompany={handleDeleteCompany}
              onUploadLogo={handleUploadLogo}
              onAddHoliday={handleAddHoliday}
              onUpdateHoliday={handleUpdateHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              onSyncHolidays={handleSyncHolidays}
            />
          )}

          {activeTab === 'db_config' && currentUser.role_key === 'super_admin' && (
            <SystemDbConfigView
              initialSubTab={dbConfigSubTab === 'company' || dbConfigSubTab === 'holidays' ? 'db_connection' : dbConfigSubTab}
              company={company}
              companies={companies}
              holidays={holidays}
              users={allUsers}
              employees={employees}
              dbConfig={dbConfig}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              onUpdateCompany={handleUpdateCompany}
              onSelectCompany={handleSelectCompany}
              onAddCompany={handleAddCompany}
              onDeleteCompany={handleDeleteCompany}
              onUploadLogo={handleUploadLogo}
              onAddHoliday={handleAddHoliday}
              onUpdateHoliday={handleUpdateHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              onSyncHolidays={handleSyncHolidays}
              onSaveDbConfig={handleSaveDbConfig}
              onTestDbConnection={handleTestDbConnection}
              onInitDbSchema={handleInitDbSchema}
              onSyncPull={handleSyncPull}
              onSyncPush={handleSyncPush}
              onGetDdl={handleGetDdl}
              onFetchTableData={handleFetchTableData}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onResetOperatingData={handleResetOperatingData}
            />
          )}

          {activeTab === 'manual' && (
            <ManualOperationView
              accentColor={accentColor}
              companyName={company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              onNavigate={setActiveTab}
              currentUserRole={currentUser?.role_key}
            />
          )}

          {activeTab === 'ai_assistant' && (
            <AiAssistantView
              company={company}
              accentColor={accentColor}
              isDarkMode={isDarkMode}
              onNavigate={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* Floating Database Configuration & Sync Log Widget */}
      <FloatingDbConfigLog
        dbConfig={dbConfig}
        onNavigateToDbConfig={(subTab) => {
          setActiveTab('db_config');
          setDbConfigSubTab(subTab || 'db_connection');
        }}
        accentColor={accentColor}
        currentUserRole={currentUser.role_key}
      />

      {/* Operational Footer - Adaptive Light & Dark */}
      <footer className="h-10 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0F0F0F] flex items-center justify-between px-6 sm:px-8 text-[10px] uppercase font-bold tracking-widest text-slate-600 dark:text-slate-500 shrink-0">
        <div className="tracking-wider font-mono">
          &copy; {new Date().getFullYear()} {getCompanyInitials(company?.company_name)} HR SERVICES PORTAL
        </div>
      </footer>

      {/* Google Authentication & Dual Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={allUsers}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role_key === 'kiosk_device') {
            setActiveTab('kiosk');
          }
        }}
        onSelectKiosk={() => {
          const kiosk = allUsers.find((u) => u.role_key === 'kiosk_device');
          if (kiosk) setCurrentUser(kiosk);
          setActiveTab('kiosk');
        }}
      />
    </div>
  );
}
