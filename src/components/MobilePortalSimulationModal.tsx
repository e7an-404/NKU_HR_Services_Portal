import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  RefreshCw,
  X,
  Building2,
  User,
  Compass,
  Moon,
  Loader2,
} from 'lucide-react';
import { CompanyLocation, Employee } from '../types';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

interface MobilePortalSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  locations: CompanyLocation[];
  onAttendanceSuccess: () => Promise<void> | void;
  accentColor: string;
}

// Calculate distance in meters using Haversine formula
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const MobilePortalSimulationModal: React.FC<MobilePortalSimulationModalProps> = ({
  isOpen,
  onClose,
  employees,
  locations,
  onAttendanceSuccess,
  accentColor,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [userLat, setUserLat] = useState<string>('-6.200000');
  const [userLon, setUserLon] = useState<string>('106.816666');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('Samsung Galaxy S24 (Android)');
  const [notes, setNotes] = useState<string>('');
  const [showEarlyConfirm, setShowEarlyConfirm] = useState<boolean>(false);
  const [earlyReason, setEarlyReason] = useState<string>('Lembur Khusus / Pekerjaan Mendesak');
  const [earlyCustomReason, setEarlyCustomReason] = useState<string>('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize selected employee & location
  useEffect(() => {
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(String(employees[0].id));
    }
    if (locations.length > 0 && !targetLocationId) {
      setTargetLocationId(String(locations[0].id));
      if (locations[0].latitude && locations[0].longitude) {
        // slight jitter (e.g. 5-15 meters) to simulate real human GPS inside geofence
        const jitterLat = Number(locations[0].latitude) + (Math.random() - 0.5) * 0.0001;
        const jitterLon = Number(locations[0].longitude) + (Math.random() - 0.5) * 0.0001;
        setUserLat(jitterLat.toFixed(6));
        setUserLon(jitterLon.toFixed(6));
      }
    }
  }, [employees, locations, selectedEmpId, targetLocationId]);

  const selectedEmp = useMemo(() => {
    return employees.find((e) => String(e.id) === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  const targetLocation = useMemo(() => {
    return locations.find((l) => String(l.id) === targetLocationId) || null;
  }, [locations, targetLocationId]);

  // Calculate distance to selected target location
  const distanceInfo = useMemo(() => {
    if (!targetLocation || !targetLocation.latitude || !targetLocation.longitude) {
      return null;
    }
    const lat = parseFloat(userLat);
    const lon = parseFloat(userLon);
    if (isNaN(lat) || isNaN(lon)) return null;

    const dist = calculateDistanceMeters(lat, lon, targetLocation.latitude, targetLocation.longitude);
    const isInside = dist <= (targetLocation.radius_meters || 150);
    return {
      distance: dist,
      radius: targetLocation.radius_meters || 150,
      isInside,
    };
  }, [targetLocation, userLat, userLon]);

  if (!isOpen) return null;

  const handleSelectPresetLocation = (loc: CompanyLocation) => {
    setTargetLocationId(String(loc.id));
    if (loc.latitude && loc.longitude) {
      // Simulate real GPS inside geofence with 10-25m jitter
      const jitterLat = Number(loc.latitude) + (Math.random() - 0.5) * 0.00015;
      const jitterLon = Number(loc.longitude) + (Math.random() - 0.5) * 0.00015;
      setUserLat(jitterLat.toFixed(6));
      setUserLon(jitterLon.toFixed(6));
      toast.success(`Posisi GPS diatur di area: ${loc.location_name}`);
    }
  };

  const handleSetOutsideGeofence = () => {
    if (targetLocation && targetLocation.latitude && targetLocation.longitude) {
      // Offset by ~1.5 km
      const farLat = Number(targetLocation.latitude) + 0.015;
      const farLon = Number(targetLocation.longitude) + 0.015;
      setUserLat(farLat.toFixed(6));
      setUserLon(farLon.toFixed(6));
      toast.info('Posisi GPS diatur di luar geofence (simulasi gagal presensi).');
    }
  };

  const handleDetectBrowserGps = () => {
    if (!navigator.geolocation) {
      toast.error('Perangkat/browser tidak mendukung Geolocation.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        setUserLat(pos.coords.latitude.toFixed(6));
        setUserLon(pos.coords.longitude.toFixed(6));
        toast.success(`GPS HP Terdeteksi: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error(`Gagal membaca GPS HP: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClockAction = async (type: 'in' | 'out', forceEarly = false, earlyReasonText?: string) => {
    if (!selectedEmp) {
      toast.error('Pilih karyawan terlebih dahulu.');
      return;
    }

    const now = new Date();
    const isEarlyMorning = now.getHours() >= 0 && now.getHours() < 6;
    if (type === 'in' && isEarlyMorning && !forceEarly) {
      setShowEarlyConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.mobileClockIn({
        employee_id: selectedEmp.id,
        identifier: selectedEmp.nip,
        location_id: targetLocation ? targetLocation.id : null,
        latitude: parseFloat(userLat),
        longitude: parseFloat(userLon),
        location_address: targetLocation?.address || 'Presensi Mobile GPS Karyawan',
        accuracy: 12,
        is_mock_location: false,
        log_type: type,
        device_name: deviceModel,
        notes: notes || `Presensi mobile ${type === 'in' ? 'Masuk' : 'Pulang'} via Portal Karyawan`,
        force_early_clock_in: forceEarly,
        early_clock_in_reason: earlyReasonText || earlyReason,
      });

      if (res.success) {
        setShowEarlyConfirm(false);
        toast.success(res.message || `Presensi ${type === 'in' ? 'Masuk' : 'Pulang'} Berhasil!`);
        await onAttendanceSuccess();
        onClose();
      } else {
        if (res.requires_early_confirmation) {
          setShowEarlyConfirm(true);
          return;
        }
        toast.error(res.error || res.message || 'Gagal melakukan presensi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50 dark:bg-[#151518]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Simulator Portal Karyawan (Mobile Clock-In)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  GPS LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulasi presensi karyawan lewat HP di Head Office, Batching Plant, atau Kantor Purchasing
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Employee Selection */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Pilih Akun Karyawan yang Melakukan Presensi:
            </label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.nip} - {emp.full_name} ({emp.division_name || 'Divisi'})
                  </option>
                ))}
              </select>
            </div>
            {selectedEmp && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 flex items-center gap-3">
                <span>Jabatan: <strong>{selectedEmp.job_grade_name || '-'}</strong></span>
                <span>&bull;</span>
                <span>Divisi: <strong>{selectedEmp.division_name || '-'}</strong></span>
              </div>
            )}
          </div>

          {/* Target Location & Presets */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-500" />
                <span>Titik Lokasi Kerja Tujuan:</span>
              </label>
              <button
                type="button"
                onClick={handleDetectBrowserGps}
                disabled={isDetectingGps}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>Gunakan GPS Asli HP</span>
              </button>
            </div>

            {/* Quick Location Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Preset Simulasi:</span>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleSelectPresetLocation(loc)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    String(loc.id) === targetLocationId
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#121215] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#1f1f23]'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{loc.location_name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleSetOutsideGeofence}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                title="Simulasi lokasi di luar radius"
              >
                Simulasi Di Luar Radius (Gagal)
              </button>
            </div>

            {/* GPS Coordinates Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Latitude HP Karyawan:</span>
                <input
                  type="text"
                  value={userLat}
                  onChange={(e) => setUserLat(e.target.value)}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Longitude HP Karyawan:</span>
                <input
                  type="text"
                  value={userLon}
                  onChange={(e) => setUserLon(e.target.value)}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Geofence Status Card */}
            {distanceInfo && targetLocation && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  distanceInfo.isInside
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {distanceInfo.isInside ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {distanceInfo.isInside
                        ? 'Dalam Radius Geofence (Presensi Diizinkan)'
                        : 'Di Luar Radius Geofence (Presensi Akan Ditolak)'}
                    </div>
                    <div className="text-[11px] opacity-90">
                      Jarak saat ini: <strong>{distanceInfo.distance} meter</strong> dari pusat {targetLocation.location_name} (Batas Radius: {distanceInfo.radius}m)
                    </div>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${userLat},${userLon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/70 dark:bg-[#18181b]/70 border border-current hover:opacity-80 flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Maps</span>
                </a>
              </div>
            )}
          </div>

          {/* Clock Display */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-center shadow-lg space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              {currentDate || 'Memuat Waktu...'}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-sky-400">
              {currentTime || '08:00:00'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Waktu Server Terverifikasi (WIB / GMT+7)</span>
            </div>
          </div>

          {/* Action Buttons: Clock In & Clock Out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleClockAction('in')}
              className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              <span>CLOCK IN (MASUK KERJA)</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleClockAction('out')}
              className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>CLOCK OUT (PULANG KERJA)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50 dark:bg-[#151518]">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Log presensi otomatis tersimpan dengan ID lokasi, nama titik kerja, dan koordinat GPS.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-[#27272a] text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup Simulator
          </button>
        </div>
      </div>

      {/* POPUP KONFIRMASI DINI HARI MOBILE PORTAL */}
      {showEarlyConfirm && selectedEmp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl border-2 border-amber-500/50 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/20 flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Moon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Konfirmasi Presensi Dini Hari
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                  Peringatan Waktu Clock In
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedEmp.full_name} ({selectedEmp.nip})
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowEarlyConfirm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Waktu Saat Ini:
                  </span>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-black">
                    {currentTime || '01:00 WIB'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Sistem mendeteksi Anda melakukan <strong>Clock In pada jam dini hari</strong> (di luar jendela waktu normal kantor 08:00 - 17:00 WIB).
                </p>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Apakah Anda yakin ingin melanjutkan Presensi Masuk sekarang?
                </div>
              </div>

              {/* Alasan */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Pilih Keterangan / Alasan Presensi Dini Hari:
                </label>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {[
                    'Lembur Khusus / Pekerjaan Mendesak',
                    'Shift Malam / Dinas Malam Khusus',
                    'Tugas Luar Kota / Berangkat Subuh',
                    'Lainnya (Tuliskan keterangan)',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEarlyReason(option)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        earlyReason === option
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <span>{option}</span>
                      {earlyReason === option && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {earlyReason === 'Lainnya (Tuliskan keterangan)' && (
                  <input
                    type="text"
                    placeholder="Contoh: Pengawasan instalasi batching plant subuh..."
                    value={earlyCustomReason}
                    onChange={(e) => setEarlyCustomReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#121215] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowEarlyConfirm(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const finalReason =
                      earlyReason === 'Lainnya (Tuliskan keterangan)' && earlyCustomReason.trim()
                        ? earlyCustomReason.trim()
                        : earlyReason;
                    handleClockAction('in', true, finalReason);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Ya, Konfirmasi Masuk
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
