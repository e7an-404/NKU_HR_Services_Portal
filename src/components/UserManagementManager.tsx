import React, { useState } from 'react';
import { User, Employee } from '../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Save,
  KeyRound,
} from 'lucide-react';
import { getContrastTextColorStyle } from '../lib/companyUtils';
import { ConfirmActionModal } from './ConfirmActionModal';
import { toast } from '../lib/toast';

interface UserManagementManagerProps {
  users: User[];
  employees?: Employee[];
  accentColor: string;
  isDarkMode?: boolean;
  onAddUser?: (data: Partial<User>) => Promise<any>;
  onUpdateUser?: (id: number, data: Partial<User>) => Promise<any>;
  onDeleteUser?: (id: number) => Promise<any>;
  onResetOperatingData?: () => Promise<any>;
}

export const UserManagementManager: React.FC<UserManagementManagerProps> = ({
  users = [],
  employees = [],
  accentColor,
  isDarkMode = true,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetOperatingData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleKey, setFormRoleKey] = useState<string>('employee');
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const rolesList = [
    { key: 'super_admin', name: 'Super Admin', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { key: 'hr_admin', name: 'HR Admin', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    { key: 'payroll_admin', name: 'Payroll Admin', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { key: 'manager', name: 'Manager Divisi', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    { key: 'kiosk_device', name: 'Kiosk Device', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    { key: 'employee', name: 'Karyawan', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role_key === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenAddModal = () => {
    setFormUsername('');
    setFormEmail('');
    setFormRoleKey('employee');
    setFormEmployeeId('');
    setFormIsActive(true);
    setEditingUser(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormRoleKey(u.role_key);
    setFormEmployeeId(u.employee_id ? String(u.employee_id) : '');
    setFormIsActive(u.is_active);
    setIsAddModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formEmail.trim()) {
      toast.error('Username dan Email Google wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        username: formUsername.trim(),
        email: formEmail.trim(),
        role_key: formRoleKey as any,
        employee_id: formEmployeeId ? Number(formEmployeeId) : null,
        is_active: formIsActive,
      };

      if (editingUser) {
        if (onUpdateUser) {
          const res = await onUpdateUser(editingUser.id, payload);
          if (res?.success || res?.user) {
            toast.success('Pengaturan User berhasil diperbarui!');
            setIsAddModalOpen(false);
          } else {
            toast.error(res?.error || 'Gagal memperbarui user');
          }
        }
      } else {
        if (onAddUser) {
          const res = await onAddUser(payload);
          if (res?.success || res?.user) {
            toast.success('User Google Auth berhasil didaftarkan!');
            setIsAddModalOpen(false);
          } else {
            toast.error(res?.error || 'Gagal menambahkan user');
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteConfirmUser) return;
    try {
      if (onDeleteUser) {
        const res = await onDeleteUser(deleteConfirmUser.id);
        if (res?.success) {
          toast.success(`User '${deleteConfirmUser.username}' berhasil dihapus`);
          setDeleteConfirmUser(null);
        } else {
          toast.error(res?.error || 'Gagal menghapus user');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus user');
    }
  };

  const handleResetOperatingDataConfirm = async () => {
    try {
      if (onResetOperatingData) {
        const res = await onResetOperatingData();
        if (res?.success) {
          toast.success(res.message || 'Tabel operasional berhasil dikosongkan. Account Super Admin dipertahankan!');
          setIsResetConfirmOpen(false);
        } else {
          toast.error(res?.error || 'Gagal mereset data operasional');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error saat reset data');
    }
  };

  const getRoleBadge = (roleKey: string) => {
    const found = rolesList.find((r) => r.key === roleKey);
    return found ? found.color : 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Super Admin Info */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              Akun Utama Super Admin
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950 uppercase">
                Akses Penuh
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Username: <code className="font-mono font-bold text-amber-500">superadmin</code> | Password: <code className="font-mono font-bold text-amber-500">superadmin</code>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Gunakan akun Super Admin ini untuk mendaftarkan Email Google karyawan & mengelola DDL database.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Data Operasi (Kosongkan Tabel)</span>
        </button>
      </div>

      {/* Control Bar & User Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari user, username, atau email Google..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-medium focus:outline-none"
          >
            <option value="all">Semua Peran (Role)</option>
            {rolesList.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
          style={{
            backgroundColor: accentColor,
            color: getContrastTextColorStyle(accentColor),
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User Google Baru</span>
        </button>
      </div>

      {/* Registered Users Table */}
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#18181b] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-[#27272a]">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">User ID & Username</th>
                <th className="py-3 px-4 whitespace-nowrap">Email Google (Auth)</th>
                <th className="py-3 px-4 whitespace-nowrap">Nama Karyawan / NIP</th>
                <th className="py-3 px-4 whitespace-nowrap">Peran Sistem (Role)</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Metode Login</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ada data user yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-[#18181b]/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#27272a] flex items-center justify-center font-bold text-xs font-mono text-slate-700 dark:text-slate-200 shrink-0">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold">{u.username}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">ID: #{u.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.employee_name ? (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{u.employee_name}</div>
                          {u.employee_nip && (
                            <div className="text-[10px] font-mono text-slate-400">NIP: {u.employee_nip}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-mono text-[11px]">Tanpa Karyawan</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border leading-tight ${getRoleBadge(u.role_key)}`}>
                        {u.role_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {u.role_key === 'super_admin' ? (
                        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <KeyRound className="w-3 h-3 shrink-0" />
                          <span>Password</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                          </svg>
                          <span>Google Auth</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          Non-Aktif
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== 1 && u.role_key !== 'super_admin' && (
                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272a] pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                {editingUser ? 'Edit Data User Google Auth' : 'Registrasi User Google Auth Baru'}
              </h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username System
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. budi.santoso"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email Google (@gmail.com / Workspace)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. budisantoso@gmail.com"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Email Google ini digunakan user untuk masuk ke sistem tanpa memerlukan password.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role Access)
                </label>
                <select
                  value={formRoleKey}
                  onChange={(e) => setFormRoleKey(e.target.value)}
                  disabled={editingUser?.id === 1}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {rolesList.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tautkan dengan Data Karyawan (Opsional)
                </label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Tanpa Tautan Karyawan --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  disabled={editingUser?.id === 1}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="userIsActive" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Status Akun Aktif (Dapat Login)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#27272a] text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-[#27272a]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <ConfirmActionModal
          isOpen={Boolean(deleteConfirmUser)}
          title="Hapus User Google Auth"
          message={`Apakah Anda yakin ingin menghapus user '${deleteConfirmUser.username}' (${deleteConfirmUser.email})?`}
          onConfirm={handleDeleteUserConfirm}
          onCancel={() => setDeleteConfirmUser(null)}
          confirmText="Ya, Hapus User"
          isDanger={true}
        />
      )}

      {/* RESET OPERATING DATA CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <ConfirmActionModal
          isOpen={isResetConfirmOpen}
          title="Reset & Kosongkan Tabel Operasional"
          message="Perhatian: Tindakan ini akan mengosongkan seluruh log presensi, pengajuan cuti/lembur, slip gaji, dan audit log. Akun Super Admin (superadmin / password: superadmin) akan dipertahankan untuk mendaftarkan user lain. Lanjutkan?"
          onConfirm={handleResetOperatingDataConfirm}
          onCancel={() => setIsResetConfirmOpen(false)}
          confirmText="Ya, Reset Seluruh Data Operasional"
          isDanger={true}
        />
      )}
    </div>
  );
};
