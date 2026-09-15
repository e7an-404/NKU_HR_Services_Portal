import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Crosshair,
  Compass,
  Layers,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import { CompanyLocation } from '../types';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

interface WorkLocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: CompanyLocation[];
  onRefreshLocations: () => Promise<void> | void;
  accentColor: string;
}

export const WorkLocationManagerModal: React.FC<WorkLocationManagerModalProps> = ({
  isOpen,
  onClose,
  locations,
  onRefreshLocations,
  accentColor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLoc, setEditingLoc] = useState<CompanyLocation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    location_code: '',
    location_name: '',
    location_type: 'batching_plant',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 150,
    is_active: true,
    notes: '',
  });

  if (!isOpen) return null;

  const filteredLocations = (locations || []).filter((loc) => {
    const q = searchQuery.toLowerCase();
    return (
      (loc.location_name || '').toLowerCase().includes(q) ||
      (loc.location_code || '').toLowerCase().includes(q) ||
      (loc.address || '').toLowerCase().includes(q) ||
      (loc.location_type || '').toLowerCase().includes(q)
    );
  });

  const handleStartCreate = () => {
    setFormData({
      location_code: `LOC-${String((locations || []).length + 1).padStart(2, '0')}`,
      location_name: '',
      location_type: 'batching_plant',
      address: '',
      latitude: '-6.200000',
      longitude: '106.816666',
      radius_meters: 150,
      is_active: true,
      notes: '',
    });
    setEditingLoc(null);
    setIsCreating(true);
  };

  const handleStartEdit = (loc: CompanyLocation) => {
    setFormData({
      location_code: loc.location_code || '',
      location_name: loc.location_name || '',
      location_type: loc.location_type || 'batching_plant',
      address: loc.address || '',
      latitude: loc.latitude != null ? String(loc.latitude) : '',
      longitude: loc.longitude != null ? String(loc.longitude) : '',
      radius_meters: loc.radius_meters || 150,
      is_active: loc.is_active !== undefined ? Boolean(loc.is_active) : true,
      notes: loc.notes || '',
    });
    setEditingLoc(loc);
    setIsCreating(false);
  };

  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung pendeteksi GPS / Geolocation.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success(`Koordinat GPS berhasil diperoleh: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Gagal mendeteksi lokasi GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_name || !formData.location_code) {
      toast.error('Nama lokasi dan kode lokasi wajib diisi.');
      return;
    }

    const payload = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      radius_meters: Number(formData.radius_meters) || 150,
    };

    setIsSubmitting(true);
    try {
      if (editingLoc) {
        const res = await api.updateLocation(editingLoc.id, payload);
        if (res.success) {
          toast.success(res.message || 'Titik lokasi berhasil diperbarui!');
          setEditingLoc(null);
          await onRefreshLocations();
        } else {
          toast.error(res.error || 'Gagal memperbarui lokasi');
        }
      } else {
        const res = await api.addLocation(payload);
        if (res.success) {
          toast.success(res.message || 'Titik lokasi baru berhasil didaftarkan!');
          setIsCreating(false);
          await onRefreshLocations();
        } else {
          toast.error(res.error || 'Gagal mendaftarkan lokasi');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (loc: CompanyLocation) => {
    if (!confirm(`Hapus titik lokasi "${loc.location_name}"? Data log terdahulu tetap menyimpan nama lokasi.`)) {
      return;
    }
    try {
      const res = await api.deleteLocation(loc.id);
      if (res.success) {
        toast.success(res.message || 'Lokasi berhasil dihapus');
        await onRefreshLocations();
      } else {
        toast.error(res.error || 'Gagal menghapus lokasi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus lokasi');
    }
  };

  const getLocationTypeBadge = (type: string) => {
    switch (type) {
      case 'head_office':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">HEAD OFFICE</span>;
      case 'batching_plant':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">BATCHING PLANT</span>;
      case 'purchasing_office':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">PURCHASING & LOGISTIK</span>;
      case 'warehouse':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">GUDANG MATERIAL</span>;
      case 'project_site':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">SITE PROYEK</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-[#18181b] dark:text-slate-300 border border-slate-300 dark:border-[#27272a] uppercase">{type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50 dark:bg-[#151518]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Master Titik Lokasi Presensi & Geofencing
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Definisikan lokasi kerja (Head Office, Batching Plant, Kantor Purchasing) beserta koordinat GPS & radius
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f1f23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Actions: Add Button & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari lokasi, kode, tipe, atau alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-sans"
              />
            </div>

            {!isCreating && !editingLoc && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Titik Lokasi Baru</span>
              </button>
            )}
          </div>

          {/* Form Modal / Inline Editor if Creating or Editing */}
          {(isCreating || editingLoc) && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-sky-500/40 bg-sky-50/20 dark:bg-sky-950/10 space-y-4">
              <div className="flex items-center justify-between border-b border-sky-200/50 dark:border-sky-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingLoc ? `Edit Titik Lokasi: ${editingLoc.location_name}` : 'Tambah Titik Lokasi Baru'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingLoc(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Kode Lokasi *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location_code}
                      onChange={(e) => setFormData({ ...formData, location_code: e.target.value.toUpperCase() })}
                      placeholder="Contoh: BP-01, HO-JKT, PUR-01"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Nama Lokasi Kerja *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location_name}
                      onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                      placeholder="Contoh: Batching Plant Sentul, Head Office Lt. 3, Kantor Purchasing"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Tipe / Kategori Lokasi
                    </label>
                    <select
                      value={formData.location_type}
                      onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="head_office">Head Office (Kantor Pusat)</option>
                      <option value="batching_plant">Batching Plant (Produksi Beton)</option>
                      <option value="purchasing_office">Kantor Purchasing & Logistik</option>
                      <option value="warehouse">Gudang / Workshop Material</option>
                      <option value="project_site">Site Proyek Konstruksi</option>
                      <option value="branch_office">Kantor Cabang</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Radius Validasi Geofence (Meter)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={20}
                        max={5000}
                        value={formData.radius_meters}
                        onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value, 10) || 100 })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-slate-500 shrink-0 font-medium">meter</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Alamat Lengkap / Keterangan Lokasi
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Contoh: Jl. Raya Sentul KM 32, Babakan Madang, Bogor"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white"
                  />
                </div>

                {/* GPS Coordinates with current GPS detector */}
                <div className="p-3 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Koordinat Titik Tengah GPS (Latitude & Longitude)
                    </span>
                    <button
                      type="button"
                      onClick={handleDetectCurrentGps}
                      disabled={isLocating}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>{isLocating ? 'Mendeteksi...' : 'Ambil GPS Saya Saat Ini'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="-6.200000"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="106.816666"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {formData.latitude && formData.longitude && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka & Verifikasi di Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingLoc(null);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f1f23] font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : editingLoc ? 'Simpan Perubahan' : 'Daftarkan Lokasi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Locations Table */}
          <div className="border border-slate-200 dark:border-[#27272a] rounded-2xl overflow-hidden bg-white dark:bg-[#151518]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama & Kode Lokasi</th>
                    <th className="py-3 px-4">Kategori / Tipe</th>
                    <th className="py-3 px-4">Koordinat GPS</th>
                    <th className="py-3 px-4">Radius Validasi</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]">
                  {filteredLocations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada titik lokasi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredLocations.map((loc, idx) => (
                      <tr key={loc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{loc.location_name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pl-5">
                            Kode: {loc.location_code}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLocationTypeBadge(loc.location_type)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {loc.latitude != null && loc.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                              title="Lihat di Google Maps"
                            >
                              <span>{Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Belum diset</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                            {loc.radius_meters || 100} Meter
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400 text-xs">
                          {loc.address || '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              loc.is_active
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {loc.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(loc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors"
                              title="Edit titik lokasi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(loc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors"
                              title="Hapus lokasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50 dark:bg-[#151518]">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total <strong>{locations.length}</strong> Titik Lokasi Kerja Terdaftar
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-[#27272a] text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
