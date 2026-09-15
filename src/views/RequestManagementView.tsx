import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  FileText,
  Clock,
  Plus,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Briefcase,
  User,
  X,
  RotateCcw,
  Upload,
  ShieldCheck,
  HelpCircle,
  Info,
  Sparkles,
  Settings,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { DateInput } from '../components/DateInput';
import { TimeInput } from '../components/TimeInput';
import { LeaveRequest, OvertimeRequest, Employee, User as UserType, CompanyProfile, LeaveBalance, Division } from '../types';
import { exportToExcel, exportToPdfPrint } from '../lib/exportUtils';
import { getCompanyInitials, getContrastTextColorStyle } from '../lib/companyUtils';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY, formatTimeHHMM } from '../lib/formatUtils';
import { ExportDropdown } from '../components/ExportDropdown';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

interface RequestManagementViewProps {
  currentUser: UserType;
  employees: Employee[];
  divisions?: Division[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  accentColor: string;
  companyName?: string;
  companyProfile?: CompanyProfile;
  onAddLeave: (data: Partial<LeaveRequest>) => Promise<any>;
  onUpdateLeave?: (id: number, data: Partial<LeaveRequest>) => Promise<any>;
  onDeleteLeave?: (id: number) => Promise<any>;
  onApproveLeave: (id: number, status: 'approved' | 'rejected') => Promise<any>;
  onAddOvertime: (data: Partial<OvertimeRequest>) => Promise<any>;
  onUpdateOvertime?: (id: number, data: Partial<OvertimeRequest>) => Promise<any>;
  onDeleteOvertime?: (id: number) => Promise<any>;
  onApproveOvertime: (id: number, status: 'approved' | 'rejected') => Promise<any>;
}

export const RequestManagementView: React.FC<RequestManagementViewProps> = ({
  currentUser,
  employees,
  divisions = [],
  leaveRequests,
  overtimeRequests,
  accentColor,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  companyProfile,
  onAddLeave,
  onUpdateLeave,
  onDeleteLeave,
  onApproveLeave,
  onAddOvertime,
  onUpdateOvertime,
  onDeleteOvertime,
  onApproveOvertime,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'leave' | 'sick' | 'overtime' | 'quota'>('leave');
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<string>('all');
  const [leaveFilterCreatedDate, setLeaveFilterCreatedDate] = useState<string>('all');
  const [leaveSpecificCreatedDate, setLeaveSpecificCreatedDate] = useState<string>('');

  const [sickFilterStatus, setSickFilterStatus] = useState<string>('all');
  const [sickFilterCreatedDate, setSickFilterCreatedDate] = useState<string>('all');
  const [sickSpecificCreatedDate, setSickSpecificCreatedDate] = useState<string>('');

  const [otFilterStatus, setOtFilterStatus] = useState<string>('all');
  const [otFilterCreatedDate, setOtFilterCreatedDate] = useState<string>('all');
  const [otSpecificCreatedDate, setOtSpecificCreatedDate] = useState<string>('');

  // Leave Balances & Quota Management State
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [quotaSearch, setQuotaSearch] = useState('');
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedBalanceForEdit, setSelectedBalanceForEdit] = useState<LeaveBalance | null>(null);
  const [quotaEditValue, setQuotaEditValue] = useState<number>(12);
  const [quotaEditYear, setQuotaEditYear] = useState<number>(new Date().getFullYear());
  const [quotaSelectedEmpId, setQuotaSelectedEmpId] = useState<number>(employees[0]?.id || 1);
  const [isBulkSetting, setIsBulkSetting] = useState(false);
  const [quotaSortKey, setQuotaSortKey] = useState<string | null>('employee_name');
  const [quotaSortDir, setQuotaSortDir] = useState<SortDirection>('asc');

  // Editing items state
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [editingOvertime, setEditingOvertime] = useState<OvertimeRequest | null>(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isSubmittingOvertime, setIsSubmittingOvertime] = useState(false);
  const [isSubmittingQuota, setIsSubmittingQuota] = useState(false);

  // Table Sync State
  const [isSyncingTable, setIsSyncingTable] = useState<string | null>(null);
  const handleSyncTable = async (tableName: string) => {
    setIsSyncingTable(tableName);
    try {
      const res = await api.syncTable(tableName);
      toast.success('Sync Berhasil', res.message || `Tabel ${tableName} berhasil disinkronkan (${res.rowCount || 0} baris)`);
      if (tableName === 'leave_balances') {
        await loadLeaveBalances();
      }
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || `Gagal sinkronisasi ${tableName}`);
    } finally {
      setIsSyncingTable(null);
    }
  };

  const loadLeaveBalances = async () => {
    setIsLoadingBalances(true);
    try {
      const data = await api.getLeaveBalances();
      if (Array.isArray(data)) {
        setLeaveBalances(data);
      }
    } catch (err) {
      console.error('Failed to load leave balances', err);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    loadLeaveBalances();
  }, [leaveRequests, activeSubTab]);

