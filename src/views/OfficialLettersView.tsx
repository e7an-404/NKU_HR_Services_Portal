import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  AlertTriangle,
  Award,
  UserX,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  ShieldCheck,
  Stamp,
  PenTool,
  Check,
  RefreshCw,
} from 'lucide-react';
import { OfficialLetter, OfficialLetterType, Employee, User as UserType, CompanyProfile } from '../types';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { formatDateDDMMYYYY } from '../lib/formatUtils';

interface OfficialLettersViewProps {
  currentUser: UserType;
  employees: Employee[];
  accentColor: string;
  companyName?: string;
  companyProfile?: CompanyProfile;
}

export const OfficialLettersView: React.FC<OfficialLettersViewProps> = ({
  currentUser,
  employees,
  accentColor,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  companyProfile,
}) => {
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [previewLetter, setPreviewLetter] = useState<OfficialLetter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<OfficialLetter>>({
    letter_type: 'warning',
    employee_id: employees[0]?.id || 1,
    letter_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    effective_date: new Date().toISOString().slice(0, 10),
    warning_level: 'SP-1',
    violation_reason: 'Keterlambatan berulang tanpa pemberitahuan resmi dan meninggalkan pos kerja sebelum waktu shift selesai.',
    validity_months: 6,
    join_date: '2024-01-15',
    end_date: new Date().toISOString().slice(0, 10),
    accomplishments: 'Menunjukkan dedikasi dan kinerja memuaskan dalam mendukung kelancaran operasional batching plant proyek.',
    layoff_reason: 'Rasionalisasi tim operasional pasca selesainya fase utama proyek konstruksi.',
    severance_notes: 'Pemberian uang pesangon dan uang penghargaan masa kerja dibayarkan sesuai ketentuan UU Cipta Kerja No. 6/2023.',
    company_signatory_name: 'Budi Santoso, S.T.',
    company_signatory_title: 'Direktur Operasional / HRD Manager',
    employee_acknowledged: true,
    notes: 'Surat resmi ini diterbitkan sah oleh manajemen perusahaan.',
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Table Sync State
  const [isSyncingTable, setIsSyncingTable] = useState(false);
  const handleSyncLetters = async () => {
    setIsSyncingTable(true);
    try {
      const res = await api.syncTable('official_letters');
      toast.success('Sync Berhasil', res.message || `Tabel official_letters berhasil disinkronkan (${res.rowCount || 0} baris)`);
      loadLetters();
    } catch (err: any) {
      toast.error('Gagal Sync', err.message || 'Gagal sinkronisasi data surat resmi');
    } finally {
      setIsSyncingTable(false);
    }
  };

  const activeCompany = companyProfile || {
    id: 1,
    company_name: companyName,
    logo_url: '/logo_nku.svg',
    address: 'Jl. Pemuda No. 45, Kompleks Perkantoran NKU Central, Jakarta Selatan',
    phone: '(021) 7890-1234',
    email: 'hrd@nindyaprima.co.id',
  };

  const loadLetters = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOfficialLetters();
      if (Array.isArray(data)) {
        setLetters(data);
      }
    } catch (err) {
      console.error('Failed to load official letters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, []);

  // Generate Letter Number Preview
  const generateLetterNumber = (type: OfficialLetterType, empId: number) => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentMonth = romanMonths[new Date().getMonth()];
    const currentYear = new Date().getFullYear();
    const prefix = type === 'warning' ? 'SP' : type === 'recommendation' ? 'SKP' : 'PHK';
    const num = Math.floor(100 + Math.random() * 900);
    return `${num}/NKU-HRD-${prefix}/${currentMonth}/${currentYear}`;
  };

  const handleOpenCreateModal = (type: OfficialLetterType = 'warning') => {
    const selectedEmp = employees[0];
    const generatedNum = generateLetterNumber(type, selectedEmp?.id || 1);
    setFormData({
      letter_type: type,
      employee_id: selectedEmp?.id || 1,
      letter_number: generatedNum,
      issue_date: new Date().toISOString().slice(0, 10),
      effective_date: new Date().toISOString().slice(0, 10),
      warning_level: 'SP-1',
      violation_reason: 'Ketidakhadiran kerja tanpa keterangan sah selama 3 hari berturut-turut serta tidak mematuhi instruksi keselamatan kerja (K3) di lokasi proyek.',
      validity_months: 6,
      join_date: selectedEmp?.join_date || '2024-01-15',
      end_date: new Date().toISOString().slice(0, 10),
      accomplishments: 'Selama masa kerja telah menunjukkan loyalitas, disiplin, serta kontribusi aktif dalam pemeliharaan armada dan standar mutu beton.',
      layoff_reason: 'Rasionalisasi divisi dan selesainya masa kontrak kerja proyek konstruksi beton terintegrasi.',
      severance_notes: 'Kompensasi pesangon, uang penggantian hak, serta surat pengalaman kerja telah diselesaikan sesuai PP No. 35/2021.',
      company_signatory_name: 'Budi Santoso, S.T.',
      company_signatory_title: 'Direktur Operasional / HRD Manager',
      employee_acknowledged: true,
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find((emp) => emp.id === Number(formData.employee_id));
      const payload: Partial<OfficialLetter> = {
        ...formData,
        employee_name: selectedEmp?.full_name || 'Karyawan',
        employee_nip: selectedEmp?.nip || 'NKU-000',
        division_name: selectedEmp?.division_name || 'Operasional',
        job_title: selectedEmp?.job_grade_name || 'Staff',
      };

      const res = await api.createOfficialLetter(payload);
      if (res.success && res.letter) {
        setLetters((prev) => [res.letter!, ...prev]);
        setShowCreateModal(false);
        setPreviewLetter(res.letter);
      } else {
        alert(res.message || 'Gagal membuat surat resmi');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLetter = async (letter: OfficialLetter) => {
    if (confirm(`Yakin ingin menghapus dokumen surat "${letter.letter_number}" untuk ${letter.employee_name}?`)) {
      try {
        const res = await api.deleteOfficialLetter(letter.id);
        if (res.success) {
          setLetters((prev) => prev.filter((l) => l.id !== letter.id));
          if (previewLetter?.id === letter.id) {
            setPreviewLetter(null);
          }
        }
      } catch (err: any) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter letters
  const filteredLetters = letters.filter((l) => {
    const matchesType = filterType === 'all' || l.letter_type === filterType;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      l.letter_number?.toLowerCase().includes(q) ||
      l.employee_name?.toLowerCase().includes(q) ||
      l.employee_nip?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Manajemen Surat Resmi & Legal Ketenagakerjaan
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Penerbitan Surat Peringatan (SP 1, 2, 3), Surat Rekomendasi / Pengalaman Kerja (Paklaring), dan Surat PHK lengkap dengan Watermark Perusahaan & Tanda Tangan Sah Dua Belah Pihak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal('warning')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>+ Buat Surat Peringatan (SP)</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('recommendation')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>+ Rekomendasi (Paklaring)</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('layoff')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <UserX className="w-4 h-4" />
            <span>+ Surat PHK</span>
          </button>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Surat Resmi</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{letters.length}</span>
          </div>
          <FileText className="w-6 h-6 text-slate-400" />
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Surat Peringatan (SP)</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {letters.filter((l) => l.letter_type === 'warning').length}
            </span>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Rekomendasi / Paklaring</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {letters.filter((l) => l.letter_type === 'recommendation').length}
            </span>
          </div>
          <Award className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">Surat PHK / Layoff</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {letters.filter((l) => l.letter_type === 'layoff').length}
            </span>
          </div>
          <UserX className="w-6 h-6 text-rose-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a]">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Tipe Surat:</span>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'warning', label: 'Surat Peringatan (SP)' },
              { id: 'recommendation', label: 'Rekomendasi (Paklaring)' },
              { id: 'layoff', label: 'Surat PHK' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#27272a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncLetters}
            disabled={isSyncingTable}
            className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            style={{
              borderColor: `${accentColor}50`,
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
            title="Sinkronisasi data surat resmi dengan database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTable ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
            <span>{isSyncingTable ? 'Menyinkronkan...' : 'Sync'}</span>
          </button>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari no. surat, nama, NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Letters Table */}
      <div className="rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Daftar Dokumen Surat Resmi</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-300">
              {filteredLetters.length} Dokumen
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat data surat resmi...</div>
        ) : filteredLetters.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Belum ada dokumen surat resmi yang diterbitkan. Klik tombol di atas untuk membuat surat baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#27272a]">
                <tr>
                  <th className="px-4 py-3">Tipe Surat</th>
                  <th className="px-4 py-3">Nomor Surat</th>
                  <th className="px-4 py-3">Karyawan Penerima</th>
                  <th className="px-4 py-3">Tanggal Terbit</th>
                  <th className="px-4 py-3">Keterangan / Tingkat</th>
                  <th className="px-4 py-3">Status Tanda Tangan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                {filteredLetters.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-[#18181b]/60 transition-colors">
                    <td className="px-4 py-3">
                      {l.letter_type === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Peringatan ({l.warning_level || 'SP-1'})</span>
                        </span>
                      )}
                      {l.letter_type === 'recommendation' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Award className="w-3 h-3" />
                          <span>Rekomendasi (Paklaring)</span>
                        </span>
                      )}
                      {l.letter_type === 'layoff' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <UserX className="w-3 h-3" />
                          <span>Pemutusan Kerja (PHK)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {l.letter_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{l.employee_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {l.employee_nip} • {l.division_name || 'Operasional'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {formatDateDDMMYYYY(l.issue_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {l.letter_type === 'warning' && (l.violation_reason || 'Pelanggaran Disiplin Kerja')}
                      {l.letter_type === 'recommendation' && `Masa Kerja: ${formatDateDDMMYYYY(l.join_date)} s/d ${formatDateDDMMYYYY(l.end_date)}`}
                      {l.letter_type === 'layoff' && (l.layoff_reason || 'Rasionalisasi Proyek')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sah & Siap Cetak (2 Pihak)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewLetter(l)}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat & Cetak Dokumen"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak / Preview</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLetter(l)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE LETTER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-[#27272a] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Penerbitan Surat Resmi Perusahaan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dokumen berkekuatan hukum dengan Kop Resmi, Watermark, dan Tanda Tangan Sah Dua Belah Pihak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLetter} className="space-y-4">
              {/* Tipe Dokumen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Jenis Surat Resmi *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'warning', label: 'Surat Peringatan (SP)', icon: AlertTriangle, color: 'text-amber-500' },
                    { id: 'recommendation', label: 'Rekomendasi (Paklaring)', icon: Award, color: 'text-emerald-500' },
                    { id: 'layoff', label: 'Surat PHK / Layoff', icon: UserX, color: 'text-rose-500' },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = formData.letter_type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const newType = t.id as OfficialLetterType;
                          setFormData((prev) => ({
                            ...prev,
                            letter_type: newType,
                            letter_number: generateLetterNumber(newType, Number(prev.employee_id || 1)),
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-[#27272a] bg-slate-50/50 dark:bg-[#18181b] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${t.color}`} />
                        <span className="text-xs text-center">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Karyawan & Nomor Surat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Karyawan Penerima *
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => {
                      const empId = Number(e.target.value);
                      const emp = employees.find((x) => x.id === empId);
                      setFormData((prev) => ({
                        ...prev,
                        employee_id: empId,
                        join_date: emp?.join_date || '2024-01-15',
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.nip}) - {emp.division_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Dokumen Surat Resmi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.letter_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, letter_number: e.target.value }))}
                    placeholder="Contoh: 102/NKU-HRD-SP/IX/2026"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Tanggal Terbit & Efektif */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Terbit Surat *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Efektif Berlaku *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, effective_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono cursor-pointer"
                  />
                </div>
              </div>

              {/* Specifics based on letter type */}
              {formData.letter_type === 'warning' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Detail Surat Peringatan (SP)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tingkat Peringatan *
                      </label>
                      <select
                        value={formData.warning_level}
                        onChange={(e) => setFormData((prev) => ({ ...prev, warning_level: e.target.value as any }))}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-bold cursor-pointer"
                      >
                        <option value="SP-1">Surat Peringatan Pertama (SP-1)</option>
                        <option value="SP-2">Surat Peringatan Kedua (SP-2)</option>
                        <option value="SP-3">Surat Peringatan Ketiga / Terakhir (SP-3)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Masa Berlaku Sanksi (Bulan)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={formData.validity_months || 6}
                        onChange={(e) => setFormData((prev) => ({ ...prev, validity_months: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Standar UU Ketenagakerjaan: 6 Bulan</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Uraian Pelanggaran & Bukti Ketidakdisiplinan *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.violation_reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, violation_reason: e.target.value }))}
                      placeholder="Uraikan tindakan pelanggaran SOP / tata tertib kerja..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {formData.letter_type === 'recommendation' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Detail Surat Rekomendasi & Pengalaman Kerja (Paklaring)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mulai Bekerja (Join Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.join_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, join_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Selesai Bekerja (End Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prestasi & Rekomendasi Kinerja *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.accomplishments}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accomplishments: e.target.value }))}
                      placeholder="Penilaian etos kerja, dedikasi, serta doa sukses untuk karir berikutnya..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {formData.letter_type === 'layoff' && (
                <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-300 text-xs">
                    <UserX className="w-4 h-4 text-rose-600" />
                    <span>Detail Surat Pemutusan Hubungan Kerja (PHK)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alasan Pemutusan Hubungan Kerja (PHK) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={formData.layoff_reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, layoff_reason: e.target.value }))}
                      placeholder="Contoh: Rasionalisasi kebutuhan proyek, efisiensi operasional, atau berakhirnya masa kontrak kerja..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ketentuan Pesangon & Kompensasi Hak Karyawan *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={formData.severance_notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, severance_notes: e.target.value }))}
                      placeholder="Ketentuan pesangon, uang penggantian hak, serta pengembalian aset perusahaan..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Tanda Tangan Pihak Perusahaan */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-[#27272a]">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Penandatangan Perusahaan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_signatory_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_signatory_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan Penandatangan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_signatory_title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_signatory_title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#18181b] dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan Dokumen Sah'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW & PRINT MODAL (WITH WATERMARK AND DUAL SIGNATURE) */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white dark:bg-[#0f0f12] rounded-2xl border border-slate-300 dark:border-[#27272a] shadow-2xl p-4 sm:p-8 flex flex-col">
            {/* Modal Controls Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-[#27272a] no-print">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Preview Dokumen Resmi & Siap Cetak
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lengkap dengan Watermark Logo Perusahaan & Kolom Tanda Tangan Dua Belah Pihak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Surat (A4)</span>
                </button>
                <button
                  onClick={() => setPreviewLetter(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 PRINTABLE DOCUMENT BODY WITH WATERMARK */}
            <div
              ref={printAreaRef}
              id="official-letter-print-area"
              className="relative p-6 sm:p-10 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 select-text overflow-hidden font-serif"
              style={{ minHeight: '900px' }}
            >
              {/* COMPANY WATERMARK IN BACKGROUND */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.06] rotate-[-25deg]"
                aria-hidden="true"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <img
                    src={activeCompany.logo_url || '/logo_nku.svg'}
                    alt="Watermark"
                    className="w-80 h-80 object-contain grayscale"
                  />
                  <div className="text-5xl font-black tracking-widest text-slate-800 uppercase mt-4">
                    {activeCompany.company_name}
                  </div>
                  <div className="text-xl font-bold tracking-widest text-slate-600 uppercase mt-2">
                    OFFICIAL LEGAL DOCUMENT • WATERMARK
                  </div>
                </div>
              </div>

              {/* DOCUMENT CONTENT (Z-INDEX ABOVE WATERMARK) */}
              <div className="relative z-10 space-y-6">
                {/* 1. KOP SURAT RESMI (OFFICIAL LETTERHEAD) */}
                <div className="flex items-center justify-between pb-4 border-b-4 border-double border-slate-900">
                  <div className="flex items-center gap-4">
                    <img
                      src={activeCompany.logo_url || '/logo_nku.svg'}
                      alt="Logo NKU"
                      className="w-16 h-16 object-contain shrink-0"
                    />
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
                        {activeCompany.company_name}
                      </h1>
                      <p className="text-xs text-slate-700 font-sans mt-0.5">
                        {activeCompany.address}
                      </p>
                      <p className="text-xs text-slate-600 font-sans">
                        Telepon: {activeCompany.phone} • Email: {activeCompany.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="px-3 py-1 bg-slate-100 rounded text-[10px] font-sans font-bold uppercase tracking-wider text-slate-700">
                      Surat Keputusan Resmi
                    </div>
                  </div>
                </div>

                {/* 2. NOMOR & JUDUL SURAT */}
                <div className="text-center pt-2">
                  <h2 className="text-lg sm:text-xl font-bold underline uppercase tracking-wider text-slate-900">
                    {previewLetter.letter_type === 'warning' && `SURAT PERINGATAN ${previewLetter.warning_level || 'SP-1'}`}
                    {previewLetter.letter_type === 'recommendation' && 'SURAT PENGALAMAN & REKOMENDASI KERJA'}
                    {previewLetter.letter_type === 'layoff' && 'SURAT PEMUTUSAN HUBUNGAN KERJA (PHK)'}
                  </h2>
                  <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    Nomor: {previewLetter.letter_number}
                  </p>
                </div>

                {/* 3. PEMBUKA & IDENTITAS PIHAK KARYAWAN */}
                <div className="text-xs sm:text-sm leading-relaxed text-slate-800 font-sans space-y-3">
                  <p>
                    Sehubungan dengan ketentuan Peraturan Perusahaan serta Undang-Undang Ketenagakerjaan yang berlaku, dengan ini Manajemen <strong>{activeCompany.company_name}</strong> menyampaikan surat keputusan kepada:
                  </p>

                  <div className="my-3 pl-4 sm:pl-8 py-2 border-l-2 border-slate-400 bg-slate-50/80 rounded-r-lg space-y-1 font-sans text-xs sm:text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-600 font-medium">Nama Lengkap</span>
                      <span className="col-span-2 font-bold text-slate-900">: {previewLetter.employee_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-600 font-medium">Nomor Induk Pegawai (NIP)</span>
                      <span className="col-span-2 font-mono font-bold text-slate-900">: {previewLetter.employee_nip}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-600 font-medium">Divisi / Departemen</span>
                      <span className="col-span-2 font-semibold text-slate-900">: {previewLetter.division_name || 'Operasional'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-600 font-medium">Jabatan / Golongan</span>
                      <span className="col-span-2 font-semibold text-slate-900">: {previewLetter.job_title || 'Staff'}</span>
                    </div>
                  </div>

                  {/* ISI SURAT SESUAI TIPE */}
                  {previewLetter.letter_type === 'warning' && (
                    <div className="space-y-3 pt-2">
                      <p>
                        Berdasarkan hasil evaluasi kedisiplinan dan laporan pengawas operasional proyek, telah ditemukan adanya pelanggaran tata tertib dan standar prosedur operasional (SOP) berupa:
                      </p>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 font-semibold italic">
                        "{previewLetter.violation_reason || 'Pelanggaran disiplin jam kerja dan SOP operasional.'}"
                      </div>
                      <p>
                        Maka dengan ini Manajemen menerbitkan <strong>{previewLetter.warning_level || 'SP-1'}</strong> yang berlaku selama <strong>{previewLetter.validity_months || 6} (enam) bulan</strong> terhitung sejak tanggal diterbitkannya surat ini.
                      </p>
                      <p>
                        Apabila dalam masa berlakunya Surat Peringatan ini yang bersangkutan kembali melakukan pelanggaran disiplin kerja atau tata tertib perusahaan, maka manajemen berhak mengambil tindakan tegas hingga ke tingkat peringatan berikutnya atau pemutusan hubungan kerja sesuai peraturan yang berlaku.
                      </p>
                    </div>
                  )}

                  {previewLetter.letter_type === 'recommendation' && (
                    <div className="space-y-3 pt-2">
                      <p>
                        Menerangkan dengan sebenarnya bahwa yang bersangkutan telah bekerja di <strong>{activeCompany.company_name}</strong> sejak tanggal <strong>{formatDateDDMMYYYY(previewLetter.join_date)}</strong> sampai dengan tanggal <strong>{formatDateDDMMYYYY(previewLetter.end_date)}</strong> dengan posisi terakhir sebagai <strong>{previewLetter.job_title || 'Staff Operasional'}</strong>.
                      </p>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 font-medium">
                        "{previewLetter.accomplishments || 'Selama masa baktinya, yang bersangkutan telah menunjukkan loyalitas, integritas, serta dedikasi kerja yang baik bagi kemajuan perusahaan.'}"
                      </div>
                      <p>
                        Surat rekomendasi dan pengalaman kerja ini diberikan atas permohonan yang bersangkutan untuk dipergunakan sebagaimana mestinya. Kami mengucapkan terima kasih atas segala kontribusi dan kerja sama yang telah diberikan, serta mendoakan kesuksesan pada karir di masa mendatang.
                      </p>
                    </div>
                  )}

                  {previewLetter.letter_type === 'layoff' && (
                    <div className="space-y-3 pt-2">
                      <p>
                        Dengan ini diberitahukan bahwa terhitung sejak tanggal <strong>{formatDateDDMMYYYY(previewLetter.effective_date)}</strong>, hubungan kerja antara <strong>{activeCompany.company_name}</strong> dengan yang bersangkutan dinyatakan berakhir (Pemutusan Hubungan Kerja).
                      </p>
                      <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-950 space-y-1">
                        <div className="font-bold">Dasar & Alasan Pemutusan Hubungan Kerja:</div>
                        <p className="italic">"{previewLetter.layoff_reason || 'Rasionalisasi tim operasional sehubungan dengan selesainya target proyek.'}"</p>
                      </div>
                      <p>
                        Terkait hak-hak ketenagakerjaan, uang pesangon, serta uang penggantian hak dibayarkan sesuai dengan ketentuan Peraturan Pemerintah No. 35 Tahun 2021 dan Undang-Undang No. 6 Tahun 2023:
                      </p>
                      <div className="p-2.5 bg-slate-100 rounded text-slate-800 text-xs">
                        {previewLetter.severance_notes || 'Seluruh hak kompensasi telah disepakati dan dibayarkan secara penuh melalui transfer rekening.'}
                      </div>
                      <p>
                        Yang bersangkutan diwajibkan menyelesaikan serah terima tugas (handover) pekerjaan serta seluruh aset inventaris perusahaan kepada penanggung jawab divisi terkait sebelum tanggal efektif.
                      </p>
                    </div>
                  )}

                  <p className="pt-2">
                    Demikian surat keputusan resmi ini dibuat dengan sebenarnya untuk diketahui dan dipatuhi oleh kedua belah pihak.
                  </p>
                </div>

                {/* 4. DUAL SIGNATURE SECTION (TANDA TANGAN SAH DUA BELAH PIHAK) */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs sm:text-sm font-sans">
                  {/* Left Column: Karyawan Penerima */}
                  <div className="flex flex-col items-center justify-between min-h-[160px]">
                    <div>
                      <p className="text-slate-500 font-medium">Jakarta, {formatDateDDMMYYYY(previewLetter.issue_date)}</p>
                      <p className="font-bold text-slate-900 mt-1 uppercase">Pihak Karyawan,</p>
                      <p className="text-[11px] text-slate-500">(Yang Menerima & Menyetujui)</p>
                    </div>

                    {/* Materai Placeholder / Tanda Tangan */}
                    <div className="my-3 w-32 h-16 border border-dashed border-slate-400 bg-slate-50 rounded flex flex-col items-center justify-center text-[10px] text-slate-400">
                      <span>Materai</span>
                      <span>Rp 10.000</span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 underline uppercase">{previewLetter.employee_name}</p>
                      <p className="text-xs text-slate-600 font-mono">NIP: {previewLetter.employee_nip}</p>
                    </div>
                  </div>

                  {/* Right Column: Pihak Manajemen Perusahaan */}
                  <div className="flex flex-col items-center justify-between min-h-[160px] relative">
                    <div>
                      <p className="text-slate-500 font-medium">Jakarta, {formatDateDDMMYYYY(previewLetter.issue_date)}</p>
                      <p className="font-bold text-slate-900 mt-1 uppercase">Pihak Manajemen,</p>
                      <p className="text-[11px] font-bold text-slate-800">{activeCompany.company_name}</p>
                    </div>

                    {/* Stempel / Cap Perusahaan Digital Overlay */}
                    <div className="relative my-2 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-2 border-double border-red-700/80 text-red-700/80 flex flex-col items-center justify-center p-1 text-[8px] font-black uppercase text-center rotate-[-12deg] pointer-events-none select-none">
                        <span className="tracking-tighter">{activeCompany.company_name}</span>
                        <div className="w-16 h-px bg-red-700/60 my-0.5" />
                        <span className="text-[7px]">★ RESMI SAH ★</span>
                        <div className="w-16 h-px bg-red-700/60 my-0.5" />
                        <span className="text-[6px]">HRD & LEGAL</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center font-serif italic text-slate-700 text-lg">
                        {previewLetter.company_signatory_name}
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 underline uppercase">
                        {previewLetter.company_signatory_name}
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        {previewLetter.company_signatory_title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. FOOTER RESMI DOKUMEN */}
                <div className="pt-6 mt-6 border-t border-slate-300 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Dokumen Sah NKU-HRMS • Cetak Resmi: {new Date().toLocaleString('id-ID')}</span>
                  <span>Lembar 1: Arsip Perusahaan • Lembar 2: Karyawan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
