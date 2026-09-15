import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Building2,
  Calendar,
  Table,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Server,
  FileCode,
  KeyRound,
  Copy,
  Check,
  Download,
  CloudUpload,
  CloudDownload,
  Globe,
  Eye,
  EyeOff,
  X,
  Search,
  Edit2,
  Upload,
  Clipboard,
  FileCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Filter,
  RotateCcw,
  Info,
  Bell,
  Sparkles,
} from 'lucide-react';
import { CompanyProfile, Holiday, DatabaseConfig, User, Employee } from '../types';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { getContrastTextColorStyle, getAccessibleAccentColor } from '../lib/companyUtils';
import { api } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/formatUtils';
import { CompanyProfileManager } from '../components/CompanyProfileManager';
import { UserManagementManager } from '../components/UserManagementManager';

interface SystemDbConfigViewProps {
  initialSubTab?: 'db_connection' | 'table_explorer' | 'user_management';
  company?: CompanyProfile;
  companies?: CompanyProfile[];
  holidays?: Holiday[];
  users?: User[];
  employees?: Employee[];
  dbConfig: DatabaseConfig;
  accentColor: string;
  isDarkMode?: boolean;
  onUpdateCompany?: (data: Partial<CompanyProfile>) => Promise<any>;
  onSelectCompany?: (id: number) => Promise<any>;
  onAddCompany?: (data: Partial<CompanyProfile>) => Promise<any>;
  onDeleteCompany?: (id: number) => Promise<any>;
  onUploadLogo?: (imageBase64: string, companyId?: number) => Promise<any>;
  onAddHoliday?: (data: Partial<Holiday>) => Promise<any>;
  onUpdateHoliday?: (id: number, data: Partial<Holiday>) => Promise<any>;
  onDeleteHoliday?: (id: number) => Promise<any>;
  onSyncHolidays?: (year?: number) => Promise<any>;
  onSaveDbConfig: (data: Partial<DatabaseConfig>) => Promise<any>;
  onTestDbConnection: (data: Partial<DatabaseConfig>) => Promise<any>;
  onInitDbSchema: () => Promise<any>;
  onSyncPull?: () => Promise<any>;
  onSyncPush?: () => Promise<any>;
  onGetDdl?: () => Promise<any>;
  onFetchTableData: (tableName: string) => Promise<any>;
  onAddUser?: (data: Partial<User>) => Promise<any>;
  onUpdateUser?: (id: number, data: Partial<User>) => Promise<any>;
  onDeleteUser?: (id: number) => Promise<any>;
  onResetOperatingData?: () => Promise<any>;
}