  const handleApproveLeave = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const res = await onApproveLeave(id, status);
      await loadLeaveBalances();
      if (res?.success) {
        toast.success(
          status === 'approved' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak',
          `Pengajuan #${id} telah di-${status === 'approved' ? 'setujui dan kuota cuti otomatis diperbarui' : 'tolak'}.`
        );
      }
      return res;
    } catch (err: any) {
      toast.error('Gagal Approval', err.message || 'Terjadi kesalahan');
    }
  };

  const handleSyncLeaveBalances = async () => {
    setIsSyncingBalances(true);
    try {
      const res = await api.syncLeaveBalances();
      if (res.success) {
        await loadLeaveBalances();
        toast.db('Sinkronisasi Saldo Cuti Berhasil', res.message || `${res.count} data saldo cuti karyawan tersinkron ke basis data.`);
      } else {
        toast.error('Gagal Sinkronisasi Saldo Cuti', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Sinkronisasi', err.message);
    } finally {
      setIsSyncingBalances(false);
    }
  };

  const handleOpenEditQuota = (balance: LeaveBalance) => {
    setSelectedBalanceForEdit(balance);
    setIsBulkSetting(false);
    setQuotaSelectedEmpId(balance.employee_id);
    setQuotaEditValue(balance.quota_days);
    setQuotaEditYear(balance.year || new Date().getFullYear());
    setShowQuotaModal(true);
  };

  const handleOpenNewQuota = () => {
    setSelectedBalanceForEdit(null);
    setIsBulkSetting(false);
    setQuotaSelectedEmpId(employees[0]?.id || 1);
    setQuotaEditValue(12);
    setQuotaEditYear(new Date().getFullYear());
    setShowQuotaModal(true);
  };

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingQuota) return;
    setIsSubmittingQuota(true);
    try {
      if (isBulkSetting) {
        const res = await api.bulkSetLeaveQuota({
          quota_days: Number(quotaEditValue),
          year: Number(quotaEditYear),
        });
        if (res.success) {
          await loadLeaveBalances();
          setShowQuotaModal(false);
          setSelectedBalanceForEdit(null);
          setIsBulkSetting(false);
          toast.success('Berhasil Mengatur Kuota Massal', res.message || `Kuota ${quotaEditValue} hari berhasil diterapkan untuk SEMUA karyawan!`);
        } else {
          toast.error('Gagal Menyimpan Kuota Massal', res.message || 'Gagal menyimpan kuota cuti untuk semua karyawan');
        }
      } else {
        const empId = selectedBalanceForEdit ? selectedBalanceForEdit.employee_id : quotaSelectedEmpId;
        const res = await api.setLeaveQuota({
          employee_id: empId,
          leave_type_id: 1, // Annual Leave
          quota_days: Number(quotaEditValue),
          year: Number(quotaEditYear),
        });
        if (res.success) {
          await loadLeaveBalances();
          setShowQuotaModal(false);
          setSelectedBalanceForEdit(null);
          toast.success('Berhasil Mengatur Kuota', res.message || 'Kuota cuti berhasil disimpan ke database.');
        } else {
          toast.error('Gagal Menyimpan Kuota', res.message || 'Gagal menyimpan kuota cuti');
        }
      }
    } catch (err: any) {
      toast.error('Gagal', err.message);
    } finally {
      setIsSubmittingQuota(false);
    }
  };

  const handleBulkSetStandardQuota = async () => {
    if (!window.confirm('Terapkan kuota standar 12 hari cuti tahunan (sesuai UU No. 13/2003) untuk SEMUA karyawan?')) return;
    setIsBulkSetting(true);
    try {
      const res = await api.bulkSetLeaveQuota({ quota_days: 12, year: new Date().getFullYear() });
      if (res.success) {
        await loadLeaveBalances();
        toast.success('Set Kuota Massal Berhasil', res.message || 'Berhasil menetapkan kuota 12 hari untuk seluruh karyawan!');
      }
    } catch (err: any) {
      toast.error('Gagal Set Massal', err.message);
    } finally {
      setIsBulkSetting(false);
    }
  };

  // Delete Confirmation State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'leave' | 'overtime';
    id: number;
    name: string;
    detail: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmTarget.type === 'leave') {
        if (onDeleteLeave) {
          const res = await onDeleteLeave(deleteConfirmTarget.id);
          if (res?.success) {
            toast.success('Berhasil Dihapus', 'Data pengajuan cuti/izin telah dihapus dari database.');
            loadLeaveBalances();
          } else {
            toast.error('Gagal Menghapus', res?.message || res?.error || 'Gagal menghapus data');
          }
        }
      } else if (deleteConfirmTarget.type === 'overtime') {
        if (onDeleteOvertime) {
          const res = await onDeleteOvertime(deleteConfirmTarget.id);
          if (res?.success) {
            toast.success('Berhasil Dihapus', 'Data SPKL lembur telah dihapus dari database.');
          } else {
            toast.error('Gagal Menghapus', res?.message || res?.error || 'Gagal menghapus data');
          }
        }
      }
      setDeleteConfirmTarget(null);
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message || 'Terjadi kesalahan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditLeave = (item: LeaveRequest) => {
    setEditingLeave(item);
    setLeaveForm({
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      employee_nip: item.employee_nip,
      division_name: item.division_name,
      leave_type_id: item.leave_type_id || (item.leave_type_name === 'Izin Sakit' ? 2 : 1),
      leave_type_name: item.leave_type_name || 'Cuti Tahunan',
      date_start: item.date_start,
      date_end: item.date_end,
      total_days: item.total_days,
      reason: item.reason,
      attachment_url: item.attachment_url || '',
    });
    setShowLeaveModal(true);
  };

  const handleOpenEditOvertime = (otGroupItem: any) => {
    const ot = otGroupItem.items ? otGroupItem.items[0] : otGroupItem;
    setEditingOvertime(ot);
    if (otGroupItem.is_group) {
      setOtMode('group');
      setOtGroupName(otGroupItem.group_name || '');
      setOtSelectedEmpIds(otGroupItem.employee_ids || [ot.employee_id]);
    } else {
      setOtMode('individual');
      setOtGroupName('');
      setOtSelectedEmpIds([ot.employee_id]);
    }
    setOtDivFilter('all');
    setOtSearchEmp('');
    setOtForm({
      employee_id: ot.employee_id,
      overtime_date: otGroupItem.overtime_date || ot.overtime_date,
      time_start: otGroupItem.time_start || ot.time_start,
      time_end: otGroupItem.time_end || ot.time_end,
      total_hours: otGroupItem.total_hours || ot.total_hours,
      reason: otGroupItem.reason || ot.reason,
    });
    setShowOvertimeModal(true);
  };



  // SPKL Kolektif States
  const [otMode, setOtMode] = useState<'individual' | 'group'>('individual');
  const [otSelectedEmpIds, setOtSelectedEmpIds] = useState<number[]>([]);
  const [otGroupName, setOtGroupName] = useState<string>('');
  const [otDivFilter, setOtDivFilter] = useState<number | 'all'>('all');
  const [otSearchEmp, setOtSearchEmp] = useState<string>('');
  const [expandedGroupCodes, setExpandedGroupCodes] = useState<Record<string, boolean>>({});

  const handleOpenNewOvertime = () => {
    setEditingOvertime(null);
    setOtMode('individual');
    setOtGroupName('');
    setOtDivFilter('all');
    setOtSearchEmp('');
    const defaultEmp = employees[0]?.id ? [employees[0].id] : [];
    setOtSelectedEmpIds(defaultEmp);
    setOtForm({
      employee_id: employees[0]?.id || 1,
      overtime_date: new Date().toISOString().slice(0, 10),
      time_start: '17:00',
      time_end: '20:00',
      total_hours: 3,
      reason: '',
    });
    setShowOvertimeModal(true);
  };

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({
    employee_id: employees[0]?.id || 1,
    leave_type_name: 'Cuti Tahunan',
    date_start: new Date().toISOString().slice(0, 10),
    date_end: new Date().toISOString().slice(0, 10),
    total_days: 1,
    reason: '',
  });

  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [otForm, setOtForm] = useState<Partial<OvertimeRequest>>({
    employee_id: employees[0]?.id || 1,
    overtime_date: new Date().toISOString().slice(0, 10),
    time_start: '17:00',
    time_end: '20:00',
    total_hours: 3,
    reason: 'Pengecoran Batching Plant Proyek',
  });

  const canApprove = ['super_admin', 'hr_admin', 'manager'].includes(currentUser.role_key);

  // Sorting States for Leave/Sick and Overtime (Default: Newest creation date first - Descending)
  const [leaveSortKey, setLeaveSortKey] = useState<string | null>('created_at');
  const [leaveSortDir, setLeaveSortDir] = useState<SortDirection>('desc');

  const [otSortKey, setOtSortKey] = useState<string | null>('created_at');
  const [otSortDir, setOtSortDir] = useState<SortDirection>('desc');

  const handleSortLeave = (key: string) => {
    if (leaveSortKey === key) {
      if (leaveSortDir === 'asc') setLeaveSortDir('desc');
      else if (leaveSortDir === 'desc') {
        setLeaveSortKey(null);
        setLeaveSortDir(null);
      }
    } else {
      setLeaveSortKey(key);
      setLeaveSortDir('desc');
    }
  };

  const handleSortOt = (key: string) => {
    if (otSortKey === key) {
      if (otSortDir === 'asc') setOtSortDir('desc');
      else if (otSortDir === 'desc') {
        setOtSortKey(null);
        setOtSortDir(null);
      }
    } else {
      setOtSortKey(key);
      setOtSortDir('desc');
    }
  };

  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  // Helper to accurately calculate total calendar days inclusive (e.g. 10-09-2026 s/d 14-09-2026 = 5 Hari)
  const calculateLeaveDays = (startDateStr?: string, endDateStr?: string): number => {
    if (!startDateStr || !endDateStr) return 1;
    const parseLocalDate = (s: string) => {
      const parts = s.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      return new Date(s);
    };
    const start = parseLocalDate(startDateStr);
    const end = parseLocalDate(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 1;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const handleStartDateChange = (val: string) => {
    let endDate = leaveForm.date_end || val;
    if (endDate < val) {
      endDate = val;
    }
    const days = calculateLeaveDays(val, endDate);
    setLeaveForm((prev) => ({
      ...prev,
      date_start: val,
      date_end: endDate,
      total_days: days,
    }));
  };

  const handleEndDateChange = (val: string) => {
    let startDate = leaveForm.date_start || val;
    if (val < startDate) {
      startDate = val;
    }
    const days = calculateLeaveDays(startDate, val);
    setLeaveForm((prev) => ({
      ...prev,
      date_start: startDate,
      date_end: val,
      total_days: days,
    }));
  };

  // Helper to calculate overtime hours automatically
  const calculateOvertimeHours = (timeStart?: string, timeEnd?: string): number => {
    if (!timeStart || !timeEnd) return 1;
    const [h1, m1] = timeStart.split(':').map(Number);
    const [h2, m2] = timeEnd.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 1;

    let startMins = h1 * 60 + m1;
    let endMins = h2 * 60 + m2;

    if (endMins < startMins) {
      endMins += 24 * 60; // Overnight
    }

    const diffMins = endMins - startMins;
    const hours = diffMins / 60;
    const rounded = Math.round(hours * 10) / 10;
    return rounded > 0 ? rounded : 1;
  };

  const handleOtTimeStartChange = (val: string) => {
    const hours = calculateOvertimeHours(val, otForm.time_end);
    setOtForm((prev) => ({
      ...prev,
      time_start: val,
      total_hours: hours,
    }));
  };

  const handleOtTimeEndChange = (val: string) => {
    const hours = calculateOvertimeHours(otForm.time_start, val);
    setOtForm((prev) => ({
      ...prev,
      time_end: val,
      total_hours: hours,
    }));
  };

  // Helper to filter by form creation date (created_at)
  const matchCreatedDateFilter = (createdAt?: string, filterType: string = 'all', specificDate: string = '') => {
    if (filterType === 'all') return true;
    if (!createdAt) return false;
    const itemDate = createdAt.slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (filterType === 'today') {
      return itemDate === todayStr;
    }
    if (filterType === 'last_7_days') {
      const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return itemDate >= past7 && itemDate <= todayStr;
    }
    if (filterType === 'this_month') {
      const thisMonth = todayStr.slice(0, 7);
      return itemDate.startsWith(thisMonth);
    }
    if (filterType === 'specific' && specificDate) {
      return itemDate === specificDate;
    }
    return true;
  };

  // Filtered leaves & overtime per tab
  const cutiList = leaveRequests.filter((l) => {
    const typeName = l.leave_type_name || (l.leave_type_id === 2 ? 'Izin Sakit' : 'Cuti Tahunan');
    const isSakit = l.leave_type_id === 2 || (typeName && typeName.toLowerCase().includes('sakit'));
    const isCuti = !isSakit;
    const matchStatus = leaveFilterStatus === 'all' || l.status === leaveFilterStatus;
    const matchCreated = matchCreatedDateFilter(l.created_at, leaveFilterCreatedDate, leaveSpecificCreatedDate);
    return isCuti && matchStatus && matchCreated;
  });

  const sakitList = leaveRequests.filter((l) => {
    const typeName = l.leave_type_name || (l.leave_type_id === 2 ? 'Izin Sakit' : 'Cuti Tahunan');
    const isSakit = l.leave_type_id === 2 || (typeName && typeName.toLowerCase().includes('sakit'));
    const matchStatus = sickFilterStatus === 'all' || l.status === sickFilterStatus;
    const matchCreated = matchCreatedDateFilter(l.created_at, sickFilterCreatedDate, sickSpecificCreatedDate);
    return isSakit && matchStatus && matchCreated;
  });

  const overtimeList = overtimeRequests.filter((ot) => {
    const matchStatus = otFilterStatus === 'all' || ot.status === otFilterStatus;
    const matchCreated = matchCreatedDateFilter(ot.created_at, otFilterCreatedDate, otSpecificCreatedDate);
    return matchStatus && matchCreated;
  });

  const sortedCutiList = sortTableData(cutiList, leaveSortKey, leaveSortDir);
  const sortedSakitList = sortTableData(sakitList, leaveSortKey, leaveSortDir);
  const sortedOvertimeList = sortTableData(overtimeList, otSortKey, otSortDir);

  const groupedOvertimeList = useMemo(() => {
    const result: Array<{
      id: number;
      primaryId: number;
      is_group: boolean;
      group_code?: string;
      group_name?: string;
      items: OvertimeRequest[];
      employee_id: number;
      employee_name: string;
      employee_nip: string;
      employee_names: string[];
      employee_nips: string[];
      employee_ids: number[];
      overtime_date: string;
      time_start: string;
      time_end: string;
      total_hours: number;
      reason: string;
      status: 'pending' | 'approved' | 'rejected';
      approved_by?: number;
      approved_by_name?: string;
      created_at?: string;
    }> = [];

    const processedGroupCodes = new Set<string>();

    sortedOvertimeList.forEach((ot) => {
      if (ot.group_code) {
        if (!processedGroupCodes.has(ot.group_code)) {
          processedGroupCodes.add(ot.group_code);
          const groupItems = sortedOvertimeList.filter((item) => item.group_code === ot.group_code);
          const empNames = groupItems.map((item) => {
            const emp = employees.find((e) => e.id === item.employee_id);
            return item.employee_name || emp?.full_name || `Karyawan #${item.employee_id}`;
          });
          const empNips = groupItems.map((item) => {
            const emp = employees.find((e) => e.id === item.employee_id);
            return emp?.nip || '-';
          });
          const empIds = groupItems.map((item) => item.employee_id);

          result.push({
            id: ot.id,
            primaryId: ot.id,
            is_group: true,
            group_code: ot.group_code,
            group_name: ot.group_name || `Tim Lembur (${groupItems.length} Karyawan)`,
            items: groupItems,
            employee_id: ot.employee_id,
            employee_name: ot.group_name || `Tim Lembur (${groupItems.length} Karyawan)`,
            employee_nip: `${groupItems.length} Karyawan`,
            employee_names: empNames,
            employee_nips: empNips,
            employee_ids: empIds,
            overtime_date: ot.overtime_date,
            time_start: ot.time_start,
            time_end: ot.time_end,
            total_hours: Number(ot.total_hours),
            reason: ot.reason,
            status: ot.status,
            approved_by: ot.approved_by,
            approved_by_name: ot.approved_by_name,
            created_at: ot.created_at,
          });
        }
      } else {
        const emp = employees.find((e) => e.id === ot.employee_id);
        const name = ot.employee_name || emp?.full_name || `Karyawan #${ot.employee_id}`;
        const nip = emp?.nip || '-';
        result.push({
          id: ot.id,
          primaryId: ot.id,
          is_group: false,
          items: [ot],
          employee_id: ot.employee_id,
          employee_name: name,
          employee_nip: nip,
          employee_names: [name],
          employee_nips: [nip],
          employee_ids: [ot.employee_id],
          overtime_date: ot.overtime_date,
          time_start: ot.time_start,
          time_end: ot.time_end,
          total_hours: Number(ot.total_hours),
          reason: ot.reason,
          status: ot.status,
          approved_by: ot.approved_by,
          approved_by_name: ot.approved_by_name,
          created_at: ot.created_at,
        });
      }
    });

    return result;
  }, [sortedOvertimeList, employees]);

  const activeComp = companyProfile || companyName;
  const compLabel = companyProfile?.company_name || companyName;

  // Export Cuti
  const handleExportCutiExcel = () => {
    const data = sortedCutiList.map((c, idx) => ({
      No: idx + 1,
      Nama_Karyawan: c.employee_name || '-',
      Jenis_Cuti: c.leave_type_name,
      Mulai: formatDateDDMMYYYY(c.date_start),
      Selesai: formatDateDDMMYYYY(c.date_end),
      Hari: Number(c.total_days),
      Alasan: c.reason,
      Status: c.status.toUpperCase(),
      Approved_By: c.approved_by_name || (c.approved_by ? `User #${c.approved_by}` : '-'),
    }));
    exportToExcel(
      data,
      `Pengajuan_Cuti_${getCompanyInitials(compLabel)}`,
      'Cuti',
      activeComp,
      'Laporan Pengajuan Izin Cuti Karyawan'
    );
  };

  const handleExportCutiPdf = () => {
    const headers = ['Nama Karyawan', 'Jenis Cuti', 'Tgl Mulai', 'Tgl Selesai', 'Total Hari', 'Alasan', 'Status', 'Approved By'];
    const rows = sortedCutiList.map((c) => [
      c.employee_name || '-',
      c.leave_type_name,
      formatDateDDMMYYYY(c.date_start),
      formatDateDDMMYYYY(c.date_end),
      `${Number(c.total_days)} Hari`,
      c.reason,
      c.status.toUpperCase(),
      c.approved_by_name || (c.approved_by ? `User #${c.approved_by}` : '-'),
    ]);
    exportToPdfPrint(
      `Laporan Pengajuan Izin Cuti ${compLabel}`,
      `Total: ${rows.length} Pengajuan`,
      headers,
      rows,
      activeComp
    );
  };

  // Export Sakit
  const handleExportSakitExcel = () => {
    const data = sortedSakitList.map((s, idx) => ({
      No: idx + 1,
      Nama_Karyawan: s.employee_name || '-',
      Mulai: formatDateDDMMYYYY(s.date_start),
      Selesai: formatDateDDMMYYYY(s.date_end),
      Hari: Number(s.total_days),
      Keterangan_Sakit: s.reason,
      Status: s.status.toUpperCase(),
      Approved_By: s.approved_by_name || (s.approved_by ? `User #${s.approved_by}` : '-'),
    }));
    exportToExcel(
      data,
      `Pengajuan_Izin_Sakit_${getCompanyInitials(compLabel)}`,
      'Sakit',
      activeComp,
      'Laporan Pengajuan Izin Sakit Medis'
    );
  };

  const handleExportSakitPdf = () => {
    const headers = ['Nama Karyawan', 'Tgl Mulai', 'Tgl Selesai', 'Total Hari', 'Keterangan Medis', 'Status', 'Approved By'];
    const rows = sortedSakitList.map((s) => [
      s.employee_name || '-',
      formatDateDDMMYYYY(s.date_start),
      formatDateDDMMYYYY(s.date_end),
      `${Number(s.total_days)} Hari`,
      s.reason,
      s.status.toUpperCase(),
      s.approved_by_name || (s.approved_by ? `User #${s.approved_by}` : '-'),
    ]);
    exportToPdfPrint(
      `Laporan Pengajuan Izin Sakit ${compLabel}`,
      `Total: ${rows.length} Pengajuan`,
      headers,
      rows,
      activeComp
    );
  };

  // Export Overtime
  const handleExportOtExcel = () => {
    const data = sortedOvertimeList.map((ot, idx) => ({
      No: idx + 1,
      Nama_Karyawan: ot.employee_name || '-',
      Tanggal: formatDateDDMMYYYY(ot.overtime_date),
      Jam_Mulai: formatTimeHHMM(ot.time_start) || ot.time_start,
      Jam_Selesai: formatTimeHHMM(ot.time_end) || ot.time_end,
      Total_Jam: Number(ot.total_hours),
      Pekerjaan_Tugas: ot.reason,
      Status: ot.status.toUpperCase(),
      Approved_By: ot.approved_by_name || (ot.approved_by ? `User #${ot.approved_by}` : '-'),
    }));
    exportToExcel(
      data,
      `Daftar_SPKL_Lembur_${getCompanyInitials(compLabel)}`,
      'SPKL',
      activeComp,
      'Daftar Surat Perintah Kerja Lembur (SPKL)'
    );
  };

  const handleExportOtPdf = () => {
    const headers = ['Nama Karyawan', 'Tanggal Lembur', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Uraian Tugas', 'Status', 'Approved By'];
    const rows = sortedOvertimeList.map((ot) => [
      ot.employee_name || '-',
      formatDateDDMMYYYY(ot.overtime_date),
      formatTimeHHMM(ot.time_start) || ot.time_start,
      formatTimeHHMM(ot.time_end) || ot.time_end,
      `${Number(ot.total_hours)} Jam`,
      ot.reason,
      ot.status.toUpperCase(),
      ot.approved_by_name || (ot.approved_by ? `User #${ot.approved_by}` : '-'),
    ]);
    exportToPdfPrint(
      `Surat Perintah Kerja Lembur (SPKL) ${compLabel}`,
      `Total: ${rows.length} SPKL`,
      headers,
      rows,
      activeComp
    );
  };

  // Quota Filtering, Sorting & Export
  const handleSortQuota = (key: string) => {
    if (quotaSortKey === key) {
      if (quotaSortDir === 'asc') setQuotaSortDir('desc');
      else if (quotaSortDir === 'desc') {
        setQuotaSortKey(null);
        setQuotaSortDir(null);
      }
    } else {
      setQuotaSortKey(key);
      setQuotaSortDir('asc');
    }
  };

  // Compute dynamically enriched leave balances so used_days & remaining_days are always 100% in sync with approved leave requests
  const enrichedBalances = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return leaveBalances.map((b) => {
      const bYear = Number(b.year) || currentYear;
      // Filter approved leave requests for this employee & year
      const approvedDays = leaveRequests
        .filter((l) => {
          if (Number(l.employee_id) !== Number(b.employee_id)) return false;
          if (l.status !== 'approved') return false;

          if (b.leave_type_id === 1) {
            const isSakit = l.leave_type_id === 2 || (l.leave_type_name && l.leave_type_name.toLowerCase().includes('sakit'));
            if (isSakit) return false;
            if (l.leave_type_id && Number(l.leave_type_id) !== 1) return false;
          } else {
            if (Number(l.leave_type_id) !== Number(b.leave_type_id)) return false;
          }

          const dateVal = l.date_start || l.created_at;
          if (dateVal) {
            const yr = parseInt(String(dateVal).slice(0, 4), 10);
            if (!isNaN(yr) && yr !== bYear) return false;
          }

          return true;
        })
        .reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);

      const used_days = approvedDays !== undefined ? approvedDays : (b.used_days || 0);
      const remaining_days = Math.max(0, (b.quota_days + (b.active_carry_forward_days || 0)) - used_days);

      return {
        ...b,
        used_days,
        remaining_days,
      };
    });
  }, [leaveBalances, leaveRequests]);

  const filteredBalances = enrichedBalances.filter((b) => {
    if (!quotaSearch.trim()) return true;
    const q = quotaSearch.toLowerCase();
    return (
      (b.employee_name || '').toLowerCase().includes(q) ||
      (b.employee_nip || '').toLowerCase().includes(q) ||
      (b.division_name || '').toLowerCase().includes(q)
    );
  });

  const sortedBalances = sortTableData(filteredBalances, quotaSortKey, quotaSortDir);

  const handleExportQuotaExcel = () => {
    const data = sortedBalances.map((b, idx) => ({
      No: idx + 1,
      NIP: b.employee_nip || '-',
      Nama_Karyawan: b.employee_name || '-',
      Divisi: b.division_name || '-',
      Tahun: b.year,
      Kuota_Cuti_Hari: b.quota_days,
      Cuti_Terpakai_Hari: b.used_days,
      Sisa_Saldo_Hari: b.remaining_days,
      Status_Saldo: b.remaining_days <= 0 ? 'HABIS' : b.remaining_days <= 3 ? 'MENIPIS' : 'AMAN',
    }));
    exportToExcel(
      data,
      `Rekap_Saldo_Cuti_${getCompanyInitials(compLabel)}`,
      'Saldo Cuti',
      activeComp,
      'Laporan Saldo & Kuota Cuti Karyawan'
    );
  };

  const handleExportQuotaPdf = () => {
    const headers = ['NIP', 'Nama Karyawan', 'Divisi', 'Tahun', 'Kuota', 'Terpakai', 'Sisa Saldo', 'Status'];
    const rows = sortedBalances.map((b) => [
      b.employee_nip || '-',
      b.employee_name || '-',
      b.division_name || '-',
      String(b.year),
      `${b.quota_days} Hari`,
      `${b.used_days} Hari`,
      `${b.remaining_days} Hari`,
      b.remaining_days <= 0 ? 'HABIS' : b.remaining_days <= 3 ? 'MENIPIS' : 'AMAN',
    ]);
    exportToPdfPrint(
      `Laporan Saldo & Kuota Cuti Karyawan ${compLabel}`,
      `Total: ${rows.length} Karyawan Terdata`,
      headers,
      rows,
      activeComp
    );
  };

  return (
    <div id="request-management-view" className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-sky-500" />
            Management Requests & SPKL
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pengajuan dan persetujuan izin cuti, izin sakit dengan surat keterangan medis, dan SPKL lembur operasional
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl">
          <button
            onClick={() => setActiveSubTab('leave')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'leave'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'leave'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Izin Cuti ({cutiList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sick')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'sick'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'sick'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Izin Sakit ({sakitList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('overtime')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'overtime'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'overtime'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            SPKL Lembur ({overtimeList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('quota')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'quota'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'quota'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Saldo & Kuota Cuti ({leaveBalances.length || employees.length})</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filter status & Add button */}
      {(() => {
        if (activeSubTab === 'quota') {
          return (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari NIP, nama karyawan, atau divisi..."
                    value={quotaSearch}
                    onChange={(e) => setQuotaSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
                  />
                  {quotaSearch && (
                    <button
                      onClick={() => setQuotaSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncLeaveBalances}
                  disabled={isSyncingBalances}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50"
                  title="Sinkronisasikan saldo & kuota cuti dengan database MySQL dan hitung ulang cuti terpakai"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBalances ? 'animate-spin' : ''}`} />
                  <span>{isSyncingBalances ? 'Sinkronisasi...' : 'Sinkronkan Saldo Cuti'}</span>
                </button>
                <ExportDropdown
                  onExportExcel={handleExportQuotaExcel}
                  onExportPdf={handleExportQuotaPdf}
                  label="Export Saldo Cuti"
                />
                {canApprove && (
                  <button
                    onClick={handleBulkSetStandardQuota}
                    disabled={isBulkSetting}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    title="Terapkan 12 hari cuti tahunan serentak untuk semua karyawan sesuai regulasi UU Ketenagakerjaan"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBulkSetting ? 'Memproses...' : 'Set Massal 12 Hari'}</span>
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={handleOpenNewQuota}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Setting Kuota Karyawan</span>
                  </button>
                )}
              </div>
            </div>
          );
        }

        const currentFilter =
          activeSubTab === 'leave'
            ? leaveFilterStatus
            : activeSubTab === 'sick'
            ? sickFilterStatus
            : otFilterStatus;

        const currentCreatedFilter =
          activeSubTab === 'leave'
            ? leaveFilterCreatedDate
            : activeSubTab === 'sick'
            ? sickFilterCreatedDate
            : otFilterCreatedDate;

        const currentSpecificDate =
          activeSubTab === 'leave'
            ? leaveSpecificCreatedDate
            : activeSubTab === 'sick'
            ? sickSpecificCreatedDate
            : otSpecificCreatedDate;

        const handleFilterChange = (val: string) => {
          if (activeSubTab === 'leave') setLeaveFilterStatus(val);
          else if (activeSubTab === 'sick') setSickFilterStatus(val);
          else setOtFilterStatus(val);
        };

        const handleCreatedDateFilterChange = (val: string) => {
          if (activeSubTab === 'leave') setLeaveFilterCreatedDate(val);
          else if (activeSubTab === 'sick') setSickFilterCreatedDate(val);
          else setOtFilterCreatedDate(val);
        };

        const handleSpecificDateChange = (val: string) => {
          if (activeSubTab === 'leave') setLeaveSpecificCreatedDate(val);
          else if (activeSubTab === 'sick') setSickSpecificCreatedDate(val);
          else setOtSpecificCreatedDate(val);
        };

        const handleClearTabFilter = () => {
          if (activeSubTab === 'leave') {
            setLeaveFilterStatus('all');
            setLeaveFilterCreatedDate('all');
            setLeaveSpecificCreatedDate('');
          } else if (activeSubTab === 'sick') {
            setSickFilterStatus('all');
            setSickFilterCreatedDate('all');
            setSickSpecificCreatedDate('');
          } else {
            setOtFilterStatus('all');
            setOtFilterCreatedDate('all');
            setOtSpecificCreatedDate('');
          }
        };

        const tabLabel =
          activeSubTab === 'leave'
            ? 'Cuti'
            : activeSubTab === 'sick'
            ? 'Izin Sakit'
            : 'SPKL Lembur';

        const isFiltered = currentFilter !== 'all' || currentCreatedFilter !== 'all';

        return (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Status:
                </span>
                <select
                  value={currentFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Persetujuan</option>
                  <option value="approved">Disetujui (Approved)</option>
                  <option value="rejected">Ditolak (Rejected)</option>
                </select>
              </div>

              {/* Tgl Pembuatan Form Filter (Default sorting: Descending / Terbaru) */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Tgl Pembuatan:
                </span>
                <select
                  value={currentCreatedFilter}
                  onChange={(e) => handleCreatedDateFilterChange(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="all">Semua Waktu Pembuatan</option>
                  <option value="today">Hari Ini</option>
                  <option value="last_7_days">7 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="specific">Pilih Tanggal Spesifik...</option>
                </select>

                {currentCreatedFilter === 'specific' && (
                  <input
                    type="date"
                    value={currentSpecificDate}
                    onChange={(e) => handleSpecificDateChange(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                )}
              </div>

              {isFiltered && (
                <button
                  onClick={handleClearTabFilter}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold flex items-center gap-1 transition-colors"
                  title={`Reset semua filter ${tabLabel}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
          {activeSubTab === 'leave' && (
            <>
              <button
                onClick={() => handleSyncTable('leave_requests')}
                disabled={isSyncingTable === 'leave_requests'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data pengajuan cuti dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'leave_requests' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'leave_requests' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportCutiExcel}
                onExportPdf={handleExportCutiPdf}
                label="Export Cuti"
              />
              <button
                onClick={() => {
                  const firstEmp = employees[0];
                  setLeaveForm({
                    employee_id: firstEmp?.id || 1,
                    employee_name: firstEmp?.full_name || '',
                    employee_nip: firstEmp?.nip || '',
                    division_name: firstEmp?.division_name || '',
                    leave_type_id: 1,
                    leave_type_name: 'Cuti Tahunan',
                    date_start: new Date().toISOString().slice(0, 10),
                    date_end: new Date().toISOString().slice(0, 10),
                    total_days: 1,
                    reason: '',
                    attachment_url: '',
                  });
                  setShowLeaveModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Ajukan Cuti
              </button>
            </>
          )}

          {activeSubTab === 'sick' && (
            <>
              <button
                onClick={() => handleSyncTable('leave_requests')}
                disabled={isSyncingTable === 'leave_requests'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data izin sakit dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'leave_requests' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'leave_requests' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportSakitExcel}
                onExportPdf={handleExportSakitPdf}
                label="Export Izin Sakit"
              />
              <button
                onClick={() => {
                  const firstEmp = employees[0];
                  setLeaveForm({
                    employee_id: firstEmp?.id || 1,
                    employee_name: firstEmp?.full_name || '',
                    employee_nip: firstEmp?.nip || '',
                    division_name: firstEmp?.division_name || '',
                    leave_type_id: 2,
                    leave_type_name: 'Izin Sakit',
                    date_start: new Date().toISOString().slice(0, 10),
                    date_end: new Date().toISOString().slice(0, 10),
                    total_days: 1,
                    reason: 'Demam & istirahat dokter (ada surat dokter/resep)',
                    attachment_url: '',
                  });
                  setShowLeaveModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Ajukan Izin Sakit
              </button>
            </>
          )}

          {activeSubTab === 'overtime' && (
            <>
              <button
                onClick={() => handleSyncTable('overtime_requests')}
                disabled={isSyncingTable === 'overtime_requests'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data SPKL lembur dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'overtime_requests' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'overtime_requests' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportOtExcel}
                onExportPdf={handleExportOtPdf}
                label="Export SPKL Lembur"
              />
              <button
                onClick={handleOpenNewOvertime}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Buat SPKL Lembur
              </button>
            </>
          )}
        </div>
      </div>
        );
      })()}

      {/* SUB-TAB 1 & 2: LEAVE / SICK REQUESTS TABLE */}
      {(activeSubTab === 'leave' || activeSubTab === 'sick') && (
        <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <SortableTh sortKey="created_at" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Tgl Pembuatan Form
                  </SortableTh>
                  <SortableTh sortKey="employee_name" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Karyawan
                  </SortableTh>
                  <SortableTh sortKey="leave_type_name" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Tipe Pengajuan
                  </SortableTh>
                  <SortableTh sortKey="date_start" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Tgl Mulai
                  </SortableTh>
                  <SortableTh sortKey="date_end" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Tgl Selesai
                  </SortableTh>
                  <SortableTh sortKey="total_days" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Durasi
                  </SortableTh>
                  <SortableTh sortKey="reason" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Alasan / Catatan Medis
                  </SortableTh>
                  <SortableTh sortKey="status" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Status
                  </SortableTh>
                  <SortableTh sortKey="approved_by_name" currentSortKey={leaveSortKey} currentSortDirection={leaveSortDir} onSort={handleSortLeave}>
                    Approved By
                  </SortableTh>
                  <th className="py-3 px-4 text-right">Aksi & Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                {(activeSubTab === 'leave' ? sortedCutiList : sortedSakitList).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      Tidak ada data pengajuan dalam kategori ini.
                    </td>
                  </tr>
                ) : (
                  (activeSubTab === 'leave' ? sortedCutiList : sortedSakitList).map((item, idx) => {
                    const empName = item.employee_name || employees.find((e) => e.id === item.employee_id)?.full_name || `Karyawan #${item.employee_id || item.id}`;
                    const isSakit = item.leave_type_id === 2 || (item.leave_type_name && item.leave_type_name.toLowerCase().includes('sakit'));
                    const leaveTypeName = isSakit ? 'Izin Sakit' : (item.leave_type_name || 'Cuti Tahunan');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{formatDateTimeDDMMYYYY(item.created_at)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Form #{item.id}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {empName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {item.employee_nip || employees.find((e) => e.id === item.employee_id)?.nip || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isSakit 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/20' 
                              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-500/20'
                          }`}>
                            {leaveTypeName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatDateDDMMYYYY(item.date_start)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatDateDDMMYYYY(item.date_end)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {Number(item.total_days)} Hari
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300">
                          <div className="italic truncate">{item.reason}</div>
                          {item.attachment_url && (
                            <button
                              type="button"
                              onClick={() => setSelectedAttachment(item.attachment_url)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors mt-1"
                            >
                              <FileText className="w-3 h-3" /> Lihat Surat Sakit / Resep
                            </button>
                          )}
                        </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status === 'approved' || item.status === 'rejected' ? (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {item.approved_by_name || (item.approved_by ? (item.approved_by === 1 ? 'Super Admin' : item.approved_by === 5 ? 'Rudi Hartono' : `User #${item.approved_by}`) : '-')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove && item.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveLeave(item.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shadow-xs text-[11px]"
                                title="Setujui Pengajuan"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                              <button
                                onClick={() => handleApproveLeave(item.id, 'rejected')}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenEditLeave(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                            title="Edit Pengajuan Cuti/Izin"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const isSakit = item.leave_type_id === 2 || (item.leave_type_name && item.leave_type_name.toLowerCase().includes('sakit'));
                              const typeLabel = isSakit ? 'Izin Sakit' : (item.leave_type_name || 'Cuti Tahunan');
                              setDeleteConfirmTarget({
                                type: 'leave',
                                id: item.id,
                                name: empName,
                                detail: `${typeLabel} (${formatDateDDMMYYYY(item.date_start)} s/d ${formatDateDDMMYYYY(item.date_end)} - ${item.total_days} Hari)`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Hapus Pengajuan Cuti/Izin"
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

      {/* SUB-TAB 3: SPKL OVERTIME TABLE */}
      {activeSubTab === 'overtime' && (
        <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <SortableTh sortKey="created_at" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Tgl Pembuatan SPKL
                  </SortableTh>
                  <SortableTh sortKey="employee_name" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Karyawan
                  </SortableTh>
                  <SortableTh sortKey="overtime_date" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Tanggal Lembur
                  </SortableTh>
                  <SortableTh sortKey="time_start" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Jam Mulai
                  </SortableTh>
                  <SortableTh sortKey="time_end" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Jam Selesai
                  </SortableTh>
                  <SortableTh sortKey="total_hours" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Total Jam
                  </SortableTh>
                  <SortableTh sortKey="reason" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Tugas Pengecoran / Kantor
                  </SortableTh>
                  <SortableTh sortKey="status" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Status
                  </SortableTh>
                  <SortableTh sortKey="approved_by_name" currentSortKey={otSortKey} currentSortDirection={otSortDir} onSort={handleSortOt}>
                    Approved By
                  </SortableTh>
                  <th className="py-3 px-4 text-right">Aksi & Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                {groupedOvertimeList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      Tidak ada data SPKL lembur.
                    </td>
                  </tr>
                ) : (
                  groupedOvertimeList.map((otGroup, idx) => {
                    const isExpanded = otGroup.group_code ? Boolean(expandedGroupCodes[otGroup.group_code]) : false;
                    return (
                      <React.Fragment key={otGroup.is_group ? `group-${otGroup.group_code}` : `ot-${otGroup.id}`}>
                        <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 ${otGroup.is_group ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''}`}>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>{formatDateTimeDDMMYYYY(otGroup.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {otGroup.is_group ? (otGroup.group_code || `SPKL #${otGroup.primaryId}`) : `SPKL #${otGroup.primaryId}`}
                              </span>
                              {otGroup.is_group && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap shrink-0">
                                  👥 KOLEKTIF ({otGroup.items.length})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {otGroup.is_group ? (
                              <div className="space-y-1 min-w-[180px] max-w-[260px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs">{otGroup.group_name}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono font-bold whitespace-nowrap shrink-0">
                                    {otGroup.items.length} Orang
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  {otGroup.employee_names.join(', ')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (otGroup.group_code) {
                                      setExpandedGroupCodes((prev) => ({
                                        ...prev,
                                        [otGroup.group_code!]: !prev[otGroup.group_code!],
                                      }));
                                    }
                                  }}
                                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  {isExpanded ? '▲ Sembunyikan Anggota' : `▼ Lihat Detail ${otGroup.items.length} Karyawan`}
                                </button>
                              </div>
                            ) : (
                              <div className="min-w-[140px]">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {otGroup.employee_name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {otGroup.employee_nip}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                            {formatDateDDMMYYYY(otGroup.overtime_date)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">
                            {formatTimeHHMM(otGroup.time_start) || otGroup.time_start}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">
                            {formatTimeHHMM(otGroup.time_end) || otGroup.time_end}
                          </td>
                          <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {Number(otGroup.total_hours)} Jam {otGroup.is_group ? <span className="text-[10px] font-normal text-purple-500 dark:text-purple-400">/ orang</span> : ''}
                          </td>
                          <td className="py-3 px-4 min-w-[140px] max-w-xs text-slate-600 dark:text-slate-300">
                            {otGroup.reason}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                otGroup.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : otGroup.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {otGroup.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {otGroup.status === 'approved' || otGroup.status === 'rejected' ? (
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  {otGroup.approved_by_name || (otGroup.approved_by ? (otGroup.approved_by === 1 ? 'Super Admin' : otGroup.approved_by === 5 ? 'Rudi Hartono' : `User #${otGroup.approved_by}`) : '-')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canApprove && otGroup.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => onApproveOvertime(otGroup.primaryId, 'approved')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shadow-xs text-[11px]"
                                    title={otGroup.is_group ? `Setujui SPKL Kolektif (${otGroup.items.length} Karyawan)` : "Setujui SPKL"}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Setujui {otGroup.is_group ? `Semua (${otGroup.items.length})` : ''}
                                  </button>
                                  <button
                                    onClick={() => onApproveOvertime(otGroup.primaryId, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]"
                                    title={otGroup.is_group ? `Tolak SPKL Kolektif (${otGroup.items.length} Karyawan)` : "Tolak SPKL"}
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Tolak
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleOpenEditOvertime(otGroup)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                                title="Edit SPKL Lembur"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmTarget({
                                    type: 'overtime',
                                    id: otGroup.primaryId,
                                    name: otGroup.is_group ? `${otGroup.group_name} (${otGroup.items.length} Karyawan)` : otGroup.employee_name,
                                    detail: `SPKL Lembur Tanggal ${formatDateDDMMYYYY(otGroup.overtime_date)} (${formatTimeHHMM(otGroup.time_start)} - ${formatTimeHHMM(otGroup.time_end)}, ${otGroup.total_hours} Jam)`,
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Hapus SPKL Lembur"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Sub-Row for Group Overtime Members */}
                        {otGroup.is_group && isExpanded && (
                          <tr className="bg-purple-50/50 dark:bg-purple-950/20 border-y border-purple-100 dark:border-purple-900/50">
                            <td colSpan={11} className="p-3 pl-12">
                              <div className="bg-white dark:bg-[#18181b] rounded-xl p-3 border border-purple-200/80 dark:border-purple-900/60 shadow-xs">
                                <div className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-purple-600" />
                                  <span>Daftar Karyawan Terdaftar Dalam SPKL Tim ini ({otGroup.items.length} Orang):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {otGroup.items.map((item) => {
                                    const emp = employees.find((e) => e.id === item.employee_id);
                                    const div = emp ? divisions.find((d) => d.id === emp.division_id) : null;
                                    return (
                                      <div key={item.id} className="p-2 rounded-lg bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
                                        <div>
                                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                                            {item.employee_name || emp?.full_name || 'Karyawan'}
                                          </div>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                            NIP: {emp?.nip || '-'} • {div?.division_name || '-'}
                                          </div>
                                        </div>
                                        <span className="text-[10px] font-bold font-mono text-purple-600 dark:text-purple-400">
                                          {item.total_hours} Jam
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SALDO & KUOTA CUTI KARYAWAN */}
      {activeSubTab === 'quota' && (
        <div className="space-y-6">
          {/* Summary Cards & Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Karyawan</span>
                <Briefcase className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {enrichedBalances.length || employees.length} <span className="text-xs font-normal text-slate-500">Orang</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tercatat pada tahun kalender berjalan
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hak Standar UU 13/2003</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                12 <span className="text-xs font-normal text-slate-500">Hari / Tahun</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Sekurang-kurangnya 12 hari kerja upah penuh
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Cuti Diambil</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {enrichedBalances.reduce((acc, b) => acc + (b.used_days || 0), 0)} <span className="text-xs font-normal text-slate-500">Hari</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Total akumulasi cuti tahunan terpakai
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sisa Saldo</span>
                <CheckCircle2 className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {enrichedBalances.reduce((acc, b) => acc + (b.remaining_days ?? (b.quota_days - (b.used_days || 0))), 0)} <span className="text-xs font-normal text-slate-500">Hari</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Hak cuti yang masih dapat diajukan
              </p>
            </div>
          </div>

          {/* HR Information & Policy Guidance Banner */}
          <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Ketentuan Hak Cuti Karyawan & Fleksibilitas Pengaturan HR
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  <strong>1. Berapa hari cuti yang didapatkan masing-masing karyawan?</strong>
                  <br />
                  Secara umum dan standar perundang-undangan (UU No. 13 Tahun 2003 Pasal 79 ayat 2 huruf c), setiap karyawan yang telah memiliki masa kerja 12 bulan berhak atas <strong>12 hari kerja cuti tahunan</strong> dengan gaji dibayar penuh.
                  <br />
                  <strong>2. Apakah HR bisa mensetting jumlah kuota cutinya?</strong>
                  <br />
                  <strong>TENTU BISA.</strong> HR memiliki otoritas penuh untuk mengatur jumlah kuota cuti tiap karyawan. Anda bisa mengklik tombol <em>"Edit Kuota"</em> pada baris karyawan (misalnya memberikan 14-16 hari untuk karyawan senior atau grade manajerial), atau menggunakan tombol <em>"Set Massal 12 Hari"</em> untuk menetapkan kuota serentak bagi seluruh staf perusahaan.
                  <br />
                  <strong>3. Jenis cuti apa yang memotong saldo ini?</strong>
                  <br />
                  Hanya pengajuan dengan tipe <strong>"Cuti Tahunan"</strong> yang memotong kuota ini. Izin Sakit (dengan surat dokter), Cuti Melahirkan (90 hari), Cuti Menikah, maupun Cuti Khusus duka cita tidak mengurangi saldo cuti tahunan karyawan.
                </p>
              </div>
            </div>
          </div>

          {/* Quota Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari NIP, nama karyawan, divisi..."
                  value={quotaSearch}
                  onChange={(e) => setQuotaSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white w-56 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncTable('leave_balances')}
                disabled={isSyncingTable === 'leave_balances'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi data kuota dan saldo cuti dengan database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'leave_balances' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'leave_balances' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <button
                onClick={() => {
                  setIsBulkSetting(true);
                  setQuotaEditValue(12);
                  setQuotaEditYear(new Date().getFullYear());
                  setShowQuotaModal(true);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors shadow-xs"
                title="Set Massal 12 Hari Cuti Tahunan untuk Semua Karyawan"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Set Massal 12 Hari</span>
              </button>

              <button
                onClick={() => {
                  setIsBulkSetting(false);
                  setSelectedBalanceForEdit(null);
                  setQuotaSelectedEmpId(employees[0]?.id || 1);
                  setQuotaEditValue(12);
                  setQuotaEditYear(new Date().getFullYear());
                  setShowQuotaModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                <span>Atur Kuota Karyawan</span>
              </button>
            </div>
          </div>

          {/* Quota Table */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <SortableTh
                      sortKey="employee_nip"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      NIP
                    </SortableTh>
                    <SortableTh
                      sortKey="employee_name"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Nama Karyawan
                    </SortableTh>
                    <SortableTh
                      sortKey="division_name"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Divisi & Jabatan
                    </SortableTh>
                    <SortableTh
                      sortKey="year"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Tahun
                    </SortableTh>
                    <SortableTh
                      sortKey="quota_days"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Kuota Cuti
                    </SortableTh>
                    <SortableTh
                      sortKey="used_days"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Terpakai
                    </SortableTh>
                    <SortableTh
                      sortKey="remaining_days"
                      currentSortKey={quotaSortKey}
                      currentSortDirection={quotaSortDir}
                      onSort={handleSortQuota}
                    >
                      Sisa Saldo
                    </SortableTh>
                    <th className="py-3 px-4">Status Saldo</th>
                    {canApprove && <th className="py-3 px-4 text-right">Aksi HR</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a] font-medium text-slate-800 dark:text-slate-200">
                  {isLoadingBalances ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Memuat data kuota cuti...
                      </td>
                    </tr>
                  ) : sortedBalances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tidak ada data kuota cuti ditemukan.
                      </td>
                    </tr>
                  ) : (
                    sortedBalances.map((bal, idx) => {
                      const remaining = bal.remaining_days ?? (bal.quota_days - bal.used_days);
                      const isDepleted = remaining <= 0;
                      const isLow = remaining <= 3 && remaining > 0;
                      return (
                        <tr
                          key={bal.id ? `bal-${bal.id}` : `bal-${bal.employee_id}-${bal.leave_type_id || 1}-${bal.year || 2026}-${idx}`}
                          className="hover:bg-slate-50/50 dark:hover:bg-[#18181b]/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {bal.employee_nip || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {bal.employee_name || `Karyawan #${bal.employee_id}`}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {bal.division_name || '-'}
                            {bal.job_grade_name ? ` • ${bal.job_grade_name}` : ''}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{bal.year}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {bal.quota_days} Hari
                          </td>
                          <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold">
                            {bal.used_days} Hari
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-black text-sm ${
                                isDepleted
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isLow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {remaining} Hari
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isDepleted
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {isDepleted ? 'HABIS' : isLow ? 'MENIPIS' : 'TERSEDIA'}
                            </span>
                          </td>
                          {canApprove && (
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenEditQuota(bal)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 ml-auto transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Kuota</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Formulir Pengajuan Cuti / Sakit */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingLeave
                ? `Edit ${leaveForm.leave_type_name === 'Izin Sakit' ? 'Izin Sakit' : 'Pengajuan Cuti'} (#${editingLeave.id})`
                : leaveForm.leave_type_name === 'Izin Sakit'
                ? 'Formulir Izin Sakit'
                : 'Formulir Pengajuan Cuti'}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingLeave) return;
                setIsSubmittingLeave(true);
                try {
                  if (editingLeave) {
                    if (onUpdateLeave) {
                      const res = await onUpdateLeave(editingLeave.id, leaveForm);
                      if (res?.success) {
                        toast.success('Berhasil Diperbarui', 'Data pengajuan cuti/izin berhasil diperbarui di database.');
                      } else {
                        toast.error('Gagal Diperbarui', res?.message || 'Gagal memperbarui data');
                      }
                    }
                  } else {
                    const res = await onAddLeave(leaveForm);
                    if (res?.success) {
                      toast.success('Pengajuan Berhasil', 'Pengajuan cuti/izin berhasil diajukan dan dicatat di database.');
                    } else {
                      toast.error('Gagal Mengajukan', res?.message || 'Gagal mengajukan data');
                    }
                  }
                  await loadLeaveBalances();
                  setShowLeaveModal(false);
                  setEditingLeave(null);
                } catch (err: any) {
                  toast.error('Gagal', err.message);
                } finally {
                  setIsSubmittingLeave(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Karyawan *
                </label>
                <select
                  required
                  value={leaveForm.employee_id ?? ''}
                  onChange={(e) => {
                    const empId = Number(e.target.value);
                    const selectedEmp = employees.find((emp) => emp.id === empId);
                    setLeaveForm({
                      ...leaveForm,
                      employee_id: empId,
                      employee_name: selectedEmp?.full_name || '',
                      employee_nip: selectedEmp?.nip || '',
                      division_name: selectedEmp?.division_name || '',
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nip} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Cuti / Izin *
                </label>
                <select
                  value={leaveForm.leave_type_name || 'Cuti Tahunan'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLeaveForm({
                      ...leaveForm,
                      leave_type_name: val,
                      leave_type_id: val === 'Izin Sakit' ? 2 : 1,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                >
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Izin Sakit">Izin Sakit</option>
                  <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                  <option value="Cuti Khusus / Penting">Cuti Khusus / Penting</option>
                </select>
              </div>

              {/* Status Saldo Cuti Karyawan Terpilih */}
              {(() => {
                const currentBalance = leaveBalances.find((b) => b.employee_id === leaveForm.employee_id);
                if (leaveForm.leave_type_name === 'Cuti Tahunan' && currentBalance) {
                  const rem = currentBalance.remaining_days ?? (currentBalance.quota_days - currentBalance.used_days);
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          Saldo Cuti Tahunan:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Kuota: {currentBalance.quota_days} Hari | Terpakai: {currentBalance.used_days} Hari
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          Sisa Saldo:
                        </span>
                        <span
                          className={`font-black text-sm ${
                            rem <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {rem} Hari
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai *
                  </label>
                  <DateInput
                    required
                    value={leaveForm.date_start || ''}
                    onChange={(v) => handleStartDateChange(v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai *
                  </label>
                  <DateInput
                    required
                    value={leaveForm.date_end || ''}
                    onChange={(v) => handleEndDateChange(v)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jumlah Hari Cuti / Izin *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const days = calculateLeaveDays(leaveForm.date_start, leaveForm.date_end);
                      setLeaveForm((prev) => ({ ...prev, total_days: days }));
                    }}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/20 transition-colors"
                    title="Hitung ulang otomatis berdasarkan rentang tanggal"
                  >
                    ⚡ Hitung Otomatis ({calculateLeaveDays(leaveForm.date_start, leaveForm.date_end)} Hari)
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={leaveForm.total_days ?? 1}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 1);
                    setLeaveForm((prev) => ({ ...prev, total_days: val }));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                  * Dihitung otomatis: {calculateLeaveDays(leaveForm.date_start, leaveForm.date_end)} hari kalender (inklusif tanggal mulai s/d tanggal selesai). Dapat disesuaikan manual.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Keterangan keperluan cuti..."
                  value={leaveForm.reason || ''}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              {/* Upload Foto Copy Resep / Surat Sakit Dokter */}
              {leaveForm.leave_type_name === 'Izin Sakit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Upload Fotocopy Resep / Surat Sakit Dokter
                  </label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      id="sick-note-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setLeaveForm({
                              ...leaveForm,
                              attachment_url: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="sick-note-upload"
                      className="cursor-pointer px-3.5 py-2.5 text-xs rounded-xl border border-dashed border-amber-500/60 hover:border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span>
                        {leaveForm.attachment_url
                          ? 'Ganti File Surat Sakit / Resep'
                          : 'Unggah Foto/Scan Surat Sakit atau Resep Dokter'}
                      </span>
                    </label>
                    {leaveForm.attachment_url && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> File Berhasil Diiunggah
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(leaveForm.attachment_url || null)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 underline font-semibold"
                        >
                          Pratinjau
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingLeave}
                  onClick={() => {
                    setShowLeaveModal(false);
                    setEditingLeave(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingLeave && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingLeave ? 'Memproses...' : (editingLeave ? 'Simpan Perubahan' : 'Kirim Pengajuan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Formulir SPKL Lembur */}
      {showOvertimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              {editingOvertime
                ? `Edit SPKL Lembur (#${editingOvertime.id})`
                : 'Buat SPKL (Surat Perintah Kerja Lembur)'}
            </h2>

            {!editingOvertime && (
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#18181b] rounded-xl mb-4 border border-slate-200 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setOtMode('individual')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    otMode === 'individual'
                      ? 'bg-white dark:bg-[#27272a] text-purple-600 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>👤 Individu (1 Orang)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOtMode('group')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    otMode === 'group'
                      ? 'bg-white dark:bg-[#27272a] text-purple-600 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>👥 SPKL Kolektif / Tim</span>
                </button>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingOvertime) return;
                setIsSubmittingOvertime(true);
                try {
                  if (editingOvertime) {
                    if (onUpdateOvertime) {
                      const res = await onUpdateOvertime(editingOvertime.id, otForm);
                      if (res?.success) {
                        toast.success('Berhasil Diperbarui', 'Data SPKL lembur berhasil diperbarui di database.');
                      } else {
                        toast.error('Gagal Diperbarui', res?.message || 'Gagal memperbarui SPKL');
                      }
                    }
                  } else {
                    if (otMode === 'group') {
                      if (otSelectedEmpIds.length === 0) {
                        toast.error('Pilihan Kosong', 'Pilih minimal 1 karyawan untuk menerbitkan SPKL Kolektif.');
                        setIsSubmittingOvertime(false);
                        return;
                      }
                      const payload = {
                        employee_ids: otSelectedEmpIds,
                        group_name: otGroupName || `Tim Lembur (${otSelectedEmpIds.length} Karyawan)`,
                        overtime_date: otForm.overtime_date,
                        time_start: otForm.time_start,
                        time_end: otForm.time_end,
                        total_hours: otForm.total_hours,
                        reason: otForm.reason,
                      };
                      const res = await onAddOvertime(payload);
                      if (res?.success) {
                        toast.success('SPKL Kolektif Diterbitkan', `SPKL lembur untuk ${otSelectedEmpIds.length} karyawan berhasil diterbitkan!`);
                      } else {
                        toast.error('Gagal Menerbitkan SPKL', res?.message || 'Gagal membuat SPKL Kolektif');
                      }
                    } else {
                      const res = await onAddOvertime(otForm);
                      if (res?.success) {
                        toast.success('SPKL Diterbitkan', 'SPKL lembur berhasil dicatat di database.');
                      } else {
                        toast.error('Gagal Menerbitkan SPKL', res?.message || 'Gagal membuat SPKL');
                      }
                    }
                  }
                  setShowOvertimeModal(false);
                  setEditingOvertime(null);
                } catch (err: any) {
                  toast.error('Gagal', err.message);
                } finally {
                  setIsSubmittingOvertime(false);
                }
              }}
              className="space-y-3"
            >
              {editingOvertime || otMode === 'individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Karyawan Pelaksana Lembur *
                  </label>
                  <select
                    required
                    value={otForm.employee_id ?? ''}
                    onChange={(e) => setOtForm({ ...otForm, employee_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nip} - {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2 bg-purple-50/40 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-200/80 dark:border-purple-900/60">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Nama Tim / Nama Proyek SPKL (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tim Pengecoran Batching Plant II / Tim Closing Gudang"
                      value={otGroupName}
                      onChange={(e) => setOtGroupName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Filter Divisi Karyawan
                      </label>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
                        Terpilih: {otSelectedEmpIds.length} Karyawan
                      </span>
                    </div>
                    <select
                      value={otDivFilter}
                      onChange={(e) => setOtDivFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white mb-2"
                    >
                      <option value="all">Semua Divisi ({employees.length} Karyawan)</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          Divisi {d.division_name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = employees
                            .filter((e) => (otDivFilter === 'all' ? true : e.division_id === otDivFilter))
                            .map((e) => e.id);
                          setOtSelectedEmpIds(Array.from(new Set([...otSelectedEmpIds, ...filteredIds])));
                        }}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        ✓ Pilih Semua (Divisi Ini)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtSelectedEmpIds([])}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        ✗ Batalkan Semua
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Cari nama / NIP karyawan..."
                      value={otSearchEmp}
                      onChange={(e) => setOtSearchEmp(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white mb-2"
                    />

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 dark:border-[#27272a] rounded-xl p-2 bg-white dark:bg-[#121215]">
                      {employees
                        .filter((emp) => {
                          const matchDiv = otDivFilter === 'all' || emp.division_id === otDivFilter;
                          const matchSearch =
                            !otSearchEmp ||
                            emp.full_name.toLowerCase().includes(otSearchEmp.toLowerCase()) ||
                            emp.nip.toLowerCase().includes(otSearchEmp.toLowerCase());
                          return matchDiv && matchSearch;
                        })
                        .map((emp) => {
                          const isChecked = otSelectedEmpIds.includes(emp.id);
                          const div = divisions.find((d) => d.id === emp.division_id);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                                  : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setOtSelectedEmpIds([...otSelectedEmpIds, emp.id]);
                                    } else {
                                      setOtSelectedEmpIds(otSelectedEmpIds.filter((id) => id !== emp.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <div>
                                  <div className="font-bold">{emp.full_name}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    NIP: {emp.nip} • {div?.division_name || '-'}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Pelaksanaan Lembur *
                </label>
                <DateInput
                  required
                  value={otForm.overtime_date || ''}
                  onChange={(v) => setOtForm({ ...otForm, overtime_date: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai *
                  </label>
                  <TimeInput
                    required
                    value={otForm.time_start || '17:00'}
                    onChange={(v) => handleOtTimeStartChange(v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai *
                  </label>
                  <TimeInput
                    required
                    value={otForm.time_end || '20:00'}
                    onChange={(v) => handleOtTimeEndChange(v)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total Jam Lembur
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    ⚡ Terhitung Otomatis
                  </span>
                </div>
                <input
                  type="number"
                  readOnly
                  value={otForm.total_hours ?? 1}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b]/60 text-slate-900 dark:text-white font-mono font-bold cursor-not-allowed select-none opacity-90 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                  * Dihitung otomatis berdasarkan selisih jam mulai dan jam selesai lembur.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Tugas / Proyek Pengecoran *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Lembur pengecoran slab beton Proyek Tol Seksi II..."
                  value={otForm.reason || ''}
                  onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingOvertime}
                  onClick={() => {
                    setShowOvertimeModal(false);
                    setEditingOvertime(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOvertime}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingOvertime && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingOvertime ? 'Menerbitkan...' : (editingOvertime ? 'Simpan Perubahan' : 'Terbitkan SPKL')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU SURAT SAKIT / RESEP DOKTER */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#27272a]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Lampiran Surat Sakit / Resep Dokter
              </h3>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center max-h-[70vh] overflow-auto">
              {selectedAttachment.startsWith('data:image') ? (
                <img src={selectedAttachment} alt="Dokumen Surat Sakit" className="max-w-full rounded-xl object-contain shadow-md" />
              ) : (
                <a
                  href={selectedAttachment}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl hover:bg-sky-500"
                >
                  Buka Document / File Lampiran
                </a>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAttachment(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-[#27272a] text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-[#323238]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Setting Kuota Cuti Karyawan */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-500" />
                {selectedBalanceForEdit ? 'Sesuaikan Kuota Cuti Karyawan' : 'Setting Kuota Cuti Karyawan'}
              </h2>
              <button
                onClick={() => setShowQuotaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              {/* Target Karyawan: Perorangan vs General/Semua Karyawan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Target Penerapan Kuota *
                </label>

                {!selectedBalanceForEdit && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setIsBulkSetting(false)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                        !isBulkSetting
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Per Karyawan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkSetting(true)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                        isBulkSetting
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                          : 'border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>General (Semua Karyawan)</span>
                    </button>
                  </div>
                )}

                {isBulkSetting ? (
                  <div className="px-3.5 py-2.5 text-xs rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-800 dark:text-purple-300 font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-500" />
                    <span>
                      Berlaku untuk <strong>SEMUA karyawan ({employees.length} orang)</strong> aktif di perusahaan.
                    </span>
                  </div>
                ) : selectedBalanceForEdit ? (
                  <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-bold text-slate-900 dark:text-white">
                    {selectedBalanceForEdit.employee_nip} - {selectedBalanceForEdit.employee_name} ({selectedBalanceForEdit.division_name || '-'})
                  </div>
                ) : (
                  <select
                    value={quotaSelectedEmpId}
                    onChange={(e) => setQuotaSelectedEmpId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-medium"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nip} - {emp.full_name} ({emp.division_name || '-'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Kalender *
                  </label>
                  <input
                    type="number"
                    required
                    min={2020}
                    max={2035}
                    value={quotaEditYear}
                    onChange={(e) => setQuotaEditYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Kuota (Hari) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={60}
                    value={quotaEditValue}
                    onChange={(e) => setQuotaEditValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {selectedBalanceForEdit && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Cuti Sudah Terpakai:</span>
                    <span className="font-bold text-amber-500">{selectedBalanceForEdit.used_days} Hari</span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-200 dark:border-[#27272a]">
                    <span>Estimasi Sisa Saldo Baru:</span>
                    <span className="text-emerald-500 font-black">
                      {Math.max(0, quotaEditValue - selectedBalanceForEdit.used_days)} Hari
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Standar hak cuti tahunan menurut regulasi UU Ketenagakerjaan No. 13/2003 adalah <strong>12 hari kerja</strong>. Anda dapat memberikan kuota lebih untuk loyalitas masa kerja, grade manajerial, atau kompensasi khusus.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingQuota}
                  onClick={() => setShowQuotaModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18181b] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuota}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingQuota && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingQuota ? 'Menyimpan...' : 'Simpan Kuota'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <ConfirmActionModal
          isOpen={!!deleteConfirmTarget}
          onClose={() => !isDeleting && setDeleteConfirmTarget(null)}
          onConfirm={handleExecuteDelete}
          loading={isDeleting}
          variant="danger"
          title={deleteConfirmTarget.type === 'leave' ? 'Hapus Pengajuan Cuti / Izin' : 'Hapus SPKL Lembur'}
          description={`Apakah Anda yakin ingin menghapus data pengajuan ini secara permanen dari basis data? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus Data"
          cancelLabel="Batal"
          details={[
            { label: 'ID Record', value: `#${deleteConfirmTarget.id}` },
            { label: 'Karyawan', value: deleteConfirmTarget.name },
            { label: 'Keterangan', value: deleteConfirmTarget.detail },
          ]}
        />
      )}
    </div>
  );
};
