import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Printer,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Users,
  Calendar,
  Clock,
  FileCheck2,
  Banknote,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  KeyRound,
  Calculator,
  Workflow,
  ArrowRight,
  QrCode,
  Sparkles,
  Layers,
  Activity,
  Check,
  HelpCircle,
  MoveHorizontal,
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';
import { getContrastTextColorStyle } from '../lib/companyUtils';

interface ManualOperationViewProps {
  accentColor: string;
  companyName?: string;
  onNavigate?: (tab: ActiveTab) => void;
  currentUserRole?: string;
}

interface SopSection {
  id: string;
  category: 'kiosk' | 'sdm' | 'schedules' | 'requests' | 'payroll' | 'db_config' | 'rbac' | 'fresh_db';
  stepNumber: number;
  title: string;
  subtitle: string;
  targetTab?: ActiveTab;
  targetTabName?: string;
  badge: string;
  badgeColor: string;
  description: string;
  checklist: string[];
  formulaNotes?: string[];
  importantNotice?: string;
}

export const ManualOperationView: React.FC<ManualOperationViewProps> = ({
  accentColor,
  companyName = 'PT. NINDYA KRIDA UTAMA',
  onNavigate,
  currentUserRole = 'super_admin',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [activeFlowStep, setActiveFlowStep] = useState<number | null>(null);

  // Mouse Drag to Scroll State for Category Bar (Pict 1 Fix)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleScrollLeftButton = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRightButton = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  // Defined Operational Flow Steps for visual diagram
  const appFlowSteps = [
    {
      step: 1,
      title: 'Master Data & Akses User',
      actor: 'Super Admin / HR Admin',
      actorBadge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: Users,
      tab: 'sdm' as ActiveTab,
      description: 'Input Divisi, Jabatan, Karyawan, dan akun user (Google Auth / Password). Cetak ID Card bertanda QR Code.',
      details: [
        'Atur Master Divisi & Golongan Jabatan',
        'Input Data Karyawan, NIP, & Foto Profil',
        'Atur Akun User & Hak Akses (RBAC)',
        'Cetak Kartu ID Card QR Code Karyawan',
      ],
    },
    {
      step: 2,
      title: 'Jadwal Shift & Kalender Kerja',
      actor: 'HR Admin',
      actorBadge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      icon: Calendar,
      tab: 'schedules' as ActiveTab,
      description: 'Atur template jam kerja shift (pagi, malam, kantor) & batas toleransi terlambat. Plotting jadwal ke divisi.',
      details: [
        'Buat Template Jam Shift & Toleransi (15m)',
        'Plotting Jadwal Shift ke Karyawan / Divisi',
        'Sinkron Kalender Libur Nasional Live',
        'Sistem Otomatis Hitung Hari Kerja Efektif',
      ],
    },
    {
      step: 3,
      title: 'Presensi Kiosk & SPKL Lembur',
      actor: 'Karyawan & Manager',
      actorBadge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      icon: Clock,
      tab: 'kiosk' as ActiveTab,
      description: 'Presensi Kiosk (Scan QR / NIP touch-screen). Sidebar otomatis tersembunyi. Pengajuan Cuti & SPKL Lembur diapprove.',
      details: [
        'Clock In / Out Kiosk via QR Code atau Input NIP (NKU-xxxx)',
        'Mode Terminal Kiosk Otomatis Sembunyikan Sidebar',
        'Suara Konfirmasi & Penanda Terlambat Realtime',
        'Manager Menyetujui Cuti & SPKL Lembur Proyek',
      ],
    },
    {
      step: 4,
      title: 'Kalkulasi Payroll & Sync MySQL',
      actor: 'Payroll Admin & Admin',
      actorBadge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: Banknote,
      tab: 'payroll' as ActiveTab,
      description: 'Hitung otomatis Gaji = Upah Hadir + Lembur SPKL - Denda Terlambat. Cetak Slip Gaji A4/Excel & Sync 27 Tabel MySQL.',
      details: [
        'Hitung Otomatis Upah Pokok, Lembur SPKL, & Potongan',
        'Cetak Slip Gaji Resmi A4 / PDF & Ekspor Excel',
        'Syncron 27 Tabel Database ke MySQL Live',
        'Audit Log & Rekapitulasi Laporan Keuangan',
      ],
    },
  ];

  // Structured comprehensive operational guides
  const sopSections: SopSection[] = useMemo(
    () => [
      {
        id: 'sop-fresh-db',
        category: 'fresh_db',
        stepNumber: 0,
        title: 'Panduan Inisialisasi Pertama Kali (Saat Database Kosong / Hanya Ada Super Admin)',
        subtitle: 'Prosedur Langkah demi Langkah Menyiapkan Sistem dari Kondisi Nol (Zero-State)',
        targetTab: 'db_config',
        targetTabName: 'Buka Setup Database',
        badge: 'Setup Awal DB Kosong',
        badgeColor: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
        description:
          'Panduan ini digunakan ketika sistem baru dipasang atau seluruh database dalam kondisi bersih/kosong di mana hanya akun bawaan Super Admin yang aktif. Ikuti urutan langkah di bawah ini untuk mengonfigurasi master data perusahaan dari awal hingga siap dipakai operasional.',
        checklist: [
          'Langkah 1 (Login Pertama Super Admin): Masuk ke sistem menggunakan akun bawaan username "superadmin". Akun ini memiliki hak akses tertinggi tanpa batasan.',
          'Langkah 2 (Koneksi & Sinkronisasi MySQL): Buka modul "System DB Config". Masukkan kredensial host, port, username, password MySQL 8 Remote Anda, lalu klik "Simpan & Tes Koneksi". Jalankan fungsi "Sync 27 Tabel" agar skema tabel terbuat dan tersinkronisasi secara penuh di cloud.',
          'Langkah 3 (Input Profil Perusahaan): Atur Nama Perusahaan (misal PT. Nindya Krida Utama), Alamat Kantor, Logo Resmi, dan Warna Aksen UI.',
          'Langkah 4 (Input Master Divisi & Jabatan): Buka modul "Master SDM", pilih tab "Divisi & Golongan Jabatan". Tambahkan divisi operasional (contoh: HRD, Operasional Batching Plant, Logistik, Keuangan) serta tingkatan jabatan.',
          'Langkah 5 (Registrasi Karyawan & Akun User): Buka modul "Master SDM", tambahkan data pegawai lengkap (NIP unik, Nama, Base Salary per jam, Foto Profil). Kemudian buatkan akun user login (metode Google Auth atau Password Khusus) dan tentukan Peran RBAC (HR Admin, Payroll Admin, Manager Divisi, atau Karyawan).',
          'Langkah 6 (Template Shift Kerja & Plotting): Buka modul "Jadwal Kerja", buat template jam shift (Pagi 08:00-17:00, Malam, Kantor) beserta toleransi terlambat (default 15 menit), lalu terapkan plotting jadwal ke divisi/karyawan.',
          'Langkah 7 (Setup Kiosk Presensi & Cetak ID Card): Cetak Kartu ID Card QR Code untuk masing-masing karyawan dari modul Master SDM. Kemudian buka modul "Terminal Kiosk" pada tablet/layar sentuh presensi lapangan.',
        ],
        importantNotice:
          'PENTING: Pastikan Langkah 2 (Sinkronisasi Database MySQL) telah berhasil dijalankan sebelum menginput data staf dalam jumlah banyak agar 27 tabel tersimpan permanen di cloud MySQL server.',
      },
      {
        id: 'sop-fresh-db-guide',
        category: 'fresh_db',
        stepNumber: 1,
        title: 'Petunjuk Inisialisasi Saat Database Masih Kosong',
        subtitle: 'Prosedur Awal Sistem Baru / Database Kosong (Hanya Super Admin yang Ada)',
        targetTab: 'sdm',
        targetTabName: 'Buka Master SDM / User',
        badge: 'Inisialisasi Awal',
        badgeColor: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
        description:
          'Saat aplikasi baru pertama kali dijalankan atau setelah database di-wipe clean (kosong), hanya 1 akun utama yaitu Super Admin (superadmin / admin@nku.co.id) yang tersedia aktif di sistem. Pengguna tidak perlu panik, ikuti langkah berurutan di bawah ini untuk menginisialisasi master data perusahaan dari awal:',
        checklist: [
          'Login Akun Super Admin: Masuk ke sistem menggunakan akun superadmin utama (satu-satunya akun yang tersedia saat DB kosong).',
          'Pengaturan Perusahaan: Buka menu App Config atau DB Config, lalu lengkapi Nama Perusahaan, Alamat, Email, dan Logo resmi.',
          'Input Master Divisi & Golongan Jabatan: Buat divisi kerja (misal: Operasional, Produksi, HRD) dan tingkat golongan jabatan.',
          'Registrasi Karyawan Pertama: Tambahkan data karyawan lengkap dengan NIP unik, nama, posisi, upah dasar per jam (base salary), dan foto.',
          'Daftarkan Akun User Manajemen: Tambahkan akun user baru (HR Admin, Payroll Admin, Manager Divisi) dan hubungkan dengan ID Karyawan.',
          'Aktifkan Terminal Kiosk: Buka menu Kiosk Presensi untuk mulai menerima pencatatan kehadiran karyawan di lokasi kerja.',
        ],
        importantNotice:
          'Akun Super Admin dirancang secara permanen dan tidak akan pernah terhapus dari sistem meskipun seluruh data operasional di-wipe untuk serah terima proyek.',
      },
      {
        id: 'sop-kiosk',
        category: 'kiosk',
        stepNumber: 2,
        title: 'Presensi Lapangan & Terminal Kiosk',
        subtitle: 'Pencatatan Kehadiran Mandiri Karyawan di Kiosk Touch-Screen',
        targetTab: 'kiosk',
        targetTabName: 'Buka Terminal Kiosk',
        badge: 'Operasional Kiosk',
        badgeColor: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
        description:
          'Pencatatan jam datang (Clock In) dan jam pulang (Clock Out) dilakukan melalui terminal touch-screen kiosk. Khusus akun dedicated Kiosk Device, Sidebar Navigasi otomatis disembunyikan. Untuk Admin / Super Admin yang membuka menu Kiosk, Sidebar tetap tampil agar navigasi menu aplikasi tetap dapat diakses dengan mudah.',
        checklist: [
          'Scan QR Code: Arahkan QR Code dari Kartu ID Card fisik atau HP karyawan ke kamera scanner kiosk.',
          'Input NIP Manual: Tekan tombol "Input NIP Manual" pada layar sentuh, lalu masukkan angka NIP dengan prefix otomatis "NKU-".',
          'Toleransi Keterlambatan: Scan presensi setelah batas toleransi (default 15 menit dari jadwal shift) otomatis ditandai status TERLAMBAT.',
          'Umpan Balik Suara (Audio Chime): Sistem membunyikan nada konfirmasi audio dan menyapa nama karyawan secara otomatis.',
          'Sidebar Navigasi: Tetap tampil untuk pengguna Admin/Super Admin, dan disembunyikan otomatis hanya pada akun dedicated Kiosk Device.',
        ],
        importantNotice:
          'Mode Kiosk didesain untuk pencatatan kehadiran mandiri. Pengguna Admin/HR/Manager yang mengklik menu Kiosk tetap dapat melihat sidebar untuk berpindah modul kapan saja.',
      },
      {
        id: 'sop-sdm',
        category: 'sdm',
        stepNumber: 3,
        title: 'Manajemen Data Master SDM, User & ID Card',
        subtitle: 'Pengelolaan Karyawan, Divisi, Akun User, dan Cetak Kartu Identitas',
        targetTab: 'sdm',
        targetTabName: 'Buka Master SDM',
        badge: 'Master Data SDM',
        badgeColor: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
        description:
          'Mengelola seluruh data dasar perusahaan: divisi operasional, tingkat jabatan, profil karyawan lengkap, akun user login (Google Auth / Password), serta pencetakan Kartu ID Card ber-QR Code.',
        checklist: [
          'Master Divisi: Atur struktur unit kerja (Operasional Batching Plant, Quality Control, Logistik Truk Mixer, HRD & Keuangan).',
          'Master Golongan Jabatan: Buat tingkatan golongan kerja (Staff, Supervisor, Operator, Driver Mixer, Teknisi Laboratorium).',
          'Data Karyawan Lengkap: Masukkan NIP unik, nama lengkap, kontak resmi, upah dasar per jam (base salary), serta foto profil.',
          'Manajemen Akun User: Daftarkan akun user dengan metode login Google Auth (SSO) atau Password Khusus.',
          'Cetak Kartu ID Card: Hasilkan kartu identitas siap cetak ukuran standar lengkap dengan QR Code presensi dan logo perusahaan.',
        ],
      },
      {
        id: 'sop-schedules',
        category: 'schedules',
        stepNumber: 4,
        title: 'Jadwal Kerja, Shift & Kalender Libur Nasional',
        subtitle: 'Pengaturan Jam Shift Operasional & Plotting Jadwal',
        targetTab: 'schedules',
        targetTabName: 'Buka Jadwal Kerja',
        badge: 'Shift & Roster',
        badgeColor: 'border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
        description:
          'Mengatur jam shift kerja operasional 24 jam (pagi, malam, atau kantor) lengkap dengan batas toleransi menit keterlambatan dan sinkronisasi kalender hari libur nasional.',
        checklist: [
          'Template Jam Shift: Tentukan Jam Masuk, Jam Pulang, dan Toleransi Keterlambatan (misal Shift Pagi 08:00 - 17:00 dengan toleransi 15 menit).',
          'Plotting Jadwal: Terapkan template shift ke seluruh divisi atau karyawan tertentu untuk periode mingguan/bulanan.',
          'Kalender Libur Nasional & Cuti Bersama: Sinkronisasi otomatis tanggal merah resmi Indonesia secara live.',
          'Pengecualian Keterlambatan: Hari libur resmi otomatis dikecualikan dari pemotongan denda atau perhitungan terlambat.',
        ],
      },
      {
        id: 'sop-requests',
        category: 'requests',
        stepNumber: 5,
        title: 'Pengajuan Cuti, Izin Sakit & SPKL Lembur',
        subtitle: 'Persetujuan (Approval) Bertingkat untuk Permohonan Staf',
        targetTab: 'requests',
        targetTabName: 'Buka Requests & SPKL',
        badge: 'Approval Workflow',
        badgeColor: 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
        description:
          'Fasilitas pengajuan permohonan dispensasi kerja, izin sakit, dan Surat Perintah Kerja Lembur (SPKL) dengan alur persetujuan cepat oleh Manager atau HR Admin.',
        checklist: [
          'Pengajuan Cuti: Karyawan mengajukan cuti tahunan, melahirkan, atau izin khusus melalui form dengan pemilih tanggal.',
          'Izin Sakit: Pencatatan izin sakit dilengkapi dengan catatan atau nomor surat keterangan dokter resmi.',
          'Surat Perintah Kerja Lembur (SPKL): Diterbitkan oleh Atasan / Manager untuk penugasan lembur operasional atau pekerjaan cor malam.',
          'Status Approval Satu-Klik: Atasan meninjau detail pengajuan dan memberikan keputusan Setuju (Approve) atau Tolak (Reject).',
        ],
        importantNotice:
          'Hanya penugasan SPKL Lembur berstatus "APPROVED" yang akan masuk ke dalam kalkulasi upah lembur pada saat perhitungan payroll.',
      },
      {
        id: 'sop-payroll',
        category: 'payroll',
        stepNumber: 6,
        title: 'Kalkulasi Penggajian, Formula Dinamis & Slip Gaji',
        subtitle: 'Perhitungan Gaji Otomatis Berdasarkan Kehadiran & Lembur Valid',
        targetTab: 'payroll',
        targetTabName: 'Buka Penggajian & Slip',
        badge: 'Payroll Engine',
        badgeColor: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
        description:
          'Engine penggajian memproses jam hadir riil, lembur SPKL yang telah disetujui, serta denda keterlambatan secara otomatis menggunakan formula kalkulasi aman.',
        checklist: [
          'Periode Cut-Off: Tentukan rentang tanggal penggajian (misalnya bulanan atau dua mingguan).',
          'Kalkulasi Lembur (Overtime Rules): Menghitung pengali upah lembur (1.5x jam pertama, 2.0x jam berikutnya / hari libur).',
          'Potongan Denda (Deduction Rules): Denda keterlambatan dipotong otomatis berdasarkan durasi atau insiden terlambat.',
          'Tunjangan (Allowance Rules): Perhitungan tunjangan makan, transport, dan insentif keselamatan kerja (K3).',
          'Cetak Slip Gaji & Excel: Cetak slip gaji format A4 / PDF dan ekspor rekapitulasi penggajian lengkap ke berkas Microsoft Excel (.xlsx).',
        ],
        formulaNotes: [
          'Gaji Bersih (Take Home Pay) = Upah Pokok + Upah Lembur SPKL + Total Tunjangan - Total Potongan',
          'Upah Pokok = Total Jam Hadir Riil x Upah Dasar per Jam (Base Salary)',
          'Upah Lembur = Jam SPKL Approved x Upah Dasar x Pengali (1.5x / 2.0x)',
          'Potongan = (Total Menit Terlambat x Denda per Menit) + Potongan Lainnya',
        ],
      },
      {
        id: 'sop-db',
        category: 'db_config',
        stepNumber: 7,
        title: 'Koneksi Database Cloud MySQL 8 & Sinkron 27 Tabel',
        subtitle: 'Penyimpanan Data Terpusat, Table Explorer & Sync Automatic Fallback',
        targetTab: 'db_config',
        targetTabName: 'Buka Konfigurasi Database',
        badge: 'Cloud Database',
        badgeColor: 'border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40',
        description:
          'Penyimpanan terpusat menggunakan server MySQL 8 Cloud dengan koneksi aman SSL. Mendukung sinkronisasi penuh ke 27 tabel database dengan penanganan otomatis kolom NOT NULL.',
        checklist: [
          'Konfigurasi MySQL: Pengaturan Host, Port, Username, Password, dan nama Database MySQL 8 Remote.',
          'Koneksi SSL / TLS: Mendukung pengunggahan sertifikat SSL CA Certificate untuk keamanan data level enterprise.',
          'Penjelajah Tabel (Table Explorer): Peninjauan 27 tabel database lengkap dengan pencarian, penambahan baris data (CRUD), dan kueri SQL.',
          'Syncron Tabel 1-Klik: Sinkronisasi data aplikasi ke MySQL tanpa risiko error default value (termasuk penanganan otomatis field password_hash).',
        ],
      },
      {
        id: 'sop-rbac',
        category: 'rbac',
        stepNumber: 8,
        title: 'Hak Akses & Keamanan Sistem (RBAC 6 Peran)',
        subtitle: 'Penjelasan Lengkap RBAC (Role-Based Access Control) & Matriks Akses Peran',
        badge: 'Keamanan RBAC',
        badgeColor: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
        description:
          'Apa itu RBAC (Role-Based Access Control)? RBAC adalah metode kontrol keamanan di mana hak akses dan fitur aplikasi dibatasi secara otomatis berdasarkan Peran (Role) yang dimiliki oleh pengguna. Dengan RBAC, karyawan biasa tidak bisa membuka menu penggajian/gaji karyawan lain, dan perangkat Terminal Kiosk hanya bisa mencatat absensi tanpa bisa mengakses menu administrasi.',
        checklist: [
          'Super Admin: Akses penuh tanpa batas ke seluruh modul, konfigurasi MySQL, eksekusi kueri SQL, dan pengaturan perusahaan.',
          'HR Admin: Mengelola Master SDM, Jadwal Kerja Shift, Laporan Presensi, Approval Cuti/Izin, dan Cetak ID Card.',
          'Payroll Admin: Mengelola aturan lembur/potongan, menghitung penggajian, mencetak slip gaji, dan ekspor rekapitulasi Excel.',
          'Manager Divisi: Meninjau kehadiran tim bawahan, menyetujui Cuti dan SPKL Lembur operasional.',
          'Employee (Karyawan): Akses dashboard mandiri untuk melihat jadwal shift, riwayat absensi, dan pengajuan izin.',
          'Kiosk Device: Perangkat khusus presensi lapangan touch-screen tanpa akses ke data administrasi (sidebar otomatis tersembunyi).',
        ],
      },
    ],
    []
  );

  // Filter sections
  const filteredSections = useMemo(() => {
    return sopSections.filter((sec) => {
      const matchCategory = selectedCategory === 'all' || sec.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        sec.title.toLowerCase().includes(q) ||
        sec.subtitle.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q) ||
        sec.checklist.some((item) => item.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [sopSections, selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'Semua Panduan', icon: BookOpen },
    { id: 'fresh_db', label: 'Inisialisasi DB Kosong', icon: Sparkles },
    { id: 'kiosk', label: 'Terminal Kiosk', icon: Clock },
    { id: 'sdm', label: 'Master SDM & User', icon: Users },
    { id: 'schedules', label: 'Jadwal & Shift', icon: Calendar },
    { id: 'requests', label: 'Cuti & SPKL', icon: FileCheck2 },
    { id: 'payroll', label: 'Payroll & Slip', icon: Banknote },
    { id: 'db_config', label: 'Database MySQL', icon: Database },
    { id: 'rbac', label: 'Hak Akses (RBAC)', icon: KeyRound },
  ];

  const handlePrintSop = () => {
    setShowPrintModal(true);
  };

  const handleExecutePrint = () => {
    window.print();
  };

  return (
    <div id="manual-operation-view" className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs relative overflow-hidden">
        {/* Glow accent */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-50 dark:bg-sky-950/40 border border-sky-500/20 text-sky-600 dark:text-sky-300">
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              Panduan Pengoperasian (Manual Operation)
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Panduan Operasional & Alur Kerja Aplikasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Buku panduan pengoperasian sistem HRIS, presensi Kiosk lapangan, penggajian payroll, dan sinkronisasi 27 tabel database MySQL untuk <span className="font-bold text-slate-800 dark:text-slate-200">{companyName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-print-sop-preview"
              type="button"
              onClick={handlePrintSop}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
            >
              <Printer className="w-4 h-4" />
              Pratinjau & Cetak Dokumen SOP
            </button>
          </div>
        </div>

        {/* Quick Highlights Metric Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-[#27272a]">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Akurasi Presensi</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">QR & NIP Touch</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tingkat Akses</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">6 Peran RBAC</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Toleransi Scan</div>
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">15 Menit</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Sinkronisasi Database</div>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">27 Tabel MySQL</div>
          </div>
        </div>
      </div>

      {/* RBAC EXPLANATION CARD (Penjelasan Apa Itu RBAC) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-50 to-amber-500/5 dark:from-amber-950/30 dark:via-[#121215] dark:to-amber-900/10 border border-amber-500/30 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Apa itu RBAC (Role-Based Access Control)?
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                Sistem Keamanan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-sans">
              Pengertian singkat dan pembagian wewenang pengguna dalam aplikasi HR Services Portal.
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans pl-1">
          <strong className="underline decoration-amber-500 decoration-2 underline-offset-4 font-bold text-slate-900 dark:text-white">RBAC (Role-Based Access Control)</strong> adalah metode pengaturan hak akses pengguna berbasis <strong className="underline decoration-amber-500 decoration-2 underline-offset-4 font-bold">Peran (Role)</strong>. Alih-alih mengkonfigurasi hak akses satu per satu, sistem mengelompokkan izin ke dalam 6 Peran Utama yaitu: <span className="font-bold text-amber-600 dark:text-amber-400">Super Admin</span> (Akses Penuh), <span className="font-bold text-blue-600 dark:text-blue-400">HR Admin</span> (Master SDM & Jadwal), <span className="font-bold text-emerald-600 dark:text-emerald-400">Payroll Admin</span> (Gaji & Slip), <span className="font-bold text-purple-600 dark:text-purple-400">Manager Divisi</span> (Approval Cuti & SPKL), <span className="font-bold text-sky-600 dark:text-sky-400">Employee</span> (Dashboard Mandiri), dan <span className="font-bold text-rose-600 dark:text-rose-400">Kiosk Device</span> (Perangkat Presensi Field).
        </p>
      </div>

      {/* VISUAL OPERATIONAL FLOW CHART DIAGRAM (Bagan Alur Pengoperasian Terkini) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Bagan Alur Pengoperasian Utama Aplikasi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Visualisasi urutan tahapan kerja dari pengaturan awal hingga penggajian & sinkronisasi database.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-[#18181b] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#27272a] self-start sm:self-auto">
            4 Langkah Alur Utama
          </span>
        </div>

        {/* Visual Diagram Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {appFlowSteps.map((s) => {
            const Icon = s.icon;
            const isSelected = activeFlowStep === s.step;
            return (
              <div
                key={s.step}
                onClick={() => {
                  setActiveFlowStep(s.step);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-amber-500/5 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-50/70 dark:bg-[#18181b]/70 border-slate-200/80 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-[#3f3f46]'
                }`}
              >
                {/* Step badge & icon */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shadow-xs">
                      {s.step}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${s.actorBadge}`}>
                      {s.actor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-tight">
                      {s.title}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans mb-3">
                    {s.description}
                  </p>
                </div>

                {/* Sub-steps Checklist inside Diagram Card */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-[#27272a] space-y-1">
                  {s.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-700 dark:text-slate-300 font-sans">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>

                {/* Navigation Button */}
                {onNavigate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(s.tab);
                    }}
                    className="w-full mt-2 py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 hover:text-amber-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Buka Modul</span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Filter Tabs & Search Bar (With Mouse Drag Scroll Fix - Pict 1) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills with Drag-to-Scroll Support */}
        <div className="relative flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleScrollLeftButton}
            className="p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors shadow-xs hidden sm:flex items-center justify-center shrink-0 cursor-pointer"
            title="Geser Kiri"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 max-w-full scrollbar-none select-none cursor-grab active:cursor-grabbing transition-all ${
              isMouseDown ? 'cursor-grabbing' : ''
            }`}
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'shadow-xs font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-[#18181b]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }
                      : {}
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleScrollRightButton}
            className="p-2 rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors shadow-xs hidden sm:flex items-center justify-center shrink-0 cursor-pointer"
            title="Geser Kanan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari topik panduan (cth: kiosk, db kosong, rbac)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#121215] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Guide Content Sections List */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-300 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Topik Panduan Tidak Ditemukan</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tidak ada panduan operasional yang cocok dengan kata kunci "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#18181b] text-slate-800 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <div
              key={sec.id}
              className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] shadow-xs space-y-4 transition-all hover:border-slate-300 dark:hover:border-[#3f3f46]"
            >
              {/* Header card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#27272a]">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-[#18181b] border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                    {sec.stepNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {sec.title}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${sec.badgeColor}`}>
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 font-sans">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>

                {/* Direct Action Navigation Button if targetTab exists */}
                {sec.targetTab && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(sec.targetTab!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#18181b] dark:hover:bg-[#27272a] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#27272a] transition-all shrink-0 self-start sm:self-center cursor-pointer"
                    title={`Buka modul ${sec.title}`}
                  >
                    <span>{sec.targetTabName || 'Buka Modul'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                )}
              </div>

              {/* Description Body */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                {sec.description}
              </p>

              {/* Checklist / Step-by-Step bullets with Underlined Titles */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Langkah & Petunjuk Praktis:
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {sec.checklist.map((item, idx) => {
                    const splitIdx = item.indexOf(':');
                    if (splitIdx !== -1) {
                      const titlePart = item.slice(0, splitIdx + 1);
                      const restPart = item.slice(splitIdx + 1);
                      return (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>
                            <strong className="underline decoration-amber-500/60 decoration-2 underline-offset-4 text-slate-900 dark:text-white font-bold mr-1">
                              {titlePart}
                            </strong>
                            {restPart}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="underline decoration-amber-500/60 decoration-2 underline-offset-4">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formula block if exists */}
              {sec.formulaNotes && sec.formulaNotes.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-1.5 border border-slate-700">
                  <div className="text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    Rumus Kalkulasi Otomatis Sistem:
                  </div>
                  {sec.formulaNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className={idx === 0 ? 'font-bold text-emerald-300 pb-1 border-b border-slate-700' : 'text-slate-300 text-[11px] pl-2'}
                    >
                      {note}
                    </div>
                  ))}
                </div>
              )}

              {/* Notice Banner if exists */}
              {sec.importantNotice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{sec.importantNotice}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* IN-APP PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Dokumen Prosedur Standar (Manual Operation)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {companyName} - Siap Dicetak & Disimpan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content Preview Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 font-sans text-xs sm:text-sm leading-relaxed">
              {/* Official Document Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-800 dark:border-slate-300">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{companyName}</h2>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 mt-0.5">
                  BUKU PETUNJUK KERJA & STANDAR OPERASIONAL (MANUAL OPERATION)
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  Sistem Informasi Manajemen SDM, Presensi Kiosk, Penggajian Payroll, dan Database Cloud MySQL
                </p>
              </div>

              {/* Sections summary for paper document */}
              <div className="space-y-4">
                {sopSections.map((sec) => (
                  <div key={sec.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272a] space-y-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{sec.stepNumber}. {sec.title}</span>
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">{sec.badge}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{sec.description}</p>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-1 pl-1">
                      {sec.checklist.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#18181b] rounded-xl text-center text-slate-600 dark:text-slate-300 text-[11px]">
                Dokumen resmi operasional {companyName}. Diterbitkan secara digital oleh Sistem HR Cloud.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-[#18181b]/50">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#27272a] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18181b] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleExecutePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: accentColor, color: getContrastTextColorStyle(accentColor) }}
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen Sekarang (Ctrl + P)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
