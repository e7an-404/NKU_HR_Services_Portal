import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Monitor,
  Clock,
  QrCode,
  User,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  Camera,
  CameraOff,
  RefreshCw,
  ScanLine,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  Moon,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Employee, AttendanceLog, User as UserType } from '../types';
import { getContrastTextColorStyle, getAccessibleAccentColor } from '../lib/companyUtils';

interface KioskTerminalViewProps {
  currentUser?: UserType;
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  accentColor: string;
  isDarkMode?: boolean;
  companyName: string;
  onRecordAttendance: (data: {
    employee_id: number;
    log_type: 'clock_in' | 'clock_out';
    method: 'qr' | 'manual' | 'rfid';
    notes?: string;
    log_date?: string;
    scan_time?: string;
    force_early_clock_in?: boolean;
    early_clock_in_reason?: string;
  }) => Promise<any>;
}

export const KioskTerminalView: React.FC<KioskTerminalViewProps> = ({
  currentUser,
  employees,
  attendanceLogs,
  accentColor,
  isDarkMode = true,
  companyName,
  onRecordAttendance,
}) => {
  const accessibleColor = useMemo(
    () => getAccessibleAccentColor(accentColor, isDarkMode !== false),
    [accentColor, isDarkMode]
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [method, setMethod] = useState<'qr' | 'manual'>('qr');
  const [inputVal, setInputVal] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera Scanner states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const scannerContainerId = 'kiosk-html5-scanner';

  // Pop-up Selection & Error Prevention State
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [scanMethodUsed, setScanMethodUsed] = useState<'qr' | 'manual'>('qr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingType, setSubmittingType] = useState<'clock_in' | 'clock_out' | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const autoCloseTimerRef = useRef<any>(null);

  const [actionSuccess, setActionSuccess] = useState<{
    type: 'clock_in' | 'clock_out';
    status: 'on_time' | 'late';
    time: string;
  } | null>(null);

  // Early Morning Confirmation Popup State
  const [showEarlyMorningModal, setShowEarlyMorningModal] = useState(false);
  const [earlyMorningReason, setEarlyMorningReason] = useState('Lembur Khusus / Pekerjaan Mendesak');
  const [earlyMorningCustomReason, setEarlyMorningCustomReason] = useState('');

  const handleCloseModal = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setActiveEmployee(null);
    setActionSuccess(null);
    setIsSubmitting(false);
    setSubmittingType(null);
    setShowEarlyMorningModal(false);
    setEarlyMorningCustomReason('');
    isSubmittingRef.current = false;
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const canShowQuickSimulation = currentUser
    ? currentUser.role_key === 'super_admin' ||
      currentUser.role_key === 'hr_admin' ||
      currentUser.role_key === 'manager' ||
      currentUser.role_key === 'payroll_admin'
    : false;

  // Digital clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Web Audio pleasant audio feedback
  const playBeep = (isSuccess: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Ignore audio error
    }
  };

  // Get today's local date string YYYY-MM-DD
  const getTodayISO = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  // Find today's logs for an employee
  const getTodayLogsForEmployee = (empId: number) => {
    const today = getTodayISO();
    const employeeLogs = attendanceLogs.filter(
      (l) =>
        Number(l.employee_id) === Number(empId) &&
        (l.log_date === today || (l.scan_time && l.scan_time.startsWith(today)))
    );

    const clockInLog = employeeLogs.find((l) => l.log_type === 'clock_in' || l.log_type === 'in');
    const clockOutLog = employeeLogs.find((l) => l.log_type === 'clock_out' || l.log_type === 'out');

    return { clockInLog, clockOutLog };
  };

  // Trigger employee recognition and open pop-up
  const handleIdentifyEmployee = (code: string, methodUsed: 'qr' | 'manual' = 'qr') => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return;

    const emp = employees.find(
      (e) =>
        String(e.id).toLowerCase() === cleanCode ||
        (e.qr_code || '').toLowerCase() === cleanCode ||
        (e.nip || '').toLowerCase() === cleanCode ||
        ((e as any).rfid_code || '').toLowerCase() === cleanCode
    );

    if (!emp) {
      playBeep(false);
      alert(`Kode "${code}" tidak ditemukan pada sistem data karyawan.`);
      setInputVal('');
      return;
    }

    playBeep(true);
    setActiveEmployee(emp);
    setScanMethodUsed(methodUsed);
    setActionSuccess(null);
    setInputVal('');
  };

  // Handle Attendance Action from Modal with atomic synchronous lock & debounce
  const handleConfirmAttendance = async (
    logType: 'clock_in' | 'clock_out',
    forceEarly: boolean = false,
    earlyReasonText?: string
  ) => {
    const nowMs = Date.now();
    // 1. Synchronous Ref Lock: Prevents rapid/double-clicks before React re-render
    if (isSubmittingRef.current || isSubmitting) return;
    if (nowMs - lastSubmitTimeRef.current < 1500) return; // 1.5s hardware debounce

    if (!activeEmployee) return;

    const { clockInLog, clockOutLog } = getTodayLogsForEmployee(activeEmployee.id);

    // Human error safety checks - strictly prevent duplicates
    if (logType === 'clock_in' && clockInLog) {
      const timeStr = clockInLog.scan_time ? clockInLog.scan_time.slice(11, 16) : '-';
      alert(`Karyawan ${activeEmployee.full_name} (${activeEmployee.nip}) sudah tercatat Presensi Masuk hari ini pada pukul ${timeStr} WIB!`);
      return;
    }
    if (logType === 'clock_out' && clockOutLog) {
      const timeStr = clockOutLog.scan_time ? clockOutLog.scan_time.slice(11, 16) : '-';
      alert(`Karyawan ${activeEmployee.full_name} (${activeEmployee.nip}) sudah tercatat Presensi Pulang hari ini pada pukul ${timeStr} WIB!`);
      return;
    }

    // CHECK FOR EARLY MORNING HOURS (00:00 s/d 05:59 WIB)
    const now = new Date();
    const currentHour = now.getHours();
    const isEarlyMorning = currentHour >= 0 && currentHour < 6;

    if (logType === 'clock_in' && isEarlyMorning && !forceEarly) {
      // Trigger early morning confirmation popup!
      setShowEarlyMorningModal(true);
      return;
    }

    // Set synchronous lock immediately
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = nowMs;
    setIsSubmitting(true);
    setSubmittingType(logType);

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const localTime = `${localDate} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    try {
      const res = await onRecordAttendance({
        employee_id: activeEmployee.id,
        log_type: logType,
        method: scanMethodUsed,
        notes: `Terminal Kiosk (${scanMethodUsed.toUpperCase()})`,
        log_date: localDate,
        scan_time: localTime,
        force_early_clock_in: forceEarly,
        early_clock_in_reason: earlyReasonText || earlyMorningReason,
      });

      if (res && res.success === false) {
        if (res.requires_early_confirmation) {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          setSubmittingType(null);
          setShowEarlyMorningModal(true);
          return;
        }
        alert(res.error || res.message || 'Presensi gagal dicatat');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setSubmittingType(null);
        return;
      }

      setShowEarlyMorningModal(false);
      playBeep(true);
      setActionSuccess({
        type: logType,
        status: res?.data?.status || 'on_time',
        time: now.toLocaleTimeString('id-ID'),
      });

      // Auto close pop-up after 3s
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = setTimeout(() => {
        handleCloseModal();
      }, 3000);
    } catch (err: any) {
      alert('Gagal memproses presensi: ' + (err.message || 'Terjadi kesalahan sistem'));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmittingType(null);
    }
  };

  // Initialize and manage Html5Qrcode Scanner (Single instance & clean DOM)
  const startScanner = async (cameraId?: string) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      setCameraError(null);

      // Thoroughly clean any previous scanner and clear DOM container to avoid duplicate video elements
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore
        }
        html5QrCodeRef.current = null;
      }

      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            v.pause();
            v.srcObject = null;
          } catch {}
        });
        container.innerHTML = '';
      }

      // Fetch available cameras if not yet loaded
      if (cameras.length === 0) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!cameraId) {
            // Prefer back/rear camera for scanning ID cards
            const backCam = devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            cameraId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(cameraId);
          }
        } else {
          setCameraError('Tidak ada perangkat kamera yang terdeteksi pada perangkat ini.');
          isStartingRef.current = false;
          return;
        }
      }

      const targetCamId = cameraId || selectedCameraId || (cameras[0] && cameras[0].id);
      if (!targetCamId) {
        setCameraError('Kamera tidak ditemukan.');
        isStartingRef.current = false;
        return;
      }

      const currentContainer = document.getElementById(scannerContainerId);
      if (!currentContainer) {
        isStartingRef.current = false;
        return;
      }
      const existingVideos = currentContainer.querySelectorAll('video');
      existingVideos.forEach((v) => {
        try {
          v.pause();
          v.srcObject = null;
        } catch {}
      });
      currentContainer.innerHTML = '';

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      // Start scanner without internal qrbox so html5-qrcode won't inject duplicate white reticles/canvases
      await html5QrCode.start(
        targetCamId,
        {
          fps: 15,
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          if (decodedText) {
            handleIdentifyEmployee(decodedText, 'qr');
          }
        },
        () => {
          // Frame scan error - ignore
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('interrupted')) {
        // Media request was interrupted (benign when switching tabs/unmounting)
        return;
      }
      console.error('Error starting camera scanner:', err);
      setCameraError(
        'Gagal mengakses kamera. Pastikan izin kamera telah diizinkan pada browser Anda.'
      );
      setIsCameraActive(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    try {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            v.pause();
            v.srcObject = null;
          } catch {}
        });
      }
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        try {
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore
        }
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        container.innerHTML = '';
      }
      setIsCameraActive(false);
      isStartingRef.current = false;
    }
  };

  // Clean up scanner on unmount or tab change
  useEffect(() => {
    if (method === 'qr' && !isCameraActive) {
      startScanner();
    } else if (method === 'manual' && isCameraActive) {
      stopScanner();
    }

    return () => {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            v.pause();
            v.srcObject = null;
          } catch {}
        });
      }
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
        try {
          html5QrCodeRef.current.clear();
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [method]);

  // Handle Manual Number Search with fixed NKU- template prefix
  const handleManualSearch = () => {
    const raw = manualNumber.trim();
    if (!raw) return;

    // Zero-pad up to 4 digits (e.g., "1" -> "NKU-0001", "12" -> "NKU-0012")
    const padded = raw.padStart(4, '0');
    const targetNipPadded = `NKU-${padded}`.toLowerCase();
    const targetNipRaw = `NKU-${raw}`.toLowerCase();

    const emp = employees.find(
      (e) =>
        e.nip.toLowerCase() === targetNipPadded ||
        e.nip.toLowerCase() === targetNipRaw ||
        String(e.id) === raw ||
        e.nip.toLowerCase().endsWith(raw.toLowerCase())
    );

    if (!emp) {
      playBeep(false);
      alert(`Pegawai dengan NIP "NKU-${padded}" tidak ditemukan.`);
      return;
    }

    playBeep(true);
    setActiveEmployee(emp);
    setScanMethodUsed('manual');
    setActionSuccess(null);
    setManualNumber('');
  };

  const toggleFullscreen = async () => {
    const kioskEl = document.getElementById('kiosk-terminal-view');
    if (!kioskEl) return;

    try {
      if (!document.fullscreenElement) {
        if (kioskEl.requestFullscreen) {
          await kioskEl.requestFullscreen();
        } else if ((kioskEl as any).webkitRequestFullscreen) {
          await (kioskEl as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  // Compute log status for currently active employee in modal
  const activeEmpLogs = activeEmployee ? getTodayLogsForEmployee(activeEmployee.id) : null;
  const hasClockIn = Boolean(activeEmpLogs?.clockInLog);
  const hasClockOut = Boolean(activeEmpLogs?.clockOutLog);
  const isBothCompleted = hasClockIn && hasClockOut;

  // Filter attendance logs to only display today's logs (resets at midnight)
  const todayLogs = useMemo(() => {
    const todayStr = getTodayISO();
    return attendanceLogs.filter(
      (log) => log.log_date === todayStr || (log.scan_time && log.scan_time.startsWith(todayStr))
    );
  }, [attendanceLogs, currentTime.getDate()]);

  return (
    <div
      id="kiosk-terminal-view"
      className={`w-full transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto min-h-screen flex flex-col justify-start'
          : 'w-full space-y-4 py-1'
      }`}
    >
      {/* Kiosk Header */}
      <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white shadow-xs dark:shadow-md border border-slate-200 dark:border-slate-700/80 relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"
              style={{ color: accessibleColor }}
            >
              <Monitor className="w-4 h-4" />
              Terminal Kiosk Presensi Mandiri
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 text-slate-900 dark:text-white">
              {companyName}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
              Scan Barcode / QR Code pada kamera scanner atau masukkan nomor NIP pada terminal ini.
            </p>
          </div>

          {/* Large Digital Clock */}
          <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <Clock className="w-7 h-7 shrink-0" style={{ color: accessibleColor }} />
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-slate-900 dark:text-white">
                {currentTime.toLocaleTimeString('id-ID')}
              </div>
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-2 cursor-pointer transition-colors shadow-2xs"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh Kiosk'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Terminal Interaction Grid - Balanced Proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Area: Scan Input & Camera View Area */}
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-4">
            {/* Method Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl">
              <button
                type="button"
                onClick={() => setMethod('qr')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === 'qr'
                    ? 'bg-white dark:bg-[#27272a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4 text-purple-500" />
                Scan Barcode / QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('manual');
                  setTimeout(() => manualInputRef.current?.focus(), 100);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === 'manual'
                    ? 'bg-white dark:bg-[#27272a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4 text-emerald-500" />
                Input Manual NIP Pegawai
              </button>
            </div>

            {/* TAB 1: Real Barcode / QR Camera Scanner */}
            {method === 'qr' && (
              <div className="space-y-4">
                {/* Live Camera Scanner Box */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] max-h-[380px]">
                  {/* html5-qrcode video element container */}
                  <div
                    id={scannerContainerId}
                    className="w-full h-full flex items-center justify-center"
                    style={{ minHeight: '280px', maxHeight: '380px' }}
                  />

                  {/* Laser Scan Overlay Animation - Only One Clean Centered Reticle */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-sky-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                        {/* Corner Reticles */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-sky-400" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-sky-400" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-sky-400" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-sky-400" />

                        {/* Animated Laser Bar */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#f43f5e] animate-pulse relative top-1/2 -translate-y-1/2" />
                      </div>
                      <div className="mt-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] text-sky-300 font-bold border border-sky-500/30 flex items-center gap-1.5 shadow-md">
                        <ScanLine className="w-3.5 h-3.5 animate-spin" />
                        Arahkan Barcode atau QR Code ID Card ke Kotak Scanner
                      </div>
                    </div>
                  )}

                  {/* Fallback when Camera is Not Active */}
                  {!isCameraActive && !cameraError && (
                    <div className="py-12 text-center text-slate-400 p-6 flex flex-col items-center gap-3">
                      <CameraOff className="w-12 h-12 text-slate-500" />
                      <div className="text-sm font-bold text-slate-200">Kamera Scanner Sedang Nonaktif</div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Klik tombol di bawah untuk mengaktifkan kamera scanner barcode dan QR code.
                      </p>
                      <button
                        type="button"
                        onClick={() => startScanner()}
                        className="mt-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        Aktifkan Kamera Scanner
                      </button>
                    </div>
                  )}

                  {/* Error Notification */}
                  {cameraError && (
                    <div className="py-8 px-6 text-center text-rose-400 flex flex-col items-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-rose-500" />
                      <div className="text-xs font-bold text-white">{cameraError}</div>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Anda tetap dapat menggunakan Handheld Barcode Scanner Gun atau Input Manual NIP di bawah.
                      </p>
                      <button
                        type="button"
                        onClick={() => startScanner()}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Coba Lagi
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Switcher & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#18181b] p-3 rounded-xl border border-slate-200 dark:border-[#27272a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-sky-500" />
                      Pilihan Kamera:
                    </span>
                    {cameras.length > 0 ? (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                          startScanner(e.target.value);
                        }}
                        className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] text-slate-800 dark:text-white cursor-pointer"
                      >
                        {cameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || `Camera ${c.id.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Default Camera</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCameraActive ? (
                      <button
                        type="button"
                        onClick={stopScanner}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Matikan Kamera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startScanner()}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors"
                      >
                        Nyalakan Kamera
                      </button>
                    )}
                  </div>
                </div>

                {/* Barcode Scanner Gun / Quick Keyboard Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Handheld Barcode Gun Scanner / Kode Barcode:
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleIdentifyEmployee(inputVal, 'qr');
                      }
                    }}
                    placeholder="Scan barcode dengan scanner gun atau ketik kode lalu tekan Enter..."
                    className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    * Scanner gun USB/Bluetooth akan otomatis terdeteksi saat barcode ditembakkan (menekan Enter).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Manual NIP Input with fixed "NKU-" template prefix */}
            {method === 'manual' && (
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Masukkan Nomor NIP Pegawai (Cukup Ketik Angka):
                  </label>
                  <div className="flex items-stretch rounded-2xl border-2 border-slate-300 dark:border-[#3f3f46] overflow-hidden focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 bg-white dark:bg-[#18181b] transition-all">
                    {/* Fixed NKU- Template Badge */}
                    <div className="px-4 py-3 bg-slate-100 dark:bg-[#27272a] border-r border-slate-300 dark:border-[#3f3f46] flex items-center justify-center font-mono font-black text-sm text-slate-800 dark:text-slate-200 select-none">
                      NKU-
                    </div>
                    {/* User only types numbers */}
                    <input
                      ref={manualInputRef}
                      type="text"
                      inputMode="numeric"
                      value={manualNumber}
                      onChange={(e) => {
                        // Allow typing only numbers
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setManualNumber(clean);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualSearch();
                        }
                      }}
                      placeholder="0001"
                      maxLength={6}
                      className="flex-1 px-4 py-3 text-base font-mono font-bold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleManualSearch}
                      disabled={!manualNumber.trim()}
                      className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    >
                      <Search className="w-4 h-4" />
                      Presensi
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#27272a] text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="font-bold text-sky-600 dark:text-sky-400">💡 Tips:</span>
                  <span>
                    Template <span className="font-mono font-bold">NKU-</span> sudah terpasang otomatis. Cukup ketik nomor saja (contoh: <span className="font-mono font-bold text-slate-900 dark:text-white">0001</span> atau <span className="font-mono font-bold text-slate-900 dark:text-white">1</span>) lalu tekan <span className="font-bold text-slate-900 dark:text-white">Enter</span>.
                  </span>
                </div>
              </div>
            )}

            {/* Quick Employee Simulator Cards - Only visible for Super Admin, HR, Manager, etc. Hidden for Kiosk Device */}
            {canShowQuickSimulation && (
              <div className="pt-3 border-t border-slate-100 dark:border-[#27272a]">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Simulasi Cepat (Klik Karyawan untuk Membuka Pop-up Presensi):
                </div>
                <div className="flex flex-wrap gap-2">
                  {employees.slice(0, 8).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleIdentifyEmployee(emp.nip, 'manual')}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] hover:bg-slate-100 dark:hover:bg-[#27272a] text-left text-xs transition-all flex items-center gap-2 group cursor-pointer"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
                      >
                        {emp.full_name.charAt(0)}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-[11px] line-clamp-1">
                          {emp.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">
                          {emp.nip}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Realtime Terminal History */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs flex flex-col h-full min-h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272a] mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Riwayat Scan Terminal Hari Ini
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272a]">
                {todayLogs.length}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 animate-pulse">
              Realtime
            </span>
          </div>

          {/* History Item List with Row Index Badges */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] 2xl:max-h-[640px] pr-1">
            {todayLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-xs">
                Belum ada aktivitas presensi di terminal hari ini.
              </div>
            ) : (
              todayLogs.slice(0, 20).map((log, idx) => {
                const isQr = log.method === 'qr' || (log.notes && log.notes.toUpperCase().includes('QR'));
                const isClockIn = log.log_type === 'clock_in' || log.log_type === 'in';
                const emp = employees.find((e) => Number(e.id) === Number(log.employee_id));
                const empName = (log.employee_name && log.employee_name !== 'Unknown') ? log.employee_name : (emp?.full_name || 'Karyawan');
                const empNip = (log.employee_nip && log.employee_nip !== '-') ? log.employee_nip : (emp?.nip || '-');
                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      {/* Row Index Badge */}
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] flex items-center justify-center font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {empName}
                          </span>
                          {/* Method Category Badge */}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                              isQr
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {isQr ? (
                              <>
                                <QrCode className="w-2.5 h-2.5" />
                                QR
                              </>
                            ) : (
                              <>
                                <User className="w-2.5 h-2.5" />
                                NIP
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{empNip}</span>
                          <span>&bull;</span>
                          <span className={`uppercase font-bold ${isClockIn ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {isClockIn ? 'MASUK' : 'PULANG'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'late'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : log.status === 'invalid_window' || log.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        title={log.notes || ''}
                      >
                        {log.status === 'late' ? 'TELAT' : log.status === 'invalid_window' || log.status === 'rejected' ? 'DITOLAK' : 'OK'}
                      </span>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-300 mt-0.5">
                        {log.scan_time ? log.scan_time.slice(11, 19) : '-'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* POP-UP MODAL: Konfirmasi & Pemilihan Masuk / Pulang Kerja */}
      {activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200 dark:border-[#27272a] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  {activeEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {activeEmployee.full_name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>NIP: {activeEmployee.nip}</span>
                    <span>&bull;</span>
                    <span>{activeEmployee.division_name || 'Divisi'}</span>
                  </div>
                </div>
              </div>

              {!actionSuccess && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* If Action Success */}
              {actionSuccess ? (
                <div className="py-4 text-center space-y-3 animate-in zoom-in-90 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      Presensi {actionSuccess.type === 'clock_in' ? 'Masuk' : 'Pulang'} Berhasil!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Tercatat pada pukul <span className="font-mono font-bold text-slate-800 dark:text-white">{actionSuccess.time} WIB</span>
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    {actionSuccess.status === 'late' ? '⚠️ Terlambat' : '✨ Tepat Waktu'}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Early morning notice */}
                  {currentTime.getHours() < 6 && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                      <Moon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[11px] leading-tight">
                        <strong>Perhatian Jam Dini Hari:</strong> Saat ini pukul {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Presensi masuk memerlukan konfirmasi khusus.
                      </span>
                    </div>
                  )}

                  {/* Status Ringkasan Hari Ini */}
                  <div className="bg-slate-50 dark:bg-[#121215] p-3.5 rounded-2xl border border-slate-200 dark:border-[#27272a] space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      Status Presensi Hari Ini ({currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}):
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-xl border ${
                        hasClockIn
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-400'
                      }`}>
                        <div className="text-[10px] font-bold uppercase">Presensi Masuk</div>
                        <div className="font-bold text-xs mt-0.5">
                          {hasClockIn ? `✅ ${activeEmpLogs?.clockInLog?.scan_time.slice(11, 16)} WIB` : 'Belum Masuk'}
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${
                        hasClockOut
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/50 text-blue-900 dark:text-blue-200'
                          : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-400'
                      }`}>
                        <div className="text-[10px] font-bold uppercase">Presensi Pulang</div>
                        <div className="font-bold text-xs mt-0.5">
                          {hasClockOut ? `✅ ${activeEmpLogs?.clockOutLog?.scan_time.slice(11, 16)} WIB` : 'Belum Pulang'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning if already completed both */}
                  {isBothCompleted && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-bold">Presensi Hari Ini Sudah Lengkap!</div>
                        <div className="text-[11px] opacity-90 mt-0.5">
                          Anda sudah tercatat Clock In dan Clock Out hari ini. Tidak perlu melakukan presensi lagi untuk mencegah duplikasi data.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selection Buttons for Clock In vs Clock Out */}
                  <div className={`space-y-3 pt-1 transition-opacity ${isSubmitting ? 'pointer-events-none' : ''}`}>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Silakan pilih jenis presensi Anda:
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* BUTTON 1: MASUK KERJA */}
                      <button
                        type="button"
                        disabled={hasClockIn || isSubmitting}
                        onClick={() => handleConfirmAttendance('clock_in')}
                        className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                          submittingType === 'clock_in'
                            ? 'border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/60 shadow-inner cursor-wait'
                            : isSubmitting
                            ? 'opacity-40 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                            : hasClockIn
                            ? 'opacity-45 bg-slate-100 dark:bg-[#27272a] border-slate-200 dark:border-slate-700 cursor-not-allowed text-slate-500'
                            : 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/70 hover:scale-[1.02] shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            submittingType === 'clock_in'
                              ? 'bg-emerald-600 text-white'
                              : hasClockIn
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {submittingType === 'clock_in' ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <LogIn className="w-5 h-5" />
                            )}
                          </div>
                          {hasClockIn && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                              Sudah Masuk
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
                            MASUK KERJA
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {submittingType === 'clock_in'
                              ? 'Menyimpan ke sistem...'
                              : hasClockIn
                              ? 'Sudah tercatat (Cegah 2x)'
                              : 'Clock In Masuk Shift'}
                          </div>
                        </div>
                      </button>

                      {/* BUTTON 2: PULANG KERJA */}
                      <button
                        type="button"
                        disabled={hasClockOut || isSubmitting}
                        onClick={() => handleConfirmAttendance('clock_out')}
                        className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                          submittingType === 'clock_out'
                            ? 'border-blue-500 bg-blue-100/70 dark:bg-blue-950/60 shadow-inner cursor-wait'
                            : isSubmitting
                            ? 'opacity-40 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                            : hasClockOut
                            ? 'opacity-45 bg-slate-100 dark:bg-[#27272a] border-slate-200 dark:border-slate-700 cursor-not-allowed text-slate-500'
                            : 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 hover:bg-blue-100/70 hover:scale-[1.02] shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            submittingType === 'clock_out'
                              ? 'bg-blue-600 text-white'
                              : hasClockOut
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {submittingType === 'clock_out' ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <LogOut className="w-5 h-5" />
                            )}
                          </div>
                          {hasClockOut ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                              Sudah Pulang
                            </span>
                          ) : !hasClockIn ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              Belum Clock In
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <div className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
                            PULANG KERJA
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {submittingType === 'clock_out'
                              ? 'Menyimpan ke sistem...'
                              : hasClockOut
                              ? 'Sudah tercatat (Cegah 2x)'
                              : !hasClockIn
                              ? 'Clock Out (Tanpa Clock In)'
                              : 'Clock Out Selesai Shift'}
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Safety Notice preventing human error */}
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center italic pt-1">
                      * Sistem secara otomatis mencegah kesalahan karyawan melakukan Clock In atau Clock Out lebih dari 1x dalam satu hari kerja.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* POPUP KONFIRMASI JAM DINI HARI */}
      {showEarlyMorningModal && activeEmployee && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl border-2 border-amber-500/50 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
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
                  Peringatan Waktu Presensi Masuk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeEmployee.full_name} ({activeEmployee.nip})
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowEarlyMorningModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Waktu Saat Ini:
                  </span>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-black">
                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Sistem mendeteksi Anda melakukan <strong>Presensi Masuk pada jam dini hari</strong> (di luar jendela kerja reguler kantor normal 08:00 - 17:00 WIB).
                </p>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Apakah Anda yakin ingin melanjutkan Presensi Masuk sekarang?
                </div>
              </div>

              {/* Pilihan Alasan Presensi Dini Hari */}
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
                      onClick={() => setEarlyMorningReason(option)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        earlyMorningReason === option
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <span>{option}</span>
                      {earlyMorningReason === option && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {earlyMorningReason === 'Lainnya (Tuliskan keterangan)' && (
                  <input
                    type="text"
                    placeholder="Contoh: Pengawasan instalasi batching plant subuh..."
                    value={earlyMorningCustomReason}
                    onChange={(e) => setEarlyMorningCustomReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#121215] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              {/* Buttons: Batal & Konfirmasi */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowEarlyMorningModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const finalReason =
                      earlyMorningReason === 'Lainnya (Tuliskan keterangan)' && earlyMorningCustomReason.trim()
                        ? earlyMorningCustomReason.trim()
                        : earlyMorningReason;
                    handleConfirmAttendance('clock_in', true, finalReason);
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
