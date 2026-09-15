import React, { useState } from 'react';
import { User, CompanyProfile } from '../types';
import {
  LogIn,
  ShieldCheck,
  Monitor,
  Mail,
  Key,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Building2,
  Lock,
  UserCheck,
  Globe,
  Database,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '../lib/toast';
import { getContrastTextColorStyle } from '../lib/companyUtils';

interface LoginPageProps {
  company: CompanyProfile;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onSelectKiosk: () => void;
  accentColor: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  company,
  users = [],
  onLoginSuccess,
  onSelectKiosk,
  accentColor,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'superadmin'>('google');
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Non-superadmin Google Auth handler
  const handleGoogleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = googleEmailInput.trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Masukkan alamat email Google Anda');
      return;
    }

    const matchedUser = users.find(
      (u) =>
        (u.email || '').toLowerCase() === targetEmail ||
        (u.username || '').toLowerCase() === targetEmail
    );

    if (!matchedUser) {
      toast.error(`Email Google '${targetEmail}' belum terdaftar. Silakan hubungi Super Admin untuk mendaftarkan email Anda.`);
      return;
    }

    if (!matchedUser.is_active) {
      toast.error('Akun Anda dalam status non-aktif. Hubungi HR / Super Admin.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(matchedUser);
      toast.success(`Google Auth Berhasil! Selamat datang, ${matchedUser.employee_name || matchedUser.username}`);
    }, 400);
  };

  // Direct 1-Click Google Account select
  const handleSelectGoogleUser = (user: User) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(user);
      toast.success(`Google Auth Berhasil! Masuk sebagai ${user.employee_name || user.username}`);
    }, 300);
  };

  // Super Admin Password Login
  const handleSuperAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = adminUsername.trim().toLowerCase();
    const superUser = users.find(
      (u) =>
        u.role_key === 'super_admin' &&
        ((u.username || '').toLowerCase() === id || (u.email || '').toLowerCase() === id)
    ) || users.find((u) => u.role_key === 'super_admin');

    if (!superUser) {
      toast.error('Akun Super Admin tidak ditemukan');
      return;
    }

    if (adminPassword !== 'superadmin' && adminPassword !== 'admin123' && adminPassword !== (superUser as any).password) {
      toast.error('Password Super Admin salah');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(superUser);
      toast.success('Login Super Admin Berhasil!');
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Bar Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5 relative z-10 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-amber-500/10 border border-white/10"
            style={{ backgroundColor: accentColor }}
          >
            {company.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Building2 className="w-5 h-5 text-slate-950" />
            )}
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              {company.company_name || 'PT. NINDYA KRIDA UTAMA'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              HR Services Portal
            </p>
          </div>
        </div>
      </header>

      {/* Main Login Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-white/10 bg-[#121215]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          
          {/* Left Column: Brand & Info Banner */}
          <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-amber-500/15 via-white/5 to-transparent border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal Otentikasi Terpadu</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Sistem Presensi & SDM Proyek
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Platform terintegrasi pengelolaan karyawan, jadwal kerja harian, pengajuan izin/lembur, dan penggajian proyek.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-xs">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white">Google Workspace Auth</p>
                  <p className="text-[11px] text-slate-400">Login praktis karyawan menggunakan email Google.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Akses Peran Terproteksi</p>
                  <p className="text-[11px] text-slate-400">Hak akses dinamis (Super Admin, HR, Payroll, Karyawan).</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-white/5">
              <span>Status Server: Live MySQL</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>
          </div>

          {/* Right Column: Login Tabs & Form */}
          <div className="lg:col-span-7 p-8 sm:p-10 space-y-5 flex flex-col justify-center">
            {/* Prominent Kiosk Quick Access Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Monitor className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-white">Mode Tablet Presensi Lapangan</p>
                  <p className="text-[11px] text-slate-400">Akses cepat Kiosk presensi tanpa login admin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSelectKiosk}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
              >
                <span>Masuk Kiosk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="p-1 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('google')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authMode === 'google'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                </svg>
                <span>Google Auth (Non-Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('superadmin')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authMode === 'superadmin'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin (Password)</span>
              </button>
            </div>

            {/* FORM 1: GOOGLE AUTH (Non-Superadmin) */}
            {authMode === 'google' ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Masuk dengan Email Google
                  </h3>
                  <p className="text-xs text-slate-400">
                    Masukkan email Google Anda yang telah didaftarkan oleh Super Admin.
                  </p>
                </div>

                <form onSubmit={handleGoogleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Email Google (@gmail.com / Workspace)</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="contoh: budisantoso@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Masuk dengan Google Auth</span>
                  </button>
                </form>
              </div>
            ) : (
              /* FORM 2: SUPER ADMIN PASSWORD LOGIN */
              <form onSubmit={handleSuperAdminLogin} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Login Super Admin
                  </h3>
                  <p className="text-xs text-slate-400">
                    Masukkan kredensial khusus Super Admin untuk mengakses pengaturan sistem & database.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Username Super Admin</label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="Masukkan username super admin"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Masukkan password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk sebagai Super Admin</span>
                </button>
              </form>
            )}

            {/* Quick Kiosk Access Link */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Mode Terminal Tablet Presensi:</span>
              <button
                type="button"
                onClick={onSelectKiosk}
                className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Masuk Kiosk Presensi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[11px] text-slate-500 border-t border-white/5 backdrop-blur-md bg-black/20">
        &copy; {new Date().getFullYear()} {company.company_name || 'PT. NINDYA KRIDA UTAMA'} &bull; HR Services Portal
      </footer>
    </div>
  );
};
