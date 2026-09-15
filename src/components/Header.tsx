import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sun,
  Moon,
  Palette,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
  X,
  Info,
  Database,
  Users,
  Clock,
  CreditCard,
  Banknote,
  Check,
  Monitor,
  LogIn,
} from 'lucide-react';
import { CompanyProfile, User } from '../types';
import { getContrastTextColorStyle, getAccessibleAccentColor, PALETTE_OPTIONS } from '../lib/companyUtils';

interface HeaderProps {
  company: CompanyProfile;
  companies?: CompanyProfile[];
  currentUser: User;
  allUsers: User[];
  isDarkMode: boolean;
  dbConnected?: boolean;
  onToggleTheme: () => void;
  onSelectColor: (color: string) => void;
  onSwitchUser: (userId: number) => void;
  onLogout: () => void;
  onOpenLoginModal?: () => void;
  onSelectCompany?: (id: number) => Promise<any>;
  onUpdateCompany?: (id: number, data: Partial<CompanyProfile>) => Promise<any>;
  onAddCompany?: (data: Partial<CompanyProfile>) => Promise<any>;
  onDeleteCompany?: (id: number) => Promise<any>;
  onUploadLogo?: (imageBase64: string, companyId?: number) => Promise<any>;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  companies = [],
  currentUser,
  allUsers,
  isDarkMode,
  dbConnected = true,
  onToggleTheme,
  onSelectColor,
  onSwitchUser,
  onLogout,
  onOpenLoginModal,
}) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const accentColor = company.color_palette || '#F59E0B';

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAboutModal) {
        setShowAboutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAboutModal]);

  const getRoleBadgeColor = (roleKey: string) => {
    switch (roleKey) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
      case 'hr_admin':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
      case 'payroll_admin':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
      case 'manager':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      case 'kiosk_device':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-40 w-full h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] transition-colors shadow-sm shrink-0"
      >
        <div className="w-full pl-0 pr-4 sm:pr-6 lg:pr-8 h-full flex items-center justify-between">
          {/* Brand & Company Profile (Clickable Logo opens About Modal) */}
          <div className="flex items-center">
            <button
              type="button"
              id="header-logo-button"
              onClick={() => setShowAboutModal(true)}
              className="group flex items-center hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-r-2xl"
              title={`Klik untuk melihat informasi sistem & Tentang Aplikasi (${company?.company_name || 'PT. NINDYA KRIDA UTAMA'})`}
            >
              {/* Logo container matching collapsed sidebar width (w-16 = 64px) for perfect vertical center alignment */}
              <div className="w-16 h-16 flex items-center justify-center shrink-0">
                <div className="relative group/badge flex items-center justify-center">
                  <img
                    src={company?.logo_url || '/logo_nku.svg'}
                    alt="NKU Logo"
                    className="w-10 h-10 object-contain rounded-full bg-white dark:bg-white/10 p-0.5 border border-slate-200 dark:border-amber-400/40 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {/* Balon Logo: Status Koneksi Database */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#121212] flex items-center justify-center text-[8px] font-black shadow-md transition-transform group-hover/badge:scale-110 ${
                      dbConnected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                    title={`Status Koneksi Database MySQL: ${
                      dbConnected ? 'Live Connected (MySQL Remote)' : 'Disconnected'
                    }`}
                  >
                    <Database className="w-2.5 h-2.5" />
                    <span
                      className={`absolute inset-0 rounded-full animate-ping opacity-60 pointer-events-none ${
                        dbConnected ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-800 pl-3.5 pr-2 flex flex-col justify-center min-w-0 text-left">
                <h1 className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm tracking-widest uppercase truncate">
                  HR Services Portal
                </h1>
                <p
                  className="font-company text-[10px] sm:text-[11px] tracking-wider transition-colors truncate max-w-[280px] sm:max-w-[420px]"
                  style={{ color: getAccessibleAccentColor(accentColor, isDarkMode) }}
                >
                  {company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
                </p>
              </div>
            </button>
          </div>

          {/* Right Actions: Theme, Palette, User profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Color Palette Switcher */}
            <div className="relative">
              <button
                id="header-palette-button"
                onClick={() => {
                  setShowColorMenu(!showColorMenu);
                  setShowUserMenu(false);
                }}
                className="relative w-9 h-9 p-2 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all duration-300 border border-slate-200 dark:border-[#27272a] flex items-center justify-center active:scale-95 shadow-xs group"
                title="Pilih Palet Warna Brand Perusahaan"
              >
                <Palette
                  className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-45 ${
                    showColorMenu ? 'scale-110 rotate-12' : ''
                  }`}
                  style={{ color: getAccessibleAccentColor(accentColor, isDarkMode) }}
                />
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white dark:border-[#121212] transition-transform group-hover:scale-125"
                  style={{ backgroundColor: accentColor }}
                />
              </button>

              {showColorMenu && (
                <div
                  onMouseLeave={() => setShowColorMenu(false)}
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#161616] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-1 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">
                        Palet Brand Perusahaan
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        8 Pilihan Warna Kontras & Elegan
                      </span>
                    </div>
                    <span
                      className="w-3 h-3 rounded-full shadow-xs ring-2 ring-slate-200 dark:ring-slate-700"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {PALETTE_OPTIONS.map((item) => {
                      const isSelected = company.color_palette === item.hex;
                      return (
                        <button
                          key={item.hex}
                          onClick={() => {
                            onSelectColor(item.hex);
                            setShowColorMenu(false);
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all text-center group relative cursor-pointer border ${
                            isSelected
                              ? 'font-black ring-2 shadow-sm scale-105'
                              : 'hover:scale-102 hover:shadow-2xs'
                          }`}
                          style={{
                            borderColor: isSelected ? item.hex : `${item.hex}45`,
                            backgroundColor: isSelected ? `${item.hex}22` : `${item.hex}0a`,
                          }}
                          title={item.description || item.name}
                        >
                          <div className="relative">
                            <span
                              className={`w-6 h-6 rounded-full block border-2 transition-transform group-hover:scale-110 shadow-xs ${
                                isSelected
                                  ? 'border-white dark:border-slate-900 scale-105'
                                  : 'border-white/80 dark:border-slate-800'
                              }`}
                              style={{ backgroundColor: item.hex }}
                            />
                            {isSelected && (
                              <div
                                className="absolute inset-0 flex items-center justify-center text-[10px] font-black"
                                style={{ color: getContrastTextColorStyle(item.hex) }}
                              >
                                ✓
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-[9px] leading-tight font-sans text-center line-clamp-2 ${
                              isSelected
                                ? 'text-slate-900 dark:text-white font-bold'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white font-medium'
                            }`}
                          >
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Theme Toggle with Smooth Animated Switch */}
            <button
              id="header-theme-toggle"
              onClick={onToggleTheme}
              className="w-9 h-9 p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all duration-300 border border-slate-200 dark:border-[#27272a] flex items-center justify-center active:scale-95 shadow-xs"
              title={isDarkMode ? 'Beralih ke Tema Terang (Light Mode)' : 'Beralih ke Tema Gelap (Dark Mode)'}
            >
              <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
                <Sun
                  className={`w-4 h-4 text-amber-500 absolute transition-all duration-500 ease-in-out ${
                    isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                />
                <Moon
                  className={`w-4 h-4 text-sky-400 absolute transition-all duration-500 ease-in-out ${
                    isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                  }`}
                />
              </div>
            </button>

            {/* User Profile & Switcher */}
            <div className="relative">
              <button
                id="header-user-menu"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowColorMenu(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] hover:bg-slate-100 dark:hover:bg-[#27272a] transition-all text-left shadow-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-[#27272a] border border-slate-300 dark:border-[#27272a] flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white uppercase font-mono">
                  {currentUser?.username?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-semibold text-slate-800 dark:text-white leading-tight font-sans">
                    {currentUser?.employee_name || currentUser?.username || 'User'}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border w-fit leading-none mt-0.5 ${getRoleBadgeColor(
                      currentUser?.role_key
                    )}`}
                  >
                    {currentUser?.role_name}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#161616] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Masuk sebagai
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {currentUser?.employee_name || currentUser?.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 font-mono mt-0.5">{currentUser?.email}</p>
                  </div>

                  {/* Quick Role Switcher for Testing (Super Admin Only) */}
                  {currentUser?.role_key === 'super_admin' && (
                    <div className="py-2">
                      <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                        Simulasi Akses Peran
                      </div>
                      <div className="space-y-1">
                        {allUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u.id);
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                              currentUser.id === u.id
                                ? 'bg-slate-100 dark:bg-[#27272a] font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-[#27272a]'
                                : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    u.role_key === 'super_admin'
                                      ? '#F59E0B'
                                      : u.role_key === 'payroll_admin'
                                      ? '#10B981'
                                      : u.role_key === 'hr_admin'
                                      ? '#0284C7'
                                      : '#64748B',
                                }}
                              />
                              <span className="font-sans">{u.username}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">{u.role_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Reset Sesi / Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ABOUT APPLICATION MODAL (Strictly About Info, No Profile / Logo Editing) */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] p-5 sm:p-7 shadow-2xl text-slate-900 dark:text-white space-y-5 animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tentang Aplikasi
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-about-modal"
                onClick={() => setShowAboutModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors"
                title="Tutup (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Proportional Logo & Company Title */}
            <div className="text-center pt-2">
              <div className="w-20 h-20 mx-auto mb-2 rounded-2xl bg-slate-900/90 dark:bg-[#18181b] p-2 border-2 border-amber-400/60 shadow-xl flex items-center justify-center">
                <img
                  src={company?.logo_url || '/logo_nku.svg'}
                  alt="Company Logo"
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="font-company text-base sm:text-lg text-slate-900 dark:text-white tracking-wider font-black uppercase">
                {company?.company_name || 'PT. NINDYA KRIDA UTAMA'}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs mt-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HR Management Portal &bull; v2.5.0 Enterprise</span>
              </div>
            </div>

            {/* Features & Description */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2.5">
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm border-b border-slate-200 dark:border-[#27272a] pb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-500" />
                Sistem Informasi Manajemen HR & Operasional
              </p>
              <p>
                Platform portal manajemen sumber daya manusia terintegrasi untuk pengelolaan presensi, shift batching plant, cetak ID card, otomasi penggajian, multi-company branding, dan sinkronisasi basis data cloud.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#27272a]">
                  <Users className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="font-medium text-[11px]">Master SDM & Divisi</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#27272a]">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-[11px]">Presensi & Shift Ready-Mix</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#27272a]">
                  <CreditCard className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="font-medium text-[11px]">Generator ID Card Digital</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#27272a]">
                  <Banknote className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-medium text-[11px]">Slip Gaji & Otomasi Lembur</span>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-[#18181b]/70 border border-slate-200 dark:border-[#27272a] text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Alamat Kantor:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{company?.address || 'Jl. Raya Batching Plant No. 12, Jawa Timur'}</span>
              </div>
              <div className="flex justify-between">
                <span>Email & Kontak:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{company?.email || 'hr@nindyakridautama.co.id'} &bull; {company?.phone || '031-8972100'}</span>
              </div>
              <div className="flex justify-between">
                <span>Basis Data:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" /> MySQL 8.0 Cloud (SSL Secured)
                </span>
              </div>
            </div>

            {/* Footer status */}
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-[#27272a]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>MySQL Cloud Live Connected</span>
              </div>
              <span>&copy; 2026 {company?.company_name}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


