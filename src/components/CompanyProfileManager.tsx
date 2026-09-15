import React, { useState, useRef } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Palette,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import {
  getCompanyInitials,
  getContrastTextColorStyle,
  getAccessibleAccentColor,
  PALETTE_OPTIONS,
} from '../lib/companyUtils';
import { ConfirmActionModal } from './ConfirmActionModal';

export { PALETTE_OPTIONS };

interface CompanyProfileManagerProps {
  companies?: CompanyProfile[];
  activeCompany?: CompanyProfile;
  currentCompany?: CompanyProfile;
  accentColor?: string;
  onSelectCompany?: (id: number) => Promise<any>;
  onUpdateCompany: (idOrData: any, data?: any) => Promise<any>;
  onAddCompany?: (data: Partial<CompanyProfile>) => Promise<any>;
  onDeleteCompany?: (id: number) => Promise<any>;
  onUploadLogo?: (imageBase64: string, companyId?: number) => Promise<any>;
  onCloseModal?: () => void;
}

export const CompanyProfileManager: React.FC<CompanyProfileManagerProps> = ({
  companies = [],
  activeCompany: rawActiveCompany,
  currentCompany,
  accentColor = '#F59E0B',
  onSelectCompany = async (_id: number) => ({} as any),
  onUpdateCompany = async (_id: any, _data?: any) => ({} as any),
  onAddCompany = async (_data: Partial<CompanyProfile>) => ({} as any),
  onDeleteCompany = async (_id: number) => ({} as any),
  onUploadLogo = async (_imageBase64: string, _companyId?: number) => ({} as any),
  onCloseModal,
}) => {
  const activeCompany = rawActiveCompany || currentCompany || companies[0] || {
    id: 1,
    company_name: 'PT. NINDYA KRIDA UTAMA',
    color_palette: '#F59E0B',
    email: 'info@nku.co.id',
  };

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'edit_active' | 'create'>('edit_active');
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null);

  // Form state for editing or creating
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({
    company_name: activeCompany?.company_name || '',
    logo_url: activeCompany?.logo_url || '/logo_nku.svg',
    address: activeCompany?.address || '',
    phone: activeCompany?.phone || '',
    email: activeCompany?.email || '',
    tax_id: activeCompany?.tax_id || '',
    website: (activeCompany as any)?.website || '',
    color_palette: activeCompany?.color_palette || '#F59E0B',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm delete modal state
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; company: CompanyProfile | null }>({
    isOpen: false,
    company: null,
  });

  const currentPaletteColor = formData.color_palette || activeCompany?.color_palette || accentColor || '#F59E0B';
  const accessiblePaletteColor = getAccessibleAccentColor(currentPaletteColor, true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetCompanyUploadIdRef = useRef<number | null>(null);

  // When activeCompany changes or switching to edit_active, sync form
  const handleSwitchToEditActive = () => {
    setActiveSubTab('edit_active');
    setEditingCompany(activeCompany);
    setFormData({
      company_name: activeCompany?.company_name || '',
      logo_url: activeCompany?.logo_url || '/logo_nku.svg',
      address: activeCompany?.address || '',
      phone: activeCompany?.phone || '',
      email: activeCompany?.email || '',
      tax_id: activeCompany?.tax_id || '',
      website: (activeCompany as any)?.website || '',
      color_palette: activeCompany?.color_palette || '#F59E0B',
    });
    setLogoPreview(null);
  };

  const handleStartEdit = (comp: CompanyProfile) => {
    setEditingCompany(comp);
    setActiveSubTab('edit_active');
    setFormData({
      company_name: comp.company_name || '',
      logo_url: comp.logo_url || '/logo_nku.svg',
      address: comp.address || '',
      phone: comp.phone || '',
      email: comp.email || '',
      tax_id: comp.tax_id || '',
      website: (comp as any)?.website || '',
      color_palette: comp.color_palette || '#F59E0B',
    });
    setLogoPreview(null);
  };

  const handleStartCreate = () => {
    setActiveSubTab('create');
    setEditingCompany(null);
    setFormData({
      company_name: '',
      logo_url: '/logo_nku.svg',
      address: '',
      phone: '',
      email: '',
      tax_id: '',
      website: '',
      color_palette: '#F59E0B',
    });
    setLogoPreview(null);
  };

  // Handle local file image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetCompanyId?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ type: 'error', text: 'Format file tidak didukung. Harap pilih file gambar (PNG, JPG, SVG, WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedbackMsg({ type: 'error', text: 'Ukuran file terlalu besar. Maksimum batas ukuran logo adalah 5 MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      const compId = targetCompanyId || editingCompany?.id || activeCompany.id;
      setLogoPreview(base64);
      setFormData((prev) => ({ ...prev, logo_url: base64 }));

      // Automatically persist logo immediately to disk & MySQL
      setIsUploadingLogo(true);
      try {
        const res = await onUploadLogo(base64, compId);
        setFeedbackMsg({
          type: 'success',
          text: res?.message || 'Logo perusahaan berhasil diunggah dari drive lokal dan disimpan!',
        });
      } catch (err: any) {
        setFeedbackMsg({
          type: 'error',
          text: 'Gagal mengunggah logo: ' + (err.message || 'Terjadi kesalahan sistem.'),
        });
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (e.target) e.target.value = '';
  };

  const triggerUploadForCompany = (companyId: number) => {
    targetCompanyUploadIdRef.current = companyId;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle Save Form (either update or create)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name?.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Nama perusahaan wajib diisi.' });
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);
    try {
      if (activeSubTab === 'create') {
        const res = await onAddCompany(formData);
        setFeedbackMsg({
          type: 'success',
          text: `Profil ${formData.company_name} berhasil didaftarkan ke sistem!`,
        });
        setActiveSubTab('list');
      } else {
        const targetId = editingCompany?.id || activeCompany?.id || 1;
        await onUpdateCompany(targetId, formData);
        setFeedbackMsg({
          type: 'success',
          text: `Profil ${formData.company_name} berhasil diperbarui!`,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Gagal menyimpan profil: ' + (err.message || 'Terjadi kesalahan koneksi.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectActive = async (companyId: number) => {
    try {
      const res = await onSelectCompany(companyId);
      setFeedbackMsg({
        type: 'success',
        text: res?.message || 'Perusahaan aktif berhasil dialihkan.',
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Gagal mengalihkan perusahaan: ' + (err.message || 'Error'),
      });
    }
  };

  const executeDeleteCompany = async () => {
    if (!confirmDelete.company) return;
    try {
      const res = await onDeleteCompany(confirmDelete.company.id);
      setFeedbackMsg({
        type: 'success',
        text: res?.message || `Profil ${confirmDelete.company.company_name} berhasil dihapus.`,
      });
      setConfirmDelete({ isOpen: false, company: null });
      if (editingCompany?.id === confirmDelete.company.id) {
        setEditingCompany(null);
        setActiveSubTab('list');
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Gagal menghapus profil: ' + (err.message || 'Terjadi kesalahan.'),
      });
      setConfirmDelete({ isOpen: false, company: null });
    }
  };

  const currentThemeColor = formData.color_palette || activeCompany?.color_palette || accentColor;

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      {/* Hidden File Input for local drive logo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange(e, targetCompanyUploadIdRef.current || undefined)}
      />

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            id="tab-edit-active-company"
            onClick={handleSwitchToEditActive}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'edit_active'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'edit_active'
                ? {
                    backgroundColor: currentThemeColor,
                    color: getContrastTextColorStyle(currentThemeColor),
                  }
                : undefined
            }
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profil & Logo ({activeCompany?.company_name ? `${activeCompany.company_name.slice(0, 18)}...` : 'Perusahaan'})</span>
          </button>

          <button
            type="button"
            id="tab-list-companies"
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'list'
                ? 'shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            style={
              activeSubTab === 'list'
                ? {
                    backgroundColor: currentThemeColor,
                    color: getContrastTextColorStyle(currentThemeColor),
                  }
                : undefined
            }
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Semua Profil ({companies.length})</span>
          </button>
        </div>

        <button
          type="button"
          id="btn-add-new-company"
          onClick={handleStartCreate}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Daftarkan Perusahaan Baru</span>
        </button>
      </div>

      {/* Feedback Message Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 border transition-all animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: LIST OF REGISTERED COMPANIES */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Daftar Profil Perusahaan Terdaftar ({companies.length} Entitas)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Perusahaan yang berstatus <span className="font-bold text-emerald-500">AKTIF</span> akan digunakan sebagai identitas sistem, logo header, warna tema, serta kop dokumen Excel & PDF.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((comp) => {
              const isActive = comp.id === activeCompany.id;
              return (
                <div
                  key={comp.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-white dark:bg-[#121215] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header info & Logo thumbnail */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative group/logo">
                          <img
                            src={comp.logo_url || '/logo_nku.svg'}
                            alt={comp.company_name}
                            className="w-14 h-14 object-contain rounded-2xl p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => triggerUploadForCompany(comp.id)}
                            className="absolute inset-0 rounded-2xl bg-black/60 text-white opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center text-[9px] font-bold"
                            title="Ganti logo perusahaan ini dari drive lokal"
                          >
                            <Upload className="w-3.5 h-3.5 mb-0.5" />
                            <span>Ganti Logo</span>
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {comp.company_name}
                            </h4>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: comp.color_palette || '#F59E0B' }}
                              title={`Warna Tema: ${comp.color_palette}`}
                            />
                          </div>

                          {isActive ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              PERUSAHAAN AKTIF
                            </span>
                          ) : (
                            <span className="inline-block mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-300">
                              ID: #{comp.id} &bull; Siap Diaktifkan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata contact */}
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      {comp.tax_id && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>NPWP: <strong className="text-slate-800 dark:text-slate-200">{comp.tax_id}</strong></span>
                        </div>
                      )}
                      {comp.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{comp.email}</span>
                        </div>
                      )}
                      {comp.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{comp.phone}</span>
                        </div>
                      )}
                      {comp.address && (
                        <div className="flex items-start gap-1.5 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{comp.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerUploadForCompany(comp.id)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                        title="Upload logo dari drive lokal"
                      >
                        <Upload className="w-3 h-3 text-sky-500" />
                        <span>Upload Logo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(comp)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-amber-500" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => handleSelectActive(comp.id)}
                          className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all hover:opacity-90 active:scale-95"
                          style={{
                            backgroundColor: currentPaletteColor,
                            color: getContrastTextColorStyle(currentPaletteColor),
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pilih & Aktifkan</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                        </span>
                      )}

                      {companies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ isOpen: true, company: comp })}
                          className="p-1.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 transition-colors"
                          title="Hapus profil perusahaan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2 & 3: FORM EDIT ACTIVE / CREATE NEW COMPANY */}
      {(activeSubTab === 'edit_active' || activeSubTab === 'create') && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo Management Section (Requirement 3: Upload from local drive) */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" style={{ color: accessiblePaletteColor }} />
                  Logo Resmi Perusahaan (Bisa Diupload dari Local Drive)
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Format didukung: PNG, JPG, JPEG, SVG, WebP. Logo otomatis disinkronkan ke header aplikasi dan kop cetak laporan Excel/PDF.
                </p>
              </div>

              <label
                className="cursor-pointer px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all self-start sm:self-auto shrink-0 hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: currentPaletteColor,
                  color: getContrastTextColorStyle(currentPaletteColor),
                }}
                title="Pilih file gambar dari drive komputer Anda"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploadingLogo ? 'Mengunggah...' : 'Upload Logo dari Drive Lokal'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, editingCompany?.id || activeCompany.id)}
                />
              </label>
            </div>

            {/* Logo Preview & Visual Status */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800">
              <div className="relative group/preview shrink-0">
                <img
                  src={logoPreview || formData.logo_url || '/logo_nku.svg'}
                  alt="Company Logo Preview"
                  className="w-24 h-24 object-contain rounded-2xl bg-white dark:bg-slate-900 p-2 border-2 shadow-md"
                  style={{ borderColor: `${currentPaletteColor}80` }}
                  referrerPolicy="no-referrer"
                />
                {isUploadingLogo && (
                  <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                    Menyimpan...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {formData.company_name || 'Nama Perusahaan'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono truncate">
                  Path Logo Saat Ini: <span style={{ color: accessiblePaletteColor }}>{formData.logo_url ? String(formData.logo_url).slice(0, 45) + '...' : '/logo_nku.svg'}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        targetCompanyUploadIdRef.current = editingCompany?.id || activeCompany.id;
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-3 py-1 text-[11px] font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Ganti Berkas Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('/logo_nku.svg');
                      setFormData((prev) => ({ ...prev, logo_url: '/logo_nku.svg' }));
                    }}
                    className="px-3 py-1 text-[11px] font-medium rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Reset ke Logo Default NKU
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Company Identity Fields */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              {activeSubTab === 'create'
                ? 'Informasi Entitas Perusahaan Baru'
                : `Edit Informasi: ${formData.company_name || 'Profil Perusahaan'}`}
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Resmi Perusahaan *
              </label>
              <input
                id="input-company-name"
                type="text"
                required
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Contoh: PT. NINDYA KRIDA UTAMA"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-bold tracking-wide"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Pokok Wajib Pajak (NPWP / Tax ID)
                </label>
                <input
                  id="input-company-tax-id"
                  type="text"
                  value={formData.tax_id || ''}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="Contoh: 01.234.567.8-901.000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Resmi Kantor
                </label>
                <input
                  id="input-company-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@nku.co.id"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telepon Kantor
                </label>
                <input
                  id="input-company-phone"
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(021) 876-5432 / +62..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Website Resmi
                </label>
                <input
                  id="input-company-website"
                  type="text"
                  value={(formData as any).website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.nku.co.id"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Kantor Pusat / Batching Plant (Ditampilkan di Kop Excel & Slip Gaji)
              </label>
              <textarea
                id="input-company-address"
                rows={2}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Letjen MT Haryono Kav. 22, Cawang, Jakarta Timur..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white"
              />
            </div>

            {/* Brand Accent Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Palet Warna Aksentuasi Brand Perusahaan Ini
                </label>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  8 Segmen Warna Berbeda & Terstandar
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PALETTE_OPTIONS.map((p) => {
                  const isSelected = (formData.color_palette || '#F59E0B') === p.hex;
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color_palette: p.hex })}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all relative group cursor-pointer ${
                        isSelected
                          ? 'font-black ring-2 shadow-md scale-[1.02]'
                          : 'hover:scale-[1.01] hover:shadow-xs'
                      }`}
                      style={{
                        borderColor: isSelected ? p.hex : `${p.hex}45`,
                        backgroundColor: isSelected ? `${p.hex}22` : `${p.hex}0a`,
                        boxShadow: isSelected ? `0 0 16px ${p.hex}35` : undefined,
                      }}
                      title={p.description || p.name}
                    >
                      <span
                        className={`w-5 h-5 rounded-full shrink-0 shadow-xs flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110 ring-2 ${
                          isSelected ? 'ring-white/80 dark:ring-slate-900 scale-105' : 'ring-white/40 dark:ring-slate-800'
                        }`}
                        style={{
                          backgroundColor: p.hex,
                          color: getContrastTextColorStyle(p.hex),
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-xs ${
                            isSelected
                              ? 'text-slate-900 dark:text-white font-extrabold'
                              : 'text-slate-800 dark:text-slate-200 font-bold'
                          }`}
                        >
                          {p.name}
                        </span>
                        <span
                          className="block text-[9px] font-mono tracking-tight opacity-75 truncate"
                          style={{ color: p.hex }}
                        >
                          {p.hex}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal / Lihat Semua
            </button>

            <button
              type="submit"
              id="btn-submit-company"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: currentThemeColor,
                color: getContrastTextColorStyle(currentThemeColor),
              }}
            >
              <Check className="w-4 h-4" />
              <span>
                {saving
                  ? 'Menyimpan ke Sistem...'
                  : activeSubTab === 'create'
                  ? 'Daftarkan Profil Perusahaan'
                  : 'Simpan Perubahan Profil'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmActionModal
        isOpen={confirmDelete.isOpen}
        title="Hapus Profil Perusahaan"
        description={`Apakah Anda yakin ingin menghapus profil perusahaan "${confirmDelete.company?.company_name}"? Aksi ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Perusahaan"
        variant="danger"
        details={
          confirmDelete.company
            ? [
                { label: 'Perusahaan', value: confirmDelete.company.company_name },
                { label: 'ID', value: String(confirmDelete.company.id) },
                { label: 'Email', value: confirmDelete.company.email || '-' },
              ]
            : []
        }
        onConfirm={executeDeleteCompany}
        onCancel={() => setConfirmDelete({ isOpen: false, company: null })}
      />
    </div>
  );
};
