import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { DateInput } from '../components/DateInput';
import { CompanyProfile, Holiday } from '../types';
import { CompanyProfileManager } from '../components/CompanyProfileManager';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { getContrastTextColorStyle, getAccessibleAccentColor } from '../lib/companyUtils';
import { formatDateDDMMYYYY } from '../lib/formatUtils';

interface AppConfigViewProps {
  company: CompanyProfile;
  companies?: CompanyProfile[];
  holidays: Holiday[];
  accentColor: string;
  isDarkMode?: boolean;
  currentUserRole?: string;
  onUpdateCompany: (data: Partial<CompanyProfile>) => Promise<any>;
  onSelectCompany?: (id: number) => Promise<any>;
  onAddCompany?: (data: Partial<CompanyProfile>) => Promise<any>;
  onDeleteCompany?: (id: number) => Promise<any>;
  onUploadLogo?: (imageBase64: string, companyId?: number) => Promise<any>;
  onAddHoliday: (data: Partial<Holiday>) => Promise<any>;
  onUpdateHoliday?: (id: number, data: Partial<Holiday>) => Promise<any>;
  onDeleteHoliday: (id: number) => Promise<any>;
  onSyncHolidays?: (year?: number) => Promise<any>;
}

export const AppConfigView: React.FC<AppConfigViewProps> = ({
  company,
  companies = [],
  holidays,
  accentColor,
  isDarkMode = true,
  currentUserRole,
  onUpdateCompany,
  onSelectCompany,
  onAddCompany,
  onDeleteCompany,
  onUploadLogo,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onSyncHolidays,
}) => {
  const accessibleColor = getAccessibleAccentColor(accentColor, isDarkMode !== false);
  const [subTab, setSubTab] = useState<'company' | 'holidays'>('company');

  // Holiday Form & State
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: '',
    holiday_name: '',
    is_joint_leave: false,
  });
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [holidaySearch, setHolidaySearch] = useState('');
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<string>('2026');
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [holidayNotice, setHolidayNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-sync when user selects a specific year that has no holiday data yet
  useEffect(() => {
    if (selectedHolidayYear !== 'all' && onSyncHolidays && !syncingHolidays) {
      const yearNum = Number(selectedHolidayYear);
      const hasDataForYear = (holidays || []).some(
        (h) => h.holiday_date && new Date(h.holiday_date).getFullYear() === yearNum
      );
      if (!hasDataForYear) {
        setSyncingHolidays(true);
        onSyncHolidays(yearNum)
          .then(() => {
            setHolidayNotice({
              type: 'success',
              text: `Hari libur tahun ${yearNum} berhasil disinkronkan otomatis dari API resmi.`,
            });
            setTimeout(() => setHolidayNotice(null), 5000);
          })
          .catch(() => {})
          .finally(() => setSyncingHolidays(false));
      }
    }
  }, [selectedHolidayYear, holidays, onSyncHolidays]);

  // Confirmation modal state
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

  // Holiday Actions
  const handleAddHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.holiday_date || !holidayForm.holiday_name) return;

    if (editingHolidayId && onUpdateHoliday) {
      await onUpdateHoliday(editingHolidayId, holidayForm);
      setHolidayNotice({
        type: 'success',
        text: `Hari libur '${holidayForm.holiday_name}' berhasil diperbarui!`,
      });
      setEditingHolidayId(null);
    } else {
      await onAddHoliday(holidayForm);
      setHolidayNotice({
        type: 'success',
        text: `Hari libur '${holidayForm.holiday_name}' berhasil ditambahkan ke kalender!`,
      });
    }
    setHolidayForm({ holiday_date: '', holiday_name: '', is_joint_leave: false });
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
      description: `Apakah Anda yakin ingin menghapus '${name}' dari daftar hari libur? Seluruh kalender absensi akan diperbarui.`,
      confirmLabel: 'Hapus Hari Libur',
      variant: 'danger',
      details: [
        { label: 'Nama Hari Libur', value: name },
        { label: 'ID Record', value: String(id) },
      ],
      onConfirm: async () => {
        try {
          await onDeleteHoliday(id);
          setHolidayNotice({ type: 'success', text: `Hari libur '${name}' berhasil dihapus.` });
        } catch (err: any) {
          setHolidayNotice({ type: 'error', text: `Gagal menghapus: ${err.message}` });
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSyncHolidaysClick = async () => {
    const targetYear = selectedHolidayYear === 'all' ? 2026 : Number(selectedHolidayYear);
    setConfirmModal({
      isOpen: true,
      title: `Sinkronkan Hari Libur & Cuti Bersama (${targetYear})`,
      description:
        `Aksi ini akan menyelaraskan dan memperbarui daftar hari libur resmi nasional & cuti bersama Indonesia tahun ${targetYear} langsung dari API kalender resmi.`,
      confirmLabel: 'Sinkronkan Sekarang',
      variant: 'primary',
      onConfirm: async () => {
        setSyncingHolidays(true);
        try {
          let res: any;
          if (onSyncHolidays) {
            res = await onSyncHolidays(targetYear);
          } else {
            const fetchRes = await fetch('/api/holidays/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ year: targetYear }),
            });
            res = await fetchRes.json();
          }
          setHolidayNotice({
            type: 'success',
            text: res?.message || `Sinkronisasi hari libur nasional tahun ${targetYear} berhasil diperbarui!`,
          });
        } catch (err: any) {
          setHolidayNotice({
            type: 'error',
            text: 'Gagal sinkronisasi libur: ' + (err.message || 'Koneksi error'),
          });
        } finally {
          setSyncingHolidays(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredHolidays = (holidays || []).filter((h) => {
    const hName = (h.holiday_name || (h as any).name || '').toLowerCase();
    const sTerm = (holidaySearch || '').toLowerCase();
    const hDate = h.holiday_date || '';
    const matchesSearch = hName.includes(sTerm) || hDate.includes(sTerm);
    if (!matchesSearch) return false;
    if (selectedHolidayYear !== 'all') {
      return hDate.startsWith(selectedHolidayYear);
    }
    return true;
  });

  return (
    <div id="app-config-view" className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: accessibleColor }}
          >
            <Settings className="w-4 h-4" />
            Konfigurasi & Pengaturan Operasional
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
            <Building2 className="w-6 h-6" style={{ color: accessibleColor }} />
            App Config
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pengaturan profil perusahaan, identitas cabang, logo, tema warna, serta kalender hari libur dan cuti bersama
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#27272a]">
          <button
            id="tab-btn-app-company"
            onClick={() => setSubTab('company')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'company'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'company'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            <Building className="w-3.5 h-3.5" />
            <span>Profil Perusahaan & Cabang</span>
          </button>

          <button
            id="tab-btn-app-holidays"
            onClick={() => setSubTab('holidays')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'holidays'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a]'
            }`}
            style={
              subTab === 'holidays'
                ? {
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }
                : undefined
            }
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Setting Hari Libur & Cuti Bersama ({holidays?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PROFIL PERUSAHAAN & CABANG */}
      {subTab === 'company' && (
        <div className="space-y-6">
          <CompanyProfileManager
            activeCompany={company}
            currentCompany={company}
            companies={companies}
            accentColor={accentColor}
            isDarkMode={isDarkMode}
            onUpdateCompany={onUpdateCompany}
            onSelectCompany={onSelectCompany}
            onAddCompany={onAddCompany}
            onDeleteCompany={onDeleteCompany}
            onUploadLogo={onUploadLogo}
          />
        </div>
      )}

      {/* SUB-TAB 2: SETTING HARI LIBUR & CUTI BERSAMA */}
      {subTab === 'holidays' && (
        <div className="space-y-6">
          {holidayNotice && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
                holidayNotice.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {holidayNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                <span>{holidayNotice.text}</span>
              </div>
              <button
                onClick={() => setHolidayNotice(null)}
                className="text-xs opacity-70 hover:opacity-100 font-bold px-1"
              >
                &times;
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Tambah / Edit Hari Libur */}
            <div className="rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272a]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {editingHolidayId ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Libur nasional & cuti bersama resmi
                    </p>
                  </div>
                </div>
                {editingHolidayId && (
                  <button
                    type="button"
                    onClick={handleCancelEditHoliday}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleAddHolidaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Libur <span className="text-rose-500">*</span>
                  </label>
                  <DateInput
                    required
                    value={holidayForm.holiday_date}
                    onChange={(v) => setHolidayForm({ ...holidayForm, holiday_date: v })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Hari Libur / Keterangan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hari Kemerdekaan RI, Cuti Bersama..."
                    value={holidayForm.holiday_name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Jenis Cuti Bersama?
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Centang jika libur ini merupakan cuti bersama pemerintah
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={holidayForm.is_joint_leave}
                    onChange={(e) => setHolidayForm({ ...holidayForm, is_joint_leave: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded-sm focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-95 cursor-pointer"
                  style={{
                    backgroundColor: accentColor,
                    color: getContrastTextColorStyle(accentColor),
                  }}
                >
                  {editingHolidayId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingHolidayId ? 'Simpan Perubahan' : 'Tambahkan ke Kalender'}</span>
                </button>
              </form>
            </div>

            {/* List Hari Libur Terdaftar */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#27272a]">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-sky-500" />
                    Daftar Hari Libur Terdaftar
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menampilkan {filteredHolidays.length} hari libur aktif di sistem
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedHolidayYear}
                    onChange={(e) => setSelectedHolidayYear(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                    title="Filter Tahun & Auto-Sync API"
                  >
                    <option value="all">Semua Tahun</option>
                    <option value="2024">Tahun 2024</option>
                    <option value="2025">Tahun 2025</option>
                    <option value="2026">Tahun 2026 (Aktif)</option>
                    <option value="2027">Tahun 2027</option>
                    <option value="2028">Tahun 2028</option>
                    <option value="2029">Tahun 2029</option>
                    <option value="2030">Tahun 2030</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari tanggal / nama libur..."
                      value={holidaySearch}
                      onChange={(e) => setHolidaySearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white w-36 sm:w-48 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncHolidaysClick}
                    disabled={syncingHolidays}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] hover:bg-slate-100 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
                    title="Sinkronisasi hari libur resmi Indonesia"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${syncingHolidays ? 'animate-spin' : ''}`} />
                    <span>Sync Libur</span>
                  </button>
                </div>
              </div>

              {/* Holidays Table */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Nama Hari Libur</th>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                    {filteredHolidays.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          Belum ada data hari libur yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      filteredHolidays.map((h, idx) => {
                        const isJoint = h.is_joint_leave || (h as any).type === 'cuti_bersama';
                        const hName = h.holiday_name || (h as any).name || 'Hari Libur';
                        return (
                          <tr
                            key={h.id}
                            className="hover:bg-slate-50 dark:hover:bg-[#18181b]/60 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatDateDDMMYYYY(h.holiday_date)}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {hName}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isJoint ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                  Cuti Bersama
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                  Libur Nasional
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditHolidayClick(h)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors"
                                  title="Edit Hari Libur"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHoliday(h.id, hName)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Hapus Hari Libur"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        details={confirmModal.details}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
