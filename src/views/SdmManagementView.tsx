import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Building2,
  Award,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  Camera,
  Upload,
  Video,
  RefreshCw,
  RotateCcw,
  Landmark,
} from 'lucide-react';
import { Employee, Division, JobGrade, CompanyProfile } from '../types';
import { exportToExcel, exportToPdfPrint, formatRupiah } from '../lib/exportUtils';
import { getCompanyInitials, getContrastTextColorStyle } from '../lib/companyUtils';
import {
  formatDateDDMMYYYY,
  formatThousandNumber,
  parseThousandNumber,
  formatPhoneNumber,
} from '../lib/formatUtils';
import { api } from '../lib/api';
import { EmployeeIdCardModal } from '../components/EmployeeIdCardModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { SortableTh } from '../components/SortableTh';
import { sortTableData, SortDirection } from '../lib/sortUtils';
import { ExportDropdown } from '../components/ExportDropdown';
import { IdCardReviewView } from './IdCardReviewView';

interface SdmManagementViewProps {
  employees: Employee[];
  divisions: Division[];
  jobGrades: JobGrade[];
  accentColor: string;
  companyName?: string;
  companyProfile?: CompanyProfile;
  initialSubTab?: 'employees' | 'divisions' | 'job_grades' | 'idcard_review';
  onAddEmployee: (data: Partial<Employee>) => Promise<any>;
  onUpdateEmployee: (id: number, data: Partial<Employee>) => Promise<any>;
  onDeleteEmployee: (id: number) => Promise<any>;
  onAddDivision: (data: Partial<Division>) => Promise<any>;
  onUpdateDivision?: (id: number, data: Partial<Division>) => Promise<any>;
  onDeleteDivision: (id: number) => Promise<any>;
  onAddJobGrade: (data: Partial<JobGrade>) => Promise<any>;
  onUpdateJobGrade?: (id: number, data: Partial<JobGrade>) => Promise<any>;
  onDeleteJobGrade: (id: number) => Promise<any>;
}