export const SystemDbConfigView: React.FC<SystemDbConfigViewProps> = ({
  initialSubTab,
  company,
  companies = [],
  holidays = [],
  users = [],
  employees = [],
  dbConfig,
  accentColor,
  isDarkMode = true,
  onUpdateCompany,
  onSelectCompany,
  onAddCompany,
  onDeleteCompany,
  onUploadLogo,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onSyncHolidays,
  onSaveDbConfig,
  onTestDbConnection,
  onInitDbSchema,
  onSyncPull,
  onSyncPush,
  onGetDdl,
  onFetchTableData,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetOperatingData,
}) => {
  const accessibleColor = useMemo(
    () => getAccessibleAccentColor(accentColor, isDarkMode !== false),
    [accentColor, isDarkMode]
  );
  const [subTab, setSubTab] = useState<'db_connection' | 'table_explorer' | 'user_management'>(
    initialSubTab === 'table_explorer' ? 'table_explorer' : (initialSubTab === 'user_management' ? 'user_management' : 'db_connection')
  );

  useEffect(() => {
    if (initialSubTab === 'table_explorer' || initialSubTab === 'db_connection' || initialSubTab === 'user_management') {
      setSubTab(initialSubTab);
    } else {
      setSubTab('db_connection');
    }
  }, [initialSubTab]);

  // Company Profile Form
  const [compForm, setCompForm] = useState<CompanyProfile>({
    ...company,
    company_name: company?.company_name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    website: (company as any)?.website || '',
    address: company?.address || '',
  });

  useEffect(() => {
    if (company) {
      setCompForm((prev) => ({
        ...prev,
        ...company,
        company_name: company.company_name || prev.company_name || '',
        email: company.email || prev.email || '',
        phone: company.phone || prev.phone || '',
        website: (company as any).website || prev.website || '',
        address: company.address || prev.address || '',
      }));
    }
  }, [company]);

  // Holiday Form & State
  const [holidayForm, setHolidayForm] = useState({ holiday_date: '', holiday_name: '', is_joint_leave: false });
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [holidaySearch, setHolidaySearch] = useState('');
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [holidaySyncMsg, setHolidaySyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // DB Config Form
  const [cfgForm, setCfgForm] = useState<DatabaseConfig>(() => {
    const cachedCa = typeof window !== 'undefined' ? localStorage.getItem('nku_ca_certificate') : '';
    return {
      ...dbConfig,
      host: dbConfig?.host || '',
      port: dbConfig?.port || 14389,
      user: dbConfig?.user || (dbConfig as any)?.username || '',
      password: dbConfig?.password || (dbConfig as any)?.password_plain || '',
      database: dbConfig?.database || (dbConfig as any)?.database_name || '',
      ssl_mode: dbConfig?.ssl_mode || 'REQUIRED',
      ca_certificate: (dbConfig as any)?.ca_certificate || (dbConfig as any)?.ssl_ca_cert_name || cachedCa || '',
    };
  });

  const [showDbPassword, setShowDbPassword] = useState(false);

  useEffect(() => {
    if (dbConfig) {
      const cachedCa = typeof window !== 'undefined' ? localStorage.getItem('nku_ca_certificate') : '';
      setCfgForm((prev) => ({
        ...prev,
        ...dbConfig,
        host: dbConfig.host || prev.host || '',
        port: dbConfig.port || prev.port || 14389,
        user: dbConfig.user || (dbConfig as any).username || prev.user || '',
        password: dbConfig.password || (dbConfig as any).password_plain || prev.password || '',
        database: dbConfig.database || (dbConfig as any).database_name || prev.database || '',
        ssl_mode: dbConfig.ssl_mode || prev.ssl_mode || 'REQUIRED',
        ca_certificate: (dbConfig as any).ca_certificate || prev.ca_certificate || cachedCa || (dbConfig as any).ssl_ca_cert_name || '',
      }));
    }
  }, [dbConfig]);

  // Testing & Operations state
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [seeding, setSeeding] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [wipingHandover, setWipingHandover] = useState(false);
  const [opNotice, setOpNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Floating Toast Notifications System for Database Operations
  interface DbToastItem {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    timestamp: string;
    table?: string;
  }
  const [toasts, setToasts] = useState<DbToastItem[]>([]);

  const notify = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
    table?: string
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newToast: DbToastItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      title,
      message,
      timestamp: timeStr,
      table,
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    setOpNotice({
      type: type === 'warning' ? 'error' : type,
      text: `${title}: ${message}`,
    });

    // Auto-dismiss individual toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // DDL State & Modal
  const [showDdlModal, setShowDdlModal] = useState(false);
  const [ddlContent, setDdlContent] = useState<string>('');
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [loadingDdl, setLoadingDdl] = useState(false);

  // Table Explorer
  const [selectedTable, setSelectedTable] = useState<string>('employees');
  const [tableData, setTableData] = useState<{ columns: any[]; rows: any[] } | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);

  // Table Explorer Sorting, Filtering & Pagination State
  const [tableSearchFilter, setTableSearchFilter] = useState('');
  const [rowSearchFilter, setRowSearchFilter] = useState('');
  const [columnFilterKey, setColumnFilterKey] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Table Explorer CRUD & Sync State
  const [showRowModal, setShowRowModal] = useState(false);
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [activeRowId, setActiveRowId] = useState<any>(null);
  const [rowFormData, setRowFormData] = useState<Record<string, any>>({});
  const [savingRow, setSavingRow] = useState(false);
  const [syncingTable, setSyncingTable] = useState(false);

  // Universal Database Confirmation Modal State
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

  // Auto-dismiss notices & connection results after 4 seconds (Request 6 & Pict 4)
  useEffect(() => {
    if (opNotice) {
      const timer = setTimeout(() => setOpNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [opNotice]);

  useEffect(() => {
    if (testResult) {
      const timer = setTimeout(() => setTestResult(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

  useEffect(() => {
    if (saveSuccessMsg) {
      const timer = setTimeout(() => setSaveSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccessMsg]);

  // Handle ESC key to exit popups/modals (Request 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDdlModal) setShowDdlModal(false);
        if (showRowModal) setShowRowModal(false);
        if (confirmModal.isOpen) setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDdlModal, showRowModal, confirmModal.isOpen]);

  const DEFAULT_TABLES_LIST = [
    { name: 'company_profile', label: 'Profil Perusahaan', rows: 1 },
    { name: 'roles', label: 'Peran Akses (RBAC)', rows: 6 },
    { name: 'permissions', label: 'Hak Akses Modul (Permissions)', rows: 12 },
    { name: 'role_permissions', label: 'Pemetaan Hak Akses Role', rows: 24 },
    { name: 'users', label: 'User Login & Kredensial', rows: 4 },
    { name: 'divisions', label: 'Master Divisi', rows: 4 },
    { name: 'job_grades', label: 'Master Golongan', rows: 4 },
    { name: 'employees', label: 'Master Karyawan (NIP & QR)', rows: 10 },
    { name: 'work_schedules', label: 'Template Jadwal Kerja', rows: 4 },
    { name: 'schedule_plots', label: 'Plotting Jadwal', rows: 3 },
    { name: 'company_holidays', label: 'Hari Libur & Cuti Bersama', rows: 25 },
    { name: 'company_locations', label: 'Titik Lokasi Kantor & Geofence GPS', rows: 5 },
    { name: 'attendance_logs', label: 'Log Presensi Realtime & GPS', rows: 17 },
    { name: 'leave_types', label: 'Master Tipe Cuti / Izin', rows: 4 },
    { name: 'leave_balances', label: 'Saldo Kuota Cuti Karyawan', rows: 8 },
    { name: 'leave_requests', label: 'Pengajuan Cuti & Sakit', rows: 4 },
    { name: 'overtime_requests', label: 'SPKL Lembur', rows: 3 },
    { name: 'shift_swap_requests', label: 'Permintaan Tukar Shift', rows: 0 },
    { name: 'official_letters', label: 'Surat Peringatan & PHK', rows: 3 },
    { name: 'overtime_rules', label: 'Rule Mapping Lembur', rows: 3 },
    { name: 'deduction_rules', label: 'Rule Mapping Potongan', rows: 3 },
    { name: 'allowance_rules', label: 'Rule Mapping Tunjangan', rows: 3 },
    { name: 'payroll_periods', label: 'Master Periode Penggajian', rows: 2 },
    { name: 'payroll_slips', label: 'Slip Gaji Terbit', rows: 2 },
    { name: 'payroll_slip_items', label: 'Item Rincian Slip Gaji', rows: 6 },
    { name: 'db_configs', label: 'Konfigurasi MySQL Terdaftar', rows: 1 },
    { name: 'db_sync_logs', label: 'Log Sinkronisasi Database', rows: 1 },
    { name: 'audit_logs', label: 'Catatan Audit Sistem', rows: 1 },
  ];

  const [tablesList, setTablesList] = useState(DEFAULT_TABLES_LIST);

  useEffect(() => {
    if (subTab === 'table_explorer') {
      fetch('/api/db/tables')
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.tables)) {
            setTablesList((prev) => {
              return data.tables.map((t: any) => {
                const existing = prev.find((p) => p.name === t.name);
                return {
                  name: t.name,
                  label: existing?.label || t.comment || t.name,
                  rows: t.rows ?? (existing?.rows || 0),
                };
              });
            });
          }
        })
        .catch(() => {});
    }
  }, [subTab]);

  // 1. DDL FETCH & COPY
  const handleFetchDdl = async () => {
    setLoadingDdl(true);
    try {
      if (onGetDdl) {
        const res = await onGetDdl();
        setDdlContent(res.ddl || '');
      } else {
        const res = await fetch('/api/db/ddl');
        const json = await res.json();
        setDdlContent(json.ddl || '');
      }
    } catch {
      setDdlContent('-- Skema DDL Database nku_hr_schema.sql');
    } finally {
      setLoadingDdl(false);
    }
  };

  const handleCopyDdlQuick = async () => {
    try {
      let content = ddlContent;
      if (!content) {
        if (onGetDdl) {
          const res = await onGetDdl();
          content = res.ddl || '';
        } else {
          const res = await fetch('/api/db/ddl');
          const json = await res.json();
          content = json.ddl || '';
        }
        setDdlContent(content);
      }
      await navigator.clipboard.writeText(content);
      setCopiedDdl(true);
      notify('success', 'DDL Database Disalin', 'Skema DDL Database 27 tabel lengkap (nku_hr_schema.sql) berhasil disalin ke clipboard.');
      setTimeout(() => setCopiedDdl(false), 3000);
    } catch {
      notify('error', 'Gagal Menyalin DDL', 'Tidak dapat menyalin ke clipboard. Silakan buka modal Lihat DDL untuk menyalin manual.');
    }
  };

  const handleOpenDdlModal = async () => {
    setShowDdlModal(true);
    if (!ddlContent) {
      await handleFetchDdl();
    }
  };

  const handleDownloadDdl = () => {
    try {
      const blob = new Blob([ddlContent], { type: 'text/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nku_hr_schema.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('info', 'Unduhan DDL Dimulai', 'File skema database nku_hr_schema.sql berhasil diunduh.');
    } catch (err: any) {
      notify('error', 'Gagal Mengunduh DDL', err.message || 'Terjadi kesalahan saat mengunduh file DDL.');
    }
  };

  // SSL CERTIFICATE HANDLERS (Tri-Layer Persistence: LocalStorage, Server State, & Remote Database)
  const handleUploadCertFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = (event.target?.result as string) || '';
      if (text) {
        const cleanCert = text.trim();
        setCfgForm((prev) => ({ ...prev, ca_certificate: cleanCert }));
        try {
          localStorage.setItem('nku_ca_certificate', cleanCert);
        } catch {}
        try {
          await api.uploadSslCert('ca', cleanCert, file.name);
          await onSaveDbConfig({ ...cfgForm, ca_certificate: cleanCert });
          notify('success', 'Sertifikat SSL CA Terpasang & Disimpan Permanen', `File '${file.name}' (${cleanCert.length} karakter) berhasil disimpan secara permanen di server, database, dan penyimpanan lokal.`);
        } catch {
          notify('success', 'Sertifikat SSL CA Terpasang di Form', `File '${file.name}' berhasil dimuat ke konfigurasi. Klik 'Simpan Konfigurasi Database' untuk sinkronisasi live.`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteCertFromClipboard = async () => {
    let clipText = '';
    try {
      clipText = await navigator.clipboard.readText();
    } catch {
      clipText = prompt('Tempelkan isi Sertifikat CA (.pem):') || '';
    }
    if (clipText && clipText.trim()) {
      const cleanCert = clipText.trim();
      setCfgForm((prev) => ({ ...prev, ca_certificate: cleanCert }));
      try {
        localStorage.setItem('nku_ca_certificate', cleanCert);
      } catch {}
      try {
        await api.uploadSslCert('ca', cleanCert, 'pasted-ca-cert.pem');
        await onSaveDbConfig({ ...cfgForm, ca_certificate: cleanCert });
        notify('success', 'Sertifikat SSL CA Ditempelkan & Disimpan Permanen', `Sertifikat SSL CA (${cleanCert.length} karakter) berhasil disimpan permanen ke server, database, dan penyimpanan lokal.`);
      } catch {
        notify('success', 'Sertifikat SSL CA Ditempelkan', `Sertifikat SSL CA (${cleanCert.length} karakter) berhasil ditempelkan ke form konfigurasi.`);
      }
    } else {
      notify('warning', 'Clipboard Kosong', 'Silakan salin sertifikat SSL CA (.pem) terlebih dahulu ke clipboard.');
    }
  };

  // 2. SEEDING DATABASE (Requirement 3 & 4: Popup konfirmasi & Seeder fix)
  const handleSeedDatabase = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Jalankan Database Seeder & Eksekusi DDL',
      description: 'Aksi ini akan mengeksekusi skema 27 tabel lengkap (nku_hr_schema.sql) dan menginisialisasi master data SDM (NIP & QR Code), jadwal kerja, cuti, dan payroll di database.',
      confirmLabel: 'Mulai Seeding',
      variant: 'warning',
      details: [
        { label: 'Target Server', value: `${cfgForm.host || '127.0.0.1'}:${cfgForm.port || 3306}` },
        { label: 'Database', value: cfgForm.database || (cfgForm as any).database_name || 'defaultdb' },
        { label: 'Cakupan', value: '27 Tabel DDL & Master Seed Data' },
      ],
      onConfirm: async () => {
        setSeeding(true);
        try {
          const res = await onInitDbSchema();
          if (res && res.success !== false) {
            notify('success', 'Database Seeding Berhasil', res.message || '27 Tabel skema DDL & master seed data berhasil dieksekusi secara LIVE di database MySQL online.');
            // Refresh table explorer
            if (subTab === 'table_explorer') {
              handleLoadTable(selectedTable);
            }
          } else {
            notify('error', 'Database Seeding Gagal', res?.message || 'Gagal mengeksekusi seeder ke database online.');
          }
        } catch (err: any) {
          notify('error', 'Database Seeding Gagal', 'Seeding gagal: ' + (err.message || 'Terjadi kesalahan sistem saat eksekusi DDL.'));
        } finally {
          setSeeding(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 3. PUSH DATA (Requirement 3 & 4: Popup konfirmasi & Push fix)
  const handlePushData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Push Data Aplikasi ke Database Live MySQL',
      description: 'Aksi ini akan mengirimkan dan menyelaraskan seluruh data lokal aplikasi (karyawan, divisi, golongan, hari libur) ke database live MySQL via INSERT ... ON DUPLICATE KEY UPDATE.',
      confirmLabel: 'Kirim Data (Push)',
      variant: 'primary',
      details: [
        { label: 'Tujuan Host', value: cfgForm.host || '127.0.0.1' },
        { label: 'Database', value: cfgForm.database || (cfgForm as any).database_name || 'defaultdb' },
        { label: 'Entitas', value: 'Master Karyawan, Divisi, Golongan, Libur, Jadwal' },
      ],
      onConfirm: async () => {
        setPushing(true);
        try {
          let res;
          if (onSyncPush) {
            res = await onSyncPush();
          } else {
            const fetchRes = await fetch('/api/db/sync-push', { method: 'POST' });
            res = await fetchRes.json();
          }
          notify('success', 'Sinkronisasi Push Berhasil', res.message || 'Seluruh data master aplikasi berhasil di-push ke database MySQL live.');
        } catch (err: any) {
          notify('error', 'Gagal Push Data', 'Gagal push data: ' + (err.message || 'Koneksi database terputus saat push.'));
        } finally {
          setPushing(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 4b. HANDOVER DATABASE WIPE (Khusus Super Admin)
  const handleWipeForHandoverAction = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ KOSONGKAN DATABASE (SERAH TERIMA PROYEK)',
      description: 'Aksi ini akan MENGHAPUS SELURUH DATA OPERASIONAL DATABASE (Karyawan, Presensi, Jadwal, Cuti, Lembur, Slip Gaji, Libur). \n\nKECUALI: 6 Akun User Manager Aplikasi & Hak Akses Peran (Pict 1), Profil Perusahaan, dan Konfigurasi Database AKAN TETAP DIPERTAHANKAN untuk keperluan serah terima proyek.',
      confirmLabel: 'Ya, Kosongkan Semua Data Operasional',
      variant: 'danger',
      details: [
        { label: 'Akses Khusus', value: 'Peran Super Admin' },
        { label: 'Tabel Dipertahankan', value: 'users (6 Manager Account), roles (RBAC), company_profile, db_configs' },
        { label: 'Tabel Dikosongkan', value: '27 Tabel Operasional Database' },
      ],
      onConfirm: async () => {
        setWipingHandover(true);
        try {
          const res = await api.wipeDatabaseForHandover();
          if (res.success) {
            notify('success', 'Database Operasional Dikosongkan', res.message || 'Seluruh isi tabel operasional berhasil dikosongkan! 6 Akun manager aplikasi tetap aktif.');
            if (onInitDbSchema) {
              await onInitDbSchema();
            }
          } else {
            notify('error', 'Gagal Mengosongkan Database', res.message || 'Terjadi kesalahan saat mengosongkan database.');
          }
        } catch (err: any) {
          notify('error', 'Gagal Mengosongkan Database', err.message || 'Koneksi database terputus.');
        } finally {
          setWipingHandover(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 4. PULL DATA (Requirement 3 & 4: Popup konfirmasi & Pull fix)
  const handlePullData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Tarik Data (Pull) dari Database Live MySQL',
      description: 'Aksi ini akan mengambil rekaman data terbaru dari database remote MySQL dan memperbarui penyimpanan cache data lokal aplikasi. Lanjutkan?',
      confirmLabel: 'Tarik Data (Pull)',
      variant: 'warning',
      details: [
        { label: 'Sumber Host', value: cfgForm.host || '127.0.0.1' },
        { label: 'Database', value: cfgForm.database || (cfgForm as any).database_name || 'defaultdb' },
      ],
      onConfirm: async () => {
        setPulling(true);
        try {
          let res;
          if (onSyncPull) {
            res = await onSyncPull();
          } else {
            const fetchRes = await fetch('/api/db/sync-pull', { method: 'POST' });
            res = await fetchRes.json();
          }
          notify('success', 'Sinkronisasi Pull Berhasil', res.message || 'Data live dari database MySQL berhasil ditarik dan disinkronkan ke aplikasi!');
        } catch (err: any) {
          notify('error', 'Gagal Pull Data', 'Gagal pull data: ' + (err.message || 'Koneksi database terputus saat pull.'));
        } finally {
          setPulling(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 5. TEST CONNECTION
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestDbConnection(cfgForm);
      const isOk = res.success !== false;
      const msg = res.message || (isOk ? 'Koneksi ke MySQL database berhasil diverifikasi.' : 'Koneksi gagal diverifikasi.');
      setTestResult({
        success: isOk,
        message: msg,
      });
      if (isOk) {
        notify('success', 'Koneksi Database Berhasil', msg);
      } else {
        notify('error', 'Koneksi Database Gagal', msg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Gagal tersambung ke database MySQL. Periksa kredensial host, port, user, atau sertifikat SSL.';
      setTestResult({
        success: false,
        message: errMsg,
      });
      notify('error', 'Koneksi Database Gagal', errMsg);
    } finally {
      setTesting(false);
    }
  };

  // 6. SAVE DB CONFIG (Requirement 4: Popup konfirmasi)
  const handleSaveDb = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: 'Simpan Konfigurasi Database',
      description: 'Apakah Anda yakin ingin menyimpan perubahan konfigurasi database ini ke database (tabel db_configs) dan penyimpanan server?',
      confirmLabel: 'Simpan Konfigurasi',
      variant: 'primary',
      details: [
        { label: 'Host', value: cfgForm.host || '-' },
        { label: 'Port', value: String(cfgForm.port || 3306) },
        { label: 'Username', value: cfgForm.user || (cfgForm as any).username || '-' },
        { label: 'Database', value: cfgForm.database || (cfgForm as any).database_name || '-' },
        { label: 'Mode SSL', value: cfgForm.ssl_mode || 'REQUIRED' },
        { label: 'Sertifikat CA', value: cfgForm.ca_certificate ? `Terpasang (${cfgForm.ca_certificate.length} bytes)` : 'Tidak Ada' },
      ],
      onConfirm: async () => {
        setSavingDb(true);
        setSaveSuccessMsg(null);
        try {
          const res = await onSaveDbConfig(cfgForm);
          const msg = res.message || 'Konfigurasi database berhasil disimpan ke database (tabel db_configs)!';
          setSaveSuccessMsg(msg);
          notify('success', 'Konfigurasi Database Disimpan', msg);
          setTimeout(() => setSaveSuccessMsg(null), 5000);
        } catch (err: any) {
          notify('error', 'Gagal Menyimpan Konfigurasi', err.message || 'Terjadi kesalahan saat menyimpan konfigurasi.');
        } finally {
          setSavingDb(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 7. SYNC HOLIDAYS FROM INTERNET (Requirement 4: Popup konfirmasi)
  const handleSyncHolidaysAction = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Hari Libur Nasional & Cuti Bersama',
      description: 'Aksi ini akan mengambil data hari libur resmi Indonesia dari API kalender dan menyimpannya ke database.',
      confirmLabel: 'Mulai Sinkronisasi',
      variant: 'primary',
      onConfirm: async () => {
        setSyncingHolidays(true);
        setHolidaySyncMsg(null);
        try {
          let res;
          if (onSyncHolidays) {
            res = await onSyncHolidays();
          } else {
            const fetchRes = await fetch('/api/holidays/sync', { method: 'POST' });
            res = await fetchRes.json();
          }
          const msg = res.message || `Berhasil sinkronisasi ${res.count || holidays.length} hari libur nasional dan cuti bersama!`;
          setHolidaySyncMsg({
            type: 'success',
            text: msg,
          });
          notify('success', 'Sinkronisasi Hari Libur Selesai', msg, 'company_holidays');
        } catch (err: any) {
          const errMsg = 'Gagal sinkronisasi hari libur: ' + (err.message || 'Gagal menghubungi server.');
          setHolidaySyncMsg({
            type: 'error',
            text: errMsg,
          });
          notify('error', 'Gagal Sinkronisasi Hari Libur', errMsg, 'company_holidays');
        } finally {
          setSyncingHolidays(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLoadTable = async (tbl: string) => {
    setSelectedTable(tbl);
    setLoadingTable(true);
    setCurrentPage(1);
    try {
      const data = await onFetchTableData(tbl);
      setTableData(data);
    } catch {
      setTableData(null);
    } finally {
      setLoadingTable(false);
    }
  };

  const handleSortColumn = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleResetFiltersAndSort = () => {
    setRowSearchFilter('');
    setColumnFilterKey('all');
    setSortColumn(null);
    setSortDirection(null);
    setCurrentPage(1);
  };

  const filteredTablesList = useMemo(() => {
    if (!tableSearchFilter.trim()) return tablesList;
    const q = tableSearchFilter.toLowerCase().trim();
    return tablesList.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.label && t.label.toLowerCase().includes(q))
    );
  }, [tablesList, tableSearchFilter]);

  const availableColumns = useMemo(() => {
    if (!tableData?.rows || tableData.rows.length === 0) return [];
    return Object.keys(tableData.rows[0]);
  }, [tableData]);

  const filteredAndSortedRows = useMemo(() => {
    if (!tableData || !tableData.rows || !Array.isArray(tableData.rows)) return [];
    let rows = [...tableData.rows];

    // Filter by search query
    if (rowSearchFilter.trim()) {
      const q = rowSearchFilter.toLowerCase().trim();
      rows = rows.filter((r) => {
        if (columnFilterKey && columnFilterKey !== 'all' && r[columnFilterKey] !== undefined) {
          const val = r[columnFilterKey];
          return String(val ?? '').toLowerCase().includes(q);
        }
        return Object.values(r).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        );
      });
    }

    // Sort by column
    if (sortColumn && sortDirection) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;

        // Numeric comparison
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // Date comparison
        if (typeof valA === 'string' && typeof valB === 'string' && valA.length >= 8 && valB.length >= 8) {
          const timeA = Date.parse(valA);
          const timeB = Date.parse(valB);
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
          }
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [tableData, rowSearchFilter, columnFilterKey, sortColumn, sortDirection]);

  const totalPages = pageSize > 0 ? Math.ceil(filteredAndSortedRows.length / pageSize) || 1 : 1;
  const paginatedRows = useMemo(() => {
    if (pageSize <= 0) return filteredAndSortedRows;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  // TABLE EXPLORER CRUD & SYNC HANDLERS (Requirement 5: CRUD & Syncron per tabel)
  const handleOpenAddRow = () => {
    const cols = tableData?.columns || (tableData?.rows?.[0] ? Object.keys(tableData.rows[0]) : ['name']);
    const initial: Record<string, any> = {};
    cols.forEach((col: any) => {
      const colName = typeof col === 'string' ? col : col.name;
      if (colName !== 'id') {
        initial[colName] = '';
      }
    });
    setRowFormData(initial);
    setIsEditingRow(false);
    setActiveRowId(null);
    setShowRowModal(true);
  };

  const handleOpenEditRow = (row: any) => {
    const dataCopy = { ...row };
    setRowFormData(dataCopy);
    setIsEditingRow(true);
    setActiveRowId(row.id);
    setShowRowModal(true);
  };

  const handleSaveRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = isEditingRow;
    const rowId = activeRowId;
    setConfirmModal({
      isOpen: true,
      title: `${isEdit ? 'Perbarui Baris Data' : 'Tambah Baris Baru'}: ${selectedTable}`,
      description: `Data ini akan langsung ditulis ke database aplikasi dan live MySQL (tabel ${selectedTable}). Lanjutkan?`,
      confirmLabel: isEdit ? 'Simpan Perubahan' : 'Tambah Baris',
      variant: 'primary',
      details: [
        { label: 'Tabel Target', value: selectedTable },
        ...(isEdit && rowId !== null ? [{ label: 'ID Rekaman', value: String(rowId) }] : []),
      ],
      onConfirm: async () => {
        setSavingRow(true);
        try {
          if (isEdit && rowId !== null) {
            await api.updateTableRow(selectedTable, Number(rowId), rowFormData);
            notify('success', `Baris #${rowId} Diperbarui`, `Data baris pada tabel '${selectedTable}' berhasil diperbarui di database!`, selectedTable);
          } else {
            await api.addTableRow(selectedTable, rowFormData);
            notify('success', 'Baris Baru Ditambahkan', `Baris data baru berhasil disimpan ke tabel '${selectedTable}' di database!`, selectedTable);
          }
          setShowRowModal(false);
          await handleLoadTable(selectedTable);
        } catch (err: any) {
          notify('error', 'Gagal Menyimpan Baris Data', err.message || 'Terjadi kesalahan saat menulis data ke database.', selectedTable);
        } finally {
          setSavingRow(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteRowAction = (row: any) => {
    const rowId = row.id;
    setConfirmModal({
      isOpen: true,
      title: `Hapus Baris dari Tabel: ${selectedTable}`,
      description: `Apakah Anda yakin ingin menghapus baris dengan ID ${rowId} dari tabel '${selectedTable}'? Tindakan ini akan menghapus data permanen.`,
      confirmLabel: 'Hapus Baris',
      variant: 'danger',
      details: [
        { label: 'Tabel', value: selectedTable },
        { label: 'ID Baris', value: String(rowId) },
        ...Object.keys(row).slice(1, 4).map((k) => ({ label: k, value: String(row[k] ?? '') })),
      ],
      onConfirm: async () => {
        try {
          await api.deleteTableRow(selectedTable, Number(rowId));
          notify('success', `Baris #${rowId} Dihapus`, `Baris data ID ${rowId} pada tabel '${selectedTable}' telah dihapus permanen.`, selectedTable);
          await handleLoadTable(selectedTable);
        } catch (err: any) {
          notify('error', 'Gagal Menghapus Baris', err.message || 'Terjadi kesalahan saat menghapus data.', selectedTable);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSyncTableAction = () => {
    setConfirmModal({
      isOpen: true,
      title: `Sinkronkan Tabel: ${selectedTable}`,
      description: `Aksi ini akan menyelaraskan data lokal tabel '${selectedTable}' dengan tabel live di database MySQL (INSERT ... ON DUPLICATE KEY UPDATE).`,
      confirmLabel: 'Sinkronkan Tabel',
      variant: 'primary',
      details: [
        { label: 'Tabel', value: selectedTable },
        { label: 'Jumlah Baris', value: String(tableData?.rows?.length || 0) },
      ],
      onConfirm: async () => {
        setSyncingTable(true);
        try {
          const res = await api.syncTable(selectedTable);
          if (res.success) {
            const msg = res.message + (res.remoteError ? ` (Peringatan: ${res.remoteError})` : '');
            notify('success', `Sinkronisasi Tabel '${selectedTable}' Berhasil`, msg, selectedTable);
          } else {
            notify('error', `Gagal Sinkron Tabel '${selectedTable}'`, res.message || 'Terjadi kesalahan pada sinkronisasi tabel.', selectedTable);
          }
          await handleLoadTable(selectedTable);
        } catch (err: any) {
          notify('error', `Gagal Sinkron Tabel '${selectedTable}'`, err.message || 'Koneksi database terputus.', selectedTable);
        } finally {
          setSyncingTable(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateCompany(compForm);
      notify('success', 'Profil Perusahaan Disimpan', 'Profil perusahaan berhasil diperbarui & disimpan di database!', 'company_profile');
    } catch (err: any) {
      notify('error', 'Gagal Simpan Profil Perusahaan', 'Gagal update profil perusahaan: ' + err.message, 'company_profile');
    }
  };

  const handleAddHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.holiday_date || !holidayForm.holiday_name) return;
    try {
      if (editingHolidayId && onUpdateHoliday) {
        await onUpdateHoliday(editingHolidayId, holidayForm);
        const msg = `Hari libur '${holidayForm.holiday_name}' berhasil diperbarui di database.`;
        setHolidaySyncMsg({ type: 'success', text: msg });
        notify('success', 'Hari Libur Diperbarui', msg, 'company_holidays');
        setEditingHolidayId(null);
      } else {
        await onAddHoliday(holidayForm);
        const msg = `Hari libur '${holidayForm.holiday_name}' berhasil ditambahkan ke database.`;
        setHolidaySyncMsg({ type: 'success', text: msg });
        notify('success', 'Hari Libur Ditambahkan', msg, 'company_holidays');
      }
      setHolidayForm({ holiday_date: '', holiday_name: '', is_joint_leave: false });
    } catch (err: any) {
      notify('error', 'Gagal Menyimpan Hari Libur', err.message || 'Terjadi kesalahan saat menyimpan libur.', 'company_holidays');
    }
  };

  const handleEditHolidayClick = (h: Holiday) => {
    setEditingHolidayId(h.id);
    setHolidayForm({
      holiday_date: h.holiday_date || '',
      holiday_name: h.holiday_name || (h as any).name || '',
      is_joint_leave: !!(h.is_joint_leave || (h as any).type === 'cuti_bersama'),
    });
  };

  const handleCancelEditHoliday = () => {
    setEditingHolidayId(null);
    setHolidayForm({ holiday_date: '', holiday_name: '', is_joint_leave: false });
  };

  const handleDeleteHoliday = (id: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Hapus Hari Libur: ${name}`,
      description: `Apakah Anda yakin ingin menghapus data libur '${name}' dari database? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus Hari Libur',
      variant: 'danger',
      details: [
        { label: 'Nama Hari Libur', value: name },
        { label: 'ID Record', value: String(id) },
      ],
      onConfirm: async () => {
        try {
          await onDeleteHoliday(id);
          const msg = `Hari libur '${name}' berhasil dihapus dari database.`;
          setHolidaySyncMsg({ type: 'success', text: msg });
          notify('success', 'Hari Libur Dihapus', msg, 'company_holidays');
        } catch (err: any) {
          const errMsg = `Gagal menghapus: ${err.message}`;
          setHolidaySyncMsg({ type: 'error', text: errMsg });
          notify('error', 'Gagal Hapus Hari Libur', errMsg, 'company_holidays');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredHolidays = (holidays || []).filter((h) => {
    const hName = (h.holiday_name || (h as any).name || '').toLowerCase();
    const sTerm = (holidaySearch || '').toLowerCase();
    const hDate = (h.holiday_date || '');
    return hName.includes(sTerm) || hDate.includes(sTerm);
  });

  return (
    <div id="system-db-config-view" className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: accessibleColor }}
          >
            <ShieldCheck className="w-4 h-4" />
            Super Admin & System Architecture
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
            <Database className="w-6 h-6" style={{ color: accessibleColor }} />
            Konfigurasi Sistem & Database
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Manajemen basis data MySQL 8.0, DDL schema, seeding database, push/pull sinkronisasi, dan kalender libur nasional
          </p>
        </div>

        {/* Sub-tab Navigation (Database Connection & Table Explorer only) */}
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#27272a]">
          <button
            id="tab-btn-db-connection"
            onClick={() => setSubTab('db_connection')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'db_connection'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'db_connection'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Koneksi Database (MySQL)
          </button>
          <button
            id="tab-btn-table-explorer"
            onClick={() => {
              setSubTab('table_explorer');
              handleLoadTable(selectedTable);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'table_explorer'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'table_explorer'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Database Tabel Explorer
          </button>
          <button
            id="tab-btn-user-management"
            onClick={() => setSubTab('user_management')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'user_management'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'user_management'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Manajemen User & Google Auth (CRUD)
          </button>
        </div>
      </div>

      {/* FLOATING TOAST NOTIFICATIONS STACK */}
      {toasts.length > 0 && (
        <div
          id="db-floating-toast-container"
          className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0 transition-all"
        >
          <div className="flex items-center justify-between px-1 pointer-events-auto">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Notifikasi Operasi Database ({toasts.length})
            </span>
            {toasts.length > 1 && (
              <button
                type="button"
                onClick={clearAllToasts}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer"
              >
                Tutup Semua
              </button>
            )}
          </div>

          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isWarning = toast.type === 'warning';

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-200 ${
                  isSuccess
                    ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-50 shadow-emerald-950/30'
                    : isError
                    ? 'bg-rose-950/95 border-rose-500/40 text-rose-50 shadow-rose-950/30'
                    : isWarning
                    ? 'bg-amber-950/95 border-amber-500/40 text-amber-50 shadow-amber-950/30'
                    : 'bg-sky-950/95 border-sky-500/40 text-sky-50 shadow-sky-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isError
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isError ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Info className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white tracking-tight leading-tight">
                          {toast.title}
                        </h4>
                        {toast.table && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-white/10 text-white/90 border border-white/10">
                            tabel: {toast.table}
                          </span>
                        )}
                        <span className="text-[10px] text-white/50 font-mono">
                          {toast.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed font-medium">
                        {toast.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GLOBAL OPERATION NOTICE */}
      {opNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            opNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : opNotice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {opNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{opNotice.text}</span>
          </div>
          <button
            onClick={() => setOpNotice(null)}
            className="p-1 text-slate-400 hover:text-slate-200 dark:text-slate-300 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUB-TAB 3: KONEKSI DATABASE MYSQL */}
      {subTab === 'db_connection' && (
        <div className="space-y-6">
          {/* CARD 1: STATUS SERVER DATABASE (Request 8 - Card 1) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Status Server Database: MySQL 8.0 Cloud / Remote
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Tabel db_configs Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                  Host: {cfgForm.host || '127.0.0.1'} : {cfgForm.port || 3306} &bull; DB: {cfgForm.database || (cfgForm as any).database_name || 'nku_hr_system'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-test-connection"
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27272a] flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Menguji Koneksi...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-100'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{testResult.message}</span>
            </div>
          )}

          {/* Save confirmation alert */}
          {saveSuccessMsg && (
            <div className="p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="font-bold">Konfigurasi Berhasil Disimpan di Database</div>
                <div className="text-[11px] opacity-90 mt-0.5">{saveSuccessMsg}</div>
              </div>
            </div>
          )}

          {/* CARD 2: PARAMETER KONFIGURASI MYSQL (Request 8 - Card 2) */}
          <form onSubmit={handleSaveDb} className="p-6 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-500" />
                Parameter Konfigurasi MySQL
              </h3>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan langsung ke database saat tombol ditekan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Host Database (IP Host / Remote Server / Cluster) *
                </label>
                <input
                  id="input-db-host"
                  type="text"
                  required
                  value={cfgForm.host || ''}
                  onChange={(e) => setCfgForm({ ...cfgForm, host: e.target.value })}
                  placeholder="e.g. mysql-34ad8b-pt-nku.aivencloud.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Port MySQL *
                </label>
                <input
                  id="input-db-port"
                  type="number"
                  required
                  value={cfgForm.port || 14389}
                  onChange={(e) => setCfgForm({ ...cfgForm, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  id="input-db-user"
                  type="text"
                  required
                  value={cfgForm.user || (cfgForm as any).username || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCfgForm({ ...cfgForm, user: val, username: val } as any);
                  }}
                  placeholder="avnadmin"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi (Password) *
                </label>
                <div className="relative">
                  <input
                    id="input-db-password"
                    type={showDbPassword ? 'text' : 'password'}
                    value={cfgForm.password || (cfgForm as any).password_plain || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCfgForm({ ...cfgForm, password: val, password_plain: val } as any);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    id="btn-toggle-db-password"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    title={showDbPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    aria-label={showDbPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  >
                    {showDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Database *
                </label>
                <input
                  id="input-db-name"
                  type="text"
                  required
                  value={cfgForm.database || (cfgForm as any).database_name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCfgForm({ ...cfgForm, database: val, database_name: val } as any);
                  }}
                  placeholder="defaultdb"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mode Keamanan SSL
                </label>
                <select
                  id="select-db-ssl"
                  value={cfgForm.ssl_mode || 'REQUIRED'}
                  onChange={(e) => setCfgForm({ ...cfgForm, ssl_mode: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
                >
                  <option value="REQUIRED">REQUIRED (SSL Disarankan untuk Server Remote/Cloud)</option>
                  <option value="PREFERRED">PREFERRED</option>
                  <option value="DISABLED">DISABLED (Lokal / Docker tanpa SSL)</option>
                </select>
              </div>
            </div>

            {/* SSL CERTIFICATE MANAGEMENT */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Sertifikat CA (Certificate Authority .pem / .crt)
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Dibutuhkan jika mode SSL <span className="font-mono text-amber-500 font-bold">REQUIRED</span> (MySQL Cloud, AWS RDS, GCP Cloud SQL, dsb).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] border border-slate-300 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#27272a]/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Unggah file sertifikat CA (.pem, .crt, .cer) dari penyimpanan lokal Anda"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-500" />
                    <span>Upload dari Drive Lokal</span>
                    <input
                      type="file"
                      accept=".pem,.crt,.cer,.ca,.txt"
                      onChange={handleUploadCertFile}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handlePasteCertFromClipboard}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] border border-slate-300 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#27272a]/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Tempel teks sertifikat CA langsung dari clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-amber-500" />
                    <span>Paste Certificate</span>
                  </button>

                  {cfgForm.ca_certificate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCfgForm({ ...cfgForm, ca_certificate: '' });
                        try {
                          localStorage.removeItem('nku_ca_certificate');
                        } catch {}
                        notify('info', 'Sertifikat Dikosongkan', 'Sertifikat SSL CA telah dikosongkan.');
                      }}
                      className="p-1.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 transition-colors"
                      title="Kosongkan Sertifikat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="input-db-ca-cert"
                  rows={4}
                  value={cfgForm.ca_certificate || ''}
                  onChange={(e) => setCfgForm({ ...cfgForm, ca_certificate: e.target.value })}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQsFADBh...&#10;-----END CERTIFICATE-----"
                  className="w-full p-3 text-[11px] rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] font-mono text-slate-800 dark:text-slate-200 leading-relaxed"
                />
                {cfgForm.ca_certificate && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 shadow-xs">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>CA Terpasang ({cfgForm.ca_certificate.length} karakter)</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 gap-1">
                <span>Ekstensi file yang didukung: <code className="text-slate-700 dark:text-slate-200 font-bold">.pem</code>, <code className="text-slate-700 dark:text-slate-200 font-bold">.crt</code>, <code className="text-slate-700 dark:text-slate-200 font-bold">.cer</code>, <code className="text-slate-700 dark:text-slate-200 font-bold">.ca</code></span>
                {cfgForm.ssl_mode === 'REQUIRED' && !cfgForm.ca_certificate && (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Mode REQUIRED aktif: Dianjurkan mengunggah/menempel sertifikat CA
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                id="btn-save-db-config"
                type="submit"
                disabled={savingDb}
                className="px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Save className={`w-4 h-4 ${savingDb ? 'animate-spin' : ''}`} />
                {savingDb ? 'Menyimpan ke Database...' : 'Simpan Konfigurasi Database'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: DATABASE TABEL EXPLORER */}
      {subTab === 'table_explorer' && (
        <div className="space-y-4">
          {/* Status Server Database Live Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Status Server Database: MySQL 8.0 Cloud / Remote Live
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Terkoneksi ke Host: <span className="font-mono" style={{ color: accessibleColor }}>{cfgForm.host || '127.0.0.1'}</span> &bull; Port: <span className="font-mono" style={{ color: accessibleColor }}>{cfgForm.port || 3306}</span> &bull; Schema: <span className="font-mono" style={{ color: accessibleColor }}>{cfgForm.database || 'nku_hr_service'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-test-connection-explorer"
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: accentColor,
                  color: getContrastTextColorStyle(accentColor),
                }}
              >
                <Server className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Menguji Koneksi...' : 'Uji Koneksi Server (Test Live)'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}

          {/* CARD: PEMBERSIHAN DATABASE (HANDOVER MODE) (Dipindah ke Database Explorer) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 border border-rose-200 dark:border-rose-500/30 shadow-xs dark:shadow-lg space-y-4 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Pembersihan Database untuk Serah Terima Proyek (Handover Mode)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 uppercase tracking-wider">
                      Khusus Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-3xl">
                    Fitur ini digunakan sebelum penyerahan proyek ke klien/pengguna akhir. Mengosongkan seluruh isi 27 tabel data operasional (Presensi, Karyawan, Divisi, Golongan, Jadwal, Cuti, Lembur, Payroll, Libur), <strong className="text-amber-600 dark:text-amber-300">namun TETAP MENJAGA 5 Akun Manager Aplikasi & Peran Hak Akses (RBAC)</strong> serta Profil Perusahaan & Konfigurasi Database.
                  </p>
                </div>
              </div>

              <button
                id="btn-wipe-handover-card"
                type="button"
                onClick={handleWipeForHandoverAction}
                disabled={wipingHandover}
                className="px-5 py-3 text-xs font-black rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50 border border-rose-400/30"
              >
                <Trash2 className={`w-4 h-4 ${wipingHandover ? 'animate-spin' : ''}`} />
                {wipingHandover ? 'Mengosongkan Database...' : 'Kosongkan Seluruh Tabel Operasional'}
              </button>
            </div>

            {/* Manager Accounts Preserved List */}
            <div className="pt-3 border-t border-rose-200 dark:border-rose-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">superadmin</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Super Admin (Akses Penuh)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">DIPERTAHANKAN</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">hr.admin</div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">HR Admin (Kelola SDM & Cuti)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">DIPERTAHANKAN</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">payroll.admin</div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">Payroll Admin (Gaji & Lembur)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">DIPERTAHANKAN</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">rudi.manager</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Manager Divisi (Persetujuan)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">DIPERTAHANKAN</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">kiosk.terminal1</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Kiosk Device (Terminal Presensi)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">DIPERTAHANKAN</span>
              </div>
            </div>
          </div>

          {/* CARD: OPERASIONAL DATABASE LIVE & UTILITAS DDL (Dipindah ke Database Explorer) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      color: accessibleColor,
                      borderColor: `${accentColor}30`,
                    }}
                  >
                    Operasional Database Live
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                  Sinkronisasi & Utilitas Skema DDL
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Jalankan seeding master data atau sinkronkan data antara aplikasi dan server MySQL
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-view-ddl"
                  type="button"
                  onClick={handleOpenDdlModal}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#27272a] flex items-center gap-1.5 transition-all"
                  title="Buka Skema DDL SQL lengkap"
                >
                  <Eye className="w-3.5 h-3.5" style={{ color: accessibleColor }} />
                  Lihat DDL
                </button>

                <button
                  id="btn-seed-database"
                  type="button"
                  onClick={handleSeedDatabase}
                  disabled={seeding}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Eksekusi DDL dan inisialisasi data karyawan, divisi, jadwal, dan aturan"
                >
                  <FileCode className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                  {seeding ? 'Seeding...' : 'Seeding Database'}
                </button>

                <button
                  id="btn-pull-data"
                  type="button"
                  onClick={handlePullData}
                  disabled={pulling}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Tarik (Pull) data dari MySQL ke aplikasi"
                >
                  <CloudDownload className={`w-3.5 h-3.5 ${pulling ? 'animate-bounce' : ''}`} />
                  {pulling ? 'Pulling...' : 'Tarik (Pull) Data'}
                </button>

                <button
                  id="btn-push-data"
                  type="button"
                  onClick={handlePushData}
                  disabled={pushing}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Kirim (Push) data aplikasi ke MySQL database"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${pushing ? 'animate-pulse' : ''}`} />
                  {pushing ? 'Pushing...' : 'Push Data'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Table Selector Sidebar */}
            <div className="p-3 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-2">
              <div className="px-1 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Tabel Database</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#18181b] font-mono">
                  {filteredTablesList.length}/{tablesList.length}
                </span>
              </div>

              {/* Search Table List */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari tabel..."
                  value={tableSearchFilter}
                  onChange={(e) => setTableSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                {tableSearchFilter && (
                  <button
                    type="button"
                    onClick={() => setTableSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Hapus pencarian tabel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-[480px] overflow-y-auto space-y-0.5 pr-0.5">
                {filteredTablesList.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    Tidak ada tabel cocok
                  </div>
                ) : (
                  filteredTablesList.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => handleLoadTable(t.name)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedTable === t.name
                          ? 'font-bold border'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18181b]'
                      }`}
                      style={
                        selectedTable === t.name
                          ? {
                              backgroundColor: `${accentColor}15`,
                              color: accessibleColor,
                              borderColor: `${accentColor}35`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Table className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Table Data Preview */}
            <div className="md:col-span-3 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#27272a]">
                <div>
                  <h3 className="font-mono font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Table className="w-4 h-4 text-sky-500" />
                    SELECT * FROM {selectedTable}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                    Live Data Preview &bull; {tableData?.rows?.length || 0} Total Baris &bull; CRUD & Sinkronisasi Aktif
                  </p>
                </div>

                {/* CRUD & SYNCRON ACTION BUTTONS PER TABEL (Requirement 5) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddRow}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title={`Tambah baris data baru ke tabel ${selectedTable}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncTableAction}
                    disabled={syncingTable}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                    title={`Sinkronkan tabel ${selectedTable} ke remote live MySQL`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingTable ? 'animate-spin' : ''}`} />
                    <span>{syncingTable ? 'Sinkronisasi...' : 'Syncron Tabel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadTable(selectedTable)}
                    disabled={loadingTable}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#27272a] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#18181b] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTable ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* SEARCH, FILTER & SORT TOOLBAR */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari data di tabel..."
                      value={rowSearchFilter}
                      onChange={(e) => {
                        setRowSearchFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                    {rowSearchFilter && (
                      <button
                        type="button"
                        onClick={() => setRowSearchFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Column Filter Selector */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={columnFilterKey}
                      onChange={(e) => {
                        setColumnFilterKey(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="all">Semua Kolom</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          Kolom: {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">Tampilkan:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    >
                      <option value={25}>25 baris</option>
                      <option value={50}>50 baris</option>
                      <option value={100}>100 baris</option>
                      <option value={0}>Semua</option>
                    </select>
                  </div>
                </div>

                {/* Active Sort Pill & Reset Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  {sortColumn && (
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>
                        Urut: <strong className="font-mono">{sortColumn}</strong> (
                        {sortDirection === 'asc' ? 'A→Z / 0→9' : 'Z→A / 9→0'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortColumn(null);
                          setSortDirection(null);
                        }}
                        className="hover:text-amber-800 dark:hover:text-amber-200 ml-0.5"
                        title="Hapus pengurutan"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {(rowSearchFilter || columnFilterKey !== 'all' || sortColumn !== null) && (
                    <button
                      type="button"
                      onClick={handleResetFiltersAndSort}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reset filter dan pengurutan ke awal"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-400" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-x-auto max-h-[440px] rounded-xl border border-slate-200 dark:border-[#27272a]">
                {loadingTable ? (
                  <div className="py-20 text-center text-slate-500 dark:text-slate-300 text-xs">
                    Memuat data tabel...
                  </div>
                ) : !tableData || !tableData.rows || tableData.rows.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 dark:text-slate-300 text-xs flex flex-col items-center justify-center gap-3">
                    <span>Tabel ini kosong atau belum memiliki rekaman data.</span>
                    <button
                      type="button"
                      onClick={handleOpenAddRow}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Pertama</span>
                    </button>
                  </div>
                ) : filteredAndSortedRows.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-300 text-xs flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-slate-400" />
                    <span>Tidak ada data yang cocok dengan pencarian / filter "{rowSearchFilter}".</span>
                    <button
                      type="button"
                      onClick={handleResetFiltersAndSort}
                      className="mt-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all"
                      style={{
                        backgroundColor: accentColor,
                        color: getContrastTextColorStyle(accentColor),
                      }}
                    >
                      Bersihkan Filter
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] sticky top-0 z-10 select-none">
                      <tr>
                        {availableColumns.map((col) => {
                          const isSorted = sortColumn === col;
                          return (
                            <th
                              key={col}
                              onClick={() => handleSortColumn(col)}
                              className={`py-2 px-3 font-bold whitespace-nowrap cursor-pointer transition-colors group ${
                                isSorted
                                  ? 'font-extrabold'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202024]'
                              }`}
                              style={
                                isSorted
                                  ? {
                                      color: accessibleColor,
                                      backgroundColor: `${accentColor}15`,
                                    }
                                  : undefined
                              }
                              title={`Klik untuk mengurutkan data berdasarkan kolom '${col}'`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{col}</span>
                                {isSorted ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="w-3 h-3 shrink-0" style={{ color: accessibleColor }} />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 shrink-0" style={{ color: accessibleColor }} />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-20 group-hover:opacity-100 shrink-0 transition-opacity" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="py-2 px-3 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap text-right">
                          Aksi (CRUD)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                      {paginatedRows.map((row, rIdx) => (
                        <tr key={row.id ?? rIdx} className="hover:bg-slate-50/80 dark:hover:bg-[#18181b]/50">
                          {availableColumns.map((col) => (
                            <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs truncate text-slate-800 dark:text-slate-200">
                              {row[col] === null || row[col] === undefined ? (
                                <span className="text-slate-400 italic">NULL</span>
                              ) : typeof row[col] === 'boolean' ? (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row[col]
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {row[col] ? 'true' : 'false'}
                                </span>
                              ) : typeof row[col] === 'object' ? (
                                JSON.stringify(row[col])
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRow(row)}
                                className="p-1 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-950/50 text-sky-600 dark:text-sky-400 transition-colors cursor-pointer"
                                title="Edit Baris Data"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRowAction(row)}
                                className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 transition-colors cursor-pointer"
                                title="Hapus Baris Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* PAGINATION & SUMMARY FOOTER */}
              {tableData?.rows && tableData.rows.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Menampilkan{' '}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {filteredAndSortedRows.length > 0
                        ? (currentPage - 1) * (pageSize > 0 ? pageSize : filteredAndSortedRows.length) + 1
                        : 0}
                      {' - '}
                      {pageSize > 0
                        ? Math.min(currentPage * pageSize, filteredAndSortedRows.length)
                        : filteredAndSortedRows.length}
                    </strong>{' '}
                    dari{' '}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {filteredAndSortedRows.length}
                    </strong>{' '}
                    baris data
                    {rowSearchFilter && (
                      <span className="text-amber-500 ml-1 font-semibold">
                        (difilter dari {tableData.rows.length} total)
                      </span>
                    )}
                  </div>

                  {pageSize > 0 && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#18181b] disabled:opacity-40 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </button>

                      <span className="px-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Hal {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#18181b] disabled:opacity-40 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DDL SCHEMA MODAL */}
      {showDdlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121212] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Skema Database DDL MySQL 8.0 (nku_hr_schema.sql)
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    27 Tabel Lengkap &bull; MySQL 8 / InnoDB &bull; NIP & QR Code Support
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDdlQuick}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                >
                  {copiedDdl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedDdl ? 'Tersalin!' : 'Salin DDL'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDdl}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh .sql
                </button>
                <button
                  type="button"
                  onClick={() => setShowDdlModal(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-200 bg-[#0A0A0A]">
              {loadingDdl ? (
                <div className="py-20 text-center text-slate-400">Memuat skema SQL...</div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed select-all">{ddlContent}</pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span>Kompatibel dengan MySQL 8.0, Aiven Cloud, AWS RDS, GCP Cloud SQL, dan Docker</span>
              <button
                onClick={() => setShowDdlModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE EXPLORER ROW MODAL (CREATE & UPDATE) - Requirement 5 */}
      {showRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEditingRow ? `Edit Baris ID ${activeRowId}` : 'Tambah Baris Data Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">
                    Tabel: {selectedTable}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRowSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
              {tableData?.columns ? (
                tableData.columns.map((col: any) => {
                  const colName = typeof col === 'string' ? col : col.name;
                  if (colName === 'id' && !isEditingRow) return null;
                  return (
                    <div key={colName}>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-mono">
                        {colName} {colName === 'id' ? '(Primary Key)' : ''}
                      </label>
                      <input
                        type="text"
                        disabled={colName === 'id'}
                        value={rowFormData[colName] ?? ''}
                        onChange={(e) => setRowFormData({ ...rowFormData, [colName]: e.target.value })}
                        placeholder={`Nilai untuk ${colName}`}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  );
                })
              ) : (
                Object.keys(rowFormData).map((colName) => (
                  <div key={colName}>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-mono">
                      {colName}
                    </label>
                    <input
                      type="text"
                      disabled={colName === 'id'}
                      value={rowFormData[colName] ?? ''}
                      onChange={(e) => setRowFormData({ ...rowFormData, [colName]: e.target.value })}
                      placeholder={`Nilai untuk ${colName}`}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                ))
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowRowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#27272a] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18181b] transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRow}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${savingRow ? 'animate-spin' : ''}`} />
                  <span>{isEditingRow ? 'Simpan Perubahan' : 'Tambahkan Baris'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subTab === 'user_management' && (
        <UserManagementManager
          users={users}
          employees={employees}
          accentColor={accentColor}
          isDarkMode={isDarkMode}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          onResetOperatingData={onResetOperatingData}
        />
      )}

      {/* UNIVERSAL CONFIRMATION MODAL (Requirement 4) */}
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