export const SdmManagementView: React.FC<SdmManagementViewProps> = ({
  employees,
  divisions,
  jobGrades,
  accentColor,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  companyProfile,
  initialSubTab,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddDivision,
  onUpdateDivision,
  onDeleteDivision,
  onAddJobGrade,
  onUpdateJobGrade,
  onDeleteJobGrade,
}) => {
  const [subTab, setSubTab] = useState<'employees' | 'divisions' | 'job_grades' | 'idcard_review'>(
    initialSubTab || 'employees'
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    nip: '',
    full_name: '',
    division_id: divisions[0]?.id || null,
    job_grade_id: jobGrades[0]?.id || null,
    email: '',
    phone: '',
    address: '',
    join_date: new Date().toISOString().slice(0, 10),
    base_salary: 25000,
    qr_code: '',
    avatar_url: '',
    status: 'active',
  });

  // Photo Upload & Webcam snapshot state
  const [photoUploadTab, setPhotoUploadTab] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraTimeoutRef = useRef<any>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [showDivModal, setShowDivModal] = useState(false);
  const [editingDiv, setEditingDiv] = useState<Division | null>(null);
  const [isSubmittingDiv, setIsSubmittingDiv] = useState(false);
  const [divForm, setDivForm] = useState({ division_code: '', division_name: '', description: '' });

  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<JobGrade | null>(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeForm, setGradeForm] = useState<{
    grade_code: string;
    grade_name: string;
    description: string;
    is_exempt_from_lateness: boolean;
  }>({
    grade_code: '',
    grade_name: '',
    description: '',
    is_exempt_from_lateness: false,
  });

  // Drill-down for Division & Grade Cards: View employees belonging to card
  const [selectedCardForEmployees, setSelectedCardForEmployees] = useState<{
    type: 'division' | 'grade';
    item: Division | JobGrade;
    name: string;
    code: string;
  } | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState('');

  // ID Card Print Modal state (Pict 1 - QR Code & NIP, strictly without RFID)
  const [idCardEmployee, setIdCardEmployee] = useState<Employee | null>(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);

  // Universal Database Confirmation Modal state
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

  // Handle ESC key to exit form modals with confirmation (Request 3)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmployeeModal) {
          if (window.confirm('Apakah Anda yakin ingin membatalkan input/edit data karyawan? Data yang belum disimpan akan hilang.')) {
            setShowEmployeeModal(false);
          }
        } else if (showDivModal) {
          setShowDivModal(false);
        } else if (showGradeModal) {
          setShowGradeModal(false);
        } else if (showIdCardModal) {
          setShowIdCardModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEmployeeModal, showDivModal, showGradeModal, showIdCardModal]);

  // Universal Table Sorting States (Requirement 3)
  const [empSortKey, setEmpSortKey] = useState<string | null>('full_name');
  const [empSortDir, setEmpSortDir] = useState<SortDirection>('asc');

  // Table Sync State
  const [isSyncingTable, setIsSyncingTable] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncTable = async (tableName: string) => {
    setIsSyncingTable(tableName);
    try {
      const res = await api.syncTable(tableName);
      setSyncFeedback(res.message || `Sinkronisasi tabel ${tableName} berhasil (${res.rowCount || 0} baris)`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(`Gagal sinkronisasi ${tableName}: ${err.message || 'Error'}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncingTable(null);
    }
  };

  const [divSortKey, setDivSortKey] = useState<string | null>('division_name');
  const [divSortDir, setDivSortDir] = useState<SortDirection>('asc');

  const [gradeSortKey, setGradeSortKey] = useState<string | null>('grade_name');
  const [gradeSortDir, setGradeSortDir] = useState<SortDirection>('asc');

  const handleSortEmp = (key: string) => {
    if (empSortKey === key) {
      if (empSortDir === 'asc') setEmpSortDir('desc');
      else if (empSortDir === 'desc') {
        setEmpSortKey(null);
        setEmpSortDir(null);
      }
    } else {
      setEmpSortKey(key);
      setEmpSortDir('asc');
    }
  };

  const handleSortDiv = (key: string) => {
    if (divSortKey === key) {
      if (divSortDir === 'asc') setDivSortDir('desc');
      else if (divSortDir === 'desc') {
        setDivSortKey(null);
        setDivSortDir(null);
      }
    } else {
      setDivSortKey(key);
      setDivSortDir('asc');
    }
  };

  const handleSortGrade = (key: string) => {
    if (gradeSortKey === key) {
      if (gradeSortDir === 'asc') setGradeSortDir('desc');
      else if (gradeSortDir === 'desc') {
        setGradeSortKey(null);
        setGradeSortDir(null);
      }
    } else {
      setGradeSortKey(key);
      setGradeSortDir('asc');
    }
  };

  // Filtered & Sorted employees
  const filteredEmployees = employees.filter((emp) => {
    const sTerm = (searchTerm || '').toLowerCase();
    const matchSearch =
      (emp.full_name || '').toLowerCase().includes(sTerm) ||
      (emp.nip || '').toLowerCase().includes(sTerm) ||
      (emp.email || '').toLowerCase().includes(sTerm);
    const matchDiv = selectedDivision === 'all' || String(emp.division_id) === selectedDivision;
    const matchStatus = selectedStatus === 'all' || emp.status === selectedStatus;
    return matchSearch && matchDiv && matchStatus;
  });

  const sortedEmployees = sortTableData(filteredEmployees, empSortKey, empSortDir);
  const sortedDivisions = sortTableData(divisions, divSortKey, divSortDir);
  const sortedJobGrades = sortTableData(jobGrades, gradeSortKey, gradeSortDir);

  // Exports for Employees
  const activeComp = companyProfile || companyName;
  const compLabel = companyProfile?.company_name || companyName;

  const handleExportEmployeesExcel = () => {
    const data = filteredEmployees.map((e, idx) => {
      const divName = (e.division_name && e.division_name !== '-')
        ? e.division_name
        : (divisions.find((d) => Number(d.id) === Number(e.division_id))?.division_name || '-');
      const gradeName = (e.job_grade_name && e.job_grade_name !== '-')
        ? e.job_grade_name
        : (jobGrades.find((g) => Number(g.id) === Number(e.job_grade_id))?.grade_name || '-');
      return {
        No: idx + 1,
        NIP: e.nip,
        Nama_Lengkap: e.full_name,
        Divisi: divName,
        Golongan: gradeName,
        Upah_Per_Jam_Rp: e.base_salary,
        Status: e.status,
        Email: e.email || '-',
        Telepon: e.phone || '-',
        Tanggal_Bergabung: formatDateDDMMYYYY(e.join_date),
        Kode_RFID: e.rfid_code || '-',
        Kode_QR: e.qr_code || '-',
      };
    });
    exportToExcel(
      data,
      `Master_Karyawan_${getCompanyInitials(compLabel)}`,
      'Karyawan',
      activeComp,
      'Laporan Data Master Karyawan'
    );
  };

  const handleExportEmployeesPdf = () => {
    const headers = ['NIP', 'Nama Karyawan', 'Divisi', 'Golongan', 'Upah/Jam', 'Status', 'RFID', 'Bergabung'];
    const rows = filteredEmployees.map((e) => {
      const divName = (e.division_name && e.division_name !== '-')
        ? e.division_name
        : (divisions.find((d) => Number(d.id) === Number(e.division_id))?.division_name || '-');
      const gradeName = (e.job_grade_name && e.job_grade_name !== '-')
        ? e.job_grade_name
        : (jobGrades.find((g) => Number(g.id) === Number(e.job_grade_id))?.grade_name || '-');
      return [
        e.nip,
        e.full_name,
        divName,
        gradeName,
        formatRupiah(e.base_salary),
        e.status.toUpperCase(),
        e.rfid_code || '-',
        formatDateDDMMYYYY(e.join_date),
      ];
    });
    exportToPdfPrint(
      `Laporan Data Master Karyawan ${compLabel}`,
      `Total: ${rows.length} Karyawan`,
      headers,
      rows,
      activeComp
    );
  };

  // Exports for Divisions
  const handleExportDivisionsExcel = () => {
    const data = divisions.map((d, idx) => ({
      No: idx + 1,
      Kode: d.division_code,
      Nama_Divisi: d.division_name,
      Deskripsi: d.description,
      Status: d.is_active ? 'Aktif' : 'Non-Aktif',
    }));
    exportToExcel(
      data,
      `Master_Divisi_${getCompanyInitials(compLabel)}`,
      'Divisi',
      activeComp,
      'Master Data Divisi / Departemen Operasional'
    );
  };

  const handleExportDivisionsPdf = () => {
    const headers = ['Kode', 'Nama Divisi', 'Deskripsi', 'Status'];
    const rows = divisions.map((d) => [d.division_code, d.division_name, d.description, d.is_active ? 'Aktif' : 'Non-Aktif']);
    exportToPdfPrint(
      `Master Data Divisi ${compLabel}`,
      `Total: ${rows.length} Divisi`,
      headers,
      rows,
      activeComp
    );
  };

  // Exports for Job Grades
  const handleExportGradesExcel = () => {
    const data = jobGrades.map((g, idx) => ({
      No: idx + 1,
      Kode_Golongan: g.grade_code,
      Nama_Golongan: g.grade_name,
      Deskripsi: g.description,
      Status: g.is_active ? 'Aktif' : 'Non-Aktif',
    }));
    exportToExcel(
      data,
      `Master_Golongan_${getCompanyInitials(compLabel)}`,
      'Golongan',
      activeComp,
      'Master Data Golongan Jabatan & Grading'
    );
  };

  const handleExportGradesPdf = () => {
    const headers = ['Kode', 'Nama Golongan', 'Deskripsi', 'Status'];
    const rows = jobGrades.map((g) => [g.grade_code, g.grade_name, g.description, g.is_active ? 'Aktif' : 'Non-Aktif']);
    exportToPdfPrint(
      `Master Data Golongan Jabatan ${compLabel}`,
      `Total: ${rows.length} Golongan`,
      headers,
      rows,
      activeComp
    );
  };

  // Camera & Photo Upload Handlers
  const stopCamera = () => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      setMediaStream(null);
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
      } catch {
        // Fallback for USB Camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setIsCameraActive(true);

      cameraTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const p = videoRef.current.play();
          if (p && typeof p.catch === 'function') {
            p.catch((e) => {
              if (e?.name !== 'AbortError' && !e?.message?.includes('interrupted')) {
                console.debug('Video play notice:', e);
              }
            });
          }
        }
      }, 100);
    } catch (err: any) {
      alert(
        'Petunjuk Kamera USB: Tidak dapat mengakses Kamera USB / Webcam.\n\n' +
          '1. Pastikan kabel USB Cam terhubung dengan baik.\n' +
          '2. Izinkan akses kamera pada browser (Klik Allow Camera).\n' +
          '3. Jika gagal, gunakan opsi "File Local" untuk mengunggah foto.\n\nDetail: ' +
          (err.message || 'Izin Kamera Ditolak')
      );
    }
  };

  // Ensure camera is stopped when employee modal closes or component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!showEmployeeModal) {
      stopCamera();
    }
  }, [showEmployeeModal]);

  useEffect(() => {
    if (photoUploadTab !== 'camera' && isCameraActive) {
      stopCamera();
    }
  }, [photoUploadTab, isCameraActive]);

  const captureCameraSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      setIsUploadingPhoto(true);
      try {
        const res = await api.uploadPhoto(base64);
        const finalUrl = res.url || base64;
        setEmpForm((prev) => ({ ...prev, avatar_url: finalUrl, photo_url: finalUrl }));
      } catch (err) {
        console.error('Snapshot upload error:', err);
        setEmpForm((prev) => ({ ...prev, avatar_url: base64, photo_url: base64 }));
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleFilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setIsUploadingPhoto(true);
          try {
            const res = await api.uploadPhoto(compressedBase64);
            const finalUrl = res.url || compressedBase64;
            setEmpForm((prev) => ({ ...prev, avatar_url: finalUrl, photo_url: finalUrl }));
          } catch (err) {
            console.error('File upload error:', err);
            setEmpForm((prev) => ({ ...prev, avatar_url: compressedBase64, photo_url: compressedBase64 }));
          } finally {
            setIsUploadingPhoto(false);
          }
        }
      };
      img.onerror = () => {
        const rawBase64 = reader.result as string;
        setEmpForm((prev) => ({ ...prev, avatar_url: rawBase64, photo_url: rawBase64 }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getNextNip = () => {
    const maxNumber = employees.reduce((max, emp) => {
      if (!emp.nip) return max;
      const num = parseInt(emp.nip.replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextNum = maxNumber + 1;
    return `NIP-${String(nextNum).padStart(4, '0')}`;
  };

  const handleOpenAddEmployee = () => {
    stopCamera();
    setEditingEmployee(null);
    const autoNip = getNextNip();
    setEmpForm({
      nip: autoNip,
      full_name: '',
      division_id: divisions[0]?.id || 1,
      job_grade_id: jobGrades[0]?.id || 1,
      email: '',
      phone: '',
      address: '',
      join_date: new Date().toISOString().slice(0, 10),
      base_salary: 25000,
      rfid_code: '',
      bank_account: '',
      qr_code: autoNip,
      avatar_url: '',
      photo_url: '',
      status: 'active',
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    stopCamera();
    setEditingEmployee(emp);
    setEmpForm({
      ...emp,
      nip: emp.nip || '',
      full_name: emp.full_name || '',
      division_id: emp.division_id ?? divisions[0]?.id ?? 1,
      job_grade_id: emp.job_grade_id ?? jobGrades[0]?.id ?? 1,
      email: emp.email || '',
      phone: emp.phone || '',
      address: emp.address || '',
      join_date: emp.join_date || new Date().toISOString().slice(0, 10),
      base_salary: emp.base_salary ?? 25000,
      rfid_code: emp.bank_account || emp.rfid_code || '',
      bank_account: emp.bank_account || emp.rfid_code || '',
      qr_code: emp.nip || '',
      avatar_url: emp.avatar_url || emp.photo_url || '',
      photo_url: emp.photo_url || emp.avatar_url || '',
      status: emp.status || 'active',
    });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEmp) return;
    stopCamera();
    setIsSubmittingEmp(true);
    try {
      const payload = {
        ...empForm,
        rfid_code: empForm.bank_account || empForm.rfid_code || '',
        bank_account: empForm.bank_account || empForm.rfid_code || '',
        qr_code: empForm.nip,
      };
      if (editingEmployee) {
        await onUpdateEmployee(editingEmployee.id, payload);
      } else {
        await onAddEmployee(payload);
      }
      setShowEmployeeModal(false);
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  return (
    <div id="sdm-management-view" className="space-y-6">
      {/* Module Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500" />
            Management Sumber Daya Manusia (SDM)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pengelolaan master karyawan, divisi operasional batching/kantor, dan jenjang golongan kerja {companyName}
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl overflow-x-auto">
          <button
            onClick={() => setSubTab('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'employees'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'employees'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Master Karyawan ({employees.length})
          </button>
          <button
            onClick={() => setSubTab('divisions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'divisions'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'divisions'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Master Divisi ({divisions.length})
          </button>
          <button
            onClick={() => setSubTab('job_grades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'job_grades'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'job_grades'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            Master Golongan ({jobGrades.length})
          </button>
          <button
            onClick={() => setSubTab('idcard_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'idcard_review'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'idcard_review'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Review & Cetak ID Card</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MASTER KARYAWAN */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-slate-50 dark:bg-[#18181b] p-2.5 rounded-2xl border border-slate-200 dark:border-[#27272a]">
            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] sm:min-w-[240px] flex-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-300 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari Nama, NIP, atau Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white font-medium"
              >
                <option value="all">Semua Divisi ({divisions.length})</option>
                {divisions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.division_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-white focus:outline-hidden cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Non-Aktif</option>
                <option value="resigned">Resigned</option>
              </select>

              {(searchTerm || selectedDivision !== 'all' || selectedStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDivision('all');
                    setSelectedStatus('all');
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-semibold flex items-center gap-1 transition-colors"
                  title="Clear dan reset filter karyawan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filter</span>
                </button>
              )}
            </div>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => handleSyncTable('employees')}
                disabled={isSyncingTable === 'employees'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi Data Karyawan dengan Database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'employees' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'employees' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportEmployeesExcel}
                onExportPdf={handleExportEmployeesPdf}
                label="Export Karyawan"
                excelLabel="Unduh Excel (.xlsx)"
                pdfLabel="Cetak / Unduh PDF (.pdf)"
              />
              <button
                onClick={() => {
                  if (employees.length > 0) {
                    setIdCardEmployee(employees[0]);
                    setShowIdCardModal(true);
                  }
                }}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                style={{
                  borderColor: `${accentColor}60`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Cetak Kartu Tanda Pengenal Pegawai"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cetak ID Card</span>
              </button>
              <button
                onClick={handleOpenAddEmployee}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                style={{
                  backgroundColor: accentColor,
                  color: getContrastTextColorStyle(accentColor),
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Karyawan</span>
              </button>
            </div>
          </div>

          {/* Employees Table (Fluid, Soft Rounded-3xl, Sortable, Neutral Dark Black Theme) */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <SortableTh sortKey="full_name" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      Karyawan
                    </SortableTh>
                    <SortableTh sortKey="division_name" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      Divisi & Golongan
                    </SortableTh>
                    <SortableTh sortKey="base_salary" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      Upah / Jam
                    </SortableTh>
                    <SortableTh sortKey="nip" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      QR Code & NIP (Kiosk)
                    </SortableTh>
                    <SortableTh sortKey="status" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      Status
                    </SortableTh>
                    <SortableTh sortKey="join_date" currentSortKey={empSortKey} currentSortDirection={empSortDir} onSort={handleSortEmp}>
                      Bergabung
                    </SortableTh>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-300">
                        Tidak ada data karyawan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp, idx) => (
                      <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#18181b] transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {emp.avatar_url || emp.photo_url ? (
                              <img
                                src={emp.avatar_url || emp.photo_url}
                                alt={emp.full_name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-[#27272a] shrink-0 shadow-xs"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                                style={{
                                  backgroundColor: accentColor,
                                  color: getContrastTextColorStyle(accentColor),
                                }}
                              >
                                {emp.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {emp.full_name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
                                NIP: {emp.nip}
                              </div>
                              {(emp.bank_account || emp.rfid_code) && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5 font-medium">
                                  <Landmark className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[160px]">{emp.bank_account || emp.rfid_code}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {(emp.division_name && emp.division_name !== '-')
                              ? emp.division_name
                              : (divisions.find((d) => Number(d.id) === Number(emp.division_id))?.division_name || '-')}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-300">
                            {(emp.job_grade_name && emp.job_grade_name !== '-')
                              ? emp.job_grade_name
                              : (jobGrades.find((g) => Number(g.id) === Number(emp.job_grade_id))?.grade_name || '-')}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(emp.base_salary)}
                          <span className="text-[10px] text-slate-500 dark:text-slate-300 font-normal"> / jam</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-200">
                            <QrCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-semibold">{emp.qr_code || `QR-${emp.nip}`}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">
                            NIP: {emp.nip}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-[#18181b] dark:text-slate-300 border border-slate-200 dark:border-[#27272a]'
                            }`}
                          >
                            {emp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                          {formatDateDDMMYYYY(emp.join_date)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setIdCardEmployee(emp);
                                setShowIdCardModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                              title="Cetak ID Card Pegawai (Standar Kiosk QR / NIP)"
                            >
                              <CreditCard className="w-4 h-4 text-amber-500" />
                            </button>
                            <button
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Data Karyawan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: `Hapus Karyawan: ${emp.full_name}`,
                                  description: `Aksi ini akan menghapus data karyawan (${emp.nip}) dari database aplikasi secara permanen.`,
                                  confirmLabel: 'Hapus Karyawan',
                                  variant: 'danger',
                                  details: [
                                    { label: 'NIP', value: emp.nip },
                                    { label: 'Nama', value: emp.full_name },
                                    { label: 'Divisi', value: emp.division_name || '-' },
                                  ],
                                  onConfirm: async () => {
                                    await onDeleteEmployee(emp.id);
                                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                  },
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Hapus Karyawan"
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

      {/* SUB-TAB 2: MASTER DIVISI */}
      {subTab === 'divisions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Daftar divisi operasional manufaktur, batching plant, maintenance, dan administrasi kantor {companyName}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort Pill for Divisions */}
              <div className="flex items-center bg-slate-100 dark:bg-[#18181b] p-1 rounded-full border border-slate-200 dark:border-[#27272a] text-xs">
                <button
                  type="button"
                  onClick={() => handleSortDiv('division_code')}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold transition-all ${
                    divSortKey === 'division_code'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Kode {divSortKey === 'division_code' ? (divSortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortDiv('division_name')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    divSortKey === 'division_name'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Nama {divSortKey === 'division_name' ? (divSortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </div>

              <button
                onClick={() => handleSyncTable('divisions')}
                disabled={isSyncingTable === 'divisions'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi Data Master Divisi"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'divisions' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'divisions' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportDivisionsExcel}
                onExportPdf={handleExportDivisionsPdf}
                label="Export Divisi"
                excelLabel="Unduh Excel (.xlsx)"
                pdfLabel="Cetak / Unduh PDF (.pdf)"
              />
              <button
                onClick={() => {
                  setEditingDiv(null);
                  setDivForm({ division_code: '', division_name: '', description: '' });
                  setShowDivModal(true);
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Divisi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDivisions.map((div) => (
              <div
                key={div.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold text-xs border border-sky-500/20">
                      {div.division_code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDiv(div);
                          setDivForm({
                            division_code: div.division_code,
                            division_name: div.division_name,
                            description: div.description || '',
                          });
                          setShowDivModal(true);
                        }}
                        className="p-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                        title="Edit Divisi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Hapus Divisi: ${div.division_name}`,
                            description: `Aksi ini akan menghapus master divisi '${div.division_name}' (${div.division_code}). Karyawan di divisi ini akan kehilangan tautan divisi.`,
                            confirmLabel: 'Hapus Divisi',
                            variant: 'danger',
                            details: [
                              { label: 'Kode', value: div.division_code },
                              { label: 'Nama Divisi', value: div.division_name },
                            ],
                            onConfirm: async () => {
                              await onDeleteDivision(div.id);
                              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                            },
                          });
                        }}
                        className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        title="Hapus Divisi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {div.division_name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {div.description || 'Tidak ada deskripsi.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCardForEmployees({
                        type: 'division',
                        item: div,
                        name: div.division_name,
                        code: div.division_code,
                      });
                      setDrillDownSearch('');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-900/50 font-bold text-xs transition-colors cursor-pointer"
                    title={`Klik untuk melihat daftar karyawan divisi ${div.division_name}`}
                  >
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                    <span>{employees.filter((e) => e.division_id === div.id).length} Karyawan</span>
                    <span className="text-[10px] bg-sky-200/60 dark:bg-sky-800/60 px-1.5 py-0.2 rounded-md font-mono">Buka</span>
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    AKTIF
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MASTER GOLONGAN */}
      {subTab === 'job_grades' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Jenjang golongan kerja (Staff, Supervisor, Manager, Senior Executive)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort Pill for Job Grades */}
              <div className="flex items-center bg-slate-100 dark:bg-[#18181b] p-1 rounded-full border border-slate-200 dark:border-[#27272a] text-xs">
                <button
                  type="button"
                  onClick={() => handleSortGrade('grade_code')}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold transition-all ${
                    gradeSortKey === 'grade_code'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Kode {gradeSortKey === 'grade_code' ? (gradeSortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortGrade('grade_name')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    gradeSortKey === 'grade_name'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Nama {gradeSortKey === 'grade_name' ? (gradeSortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </div>

              <button
                onClick={() => handleSyncTable('job_grades')}
                disabled={isSyncingTable === 'job_grades'}
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
                title="Sinkronisasi Data Master Golongan"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable === 'job_grades' ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
                <span>{isSyncingTable === 'job_grades' ? 'Menyinkronkan...' : 'Sync'}</span>
              </button>

              <ExportDropdown
                onExportExcel={handleExportGradesExcel}
                onExportPdf={handleExportGradesPdf}
                label="Export Golongan"
                excelLabel="Unduh Excel (.xlsx)"
                pdfLabel="Cetak / Unduh PDF (.pdf)"
              />
              <button
                onClick={() => {
                  setEditingGrade(null);
                  setGradeForm({ grade_code: '', grade_name: '', description: '', is_exempt_from_lateness: false });
                  setShowGradeModal(true);
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Plus className="w-4 h-4" />
                Tambah Golongan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedJobGrades.map((grade) => (
              <div
                key={grade.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3f3f46] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-8 h-8 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs">
                        {grade.grade_code}
                      </span>
                      {grade.is_exempt_from_lateness && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 tracking-tight" title="Golongan ini bebas denda dan status terlambat">
                          BEBAS TELAT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGrade(grade);
                          setGradeForm({
                            grade_code: grade.grade_code,
                            grade_name: grade.grade_name,
                            description: grade.description || '',
                            is_exempt_from_lateness: Boolean(grade.is_exempt_from_lateness),
                          });
                          setShowGradeModal(true);
                        }}
                        className="p-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                        title="Edit Golongan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Hapus Golongan: ${grade.grade_name}`,
                            description: `Aksi ini akan menghapus master golongan '${grade.grade_name}' (${grade.grade_code}) dari database.`,
                            confirmLabel: 'Hapus Golongan',
                            variant: 'danger',
                            details: [
                              { label: 'Kode', value: grade.grade_code },
                              { label: 'Nama Golongan', value: grade.grade_name },
                            ],
                            onConfirm: async () => {
                              await onDeleteJobGrade(grade.id);
                              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                            },
                          });
                        }}
                        className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        title="Hapus Golongan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {grade.grade_name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {grade.description || 'Deskripsi golongan.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27272a] flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCardForEmployees({
                        type: 'grade',
                        item: grade,
                        name: grade.grade_name,
                        code: grade.grade_code,
                      });
                      setDrillDownSearch('');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-900/50 font-bold text-xs transition-colors cursor-pointer"
                    title={`Klik untuk melihat daftar karyawan golongan ${grade.grade_name}`}
                  >
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <span>{employees.filter((e) => e.job_grade_id === grade.id).length} Karyawan</span>
                    <span className="text-[10px] bg-purple-200/60 dark:bg-purple-800/60 px-1.5 py-0.2 rounded-md font-mono">Buka</span>
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    AKTIF
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REVIEW & CETAK KARTU ID */}
      {subTab === 'idcard_review' && (
        <div className="space-y-4">
          <IdCardReviewView
            employees={employees}
            companyProfile={companyProfile}
          />
        </div>
      )}

      {/* MODAL: Form Tambah / Edit Karyawan */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h2>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NIP (ID Karyawan - Autoincrement) *
                  </label>
                  <input
                    type="text"
                    readOnly
                    required
                    value={empForm.nip || ''}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold cursor-not-allowed select-all"
                    title="NIP otomatis bertambah (Autoincrement)"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    *ID Karyawan otomatis autoincrement format NIP murni
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.full_name || ''}
                    onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                    placeholder="Nama Karyawan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Divisi *
                  </label>
                  <select
                    required
                    value={empForm.division_id || ''}
                    onChange={(e) => setEmpForm({ ...empForm, division_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.division_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Golongan (Job Grade) *
                  </label>
                  <select
                    required
                    value={empForm.job_grade_id || ''}
                    onChange={(e) => setEmpForm({ ...empForm, job_grade_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    {jobGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Base Salary / Upah per Jam (IDR) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formatThousandNumber(empForm.base_salary)}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, base_salary: parseThousandNumber(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold"
                    placeholder="e.g. 25.000"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-300">
                    Sistem otomatis memberi tanda titik (.) pada ribuan / puluhan ribu
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Karyawan
                  </label>
                  <select
                    value={empForm.status || 'active'}
                    onChange={(e) => setEmpForm({ ...empForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                    <option value="resigned">Resigned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode QR Kiosk (Read-Only)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={empForm.nip || ''}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181b] text-slate-900 dark:text-white font-mono cursor-not-allowed select-all"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    *Tersinkronisasi otomatis dengan NIP untuk scan presensi Kiosk
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={empForm.phone || ''}
                    onChange={(e) => setEmpForm({ ...empForm, phone: formatPhoneNumber(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                    placeholder="0812-3456-7890"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Nomor Rekening Bank (Payroll Transfer)</span>
                  </label>
                  <input
                    type="text"
                    value={empForm.bank_account || empForm.rfid_code || ''}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        bank_account: e.target.value,
                        rfid_code: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                    placeholder="Contoh: BCA 1234567890 a.n Budi Santoso / Bank Mandiri 142001928371"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    *Disimpan di database (kolom rekening) & terhubung otomatis untuk pembayaran slip gaji
                  </span>
                </div>
              </div>

              {/* Foto Pegawai Section (Local File / USB Cam Snapshot) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Upload Foto Pegawai (Local Drive / USB Cam)</span>
                  </label>
                  <div className="flex p-0.5 bg-slate-200 dark:bg-[#121215] rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setPhotoUploadTab('upload');
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        photoUploadTab === 'upload' ? 'bg-white dark:bg-[#27272a] text-amber-500 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      File Local
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUploadTab('camera');
                        startCamera();
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        photoUploadTab === 'camera' ? 'bg-white dark:bg-[#27272a] text-amber-500 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      USB Cam
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Avatar Box */}
                  <div className="w-20 h-20 rounded-2xl border-2 border-amber-400/80 bg-slate-100 dark:bg-[#121215] overflow-hidden shrink-0 relative flex items-center justify-center shadow-md">
                    {empForm.avatar_url || empForm.photo_url ? (
                      <img src={empForm.avatar_url || empForm.photo_url} alt="Foto Karyawan" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-8 h-8 text-slate-400" />
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {photoUploadTab === 'upload' ? (
                      <div>
                        <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                          Pilih file foto dari local drive / USB storage:
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFilePhotoChange}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-500 dark:text-slate-300">
                            *Foto otomatis dikompresi & disimpan permanen di server
                          </span>
                          {(empForm.avatar_url || empForm.photo_url) && (
                            <button
                              type="button"
                              onClick={() => setEmpForm((prev) => ({ ...prev, avatar_url: '', photo_url: '' }))}
                              className="text-[10px] text-rose-500 hover:text-rose-400 font-semibold"
                            >
                              Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {isCameraActive ? (
                          <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 max-w-xs mx-auto sm:mx-0">
                            <video
                              ref={videoRef}
                              playsInline
                              muted
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 bg-slate-900/90 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={captureCameraSnapshot}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-md w-full justify-center"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Ambil Foto Snapshot</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#27272a] hover:bg-slate-300 dark:hover:bg-[#3f3f46] text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                          >
                            <Video className="w-4 h-4 text-amber-500" />
                            <span>Buka Live Kamera USB</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={empForm.address || ''}
                  onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                  placeholder="Alamat domisili / KTP"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#27272a]">
                <button
                  type="button"
                  disabled={isSubmittingEmp}
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmp}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingEmp && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingEmp ? 'Menyimpan...' : (editingEmployee ? 'Simpan Perubahan' : 'Tambah Karyawan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Divisi */}
      {showDivModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingDiv ? 'Edit Master Divisi' : 'Tambah Divisi Baru'}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingDiv) return;
                setIsSubmittingDiv(true);
                try {
                  if (editingDiv && onUpdateDivision) {
                    await onUpdateDivision(editingDiv.id, divForm);
                  } else {
                    await onAddDivision(divForm);
                  }
                  setShowDivModal(false);
                } finally {
                  setIsSubmittingDiv(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Divisi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LOG"
                  value={divForm.division_code || ''}
                  onChange={(e) => setDivForm({ ...divForm, division_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Divisi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Logistik & Armada Truk Mixer"
                  value={divForm.division_name || ''}
                  onChange={(e) => setDivForm({ ...divForm, division_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi tugas divisi..."
                  value={divForm.description || ''}
                  onChange={(e) => setDivForm({ ...divForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingDiv}
                  onClick={() => setShowDivModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDiv}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingDiv && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingDiv ? 'Menyimpan...' : (editingDiv ? 'Simpan Perubahan' : 'Simpan Divisi')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Golongan */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272a] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingGrade ? 'Edit Master Golongan (Job Grade)' : 'Tambah Golongan (Job Grade)'}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingGrade) return;
                setIsSubmittingGrade(true);
                try {
                  if (editingGrade && onUpdateJobGrade) {
                    await onUpdateJobGrade(editingGrade.id, gradeForm);
                  } else {
                    await onAddJobGrade(gradeForm);
                  }
                  setShowGradeModal(false);
                } finally {
                  setIsSubmittingGrade(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Golongan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. V"
                  value={gradeForm.grade_code || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Golongan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golongan V - Direksi"
                  value={gradeForm.grade_name || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Kualifikasi / level jabatan..."
                  value={gradeForm.description || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              {/* Lateness Exemption Toggle for Job Grade */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(gradeForm.is_exempt_from_lateness)}
                    onChange={(e) => setGradeForm({ ...gradeForm, is_exempt_from_lateness: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold">Bebaskan Golongan Ini dari Keterlambatan</span>
                    <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      Jika diaktifkan, seluruh karyawan pada golongan ini tidak akan pernah dihitung 'terlambat' saat presensi masuk dan dibebaskan dari denda presensi.
                    </span>
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingGrade}
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                >
                  {isSubmittingGrade && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  <span>{isSubmittingGrade ? 'Menyimpan...' : (editingGrade ? 'Simpan Perubahan' : 'Simpan Golongan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DRILL-DOWN: DAFTAR KARYAWAN PER DIVISI / GOLONGAN */}
      {selectedCardForEmployees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272a] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50/50 dark:bg-[#18181b]/50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  selectedCardForEmployees.type === 'division'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                }`}>
                  {selectedCardForEmployees.type === 'division' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#27272a] text-slate-700 dark:text-slate-300">
                      {selectedCardForEmployees.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {selectedCardForEmployees.type === 'division' ? 'Daftar Karyawan Divisi' : 'Daftar Karyawan Golongan'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedCardForEmployees.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCardForEmployees(null)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls & Search */}
            <div className="p-4 border-b border-slate-100 dark:border-[#27272a] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121215]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIP, kontak..."
                  value={drillDownSearch}
                  onChange={(e) => setDrillDownSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {(() => {
                const groupEmployees = employees.filter((e) =>
                  selectedCardForEmployees.type === 'division'
                    ? e.division_id === selectedCardForEmployees.item.id
                    : e.job_grade_id === selectedCardForEmployees.item.id
                );

                const filtered = groupEmployees.filter((e) => {
                  if (!drillDownSearch) return true;
                  const q = drillDownSearch.toLowerCase();
                  return (
                    e.full_name?.toLowerCase().includes(q) ||
                    e.nip?.toLowerCase().includes(q) ||
                    e.email?.toLowerCase().includes(q) ||
                    e.phone?.toLowerCase().includes(q)
                  );
                });

                return (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Total: <b>{filtered.length}</b> / {groupEmployees.length} Karyawan
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCardForEmployees.type === 'division') {
                          setSelectedDivision(String(selectedCardForEmployees.item.id));
                        }
                        setSubTab('employees');
                        setSelectedCardForEmployees(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#3f3f46] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Buka di Master Karyawan →
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Modal Employee List Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[55vh]">
              {(() => {
                const groupEmployees = employees.filter((e) =>
                  selectedCardForEmployees.type === 'division'
                    ? e.division_id === selectedCardForEmployees.item.id
                    : e.job_grade_id === selectedCardForEmployees.item.id
                );

                const filtered = groupEmployees.filter((e) => {
                  if (!drillDownSearch) return true;
                  const q = drillDownSearch.toLowerCase();
                  return (
                    e.full_name?.toLowerCase().includes(q) ||
                    e.nip?.toLowerCase().includes(q) ||
                    e.email?.toLowerCase().includes(q) ||
                    e.phone?.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      {drillDownSearch
                        ? 'Tidak ditemukan karyawan yang sesuai kata kunci pencarian.'
                        : 'Belum ada karyawan yang terdaftar dalam grup ini.'}
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#27272a]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3">Karyawan</th>
                          <th className="py-2.5 px-3">
                            {selectedCardForEmployees.type === 'division' ? 'Golongan' : 'Divisi'}
                          </th>
                          <th className="py-2.5 px-3">Kontak & Alamat</th>
                          <th className="py-2.5 px-3">Tgl Gabung</th>
                          <th className="py-2.5 px-3">Gaji Pokok</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                        {filtered.map((emp, idx) => {
                          const divObj = divisions.find((d) => d.id === emp.division_id);
                          const gradeObj = jobGrades.find((g) => g.id === emp.job_grade_id);

                          return (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-[#18181b]/50 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  {emp.avatar_url ? (
                                    <img
                                      src={emp.avatar_url}
                                      alt={emp.full_name}
                                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-[#27272a]"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#27272a] flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                                      {emp.full_name?.charAt(0) || 'K'}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {emp.full_name}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                      NIP: {emp.nip}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                {selectedCardForEmployees.type === 'division' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                    {gradeObj?.grade_name || emp.job_grade_name || 'Staff'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                    {divObj?.division_name || emp.division_name || 'Operasional'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                <div>{emp.phone || '-'}</div>
                                <div className="text-[10px] text-slate-400">{emp.email || '-'}</div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                {formatDateDDMMYYYY(emp.join_date)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatRupiah(emp.base_salary)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    emp.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}
                                >
                                  {emp.status === 'active' ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIdCardEmployee(emp);
                                      setShowIdCardModal(true);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                    title="Cetak / Preview ID Card"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEmployee(emp);
                                      setEmpForm({
                                        nip: emp.nip,
                                        full_name: emp.full_name,
                                        division_id: emp.division_id,
                                        job_grade_id: emp.job_grade_id,
                                        email: emp.email,
                                        phone: emp.phone,
                                        address: emp.address,
                                        join_date: emp.join_date,
                                        base_salary: emp.base_salary,
                                        qr_code: emp.qr_code,
                                        avatar_url: emp.avatar_url,
                                        status: emp.status,
                                      });
                                      setSelectedCardForEmployees(null);
                                      setShowEmployeeModal(true);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                                    title="Edit Karyawan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50/50 dark:bg-[#18181b]/50">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Data karyawan tersinkronisasi otomatis dengan Master Jadwal dan Kalender Kehadiran.
              </span>
              <button
                type="button"
                onClick={() => setSelectedCardForEmployees(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-[#27272a] hover:bg-slate-300 dark:hover:bg-[#3f3f46] text-slate-700 dark:text-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE ID CARD PRINT MODAL (Pict 1 - Standar Kiosk QR / NIP, Tanpa RFID) */}
      <EmployeeIdCardModal
        isOpen={showIdCardModal}
        onClose={() => setShowIdCardModal(false)}
        employee={idCardEmployee}
        allEmployees={employees}
        onSelectEmployee={setIdCardEmployee}
        companyName={companyName}
      />

      {/* UNIVERSAL DATABASE CONFIRMATION POPUP */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        details={confirmModal.details}
      />
    </div>
  );
};
