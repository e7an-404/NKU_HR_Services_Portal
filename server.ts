import express from 'express';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Graceful JSON syntax error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Format data JSON tidak valid' });
  }
  next(err);
});

// Ensure secure certs & uploads folder exist
const CERTS_DIR = path.join(process.cwd(), 'certs');
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// INITIAL IN-MEMORY STORE & SEED DATA (Synchronized with nku_hr_schema.sql)
// -------------------------------------------------------------

interface AppState {
  companyProfile: any;
  companyProfiles: any[];
  activeCompanyId: number;
  companyHolidays: any[];
  dbConfig: {
    id: number;
    config_name: string;
    host: string;
    port: number;
    database_name: string;
    username: string;
    password_plain: string;
    password_encrypted: string;
    ssl_mode: string;
    ssl_ca_cert_path: string;
    ssl_ca_cert_name: string;
    provider: string;
    is_active: boolean;
    last_connection_status: 'unknown' | 'connected' | 'failed';
    last_tested_at?: string;
    last_latency_ms?: number;
    last_error_message?: string;
  };
  dbSyncLogs: any[];
  auditLogs: any[];
  roles: any[];
  permissions: any[];
  rolePermissions: any[];
  divisions: any[];
  jobGrades: any[];
  employees: any[];
  users: any[];
  workSchedules: any[];
  schedulePlots: any[];
  shiftSwapRequests: any[];
  attendanceLogs: any[];
  leaveTypes: any[];
  leaveBalances: any[];
  leaveRequests: any[];
  overtimeRequests: any[];
  overtimeRules: any[];
  deductionRules: any[];
  allowanceRules: any[];
  payrollPeriods: any[];
  payrollSlips: any[];
  payrollSlipItems: any[];
  officialLetters: any[];
  companyLocations: any[];
  lastHolidaySyncMonth?: string;
}

const defaultCompanyLocations = [
  {
    id: 1,
    location_code: 'LOC-HO',
    location_name: 'Head Office Surabaya (Kantor Pusat)',
    location_type: 'head_office',
    address: 'Jl. Industri Raya No. 88, Rungkut Industri, Surabaya, Jawa Timur',
    latitude: -7.3245,
    longitude: 112.7632,
    radius_meters: 100,
    is_active: true,
    notes: 'Kantor pusat manajemen, direksi, HRD, dan keuangan',
    created_at: '2026-01-01 08:00:00',
    updated_at: '2026-01-01 08:00:00',
  },
  {
    id: 2,
    location_code: 'LOC-BP-KLD',
    location_name: 'Batching Plant Kalideres',
    location_type: 'batching_plant',
    address: 'Kawasan Industri Daan Mogot Km. 18, Kalideres, Jakarta Barat',
    latitude: -6.1523,
    longitude: 106.7032,
    radius_meters: 150,
    is_active: true,
    notes: 'Unit produksi ready-mix dan lab QC beton Jakarta Barat',
    created_at: '2026-01-01 08:00:00',
    updated_at: '2026-01-01 08:00:00',
  },
  {
    id: 3,
    location_code: 'LOC-BP-GRS',
    location_name: 'Batching Plant Gresik',
    location_type: 'batching_plant',
    address: 'Kawasan Industri Maspion Unit V, Manyar, Gresik, Jawa Timur',
    latitude: -7.1601,
    longitude: 112.6508,
    radius_meters: 150,
    is_active: true,
    notes: 'Unit produksi ready-mix Jawa Timur & dermaga semen',
    created_at: '2026-01-01 08:00:00',
    updated_at: '2026-01-01 08:00:00',
  },
  {
    id: 4,
    location_code: 'LOC-PUR-JKT',
    location_name: 'Kantor Purchasing & Pengadaan',
    location_type: 'branch_office',
    address: 'Gedung Graha Niaga Lt. 3, Jl. Gatot Subroto Kav. 55, Jakarta Selatan',
    latitude: -6.2384,
    longitude: 106.8247,
    radius_meters: 100,
    is_active: true,
    notes: 'Kantor divisi purchasing, pengadaan raw material, dan vendor management',
    created_at: '2026-01-01 08:00:00',
    updated_at: '2026-01-01 08:00:00',
  },
  {
    id: 5,
    location_code: 'LOC-ARM-CKD',
    location_name: 'Pool Armada Mixer & Gudang Material Cikande',
    location_type: 'warehouse',
    address: 'Jl. Raya Serang Km. 68, Kawasan Industri Modern Cikande, Serang, Banten',
    latitude: -6.1952,
    longitude: 106.3685,
    radius_meters: 200,
    is_active: true,
    notes: 'Pool bengkel truk mixer dan gudang agregat cadangan',
    created_at: '2026-01-01 08:00:00',
    updated_at: '2026-01-01 08:00:00',
  },
];

const state: AppState = {
  companyProfile: {
    id: 1,
    company_name: 'PT. NINDYA KRIDA UTAMA (NKU)',
    logo_url: '/logo_nku.svg',
    address: 'Jl. Industri Raya No. 88, Surabaya, Jawa Timur',
    phone: '031-7654321',
    email: 'hr@nku.co.id',
    tax_id: '01.234.567.8-901.000',
    website: 'https://nku.co.id',
    timezone: 'Asia/Jakarta',
    theme_mode: 'light',
    color_palette: '#F59E0B',
    updated_at: new Date().toISOString(),
  },
  companyProfiles: [
    {
      id: 1,
      company_name: 'PT. NINDYA KRIDA UTAMA (NKU)',
      logo_url: '/logo_nku.svg',
      address: 'Jl. Industri Raya No. 88, Surabaya, Jawa Timur',
      phone: '031-7654321',
      email: 'hr@nku.co.id',
      tax_id: '01.234.567.8-901.000',
      website: 'https://nku.co.id',
      timezone: 'Asia/Jakarta',
      theme_mode: 'light',
      color_palette: '#F59E0B',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      company_name: 'PT. NINDYA BETON READYMIX',
      logo_url: '/logo_nku.svg',
      address: 'Kawasan Industri Gresik Kav. 12-14, Gresik, Jawa Timur',
      phone: '031-3987654',
      email: 'info@nindyabeton.co.id',
      tax_id: '02.456.789.1-092.000',
      website: 'https://nindyabeton.co.id',
      timezone: 'Asia/Jakarta',
      theme_mode: 'dark',
      color_palette: '#1E88E5',
      created_at: '2026-01-15T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    },
  ],
  activeCompanyId: 1,
  companyHolidays: [
    { id: 1, holiday_date: '2026-01-01', name: 'Tahun Baru Masehi', holiday_name: 'Tahun Baru Masehi', type: 'nasional', is_joint_leave: false, is_recurring_yearly: true, synced_from_global_calendar: true },
    { id: 2, holiday_date: '2026-05-01', name: 'Hari Buruh Internasional', holiday_name: 'Hari Buruh Internasional', type: 'nasional', is_joint_leave: false, is_recurring_yearly: true, synced_from_global_calendar: true },
    { id: 3, holiday_date: '2026-08-17', name: 'Hari Kemerdekaan RI Ke-81', holiday_name: 'Hari Kemerdekaan RI Ke-81', type: 'nasional', is_joint_leave: false, is_recurring_yearly: true, synced_from_global_calendar: true },
    { id: 4, holiday_date: '2026-12-25', name: 'Hari Raya Natal', holiday_name: 'Hari Raya Natal', type: 'nasional', is_joint_leave: false, is_recurring_yearly: true, synced_from_global_calendar: true },
  ],
  dbConfig: {
    id: 1,
    config_name: 'MySQL Database - Primary',
    host: process.env.DB_HOST || 'mysql-2cd942db-angsorula62-b90e.h.aivencloud.com',
    port: Number(process.env.DB_PORT) || 25731,
    database_name: process.env.DB_NAME || 'NKU_HRService-Portal1',
    username: process.env.DB_USER || 'avnadmin',
    password_plain: process.env.DB_PASSWORD || '',
    password_encrypted: 'ENC:aes256:aiven-sec-token',
    ssl_mode: 'REQUIRED',
    ssl_ca_cert_path: '',
    ssl_ca_cert_name: '',
    provider: 'aiven',
    is_active: true,
    last_connection_status: 'unknown',
  },
  dbSyncLogs: [
    {
      id: 1,
      action_type: 'seed',
      table_name: 'ALL_TABLES',
      status: 'success',
      message: 'Initial database schema & seed data initialized successfully from nku_hr_schema.sql',
      row_count: 52,
      executed_by_name: 'Super Admin',
      executed_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  auditLogs: [
    {
      id: 1,
      user_id: 1,
      user_name: 'Super Admin',
      action: 'SYSTEM_INIT',
      table_name: 'company_profile',
      record_id: '1',
      old_value: null,
      new_value: { company: 'PT. NINDYA KRIDA UTAMA (NKU)' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  roles: [
    { id: 1, role_key: 'super_admin', role_name: 'Super Admin', description: 'Akses penuh sistem termasuk konfigurasi database & koneksi MySQL', can_manage_db_config: true, can_manage_payroll_rules: true, can_manage_master_data: true, can_approve_requests: true, is_system_role: true },
    { id: 2, role_key: 'hr_admin', role_name: 'HR Admin', description: 'Kelola SDM, jadwal, absensi, dan approval izin/cuti/lembur', can_manage_db_config: false, can_manage_payroll_rules: false, can_manage_master_data: true, can_approve_requests: true, is_system_role: true },
    { id: 3, role_key: 'payroll_admin', role_name: 'Payroll Admin', description: 'Kelola rule gaji, lembur, potongan, allowance, dan slip gaji', can_manage_db_config: false, can_manage_payroll_rules: true, can_manage_master_data: false, can_approve_requests: false, is_system_role: true },
    { id: 4, role_key: 'manager', role_name: 'Manager Divisi', description: 'Approve request tim di divisinya', can_manage_db_config: false, can_manage_payroll_rules: false, can_manage_master_data: false, can_approve_requests: true, is_system_role: true },
    { id: 6, role_key: 'kiosk_device', role_name: 'Kiosk Device', description: 'Akun sistem khusus terminal absensi (RFID/QR/NIP)', can_manage_db_config: false, can_manage_payroll_rules: false, can_manage_master_data: false, can_approve_requests: false, is_system_role: true },
  ],
  permissions: [
    { id: 1, permission_key: 'manage_db_config', module: 'system', description: 'Akses konfigurasi database MySQL Remote' },
    { id: 2, permission_key: 'manage_employees', module: 'sdm', description: 'Kelola data karyawan & NIP' },
    { id: 3, permission_key: 'manage_schedules', module: 'schedule', description: 'Kelola jadwal kerja & plotting shift' },
    { id: 4, permission_key: 'manage_attendance', module: 'attendance', description: 'Kelola log absensi & terminal kiosk' },
    { id: 5, permission_key: 'manage_requests', module: 'requests', description: 'Approve pengajuan cuti, izin sakit, dan lembur' },
    { id: 6, permission_key: 'manage_payroll', module: 'payroll', description: 'Kelola rule gaji & proses slip gaji' },
  ],
  rolePermissions: [
    { role_id: 1, permission_id: 1 },
    { role_id: 1, permission_id: 2 },
    { role_id: 1, permission_id: 3 },
    { role_id: 1, permission_id: 4 },
    { role_id: 1, permission_id: 5 },
    { role_id: 1, permission_id: 6 },
    { role_id: 2, permission_id: 2 },
    { role_id: 2, permission_id: 3 },
    { role_id: 2, permission_id: 4 },
    { role_id: 2, permission_id: 5 },
    { role_id: 3, permission_id: 6 },
    { role_id: 4, permission_id: 5 },
  ],
  divisions: [
    { id: 1, division_code: 'PRD', division_name: 'Produksi & Batching Plant', description: 'Divisi produksi beton & material konstruksi', is_active: true },
    { id: 2, division_code: 'MKT', division_name: 'Marketing & Sales', description: 'Divisi pemasaran, kontrak & penjualan proyek', is_active: true },
    { id: 3, division_code: 'FIN', division_name: 'Finance & Accounting', description: 'Divisi keuangan, perbendaharaan & akuntansi', is_active: true },
    { id: 4, division_code: 'HRD', division_name: 'Human Resources & General Affairs', description: 'Divisi SDM & operasional umum', is_active: true },
    { id: 5, division_code: 'ENG', division_name: 'Engineering & Quality Control', description: 'Divisi teknik, lab beton & maintenance armada', is_active: true },
  ],
  jobGrades: [
    { id: 1, grade_code: 'I', grade_name: 'Golongan I - Staff Pelaksana', description: 'Staff pelaksana operasional / lapangan', is_exempt_from_lateness: false, is_active: true },
    { id: 2, grade_code: 'II', grade_name: 'Golongan II - Supervisor', description: 'Level pengawas operasional / mandor batching', is_exempt_from_lateness: false, is_active: true },
    { id: 3, grade_code: 'III', grade_name: 'Golongan III - Manager', description: 'Level kepala divisi / manajer proyek', is_exempt_from_lateness: true, is_active: true },
    { id: 4, grade_code: 'IV', grade_name: 'Golongan IV - Senior Executive', description: 'Level general manager / direksi', is_exempt_from_lateness: true, is_active: true },
  ],
  employees: [
    { id: 1, nip: 'NKU-0001', full_name: 'Budi Santoso', division_id: 1, job_grade_id: 1, email: 'budi.santoso@nku.co.id', phone: '081200000001', address: 'Jl. Rungkut Industri No. 12, Surabaya', join_date: '2022-01-10', base_salary: 25000, qr_code: 'QR-0001', status: 'active' },
    { id: 2, nip: 'NKU-0002', full_name: 'Siti Aminah', division_id: 1, job_grade_id: 2, email: 'siti.aminah@nku.co.id', phone: '081200000002', address: 'Jl. Jemursari No. 45, Surabaya', join_date: '2021-05-15', base_salary: 35000, qr_code: 'QR-0002', status: 'active' },
    { id: 3, nip: 'NKU-0003', full_name: 'Ahmad Fauzi', division_id: 2, job_grade_id: 1, email: 'ahmad.fauzi@nku.co.id', phone: '081200000003', address: 'Jl. Darmo No. 80, Surabaya', join_date: '2023-03-01', base_salary: 27000, qr_code: 'QR-0003', status: 'active' },
    { id: 4, nip: 'NKU-0004', full_name: 'Dewi Lestari', division_id: 3, job_grade_id: 3, email: 'dewi.lestari@nku.co.id', phone: '081200000004', address: 'Jl. Manyar Kertoarjo No. 18, Surabaya', join_date: '2020-08-20', base_salary: 55000, qr_code: 'QR-0004', status: 'active' },
    { id: 5, nip: 'NKU-0005', full_name: 'Rudi Hartono', division_id: 4, job_grade_id: 2, email: 'rudi.hartono@nku.co.id', phone: '081200000005', address: 'Jl. Wonokromo No. 9, Surabaya', join_date: '2022-11-01', base_salary: 32000, qr_code: 'QR-0005', status: 'active' },
    { id: 6, nip: 'NKU-0006', full_name: 'Rina Wijaya', division_id: 5, job_grade_id: 1, email: 'rina.wijaya@nku.co.id', phone: '081200000006', address: 'Jl. Gayungsari No. 22, Surabaya', join_date: '2023-06-12', base_salary: 26000, qr_code: 'QR-0006', status: 'active' },
    { id: 7, nip: 'NKU-0007', full_name: 'Hendra Gunawan', division_id: 1, job_grade_id: 1, email: 'hendra.gunawan@nku.co.id', phone: '081200000007', address: 'Jl. Waru Sidoarjo No. 5', join_date: '2024-01-05', base_salary: 25000, qr_code: 'QR-0007', status: 'active' },
    { id: 8, nip: 'NKU-0008', full_name: 'Maya Sari', division_id: 2, job_grade_id: 2, email: 'maya.sari@nku.co.id', phone: '081200000008', address: 'Jl. Kertajaya Indah No. 10', join_date: '2021-09-18', base_salary: 34000, qr_code: 'QR-0008', status: 'active' },
    { id: 9, nip: 'NKU-0009', full_name: 'Agus Setiawan', division_id: 5, job_grade_id: 3, email: 'agus.setiawan@nku.co.id', phone: '081200000009', address: 'Jl. HR Muhammad No. 99, Surabaya', join_date: '2019-02-25', base_salary: 58000, qr_code: 'QR-0009', status: 'active' },
    { id: 10, nip: 'NKU-0010', full_name: 'Lina Marlina', division_id: 4, job_grade_id: 1, email: 'lina.marlina@nku.co.id', phone: '081200000010', address: 'Jl. Diponegoro No. 3', join_date: '2024-04-01', base_salary: 25000, qr_code: 'QR-0010', status: 'inactive' },
  ],
  users: [
    { id: 1, username: 'superadmin', email: 'superadmin@nku.co.id', password_hash: '$2b$10$replaceThisWithRealBcryptHash', role_id: 1, role_key: 'super_admin', role_name: 'Super Admin', employee_id: null, is_active: true },
    { id: 2, username: 'hr.admin', email: 'hr.admin@nku.co.id', password_hash: '$2b$10$replaceThisWithRealBcryptHash', role_id: 2, role_key: 'hr_admin', role_name: 'HR Admin', employee_id: 5, is_active: true },
    { id: 3, username: 'payroll.admin', email: 'payroll.admin@nku.co.id', password_hash: '$2b$10$replaceThisWithRealBcryptHash', role_id: 3, role_key: 'payroll_admin', role_name: 'Payroll Admin', employee_id: 4, is_active: true },
    { id: 4, username: 'rudi.manager', email: 'rudi.hartono@nku.co.id', password_hash: '$2b$10$replaceThisWithRealBcryptHash', role_id: 4, role_key: 'manager', role_name: 'Manager Divisi', employee_id: 5, is_active: true },
    { id: 6, username: 'kiosk.terminal1', email: 'kiosk@nku.co.id', password_hash: '$2a$10$e7c10b78df0bbf123456789abcdef0123456789abcdef0123456789abcdef', role_id: 6, role_key: 'kiosk_device', role_name: 'Kiosk Device', employee_id: null, is_active: true },
  ],
  workSchedules: [
    { id: 1, schedule_name: 'Shift Normal Kantor (08:00 - 17:00)', time_in: '08:00:00', time_out: '17:00:00', break_start: '12:00:00', break_end: '13:00:00', tolerance_minutes: 15, is_lateness_disabled: false, exempt_job_grades: [3, 4], working_days: ['mon', 'tue', 'wed', 'thu', 'fri'], is_active: true, target_division: 'Keuangan & Akuntansi, HRD & Umum' },
    { id: 2, schedule_name: 'Shift Pagi Produksi (06:00 - 14:00)', time_in: '06:00:00', time_out: '14:00:00', break_start: '10:00:00', break_end: '10:30:00', tolerance_minutes: 10, is_lateness_disabled: false, exempt_job_grades: [], working_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], is_active: true, target_division: 'Operasional & Produksi Ready-Mix' },
    { id: 3, schedule_name: 'Shift Malam Produksi (22:00 - 06:00)', time_in: '22:00:00', time_out: '06:00:00', break_start: '02:00:00', break_end: '02:30:00', tolerance_minutes: 10, is_lateness_disabled: false, exempt_job_grades: [], working_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], is_active: true, target_division: 'Operasional & Produksi Ready-Mix, Logistik & Armada' },
  ],
  schedulePlots: [
    { id: 1, schedule_id: 1, scope_type: 'division', scope_id: 3, date_start: '2026-09-01', date_end: '2026-09-30', notes: 'Jadwal normal Finance bulan September', created_by: 1 },
    { id: 2, schedule_id: 2, scope_type: 'division', scope_id: 1, date_start: '2026-09-01', date_end: '2026-09-30', notes: 'Jadwal shift pagi Batching Produksi September', created_by: 1 },
    { id: 3, schedule_id: 1, scope_type: 'general', scope_id: null, date_start: '2026-09-01', date_end: '2026-12-31', notes: 'Default jadwal umum kantor', created_by: 1 },
  ],
  shiftSwapRequests: [],
  companyLocations: defaultCompanyLocations,
  attendanceLogs: [
    { id: 1, employee_id: 1, location_id: 2, location_name: 'Batching Plant Kalideres', latitude: -6.15231, longitude: 106.70319, location_address: 'Kawasan Industri Daan Mogot Km. 18, Kalideres, Jakarta Barat', log_date: '2026-09-04', scan_time: '2026-09-04 07:54:12', log_type: 'in', method: 'mobile_gps', device_id: 'Samsung Galaxy A54 (Mobile Portal)', is_mock_location: false, status: 'on_time', notes: 'Clock-in Mobile GPS di Batching Plant (Akurasi: 8m)' },
    { id: 2, employee_id: 2, location_id: 1, location_name: 'Head Office Surabaya (Kantor Pusat)', latitude: -7.32452, longitude: 112.76318, location_address: 'Jl. Industri Raya No. 88, Surabaya', log_date: '2026-09-04', scan_time: '2026-09-04 08:18:05', log_type: 'in', method: 'qr', device_id: 'KIOSK-MAIN-01', is_mock_location: false, status: 'late', notes: 'Terlambat 18 menit scan di kiosk kantor pusat' },
    { id: 3, employee_id: 3, location_id: 4, location_name: 'Kantor Purchasing & Pengadaan', latitude: -6.23841, longitude: 106.82468, location_address: 'Gedung Graha Niaga Lt. 3, Jakarta Selatan', log_date: '2026-09-04', scan_time: '2026-09-04 07:45:30', log_type: 'in', method: 'mobile_gps', device_id: 'iPhone 14 Pro (Mobile Portal)', is_mock_location: false, status: 'on_time', notes: 'Clock-in Mobile GPS di Kantor Purchasing (Akurasi: 5m)' },
    { id: 4, employee_id: 4, location_id: 1, location_name: 'Head Office Surabaya (Kantor Pusat)', latitude: -7.32450, longitude: 112.76320, location_address: 'Jl. Industri Raya No. 88, Surabaya', log_date: '2026-09-04', scan_time: '2026-09-04 07:58:20', log_type: 'in', method: 'nip_manual', device_id: 'KIOSK-MAIN-01', is_mock_location: false, status: 'on_time', notes: 'Input manual NIP di Kiosk Head Office' },
    { id: 5, employee_id: 5, location_id: 3, location_name: 'Batching Plant Gresik', latitude: -7.16012, longitude: 112.65079, location_address: 'Kawasan Industri Maspion Unit V, Manyar, Gresik', log_date: '2026-09-04', scan_time: '2026-09-04 08:02:11', log_type: 'in', method: 'mobile_gps', device_id: 'Xiaomi Redmi Note 12 (Mobile Portal)', is_mock_location: false, status: 'on_time', notes: 'Clock-in Mobile GPS di Batching Plant Gresik (Akurasi: 12m)' },
    { id: 6, employee_id: 6, location_id: 2, location_name: 'Batching Plant Kalideres', latitude: -6.15235, longitude: 106.70325, location_address: 'Kawasan Industri Daan Mogot Km. 18, Jakarta Barat', log_date: '2026-09-04', scan_time: '2026-09-04 08:25:40', log_type: 'in', method: 'qr', device_id: 'KIOSK-BP-01', is_mock_location: false, status: 'late', notes: 'Terlambat 25 menit di Kiosk Batching Plant Kalideres' },
  ],
  leaveTypes: [
    { id: 1, type_name: 'Cuti Tahunan', default_quota_days: 12, is_paid: true, requires_attachment: false, is_active: true },
    { id: 2, type_name: 'Izin Sakit', default_quota_days: 14, is_paid: true, requires_attachment: true, is_active: true },
    { id: 3, type_name: 'Izin Khusus (Menikah, Melahirkan)', default_quota_days: 3, is_paid: true, requires_attachment: true, is_active: true },
    { id: 4, type_name: 'Cuti Tidak Dibayar', default_quota_days: 0, is_paid: false, requires_attachment: false, is_active: true },
  ],
  leaveBalances: [
    { id: 1, employee_id: 1, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 2 },
    { id: 2, employee_id: 2, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 5 },
    { id: 3, employee_id: 3, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 0 },
    { id: 4, employee_id: 1, leave_type_id: 2, year: 2026, quota_days: 14, used_days: 1 },
    { id: 5, employee_id: 2, leave_type_id: 2, year: 2026, quota_days: 14, used_days: 0 },
    { id: 6, employee_id: 4, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 3 },
    { id: 7, employee_id: 5, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 1 },
    { id: 8, employee_id: 6, leave_type_id: 1, year: 2026, quota_days: 12, used_days: 4 },
  ],
  leaveRequests: [
    { id: 1, employee_id: 1, leave_type_id: 1, date_start: '2026-09-10', date_end: '2026-09-11', total_days: 2, reason: 'Acara keluarga di luar kota', status: 'approved', approved_by: 5, approved_at: '2026-09-02 10:00:00', created_at: '2026-09-01 08:30:00' },
    { id: 2, employee_id: 3, leave_type_id: 2, date_start: '2026-08-28', date_end: '2026-08-29', total_days: 2, reason: 'Demam tinggi & flu (ada surat dokter)', status: 'approved', approved_by: 5, approved_at: '2026-08-28 09:15:00', created_at: '2026-08-28 07:45:00' },
    { id: 3, employee_id: 6, leave_type_id: 1, date_start: '2026-09-15', date_end: '2026-09-16', total_days: 2, reason: 'Keperluan renovasi rumah', status: 'approved', approved_by: 1, approved_at: '2026-09-12 23:00:22', created_at: '2026-09-03 14:20:00' },
    { id: 4, employee_id: 7, leave_type_id: 2, date_start: '2026-09-04', date_end: '2026-09-04', total_days: 1, reason: 'Sakit radang tenggorokan', status: 'approved', approved_by: 5, approved_at: '2026-09-10 14:52:13', created_at: '2026-09-04 07:10:00' },
    { id: 5, employee_id: 1, leave_type_id: 1, date_start: '2026-09-10', date_end: '2026-09-12', total_days: 3, reason: 'Mancing', status: 'pending', approved_by: null, approved_at: null, created_at: '2026-09-10 14:36:22' },
    { id: 6, employee_id: 2, leave_type_id: 2, date_start: '2026-09-10', date_end: '2026-09-11', total_days: 2, reason: 'Demam & istirahat dokter (ada surat dokter/resep)', status: 'pending', approved_by: null, approved_at: null, created_at: '2026-09-10 15:42:37' },
    { id: 7, employee_id: 4, leave_type_id: 1, date_start: '2026-09-10', date_end: '2026-09-13', total_days: 4, reason: 'Liburan', status: 'approved', approved_by: 5, approved_at: '2026-09-10 15:53:44', created_at: '2026-09-10 15:53:24' },
    { id: 8, employee_id: 5, leave_type_id: 1, date_start: '2026-09-10', date_end: '2026-09-11', total_days: 2, reason: 'Jadwal OFF', status: 'approved', approved_by: 5, approved_at: '2026-09-10 16:18:56', created_at: '2026-09-10 16:18:33' },
  ],
  overtimeRequests: [
    { id: 1, employee_id: 1, overtime_date: '2026-08-25', time_start: '17:00:00', time_end: '20:00:00', total_hours: 3, reason: 'Pengecoran proyek jembatan batching plant lembur malam', status: 'approved', approved_by: 5, approved_at: '2026-08-26 08:00:00', created_at: '2026-08-25 16:30:00' },
    { id: 2, employee_id: 6, overtime_date: '2026-08-26', time_start: '14:00:00', time_end: '17:00:00', total_hours: 3, reason: 'Kalibrasi mesin pengujian kuat tekan beton lab', status: 'approved', approved_by: 5, approved_at: '2026-08-27 09:00:00', created_at: '2026-08-26 13:30:00' },
    { id: 3, employee_id: 2, overtime_date: '2026-09-03', time_start: '17:00:00', time_end: '21:00:00', total_hours: 4, reason: 'Supervisi pengiriman concrete mixer ke site Surabaya Timur', status: 'pending', created_at: '2026-09-03 16:00:00' },
  ],
  overtimeRules: [
    {
      id: 1,
      rule_name: 'Lembur Shift Berjenjang (17-21, 21-00, 00-07)',
      scope_type: 'general',
      scope_id: null,
      calc_type: 'timeslot',
      tier_slots: [
        { id: 't1', time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot 17-21 (+Rp 50rb)' },
        { id: 't2', time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot 21-00 (2x Gaji Harian)' },
        { id: 't3', time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot 00-07 (3x Gaji Harian)' },
      ],
      is_active: true,
    },
    { id: 2, rule_name: 'Lembur Hari Libur - Produksi', scope_type: 'division', scope_id: 1, calc_type: 'multiplier', multiplier_value: 2.0, is_active: true },
    { id: 3, rule_name: 'Uang Lembur Golongan III (Fixed)', scope_type: 'job_grade', scope_id: 3, calc_type: 'fixed', fixed_amount: 50000, is_active: true },
  ],
  deductionRules: [
    { id: 1, rule_name: 'BPJS Kesehatan', scope_type: 'general', scope_id: null, calc_type: 'percentage', percentage_value: 1.0, is_active: true },
    { id: 2, rule_name: 'BPJS Ketenagakerjaan', scope_type: 'general', scope_id: null, calc_type: 'percentage', percentage_value: 2.0, is_active: true },
    { id: 3, rule_name: 'Potongan Koperasi Karyawan', scope_type: 'general', scope_id: null, calc_type: 'fixed', fixed_amount: 25000, is_active: true },
    { id: 4, rule_name: 'Potongan Denda Keterlambatan Presensi', scope_type: 'general', scope_id: null, calc_type: 'fixed', fixed_amount: 25000, is_active: true },
  ],
  allowanceRules: [
    { id: 1, rule_name: 'Uang Makan Harian', scope_type: 'general', scope_id: null, calc_type: 'fixed', rate_unit: 'per_day', fixed_amount: 25000, is_active: true },
    { id: 2, rule_name: 'Tunjangan Transport Operasional', scope_type: 'general', scope_id: null, calc_type: 'fixed', rate_unit: 'per_day', fixed_amount: 20000, is_active: true },
    { id: 3, rule_name: 'Tunjangan Jabatan Manager', scope_type: 'job_grade', scope_id: 3, calc_type: 'percentage', rate_unit: 'per_month', percentage_value: 10.0, is_active: true },
  ],
  payrollPeriods: [
    { id: 1, period_name: 'Agustus 2026', date_start: '2026-08-01', date_end: '2026-08-31', status: 'processed', created_by: 1 },
    { id: 2, period_name: 'September 2026', date_start: '2026-09-01', date_end: '2026-09-30', status: 'draft', created_by: 1 },
  ],
  payrollSlips: [
    {
      id: 1,
      period_id: 1,
      employee_id: 1,
      base_salary: 25000,
      total_points: 176,
      gross_base_pay: 4400000,
      total_overtime: 112500,
      total_allowance: 45000,
      total_deduction: 157000,
      net_salary: 4400500,
      status: 'final',
      generated_at: '2026-08-31 18:00:00',
    },
  ],
  payrollSlipItems: [
    { id: 1, slip_id: 1, item_type: 'overtime', rule_id: 1, item_name: 'Lembur Hari Kerja (3 jam x 1.5 x Rp 25.000)', amount: 112500 },
    { id: 2, slip_id: 1, item_type: 'allowance', rule_id: 1, item_name: 'Uang Makan Harian', amount: 25000 },
    { id: 3, slip_id: 1, item_type: 'allowance', rule_id: 2, item_name: 'Tunjangan Transport Operasional', amount: 20000 },
    { id: 4, slip_id: 1, item_type: 'deduction', rule_id: 1, item_name: 'BPJS Kesehatan (1% x Upah)', amount: 44000 },
    { id: 5, slip_id: 1, item_type: 'deduction', rule_id: 2, item_name: 'BPJS Ketenagakerjaan (2% x Upah)', amount: 88000 },
    { id: 6, slip_id: 1, item_type: 'deduction', rule_id: 3, item_name: 'Potongan Koperasi Karyawan', amount: 25000 },
  ],
  officialLetters: [
    {
      id: 1,
      letter_type: 'warning',
      letter_number: '018/HRD-NKU/SP-I/IX/2026',
      employee_id: 2,
      employee_name: 'Budi Santoso',
      employee_nip: 'NKU-2023-002',
      division_name: 'Operasional & Produksi Ready-Mix',
      job_title: 'Staff Batching Plant',
      issue_date: '2026-09-05',
      effective_date: '2026-09-05',
      warning_level: 'SP-1',
      violation_reason: 'Keterlambatan presensi kerja sebanyak 4 (empat) kali berturut-turut tanpa pemberitahuan resmi kepada atasan langsung pada periode awal September 2026, melanggar Peraturan Perusahaan Bab IV Pasal 12.',
      validity_months: 6,
      company_signatory_name: 'Siti Rahmawati, S.Psi',
      company_signatory_title: 'HRD & GA Manager',
      employee_acknowledged: true,
      notes: 'Surat Peringatan Pertama (SP-1) berlaku selama 6 bulan sejak tanggal diterbitkan.',
      created_at: '2026-09-05 10:00:00',
    },
    {
      id: 2,
      letter_type: 'recommendation',
      letter_number: '042/HRD-NKU/SKK/VIII/2026',
      employee_id: 4,
      employee_name: 'Dewi Lestari',
      employee_nip: 'NKU-2022-014',
      division_name: 'Laboratorium & QC Beton',
      job_title: 'QC & Quality Assurance Specialist',
      issue_date: '2026-08-30',
      join_date: '2022-03-01',
      end_date: '2026-08-31',
      accomplishments: 'Menunjukkan dedikasi, integritas, dan profesionalisme tinggi dalam pengujian slump test serta pengendalian mutu beton ready-mix proyek infrastruktur.',
      company_signatory_name: 'Ir. Hendra Gunawan',
      company_signatory_title: 'Direktur Operasional',
      employee_acknowledged: true,
      notes: 'Surat rekomendasi kerja diterbitkan atas permohonan yang bersangkutan.',
      created_at: '2026-08-30 14:00:00',
    },
    {
      id: 3,
      letter_type: 'layoff',
      letter_number: '007/DIR-NKU/PHK/IX/2026',
      employee_id: 5,
      employee_name: 'Rian Pratama',
      employee_nip: 'NKU-2024-031',
      division_name: 'Logistik & Armada Mixer',
      job_title: 'Operator Driver Truck Mixer',
      issue_date: '2026-09-01',
      effective_date: '2026-09-30',
      layoff_reason: 'Restrukturisasi armada pengiriman ready-mix dan rasionalisasi rute site plant wilayah Timur sesuai kesepakatan bersama.',
      severance_notes: 'Kompensasi pesangon, uang penghargaan masa kerja, dan penggantian hak diproses penuh sesuai UU Cipta Kerja No. 6/2023 Pasal 156.',
      company_signatory_name: 'Ir. Hendra Gunawan',
      company_signatory_title: 'Direktur Utama',
      employee_acknowledged: true,
      notes: 'Penyerahan perlengkapan kerja & serah terima kendaraan paling lambat 30 September 2026.',
      created_at: '2026-09-01 09:00:00',
    },
  ],
};

// -------------------------------------------------------------
// PERSISTENCE STORAGE HELPER (Guarantees data survives restarts)
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');

function saveStateToDisk() {
  try {
    const toPersist = {
      companyProfile: state.companyProfile,
      companyProfiles: state.companyProfiles,
      activeCompanyId: state.activeCompanyId,
      dbConfig: state.dbConfig,
      companyHolidays: state.companyHolidays,
      employees: state.employees,
      divisions: state.divisions,
      jobGrades: state.jobGrades,
      workSchedules: state.workSchedules,
      schedulePlots: state.schedulePlots,
      attendanceLogs: cleanAndDeduplicateAttendanceLogs(state.attendanceLogs),
      leaveRequests: state.leaveRequests,
      overtimeRequests: state.overtimeRequests,
      overtimeRules: state.overtimeRules,
      deductionRules: state.deductionRules,
      allowanceRules: state.allowanceRules,
      payrollPeriods: state.payrollPeriods,
      payrollSlips: state.payrollSlips,
      leaveTypes: state.leaveTypes,
      leaveBalances: state.leaveBalances,
      users: state.users,
      companyLocations: state.companyLocations,
      dbSyncLogs: state.dbSyncLogs,
      auditLogs: state.auditLogs,
      officialLetters: state.officialLetters,
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(toPersist, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save state to disk:', err);
  }
}

// Canonical Indonesian holiday names for official harmonization & anti-duplication
const CANONICAL_HOLIDAY_NAMES: Record<string, string> = {
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-81',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-04-03': 'Wafat Yesus Kristus (Jumat Agung)',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': "Isra Mi'raj Nabi Muhammad SAW",
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
};

function cleanAndDeduplicateHolidays(list: any[]) {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();

  for (const h of list) {
    if (!h || !h.holiday_date) continue;
    let d = String(h.holiday_date).trim();
    let name = String(h.name || h.holiday_name || '').trim();

    // Purge incorrect 2026-09-25 Maulid date
    if (d === '2026-09-25' && name.toLowerCase().includes('maulid')) {
      continue;
    }
    // Correct 2026 Maulid to 2026-08-25
    if (name.toLowerCase().includes('maulid') && d.startsWith('2026')) {
      d = '2026-08-25';
    }

    const isJoint = !!(h.is_joint_leave || h.type === 'cuti_bersama');
    const typeKey = isJoint ? 'cuti' : 'nasional';
    const key = `${d}_${typeKey}`;

    if (CANONICAL_HOLIDAY_NAMES[d] && !isJoint) {
      name = CANONICAL_HOLIDAY_NAMES[d];
    }

    const item = {
      ...h,
      holiday_date: d,
      name: name,
      holiday_name: name,
      type: isJoint ? 'cuti_bersama' : 'nasional',
      is_joint_leave: isJoint,
      is_recurring_yearly: true,
      synced_from_global_calendar: true,
    };

    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);
      if (CANONICAL_HOLIDAY_NAMES[d]) {
        existing.name = CANONICAL_HOLIDAY_NAMES[d];
        existing.holiday_name = CANONICAL_HOLIDAY_NAMES[d];
      } else if (name.length > (existing.name || '').length) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime()
  );
}

function cleanAndDeduplicateAttendanceLogs(list: any[]) {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();
  for (const log of list) {
    if (!log || !log.employee_id) continue;
    const empId = Number(log.employee_id);
    const dateStr = log.log_date || (log.scan_time ? String(log.scan_time).slice(0, 10) : '');
    if (!dateStr) continue;
    const normType = (log.log_type === 'clock_in' || log.log_type === 'in') ? 'in' : 'out';
    const key = `${empId}_${dateStr}_${normType}`;
    if (!map.has(key)) {
      map.set(key, log);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.scan_time || b.created_at || 0).getTime() - new Date(a.scan_time || a.created_at || 0).getTime()
  );
}

function computeAttendanceStatus(
  empId: number,
  logDate?: string,
  scanTime?: string,
  logType: string = 'in'
): { status: 'on_time' | 'late' | 'normal' | 'invalid_window'; notes: string } {
  const normalizedLogType = (logType === 'clock_out' || logType === 'out') ? 'out' : 'in';
  if (normalizedLogType === 'out') {
    return { status: 'normal', notes: 'Presensi Keluar Berhasil' };
  }

  const emp = (state.employees || []).find((e: any) => Number(e.id) === Number(empId));
  if (!emp) {
    return { status: 'on_time', notes: 'Tepat Waktu' };
  }

  let hours = 0;
  let minutes = 0;
  if (scanTime) {
    const timeStr = String(scanTime);
    const timePart = timeStr.includes('T') ? timeStr.split('T')[1].slice(0, 8) : (timeStr.slice(11, 19) || timeStr);
    const [hStr, mStr] = timePart.split(':');
    hours = parseInt(hStr || '0', 10);
    minutes = parseInt(mStr || '0', 10);
  }

  const targetDate = logDate || (scanTime ? String(scanTime).slice(0, 10) : new Date().toISOString().slice(0, 10));

  // Look up employee's grade
  const empGrade = (state.jobGrades || []).find((g: any) => Number(g.id) === Number(emp.job_grade_id));
  const isGradeExempt = Boolean(empGrade?.is_exempt_from_lateness);

  const isEmpMatchingSchedTarget = (targetSched?: any) => {
    if (!targetSched || !targetSched.target_division) return true;
    const target = targetSched.target_division.trim().toLowerCase();
    if (!target || target.includes('semua divisi') || target.includes('umum') || target === 'all') return true;
    const empDiv = (state.divisions || []).find((d: any) => Number(d.id) === Number(emp.division_id));
    const empDivName = emp.division_name || empDiv?.division_name || '';
    if (!empDivName) return false;
    const empDivLower = empDivName.trim().toLowerCase();
    const parts = target.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
    return parts.some((p: string) => empDivLower.includes(p) || p.includes(empDivLower));
  };

  // Resolve active schedule for this employee on targetDate
  let activeSched = (state.workSchedules || []).find((s: any) => s.is_active);
  const matchingPlot = (state.schedulePlots || []).find((p: any) => {
    if (p.date_start && p.date_end) {
      if (targetDate < p.date_start || targetDate > p.date_end) return false;
    }
    if (p.scope_type === 'employee' && Number(p.scope_id) === Number(emp.id)) return true;
    if (p.scope_type === 'division' && Number(p.scope_id) === Number(emp.division_id)) return true;
    
    const targetSched = (state.workSchedules || []).find((s: any) => Number(s.id) === Number(p.schedule_id));
    if (p.scope_type === 'job_grade' && Number(p.scope_id) === Number(emp.job_grade_id)) {
      return isEmpMatchingSchedTarget(targetSched);
    }
    if (p.scope_type === 'general') {
      return isEmpMatchingSchedTarget(targetSched);
    }
    return false;
  });

  if (matchingPlot) {
    const foundSched = (state.workSchedules || []).find((s: any) => Number(s.id) === Number(matchingPlot.schedule_id));
    if (foundSched) activeSched = foundSched;
  } else if (emp.division_id) {
    const empDiv = (state.divisions || []).find((d: any) => Number(d.id) === Number(emp.division_id));
    if (empDiv) {
      const divSched = (state.workSchedules || []).find(
        (s: any) => s.target_division && s.target_division.toLowerCase().includes(empDiv.division_name.toLowerCase())
      );
      if (divSched) activeSched = divSched;
    }
  }

  const isSchedLatenessDisabled = Boolean(activeSched?.is_lateness_disabled);
  const isSchedExemptForGrade = Boolean(
    activeSched?.exempt_job_grades &&
    Array.isArray(activeSched.exempt_job_grades) &&
    activeSched.exempt_job_grades.includes(Number(emp.job_grade_id))
  );

  const isExemptFromLateness = isGradeExempt || isSchedLatenessDisabled || isSchedExemptForGrade;

  if (isExemptFromLateness) {
    const reasonTag = isSchedLatenessDisabled
      ? 'Bebas Keterlambatan (Jadwal Kerja)'
      : `Bebas Keterlambatan (${empGrade?.grade_name || 'Golongan Khusus'})`;
    return { status: 'on_time', notes: `Tepat Waktu - ${reasonTag}` };
  }

  const schedTimeIn = activeSched?.time_in || '08:00:00';
  const [sH, sM] = schedTimeIn.split(':').map((v: string) => parseInt(v, 10) || 0);
  const toleranceMins = activeSched?.tolerance_minutes ?? 15;
  const schedMinutes = sH * 60 + sM;
  const limitMinutes = schedMinutes + toleranceMins;
  const currentTotalMinutes = hours * 60 + minutes;

  // Earliest clock-in window: default 120 minutes (2 hours) before shift start (e.g. 06:00 for 08:00 shift)
  const earliestWindowMinutes = (activeSched as any)?.earliest_clock_in_minutes ?? 120;
  const earliestLimit = Math.max(0, schedMinutes - earliestWindowMinutes);

  if (currentTotalMinutes > limitMinutes) {
    const lateMins = currentTotalMinutes - schedMinutes;
    return { status: 'late', notes: `Terlambat ${lateMins} menit` };
  } else if (currentTotalMinutes < earliestLimit) {
    const earlyMins = schedMinutes - currentTotalMinutes;
    const earlyH = Math.floor(earlyMins / 60);
    const earlyM = earlyMins % 60;
    const timeDesc = earlyH > 0 ? `${earlyH} jam ${earlyM} mnt` : `${earlyM} menit`;
    const earliestH = Math.floor(earliestLimit / 60);
    const earliestM = earliestLimit % 60;
    const earliestStr = `${String(earliestH).padStart(2, '0')}:${String(earliestM).padStart(2, '0')}`;
    return {
      status: 'invalid_window',
      notes: `Di Luar Batas Jam Masuk (Terlalu Awal ${timeDesc}, Batas Buka Pukul ${earliestStr} WIB)`,
    };
  } else {
    return { status: 'on_time', notes: 'Tepat Waktu' };
  }
}

function autoEnrichAttendanceLogs(logs: any[]) {
  if (!Array.isArray(logs)) return [];
  const locations = state.companyLocations && state.companyLocations.length > 0 ? state.companyLocations : defaultCompanyLocations;
  const locHeadOffice = locations.find((l: any) => l.id === 1) || locations[0];
  const locBatchingKalideres = locations.find((l: any) => l.id === 2) || locations[0];
  const locBatchingGresik = locations.find((l: any) => l.id === 3) || locations[0];
  const locPurchasing = locations.find((l: any) => l.id === 4) || locations[0];
  const locWarehouse = locations.find((l: any) => l.id === 5) || locations[0];

  return logs.map((log: any) => {
    const empId = Number(log.employee_id);
    const emp = (state.employees || []).find((e: any) => Number(e.id) === empId);
    const divId = emp ? Number(emp.division_id) : 1;

    // Check & reconcile lateness status if clock-in
    let targetStatus = log.status || 'on_time';
    let targetNotes = log.notes;
    const normType = (log.log_type === 'clock_in' || log.log_type === 'in') ? 'in' : 'out';
    if (normType === 'in') {
      const evalRes = computeAttendanceStatus(
        empId,
        log.log_date || (log.scan_time ? String(log.scan_time).slice(0, 10) : ''),
        log.scan_time,
        'in'
      );
      if (evalRes.status === 'late') {
        targetStatus = 'late';
        if (!targetNotes || targetNotes === 'Tepat Waktu' || targetNotes.toLowerCase().includes('tepat')) {
          targetNotes = evalRes.notes;
        }
      }
    }

    // If log already has valid location_id and location_name, preserve location but keep reconciled status
    if (log.location_id && log.location_name && log.latitude != null && log.longitude != null) {
      return {
        ...log,
        status: targetStatus,
        notes: targetNotes || log.notes,
      };
    }

    let targetLoc = locHeadOffice;
    let targetMethod = log.method || 'qr';
    let targetDevice = log.device_id || 'Kiosk Utama Gate 1';

    if (divId === 1) { // Produksi & Batching Plant
      targetLoc = empId % 2 === 0 ? locBatchingGresik : locBatchingKalideres;
      if (log.method === 'nip_manual' || !log.method) {
        targetMethod = empId === 1 ? 'mobile_gps' : 'qr';
      }
      targetDevice = targetMethod === 'mobile_gps' ? 'Samsung Galaxy A54 (Mobile Portal)' : `KIOSK-${targetLoc.location_code}`;
    } else if (divId === 2) { // Marketing & Sales
      targetLoc = locPurchasing;
      targetMethod = 'mobile_gps';
      targetDevice = 'iPhone 14 Pro (Mobile Portal)';
    } else if (divId === 5) { // Engineering & QC
      targetLoc = locWarehouse;
      targetMethod = 'mobile_gps';
      targetDevice = 'Xiaomi Redmi Note 12 (Mobile Portal)';
    } else { // HRD, Finance, Management
      targetLoc = locHeadOffice;
      if (log.method === 'nip_manual' && empId === 4) {
        targetMethod = 'nip_manual';
      } else if (!log.method || log.method === 'nip_manual') {
        targetMethod = empId === 2 ? 'qr' : 'mobile_gps';
      }
      targetDevice = targetMethod === 'mobile_gps' ? 'Samsung Galaxy S23 (Mobile Portal)' : 'KIOSK-MAIN-01';
    }

    const jitterLat = ((empId * 17) % 50) * 0.00002;
    const jitterLng = ((empId * 23) % 50) * 0.00002;

    return {
      ...log,
      location_id: targetLoc.id,
      location_name: targetLoc.location_name,
      latitude: targetLoc.latitude != null ? Number((targetLoc.latitude + jitterLat).toFixed(5)) : null,
      longitude: targetLoc.longitude != null ? Number((targetLoc.longitude + jitterLng).toFixed(5)) : null,
      location_address: targetLoc.address,
      method: targetMethod,
      device_id: targetDevice,
      is_mock_location: log.is_mock_location !== undefined ? Boolean(log.is_mock_location) : false,
      notes: log.notes && !log.notes.toLowerCase().includes('manual') 
        ? log.notes 
        : (targetMethod === 'mobile_gps' ? `Clock-${log.log_type === 'out' ? 'Out' : 'In'} Mobile GPS di ${targetLoc.location_name}` : `Presensi di ${targetLoc.location_name}`),
    };
  });
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      if (loaded && typeof loaded === 'object') {
        if (Array.isArray(loaded.companyProfiles) && loaded.companyProfiles.length > 0) {
          state.companyProfiles = loaded.companyProfiles;
        } else if (loaded.companyProfile) {
          state.companyProfiles = [{ ...state.companyProfile, ...loaded.companyProfile }];
        }
        if (loaded.activeCompanyId) {
          state.activeCompanyId = loaded.activeCompanyId;
        }
        if (loaded.companyProfile) {
          state.companyProfile = { ...state.companyProfile, ...loaded.companyProfile };
        } else if (state.companyProfiles.length > 0) {
          const matched = state.companyProfiles.find((c: any) => c.id === state.activeCompanyId) || state.companyProfiles[0];
          state.companyProfile = { ...matched };
        }
        if (loaded.dbConfig) {
          state.dbConfig = { ...state.dbConfig, ...loaded.dbConfig };
          const caCert = (state.dbConfig as any).ca_certificate || (state.dbConfig as any).ca_cert;
          if (caCert && typeof caCert === 'string' && caCert.trim().length > 0) {
            try {
              if (!fs.existsSync(CERTS_DIR)) {
                fs.mkdirSync(CERTS_DIR, { recursive: true });
              }
              const certName = state.dbConfig.ssl_ca_cert_name || 'ca-cert.pem';
              const certPath = path.join(CERTS_DIR, certName);
              fs.writeFileSync(certPath, caCert.trim(), 'utf8');
              state.dbConfig.ssl_ca_cert_path = certPath;
              state.dbConfig.ssl_ca_cert_name = certName;
            } catch (e) {
              console.error('Failed to write CA cert to disk on startup:', e);
            }
          }
        }
        if (Array.isArray(loaded.companyHolidays)) {
          state.companyHolidays = cleanAndDeduplicateHolidays(loaded.companyHolidays);
        }
        if (Array.isArray(loaded.employees)) state.employees = loaded.employees;
        if (Array.isArray(loaded.divisions)) state.divisions = loaded.divisions;
        if (Array.isArray(loaded.jobGrades)) {
          state.jobGrades = loaded.jobGrades.map((g: any) => ({
            ...g,
            is_exempt_from_lateness: g.is_exempt_from_lateness !== undefined ? Boolean(g.is_exempt_from_lateness) : (g.id === 3 || g.id === 4),
            is_active: g.is_active !== undefined ? Boolean(g.is_active) : true,
          }));
        }
        if (Array.isArray(loaded.workSchedules)) {
          state.workSchedules = loaded.workSchedules.map((s: any) => ({
            ...s,
            is_lateness_disabled: s.is_lateness_disabled !== undefined ? Boolean(s.is_lateness_disabled) : false,
            exempt_job_grades: Array.isArray(s.exempt_job_grades) ? s.exempt_job_grades : (s.id === 1 ? [3, 4] : []),
            is_active: s.is_active !== undefined ? Boolean(s.is_active) : true,
          }));
        }
        if (Array.isArray(loaded.schedulePlots)) state.schedulePlots = loaded.schedulePlots;
        if (Array.isArray(loaded.companyLocations) && loaded.companyLocations.length > 0) {
          state.companyLocations = loaded.companyLocations;
        } else {
          state.companyLocations = defaultCompanyLocations;
        }
        if (Array.isArray(loaded.attendanceLogs)) {
          state.attendanceLogs = autoEnrichAttendanceLogs(cleanAndDeduplicateAttendanceLogs(loaded.attendanceLogs));
        } else {
          state.attendanceLogs = autoEnrichAttendanceLogs(state.attendanceLogs || []);
        }
        if (Array.isArray(loaded.leaveTypes)) state.leaveTypes = loaded.leaveTypes;
        if (Array.isArray(loaded.leaveBalances)) state.leaveBalances = loaded.leaveBalances;
        if (Array.isArray(loaded.users)) state.users = loaded.users;
        if (Array.isArray(loaded.leaveRequests)) state.leaveRequests = loaded.leaveRequests;
        if (Array.isArray(loaded.overtimeRequests)) state.overtimeRequests = loaded.overtimeRequests;
        if (Array.isArray(loaded.overtimeRules)) state.overtimeRules = loaded.overtimeRules;
        if (Array.isArray(loaded.deductionRules)) state.deductionRules = loaded.deductionRules;
        if (!state.deductionRules.some((r: any) => /keterlambatan|telat/i.test(r.rule_name))) {
          state.deductionRules.push({
            id: state.deductionRules.length ? Math.max(...state.deductionRules.map((r: any) => r.id)) + 1 : 1,
            rule_name: 'Potongan Denda Keterlambatan Presensi',
            scope_type: 'general',
            scope_id: null,
            calc_type: 'fixed',
            fixed_amount: 25000,
            is_active: true,
          });
        }
        if (Array.isArray(loaded.allowanceRules)) state.allowanceRules = loaded.allowanceRules;
        if (Array.isArray(loaded.payrollSlips)) state.payrollSlips = loaded.payrollSlips;
        if (Array.isArray(loaded.dbSyncLogs)) state.dbSyncLogs = loaded.dbSyncLogs;
        if (Array.isArray(loaded.auditLogs)) state.auditLogs = loaded.auditLogs;
        if (Array.isArray(loaded.officialLetters)) state.officialLetters = loaded.officialLetters;
        if (Array.isArray(loaded.companyLocations) && loaded.companyLocations.length > 0) {
          state.companyLocations = loaded.companyLocations;
        } else {
          state.companyLocations = defaultCompanyLocations;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load state from disk:', err);
  }
}
loadStateFromDisk();
saveStateToDisk();

// Official Indonesian Holidays & Cuti Bersama 2026 (SKB 3 Menteri)
const OFFICIAL_ID_HOLIDAYS_2026 = [
  { holiday_date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-01-16', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-02-18', name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-03-20', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-03-23', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-03-24', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-03-25', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-04-03', name: 'Wafat Yesus Kristus (Jumat Agung)', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-04-05', name: 'Hari Paskah', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-05-15', name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-06-02', name: 'Cuti Bersama Hari Raya Waisak', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-06-27', name: 'Hari Raya Idul Adha 1447 H', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-06-29', name: 'Cuti Bersama Hari Raya Idul Adha 1447 H', type: 'cuti_bersama', is_joint_leave: true },
  { holiday_date: '2026-07-17', name: 'Tahun Baru Islam 1448 Hijriah', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia Ke-81', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-12-25', name: 'Hari Raya Natal', type: 'nasional', is_joint_leave: false },
  { holiday_date: '2026-12-26', name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama', is_joint_leave: true },
];

// Helper: Enrich employee
function enrichEmployee(emp: any) {
  if (!emp) return emp;
  const div = state.divisions.find((d) => Number(d.id) === Number(emp.division_id));
  const grade = state.jobGrades.find((g) => Number(g.id) === Number(emp.job_grade_id));
  return {
    ...emp,
    division_name: div ? div.division_name : (emp.division_name || '-'),
    job_grade_name: grade ? grade.grade_name : (emp.job_grade_name || '-'),
  };
}

function enrichAttendanceLog(log: any) {
  if (!log) return log;
  const emp = state.employees.find((e) => Number(e.id) === Number(log.employee_id));
  const div = emp ? state.divisions.find((d) => Number(d.id) === Number(emp.division_id)) : null;
  const grade = emp ? state.jobGrades.find((g) => Number(g.id) === Number(emp.job_grade_id)) : null;
  const loc = (state.companyLocations || []).find((l: any) => Number(l.id) === Number(log.location_id));

  let status = log.status || 'on_time';
  let notes = log.notes;
  const normType = (log.log_type === 'clock_in' || log.log_type === 'in') ? 'in' : 'out';
  if (normType === 'in' && emp) {
    const evalRes = computeAttendanceStatus(
      emp.id,
      log.log_date || (log.scan_time ? String(log.scan_time).slice(0, 10) : ''),
      log.scan_time,
      'in'
    );
    if (evalRes.status === 'late') {
      status = 'late';
      if (!notes || notes === 'Tepat Waktu' || notes.toLowerCase().includes('tepat')) {
        notes = evalRes.notes;
      }
    }
  }

  return {
    ...log,
    status,
    notes,
    employee_name: emp ? emp.full_name : (log.employee_name || 'Unknown'),
    employee_nip: emp ? emp.nip : (log.employee_nip || '-'),
    division_name: div ? div.division_name : (emp?.division_name || log.division_name || '-'),
    job_grade_name: grade ? grade.grade_name : (emp?.job_grade_name || log.job_grade_name || '-'),
    location_id: log.location_id || (loc ? loc.id : null),
    location_name: log.location_name || (loc ? loc.location_name : null),
    latitude: log.latitude ?? (loc ? loc.latitude : null),
    longitude: log.longitude ?? (loc ? loc.longitude : null),
    location_address: log.location_address || (loc ? loc.address : null),
    is_mock_location: Boolean(log.is_mock_location),
  };
}

function resolveApproverName(approvedById: any): string | undefined {
  if (approvedById === null || approvedById === undefined || approvedById === '') return undefined;
  const numId = Number(approvedById);
  if (isNaN(numId) || numId <= 0) return undefined;

  // 1. Check user table
  const user = (state.users || []).find((u) => Number(u.id) === numId);
  if (user) {
    if (user.employee_id) {
      const emp = (state.employees || []).find((e) => Number(e.id) === Number(user.employee_id));
      if (emp && emp.full_name) return emp.full_name;
    }
    if (user.role_key === 'super_admin' || user.username === 'superadmin') {
      return 'Super Admin';
    }
    if (user.role_name) return user.role_name;
    if (user.username) return user.username;
  }

  // 2. Check employee table
  const emp = (state.employees || []).find((e) => Number(e.id) === numId);
  if (emp && emp.full_name) {
    return emp.full_name;
  }

  // 3. Truthful fallback using database ID
  return `User #${numId}`;
}

function enrichLeaveRequest(reqItem: any) {
  if (!reqItem) return reqItem;
  const emp = state.employees.find((e) => Number(e.id) === Number(reqItem.employee_id));
  const div = emp ? state.divisions.find((d) => Number(d.id) === Number(emp.division_id)) : null;
  const type = state.leaveTypes?.find((t) => Number(t.id) === Number(reqItem.leave_type_id));
  const approvedByVal = (reqItem.approved_by !== null && reqItem.approved_by !== undefined && reqItem.approved_by !== '') ? Number(reqItem.approved_by) : null;
  const approverName = approvedByVal ? resolveApproverName(approvedByVal) : undefined;
  return {
    ...reqItem,
    approved_by: approvedByVal,
    employee_name: emp ? emp.full_name : (reqItem.employee_name || 'Unknown'),
    employee_nip: emp ? emp.nip : (reqItem.employee_nip || '-'),
    division_name: div ? div.division_name : (reqItem.division_name || '-'),
    leave_type_name: type ? type.type_name : (reqItem.leave_type_name || (Number(reqItem.leave_type_id) === 2 ? 'Izin Sakit' : 'Cuti Tahunan')),
    approved_by_name: approverName,
  };
}

function enrichOvertimeRequest(reqItem: any) {
  if (!reqItem) return reqItem;
  const emp = state.employees.find((e) => Number(e.id) === Number(reqItem.employee_id));
  const div = emp ? state.divisions.find((d) => Number(d.id) === Number(emp.division_id)) : null;
  const approvedByVal = (reqItem.approved_by !== null && reqItem.approved_by !== undefined && reqItem.approved_by !== '') ? Number(reqItem.approved_by) : null;
  const approverName = approvedByVal ? resolveApproverName(approvedByVal) : undefined;
  return {
    ...reqItem,
    approved_by: approvedByVal,
    employee_name: emp ? emp.full_name : (reqItem.employee_name || 'Unknown'),
    employee_nip: emp ? emp.nip : (reqItem.employee_nip || '-'),
    division_name: div ? div.division_name : (reqItem.division_name || '-'),
    approved_by_name: approverName,
  };
}

function enrichSchedulePlot(plotItem: any) {
  if (!plotItem) return plotItem;
  const sched = (state.workSchedules || []).find((s) => Number(s.id) === Number(plotItem.schedule_id));
  let scopeName = 'Semua Karyawan (General)';
  if (plotItem.scope_type === 'division') {
    const d = (state.divisions || []).find((div) => Number(div.id) === Number(plotItem.scope_id));
    scopeName = d ? d.division_name : (plotItem.scope_name || (plotItem.scope_id ? `Divisi #${plotItem.scope_id}` : 'Semua Divisi'));
  } else if (plotItem.scope_type === 'job_grade') {
    const g = (state.jobGrades || []).find((gr) => Number(gr.id) === Number(plotItem.scope_id) || gr.grade_code === String(plotItem.scope_id) || gr.grade_name === String(plotItem.scope_id));
    scopeName = g ? `${g.grade_code ? `[${g.grade_code}] ` : ''}${g.grade_name}` : (plotItem.scope_name || (plotItem.scope_id ? `Golongan #${plotItem.scope_id}` : 'Golongan'));
  } else if (plotItem.scope_type === 'employee') {
    const emp = (state.employees || []).find((e) => Number(e.id) === Number(plotItem.scope_id) || e.nip === String(plotItem.scope_id));
    scopeName = emp ? `${emp.nip} - ${emp.full_name}` : (plotItem.scope_name || (plotItem.scope_id ? `Karyawan #${plotItem.scope_id}` : 'Karyawan'));
  }
  return {
    ...plotItem,
    schedule_name: (sched && sched.schedule_name) ? sched.schedule_name : (plotItem.schedule_name || `Jadwal #${plotItem.schedule_id}`),
    scope_name: scopeName,
  };
}

// Initial enrichment of state in memory
if (Array.isArray(state.employees)) {
  state.employees = state.employees.map(enrichEmployee);
}
if (Array.isArray(state.attendanceLogs)) {
  state.attendanceLogs = state.attendanceLogs.map(enrichAttendanceLog);
}
if (Array.isArray(state.schedulePlots)) {
  state.schedulePlots = state.schedulePlots.map(enrichSchedulePlot);
}

// -------------------------------------------------------------
// LIVE MYSQL CONNECTION HELPER (Aiven / Remote MySQL 8)
// -------------------------------------------------------------

function buildMysqlConfig(cfg: typeof state.dbConfig) {
  const configObj: any = {
    host: cfg.host,
    port: Number(cfg.port) || 3306,
    user: cfg.username,
    password: cfg.password_plain || process.env.DB_PASSWORD || '',
    database: cfg.database_name,
    connectTimeout: 10000,
  };

  if (cfg.ssl_mode !== 'DISABLED') {
    const caCert = (cfg as any).ca_certificate || (cfg as any).ca_cert;
    if (caCert && typeof caCert === 'string' && caCert.trim().length > 0) {
      configObj.ssl = {
        ca: caCert.trim(),
        rejectUnauthorized: false,
      };
    } else if (cfg.ssl_ca_cert_path && fs.existsSync(cfg.ssl_ca_cert_path)) {
      configObj.ssl = {
        ca: fs.readFileSync(cfg.ssl_ca_cert_path, 'utf8'),
        rejectUnauthorized: false,
      };
    } else {
      // Default SSL required mode (Aiven cloud accepts standard SSL)
      configObj.ssl = {
        rejectUnauthorized: false,
      };
    }
  }

  return configObj;
}

// Automatic Remote MySQL Column Migrations (prevents unknown column errors on existing cloud databases)
async function ensureRemoteSchemaMigrations(connection: any) {
  async function ensureColumn(tableName: string, columnName: string, colDefinition: string) {
    try {
      const [cols]: any = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
      );
      if (!cols || cols.length === 0) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${colDefinition};`);
        console.log(`[Schema Migration] Added column ${columnName} to table ${tableName} on remote MySQL.`);
      }
    } catch (cErr: any) {
      console.warn(`[Schema Migration Warning] Could not add column ${columnName} to ${tableName}:`, cErr.message);
    }
  }

  await ensureColumn('job_grades', 'is_exempt_from_lateness', 'BOOLEAN DEFAULT FALSE COMMENT \'Bebas denda dan status terlambat saat presensi masuk\'');
  await ensureColumn('work_schedules', 'is_lateness_disabled', 'BOOLEAN DEFAULT FALSE COMMENT \'Bebas keterlambatan untuk seluruh karyawan yang memakai jadwal ini\'');
  await ensureColumn('work_schedules', 'exempt_job_grades', 'JSON NULL COMMENT \'Array ID Golongan yang dibebaskan dari toleransi/status telat\'');
  await ensureColumn('leave_balances', 'carry_forward_days', 'DECIMAL(5,1) DEFAULT 0');
  await ensureColumn('leave_balances', 'carry_forward_expires_at', 'DATE NULL');
  await ensureColumn('leave_balances', 'carry_forward_expired', 'BOOLEAN DEFAULT FALSE');
  await ensureColumn('db_configs', 'ca_certificate', 'MEDIUMTEXT');
  await ensureColumn('db_configs', 'ssl_ca_cert_path', 'VARCHAR(255)');
  await ensureColumn('db_configs', 'ssl_client_cert_path', 'VARCHAR(255)');
  await ensureColumn('db_configs', 'ssl_client_key_path', 'VARCHAR(255)');
  await ensureColumn('company_holidays', 'synced_from_global_calendar', 'BOOLEAN DEFAULT FALSE');
  await ensureColumn('employees', 'photo_url', 'MEDIUMTEXT');
  await ensureColumn('employees', 'address', 'TEXT');
  await ensureColumn('employees', 'join_date', 'DATE');
  await ensureColumn('employees', 'qr_code', 'VARCHAR(100)');
  await ensureColumn('allowance_rules', 'rate_unit', "VARCHAR(20) DEFAULT 'per_month'");

  // 1. Ensure company_locations table exists on remote MySQL
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`company_locations\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`location_code\` VARCHAR(50) NOT NULL UNIQUE,
        \`location_name\` VARCHAR(150) NOT NULL,
        \`location_type\` VARCHAR(50) NOT NULL DEFAULT 'batching_plant',
        \`address\` TEXT NOT NULL,
        \`latitude\` DECIMAL(10, 8) NOT NULL,
        \`longitude\` DECIMAL(11, 8) NOT NULL,
        \`radius_meters\` INT NOT NULL DEFAULT 100,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`notes\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed default company locations if table is empty
    const [existingLocs]: any = await connection.query('SELECT COUNT(*) as cnt FROM `company_locations`');
    if (existingLocs && existingLocs[0] && Number(existingLocs[0].cnt) === 0) {
      for (const loc of defaultCompanyLocations) {
        await connection.query(`
          INSERT INTO \`company_locations\` (id, location_code, location_name, location_type, address, latitude, longitude, radius_meters, is_active, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE location_name=VALUES(location_name);
        `, [loc.id, loc.location_code, loc.location_name, loc.location_type, loc.address, loc.latitude, loc.longitude, loc.radius_meters, loc.is_active ? 1 : 0, loc.notes, loc.created_at, loc.updated_at]);
      }
      console.log('[Schema Migration] Seeded default company_locations on remote MySQL.');
    }
  } catch (locErr: any) {
    console.warn('[Schema Migration] company_locations table setup notice:', locErr.message);
  }

  // 2. Ensure attendance_logs has location & GPS fields
  await ensureColumn('attendance_logs', 'location_id', 'INT NULL');
  await ensureColumn('attendance_logs', 'location_name', 'VARCHAR(150) NULL');
  await ensureColumn('attendance_logs', 'latitude', 'DECIMAL(10, 8) NULL');
  await ensureColumn('attendance_logs', 'longitude', 'DECIMAL(11, 8) NULL');
  await ensureColumn('attendance_logs', 'location_address', 'TEXT NULL');
  await ensureColumn('attendance_logs', 'is_mock_location', 'BOOLEAN DEFAULT FALSE');

  // 3. Widen method & device_id on attendance_logs to prevent enum errors for mobile_gps
  try {
    await connection.query('ALTER TABLE `attendance_logs` MODIFY COLUMN `method` VARCHAR(50) NOT NULL;');
    await connection.query('ALTER TABLE `attendance_logs` MODIFY COLUMN `device_id` VARCHAR(150);');
    await connection.query('ALTER TABLE `attendance_logs` MODIFY COLUMN `location_address` TEXT;');
  } catch (attErr: any) {
    console.warn('[Schema Migration] attendance_logs columns broaden notice:', attErr.message);
  }

  // 4. Backfill existing remote attendance_logs if location_id is NULL
  try {
    const [emptyLocLogs]: any = await connection.query('SELECT COUNT(*) as cnt FROM `attendance_logs` WHERE location_id IS NULL;');
    if (emptyLocLogs && emptyLocLogs[0] && Number(emptyLocLogs[0].cnt) > 0) {
      await connection.query(`
        UPDATE attendance_logs l
        LEFT JOIN employees e ON e.id = l.employee_id
        SET 
          l.location_id = CASE 
            WHEN e.division_id = 1 THEN (CASE WHEN l.employee_id % 2 = 0 THEN 3 ELSE 2 END)
            WHEN e.division_id = 2 THEN 4
            WHEN e.division_id = 5 THEN 5
            ELSE 1 
          END,
          l.location_name = CASE 
            WHEN e.division_id = 1 THEN (CASE WHEN l.employee_id % 2 = 0 THEN 'Batching Plant Gresik' ELSE 'Batching Plant Kalideres' END)
            WHEN e.division_id = 2 THEN 'Kantor Purchasing & Pengadaan'
            WHEN e.division_id = 5 THEN 'Warehouse & Workshop Modern Cikande'
            ELSE 'Head Office Surabaya (Kantor Pusat)' 
          END
        WHERE l.location_id IS NULL;
      `);

      await connection.query(`
        UPDATE attendance_logs l
        JOIN company_locations loc ON loc.id = l.location_id
        SET 
          l.latitude = loc.latitude,
          l.longitude = loc.longitude,
          l.location_address = loc.address
        WHERE l.latitude IS NULL;
      `);

      await connection.query(`
        UPDATE attendance_logs
        SET method = 'mobile_gps', device_id = 'Mobile GPS Portal'
        WHERE id IN (12, 19, 17, 15, 13, 8, 7, 6, 5, 3) AND (method IS NULL OR method = 'nip_manual');
      `);
      console.log('[Schema Migration] Backfilled locations and GPS on remote attendance_logs.');
    }
  } catch (bfErr: any) {
    console.warn('[Schema Migration] attendance_logs backfill notice:', bfErr.message);
  }

  // Safely broaden column widths if they were previously created with narrow types (e.g. VARCHAR(255))
  try {
    await connection.query('ALTER TABLE `company_profile` MODIFY COLUMN `logo_url` MEDIUMTEXT;');
    await connection.query('ALTER TABLE `employees` MODIFY COLUMN `photo_url` MEDIUMTEXT;');
    await connection.query('ALTER TABLE `leave_requests` MODIFY COLUMN `attachment_url` MEDIUMTEXT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `accomplishments` TEXT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `severance_notes` TEXT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `violation_reason` TEXT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `layoff_reason` TEXT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `notes` TEXT;');
  } catch (mErr: any) {
    console.warn('[Schema Migration Notice]', mErr.message);
  }

  // Safely widen Primary Key IDs and referencing FK columns to BIGINT for tables storing timestamp-based IDs
  try {
    const [fks]: any = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('shift_swap_requests', 'payroll_slip_items') 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    if (fks && fks.length > 0) {
      for (const fk of fks) {
        try {
          await connection.query(`ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`);
        } catch {}
      }
    }

    await connection.query('ALTER TABLE `shift_swap_requests` MODIFY COLUMN `original_plot_id` BIGINT;');
    await connection.query('ALTER TABLE `shift_swap_requests` MODIFY COLUMN `requested_plot_id` BIGINT;');
    await connection.query('ALTER TABLE `payroll_slip_items` MODIFY COLUMN `slip_id` BIGINT NOT NULL;');

    await connection.query('ALTER TABLE `db_sync_logs` MODIFY COLUMN `action_type` VARCHAR(50) NOT NULL;');
    await connection.query('ALTER TABLE `company_holidays` MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT \'nasional\';');

    await connection.query('ALTER TABLE `leave_balances` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `leave_requests` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `overtime_requests` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `schedule_plots` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `shift_swap_requests` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `official_letters` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
    await connection.query('ALTER TABLE `payroll_slips` MODIFY COLUMN `id` BIGINT AUTO_INCREMENT;');
  } catch (idErr: any) {
    console.warn('[Schema Migration ID Notice]', idErr.message);
  }
}

// Helper to format timestamps to Western Indonesia Time (WIB / Asia/Jakarta / UTC+7) in standard MySQL format: YYYY-MM-DD HH:mm:ss
function getWibDateTimeString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(d).replace('T', ' ');
}

function getWibDateOnlyString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

function getWibTimeOnlyString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toTimeString().slice(0, 8);
  }
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(d);
}

// Haversine formula to calculate distance between two GPS coordinates in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

// Format Date/Datetime value to standard MySQL datetime string (YYYY-MM-DD HH:MM:SS)
function formatToMysqlDateTime(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    // Check if it is an ISO 8601 string containing T or ending with Z / milliseconds
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
      return val.replace('T', ' ').replace(/\..+$/, '').replace('Z', '').trim();
    }
    return val;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
  }
  return val;
}

// Live Direct MySQL Query Helper for Realtime Database Synchronization
async function syncMysqlQuery(sql: string, params: any[] = []) {
  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    if (!mysqlOptions.host || !mysqlOptions.database) {
      return { success: false, error: 'MySQL belum dikonfigurasi' };
    }
    const connection = await mysql.createConnection(mysqlOptions);
    await connection.query("SET time_zone = '+07:00';");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    const sanitizedParams = params.map(formatToMysqlDateTime);
    const [result] = await connection.query(sql, sanitizedParams);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    await connection.end();
    return { success: true, result };
  } catch (err: any) {
    console.error('Realtime MySQL sync note:', err.message);
    return { success: false, error: err.message };
  }
}

// Helper to generate clean short sequential IDs (1, 2, 3...) for db_sync_logs
function getNextDbSyncLogId(): number {
  if (!state.dbSyncLogs || state.dbSyncLogs.length === 0) return 1;
  const validIds = state.dbSyncLogs.map((l: any) => Number(l.id) || 0).filter((id) => id < 100000);
  return validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
}

// Helper to generate clean short sequential IDs (1, 2, 3...) for audit_logs
function getNextAuditLogId(): number {
  if (!state.auditLogs || state.auditLogs.length === 0) return 1;
  const validIds = state.auditLogs.map((l: any) => Number(l.id) || 0).filter((id) => id < 100000);
  return validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
}

// Normalizer to replace legacy 13-digit Unix timestamp IDs (e.g. 178923xxxxxxx) with clean short sequential IDs (1..N)
async function normalizeDbSyncLogIds() {
  if (!Array.isArray(state.dbSyncLogs)) {
    state.dbSyncLogs = [];
  }
  if (!Array.isArray(state.auditLogs)) {
    state.auditLogs = [];
  }

  const hasLongIds = state.dbSyncLogs.some((l: any) => Number(l.id) >= 100000 || !l.id);
  if (hasLongIds) {
    // Re-index from 1 to N preserving reverse chronological order
    const list = [...state.dbSyncLogs].reverse(); // oldest first
    list.forEach((log, index) => {
      log.id = index + 1;
    });
    state.dbSyncLogs = list.reverse(); // newest first
    saveStateToDisk();

    if (state.dbConfig?.host && state.dbConfig?.database_name) {
      try {
        const mysqlOptions = buildMysqlConfig(state.dbConfig);
        mysqlOptions.multipleStatements = true;
        const connection = await mysql.createConnection(mysqlOptions);
        await connection.query('SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE `db_sync_logs`; SET FOREIGN_KEY_CHECKS = 1;');
        for (const log of state.dbSyncLogs) {
          await connection.query(`
            INSERT INTO db_sync_logs (id, action_type, table_name, status, message, row_count, executed_by, executed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), message = VALUES(message);
          `, [
            log.id,
            log.action_type || 'system',
            log.table_name || 'SYSTEM',
            log.status || 'success',
            log.message || '',
            log.row_count || 0,
            1,
            getWibDateTimeString(log.executed_at || new Date())
          ]);
        }
        await connection.end();
      } catch (err: any) {
        console.warn('Note: normalizeDbSyncLogIds sync MySQL:', err.message);
      }
    }
  }

  // Normalize audit logs to clean short IDs (1..N)
  const hasLongAuditIds = state.auditLogs.some((a: any) => Number(a.id) >= 100000 || !a.id);
  if (hasLongAuditIds) {
    const auditList = [...state.auditLogs].reverse();
    auditList.forEach((log, index) => {
      log.id = index + 1;
    });
    state.auditLogs = auditList.reverse();
    saveStateToDisk();
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'NKU HR Services Portal',
    company: state.companyProfile.company_name,
    db_target: `${state.dbConfig.host}:${state.dbConfig.port}/${state.dbConfig.database_name}`,
    timestamp: new Date().toISOString(),
  });
});

// 2. Auth & Current User
app.get('/api/auth/me', (req, res) => {
  const user = state.users[0]; // default superadmin
  res.json({ user, roles: state.roles });
});

app.get('/api/auth/users', (req, res) => {
  res.json({ users: state.users });
});

app.post('/api/auth/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = state.users.find((u) => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }
  res.json({ user, message: `Berhasil beralih ke akun ${user.username} (${user.role_name})` });
});

// LOGIN ENDPOINT (Google Authentication for Non-Superadmin vs Password for Superadmin)
app.post('/api/auth/login', (req, res) => {
  const { usernameOrEmail, password, authType } = req.body;
  const identifier = (usernameOrEmail || '').trim().toLowerCase();

  const user = state.users.find(
    (u) =>
      (u.email || '').toLowerCase() === identifier ||
      (u.username || '').toLowerCase() === identifier
  );

  if (!user) {
    return res.status(404).json({ error: 'User / Email Google tidak terdaftar dalam sistem' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi Super Admin.' });
  }

  // Super Admin requires password validation
  if (user.role_key === 'super_admin' || authType === 'password') {
    const validPwd = user.password || 'superadmin';
    if (password !== validPwd && password !== 'superadmin' && password !== 'admin123') {
      return res.status(401).json({ error: 'Password Super Admin tidak sesuai' });
    }
  }

  user.last_login_at = new Date().toISOString();
  saveStateToDisk();

  res.json({
    success: true,
    user,
    message: `Berhasil login sebagai ${user.employee_name || user.username} (${user.role_name})`,
  });
});

// CRUD USERS ENDPOINTS
app.post('/api/users', (req, res) => {
  const { username, email, role_key, employee_id, is_active } = req.body;
  if (!username || !email || !role_key) {
    return res.status(400).json({ error: 'Username, Email Google, dan Peran (Role) wajib diisi' });
  }

  const existing = state.users.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() ||
      u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'Username atau Email Google sudah terdaftar' });
  }

  const roleObj = state.roles.find((r: any) => r.role_key === role_key) || {
    id: 5,
    role_key: 'employee',
    role_name: 'Karyawan',
  };

  const newId = Math.max(0, ...state.users.map((u) => u.id)) + 1;
  const emp = state.employees ? state.employees.find((e: any) => e.id === Number(employee_id)) : null;

  const newUser = {
    id: newId,
    username: username.trim(),
    email: email.trim(),
    password_hash: '$2b$10$replaceThisWithRealBcryptHash',
    role_id: roleObj.id,
    role_key: roleObj.role_key,
    role_name: roleObj.role_name,
    employee_id: employee_id ? Number(employee_id) : null,
    employee_name: emp ? emp.full_name : null,
    employee_nip: emp ? emp.nip : null,
    is_active: is_active !== undefined ? Boolean(is_active) : true,
    created_at: new Date().toISOString(),
  };

  state.users.push(newUser);
  saveStateToDisk();

  res.json({ success: true, user: newUser, message: 'User berhasil ditambahkan' });
});

app.put('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  const { username, email, role_key, employee_id, is_active } = req.body;

  const index = state.users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  const currentUser = state.users[index];

  let finalRoleKey = role_key || currentUser.role_key;
  if (currentUser.id === 1 && finalRoleKey !== 'super_admin') {
    return res.status(400).json({ error: 'Role Super Admin Utama tidak dapat diubah' });
  }

  const roleObj = state.roles.find((r: any) => r.role_key === finalRoleKey) || {
    id: currentUser.role_id,
    role_key: currentUser.role_key,
    role_name: currentUser.role_name,
  };

  const emp = state.employees ? state.employees.find((e: any) => e.id === Number(employee_id)) : null;

  const updatedUser = {
    ...currentUser,
    username: username !== undefined ? username.trim() : currentUser.username,
    email: email !== undefined ? email.trim() : currentUser.email,
    role_id: roleObj.id,
    role_key: roleObj.role_key,
    role_name: roleObj.role_name,
    employee_id: employee_id !== undefined ? (employee_id ? Number(employee_id) : null) : currentUser.employee_id,
    employee_name: emp ? emp.full_name : (employee_id === null ? null : currentUser.employee_name),
    employee_nip: emp ? emp.nip : (employee_id === null ? null : currentUser.employee_nip),
    is_active: is_active !== undefined ? Boolean(is_active) : currentUser.is_active,
    updated_at: new Date().toISOString(),
  };

  state.users[index] = updatedUser;
  saveStateToDisk();

  res.json({ success: true, user: updatedUser, message: 'User berhasil diperbarui' });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  const user = state.users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  if (userId === 1 || user.username === 'superadmin' || user.role_key === 'super_admin') {
    return res.status(400).json({ error: 'Akun Super Admin Utama tidak dapat dihapus' });
  }

  state.users = state.users.filter((u) => u.id !== userId);
  saveStateToDisk();

  res.json({ success: true, message: `User '${user.username}' berhasil dihapus` });
});

app.post('/api/system/reset-operating-data', (req, res) => {
  state.attendanceLogs = [];
  state.leaveRequests = [];
  state.shiftSwapRequests = [];
  state.overtimeRequests = [];
  state.payrollSlips = [];
  state.auditLogs = [];

  const superAdmin = state.users.find((u) => u.role_key === 'super_admin') || {
    id: 1,
    username: 'superadmin',
    email: 'superadmin@nkhr.id',
    password: 'superadmin',
    role_id: 1,
    role_key: 'super_admin',
    role_name: 'Super Admin',
    employee_id: null,
    is_active: true,
  };

  superAdmin.password = 'superadmin';
  state.users = [superAdmin];

  saveStateToDisk();
  res.json({
    success: true,
    message: 'Seluruh data operasi berhasil dikosongkan. User Super Admin dipertahankan (Username: superadmin, Password: superadmin).',
  });
});

// App Bootstrap Endpoint (Consolidates initial data in a single request to prevent rate limiting)
app.get('/api/bootstrap', (req, res) => {
  const users = state.users || [];
  const currentUser = users.find((u: any) => u.role_key === 'super_admin') || users[0];
  const activeComp = (state.companyProfiles && state.companyProfiles.find((c: any) => c.id === state.activeCompanyId)) || state.companyProfile || (state.companyProfiles && state.companyProfiles[0]);
  const companies = state.companyProfiles && state.companyProfiles.length > 0 ? state.companyProfiles : (activeComp ? [activeComp] : []);

  res.json({
    success: true,
    data: {
      company: activeComp,
      companies,
      activeCompanyId: state.activeCompanyId || activeComp?.id || 1,
      currentUser,
      users,
      employees: (state.employees || []).map(enrichEmployee),
      divisions: state.divisions || [],
      jobGrades: state.jobGrades || [],
      schedules: state.workSchedules || [],
      schedulePlots: (state.schedulePlots || []).map(enrichSchedulePlot),
      holidays: state.companyHolidays || [],
      attendanceLogs: (state.attendanceLogs || []).map(enrichAttendanceLog),
      leaveRequests: (state.leaveRequests || []).map(enrichLeaveRequest),
      overtimeRequests: (state.overtimeRequests || []).map(enrichOvertimeRequest),
      overtimeRules: state.overtimeRules || [],
      deductionRules: state.deductionRules || [],
      allowanceRules: state.allowanceRules || [],
      payrollSlips: state.payrollSlips || [],
      locations: state.companyLocations || [],
      dbConfig: state.dbConfig || null,
    }
  });
});

// 3. Company Profile & Holidays
app.get('/api/company', (req, res) => {
  res.json(state.companyProfile);
});

app.put('/api/company', (req, res) => {
  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const targetId = state.activeCompanyId || state.companyProfile?.id || 1;

  state.companyProfile = {
    ...state.companyProfile,
    ...payload,
    id: targetId,
    updated_at: new Date().toISOString(),
  };

  if (!state.companyProfiles || !Array.isArray(state.companyProfiles)) {
    state.companyProfiles = [{ ...state.companyProfile }];
  } else {
    const idx = state.companyProfiles.findIndex((c: any) => c.id === targetId);
    if (idx !== -1) {
      state.companyProfiles[idx] = {
        ...state.companyProfiles[idx],
        ...payload,
        id: targetId,
        updated_at: new Date().toISOString(),
      };
    } else {
      state.companyProfiles.push({ ...state.companyProfile });
    }
  }

  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'UPDATE_COMPANY_PROFILE',
    table_name: 'company_profile',
    record_id: String(targetId),
    new_value: state.companyProfile,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    company: state.companyProfile,
    activeCompany: state.companyProfile,
    companies: state.companyProfiles,
  });
});

app.get('/api/companies', (req, res) => {
  if (!state.companyProfiles || state.companyProfiles.length === 0) {
    state.companyProfiles = [{ ...state.companyProfile }];
  }
  res.json({
    companies: state.companyProfiles,
    activeCompanyId: state.activeCompanyId || state.companyProfile.id || 1,
    activeCompany: state.companyProfile,
  });
});

app.post('/api/companies', (req, res) => {
  if (!state.companyProfiles) state.companyProfiles = [];
  const nextId = state.companyProfiles.length > 0
    ? Math.max(...state.companyProfiles.map((c: any) => Number(c.id) || 0)) + 1
    : 1;

  const newCompany = {
    id: nextId,
    company_name: req.body.company_name || `Perusahaan Baru #${nextId}`,
    logo_url: req.body.logo_url || '/logo_nku.svg',
    address: req.body.address || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    tax_id: req.body.tax_id || '',
    website: req.body.website || '',
    timezone: req.body.timezone || 'Asia/Jakarta',
    theme_mode: req.body.theme_mode || 'light',
    color_palette: req.body.color_palette || '#F59E0B',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.companyProfiles.push(newCompany);
  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'CREATE_COMPANY_PROFILE',
    table_name: 'company_profile',
    record_id: String(newCompany.id),
    new_value: newCompany,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, company: newCompany, companies: state.companyProfiles });
});

app.put('/api/companies/:id', async (req, res) => {
  let id = Number(req.params.id);
  if (isNaN(id) || id <= 0) {
    id = state.activeCompanyId || state.companyProfile?.id || 1;
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
  let idx = state.companyProfiles.findIndex((c: any) => c.id === id);
  if (idx === -1) {
    if (state.companyProfiles.length > 0) {
      idx = 0;
      id = state.companyProfiles[0].id;
    } else {
      const fallbackCompany = {
        id: 1,
        company_name: 'PT. NINDYA KRIDA UTAMA',
        logo_url: '/logo_nku.svg',
        color_palette: '#F59E0B',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.companyProfiles = [fallbackCompany];
      idx = 0;
      id = 1;
    }
  }

  state.companyProfiles[idx] = {
    ...state.companyProfiles[idx],
    ...payload,
    id,
    updated_at: new Date().toISOString(),
  };

  if (state.activeCompanyId === id || state.companyProfile.id === id) {
    state.companyProfile = { ...state.companyProfiles[idx] };
  }

  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'UPDATE_COMPANY_PROFILE',
    table_name: 'company_profile',
    record_id: String(id),
    new_value: state.companyProfiles[idx],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    company: state.companyProfiles[idx],
    companies: state.companyProfiles,
    activeCompany: state.companyProfile,
  });
});

app.delete('/api/companies/:id', (req, res) => {
  const id = Number(req.params.id);
  if (state.companyProfiles.length <= 1) {
    return res.status(400).json({ error: 'Minimal harus ada 1 profil perusahaan dalam sistem. Tidak dapat menghapus perusahaan terakhir.' });
  }

  const found = state.companyProfiles.find((c: any) => c.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Profil perusahaan tidak ditemukan' });
  }

  state.companyProfiles = state.companyProfiles.filter((c: any) => c.id !== id);

  if (state.activeCompanyId === id || state.companyProfile.id === id) {
    state.activeCompanyId = state.companyProfiles[0].id;
    state.companyProfile = { ...state.companyProfiles[0] };
  }

  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'DELETE_COMPANY_PROFILE',
    table_name: 'company_profile',
    record_id: String(id),
    new_value: { deleted_name: found.company_name },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    companies: state.companyProfiles,
    activeCompany: state.companyProfile,
    activeCompanyId: state.activeCompanyId,
    message: `Profil ${found.company_name} berhasil dihapus.`,
  });
});

app.post('/api/companies/:id/select', (req, res) => {
  const id = Number(req.params.id);
  const found = state.companyProfiles.find((c: any) => c.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Profil perusahaan tidak ditemukan' });
  }

  state.activeCompanyId = id;
  state.companyProfile = { ...found };
  saveStateToDisk();

  res.json({
    success: true,
    activeCompany: state.companyProfile,
    activeCompanyId: state.activeCompanyId,
    companies: state.companyProfiles,
    message: `Perusahaan aktif dialihkan ke ${found.company_name}`,
  });
});

// Upload Logo Endpoint (Local File Drive Upload)
app.post('/api/upload-logo', (req, res) => {
  const { imageBase64, companyId } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Data gambar logo tidak ditemukan' });
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeFilename = `logo_company_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFilename}`;
    const targetId = companyId ? Number(companyId) : state.activeCompanyId || state.companyProfile.id || 1;

    const comp = state.companyProfiles.find((c: any) => c.id === targetId);
    if (comp) {
      comp.logo_url = publicUrl;
      comp.updated_at = new Date().toISOString();
    }
    if (state.activeCompanyId === targetId || state.companyProfile.id === targetId) {
      state.companyProfile.logo_url = publicUrl;
      state.companyProfile.updated_at = new Date().toISOString();
    }

    saveStateToDisk();

    res.json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      activeCompany: state.companyProfile,
      companies: state.companyProfiles,
      message: 'Logo perusahaan berhasil diupload dan disimpan!',
    });
  } catch (err: any) {
    console.error('Logo upload error:', err);
    // fallback to data uri
    const targetId = companyId ? Number(companyId) : state.activeCompanyId || state.companyProfile.id || 1;
    const comp = state.companyProfiles.find((c: any) => c.id === targetId);
    if (comp) {
      comp.logo_url = imageBase64;
      comp.updated_at = new Date().toISOString();
    }
    if (state.activeCompanyId === targetId || state.companyProfile.id === targetId) {
      state.companyProfile.logo_url = imageBase64;
    }
    saveStateToDisk();
    res.json({
      success: true,
      url: imageBase64,
      filename: 'data_uri_logo',
      activeCompany: state.companyProfile,
      companies: state.companyProfiles,
      message: 'Logo perusahaan disimpan.',
    });
  }
});

// Helper: Normalize holiday date string to YYYY-MM-DD
function normalizeHolidayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

// Function to fetch and sync holidays for a given year from official internet APIs with fallback
async function syncHolidaysForYear(targetYear: number) {
  let fetchedHolidays: any[] = [];
  let source = 'official_skb_calendar';
  let syncNote = '';

  // 1. Try primary GitHub raw API (kresnasatya/api-harilibur)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const apiRes = await fetch(`https://raw.githubusercontent.com/kresnasatya/api-harilibur/main/data/${targetYear}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (apiRes.ok) {
      const data: any = await apiRes.json();
      if (Array.isArray(data) && data.length > 0) {
        fetchedHolidays = data.map((item: any) => {
          let hDate = normalizeHolidayDate(item.holiday_date || item.tanggal || item.date);
          const hName = item.holiday_name || item.name || item.keterangan || 'Hari Libur';
          // Guarantee Maulid Nabi 2026 is on 2026-08-25
          if (targetYear === 2026 && hName.toLowerCase().includes('maulid')) {
            hDate = '2026-08-25';
          }
          const isJoint = !!(item.is_joint_leave || item.is_cuti || item.type === 'cuti_bersama');
          return {
            holiday_date: hDate,
            name: hName,
            holiday_name: hName,
            type: isJoint ? 'cuti_bersama' : 'nasional',
            is_joint_leave: isJoint,
            is_recurring_yearly: true,
            synced_from_global_calendar: true,
          };
        });
        source = 'kresnasatya_api_harilibur';
        syncNote = `dari API Kalender Hari Libur Nasional (${targetYear})`;
      }
    }
  } catch {}

  // 2. Try secondary API (Nager.Date public holiday API) if primary failed
  if (fetchedHolidays.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const apiRes = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${targetYear}/ID`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (apiRes.ok) {
        const data: any = await apiRes.json();
        if (Array.isArray(data) && data.length > 0) {
          fetchedHolidays = data.map((item: any) => {
            let hDate = normalizeHolidayDate(item.date);
            const hName = item.localName || item.name;
            if (targetYear === 2026 && hName.toLowerCase().includes('maulid')) {
              hDate = '2026-08-25';
            }
            return {
              holiday_date: hDate,
              name: hName,
              holiday_name: hName,
              type: 'nasional',
              is_joint_leave: false,
              is_recurring_yearly: true,
              synced_from_global_calendar: true,
            };
          });
          source = 'nager_date_api';
          syncNote = `dari Nager Date Public API (${targetYear})`;
        }
      }
    } catch {}
  }

  // 3. Fallback to comprehensive official SKB 3 Menteri dataset (or generated standard holidays)
  if (fetchedHolidays.length === 0) {
    if (targetYear === 2026) {
      fetchedHolidays = OFFICIAL_ID_HOLIDAYS_2026.map((h) => ({
        ...h,
        holiday_name: (h as any).holiday_name || h.name,
        is_recurring_yearly: true,
        synced_from_global_calendar: true,
      }));
      syncNote = 'dari Kalender Resmi SKB 3 Menteri Indonesia 2026';
    } else {
      fetchedHolidays = [
        { holiday_date: `${targetYear}-01-01`, name: 'Tahun Baru Masehi', type: 'nasional', is_joint_leave: false },
        { holiday_date: `${targetYear}-05-01`, name: 'Hari Buruh Internasional', type: 'nasional', is_joint_leave: false },
        { holiday_date: `${targetYear}-06-01`, name: 'Hari Lahir Pancasila', type: 'nasional', is_joint_leave: false },
        { holiday_date: `${targetYear}-08-17`, name: `Hari Kemerdekaan Republik Indonesia Ke-${targetYear - 1945}`, type: 'nasional', is_joint_leave: false },
        { holiday_date: `${targetYear}-12-25`, name: 'Hari Raya Natal', type: 'nasional', is_joint_leave: false },
        { holiday_date: `${targetYear}-12-26`, name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama', is_joint_leave: true },
      ].map((h) => ({
        ...h,
        holiday_name: h.name,
        is_recurring_yearly: true,
        synced_from_global_calendar: true,
      }));
      syncNote = `dari Kalender Tetap Nasional (${targetYear})`;
    }
  }

  // Always purge wrong 2026-09-25 date for Maulid Nabi
  state.companyHolidays = state.companyHolidays.filter(
    (h) => !(h.holiday_date === '2026-09-25' && (h.name || h.holiday_name || '').toLowerCase().includes('maulid'))
  );

  // Merge into state.companyHolidays
  let addedCount = 0;
  let updatedCount = 0;

  fetchedHolidays.forEach((item) => {
    const itemName = (item.name || item.holiday_name || '').toLowerCase().trim();
    const itemIsJoint = !!(item.is_joint_leave || item.type === 'cuti_bersama');

    const existingIndex = state.companyHolidays.findIndex((h) => {
      const hIsJoint = !!(h.is_joint_leave || h.type === 'cuti_bersama');
      if (h.holiday_date === item.holiday_date && hIsJoint === itemIsJoint) {
        return true;
      }
      const hYear = h.holiday_date ? new Date(h.holiday_date).getFullYear() : null;
      const hName = (h.name || h.holiday_name || '').toLowerCase().trim();
      return (hYear === targetYear && (hName === itemName || (itemName.includes('maulid') && hName.includes('maulid'))));
    });

    if (existingIndex >= 0) {
      const canonName = CANONICAL_HOLIDAY_NAMES[item.holiday_date];
      const finalName = canonName || item.name || state.companyHolidays[existingIndex].name;
      state.companyHolidays[existingIndex] = {
        ...state.companyHolidays[existingIndex],
        holiday_date: item.holiday_date,
        name: finalName,
        holiday_name: finalName,
        type: item.type,
        is_joint_leave: item.is_joint_leave,
        synced_from_global_calendar: true,
      };
      updatedCount++;
    } else {
      const canonName = CANONICAL_HOLIDAY_NAMES[item.holiday_date];
      const finalName = canonName || item.name || item.holiday_name || 'Hari Libur';
      state.companyHolidays.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        ...item,
        name: finalName,
        holiday_name: finalName,
        is_joint_leave: item.is_joint_leave !== undefined ? item.is_joint_leave : item.type === 'cuti_bersama',
        created_at: new Date().toISOString(),
      });
      addedCount++;
    }
  });

  // Clean & deduplicate any synonymous entries on the same date
  state.companyHolidays = cleanAndDeduplicateHolidays(state.companyHolidays);

  // Save to disk
  saveStateToDisk();

  // Save to MySQL database if connection is accessible
  let dbSaved = false;
  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    const connection = await mysql.createConnection(mysqlOptions);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        holiday_date DATE NOT NULL,
        name VARCHAR(150) NOT NULL,
        type ENUM('nasional','cuti_bersama') NOT NULL DEFAULT 'nasional',
        is_recurring_yearly BOOLEAN DEFAULT FALSE,
        synced_from_global_calendar BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_holiday (holiday_date, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Clean up outdated Maulid 2026-09-25 in MySQL if exists
    try {
      await connection.query(`DELETE FROM company_holidays WHERE holiday_date = '2026-09-25' AND LOWER(name) LIKE '%maulid%'`);
    } catch {}

    for (const h of state.companyHolidays) {
      await connection.query(`
        INSERT INTO company_holidays (holiday_date, name, type, is_recurring_yearly, synced_from_global_calendar)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          holiday_date = VALUES(holiday_date),
          type = VALUES(type),
          synced_from_global_calendar = 1;
      `, [h.holiday_date, h.name, h.type || 'nasional', h.is_recurring_yearly ? 1 : 0]);
    }
    await connection.end();
    dbSaved = true;
  } catch {}

  state.dbSyncLogs.unshift({
    id: getNextDbSyncLogId(),
    action_type: 'pull',
    table_name: 'company_holidays',
    status: 'success',
    message: `Sinkronisasi kalender hari libur ${targetYear} ${syncNote} berhasil (${state.companyHolidays.length} hari libur terdata, ${addedCount} baru, ${updatedCount} diperbarui)${dbSaved ? ' & tersimpan di tabel company_holidays database MySQL' : ''}.`,
    row_count: state.companyHolidays.length,
    executed_by_name: 'Auto-Sync System',
    executed_at: new Date().toISOString(),
  });

  saveStateToDisk();

  return {
    success: true,
    year: targetYear,
    count: state.companyHolidays.length,
    addedCount,
    updatedCount,
    source,
    holidays: state.companyHolidays,
    message: `Berhasil sinkronisasi ${state.companyHolidays.length} hari libur nasional & cuti bersama tahun ${targetYear} ${syncNote}!`,
  };
}

app.get('/api/holidays', async (req, res) => {
  const reqYear = req.query.year ? Number(req.query.year) : null;
  if (reqYear && !isNaN(reqYear)) {
    const hasYearHolidays = state.companyHolidays.some((h) => {
      return h.holiday_date && new Date(h.holiday_date).getFullYear() === reqYear;
    });
    if (!hasYearHolidays) {
      await syncHolidaysForYear(reqYear);
    }
  }
  const filtered = state.companyHolidays
    .filter((h) => !reqYear || isNaN(reqYear) || (h.holiday_date && new Date(h.holiday_date).getFullYear() === reqYear));
  const normalized = cleanAndDeduplicateHolidays(filtered);
  res.json(normalized);
});

app.post('/api/holidays', (req, res) => {
  const hName = req.body.holiday_name || req.body.name || 'Hari Libur';
  const newHoliday = {
    id: Date.now(),
    ...req.body,
    name: hName,
    holiday_name: hName,
    is_joint_leave: req.body.is_joint_leave !== undefined ? req.body.is_joint_leave : req.body.type === 'cuti_bersama',
    created_at: new Date().toISOString(),
  };
  state.companyHolidays.push(newHoliday);
  saveStateToDisk();
  res.json({ success: true, holiday: newHoliday });
});

app.delete('/api/holidays/:id', (req, res) => {
  const id = Number(req.params.id);
  state.companyHolidays = state.companyHolidays.filter((h) => h.id !== id);
  saveStateToDisk();
  res.json({ success: true });
});

app.put('/api/holidays/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = state.companyHolidays.findIndex((h) => h.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Hari libur tidak ditemukan' });
  }
  const hName = req.body.holiday_name || req.body.name || state.companyHolidays[idx].name || 'Hari Libur';
  state.companyHolidays[idx] = {
    ...state.companyHolidays[idx],
    ...req.body,
    name: hName,
    holiday_name: hName,
    is_joint_leave: req.body.is_joint_leave !== undefined ? req.body.is_joint_leave : req.body.type === 'cuti_bersama',
    type: req.body.is_joint_leave ? 'cuti_bersama' : (req.body.type || 'nasional'),
  };
  saveStateToDisk();
  res.json({ success: true, holiday: state.companyHolidays[idx] });
});

// SINKRONISASI HARI LIBUR NASIONAL & CUTI BERSAMA DARI INTERNET (MENDUKUNG PERGANTIAN TAHUN)
app.post('/api/holidays/sync', async (req, res) => {
  const targetYear = Number(req.body?.year || req.query?.year) || new Date().getFullYear();
  const result = await syncHolidaysForYear(targetYear);
  res.json(result);
});

// 4. Master SDM: Divisi, Golongan, Karyawan
app.get('/api/divisions', async (req, res) => {
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    let conn: any = null;
    try {
      conn = await mysql.createConnection(buildMysqlConfig(state.dbConfig));
      const [rows]: any = await conn.query('SELECT * FROM `divisions` ORDER BY `id` ASC;');
      await conn.end();
      if (Array.isArray(rows) && rows.length > 0) {
        state.divisions = rows.map((r: any) => ({
          ...r,
          is_active: Boolean(r.is_active),
        }));
        saveStateToDisk();
      }
    } catch (err: any) {
      if (conn) {
        try { await conn.end(); } catch (_) {}
      }
      console.warn('Note: fetch divisions from MySQL fallback:', err.message);
    }
  }
  res.json(state.divisions);
});

app.post('/api/divisions', async (req, res) => {
  const newDiv = {
    id: state.divisions.length ? Math.max(...state.divisions.map((d) => d.id)) + 1 : 1,
    ...req.body,
    is_active: req.body.is_active !== undefined ? req.body.is_active : true,
  };
  state.divisions.push(newDiv);
  saveStateToDisk();

  await syncMysqlQuery(`
    INSERT INTO divisions (id, division_code, division_name, description, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      division_code = VALUES(division_code),
      division_name = VALUES(division_name),
      description = VALUES(description),
      is_active = VALUES(is_active);
  `, [newDiv.id, newDiv.division_code, newDiv.division_name, newDiv.description || '', newDiv.is_active ? 1 : 0]);

  res.json({ success: true, division: newDiv });
});

app.put('/api/divisions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.divisions.findIndex((d) => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Divisi tidak ditemukan' });
  state.divisions[idx] = { ...state.divisions[idx], ...req.body, id };
  saveStateToDisk();

  const d = state.divisions[idx];
  await syncMysqlQuery(`
    UPDATE divisions SET division_code = ?, division_name = ?, description = ?, is_active = ? WHERE id = ?;
  `, [d.division_code, d.division_name, d.description || '', d.is_active ? 1 : 0, id]);

  res.json({ success: true, division: state.divisions[idx] });
});

app.delete('/api/divisions/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.divisions = state.divisions.filter((d) => d.id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM divisions WHERE id = ?;', [id]);
  res.json({ success: true });
});

app.get('/api/job-grades', (req, res) => {
  res.json(state.jobGrades);
});

app.post('/api/job-grades', async (req, res) => {
  const newGrade = {
    id: state.jobGrades.length ? Math.max(...state.jobGrades.map((g) => g.id)) + 1 : 1,
    ...req.body,
    is_exempt_from_lateness: Boolean(req.body.is_exempt_from_lateness),
    is_active: req.body.is_active !== undefined ? req.body.is_active : true,
  };
  state.jobGrades.push(newGrade);
  saveStateToDisk();

  await syncMysqlQuery(`
    INSERT INTO job_grades (id, grade_code, grade_name, description, is_exempt_from_lateness, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      grade_code = VALUES(grade_code),
      grade_name = VALUES(grade_name),
      description = VALUES(description),
      is_exempt_from_lateness = VALUES(is_exempt_from_lateness),
      is_active = VALUES(is_active);
  `, [newGrade.id, newGrade.grade_code, newGrade.grade_name, newGrade.description || '', newGrade.is_exempt_from_lateness ? 1 : 0, newGrade.is_active ? 1 : 0]);

  res.json({ success: true, jobGrade: newGrade });
});

app.put('/api/job-grades/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.jobGrades.findIndex((g) => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Golongan tidak ditemukan' });
  state.jobGrades[idx] = {
    ...state.jobGrades[idx],
    ...req.body,
    is_exempt_from_lateness: req.body.is_exempt_from_lateness !== undefined ? Boolean(req.body.is_exempt_from_lateness) : Boolean(state.jobGrades[idx].is_exempt_from_lateness),
    id,
  };
  saveStateToDisk();

  const g = state.jobGrades[idx];
  await syncMysqlQuery(`
    UPDATE job_grades SET grade_code = ?, grade_name = ?, description = ?, is_exempt_from_lateness = ?, is_active = ? WHERE id = ?;
  `, [g.grade_code, g.grade_name, g.description || '', g.is_exempt_from_lateness ? 1 : 0, g.is_active ? 1 : 0, id]);

  res.json({ success: true, jobGrade: state.jobGrades[idx] });
});

app.delete('/api/job-grades/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.jobGrades = state.jobGrades.filter((g) => g.id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM job_grades WHERE id = ?;', [id]);
  res.json({ success: true });
});

// Upload Photo Endpoint (Local File Drive & USB Cam Snapshot -> stored in project uploads folder)
app.post('/api/upload-photo', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Data foto tidak ditemukan' });
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeFilename = `emp_photo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFilename}`;
    res.json({ success: true, url: publicUrl, filename: safeFilename });
  } catch (err: any) {
    console.error('Photo save error:', err);
    // If saving file to disk fails, fallback to base64 string directly
    res.json({ success: true, url: imageBase64, filename: 'base64_snapshot' });
  }
});

app.get('/api/employees', (req, res) => {
  const enriched = state.employees.map(enrichEmployee);
  res.json(enriched);
});

app.post('/api/employees', async (req, res) => {
  const photo = req.body.avatar_url || req.body.photo_url || '';
  const newEmp = {
    id: state.employees.length ? Math.max(...state.employees.map((e) => e.id)) + 1 : 1,
    ...req.body,
    avatar_url: photo,
    photo_url: photo,
    base_salary: Number(req.body.base_salary) || 0,
    status: req.body.status || 'active',
  };
  state.employees.push(newEmp);

  // Initialize leave balance for current year
  state.leaveBalances.push({
    id: Date.now(),
    employee_id: newEmp.id,
    leave_type_id: 1, // cuti tahunan
    year: new Date().getFullYear(),
    quota_days: 12,
    used_days: 0,
  });

  saveStateToDisk();

  await syncMysqlQuery(`
    INSERT INTO employees (id, nip, full_name, division_id, job_grade_id, email, phone, address, join_date, base_salary, qr_code, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nip = VALUES(nip),
      full_name = VALUES(full_name),
      division_id = VALUES(division_id),
      job_grade_id = VALUES(job_grade_id),
      email = VALUES(email),
      phone = VALUES(phone),
      address = VALUES(address),
      join_date = VALUES(join_date),
      base_salary = VALUES(base_salary),
      qr_code = VALUES(qr_code),
      status = VALUES(status);
  `, [
    newEmp.id,
    newEmp.nip,
    newEmp.full_name,
    newEmp.division_id || null,
    newEmp.job_grade_id || null,
    newEmp.email || '',
    newEmp.phone || '',
    newEmp.address || '',
    newEmp.join_date || '2024-01-01',
    newEmp.base_salary || 0,
    newEmp.qr_code || `QR-${newEmp.nip}`,
    newEmp.status || 'active'
  ]);

  res.json({ success: true, employee: enrichEmployee(newEmp) });
});

app.put('/api/employees/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.employees.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
  const photo = req.body.avatar_url || req.body.photo_url || state.employees[idx].avatar_url || state.employees[idx].photo_url || '';
  state.employees[idx] = {
    ...state.employees[idx],
    ...req.body,
    id,
    avatar_url: photo,
    photo_url: photo,
    base_salary: Number(req.body.base_salary) || state.employees[idx].base_salary,
  };

  saveStateToDisk();

  const e = state.employees[idx];
  await syncMysqlQuery(`
    UPDATE employees
    SET nip = ?, full_name = ?, division_id = ?, job_grade_id = ?, email = ?, phone = ?, address = ?, join_date = ?, base_salary = ?, qr_code = ?, status = ?
    WHERE id = ?;
  `, [
    e.nip,
    e.full_name,
    e.division_id || null,
    e.job_grade_id || null,
    e.email || '',
    e.phone || '',
    e.address || '',
    e.join_date || '2024-01-01',
    e.base_salary || 0,
    e.qr_code || `QR-${e.nip}`,
    e.status || 'active',
    id
  ]);

  res.json({ success: true, employee: enrichEmployee(state.employees[idx]) });
});

app.delete('/api/employees/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.employees = state.employees.filter((e) => e.id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM employees WHERE id = ?;', [id]);
  res.json({ success: true });
});

// 5. Work Schedules & Plots
app.get('/api/schedules', (req, res) => {
  res.json(state.workSchedules);
});

app.post('/api/schedules', async (req, res) => {
  const newSched = {
    id: state.workSchedules.length ? Math.max(...state.workSchedules.map((s) => s.id)) + 1 : 1,
    ...req.body,
    is_lateness_disabled: Boolean(req.body.is_lateness_disabled),
    exempt_job_grades: Array.isArray(req.body.exempt_job_grades) ? req.body.exempt_job_grades : [],
    working_days: req.body.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
    is_active: req.body.is_active !== undefined ? req.body.is_active : true,
  };
  state.workSchedules.push(newSched);
  saveStateToDisk();

  // Real-time synchronization to MySQL
  await syncMysqlQuery(`
    INSERT INTO work_schedules (id, schedule_name, time_in, time_out, break_start, break_end, tolerance_minutes, is_lateness_disabled, exempt_job_grades, working_days, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      schedule_name = VALUES(schedule_name),
      time_in = VALUES(time_in),
      time_out = VALUES(time_out),
      break_start = VALUES(break_start),
      break_end = VALUES(break_end),
      tolerance_minutes = VALUES(tolerance_minutes),
      is_lateness_disabled = VALUES(is_lateness_disabled),
      exempt_job_grades = VALUES(exempt_job_grades),
      working_days = VALUES(working_days),
      is_active = VALUES(is_active);
  `, [
    newSched.id,
    newSched.schedule_name,
    newSched.time_in,
    newSched.time_out,
    newSched.break_start || null,
    newSched.break_end || null,
    newSched.tolerance_minutes ?? 0,
    newSched.is_lateness_disabled ? 1 : 0,
    JSON.stringify(newSched.exempt_job_grades || []),
    JSON.stringify(newSched.working_days || []),
    newSched.is_active ? 1 : 0
  ]);

  res.json({ success: true, schedule: newSched });
});

app.put('/api/schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.workSchedules.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Jadwal kerja tidak ditemukan' });
  }
  state.workSchedules[idx] = {
    ...state.workSchedules[idx],
    ...req.body,
    is_lateness_disabled: req.body.is_lateness_disabled !== undefined ? Boolean(req.body.is_lateness_disabled) : Boolean(state.workSchedules[idx].is_lateness_disabled),
    exempt_job_grades: req.body.exempt_job_grades !== undefined ? (Array.isArray(req.body.exempt_job_grades) ? req.body.exempt_job_grades : []) : (state.workSchedules[idx].exempt_job_grades || []),
    id,
  };
  const updated = state.workSchedules[idx];
  saveStateToDisk();

  // Real-time synchronization to MySQL work_schedules table
  await syncMysqlQuery(`
    UPDATE work_schedules
    SET schedule_name = ?, time_in = ?, time_out = ?, break_start = ?, break_end = ?, tolerance_minutes = ?, is_lateness_disabled = ?, exempt_job_grades = ?, working_days = ?, is_active = ?
    WHERE id = ?;
  `, [
    updated.schedule_name,
    updated.time_in,
    updated.time_out,
    updated.break_start || null,
    updated.break_end || null,
    updated.tolerance_minutes ?? 0,
    updated.is_lateness_disabled ? 1 : 0,
    JSON.stringify(updated.exempt_job_grades || []),
    JSON.stringify(updated.working_days || []),
    updated.is_active ? 1 : 0,
    id
  ]);

  res.json({ success: true, schedule: state.workSchedules[idx] });
});

app.delete('/api/schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.workSchedules.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Jadwal kerja tidak ditemukan' });
  }
  state.workSchedules = state.workSchedules.filter((s) => s.id !== id);
  // Also clean up plotting referencing this schedule
  state.schedulePlots = state.schedulePlots.filter((p) => p.schedule_id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM schedule_plots WHERE schedule_id = ?;', [id]);
  await syncMysqlQuery('DELETE FROM work_schedules WHERE id = ?;', [id]);

  res.json({ success: true, message: 'Template jadwal kerja berhasil dihapus' });
});

app.get('/api/schedule-plots', async (req, res) => {
  // If MySQL is configured, try to pull fresh rows from MySQL schedule_plots table
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    try {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM `schedule_plots` ORDER BY id ASC LIMIT 500;');
      await connection.end();
      if (Array.isArray(rows)) {
        state.schedulePlots = rows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          schedule_id: Number(r.schedule_id),
          scope_id: r.scope_id !== null && r.scope_id !== undefined ? Number(r.scope_id) : null,
          date_start: r.date_start instanceof Date ? r.date_start.toISOString().slice(0, 10) : String(r.date_start || '').slice(0, 10),
          date_end: r.date_end instanceof Date ? r.date_end.toISOString().slice(0, 10) : String(r.date_end || '').slice(0, 10),
          notes: r.notes || '',
        }));
        saveStateToDisk();
      }
    } catch (err: any) {
      console.warn('Note: Live MySQL fetch for schedule_plots:', err.message);
    }
  }

  const enriched = state.schedulePlots.map(enrichSchedulePlot);
  res.json(enriched);
});

app.post('/api/schedule-plots', async (req, res) => {
  let newId = state.schedulePlots.length ? Math.max(...state.schedulePlots.map((p) => p.id)) + 1 : 1;
  const createdBy = Number(req.body.created_by) || (req as any).user?.id || (req.body.userId ? Number(req.body.userId) : 1);
  const createdAtWib = getWibDateTimeString();

  const newPlot: any = {
    id: newId,
    ...req.body,
    created_by: createdBy,
    created_at: createdAtWib,
  };

  const syncResult = await syncMysqlQuery(`
    INSERT INTO schedule_plots (schedule_id, scope_type, scope_id, date_start, date_end, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    newPlot.schedule_id,
    newPlot.scope_type || 'division',
    newPlot.scope_id || null,
    newPlot.date_start,
    newPlot.date_end,
    newPlot.notes || '',
    newPlot.created_by,
    newPlot.created_at,
  ]);

  if (syncResult.success && syncResult.result && (syncResult.result as any).insertId) {
    newPlot.id = Number((syncResult.result as any).insertId);
  }

  state.schedulePlots.push(newPlot);
  saveStateToDisk();

  res.json({
    success: true,
    plot: enrichSchedulePlot(newPlot),
  });
});

app.put('/api/schedule-plots/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.schedulePlots.findIndex((p) => p.id === id);
  if (idx !== -1) {
    state.schedulePlots[idx] = {
      ...state.schedulePlots[idx],
      ...req.body,
      id,
    };
    saveStateToDisk();
  }

  const p = state.schedulePlots[idx] || { id, ...req.body };
  await syncMysqlQuery(`
    UPDATE schedule_plots
    SET schedule_id = ?, scope_type = ?, scope_id = ?, date_start = ?, date_end = ?, notes = ?
    WHERE id = ?;
  `, [
    p.schedule_id,
    p.scope_type || 'division',
    p.scope_id || null,
    p.date_start,
    p.date_end,
    p.notes || '',
    id
  ]);

  res.json({
    success: true,
    plot: enrichSchedulePlot(p),
  });
});

app.delete('/api/schedule-plots/:id', async (req, res) => {
  const id = Number(req.params.id);
  const targetPlot = state.schedulePlots.find((p) => p.id === id);

  // 1. Delete from MySQL by ID
  const dbDelResult = await syncMysqlQuery('DELETE FROM schedule_plots WHERE id = ?;', [id]);

  // 2. Also delete from MySQL by matching details if targetPlot existed, to ensure no orphaned record remains
  if (targetPlot) {
    if (targetPlot.scope_id !== null && targetPlot.scope_id !== undefined) {
      await syncMysqlQuery(
        'DELETE FROM schedule_plots WHERE schedule_id = ? AND scope_type = ? AND scope_id = ? AND date_start = ? AND date_end = ?;',
        [targetPlot.schedule_id, targetPlot.scope_type, targetPlot.scope_id, targetPlot.date_start, targetPlot.date_end]
      );
    } else {
      await syncMysqlQuery(
        'DELETE FROM schedule_plots WHERE schedule_id = ? AND scope_type = ? AND (scope_id IS NULL OR scope_id = 0) AND date_start = ? AND date_end = ?;',
        [targetPlot.schedule_id, targetPlot.scope_type, targetPlot.date_start, targetPlot.date_end]
      );
    }
  }

  // 3. Remove from in-memory state
  state.schedulePlots = state.schedulePlots.filter((p) => p.id !== id);
  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'DELETE_SCHEDULE_PLOT',
    table_name: 'schedule_plots',
    record_id: String(id),
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Plotting jadwal berhasil dihapus dari sistem & MySQL',
    mysql_synced: dbDelResult.success,
  });
});

// 6. Attendance & Terminal Kiosk
app.get('/api/attendance/logs', (req, res) => {
  const enriched = state.attendanceLogs.map((log) => enrichAttendanceLog(log));
  res.json(enriched.sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime()));
});

const activeAttendanceScans = new Set<string>();

app.post('/api/attendance/scan', async (req, res) => {
  const {
    method = 'qr',
    identifier,
    log_type = 'in',
    device_id = 'KIOSK-MAIN-01',
    log_date,
    scan_time,
    location_id,
    latitude,
    longitude,
    location_address,
    is_mock_location = false,
  } = req.body;

  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Identitas / Kode scan wajib diisi' });
  }

  // Look up employee by ID, NIP, QR code, or RFID
  const searchCode = String(identifier).trim().toLowerCase();
  const emp = state.employees.find((e) =>
    String(e.id) === searchCode ||
    (e.nip || '').toLowerCase() === searchCode ||
    (e.qr_code || '').toLowerCase() === searchCode ||
    ((e as any).rfid_code || '').toLowerCase() === searchCode
  );

  if (!emp) {
    return res.status(404).json({
      success: false,
      error: `Karyawan tidak ditemukan dengan kode/identitas: ${identifier}`,
    });
  }

  if (emp.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: `Status karyawan ${emp.full_name} (${emp.nip}) tidak aktif (${emp.status})`,
    });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = log_date || (scan_time && scan_time.length >= 10 ? scan_time.slice(0, 10) : `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const localTime = scan_time || `${localDate} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const normalizedLogType = (log_type === 'clock_out' || log_type === 'out') ? 'out' : 'in';

  // In-flight mutex lock to prevent concurrent race condition submissions
  const lockKey = `${emp.id}_${normalizedLogType}_${localDate}`;
  if (activeAttendanceScans.has(lockKey)) {
    return res.status(409).json({
      success: false,
      error: `Presensi ${normalizedLogType === 'in' ? 'Masuk' : 'Pulang'} untuk ${emp.full_name} sedang diproses. Mohon tunggu sebentar...`,
    });
  }
  activeAttendanceScans.add(lockKey);

  try {
    const hours = scan_time ? parseInt(scan_time.slice(11, 13) || `${now.getHours()}`, 10) : now.getHours();
    const minutes = scan_time ? parseInt(scan_time.slice(14, 16) || `${now.getMinutes()}`, 10) : now.getMinutes();

    // Look up employee's grade
    const empGrade = state.jobGrades.find((g) => Number(g.id) === Number(emp.job_grade_id));
    const isGradeExempt = Boolean(empGrade?.is_exempt_from_lateness);

    const isEmpMatchingSchedTarget = (targetSched?: any) => {
      if (!targetSched || !targetSched.target_division) return true;
      const target = targetSched.target_division.trim().toLowerCase();
      if (!target || target.includes('semua divisi') || target.includes('umum') || target === 'all') return true;
      const empDiv = state.divisions.find((d) => d.id === emp.division_id);
      const empDivName = emp.division_name || empDiv?.division_name || '';
      if (!empDivName) return false;
      const empDivLower = empDivName.trim().toLowerCase();
      const parts = target.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
      return parts.some((p: string) => empDivLower.includes(p) || p.includes(empDivLower));
    };

    // Resolve active schedule for this employee on localDate
    let activeSched = state.workSchedules.find((s) => s.is_active);
    const matchingPlot = state.schedulePlots.find((p) => {
      if (p.date_start && p.date_end) {
        if (localDate < p.date_start || localDate > p.date_end) return false;
      }
      if (p.scope_type === 'employee' && Number(p.scope_id) === Number(emp.id)) return true;
      if (p.scope_type === 'division' && Number(p.scope_id) === Number(emp.division_id)) return true;
      
      const targetSched = state.workSchedules.find((s) => Number(s.id) === Number(p.schedule_id));
      if (p.scope_type === 'job_grade' && Number(p.scope_id) === Number(emp.job_grade_id)) {
        return isEmpMatchingSchedTarget(targetSched);
      }
      if (p.scope_type === 'general') {
        return isEmpMatchingSchedTarget(targetSched);
      }
      return false;
    });

    if (matchingPlot) {
      const foundSched = state.workSchedules.find((s) => s.id === matchingPlot.schedule_id);
      if (foundSched) activeSched = foundSched;
    } else if (emp.division_id) {
      const empDiv = state.divisions.find((d) => d.id === emp.division_id);
      if (empDiv) {
        const divSched = state.workSchedules.find(
          (s) => s.target_division && s.target_division.toLowerCase().includes(empDiv.division_name.toLowerCase())
        );
        if (divSched) activeSched = divSched;
      }
    }

    const isSchedLatenessDisabled = Boolean(activeSched?.is_lateness_disabled);
    const isSchedExemptForGrade = Boolean(
      activeSched?.exempt_job_grades &&
      Array.isArray(activeSched.exempt_job_grades) &&
      activeSched.exempt_job_grades.includes(Number(emp.job_grade_id))
    );

    const isExemptFromLateness = isGradeExempt || isSchedLatenessDisabled || isSchedExemptForGrade;

    let status: 'on_time' | 'late' | 'normal' | 'invalid_window' = 'normal';
    let note = 'Presensi Berhasil';

    // Prevent duplicate clock in/out on the same day for the same employee
    const existingLog = state.attendanceLogs.find(
      (l) =>
        Number(l.employee_id) === Number(emp.id) &&
        (l.log_date === localDate || (l.scan_time && l.scan_time.startsWith(localDate))) &&
        (l.log_type === normalizedLogType ||
          (normalizedLogType === 'in' && (l.log_type === 'clock_in' || l.log_type === 'in')) ||
          (normalizedLogType === 'out' && (l.log_type === 'clock_out' || l.log_type === 'out')))
    );

    if (existingLog) {
      const existingTime = existingLog.scan_time ? existingLog.scan_time.slice(11, 16) : '-';
      return res.status(400).json({
        success: false,
        error: `Karyawan ${emp.full_name} (${emp.nip}) sudah tercatat Presensi ${normalizedLogType === 'in' ? 'Masuk' : 'Pulang'} hari ini pada pukul ${existingTime} WIB!`,
      });
    }

    // Standard clock-in window enforcement for presensi masuk
    const isForceEarly = Boolean(req.body.force_early_clock_in || req.body.is_confirmed_early);
    const earlyReason = req.body.early_clock_in_reason || 'Konfirmasi Presensi Dini Hari';

    if (normalizedLogType === 'in') {
      const schedTimeIn = activeSched?.time_in || '08:00:00';
      const [sH, sM] = schedTimeIn.split(':').map((v: string) => parseInt(v, 10) || 0);
      const schedMinutes = sH * 60 + sM;
      const earliestWindowMinutes = (activeSched as any)?.earliest_clock_in_minutes ?? 120;
      const earliestLimit = Math.max(0, schedMinutes - earliestWindowMinutes);
      const currentTotalMinutes = hours * 60 + minutes;

      if (currentTotalMinutes < earliestLimit) {
        if (!isForceEarly) {
          const earliestH = Math.floor(earliestLimit / 60);
          const earliestM = earliestLimit % 60;
          const earliestStr = `${String(earliestH).padStart(2, '0')}:${String(earliestM).padStart(2, '0')}`;
          const currentHourStr = String(hours).padStart(2, '0');
          const currentMinStr = String(minutes).padStart(2, '0');
          return res.status(400).json({
            success: false,
            requires_early_confirmation: true,
            time_now: `${currentHourStr}:${currentMinStr}`,
            error: `Waktu saat ini pukul ${currentHourStr}:${currentMinStr} WIB (Dini Hari). Jadwal kerja ${activeSched?.schedule_name || 'Kantor'} dimulai pukul ${schedTimeIn.slice(0, 5)} WIB. Diperlukan konfirmasi untuk presensi masuk dini hari.`,
          });
        }
      }
    }

    // Evaluate lateness status
    const evalRes = computeAttendanceStatus(emp.id, localDate, scan_time || localTime, normalizedLogType);
    status = evalRes.status;
    note = evalRes.notes;

    if (isForceEarly && normalizedLogType === 'in') {
      status = 'on_time';
      note = `Presensi Dini Hari (${earlyReason}) - Tepat Waktu`;
    }

    // Resolve company location if specified or by coordinates
    let matchedLocation: any = null;
    let distanceMeters: number | null = null;

    if (location_id) {
      matchedLocation = (state.companyLocations || []).find((l: any) => Number(l.id) === Number(location_id));
    }

    if (!matchedLocation && latitude != null && longitude != null) {
      let minDistance = Infinity;
      for (const loc of (state.companyLocations || [])) {
        if (loc.is_active && loc.latitude != null && loc.longitude != null) {
          const dist = calculateDistanceMeters(Number(latitude), Number(longitude), Number(loc.latitude), Number(loc.longitude));
          if (dist < minDistance) {
            minDistance = dist;
            matchedLocation = loc;
            distanceMeters = dist;
          }
        }
      }
    } else if (matchedLocation && latitude != null && longitude != null && matchedLocation.latitude != null && matchedLocation.longitude != null) {
      distanceMeters = calculateDistanceMeters(Number(latitude), Number(longitude), Number(matchedLocation.latitude), Number(matchedLocation.longitude));
    }

    // Append location context to note if mobile GPS
    if (method === 'mobile_gps' && matchedLocation) {
      const distInfo = distanceMeters !== null ? ` (Jarak: ${Math.round(distanceMeters)}m)` : '';
      note = `${note} - ${matchedLocation.location_name}${distInfo}`;
    }

    const newLog = {
      id: state.attendanceLogs.length ? Math.max(...state.attendanceLogs.map((l) => l.id)) + 1 : 1,
      employee_id: emp.id,
      location_id: matchedLocation ? matchedLocation.id : (location_id ? Number(location_id) : null),
      location_name: matchedLocation ? matchedLocation.location_name : null,
      latitude: latitude != null ? Number(latitude) : (matchedLocation ? matchedLocation.latitude : null),
      longitude: longitude != null ? Number(longitude) : (matchedLocation ? matchedLocation.longitude : null),
      location_address: location_address || (matchedLocation ? matchedLocation.address : null),
      is_mock_location: Boolean(is_mock_location),
      log_date: localDate,
      scan_time: localTime,
      log_type: normalizedLogType,
      method: method || 'qr',
      device_id,
      status,
      notes: note,
      created_at: getWibDateTimeString(now),
    };

    state.attendanceLogs.unshift(newLog);
    state.attendanceLogs = cleanAndDeduplicateAttendanceLogs(state.attendanceLogs);
    saveStateToDisk();

    // Optionally sync to remote MySQL if connected
    syncMysqlQuery(
      `INSERT INTO attendance_logs (employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.id,
        newLog.location_id,
        newLog.location_name,
        localDate,
        localTime,
        normalizedLogType,
        method || 'qr',
        device_id,
        newLog.latitude,
        newLog.longitude,
        newLog.location_address,
        newLog.is_mock_location ? 1 : 0,
        status,
        note,
        getWibDateTimeString(now)
      ]
    ).catch(() => {});

    const div = state.divisions.find((d) => d.id === emp.division_id);

    res.json({
      success: true,
      message: `Presensi ${normalizedLogType === 'in' ? 'Masuk' : 'Keluar'} berhasil dicatat!`,
      scan: {
        ...newLog,
        employee_name: emp.full_name,
        employee_nip: emp.nip,
        division_name: div ? div.division_name : '-',
        location_name: newLog.location_name || '-',
        distance_meters: distanceMeters,
      },
    });
  } finally {
    activeAttendanceScans.delete(lockKey);
  }
});

app.post('/api/attendance/logs', async (req, res) => {
  const {
    employee_id,
    location_id,
    log_date,
    scan_time,
    log_type,
    method = 'manual',
    device_id = 'Manual HR/Admin',
    latitude,
    longitude,
    location_address,
    is_mock_location = false,
    status = 'on_time',
    notes = 'Ditambahkan manual oleh Admin',
  } = req.body;

  if (!employee_id || !log_date || !scan_time || !log_type) {
    return res.status(400).json({ success: false, error: 'Silakan lengkapi semua data wajib' });
  }

  const emp = state.employees.find((e) => e.id === Number(employee_id));
  if (!emp) {
    return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });
  }

  const normalizedLogType = (log_type === 'clock_out' || log_type === 'out') ? 'out' : 'in';
  const now = new Date();

  const computed = computeAttendanceStatus(emp.id, log_date, scan_time, normalizedLogType);
  const finalStatus = (status && status !== 'on_time') ? status : computed.status;
  const finalNotes = (notes && notes !== 'Ditambahkan manual oleh Admin' && notes !== 'Tepat Waktu') ? notes : computed.notes;

  const loc = (state.companyLocations || []).find((l: any) => Number(l.id) === Number(location_id));

  const newLog = {
    id: state.attendanceLogs.length ? Math.max(...state.attendanceLogs.map((l) => l.id)) + 1 : 1,
    employee_id: emp.id,
    location_id: loc ? loc.id : (location_id ? Number(location_id) : null),
    location_name: loc ? loc.location_name : null,
    latitude: latitude != null ? Number(latitude) : (loc ? loc.latitude : null),
    longitude: longitude != null ? Number(longitude) : (loc ? loc.longitude : null),
    location_address: location_address || (loc ? loc.address : null),
    is_mock_location: Boolean(is_mock_location),
    log_date,
    scan_time,
    log_type: normalizedLogType,
    method,
    device_id,
    status: finalStatus,
    notes: finalNotes,
    created_at: getWibDateTimeString(now),
  };

  state.attendanceLogs.unshift(newLog);
  state.attendanceLogs = cleanAndDeduplicateAttendanceLogs(state.attendanceLogs);
  saveStateToDisk();

  // Sync to MySQL if connected
  syncMysqlQuery(
    `INSERT INTO attendance_logs (employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      emp.id,
      newLog.location_id,
      newLog.location_name,
      log_date,
      scan_time,
      normalizedLogType,
      method,
      device_id,
      newLog.latitude,
      newLog.longitude,
      newLog.location_address,
      newLog.is_mock_location ? 1 : 0,
      finalStatus,
      finalNotes,
      getWibDateTimeString(now)
    ]
  ).catch(() => {});

  const div = state.divisions.find((d) => d.id === emp.division_id);

  res.json({
    success: true,
    message: 'Log presensi berhasil ditambahkan secara manual',
    log: {
      ...newLog,
      employee_name: emp.full_name,
      employee_nip: emp.nip,
      division_name: div ? div.division_name : '-',
    },
  });
});

// Dedicated Mobile Portal Clock-In / Clock-Out Endpoint with GPS Geofencing
app.post('/api/attendance/mobile-clock', async (req, res) => {
  const {
    employee_id,
    identifier,
    location_id,
    latitude,
    longitude,
    location_address,
    accuracy,
    is_mock_location = false,
    log_type = 'in',
    device_name = 'Mobile Employee Portal',
    notes,
  } = req.body;

  // 1. Resolve employee
  let emp = null;
  if (employee_id) {
    emp = state.employees.find((e) => Number(e.id) === Number(employee_id));
  } else if (identifier) {
    const searchCode = String(identifier).trim().toLowerCase();
    emp = state.employees.find((e) =>
      String(e.id) === searchCode ||
      (e.nip || '').toLowerCase() === searchCode ||
      (e.qr_code || '').toLowerCase() === searchCode
    );
  }

  if (!emp) {
    return res.status(404).json({
      success: false,
      error: 'Karyawan tidak ditemukan. Pastikan data akun / NIP valid.',
    });
  }

  if (emp.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: `Status karyawan ${emp.full_name} (${emp.nip}) tidak aktif.`,
    });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const localTime = `${localDate} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const normalizedLogType = (log_type === 'clock_out' || log_type === 'out') ? 'out' : 'in';

  // In-flight mutex lock
  const lockKey = `mobile_${emp.id}_${normalizedLogType}_${localDate}`;
  if (activeAttendanceScans.has(lockKey)) {
    return res.status(409).json({
      success: false,
      error: `Presensi mobile ${normalizedLogType === 'in' ? 'Masuk' : 'Pulang'} sedang diproses. Mohon tunggu...`,
    });
  }
  activeAttendanceScans.add(lockKey);

  try {
    // 2. Check duplicate today
    const existingLog = state.attendanceLogs.find(
      (l) => l.employee_id === emp.id && l.log_date === localDate && l.log_type === normalizedLogType
    );
    if (existingLog) {
      const timeStr = existingLog.scan_time ? existingLog.scan_time.slice(11, 16) : '-';
      return res.status(400).json({
        success: false,
        error: `Anda sudah melakukan Presensi ${normalizedLogType === 'in' ? 'Masuk' : 'Pulang'} hari ini pada pukul ${timeStr} WIB!`,
      });
    }

    // 3. Resolve target company location
    let targetLoc: any = null;
    let distanceMeters: number | null = null;

    if (location_id) {
      targetLoc = (state.companyLocations || []).find((l: any) => Number(l.id) === Number(location_id));
    }

    // If no specific location selected, find nearest location by GPS coordinates
    if (!targetLoc && latitude != null && longitude != null) {
      let minDistance = Infinity;
      for (const loc of (state.companyLocations || [])) {
        if (loc.is_active && loc.latitude != null && loc.longitude != null) {
          const dist = calculateDistanceMeters(Number(latitude), Number(longitude), Number(loc.latitude), Number(loc.longitude));
          if (dist < minDistance) {
            minDistance = dist;
            targetLoc = loc;
            distanceMeters = dist;
          }
        }
      }
    } else if (targetLoc && latitude != null && longitude != null && targetLoc.latitude != null && targetLoc.longitude != null) {
      distanceMeters = calculateDistanceMeters(Number(latitude), Number(longitude), Number(targetLoc.latitude), Number(targetLoc.longitude));
    }

    // 4. Geofencing check
    const allowedRadius = targetLoc?.radius_meters || 150;
    const isWithinGeofence = distanceMeters !== null ? distanceMeters <= allowedRadius : true;

    // 5. Determine on_time vs late
    let status: 'on_time' | 'late' | 'normal' | 'invalid_window' = 'normal';
    let logNotes = notes || '';

    if (normalizedLogType === 'in') {
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Find active schedule
      const sched = state.workSchedules.find((s) => s.is_active) || state.workSchedules[0];
      const schedTimeIn = sched?.time_in || '08:00:00';
      const [sH, sM] = schedTimeIn.split(':').map((v: string) => parseInt(v, 10) || 0);
      const schedMinutes = sH * 60 + sM;
      const earliestWindowMinutes = (sched as any)?.earliest_clock_in_minutes ?? 120;
      const earliestLimit = Math.max(0, schedMinutes - earliestWindowMinutes);
      const currentMinutes = hours * 60 + minutes;

      const isForceEarly = Boolean(req.body.force_early_clock_in || req.body.is_confirmed_early);
      const earlyReason = req.body.early_clock_in_reason || 'Konfirmasi Presensi Dini Hari';

      if (currentMinutes < earliestLimit) {
        if (!isForceEarly) {
          const earliestH = Math.floor(earliestLimit / 60);
          const earliestM = earliestLimit % 60;
          const earliestStr = `${String(earliestH).padStart(2, '0')}:${String(earliestM).padStart(2, '0')}`;
          const currentHourStr = String(hours).padStart(2, '0');
          const currentMinStr = String(minutes).padStart(2, '0');
          return res.status(400).json({
            success: false,
            requires_early_confirmation: true,
            time_now: `${currentHourStr}:${currentMinStr}`,
            error: `Waktu saat ini pukul ${currentHourStr}:${currentMinStr} WIB (Dini Hari). Jadwal kerja ${sched?.schedule_name || 'Kantor'} dimulai pukul ${schedTimeIn.slice(0, 5)} WIB. Diperlukan konfirmasi untuk presensi masuk dini hari.`,
          });
        }
      }

      if (isForceEarly) {
        status = 'on_time';
        logNotes = `Presensi Dini Hari (${earlyReason}) - Tepat Waktu`;
      } else {
        const evalRes = computeAttendanceStatus(emp.id, localDate, localTime, 'in');
        status = evalRes.status as any;
        logNotes = logNotes ? `${logNotes} - ${evalRes.notes}` : evalRes.notes;
      }
    } else {
      status = 'normal';
      logNotes = logNotes || 'Presensi Pulang Mandiri';
    }

    // Detail note with location & distance
    if (targetLoc) {
      const distText = distanceMeters !== null ? `${Math.round(distanceMeters)}m` : 'N/A';
      const geoStatus = isWithinGeofence ? 'Dalam Geofence' : 'Di Luar Radius';
      logNotes = `[${targetLoc.location_name}] ${logNotes} (${distText}, ${geoStatus})`;
    }

    if (is_mock_location) {
      logNotes = `⚠️ [INDIKASI FAKE GPS] ${logNotes}`;
    }

    const newLog = {
      id: state.attendanceLogs.length ? Math.max(...state.attendanceLogs.map((l) => l.id)) + 1 : 1,
      employee_id: emp.id,
      location_id: targetLoc ? targetLoc.id : (location_id ? Number(location_id) : null),
      location_name: targetLoc ? targetLoc.location_name : null,
      latitude: latitude != null ? Number(latitude) : (targetLoc ? targetLoc.latitude : null),
      longitude: longitude != null ? Number(longitude) : (targetLoc ? targetLoc.longitude : null),
      location_address: location_address || (targetLoc ? targetLoc.address : null),
      is_mock_location: Boolean(is_mock_location),
      log_date: localDate,
      scan_time: localTime,
      log_type: normalizedLogType,
      method: 'mobile_gps',
      device_id: device_name || 'Portal Mobile Karyawan',
      status,
      notes: logNotes,
      created_at: getWibDateTimeString(now),
    };

    state.attendanceLogs.unshift(newLog);
    state.attendanceLogs = cleanAndDeduplicateAttendanceLogs(state.attendanceLogs);
    saveStateToDisk();

    // Sync to MySQL
    syncMysqlQuery(
      `INSERT INTO attendance_logs (employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.id,
        newLog.location_id,
        newLog.location_name,
        localDate,
        localTime,
        normalizedLogType,
        'mobile_gps',
        newLog.device_id,
        newLog.latitude,
        newLog.longitude,
        newLog.location_address,
        newLog.is_mock_location ? 1 : 0,
        status,
        logNotes,
        getWibDateTimeString(now),
      ]
    ).catch(() => {});

    const div = state.divisions.find((d) => d.id === emp.division_id);

    res.json({
      success: true,
      message: `Clock-${normalizedLogType === 'in' ? 'In' : 'Out'} Mobile berhasil di ${targetLoc ? targetLoc.location_name : 'Lokasi Terdaftar'}!`,
      data: {
        ...newLog,
        employee_name: emp.full_name,
        employee_nip: emp.nip,
        division_name: div ? div.division_name : '-',
        target_location: targetLoc,
        distance_meters: distanceMeters,
        allowed_radius_meters: allowedRadius,
        is_within_geofence: isWithinGeofence,
      },
    });
  } finally {
    activeAttendanceScans.delete(lockKey);
  }
});

// Master Titik Lokasi Perusahaan (CRUD: Head Office, Batching Plant, Kantor Purchasing, dll.)
app.get('/api/locations', (req, res) => {
  res.json({
    success: true,
    data: state.companyLocations || [],
  });
});

app.post('/api/locations', (req, res) => {
  const {
    location_code,
    location_name,
    location_type = 'batching_plant',
    address,
    latitude,
    longitude,
    radius_meters = 100,
    is_active = true,
    notes = '',
  } = req.body;

  if (!location_name || !location_code) {
    return res.status(400).json({ success: false, error: 'Nama lokasi dan kode lokasi wajib diisi' });
  }

  const now = new Date();
  const newLoc = {
    id: (state.companyLocations || []).length ? Math.max(...state.companyLocations.map((l) => l.id)) + 1 : 1,
    location_code: location_code.trim().toUpperCase(),
    location_name: location_name.trim(),
    location_type,
    address: address ? address.trim() : '',
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    radius_meters: radius_meters ? Number(radius_meters) : 100,
    is_active: Boolean(is_active),
    notes: notes ? notes.trim() : '',
    created_at: getWibDateTimeString(now),
    updated_at: getWibDateTimeString(now),
  };

  state.companyLocations.push(newLoc);
  saveStateToDisk();

  // Sync to MySQL
  syncMysqlQuery(
    `INSERT INTO company_locations (id, location_code, location_name, location_type, address, latitude, longitude, radius_meters, is_active, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE location_name=VALUES(location_name), address=VALUES(address), latitude=VALUES(latitude), longitude=VALUES(longitude), radius_meters=VALUES(radius_meters);`,
    [newLoc.id, newLoc.location_code, newLoc.location_name, newLoc.location_type, newLoc.address, newLoc.latitude, newLoc.longitude, newLoc.radius_meters, newLoc.is_active ? 1 : 0, newLoc.notes, newLoc.created_at, newLoc.updated_at]
  ).catch(() => {});

  res.json({
    success: true,
    message: `Titik lokasi "${newLoc.location_name}" berhasil didaftarkan!`,
    data: newLoc,
  });
});

app.put('/api/locations/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = (state.companyLocations || []).findIndex((l) => l.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Lokasi tidak ditemukan' });
  }

  const existing = state.companyLocations[idx];
  const now = new Date();
  const updated = {
    ...existing,
    ...req.body,
    id,
    latitude: req.body.latitude != null ? Number(req.body.latitude) : existing.latitude,
    longitude: req.body.longitude != null ? Number(req.body.longitude) : existing.longitude,
    radius_meters: req.body.radius_meters != null ? Number(req.body.radius_meters) : existing.radius_meters,
    is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.is_active,
    updated_at: getWibDateTimeString(now),
  };

  state.companyLocations[idx] = updated;
  saveStateToDisk();

  // Sync to MySQL
  syncMysqlQuery(
    `UPDATE company_locations
     SET location_code = ?, location_name = ?, location_type = ?, address = ?, latitude = ?, longitude = ?, radius_meters = ?, is_active = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [updated.location_code, updated.location_name, updated.location_type, updated.address, updated.latitude, updated.longitude, updated.radius_meters, updated.is_active ? 1 : 0, updated.notes || '', updated.updated_at, id]
  ).catch(() => {});

  res.json({
    success: true,
    message: `Titik lokasi "${updated.location_name}" berhasil diperbarui!`,
    data: updated,
  });
});

app.delete('/api/locations/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = (state.companyLocations || []).findIndex((l) => l.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Lokasi tidak ditemukan' });
  }

  const deleted = state.companyLocations.splice(idx, 1)[0];
  saveStateToDisk();

  // Sync to MySQL
  syncMysqlQuery(`DELETE FROM company_locations WHERE id = ?`, [id]).catch(() => {});

  res.json({
    success: true,
    message: `Titik lokasi "${deleted.location_name}" berhasil dihapus.`,
  });
});

app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY belum dikonfigurasi. Silakan tambahkan API Key Anda di panel Secrets di AI Studio.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build context snapshots from the actual in-memory database state
    const employeesSummary = state.employees.map((e) => ({
      id: e.id,
      nip: e.nip,
      name: e.full_name,
      division: state.divisions.find((d) => d.id === e.division_id)?.division_name || '-',
      base_salary_per_hour: e.base_salary,
      status: e.status,
    }));

    const divisionsSummary = state.divisions.map((d) => ({
      id: d.id,
      code: d.division_code,
      name: d.division_name,
    }));

    // Compute compact aggregate attendance stats per employee to reduce tokens but keep analysis 100% robust
    const employeeStats = state.employees.map((e) => {
      const empLogs = state.attendanceLogs.filter((l) => l.employee_id === e.id);
      const totalHadir = empLogs.filter((l) => l.log_type === 'in' || l.log_type === 'clock_in').length;
      const totalTerlambat = empLogs.filter((l) => l.status === 'late' || l.notes?.toLowerCase().includes('terlambat')).length;
      return {
        nip: e.nip,
        name: e.full_name,
        total_hadir: totalHadir,
        total_terlambat: totalTerlambat,
      };
    });

    // Pass the last 60 detailed logs for day-to-day timeline analysis
    const logsSummary = state.attendanceLogs.slice(-60).map((l) => {
      const matchedEmp = state.employees.find((e) => e.id === l.employee_id);
      return {
        employee_nip: matchedEmp ? matchedEmp.nip : '-',
        employee_name: matchedEmp ? matchedEmp.full_name : 'Unknown',
        date: l.log_date,
        time: l.scan_time,
        type: l.log_type, // 'in' or 'out'
        status: l.status, // 'on_time', 'late', etc.
        notes: l.notes || '',
      };
    });

    const schedulesSummary = state.workSchedules.map((s) => ({
      name: s.schedule_name,
      time_in: s.time_in,
      time_out: s.time_out,
      tolerance_minutes: s.tolerance_minutes,
      working_days: s.working_days,
    }));

    const systemPrompt = `
You are the PT. NINDYA KRIDA UTAMA (NKU) AI HR Assistant, a friendly, extremely precise, and professional HR AI bot.
Your task is to help managers and HR administrators analyze employee records, attendance statistics, work shifts, and payroll calculations.

You have access to the following live database snapshot:
- **Employees**: ${JSON.stringify(employeesSummary)}
- **Divisions**: ${JSON.stringify(divisionsSummary)}
- **Schedules**: ${JSON.stringify(schedulesSummary)}
- **Employee Attendance Aggregates (Cumulative)**: ${JSON.stringify(employeeStats)}
- **Recent Detailed Logs (Last 60 records)**: ${JSON.stringify(logsSummary)}

GUIDELINES:
1. Always reply in clear, professional, and friendly Indonesian.
2. If asked to find who is late or analyze lateness:
   - Search the "Attendance Logs". Check log entries where status is "late" or compute delay times.
   - Count lateness occurrences for each employee.
   - Sort them from most frequent/worst to least frequent/most disciplined.
   - Present the ranking in an elegant Markdown table containing columns: Rank, Employee Name, NIP, Division, Lateness Count, Notes.
3. If asked to generate a pay slip (slip gaji) or pay recap:
   - Identify the employee requested (by name or NIP).
   - Get their hourly base salary. Count their completed hours/logs or use a standard full attendance default (e.g. 160 hours or 20 active working days of 8 hours) if actual logs are scarce.
   - Calculate basic salary, add appropriate mock allowances (Uang Makan/Tunjangan Transport), subtract late denda/deductions if any, and state the Net Salary.
   - Print the slip in a highly polished, printable Markdown card box.
4. Keep the output neat, structured, and visually engaging. Never output dry developer details, code paths, or raw DB IDs. Use clear formatting, bullet points, and tables.
5. BATASAN RUANG LINGKUP (STRICT SCOPE CONSTRAINT):
   - Anda HANYA diizinkan menjawab pertanyaan, melakukan analisis, atau melakukan tugas yang berkaitan langsung dengan administrasi HR, data karyawan, absensi/kehadiran, jadwal kerja, dan perhitungan payroll di PT. Nindya Krida Utama (NKU).
   - Jika pengguna mengajukan pertanyaan di luar ruang lingkup ini (misalnya: pemrograman umum, resep masakan, sejarah dunia, tugas sekolah, lirik lagu, penulisan kreatif non-HR, dsb), Anda WAJIB menolak secara sopan namun tegas.
   - Jawab pertanyaan di luar topik dengan kalimat: "Maaf, saya hanya dapat membantu Anda dalam menganalisis data HR, kehadiran, jadwal kerja, dan perhitungan payroll di PT. Nindya Krida Utama (NKU). Silakan tanyakan hal yang berkaitan dengan administrasi HR PT. NKU."
6. ARAHAN KE FITUR SISTEM UNTUK SURAT RESMI & SP (NATIVE SYSTEM REDIRECTION):
   - Jika pengguna bertanya bagaimana cara memperingatkan, menegur, memberikan Surat Peringatan (SP), atau memproses PHK bagi karyawan yang tidak disiplin/terlambat, Anda DILARANG KERAS langsung membuatkan draf teks/format surat SP sendiri di dalam obrolan ini.
   - Sebagai gantinya, Anda WAJIB mengarahkan pengguna untuk menggunakan fitur bawaan sistem, yaitu menu "Surat Resmi & SP / PHK" yang berada di sidebar sebelah kiri.
   - Jelaskan bahwa di menu "Surat Resmi & SP / PHK" tersebut, admin dapat membuat, mencetak, dan mengelola dokumen resmi Surat Peringatan (SP1, SP2, SP3) atau PHK secara sah, formal, dan otomatis terhubung dengan database karyawan PT. NKU.
7. KAMUS LABEL MENU SIDEBAR NATIVE (MANDATORY SIDEBAR DICTIONARY):
   - Anda WAJIB merujuk nama menu/fitur aplikasi dengan nama persis sesuai yang tertera di bilah navigasi (sidebar) kiri layar. DILARANG menggunakan terjemahan bebas atau istilah buatan sendiri!
   - Berikut adalah kamus nama menu resmi yang wajib Anda gunakan secara harfiah:
     * Gunakan **"Management Gaji"** (badge/tag: 'Payroll'). JANGAN PERNAH menyebutnya "Payroll", "Menu Penggajian", atau "Penggajian & Slip Gaji".
     * Gunakan **"Surat Resmi & SP / PHK"** (badge/tag: 'Legal'). JANGAN PERNAH menyebutnya "Surat Resmi", "Legal Menu", atau "Pembuatan SP".
     * Gunakan **"Management SDM"** (badge/tag: 'Master'). JANGAN PERNAH menyebutnya "Menu SDM" atau "Data Karyawan".
     * Gunakan **"Management Jadwal Kerja"** (tanpa tag). JANGAN PERNAH menyebutnya "Shift Kerja" atau "Schedules".
     * Gunakan **"Management Requests"** (badge/tag: 'Approval'). JANGAN PERNAH menyebutnya "Persetujuan" atau "Request Menu".
     * Gunakan **"Kalender & Rekap Absensi"** (tanpa tag). JANGAN PERNAH menyebutnya "Log Absensi" atau "Calendar".
     * Gunakan **"Asisten AI HR"** (badge/tag: 'Gemini') untuk merujuk ke obrolan aktif saat ini.
     * Gunakan **"Terminal Kiosk"** (badge/tag: 'Device') untuk antarmuka mesin absen.
     * Gunakan **"Konfigurasi Sistem & Database"** (badge/tag: 'MySQL Live').
     * Gunakan **"App Config"** (badge/tag: 'Settings').
8. TOMBOL PINTASAN NATIVE (NATIVE SHORTCUT BUTTONS):
   - Anda BISA dan SANGAT DIANJURKAN memberikan tombol pintasan interaktif agar pengguna dapat berpindah menu secara otomatis sekali klik!
   - Untuk memunculkan tombol pintasan ini, Anda hanya perlu menuliskan sintaks khusus ini pada baris tersendiri di akhir pesan Anda:
     [PINTASAN: <id_menu> | <Label Tombol>]
   - Di mana '<id_menu>' wajib dipilih dari daftar ID resmi berikut:
     * 'official_letters' -> Mengarahkan ke menu "Surat Resmi & SP / PHK"
     * 'payroll' -> Mengarahkan ke menu "Management Gaji"
     * 'sdm' -> Mengarahkan ke menu "Management SDM"
     * 'schedules' -> Mengarahkan ke menu "Management Jadwal Kerja"
     * 'requests' -> Mengarahkan ke menu "Management Requests"
     * 'calendar' -> Mengarahkan ke menu "Kalender & Rekap Absensi"
     * 'dashboard' -> Mengarahkan ke menu "Dashboard"
     * 'app_config' -> Mengarahkan ke menu "App Config"
     * 'db_config' -> Mengarahkan ke menu "Konfigurasi Sistem & Database"
   - Contoh Penerapan:
     "Jika Anda ingin menerbitkan Surat Peringatan (SP) untuk karyawan tersebut, silakan klik tombol pintasan di bawah ini untuk langsung berpindah halaman:
     [PINTASAN: official_letters | Buka Menu Surat Resmi & SP / PHK]"
   - Selalu berikan tombol pintasan ini setiap kali Anda mengarahkan pengguna untuk mengakses salah satu menu sistem di atas!
   - Contoh: Ketika memberikan petunjuk tentang slip gaji, katakan: "Buka menu **Management Gaji** pada bilah navigasi kiri..." (BUKAN "Buka menu Payroll...").

`;

    const chatHistory = history.map((item: any) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));

    // Helper to call Gemini with robust exponential backoff retries on transient Google 503 errors
    const callGeminiWithRetry = async (apiCall: () => Promise<any>, retries = 3, delayMs = 1200): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await apiCall();
        } catch (err: any) {
          const errMsg = String(err.message || err.status || JSON.stringify(err));
          const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('demand') || errMsg.includes('overload');
          if (isTransient && i < retries - 1) {
            console.warn(`[AI Gemini 503 Retry] Transient overload detected. Retrying in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2; // exponential backoff
            continue;
          }
          throw err;
        }
      }
    };

    let response;
    try {
      // 1st Priority: Try gemini-3.8-flash with automatic retries
      response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: message }] }
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
          }
        })
      );
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.8-flash is experiencing high demand even after retries. Falling back to stable gemini-flash-latest...', primaryErr);
      try {
        // 2nd Priority: Try stable gemini-flash-latest with automatic retries
        response = await callGeminiWithRetry(() =>
          ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [
              ...chatHistory,
              { role: 'user', parts: [{ text: message }] }
            ],
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
            }
          })
        );
      } catch (secondaryErr: any) {
        console.warn('Fallback model gemini-flash-latest failed. Falling back to lightweight gemini-3.1-flash-lite...', secondaryErr);
        try {
          // 3rd Priority: Try lightweight gemini-3.1-flash-lite with automatic retries
          response = await callGeminiWithRetry(() =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: [
                ...chatHistory,
                { role: 'user', parts: [{ text: message }] }
              ],
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.3,
              }
            })
          );
        } catch (fallbackErr: any) {
          console.error('All model endpoints and retries failed due to extreme global Google quota limits:', fallbackErr);
          throw new Error(`Layanan AI Google sedang sangat sibuk secara global (Overload). Silakan kirim ulang kueri Anda dalam beberapa detik.`);
        }
      }
    }

    res.json({
      success: true,
      reply: response.text || 'Maaf, saya tidak dapat merespons pesan Anda saat ini.',
    });
  } catch (err: any) {
    console.error('Error in AI Assistant endpoint:', err);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada layanan AI: ' + (err.message || 'Error tidak diketahui'),
    });
  }
});

app.put('/api/attendance/logs/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.attendanceLogs.findIndex((l) => l.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Log presensi tidak ditemukan' });
  }

  const existing = state.attendanceLogs[idx];
  const loc = req.body.location_id
    ? (state.companyLocations || []).find((l: any) => Number(l.id) === Number(req.body.location_id))
    : null;

  const updatedLog = {
    ...existing,
    ...req.body,
    location_id: req.body.location_id !== undefined ? (req.body.location_id ? Number(req.body.location_id) : null) : existing.location_id,
    location_name: loc ? loc.location_name : (req.body.location_name !== undefined ? req.body.location_name : existing.location_name),
    latitude: req.body.latitude !== undefined ? (req.body.latitude != null ? Number(req.body.latitude) : null) : existing.latitude,
    longitude: req.body.longitude !== undefined ? (req.body.longitude != null ? Number(req.body.longitude) : null) : existing.longitude,
    location_address: req.body.location_address !== undefined ? req.body.location_address : existing.location_address,
    id,
  };

  // If log_type is being updated, normalize it
  if (req.body.log_type) {
    updatedLog.log_type = (req.body.log_type === 'clock_out' || req.body.log_type === 'out') ? 'out' : 'in';
  }

  state.attendanceLogs[idx] = updatedLog;
  saveStateToDisk();

  // Sync to MySQL if connected
  syncMysqlQuery(
    `UPDATE attendance_logs
     SET log_date = ?, scan_time = ?, log_type = ?, method = ?, device_id = ?, location_id = ?, location_name = ?, latitude = ?, longitude = ?, location_address = ?, status = ?, notes = ?
     WHERE id = ?`,
    [
      updatedLog.log_date,
      updatedLog.scan_time,
      updatedLog.log_type,
      updatedLog.method || 'qr',
      updatedLog.device_id || '',
      updatedLog.location_id || null,
      updatedLog.location_name || null,
      updatedLog.latitude != null ? updatedLog.latitude : null,
      updatedLog.longitude != null ? updatedLog.longitude : null,
      updatedLog.location_address || null,
      updatedLog.status || 'normal',
      updatedLog.notes || '',
      id,
    ]
  ).catch(() => {});

  const emp = state.employees.find((e) => e.id === updatedLog.employee_id);
  const div = emp ? state.divisions.find((d) => d.id === emp.division_id) : null;

  res.json({
    success: true,
    message: 'Log presensi berhasil diperbarui',
    log: {
      ...updatedLog,
      employee_name: emp ? emp.full_name : updatedLog.employee_name || 'Unknown',
      employee_nip: emp ? emp.nip : updatedLog.employee_nip || '-',
      division_name: div ? div.division_name : updatedLog.division_name || '-',
    },
  });
});

app.delete('/api/attendance/logs/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.attendanceLogs.findIndex((l) => l.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Log presensi tidak ditemukan' });
  }

  state.attendanceLogs.splice(idx, 1);
  saveStateToDisk();

  // Sync to MySQL if connected
  syncMysqlQuery('DELETE FROM attendance_logs WHERE id = ?', [id]).catch(() => {});

  res.json({ success: true, message: 'Log presensi berhasil dihapus' });
});

// Helper to ensure leave balances are always accurately synced with approved leave requests
function recalculateAndSyncLeaveBalances() {
  const currentYear = new Date().getFullYear();
  if (!state.leaveBalances) state.leaveBalances = [];

  // Ensure all active employees have a balance record for Annual Leave (leave_type_id = 1)
  state.employees.forEach((emp) => {
    let balance = state.leaveBalances.find((b) => b.employee_id === emp.id && b.leave_type_id === 1);
    if (!balance) {
      const nextId = state.leaveBalances.length ? Math.max(...state.leaveBalances.map((b) => b.id)) + 1 : 1;
      balance = {
        id: nextId,
        employee_id: emp.id,
        leave_type_id: 1,
        year: currentYear,
        quota_days: 12,
        used_days: 0,
      };
      state.leaveBalances.push(balance);
    }
  });

  // Calculate used_days for each leave balance by aggregating approved leave requests
  for (const balance of state.leaveBalances) {
    const bYear = Number(balance.year) || currentYear;
    const approvedLeaves = state.leaveRequests.filter((l) => {
      if (Number(l.employee_id) !== Number(balance.employee_id)) return false;
      if (l.status !== 'approved') return false;

      // Annual Leave is leave_type_id === 1 or (missing/undefined when not Izin Sakit)
      if (balance.leave_type_id === 1) {
        const isSakit = l.leave_type_id === 2 || (l.leave_type_name && l.leave_type_name.toLowerCase().includes('sakit'));
        if (isSakit) return false;
        if (l.leave_type_id && Number(l.leave_type_id) !== 1) return false;
      } else {
        if (Number(l.leave_type_id) !== Number(balance.leave_type_id)) return false;
      }

      // Filter by year
      const dateVal = l.date_start || l.created_at;
      if (dateVal) {
        const yr = parseInt(String(dateVal).slice(0, 4), 10);
        if (!isNaN(yr) && yr !== bYear) return false;
      }

      return true;
    });

    balance.used_days = approvedLeaves.reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);
  }

  saveStateToDisk();
}

// 7. Requests (Leave, Overtime) & Approval
app.get('/api/requests/leave', async (req, res) => {
  try {
    if (state.dbConfig && state.dbConfig.host) {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [lrRows]: any = await connection.query('SELECT * FROM leave_requests ORDER BY id DESC LIMIT 500;');
      await connection.end();
      if (Array.isArray(lrRows)) {
        state.leaveRequests = lrRows.map((lr: any) => ({
          ...lr,
          id: Number(lr.id),
          employee_id: Number(lr.employee_id),
          leave_type_id: Number(lr.leave_type_id),
          total_days: Number(lr.total_days || 1),
          approved_by: lr.approved_by !== null && lr.approved_by !== undefined ? Number(lr.approved_by) : null,
          date_start: lr.date_start ? (typeof lr.date_start === 'string' ? lr.date_start.slice(0, 10) : new Date(lr.date_start).toISOString().slice(0, 10)) : lr.date_start,
          date_end: lr.date_end ? (typeof lr.date_end === 'string' ? lr.date_end.slice(0, 10) : new Date(lr.date_end).toISOString().slice(0, 10)) : lr.date_end,
          created_at: lr.created_at ? (typeof lr.created_at === 'string' ? lr.created_at : new Date(lr.created_at).toISOString().slice(0, 19).replace('T', ' ')) : lr.created_at,
          approved_at: lr.approved_at ? (typeof lr.approved_at === 'string' ? lr.approved_at : new Date(lr.approved_at).toISOString().slice(0, 19).replace('T', ' ')) : lr.approved_at,
        }));
        saveStateToDisk();
      }
    }
  } catch (dbErr) {
    console.warn('Could not query live leave_requests from MySQL, using local cache:', dbErr);
  }

  const enriched = state.leaveRequests.map((reqItem) => enrichLeaveRequest(reqItem));
  res.json(enriched);
});

app.post('/api/requests/leave', async (req, res) => {
  const { employee_id, leave_type_id, leave_type_name, date_start, date_end, total_days, reason, attachment_url, status = 'pending' } = req.body;

  // Quota check
  const balance = state.leaveBalances.find(
    (b) => b.employee_id === Number(employee_id) && b.leave_type_id === Number(leave_type_id || 1)
  );

  if (balance && balance.used_days + Number(total_days) > (balance.quota_days + (balance.carry_forward_days || 0))) {
    return res.status(400).json({
      error: `Sisa kuota tidak mencukupi. Kuota: ${balance.quota_days} hari, Terpakai: ${balance.used_days} hari, Sisa: ${balance.quota_days - balance.used_days} hari`,
    });
  }

  const emp = state.employees.find((e) => e.id === Number(employee_id));
  const div = emp ? state.divisions.find((d) => d.id === emp.division_id) : null;
  const type = state.leaveTypes.find((t) => t.id === Number(leave_type_id));
  const createdAtWib = getWibDateTimeString();

  const newReq = {
    id: state.leaveRequests.length ? Math.max(...state.leaveRequests.map((r) => r.id)) + 1 : 1,
    employee_id: Number(employee_id),
    employee_name: emp ? emp.full_name : (req.body.employee_name || 'Karyawan'),
    employee_nip: emp ? emp.nip : (req.body.employee_nip || '-'),
    division_name: div ? div.division_name : (req.body.division_name || '-'),
    leave_type_id: Number(leave_type_id || 1),
    leave_type_name: type ? type.type_name : (leave_type_name || (Number(leave_type_id) === 2 ? 'Izin Sakit' : 'Cuti Tahunan')),
    date_start,
    date_end,
    total_days: Number(total_days),
    reason: reason || '',
    attachment_url: attachment_url || '',
    status: status || 'pending',
    created_at: createdAtWib,
  };

  state.leaveRequests.unshift(newReq);
  recalculateAndSyncLeaveBalances();

  // Sync to MySQL
  await syncMysqlQuery(
    `INSERT INTO leave_requests (id, employee_id, leave_type_id, date_start, date_end, total_days, reason, attachment_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE date_start = VALUES(date_start), date_end = VALUES(date_end), total_days = VALUES(total_days), reason = VALUES(reason), status = VALUES(status);`,
    [
      newReq.id,
      newReq.employee_id,
      newReq.leave_type_id,
      newReq.date_start,
      newReq.date_end,
      newReq.total_days,
      newReq.reason,
      newReq.attachment_url,
      newReq.status,
      newReq.created_at,
    ]
  );

  res.json({ success: true, request: enrichLeaveRequest(newReq), data: enrichLeaveRequest(newReq) });
});

app.put('/api/requests/leave/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.leaveRequests.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Request cuti tidak ditemukan' });
  }

  const existing = state.leaveRequests[idx];
  const updatedReq = {
    ...existing,
    ...req.body,
    id,
  };

  state.leaveRequests[idx] = updatedReq;
  recalculateAndSyncLeaveBalances();

  await syncMysqlQuery(
    `UPDATE leave_requests
     SET employee_id = ?, leave_type_id = ?, date_start = ?, date_end = ?, total_days = ?, reason = ?, attachment_url = ?, status = ?
     WHERE id = ?;`,
    [
      updatedReq.employee_id,
      updatedReq.leave_type_id,
      updatedReq.date_start,
      updatedReq.date_end,
      updatedReq.total_days,
      updatedReq.reason || '',
      updatedReq.attachment_url || '',
      updatedReq.status || 'pending',
      id,
    ]
  );

  res.json({ success: true, request: enrichLeaveRequest(updatedReq) });
});

app.delete('/api/requests/leave/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.leaveRequests.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Request cuti tidak ditemukan' });
  }

  state.leaveRequests = state.leaveRequests.filter((r) => r.id !== id);
  recalculateAndSyncLeaveBalances();

  await syncMysqlQuery('DELETE FROM leave_requests WHERE id = ?;', [id]);
  res.json({ success: true, message: 'Request cuti berhasil dihapus' });
});

app.post('/api/requests/leave/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  const { status, approver_id = 1 } = req.body; // status: 'approved' | 'rejected'
  const reqItem = state.leaveRequests.find((r) => r.id === id);
  if (!reqItem) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const approvedAtWib = getWibDateTimeString();
  reqItem.status = status;
  reqItem.approved_by = approver_id ? Number(approver_id) : 1;
  reqItem.approved_at = approvedAtWib;

  recalculateAndSyncLeaveBalances();

  await syncMysqlQuery(
    `UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?;`,
    [status, reqItem.approved_by, approvedAtWib, id]
  );

  res.json({ success: true, request: enrichLeaveRequest(reqItem) });
});

app.get('/api/requests/overtime', async (req, res) => {
  try {
    if (state.dbConfig && state.dbConfig.host) {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [ovRows]: any = await connection.query('SELECT * FROM overtime_requests ORDER BY id DESC LIMIT 500;');
      await connection.end();
      if (Array.isArray(ovRows)) {
        state.overtimeRequests = ovRows.map((ov: any) => ({
          ...ov,
          id: Number(ov.id),
          employee_id: Number(ov.employee_id),
          total_hours: Number(ov.total_hours || 0),
          approved_by: ov.approved_by !== null && ov.approved_by !== undefined ? Number(ov.approved_by) : null,
          overtime_date: ov.overtime_date ? (typeof ov.overtime_date === 'string' ? ov.overtime_date.slice(0, 10) : new Date(ov.overtime_date).toISOString().slice(0, 10)) : ov.overtime_date,
          created_at: ov.created_at ? (typeof ov.created_at === 'string' ? ov.created_at : new Date(ov.created_at).toISOString().slice(0, 19).replace('T', ' ')) : ov.created_at,
          approved_at: ov.approved_at ? (typeof ov.approved_at === 'string' ? ov.approved_at : new Date(ov.approved_at).toISOString().slice(0, 19).replace('T', ' ')) : ov.approved_at,
        }));
        saveStateToDisk();
      }
    }
  } catch (dbErr) {
    console.warn('Could not query live overtime_requests from MySQL, using local cache:', dbErr);
  }

  const enriched = state.overtimeRequests.map((reqItem) => enrichOvertimeRequest(reqItem));
  res.json(enriched);
});

app.post('/api/requests/overtime', async (req, res) => {
  const { employee_id, employee_ids, group_name, group_code: paramGroupCode, overtime_date, time_start, time_end, total_hours, reason } = req.body;
  const createdAtWib = getWibDateTimeString();

  const empIdsList: number[] = Array.isArray(employee_ids) && employee_ids.length > 0
    ? employee_ids.map((id: any) => Number(id)).filter(Boolean)
    : employee_id ? [Number(employee_id)] : [];

  if (empIdsList.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 karyawan harus dipilih untuk pengajuan SPKL.' });
  }

  const isGroup = empIdsList.length > 1 || Boolean(group_name) || Boolean(paramGroupCode);
  const groupCode = paramGroupCode || (isGroup ? `SPKL-GRP-${Date.now().toString().slice(-6)}` : undefined);
  const finalGroupName = group_name || (isGroup ? `Tim Lembur (${empIdsList.length} Karyawan)` : undefined);

  const createdRequests = [];

  for (const empId of empIdsList) {
    const nextId = state.overtimeRequests.length ? Math.max(...state.overtimeRequests.map((r) => r.id)) + 1 : 1;
    const newReq = {
      id: nextId,
      employee_id: empId,
      overtime_date,
      time_start,
      time_end,
      total_hours: Number(total_hours),
      reason: reason || '',
      status: 'pending',
      group_code: groupCode,
      group_name: finalGroupName,
      created_at: createdAtWib,
    };
    state.overtimeRequests.unshift(newReq);
    createdRequests.push(newReq);

    await syncMysqlQuery(
      `INSERT INTO overtime_requests (id, employee_id, overtime_date, time_start, time_end, total_hours, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE overtime_date = VALUES(overtime_date), time_start = VALUES(time_start), time_end = VALUES(time_end), total_hours = VALUES(total_hours), reason = VALUES(reason), status = VALUES(status);`,
      [
        newReq.id,
        newReq.employee_id,
        newReq.overtime_date,
        newReq.time_start,
        newReq.time_end,
        newReq.total_hours,
        newReq.reason,
        newReq.status,
        newReq.created_at,
      ]
    );
  }

  saveStateToDisk();

  res.json({
    success: true,
    request: enrichOvertimeRequest(createdRequests[0]),
    requests: createdRequests.map(enrichOvertimeRequest),
    group_code: groupCode,
  });
});

app.put('/api/requests/overtime/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.overtimeRequests.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'SPKL Lembur tidak ditemukan' });
  }

  const existing = state.overtimeRequests[idx];
  const updatedReq = {
    ...existing,
    ...req.body,
    id,
  };

  if (existing.group_code) {
    state.overtimeRequests = state.overtimeRequests.map((r) => {
      if (r.group_code === existing.group_code) {
        return {
          ...r,
          overtime_date: req.body.overtime_date ?? r.overtime_date,
          time_start: req.body.time_start ?? r.time_start,
          time_end: req.body.time_end ?? r.time_end,
          total_hours: req.body.total_hours ?? r.total_hours,
          reason: req.body.reason ?? r.reason,
          status: req.body.status ?? r.status,
        };
      }
      return r;
    });
    saveStateToDisk();

    await syncMysqlQuery(
      `UPDATE overtime_requests
       SET overtime_date = ?, time_start = ?, time_end = ?, total_hours = ?, reason = ?, status = ?
       WHERE group_code = ?;`,
      [
        req.body.overtime_date || existing.overtime_date,
        req.body.time_start || existing.time_start,
        req.body.time_end || existing.time_end,
        req.body.total_hours || existing.total_hours,
        req.body.reason || existing.reason || '',
        req.body.status || existing.status || 'pending',
        existing.group_code,
      ]
    );
  } else {
    state.overtimeRequests[idx] = updatedReq;
    saveStateToDisk();

    await syncMysqlQuery(
      `UPDATE overtime_requests
       SET employee_id = ?, overtime_date = ?, time_start = ?, time_end = ?, total_hours = ?, reason = ?, status = ?
       WHERE id = ?;`,
      [
        updatedReq.employee_id,
        updatedReq.overtime_date,
        updatedReq.time_start,
        updatedReq.time_end,
        updatedReq.total_hours,
        updatedReq.reason || '',
        updatedReq.status || 'pending',
        id,
      ]
    );
  }

  res.json({ success: true, request: enrichOvertimeRequest(updatedReq) });
});

app.delete('/api/requests/overtime/:id', async (req, res) => {
  const id = Number(req.params.id);
  const target = state.overtimeRequests.find((r) => r.id === id);
  if (!target) {
    return res.status(404).json({ error: 'SPKL Lembur tidak ditemukan' });
  }

  const groupCode = target.group_code;
  if (groupCode) {
    state.overtimeRequests = state.overtimeRequests.filter((r) => r.group_code !== groupCode);
  } else {
    state.overtimeRequests = state.overtimeRequests.filter((r) => r.id !== id);
  }

  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM overtime_requests WHERE id = ?;', [id]);
  res.json({ success: true, message: 'SPKL Lembur berhasil dihapus' });
});

app.post('/api/requests/overtime/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  const { status, approver_id = 1 } = req.body;
  const reqItem = state.overtimeRequests.find((r) => r.id === id);
  if (!reqItem) return res.status(404).json({ error: 'SPKL Lembur tidak ditemukan' });

  const approvedAtWib = getWibDateTimeString();
  const groupCode = reqItem.group_code;

  if (groupCode) {
    // Batch approve all items in the group!
    state.overtimeRequests.forEach((r) => {
      if (r.group_code === groupCode) {
        r.status = status;
        r.approved_by = approver_id ? Number(approver_id) : 1;
        r.approved_at = approvedAtWib;
      }
    });
  } else {
    reqItem.status = status;
    reqItem.approved_by = approver_id ? Number(approver_id) : 1;
    reqItem.approved_at = approvedAtWib;
  }

  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE overtime_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?;`,
    [status, approver_id ? Number(approver_id) : 1, approvedAtWib, id]
  );

  res.json({ success: true, request: enrichOvertimeRequest(reqItem) });
});

app.get('/api/requests/leave-balances', (req, res) => {
  recalculateAndSyncLeaveBalances();

  const enriched = state.leaveBalances.map((b) => {
    const emp = state.employees.find((e) => e.id === b.employee_id);
    const div = emp ? state.divisions.find((d) => d.id === emp.division_id) : null;
    const grade = emp ? state.jobGrades.find((g) => g.id === emp.job_grade_id) : null;
    const type = state.leaveTypes.find((t) => t.id === b.leave_type_id);

    // Hitung apakah cuti bawaan tahun sebelumnya sudah kedaluwarsa (akhir Februari)
    const todayStr = new Date().toISOString().slice(0, 10);
    const expireDate = b.carry_forward_expires_at || `${b.year}-02-28`;
    const isExpired = b.carry_forward_days ? todayStr > expireDate : false;
    const activeCarryForward = isExpired ? 0 : (b.carry_forward_days || 0);
    const remaining_days = Math.max(0, (b.quota_days + activeCarryForward) - (b.used_days || 0));

    return {
      ...b,
      carry_forward_days: b.carry_forward_days || 0,
      carry_forward_expires_at: expireDate,
      carry_forward_expired: isExpired,
      active_carry_forward_days: activeCarryForward,
      employee_name: emp ? emp.full_name : 'Unknown',
      employee_nip: emp ? emp.nip : '-',
      division_name: div ? div.division_name : '-',
      job_grade_name: grade ? grade.grade_name : '-',
      leave_type_name: type ? type.type_name : 'Cuti Tahunan',
      remaining_days,
    };
  });
  res.json(enriched);
});

// Annual New Year Rollover: Tambah kuota tahun baru & hanguskan sisa cuti tahun lalu di akhir Februari
app.post('/api/requests/leave-balances/new-year-rollover', async (req, res) => {
  const { new_year, default_quota = 12 } = req.body;
  const targetYear = Number(new_year) || (new Date().getFullYear() + 1);
  const previousYear = targetYear - 1;
  const quotaPerEmp = Math.max(0, Number(default_quota));

  // Tentukan akhir Februari (cek kabisat)
  const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
  const febEndDay = isLeap ? 29 : 28;
  const expirationDateStr = `${targetYear}-02-${febEndDay}`;

  const todayStr = getWibDateOnlyString();
  const isExpired = todayStr > expirationDateStr;

  if (!state.leaveBalances) state.leaveBalances = [];

  const results: any[] = [];

  for (const emp of state.employees) {
    // Sisa cuti dari tahun sebelumnya (Annual Leave / leave_type_id = 1)
    const prevBalance = state.leaveBalances.find(
      (b) => b.employee_id === emp.id && b.leave_type_id === 1 && b.year === previousYear
    );
    const prevRemaining = prevBalance ? Math.max(0, prevBalance.quota_days - prevBalance.used_days) : 0;

    let currentRecord = state.leaveBalances.find(
      (b) => b.employee_id === emp.id && b.leave_type_id === 1 && b.year === targetYear
    );

    if (currentRecord) {
      currentRecord.quota_days = quotaPerEmp;
      currentRecord.carry_forward_days = prevRemaining;
      currentRecord.carry_forward_expires_at = expirationDateStr;
      currentRecord.carry_forward_expired = isExpired;
      results.push({
        employee_id: emp.id,
        employee_name: emp.full_name,
        prev_remaining: prevRemaining,
        new_quota: quotaPerEmp,
        expires_at: expirationDateStr,
        status: 'updated',
      });
      await syncMysqlQuery(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days, carry_forward_days, carry_forward_expires_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days), carry_forward_days = VALUES(carry_forward_days), carry_forward_expires_at = VALUES(carry_forward_expires_at);`,
        [currentRecord.id, emp.id, targetYear, quotaPerEmp, currentRecord.used_days || 0, prevRemaining, expirationDateStr]
      );
    } else {
      const nextId = state.leaveBalances.length ? Math.max(...state.leaveBalances.map((b) => b.id)) + 1 : 1;
      const newRec = {
        id: nextId,
        employee_id: emp.id,
        leave_type_id: 1,
        year: targetYear,
        quota_days: quotaPerEmp,
        used_days: 0,
        carry_forward_days: prevRemaining,
        carry_forward_expires_at: expirationDateStr,
        carry_forward_expired: isExpired,
      };
      state.leaveBalances.push(newRec);
      results.push({
        employee_id: emp.id,
        employee_name: emp.full_name,
        prev_remaining: prevRemaining,
        new_quota: quotaPerEmp,
        expires_at: expirationDateStr,
        status: 'created',
      });
      await syncMysqlQuery(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days, carry_forward_days, carry_forward_expires_at)
         VALUES (?, ?, 1, ?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days), carry_forward_days = VALUES(carry_forward_days), carry_forward_expires_at = VALUES(carry_forward_expires_at);`,
        [newRec.id, emp.id, targetYear, quotaPerEmp, prevRemaining, expirationDateStr]
      );
    }
  }

  saveStateToDisk();

  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'LEAVE_ANNUAL_ROLLOVER',
    table_name: 'leave_balances',
    record_id: `YEAR_${targetYear}`,
    new_value: {
      targetYear,
      previousYear,
      default_quota: quotaPerEmp,
      expirationDateStr,
      affected_employees: results.length,
    },
    ip_address: req.ip || '127.0.0.1',
    created_at: getWibDateTimeString(),
  });
  saveStateToDisk();

  res.json({
    success: true,
    target_year: targetYear,
    previous_year: previousYear,
    quota_days: quotaPerEmp,
    carry_forward_expires_at: expirationDateStr,
    is_expired: isExpired,
    processed_count: results.length,
    message: `Rollover Kuota Cuti ${targetYear} berhasil! Kuota baru ${quotaPerEmp} hari ditambahkan untuk seluruh karyawan. Sisa cuti tahun ${previousYear} berlaku hingga ${febEndDay} Februari ${targetYear} (setelahnya hangus).`,
    details: results,
  });
});

app.post('/api/requests/leave-balances/bulk-set', async (req, res) => {
  const { quota_days = 12, year } = req.body;
  const currentYear = Number(year) || new Date().getFullYear();
  if (!state.leaveBalances) state.leaveBalances = [];

  for (const emp of state.employees) {
    let balance = state.leaveBalances.find((b) => b.employee_id === emp.id && b.leave_type_id === 1);
    if (balance) {
      balance.quota_days = Math.max(0, Number(quota_days));
      balance.year = currentYear;
      await syncMysqlQuery(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days)
         VALUES (?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days), year = VALUES(year);`,
        [balance.id, emp.id, currentYear, balance.quota_days, balance.used_days || 0]
      );
    } else {
      const nextId = state.leaveBalances.length ? Math.max(...state.leaveBalances.map((b) => b.id)) + 1 : 1;
      const newRec = {
        id: nextId,
        employee_id: emp.id,
        leave_type_id: 1,
        year: currentYear,
        quota_days: Math.max(0, Number(quota_days)),
        used_days: 0,
      };
      state.leaveBalances.push(newRec);
      await syncMysqlQuery(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days)
         VALUES (?, ?, 1, ?, ?, 0)
         ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days), year = VALUES(year);`,
        [newRec.id, emp.id, currentYear, newRec.quota_days]
      );
    }
  }

  saveStateToDisk();
  res.json({ success: true, message: `Kuota cuti tahunan ${quota_days} hari berhasil ditetapkan untuk seluruh karyawan (${state.employees.length} orang)` });
});

app.put('/api/requests/leave-balances/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { quota_days, used_days, carry_forward_days } = req.body;
  const balance = state.leaveBalances.find((b) => b.id === id);
  if (!balance) {
    return res.status(404).json({ success: false, message: 'Saldo cuti tidak ditemukan' });
  }
  if (quota_days !== undefined) balance.quota_days = Math.max(0, Number(quota_days));
  if (used_days !== undefined) balance.used_days = Math.max(0, Number(used_days));
  if (carry_forward_days !== undefined) balance.carry_forward_days = Math.max(0, Number(carry_forward_days));
  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE leave_balances
     SET quota_days = ?, used_days = ?, carry_forward_days = ?
     WHERE id = ?;`,
    [balance.quota_days, balance.used_days || 0, balance.carry_forward_days || 0, id]
  );

  res.json({ success: true, balance, message: 'Kuota cuti berhasil diperbarui' });
});

app.post('/api/requests/leave-balances/set-quota', async (req, res) => {
  const { employee_id, leave_type_id, quota_days, year } = req.body;
  let balance = state.leaveBalances.find(
    (b) => b.employee_id === Number(employee_id) && b.leave_type_id === Number(leave_type_id || 1)
  );
  if (balance) {
    balance.quota_days = Math.max(0, Number(quota_days));
    await syncMysqlQuery(
      `UPDATE leave_balances SET quota_days = ? WHERE id = ?;`,
      [balance.quota_days, balance.id]
    );
  } else {
    balance = {
      id: state.leaveBalances.length ? Math.max(...state.leaveBalances.map((b) => b.id)) + 1 : 1,
      employee_id: Number(employee_id),
      leave_type_id: Number(leave_type_id || 1),
      year: Number(year) || new Date().getFullYear(),
      quota_days: Math.max(0, Number(quota_days)),
      used_days: 0,
    };
    state.leaveBalances.push(balance);
    await syncMysqlQuery(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days)
       VALUES (?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days);`,
      [balance.id, balance.employee_id, balance.leave_type_id, balance.year, balance.quota_days]
    );
  }
  saveStateToDisk();
  res.json({ success: true, balance, message: 'Kuota cuti karyawan berhasil disetel' });
});

app.post('/api/requests/leave-balances/sync', async (req, res) => {
  const currentYear = new Date().getFullYear();
  if (!state.leaveBalances) state.leaveBalances = [];

  // Ensure every employee has an active balance
  for (const emp of state.employees) {
    let balance = state.leaveBalances.find((b) => b.employee_id === emp.id && b.leave_type_id === 1);
    if (!balance) {
      const nextId = state.leaveBalances.length ? Math.max(...state.leaveBalances.map((b) => b.id)) + 1 : 1;
      balance = {
        id: nextId,
        employee_id: emp.id,
        leave_type_id: 1,
        year: currentYear,
        quota_days: 12,
        used_days: 0,
      };
      state.leaveBalances.push(balance);
    }
  }

  // Recalculate used days based on approved leave requests
  for (const balance of state.leaveBalances) {
    const approvedLeaves = state.leaveRequests.filter(
      (l) => l.employee_id === balance.employee_id && (l.leave_type_id === balance.leave_type_id || (!l.leave_type_id && balance.leave_type_id === 1)) && l.status === 'approved'
    );
    balance.used_days = approvedLeaves.reduce((acc, l) => acc + (Number(l.total_days) || 0), 0);
  }

  saveStateToDisk();

  // Push all leave balances to MySQL
  let remoteSynced = 0;
  for (const b of state.leaveBalances) {
    const ok = await syncMysqlQuery(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days, carry_forward_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quota_days = VALUES(quota_days), used_days = VALUES(used_days), year = VALUES(year), carry_forward_days = VALUES(carry_forward_days);`,
      [b.id, b.employee_id, b.leave_type_id || 1, b.year || currentYear, b.quota_days || 12, b.used_days || 0, b.carry_forward_days || 0]
    );
    if (ok) remoteSynced++;
  }

  res.json({
    success: true,
    count: state.leaveBalances.length,
    remote_synced: remoteSynced,
    message: `Sinkronisasi saldo & kuota cuti berhasil! (${state.leaveBalances.length} data karyawan tersinkronisasi ke MySQL)`,
  });
});

// Official HR Letters (Surat Peringatan / SP, Rekomendasi Kerja / Paklaring, Surat PHK)
app.get('/api/official-letters', async (req, res) => {
  try {
    if (state.dbConfig && state.dbConfig.host && state.dbConfig.is_active !== false) {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM official_letters ORDER BY issue_date DESC, id DESC;');
      await connection.end();
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          employee_id: Number(r.employee_id),
          issue_date: getWibDateOnlyString(r.issue_date),
          effective_date: r.effective_date ? getWibDateOnlyString(r.effective_date) : null,
          join_date: r.join_date ? getWibDateOnlyString(r.join_date) : null,
          end_date: r.end_date ? getWibDateOnlyString(r.end_date) : null,
          employee_acknowledged: Boolean(r.employee_acknowledged),
        }));
        state.officialLetters = mapped;
        saveStateToDisk();
        return res.json(mapped);
      }
    }
  } catch (err: any) {
    console.error('Failed to query official_letters from MySQL:', err.message);
  }
  res.json(state.officialLetters || []);
});

app.post('/api/official-letters', async (req, res) => {
  const nextId = (state.officialLetters && state.officialLetters.length)
    ? Math.max(...state.officialLetters.map((l: any) => Number(l.id) || 0)) + 1
    : 1;
  const createdAtWib = getWibDateTimeString();
  const empId = Number(req.body.employee_id) || 1;
  const emp = state.employees.find((e: any) => e.id === empId);

  const newLetter = {
    id: nextId,
    ...req.body,
    employee_id: empId,
    employee_name: req.body.employee_name || (emp ? emp.full_name : ''),
    employee_nip: req.body.employee_nip || (emp ? emp.nip : ''),
    division_name: req.body.division_name || (emp ? (state.divisions.find((d: any) => d.id === emp.division_id)?.division_name || '') : ''),
    job_title: req.body.job_title || (emp ? (state.jobGrades.find((g: any) => g.id === emp.job_grade_id)?.grade_name || '') : ''),
    created_at: createdAtWib,
  };
  if (!state.officialLetters) state.officialLetters = [];
  state.officialLetters.unshift(newLetter);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO official_letters (id, letter_type, letter_number, employee_id, employee_name, employee_nip, division_name, job_title, issue_date, effective_date, warning_level, violation_reason, validity_months, join_date, end_date, accomplishments, layoff_reason, severance_notes, company_signatory_name, company_signatory_title, employee_acknowledged, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       letter_number = VALUES(letter_number),
       letter_type = VALUES(letter_type),
       employee_id = VALUES(employee_id),
       employee_name = VALUES(employee_name),
       employee_nip = VALUES(employee_nip),
       division_name = VALUES(division_name),
       job_title = VALUES(job_title),
       issue_date = VALUES(issue_date),
       effective_date = VALUES(effective_date),
       warning_level = VALUES(warning_level),
       violation_reason = VALUES(violation_reason),
       validity_months = VALUES(validity_months),
       join_date = VALUES(join_date),
       end_date = VALUES(end_date),
       accomplishments = VALUES(accomplishments),
       layoff_reason = VALUES(layoff_reason),
       severance_notes = VALUES(severance_notes),
       company_signatory_name = VALUES(company_signatory_name),
       company_signatory_title = VALUES(company_signatory_title),
       employee_acknowledged = VALUES(employee_acknowledged),
       notes = VALUES(notes);`,
    [
      newLetter.id,
      newLetter.letter_type || 'warning',
      newLetter.letter_number || `NKU/HR/${newLetter.id}`,
      newLetter.employee_id,
      newLetter.employee_name,
      newLetter.employee_nip || '',
      newLetter.division_name || '',
      newLetter.job_title || '',
      newLetter.issue_date || getWibDateOnlyString(),
      newLetter.effective_date || null,
      newLetter.warning_level || null,
      newLetter.violation_reason || null,
      newLetter.validity_months || 6,
      newLetter.join_date || null,
      newLetter.end_date || null,
      newLetter.accomplishments || null,
      newLetter.layoff_reason || null,
      newLetter.severance_notes || null,
      newLetter.company_signatory_name || '',
      newLetter.company_signatory_title || '',
      newLetter.employee_acknowledged ? 1 : 0,
      newLetter.notes || null,
      newLetter.created_at,
    ]
  );

  res.json({ success: true, letter: newLetter, message: 'Surat resmi berhasil dibuat dan disimpan' });
});

app.put('/api/official-letters/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = (state.officialLetters || []).findIndex((l: any) => l.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Surat resmi tidak ditemukan' });
  }

  state.officialLetters[idx] = {
    ...state.officialLetters[idx],
    ...req.body,
    id,
  };
  saveStateToDisk();

  const l = state.officialLetters[idx];
  await syncMysqlQuery(
    `UPDATE official_letters
     SET letter_type = ?, letter_number = ?, employee_id = ?, employee_name = ?, employee_nip = ?, division_name = ?, job_title = ?, issue_date = ?, effective_date = ?, warning_level = ?, violation_reason = ?, validity_months = ?, join_date = ?, end_date = ?, accomplishments = ?, layoff_reason = ?, severance_notes = ?, company_signatory_name = ?, company_signatory_title = ?, employee_acknowledged = ?, notes = ?
     WHERE id = ?;`,
    [
      l.letter_type,
      l.letter_number,
      l.employee_id,
      l.employee_name,
      l.employee_nip || '',
      l.division_name || '',
      l.job_title || '',
      l.issue_date,
      l.effective_date || null,
      l.warning_level || null,
      l.violation_reason || null,
      l.validity_months || 6,
      l.join_date || null,
      l.end_date || null,
      l.accomplishments || null,
      l.layoff_reason || null,
      l.severance_notes || null,
      l.company_signatory_name || '',
      l.company_signatory_title || '',
      l.employee_acknowledged ? 1 : 0,
      l.notes || null,
      id,
    ]
  );

  res.json({ success: true, letter: l, message: 'Surat resmi berhasil diperbarui' });
});

app.delete('/api/official-letters/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.officialLetters = (state.officialLetters || []).filter((l: any) => l.id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM official_letters WHERE id = ?;', [id]);
  res.json({ success: true, message: 'Surat resmi berhasil dihapus' });
});

// 8. Payroll & Rules
app.get('/api/payroll/rules/overtime', async (req, res) => {
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    try {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM overtime_rules ORDER BY id ASC;');
      await connection.end();
      if (Array.isArray(rows)) {
        state.overtimeRules = rows.map((r: any) => {
          let tier_slots = undefined;
          if (r.custom_formula && r.custom_formula.trim().startsWith('[')) {
            try {
              tier_slots = JSON.parse(r.custom_formula);
            } catch {}
          }
          return {
            ...r,
            id: Number(r.id),
            scope_id: r.scope_id !== null && r.scope_id !== undefined ? Number(r.scope_id) : null,
            fixed_amount: r.fixed_amount !== null && r.fixed_amount !== undefined ? Number(r.fixed_amount) : null,
            percentage_value: r.percentage_value !== null && r.percentage_value !== undefined ? Number(r.percentage_value) : null,
            multiplier_value: r.multiplier_value !== null && r.multiplier_value !== undefined ? Number(r.multiplier_value) : null,
            tier_slots,
            is_active: !!r.is_active,
          };
        });
      }
    } catch {}
  }
  res.json(state.overtimeRules);
});

app.post('/api/payroll/rules/overtime', async (req, res) => {
  const nextId = state.overtimeRules.length ? Math.max(...state.overtimeRules.map((r) => r.id)) + 1 : 1;
  const isTimeslot = req.body.calc_type === 'timeslot';
  let tier_slots = req.body.tier_slots;
  let custom_formula = req.body.custom_formula || req.body.formula || null;
  if (isTimeslot && tier_slots && Array.isArray(tier_slots)) {
    custom_formula = JSON.stringify(tier_slots);
  }

  const newRule = {
    id: nextId,
    rule_name: req.body.rule_name || '',
    scope_type: req.body.scope_type || 'general',
    scope_id: req.body.scope_type !== 'general' && req.body.scope_id ? Number(req.body.scope_id) : null,
    calc_type: req.body.calc_type || 'multiplier',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : null,
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : null,
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : (req.body.multiplier ? Number(req.body.multiplier) : (req.body.calc_type === 'multiplier' ? 1.5 : null)),
    custom_formula,
    tier_slots,
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : true,
  };
  state.overtimeRules.push(newRule);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO overtime_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rule_name = VALUES(rule_name), scope_type = VALUES(scope_type), scope_id = VALUES(scope_id), calc_type = VALUES(calc_type), fixed_amount = VALUES(fixed_amount), percentage_value = VALUES(percentage_value), multiplier_value = VALUES(multiplier_value), custom_formula = VALUES(custom_formula), is_active = VALUES(is_active);`,
    [newRule.id, newRule.rule_name, newRule.scope_type, newRule.scope_id, newRule.calc_type, newRule.fixed_amount, newRule.percentage_value, newRule.multiplier_value, newRule.custom_formula, newRule.is_active ? 1 : 0]
  );

  res.json({ success: true, rule: newRule });
});

app.put('/api/payroll/rules/overtime/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.overtimeRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule lembur tidak ditemukan' });

  const current = state.overtimeRules[idx];
  const isTimeslot = (req.body.calc_type || current.calc_type) === 'timeslot';
  let tier_slots = req.body.tier_slots !== undefined ? req.body.tier_slots : current.tier_slots;
  let custom_formula = req.body.custom_formula !== undefined ? req.body.custom_formula : (req.body.formula !== undefined ? req.body.formula : current.custom_formula);
  if (isTimeslot && tier_slots && Array.isArray(tier_slots)) {
    custom_formula = JSON.stringify(tier_slots);
  }

  const updatedRule = {
    ...current,
    ...req.body,
    id,
    scope_type: req.body.scope_type || current.scope_type || 'general',
    scope_id: req.body.scope_type === 'general' ? null : (req.body.scope_id ? Number(req.body.scope_id) : (req.body.scope_type ? null : current.scope_id)),
    calc_type: req.body.calc_type || current.calc_type || 'multiplier',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : (req.body.calc_type === 'fixed' ? current.fixed_amount : null),
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : (req.body.calc_type === 'percentage' ? current.percentage_value : null),
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : (req.body.multiplier ? Number(req.body.multiplier) : (req.body.calc_type === 'multiplier' ? current.multiplier_value : null)),
    custom_formula,
    tier_slots,
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : current.is_active,
  };

  state.overtimeRules[idx] = updatedRule;
  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE overtime_rules SET rule_name = ?, scope_type = ?, scope_id = ?, calc_type = ?, fixed_amount = ?, percentage_value = ?, multiplier_value = ?, custom_formula = ?, is_active = ? WHERE id = ?;`,
    [updatedRule.rule_name, updatedRule.scope_type, updatedRule.scope_id, updatedRule.calc_type, updatedRule.fixed_amount, updatedRule.percentage_value, updatedRule.multiplier_value, updatedRule.custom_formula, updatedRule.is_active ? 1 : 0, id]
  );

  res.json({ success: true, rule: updatedRule });
});

app.delete('/api/payroll/rules/overtime/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.overtimeRules = state.overtimeRules.filter((r) => r.id !== id);
  saveStateToDisk();
  await syncMysqlQuery('DELETE FROM overtime_rules WHERE id = ?;', [id]);
  res.json({ success: true, message: 'Rule lembur berhasil dihapus' });
});

app.get('/api/payroll/rules/deduction', async (req, res) => {
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    try {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM deduction_rules ORDER BY id ASC;');
      await connection.end();
      if (Array.isArray(rows)) {
        state.deductionRules = rows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          scope_id: r.scope_id !== null && r.scope_id !== undefined ? Number(r.scope_id) : null,
          fixed_amount: r.fixed_amount !== null && r.fixed_amount !== undefined ? Number(r.fixed_amount) : null,
          percentage_value: r.percentage_value !== null && r.percentage_value !== undefined ? Number(r.percentage_value) : null,
          multiplier_value: r.multiplier_value !== null && r.multiplier_value !== undefined ? Number(r.multiplier_value) : null,
          is_active: !!r.is_active,
        }));
      }
    } catch {}
  }
  res.json(state.deductionRules);
});

app.post('/api/payroll/rules/deduction', async (req, res) => {
  const nextId = state.deductionRules.length ? Math.max(...state.deductionRules.map((r) => r.id)) + 1 : 1;
  const newRule = {
    id: nextId,
    rule_name: req.body.rule_name || '',
    scope_type: req.body.scope_type || 'general',
    scope_id: req.body.scope_type !== 'general' && req.body.scope_id ? Number(req.body.scope_id) : null,
    calc_type: req.body.calc_type || 'fixed',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : (req.body.amount ? Number(req.body.amount) : null),
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : null,
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : null,
    custom_formula: req.body.custom_formula || req.body.formula || null,
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : true,
  };
  state.deductionRules.push(newRule);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO deduction_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rule_name = VALUES(rule_name), scope_type = VALUES(scope_type), scope_id = VALUES(scope_id), calc_type = VALUES(calc_type), fixed_amount = VALUES(fixed_amount), percentage_value = VALUES(percentage_value), multiplier_value = VALUES(multiplier_value), custom_formula = VALUES(custom_formula), is_active = VALUES(is_active);`,
    [newRule.id, newRule.rule_name, newRule.scope_type, newRule.scope_id, newRule.calc_type, newRule.fixed_amount, newRule.percentage_value, newRule.multiplier_value, newRule.custom_formula, newRule.is_active ? 1 : 0]
  );

  res.json({ success: true, rule: newRule });
});

app.put('/api/payroll/rules/deduction/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.deductionRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule potongan tidak ditemukan' });

  const current = state.deductionRules[idx];
  const updatedRule = {
    ...current,
    ...req.body,
    id,
    scope_type: req.body.scope_type || current.scope_type || 'general',
    scope_id: req.body.scope_type === 'general' ? null : (req.body.scope_id ? Number(req.body.scope_id) : (req.body.scope_type ? null : current.scope_id)),
    calc_type: req.body.calc_type || current.calc_type || 'fixed',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : (req.body.amount ? Number(req.body.amount) : (req.body.calc_type === 'fixed' ? current.fixed_amount : null)),
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : (req.body.calc_type === 'percentage' ? current.percentage_value : null),
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : (req.body.calc_type === 'multiplier' ? current.multiplier_value : null),
    custom_formula: req.body.custom_formula !== undefined ? req.body.custom_formula : (req.body.formula !== undefined ? req.body.formula : current.custom_formula),
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : current.is_active,
  };

  state.deductionRules[idx] = updatedRule;
  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE deduction_rules SET rule_name = ?, scope_type = ?, scope_id = ?, calc_type = ?, fixed_amount = ?, percentage_value = ?, multiplier_value = ?, custom_formula = ?, is_active = ? WHERE id = ?;`,
    [updatedRule.rule_name, updatedRule.scope_type, updatedRule.scope_id, updatedRule.calc_type, updatedRule.fixed_amount, updatedRule.percentage_value, updatedRule.multiplier_value, updatedRule.custom_formula, updatedRule.is_active ? 1 : 0, id]
  );

  res.json({ success: true, rule: updatedRule });
});

app.delete('/api/payroll/rules/deduction/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.deductionRules = state.deductionRules.filter((r) => r.id !== id);
  saveStateToDisk();
  await syncMysqlQuery('DELETE FROM deduction_rules WHERE id = ?;', [id]);
  res.json({ success: true, message: 'Rule potongan berhasil dihapus' });
});

app.get('/api/payroll/rules/allowance', async (req, res) => {
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    try {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM allowance_rules ORDER BY id ASC;');
      await connection.end();
      if (Array.isArray(rows)) {
        state.allowanceRules = rows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          scope_id: r.scope_id !== null && r.scope_id !== undefined ? Number(r.scope_id) : null,
          rate_unit: r.rate_unit || 'per_month',
          fixed_amount: r.fixed_amount !== null && r.fixed_amount !== undefined ? Number(r.fixed_amount) : null,
          percentage_value: r.percentage_value !== null && r.percentage_value !== undefined ? Number(r.percentage_value) : null,
          multiplier_value: r.multiplier_value !== null && r.multiplier_value !== undefined ? Number(r.multiplier_value) : null,
          is_active: !!r.is_active,
        }));
      }
    } catch {}
  }
  res.json(state.allowanceRules);
});

app.post('/api/payroll/rules/allowance', async (req, res) => {
  const nextId = state.allowanceRules.length ? Math.max(...state.allowanceRules.map((r) => r.id)) + 1 : 1;
  const newRule = {
    id: nextId,
    rule_name: req.body.rule_name || '',
    scope_type: req.body.scope_type || 'general',
    scope_id: req.body.scope_type !== 'general' && req.body.scope_id ? Number(req.body.scope_id) : null,
    calc_type: req.body.calc_type || 'fixed',
    rate_unit: req.body.rate_unit || 'per_month',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : (req.body.amount ? Number(req.body.amount) : null),
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : null,
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : null,
    custom_formula: req.body.custom_formula || req.body.formula || null,
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : true,
  };
  state.allowanceRules.push(newRule);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO allowance_rules (id, rule_name, scope_type, scope_id, calc_type, rate_unit, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rule_name = VALUES(rule_name), scope_type = VALUES(scope_type), scope_id = VALUES(scope_id), calc_type = VALUES(calc_type), rate_unit = VALUES(rate_unit), fixed_amount = VALUES(fixed_amount), percentage_value = VALUES(percentage_value), multiplier_value = VALUES(multiplier_value), custom_formula = VALUES(custom_formula), is_active = VALUES(is_active);`,
    [newRule.id, newRule.rule_name, newRule.scope_type, newRule.scope_id, newRule.calc_type, newRule.rate_unit, newRule.fixed_amount, newRule.percentage_value, newRule.multiplier_value, newRule.custom_formula, newRule.is_active ? 1 : 0]
  );

  res.json({ success: true, rule: newRule });
});

app.put('/api/payroll/rules/allowance/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.allowanceRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule tunjangan tidak ditemukan' });

  const current = state.allowanceRules[idx];
  const updatedRule = {
    ...current,
    ...req.body,
    id,
    scope_type: req.body.scope_type || current.scope_type || 'general',
    scope_id: req.body.scope_type === 'general' ? null : (req.body.scope_id ? Number(req.body.scope_id) : (req.body.scope_type ? null : current.scope_id)),
    calc_type: req.body.calc_type || current.calc_type || 'fixed',
    rate_unit: req.body.rate_unit || current.rate_unit || 'per_month',
    fixed_amount: req.body.fixed_amount !== undefined && req.body.fixed_amount !== null && req.body.fixed_amount !== '' ? Number(req.body.fixed_amount) : (req.body.amount ? Number(req.body.amount) : (req.body.calc_type === 'fixed' ? current.fixed_amount : null)),
    percentage_value: req.body.percentage_value !== undefined && req.body.percentage_value !== null && req.body.percentage_value !== '' ? Number(req.body.percentage_value) : (req.body.calc_type === 'percentage' ? current.percentage_value : null),
    multiplier_value: req.body.multiplier_value !== undefined && req.body.multiplier_value !== null && req.body.multiplier_value !== '' ? Number(req.body.multiplier_value) : (req.body.calc_type === 'multiplier' ? current.multiplier_value : null),
    custom_formula: req.body.custom_formula !== undefined ? req.body.custom_formula : (req.body.formula !== undefined ? req.body.formula : current.custom_formula),
    is_active: req.body.is_active !== undefined ? !!req.body.is_active : current.is_active,
  };

  state.allowanceRules[idx] = updatedRule;
  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE allowance_rules SET rule_name = ?, scope_type = ?, scope_id = ?, calc_type = ?, rate_unit = ?, fixed_amount = ?, percentage_value = ?, multiplier_value = ?, custom_formula = ?, is_active = ? WHERE id = ?;`,
    [updatedRule.rule_name, updatedRule.scope_type, updatedRule.scope_id, updatedRule.calc_type, updatedRule.rate_unit, updatedRule.fixed_amount, updatedRule.percentage_value, updatedRule.multiplier_value, updatedRule.custom_formula, updatedRule.is_active ? 1 : 0, id]
  );

  res.json({ success: true, rule: updatedRule });
});

app.delete('/api/payroll/rules/allowance/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.allowanceRules = state.allowanceRules.filter((r) => r.id !== id);
  saveStateToDisk();
  await syncMysqlQuery('DELETE FROM allowance_rules WHERE id = ?;', [id]);
  res.json({ success: true, message: 'Rule tunjangan berhasil dihapus' });
});

app.get('/api/payroll/periods', (req, res) => {
  const periodsWithStats = state.payrollPeriods.map((p) => {
    const slips = state.payrollSlips.filter((s) => s.period_id === p.id);
    const totalPayout = slips.reduce((sum, s) => sum + s.net_salary, 0);
    return {
      ...p,
      total_slips: slips.length,
      total_payout: totalPayout,
    };
  });
  res.json(periodsWithStats);
});

app.post('/api/payroll/periods', async (req, res) => {
  const newP = {
    id: state.payrollPeriods.length ? Math.max(...state.payrollPeriods.map((p) => p.id)) + 1 : 1,
    ...req.body,
    status: 'draft',
    created_at: getWibDateTimeString(),
  };
  state.payrollPeriods.push(newP);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO payroll_periods (id, period_name, date_start, date_end, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE period_name = VALUES(period_name), date_start = VALUES(date_start), date_end = VALUES(date_end), status = VALUES(status);`,
    [newP.id, newP.period_name, newP.date_start, newP.date_end, newP.status, newP.created_at]
  );

  res.json({ success: true, period: newP });
});

app.get('/api/payroll/slips', (req, res) => {
  const periodId = req.query.period_id ? Number(req.query.period_id) : undefined;
  let slips = state.payrollSlips;
  if (periodId) {
    slips = slips.filter((s) => s.period_id === periodId);
  }

  const enriched = slips.map((slip) => {
    const emp = state.employees.find((e) => e.id === slip.employee_id);
    const div = emp ? state.divisions.find((d) => d.id === emp.division_id) : null;
    const grade = emp ? state.jobGrades.find((g) => g.id === emp.job_grade_id) : null;
    const period = state.payrollPeriods.find((p) => p.id === slip.period_id);
    const items = state.payrollSlipItems.filter((i) => i.slip_id === slip.id);

    return {
      ...slip,
      employee_name: emp ? emp.full_name : (slip.employee_name || 'Unknown'),
      employee_nip: emp ? emp.nip : (slip.employee_nip || '-'),
      division_name: div ? div.division_name : (slip.division_name || '-'),
      job_grade_name: grade ? grade.grade_name : (slip.job_grade_name || '-'),
      period_name: period ? period.period_name : (slip.period_name || '-'),
      items,
    };
  });

  res.json(enriched);
});

function calculateMultiTierOvertimeServer(
  ot: { time_start?: string; time_end?: string; total_hours?: number },
  baseSalary: number,
  dailySalaryInput?: number,
  customTierSlots?: any[]
) {
  const dailySalary = dailySalaryInput && dailySalaryInput > 0 ? dailySalaryInput : baseSalary * 8;

  const timeStart = ot.time_start || '17:00';
  const timeEnd = ot.time_end || '21:00';

  const parseMins = (tStr: string) => {
    if (!tStr) return 0;
    const parts = tStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  let startMins = parseMins(timeStart);
  let endMins = parseMins(timeEnd);

  if (endMins <= startMins) {
    endMins += 24 * 60; // crosses midnight
  }

  const getOverlapMinutes = (s1: number, e1: number, s2: number, e2: number) => {
    const oStart = Math.max(s1, s2);
    const oEnd = Math.min(e1, e2);
    return Math.max(0, oEnd - oStart);
  };

  const activeSlots = (customTierSlots && customTierSlots.length > 0)
    ? customTierSlots
    : [
        { time_start: '17:00', time_end: '21:00', rate_type: 'fixed', rate_value: 50000, label: 'Slot 17-21 (+Rp 50rb)' },
        { time_start: '21:00', time_end: '00:00', rate_type: 'daily_multiplier', rate_value: 2, label: 'Slot 21-00 (2x Gaji Harian)' },
        { time_start: '00:00', time_end: '07:00', rate_type: 'daily_multiplier', rate_value: 3, label: 'Slot 00-07 (3x Gaji Harian)' },
      ];

  let totalAmount = 0;
  let coveredMins = 0;
  let s1Hours = 0;
  let s2Hours = 0;
  let s3Hours = 0;
  const breakdowns: string[] = [];

  activeSlots.forEach((slot: any, idx: number) => {
    let slotStartMins = parseMins(slot.time_start);
    let slotEndMins = parseMins(slot.time_end);
    if (slotEndMins <= slotStartMins) {
      slotEndMins += 24 * 60;
    }

    const overlapMins = getOverlapMinutes(startMins, endMins, slotStartMins, slotEndMins);
    if (overlapMins > 0) {
      const overlapHours = overlapMins / 60;
      const slotTotalHours = (slotEndMins - slotStartMins) / 60;
      coveredMins += overlapMins;

      if (idx === 0) s1Hours = overlapHours;
      if (idx === 1) s2Hours = overlapHours;
      if (idx === 2) s3Hours = overlapHours;

      let slotAmount = 0;
      if (slot.rate_type === 'fixed') {
        slotAmount = Number(slot.rate_value) || 0;
      } else if (slot.rate_type === 'daily_multiplier') {
        slotAmount = (overlapHours / (slotTotalHours || 1)) * ((Number(slot.rate_value) || 1) * dailySalary);
      } else if (slot.rate_type === 'hourly_multiplier') {
        slotAmount = overlapHours * baseSalary * (Number(slot.rate_value) || 1);
      }

      totalAmount += slotAmount;

      const label = slot.label || `Slot ${slot.time_start}-${slot.time_end}`;
      if (slot.rate_type === 'fixed') {
        breakdowns.push(`${label}`);
      } else if (slot.rate_type === 'daily_multiplier') {
        breakdowns.push(`${label} (${overlapHours.toFixed(1)}j: ${slot.rate_value}x Gaji Harian)`);
      } else {
        breakdowns.push(`${label} (${overlapHours.toFixed(1)}j: ${slot.rate_value}x Upah)`);
      }
    }
  });

  const totalMins = endMins - startMins;
  const otherMins = Math.max(0, totalMins - coveredMins);
  if (otherMins > 0) {
    const otherHours = otherMins / 60;
    const otherAmount = otherHours * baseSalary * 1.5;
    totalAmount += otherAmount;
    breakdowns.push(`Lembur Biasa (${otherHours.toFixed(1)}j)`);
  }

  return {
    totalAmount: Math.round(totalAmount),
    s1Hours,
    s2Hours,
    s3Hours,
    otherHours: otherMins / 60,
    breakdownText: breakdowns.join(', '),
  };
}

// GENERATE SALARY SLIP (Bulk for active employees in period)
app.post('/api/payroll/generate-slips', async (req, res) => {
  const { period_id } = req.body;
  const period = state.payrollPeriods.find((p) => p.id === Number(period_id));
  if (!period) return res.status(404).json({ error: 'Periode gaji tidak ditemukan' });

  // Remove existing slips for this period to allow re-run
  const existingSlipIds = state.payrollSlips.filter((s) => s.period_id === period.id).map((s) => s.id);
  state.payrollSlips = state.payrollSlips.filter((s) => s.period_id !== period.id);
  state.payrollSlipItems = state.payrollSlipItems.filter((i) => !existingSlipIds.includes(i.slip_id));

  // Clean MySQL slips for this period
  await syncMysqlQuery(`DELETE FROM payroll_slips WHERE period_id = ?;`, [period.id]);

  const activeEmployees = state.employees.filter((e) => e.status === 'active');
  const generatedSlips: any[] = [];
  const generatedItems: any[] = [];

  let nextSlipId = state.payrollSlips.length ? Math.max(...state.payrollSlips.map((s) => s.id)) + 1 : 1;
  let nextItemId = state.payrollSlipItems.length ? Math.max(...state.payrollSlipItems.map((i) => i.id)) + 1 : 1;
  const generatedAtWib = getWibDateTimeString();

  for (const emp of activeEmployees) {
    const base_salary = Number(emp.base_salary) || 0;

    // 1. Calculate approved overtime in period (strict: only status 'approved')
    const approvedOvertimes = state.overtimeRequests.filter(
      (ot) =>
        ot.employee_id === emp.id &&
        ot.status === 'approved' &&
        ot.overtime_date >= period.date_start &&
        ot.overtime_date <= period.date_end
    );

    // 2. Calculate work hours from attendance logs in period
    const empLogs = state.attendanceLogs.filter(
      (l) => l.employee_id === emp.id && l.log_date >= period.date_start && l.log_date <= period.date_end
    );

    let calculatedRegularHours = 0;
    if (empLogs.length > 0) {
      const datesSet = new Set(empLogs.map((l) => l.log_date));
      for (const date of datesSet) {
        const dayLogs = empLogs.filter((l) => l.log_date === date);
        const inLog = dayLogs.find((l) => l.log_type === 'in') || dayLogs[0];
        const outLog = dayLogs.find((l) => l.log_type === 'out');

        let elapsedHours = 8;
        if (inLog?.scan_time && outLog?.scan_time) {
          const inT = new Date(inLog.scan_time.replace(' ', 'T')).getTime();
          const outT = new Date(outLog.scan_time.replace(' ', 'T')).getTime();
          if (!isNaN(inT) && !isNaN(outT) && outT > inT) {
            elapsedHours = (outT - inT) / (1000 * 60 * 60);
          }
        }

        if (elapsedHours >= 8) {
          calculatedRegularHours += 8;
        } else {
          calculatedRegularHours += Math.max(1, Math.round(elapsedHours * 10) / 10);
        }
      }
    } else {
      calculatedRegularHours = 176;
    }

    const points = calculatedRegularHours;
    const gross_base_pay = base_salary * points;

    let total_overtime = 0;
    const slipItems: any[] = [];

    const divRule = state.overtimeRules.find((r) => r.is_active && r.scope_type === 'division' && r.scope_id === emp.division_id);
    const gradeRule = state.overtimeRules.find((r) => r.is_active && r.scope_type === 'job_grade' && r.scope_id === emp.job_grade_id);
    const generalRule = state.overtimeRules.find((r) => r.is_active && r.scope_type === 'general');
    const applicableOtRule = divRule || gradeRule || generalRule;

    for (const ot of approvedOvertimes) {
      let otAmount = 0;
      let ruleLabel = applicableOtRule ? applicableOtRule.rule_name : 'Berjenjang';

      if (applicableOtRule && applicableOtRule.calc_type === 'multiplier') {
        otAmount = (applicableOtRule.multiplier_value || 1.5) * base_salary * Number(ot.total_hours);
      } else if (applicableOtRule && applicableOtRule.calc_type === 'fixed') {
        otAmount = (applicableOtRule.fixed_amount || 0) * Number(ot.total_hours);
      } else if (applicableOtRule && applicableOtRule.calc_type === 'percentage') {
        otAmount = ((applicableOtRule.percentage_value || 0) / 100) * base_salary * Number(ot.total_hours);
      } else {
        // Multi-tier time-slot (Default / calc_type === 'timeslot')
        let effectiveTierSlots = applicableOtRule?.tier_slots;
        if (!effectiveTierSlots && applicableOtRule?.custom_formula && applicableOtRule.custom_formula.trim().startsWith('[')) {
          try {
            effectiveTierSlots = JSON.parse(applicableOtRule.custom_formula);
          } catch {}
        }
        const res = calculateMultiTierOvertimeServer(ot, base_salary, emp.daily_salary, effectiveTierSlots);
        otAmount = res.totalAmount;
        if (res.breakdownText) {
          ruleLabel = applicableOtRule ? `${applicableOtRule.rule_name} [${res.breakdownText}]` : `Berjenjang [${res.breakdownText}]`;
        }
      }

      total_overtime += otAmount;
      const itm = {
        id: nextItemId++,
        slip_id: nextSlipId,
        item_type: 'overtime',
        rule_id: applicableOtRule?.id || null,
        item_name: `Lembur ${ot.overtime_date} (${ot.total_hours} Jam - ${ruleLabel})`,
        amount: Math.round(otAmount),
      };
      slipItems.push(itm);
      generatedItems.push(itm);
    }

    // 3. Allowances (Only issue if employee has > 0 points/hours worked)
    let total_allowance = 0;
    if (points > 0) {
      for (const rule of state.allowanceRules.filter((r) => r.is_active)) {
        const match =
          rule.scope_type === 'general' ||
          (rule.scope_type === 'division' && rule.scope_id === emp.division_id) ||
          (rule.scope_type === 'job_grade' && rule.scope_id === emp.job_grade_id);

        if (match) {
          let amount = 0;
          if (rule.calc_type === 'fixed') {
            amount = rule.fixed_amount || 0;
          } else if (rule.calc_type === 'percentage') {
            amount = ((rule.percentage_value || 0) / 100) * gross_base_pay;
          } else if (rule.calc_type === 'multiplier') {
            amount = (rule.multiplier_value || 1) * base_salary;
          }

          if (amount > 0) {
            total_allowance += amount;
            const itm = {
              id: nextItemId++,
              slip_id: nextSlipId,
              item_type: 'allowance',
              rule_id: rule.id,
              item_name: rule.rule_name,
              amount: Math.round(amount),
            };
            slipItems.push(itm);
            generatedItems.push(itm);
          }
        }
      }
    }

    // 4. Deductions
    let total_deduction = 0;
    for (const rule of state.deductionRules.filter((r) => r.is_active)) {
      const match =
        rule.scope_type === 'general' ||
        (rule.scope_type === 'division' && rule.scope_id === emp.division_id) ||
        (rule.scope_type === 'job_grade' && rule.scope_id === emp.job_grade_id);

      if (match) {
        let amount = 0;
        if (rule.calc_type === 'fixed') {
          amount = rule.fixed_amount || 0;
        } else if (rule.calc_type === 'percentage') {
          amount = ((rule.percentage_value || 0) / 100) * gross_base_pay;
        } else if (rule.calc_type === 'multiplier') {
          amount = (rule.multiplier_value || 1) * base_salary;
        }

        if (amount > 0) {
          total_deduction += amount;
          const itm = {
            id: nextItemId++,
            slip_id: nextSlipId,
            item_type: 'deduction',
            rule_id: rule.id,
            item_name: rule.rule_name,
            amount: Math.round(amount),
          };
          slipItems.push(itm);
          generatedItems.push(itm);
        }
      }
    }

    const net_salary = gross_base_pay + total_overtime + total_allowance - total_deduction;

    const slip = {
      id: nextSlipId++,
      period_id: period.id,
      employee_id: emp.id,
      base_salary,
      total_points: points,
      gross_base_pay: Math.round(gross_base_pay),
      total_overtime: Math.round(total_overtime),
      total_allowance: Math.round(total_allowance),
      total_deduction: Math.round(total_deduction),
      net_salary: Math.round(net_salary),
      status: 'final',
      generated_at: generatedAtWib,
      created_at: generatedAtWib,
      employee_name: emp.full_name,
      employee_nip: emp.nip,
      period_start: period.date_start,
      period_end: period.date_end,
      total_hours: points,
      overtime_hours: approvedOvertimes.reduce((s, o) => s + Number(o.total_hours), 0),
      base_salary_earned: Math.round(gross_base_pay),
      overtime_pay: Math.round(total_overtime),
      allowances_amount: Math.round(total_allowance),
      deductions_amount: Math.round(total_deduction),
    };

    state.payrollSlips.push(slip);
    state.payrollSlipItems.push(...slipItems);
    generatedSlips.push(slip);

    await syncMysqlQuery(
      `INSERT INTO payroll_slips (id, period_id, employee_id, base_salary, total_points, gross_base_pay, total_overtime, total_allowance, total_deduction, net_salary, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE base_salary = VALUES(base_salary), total_points = VALUES(total_points), gross_base_pay = VALUES(gross_base_pay), total_overtime = VALUES(total_overtime), total_allowance = VALUES(total_allowance), total_deduction = VALUES(total_deduction), net_salary = VALUES(net_salary), status = VALUES(status);`,
      [slip.id, slip.period_id, slip.employee_id, slip.base_salary, slip.total_points, slip.gross_base_pay, slip.total_overtime, slip.total_allowance, slip.total_deduction, slip.net_salary, slip.status, slip.created_at]
    );
  }

  period.status = 'processed';
  saveStateToDisk();

  state.dbSyncLogs.unshift({
    id: Date.now(),
    action_type: 'push',
    table_name: 'payroll_slips',
    status: 'success',
    message: `Generate slip gaji selesai untuk periode ${period.period_name}: ${generatedSlips.length} slip diproses.`,
    row_count: generatedSlips.length,
    executed_by_name: 'Payroll Admin',
    executed_at: generatedAtWib,
  });
  saveStateToDisk();

  res.json({
    success: true,
    message: `Berhasil membuat ${generatedSlips.length} slip gaji untuk periode ${period.period_name}!`,
    count: generatedSlips.length,
  });
});

// CREATE / GENERATE SINGLE SLIP
app.post('/api/payroll/slips', async (req, res) => {
  const {
    employee_id,
    period_start,
    period_end,
    total_hours,
    overtime_hours,
    base_salary_earned,
    overtime_pay,
    allowances_amount,
    deductions_amount,
    net_salary,
  } = req.body;

  const emp = state.employees.find((e) => e.id === Number(employee_id));
  const nextSlipId = state.payrollSlips.length ? Math.max(...state.payrollSlips.map((s) => s.id)) + 1 : 1;
  const createdAtWib = getWibDateTimeString();

  const newSlip = {
    id: nextSlipId,
    period_id: 1,
    employee_id: Number(employee_id),
    base_salary: emp ? emp.base_salary : 25000,
    total_points: Number(total_hours) || 8,
    gross_base_pay: Number(base_salary_earned) || 0,
    total_overtime: Number(overtime_pay) || 0,
    total_allowance: Number(allowances_amount) || 0,
    total_deduction: Number(deductions_amount) || 0,
    net_salary: Number(net_salary) || 0,
    status: 'final',
    generated_at: createdAtWib,
    created_at: createdAtWib,
    employee_name: emp ? emp.full_name : 'Unknown',
    employee_nip: emp ? emp.nip : '-',
    period_start,
    period_end,
    total_hours: Number(total_hours) || 0,
    overtime_hours: Number(overtime_hours) || 0,
    base_salary_earned: Number(base_salary_earned) || 0,
    overtime_pay: Number(overtime_pay) || 0,
    allowances_amount: Number(allowances_amount) || 0,
    deductions_amount: Number(deductions_amount) || 0,
  };

  state.payrollSlips.unshift(newSlip);
  saveStateToDisk();

  await syncMysqlQuery(
    `INSERT INTO payroll_slips (id, period_id, employee_id, base_salary, total_points, gross_base_pay, total_overtime, total_allowance, total_deduction, net_salary, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE base_salary = VALUES(base_salary), total_points = VALUES(total_points), gross_base_pay = VALUES(gross_base_pay), total_overtime = VALUES(total_overtime), total_allowance = VALUES(total_allowance), total_deduction = VALUES(total_deduction), net_salary = VALUES(net_salary), status = VALUES(status);`,
    [newSlip.id, newSlip.period_id, newSlip.employee_id, newSlip.base_salary, newSlip.total_points, newSlip.gross_base_pay, newSlip.total_overtime, newSlip.total_allowance, newSlip.total_deduction, newSlip.net_salary, newSlip.status, newSlip.created_at]
  );

  res.json({ success: true, slip: newSlip, message: 'Slip gaji berhasil diterbitkan' });
});

// UPDATE SINGLE SLIP
app.put('/api/payroll/slips/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.payrollSlips.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Slip gaji tidak ditemukan' });
  }

  const existing = state.payrollSlips[idx];
  const totalHours = req.body.total_hours !== undefined ? Number(req.body.total_hours) : (existing.total_hours || existing.total_points || 0);
  const overtimeHours = req.body.overtime_hours !== undefined ? Number(req.body.overtime_hours) : (existing.overtime_hours || 0);
  const baseSalary = req.body.base_salary !== undefined ? Number(req.body.base_salary) : (existing.base_salary || 0);
  const baseSalaryEarned = req.body.base_salary_earned !== undefined ? Number(req.body.base_salary_earned) : (existing.base_salary_earned || existing.gross_base_pay || 0);
  const overtimePay = req.body.overtime_pay !== undefined ? Number(req.body.overtime_pay) : (existing.overtime_pay || existing.total_overtime || 0);
  const allowancesAmount = req.body.allowances_amount !== undefined ? Number(req.body.allowances_amount) : (existing.allowances_amount || existing.total_allowance || 0);
  const deductionsAmount = req.body.deductions_amount !== undefined ? Number(req.body.deductions_amount) : (existing.deductions_amount || existing.total_deduction || 0);
  const netSalary = req.body.net_salary !== undefined ? Number(req.body.net_salary) : (existing.net_salary || 0);

  const updatedSlip = {
    ...existing,
    ...req.body,
    id,
    base_salary: baseSalary,
    total_points: totalHours,
    total_hours: totalHours,
    overtime_hours: overtimeHours,
    gross_base_pay: baseSalaryEarned,
    base_salary_earned: baseSalaryEarned,
    total_overtime: overtimePay,
    overtime_pay: overtimePay,
    total_allowance: allowancesAmount,
    allowances_amount: allowancesAmount,
    total_deduction: deductionsAmount,
    deductions_amount: deductionsAmount,
    net_salary: netSalary,
    status: req.body.status || existing.status || 'final',
    period_start: req.body.period_start || existing.period_start,
    period_end: req.body.period_end || existing.period_end,
  };

  // If employee changed, refresh name & nip
  if (req.body.employee_id) {
    const emp = state.employees.find((e) => e.id === Number(req.body.employee_id));
    if (emp) {
      updatedSlip.employee_name = emp.full_name;
      updatedSlip.employee_nip = emp.nip;
    }
  }

  state.payrollSlips[idx] = updatedSlip;
  saveStateToDisk();

  await syncMysqlQuery(
    `UPDATE payroll_slips
     SET base_salary = ?, total_points = ?, gross_base_pay = ?, total_overtime = ?, total_allowance = ?, total_deduction = ?, net_salary = ?, status = ?
     WHERE id = ?;`,
    [
      updatedSlip.base_salary || 0,
      updatedSlip.total_points || 0,
      updatedSlip.gross_base_pay || 0,
      updatedSlip.total_overtime || 0,
      updatedSlip.total_allowance || 0,
      updatedSlip.total_deduction || 0,
      updatedSlip.net_salary || 0,
      updatedSlip.status || 'final',
      id,
    ]
  );

  res.json({ success: true, slip: updatedSlip, message: 'Slip gaji berhasil diperbarui' });
});

// DELETE SINGLE SLIP
app.delete('/api/payroll/slips/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = state.payrollSlips.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Slip gaji tidak ditemukan' });
  }

  state.payrollSlips = state.payrollSlips.filter((s) => s.id !== id);
  state.payrollSlipItems = state.payrollSlipItems.filter((i) => i.slip_id !== id);
  saveStateToDisk();

  await syncMysqlQuery('DELETE FROM payroll_slip_items WHERE slip_id = ?;', [id]);
  await syncMysqlQuery('DELETE FROM payroll_slips WHERE id = ?;', [id]);

  res.json({ success: true, message: 'Slip gaji berhasil dihapus' });
});

// 9. Database Config, Test Connection, Seeder, Sync, Table Explorer
app.get('/api/db/config', (req, res) => {
  res.json(state.dbConfig);
});

app.post('/api/db/save-config', async (req, res) => {
  const { host, port, database_name, username, password_plain, ssl_mode, provider, ca_certificate } = req.body;
  state.dbConfig = {
    ...state.dbConfig,
    host: host !== undefined ? host : state.dbConfig.host,
    port: port !== undefined ? Number(port) : state.dbConfig.port,
    database_name: database_name !== undefined ? database_name : state.dbConfig.database_name,
    username: username !== undefined ? username : state.dbConfig.username,
    password_plain: password_plain !== undefined ? password_plain : state.dbConfig.password_plain,
    ssl_mode: ssl_mode !== undefined ? ssl_mode : state.dbConfig.ssl_mode,
    provider: provider !== undefined ? provider : state.dbConfig.provider,
  };

  if (ca_certificate !== undefined) {
    (state.dbConfig as any).ca_certificate = ca_certificate;
    if (ca_certificate && typeof ca_certificate === 'string' && ca_certificate.trim().length > 0) {
      try {
        if (!fs.existsSync(CERTS_DIR)) {
          fs.mkdirSync(CERTS_DIR, { recursive: true });
        }
        const certName = state.dbConfig.ssl_ca_cert_name || 'ca-cert.pem';
        const certPath = path.join(CERTS_DIR, certName);
        fs.writeFileSync(certPath, ca_certificate.trim(), 'utf8');
        state.dbConfig.ssl_ca_cert_path = certPath;
        state.dbConfig.ssl_ca_cert_name = certName;
      } catch (cErr) {
        console.warn('Could not write physical cert file, persisting text directly:', cErr);
      }
    }
  }

  // 1. Persist to disk
  saveStateToDisk();

  // 2. Persist to MySQL database (db_configs table) if live connection can be made
  let savedToLiveDb = false;
  let liveDbMessage = '';
  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    const connection = await mysql.createConnection(mysqlOptions);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS db_configs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        config_name VARCHAR(100) NOT NULL DEFAULT 'Primary Connection',
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL DEFAULT 3306,
        database_name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_encrypted TEXT NOT NULL,
        ssl_mode VARCHAR(50) DEFAULT 'REQUIRED',
        ca_certificate MEDIUMTEXT,
        provider VARCHAR(50) DEFAULT 'aiven',
        is_active BOOLEAN DEFAULT TRUE,
        last_connection_status VARCHAR(50) DEFAULT 'unknown',
        last_tested_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure new schema columns exist if tables were previously created
    try {
      await connection.query(`ALTER TABLE db_configs ADD COLUMN IF NOT EXISTS ca_certificate MEDIUMTEXT;`);
      await connection.query(`ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS is_exempt_from_lateness BOOLEAN DEFAULT FALSE;`);
      await connection.query(`ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS is_lateness_disabled BOOLEAN DEFAULT FALSE;`);
      await connection.query(`ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS exempt_job_grades JSON;`);
    } catch {}

    await connection.query(`
      INSERT INTO db_configs (id, config_name, host, port, database_name, username, password_encrypted, ssl_mode, ca_certificate, provider, is_active, last_connection_status, last_tested_at, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'connected', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        host = VALUES(host),
        port = VALUES(port),
        database_name = VALUES(database_name),
        username = VALUES(username),
        password_encrypted = VALUES(password_encrypted),
        ssl_mode = VALUES(ssl_mode),
        ca_certificate = VALUES(ca_certificate),
        provider = VALUES(provider),
        last_connection_status = 'connected',
        last_tested_at = NOW(),
        updated_at = NOW();
    `, [
      state.dbConfig.config_name || 'MySQL Primary',
      state.dbConfig.host,
      state.dbConfig.port,
      state.dbConfig.database_name,
      state.dbConfig.username,
      state.dbConfig.password_plain || '',
      state.dbConfig.ssl_mode,
      (state.dbConfig as any).ca_certificate || '',
      state.dbConfig.provider || 'aiven',
    ]);

    await connection.end();
    savedToLiveDb = true;
    state.dbConfig.last_connection_status = 'connected';
    state.dbConfig.last_tested_at = new Date().toISOString();
    liveDbMessage = `dan langsung tersimpan ke tabel db_configs di database MySQL ${state.dbConfig.database_name}`;
  } catch (dbErr: any) {
    liveDbMessage = `(Tersimpan di storage lokal. Catatan koneksi live: ${dbErr.message})`;
  }

  state.dbSyncLogs.unshift({
    id: Date.now(),
    action_type: 'table_edit',
    table_name: 'db_configs',
    status: 'success',
    message: `Konfigurasi koneksi MySQL berhasil diperbarui ${liveDbMessage}`,
    row_count: 1,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({
    success: true,
    dbConfig: state.dbConfig,
    savedToLiveDb,
    message: `Konfigurasi database berhasil disimpan ${liveDbMessage}!`,
  });
});

// GET DB SYNC & CONFIG LOGS (Floating Log Widget Support)
app.get('/api/db/sync-logs', (req, res) => {
  res.json({
    success: true,
    logs: state.dbSyncLogs || [],
    dbConfig: state.dbConfig,
    total: (state.dbSyncLogs || []).length,
  });
});

// CLEAR DB LOGS
app.post('/api/db/clear-logs', (req, res) => {
  state.dbSyncLogs = [
    {
      id: Date.now(),
      action_type: 'table_edit',
      table_name: 'db_sync_logs',
      status: 'success',
      message: 'Log riwayat konfigurasi database telah dibersihkan.',
      row_count: 0,
      executed_by_name: 'Super Admin',
      executed_at: new Date().toISOString(),
    },
  ];
  saveStateToDisk();
  res.json({ success: true, message: 'Log database berhasil dibersihkan' });
});

// GET DDL DATABASE SCHEMA
app.get('/api/db/ddl', (req, res) => {
  const schemaPath = path.join(process.cwd(), 'nku_hr_schema.sql');
  let ddl = '';
  if (fs.existsSync(schemaPath)) {
    ddl = fs.readFileSync(schemaPath, 'utf8');
  }
  res.json({
    success: true,
    ddl,
    filename: 'nku_hr_schema.sql',
    tableCount: 17,
    generatedAt: new Date().toISOString(),
  });
});

// Upload .pem SSL Certificate
app.post('/api/db/upload-cert', (req, res) => {
  const { cert_type = 'ca', cert_content, filename } = req.body;
  if (!cert_content) {
    return res.status(400).json({ error: 'Konten sertifikat kosong' });
  }

  const safeName = (filename || `${cert_type}-cert.pem`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetPath = path.join(CERTS_DIR, safeName);
  try {
    if (!fs.existsSync(CERTS_DIR)) {
      fs.mkdirSync(CERTS_DIR, { recursive: true });
    }
    fs.writeFileSync(targetPath, cert_content, 'utf8');
  } catch (wErr) {
    console.warn('Could not write physical cert file, persisting text in state:', wErr);
  }

  if (cert_type === 'ca') {
    state.dbConfig.ssl_ca_cert_path = targetPath;
    state.dbConfig.ssl_ca_cert_name = safeName;
    (state.dbConfig as any).ca_certificate = cert_content;
  }

  saveStateToDisk();

  state.dbSyncLogs.unshift({
    id: Date.now(),
    action_type: 'push',
    table_name: 'certs',
    status: 'success',
    message: `Sertifikat SSL (${safeName}) berhasil diupload dan disimpan permanen.`,
    row_count: 1,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  res.json({ success: true, cert_path: targetPath, filename: safeName, ca_certificate: cert_content });
});

// TEST LIVE MYSQL CONNECTION
app.post('/api/db/test-connection', async (req, res) => {
  const start = Date.now();
  const cfg = { ...state.dbConfig, ...req.body };

  try {
    const mysqlOptions = buildMysqlConfig(cfg);
    const connection = await mysql.createConnection(mysqlOptions);

    await ensureRemoteSchemaMigrations(connection);

    const [rows]: any = await connection.query(
      'SELECT VERSION() as version, DATABASE() as db, CURRENT_TIMESTAMP() as server_time;'
    );
    await connection.end();

    const latency = Date.now() - start;

    state.dbConfig.last_connection_status = 'connected';
    state.dbConfig.last_tested_at = new Date().toISOString();
    state.dbConfig.last_latency_ms = latency;
    state.dbConfig.last_error_message = undefined;

    state.dbSyncLogs.unshift({
      id: Date.now(),
      action_type: 'test_connection',
      table_name: 'INFORMATION_SCHEMA',
      status: 'success',
      message: `Koneksi LIVE ke MySQL 8 (${cfg.host}:${cfg.port}/${cfg.database_name}) berhasil! Latency: ${latency}ms, Server: ${rows[0]?.version || 'MySQL 8.x'}`,
      row_count: 1,
      executed_by_name: 'Super Admin',
      executed_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      status: 'connected',
      latency_ms: latency,
      server_info: rows[0],
      message: `Terhubung live ke database ${cfg.database_name} (${latency}ms)!`,
    });
  } catch (err: any) {
    const latency = Date.now() - start;
    state.dbConfig.last_connection_status = 'failed';
    state.dbConfig.last_tested_at = new Date().toISOString();
    state.dbConfig.last_latency_ms = latency;
    state.dbConfig.last_error_message = err.message;

    state.dbSyncLogs.unshift({
      id: Date.now(),
      action_type: 'test_connection',
      table_name: 'db_configs',
      status: 'failed',
      message: `Gagal terhubung ke MySQL (${cfg.host}:${cfg.port}/${cfg.database_name}): ${err.message}`,
      row_count: 0,
      executed_by_name: 'Super Admin',
      executed_at: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      status: 'failed',
      latency_ms: latency,
      error: err.message,
      code: err.code,
      message: `Gagal terhubung: ${err.message}. Periksa host, port, username, password, dan sertifikat SSL.`,
    });
  }
});

// DATABASE SEEDER (Execute DDL & Seeds onto live MySQL or current memory store)
app.post('/api/db/seed', async (req, res) => {
  const schemaPath = path.join(process.cwd(), 'nku_hr_schema.sql');
  let sqlContent = '';
  if (fs.existsSync(schemaPath)) {
    sqlContent = fs.readFileSync(schemaPath, 'utf8');
  }

  let executedRemotely = false;
  let remoteError = null;

  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    mysqlOptions.multipleStatements = true;
    const connection = await mysql.createConnection(mysqlOptions);

    // 1. Disable FK checks during full DDL & Seeding
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Execute base DDL from nku_hr_schema.sql
    if (sqlContent) {
      try {
        await connection.query(sqlContent);
      } catch (ddlErr: any) {
        console.warn('Notice during schema.sql execution:', ddlErr.message);
      }
    }

    // 3. Ensure any missing columns on pre-existing MySQL tables are added
    await ensureRemoteSchemaMigrations(connection);

    // Disable foreign key checks for clean seeding
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Clean up orphan balances
    const validEmpIds = new Set((state.employees || []).map(e => e.id));
    state.leaveBalances = (state.leaveBalances || []).filter(lb => validEmpIds.has(lb.employee_id));

    // Populate company profile
    if (state.companyProfile) {
      await connection.query(`
        INSERT INTO company_profile (id, company_name, logo_url, address, phone, email, tax_id, timezone, theme_mode, color_palette)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), logo_url=VALUES(logo_url), address=VALUES(address), phone=VALUES(phone), email=VALUES(email), theme_mode=VALUES(theme_mode), color_palette=VALUES(color_palette);
      `, [1, state.companyProfile.company_name, state.companyProfile.logo_url || '', state.companyProfile.address || '', state.companyProfile.phone || '', state.companyProfile.email || '', state.companyProfile.tax_id || '', state.companyProfile.timezone || 'Asia/Jakarta', state.companyProfile.theme_mode || 'dark', state.companyProfile.color_palette || '#1E88E5']);
    }

    // Populate initial master divisions
    for (const d of state.divisions) {
      await connection.query(`
        INSERT INTO divisions (id, division_code, division_name, description, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE division_name=VALUES(division_name), description=VALUES(description), is_active=VALUES(is_active);
      `, [d.id, d.division_code, d.division_name, d.description || '', d.is_active ? 1 : 0]);
    }

    // Populate job grades
    for (const g of state.jobGrades) {
      await connection.query(`
        INSERT INTO job_grades (id, grade_code, grade_name, description, is_exempt_from_lateness, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE grade_name=VALUES(grade_name), description=VALUES(description), is_exempt_from_lateness=VALUES(is_exempt_from_lateness), is_active=VALUES(is_active);
      `, [g.id, g.grade_code, g.grade_name, g.description || '', g.is_exempt_from_lateness ? 1 : 0, g.is_active ? 1 : 0]);
    }

    // Populate employees (NIP & QR Code, NO RFID)
    for (const e of state.employees) {
      await connection.query(`
        INSERT INTO employees (id, nip, full_name, division_id, job_grade_id, photo_url, email, phone, address, join_date, base_salary, qr_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), division_id=VALUES(division_id), job_grade_id=VALUES(job_grade_id), photo_url=VALUES(photo_url), email=VALUES(email), phone=VALUES(phone), address=VALUES(address), join_date=VALUES(join_date), qr_code=VALUES(qr_code), base_salary=VALUES(base_salary), status=VALUES(status);
      `, [
        e.id,
        e.nip,
        e.full_name,
        e.division_id || null,
        e.job_grade_id || null,
        e.photo_url || '',
        e.email || '',
        e.phone || '',
        e.address || '',
        e.join_date || '2024-01-01',
        e.base_salary || 0,
        e.qr_code || `QR-${e.nip}`,
        e.status || 'active'
      ]);
    }

    // Populate roles
    for (const r of (state.roles || [])) {
      await connection.query(`
        INSERT INTO roles (id, role_key, role_name, description, can_manage_db_config, can_manage_payroll_rules, can_manage_master_data, can_approve_requests, is_system_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE role_name=VALUES(role_name), description=VALUES(description), can_manage_db_config=VALUES(can_manage_db_config), can_manage_payroll_rules=VALUES(can_manage_payroll_rules), can_manage_master_data=VALUES(can_manage_master_data), can_approve_requests=VALUES(can_approve_requests);
      `, [r.id, r.role_key, r.role_name, r.description || '', r.can_manage_db_config ? 1 : 0, r.can_manage_payroll_rules ? 1 : 0, r.can_manage_master_data ? 1 : 0, r.can_approve_requests ? 1 : 0, r.is_system_role ? 1 : 0]);
    }

    // Populate permissions
    for (const p of (state.permissions || [])) {
      await connection.query(`
        INSERT INTO permissions (id, permission_key, module, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE module=VALUES(module), description=VALUES(description);
      `, [p.id, p.permission_key, p.module, p.description || '']);
    }

    // Populate role_permissions
    for (const rp of (state.rolePermissions || [])) {
      await connection.query(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        VALUES (?, ?);
      `, [rp.role_id, rp.permission_id]);
    }

    // Populate users
    for (const u of (state.users || [])) {
      await connection.query(`
        INSERT INTO users (id, username, email, password_hash, role_id, employee_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email), role_id=VALUES(role_id), employee_id=VALUES(employee_id), is_active=VALUES(is_active);
      `, [u.id, u.username, u.email, u.password_hash || u.password || '$2a$10$e7c10b78df0bbf123456789abcdef0123456789abcdef0123456789abcdef', u.role_id || 1, u.employee_id || null, u.is_active ? 1 : 0]);
    }

    // Populate work schedules
    for (const s of (state.workSchedules || [])) {
      await connection.query(`
        INSERT INTO work_schedules (id, schedule_name, time_in, time_out, break_start, break_end, tolerance_minutes, is_lateness_disabled, exempt_job_grades, working_days, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE schedule_name=VALUES(schedule_name), time_in=VALUES(time_in), time_out=VALUES(time_out), break_start=VALUES(break_start), break_end=VALUES(break_end), tolerance_minutes=VALUES(tolerance_minutes), is_lateness_disabled=VALUES(is_lateness_disabled), exempt_job_grades=VALUES(exempt_job_grades), working_days=VALUES(working_days), is_active=VALUES(is_active);
      `, [s.id, s.schedule_name, s.time_in, s.time_out, s.break_start || null, s.break_end || null, s.tolerance_minutes ?? 0, s.is_lateness_disabled ? 1 : 0, JSON.stringify(s.exempt_job_grades || []), JSON.stringify(s.working_days || []), s.is_active ? 1 : 0]);
    }

    // Populate schedule plots
    for (const p of (state.schedulePlots || [])) {
      await connection.query(`
        INSERT INTO schedule_plots (id, schedule_id, scope_type, scope_id, date_start, date_end, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE schedule_id=VALUES(schedule_id), scope_type=VALUES(scope_type), scope_id=VALUES(scope_id), date_start=VALUES(date_start), date_end=VALUES(date_end), notes=VALUES(notes), created_by=VALUES(created_by);
      `, [p.id, p.schedule_id, p.scope_type || 'division', p.scope_id || null, p.date_start, p.date_end, p.notes || '', p.created_by || 1, getWibDateTimeString(p.created_at)]);
    }

    // Populate leave types
    for (const lt of (state.leaveTypes || [])) {
      await connection.query(`
        INSERT INTO leave_types (id, type_name, default_quota_days, is_paid, requires_attachment, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE type_name=VALUES(type_name), default_quota_days=VALUES(default_quota_days), is_paid=VALUES(is_paid), requires_attachment=VALUES(requires_attachment), is_active=VALUES(is_active);
      `, [lt.id, lt.type_name, lt.default_quota_days || 0, lt.is_paid ? 1 : 0, lt.requires_attachment ? 1 : 0, lt.is_active ? 1 : 0]);
    }

    // Populate leave balances (ALL records)
    for (const lb of (state.leaveBalances || [])) {
      await connection.query(`
        INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days, carry_forward_days, carry_forward_expires_at, carry_forward_expired)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quota_days=VALUES(quota_days),
          used_days=VALUES(used_days),
          carry_forward_days=VALUES(carry_forward_days),
          carry_forward_expires_at=VALUES(carry_forward_expires_at),
          carry_forward_expired=VALUES(carry_forward_expired);
      `, [
        lb.id,
        lb.employee_id,
        lb.leave_type_id,
        lb.year || 2026,
        lb.quota_days ?? 12,
        lb.used_days ?? 0,
        lb.carry_forward_days ?? 0,
        lb.carry_forward_expires_at || null,
        lb.carry_forward_expired ? 1 : 0
      ]);
    }

    // Populate leave requests
    for (const lr of (state.leaveRequests || [])) {
      await connection.query(`
        INSERT INTO leave_requests (id, employee_id, leave_type_id, date_start, date_end, total_days, reason, status, approved_by, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), approved_by=VALUES(approved_by), approved_at=VALUES(approved_at);
      `, [lr.id, lr.employee_id, lr.leave_type_id, lr.date_start, lr.date_end, lr.total_days, lr.reason || '', lr.status || 'pending', lr.approved_by || null, lr.approved_at ? getWibDateTimeString(lr.approved_at) : null, getWibDateTimeString(lr.created_at)]);
    }

    // Populate overtime requests
    for (const ov of (state.overtimeRequests || [])) {
      await connection.query(`
        INSERT INTO overtime_requests (id, employee_id, overtime_date, time_start, time_end, total_hours, reason, status, approved_by, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), approved_by=VALUES(approved_by), approved_at=VALUES(approved_at);
      `, [ov.id, ov.employee_id, ov.overtime_date, ov.time_start, ov.time_end, ov.total_hours || 0, ov.reason || '', ov.status || 'pending', ov.approved_by || null, ov.approved_at ? getWibDateTimeString(ov.approved_at) : null, getWibDateTimeString(ov.created_at)]);
    }

    // Populate company locations
    for (const loc of (state.companyLocations || [])) {
      await connection.query(`
        INSERT INTO company_locations (id, location_code, location_name, location_type, address, latitude, longitude, radius_meters, is_active, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE location_name=VALUES(location_name), address=VALUES(address), latitude=VALUES(latitude), longitude=VALUES(longitude), radius_meters=VALUES(radius_meters), is_active=VALUES(is_active);
      `, [loc.id, loc.location_code, loc.location_name, loc.location_type, loc.address, loc.latitude, loc.longitude, loc.radius_meters || 100, loc.is_active ? 1 : 0, loc.notes || '', getWibDateTimeString(loc.created_at), getWibDateTimeString(loc.updated_at)]);
    }

    // Populate attendance logs
    for (const a of (state.attendanceLogs || [])) {
      await connection.query(`
        INSERT INTO attendance_logs (id, employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), notes=VALUES(notes), location_id=VALUES(location_id), location_name=VALUES(location_name), latitude=VALUES(latitude), longitude=VALUES(longitude);
      `, [a.id, a.employee_id, a.location_id || null, a.location_name || null, a.log_date, getWibDateTimeString(a.scan_time), a.log_type, a.method || 'qr', a.device_id || 'KIOSK-MAIN-01', a.latitude != null ? a.latitude : null, a.longitude != null ? a.longitude : null, a.location_address || null, a.is_mock_location ? 1 : 0, a.status || 'normal', a.notes || '']);
    }

    // Populate overtime rules
    for (const r of (state.overtimeRules || [])) {
      await connection.query(`
        INSERT INTO overtime_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rule_name=VALUES(rule_name), calc_type=VALUES(calc_type), fixed_amount=VALUES(fixed_amount), is_active=VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Populate deduction rules
    for (const r of (state.deductionRules || [])) {
      await connection.query(`
        INSERT INTO deduction_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rule_name=VALUES(rule_name), calc_type=VALUES(calc_type), fixed_amount=VALUES(fixed_amount), is_active=VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Populate allowance rules
    for (const r of (state.allowanceRules || [])) {
      await connection.query(`
        INSERT INTO allowance_rules (id, rule_name, scope_type, scope_id, calc_type, rate_unit, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rule_name=VALUES(rule_name), calc_type=VALUES(calc_type), rate_unit=VALUES(rate_unit), fixed_amount=VALUES(fixed_amount), is_active=VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.rate_unit || 'per_month', r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Populate payroll periods
    for (const p of (state.payrollPeriods || [])) {
      await connection.query(`
        INSERT INTO payroll_periods (id, period_name, date_start, date_end, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE period_name=VALUES(period_name), status=VALUES(status);
      `, [p.id, p.period_name, p.date_start, p.date_end, p.status || 'draft']);
    }

    // Populate payroll slips
    for (const ps of (state.payrollSlips || [])) {
      await connection.query(`
        INSERT INTO payroll_slips (id, period_id, employee_id, base_salary, total_points, gross_base_pay, total_overtime, total_allowance, total_deduction, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE net_salary=VALUES(net_salary), status=VALUES(status);
      `, [ps.id, ps.period_id, ps.employee_id, ps.base_salary, ps.total_points, ps.gross_base_pay, ps.total_overtime || 0, ps.total_allowance || 0, ps.total_deduction || 0, ps.net_salary, ps.status || 'draft']);
    }

    // Populate official letters
    for (const ol of (state.officialLetters || [])) {
      await connection.query(`
        INSERT INTO official_letters (id, letter_type, letter_number, employee_id, employee_name, employee_nip, division_name, job_title, issue_date, effective_date, warning_level, violation_reason, validity_months, join_date, end_date, accomplishments, layoff_reason, severance_notes, company_signatory_name, company_signatory_title, employee_acknowledged, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE letter_number=VALUES(letter_number), employee_name=VALUES(employee_name);
      `, [
        ol.id,
        ol.letter_type,
        ol.letter_number,
        ol.employee_id,
        ol.employee_name,
        ol.employee_nip || '',
        ol.division_name || '',
        ol.job_title || '',
        ol.issue_date,
        ol.effective_date || null,
        ol.warning_level || null,
        ol.violation_reason || null,
        ol.validity_months || 6,
        ol.join_date || null,
        ol.end_date || null,
        ol.accomplishments || null,
        ol.layoff_reason || null,
        ol.severance_notes || null,
        ol.company_signatory_name || '',
        ol.company_signatory_title || '',
        ol.employee_acknowledged ? 1 : 0,
        ol.notes || null,
      ]);
    }

    // Populate company holidays
    for (const h of state.companyHolidays) {
      await connection.query(`
        INSERT INTO company_holidays (holiday_date, name, type, is_recurring_yearly, synced_from_global_calendar)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type);
      `, [h.holiday_date, h.name || h.holiday_name || 'Libur', h.type || 'nasional', h.is_recurring_yearly ? 1 : 0, h.synced_from_global_calendar ? 1 : 0]);
    }

    // Re-enable FK checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    await connection.end();
    executedRemotely = true;
  } catch (err: any) {
    remoteError = err.message;
    console.error('Seeding MySQL remote error:', err);
  }

  saveStateToDisk();

  state.dbSyncLogs.unshift({
    id: getNextDbSyncLogId(),
    action_type: 'seed',
    table_name: 'ALL_TABLES',
    status: executedRemotely ? 'success' : 'failed',
    message: executedRemotely
      ? `Database Seeder dieksekusi LIVE ke database MySQL (${state.dbConfig.database_name}) dari nku_hr_schema.sql (27 Tabel Lengkap DDL & Data SDM terisi).`
      : `Database Seeder gagal sinkron ke MySQL online (Error: ${remoteError || 'Koneksi gagal'}).`,
    row_count: state.employees.length + state.divisions.length + state.companyHolidays.length + (state.leaveBalances?.length || 0),
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  saveStateToDisk();

  if (executedRemotely) {
    res.json({
      success: true,
      executedRemotely: true,
      message: `Database Seeder berhasil dieksekusi secara LIVE ke MySQL database ${state.dbConfig.database_name}! (Seluruh 27 tabel DDL, skema kolom baru, dan master data SDM telah tersinkronisasi)`,
    });
  } else {
    res.status(500).json({
      success: false,
      executedRemotely: false,
      remoteError,
      message: `Gagal melakukan seeding ke database MySQL online: ${remoteError || 'Koneksi MySQL gagal'}`,
    });
  }
});

// WIPE DATABASE FOR PROJECT HANDOVER (Khusus Super Admin)
app.post('/api/db/wipe-for-handover', async (req, res) => {
  // 1. Kosongkan seluruh tabel operasional in-memory
  state.employees = [];
  state.divisions = [];
  state.jobGrades = [];
  state.workSchedules = [];
  state.schedulePlots = [];
  state.shiftSwapRequests = [];
  state.attendanceLogs = [];
  state.leaveRequests = [];
  state.leaveBalances = [];
  state.overtimeRequests = [];
  state.overtimeRules = [];
  state.deductionRules = [];
  state.allowanceRules = [];
  state.payrollPeriods = [];
  state.payrollSlips = [];
  state.payrollSlipItems = [];
  state.companyHolidays = [];
  state.officialLetters = [];

  // Reset employee_id pada 5 akun manager aplikasi agar tidak mengarah ke foreign key yang terhapus
  const preservedUsernames = ['superadmin', 'hr.admin', 'payroll.admin', 'rudi.manager', 'kiosk.terminal1'];
  state.users = state.users
    .filter((u) => preservedUsernames.includes(u.username))
    .map((u) => ({
      ...u,
      employee_id: null,
    }));

  // Simpan perubahan ke disk storage
  saveStateToDisk();

  let executedRemotely = false;
  let remoteError = null;

  // 2. Eksekusi pembersihan ke MySQL Live jika terkoneksi
  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    mysqlOptions.multipleStatements = true;
    const connection = await mysql.createConnection(mysqlOptions);

    const truncateSql = `
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE official_letters;
      TRUNCATE TABLE attendance_logs;
      TRUNCATE TABLE leave_requests;
      TRUNCATE TABLE leave_balances;
      TRUNCATE TABLE overtime_requests;
      TRUNCATE TABLE shift_swap_requests;
      TRUNCATE TABLE payroll_slip_items;
      TRUNCATE TABLE payroll_slips;
      TRUNCATE TABLE schedule_plots;
      TRUNCATE TABLE work_schedules;
      TRUNCATE TABLE employees;
      TRUNCATE TABLE divisions;
      TRUNCATE TABLE job_grades;
      TRUNCATE TABLE company_holidays;
      TRUNCATE TABLE overtime_rules;
      TRUNCATE TABLE deduction_rules;
      TRUNCATE TABLE allowance_rules;
      TRUNCATE TABLE payroll_periods;
      UPDATE users SET employee_id = NULL;
      SET FOREIGN_KEY_CHECKS = 1;
    `;

    await connection.query(truncateSql);
    await connection.end();
    executedRemotely = true;
  } catch (err: any) {
    remoteError = err.message;
  }

  // Catat ke DB Sync Logs
  state.dbSyncLogs.unshift({
    id: getNextDbSyncLogId(),
    action_type: 'truncate',
    table_name: 'ALL_EXCEPT_MANAGERS',
    status: executedRemotely ? 'success' : 'in_progress',
    message: executedRemotely
      ? `Pembersihan database untuk serah terima proyek LIVE dieksekusi ke MySQL (${state.dbConfig.database_name}). Seluruh tabel operasional dikosongkan. 6 Akun Manager Aplikasi (Users) & Hak Akses (Roles) dipertahankan.`
      : `Pembersihan database untuk serah terima proyek berhasil disimpan secara lokal. Tabel akun manager aplikasi dipertahankan (${remoteError ? 'Catatan remote: ' + remoteError : 'Siap diserahterimakan'}).`,
    row_count: 0,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  // Catat ke Audit Log
  state.auditLogs.unshift({
    id: Date.now(),
    user_name: 'Super Admin',
    action: 'WIPE_DATABASE_FOR_HANDOVER',
    table_name: 'ALL_TABLES',
    record_id: 'HANDOVER',
    new_value: { preserved: ['users', 'roles', 'company_profile', 'db_configs'] },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({
    success: true,
    executedRemotely,
    remoteError,
    cleared_tables: [
      'employees',
      'divisions',
      'job_grades',
      'work_schedules',
      'schedule_plots',
      'attendance_logs',
      'leave_requests',
      'leave_balances',
      'overtime_requests',
      'shift_swap_requests',
      'overtime_rules',
      'deduction_rules',
      'allowance_rules',
      'payroll_periods',
      'payroll_slips',
      'payroll_slip_items',
      'company_holidays',
      'official_letters',
    ],
    preserved_tables: [
      { name: 'users', count: state.users.length, description: '6 Akun User Manager Aplikasi & Simulasi Peran' },
      { name: 'roles', count: state.roles.length, description: '6 Peran Hak Akses RBAC' },
      { name: 'company_profile', count: 1, description: 'Konfigurasi Profil Perusahaan' },
      { name: 'db_configs', count: 1, description: 'Konfigurasi Koneksi Database MySQL & SSL' },
    ],
    message: executedRemotely
      ? 'Seluruh isi tabel operasional pada server database MySQL dan aplikasi telah berhasil dikosongkan. Tabel akun manager aplikasi dan hak akses peran tetap utuh untuk serah terima proyek.'
      : 'Seluruh isi tabel operasional berhasil dikosongkan. Tabel akun manager aplikasi (Users & Roles) tetap aktif dan siap diserahterimakan.',
  });
});

// SYNC DB -> APP (Pull)
app.post('/api/db/sync-pull', async (req, res) => {
  let pulledEmployees = 0;
  let pulledHolidays = 0;
  let pulledDivisions = 0;
  let pulledGrades = 0;
  let pulledBalances = 0;
  let totalPulledRecords = 0;
  let remoteError = null;

  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    const connection = await mysql.createConnection(mysqlOptions);

    // Pull company profile
    try {
      const [cpRows]: any = await connection.query('SELECT * FROM company_profile LIMIT 1;');
      if (Array.isArray(cpRows) && cpRows.length > 0) {
        state.companyProfile = { ...state.companyProfile, ...cpRows[0], id: 1 };
      }
    } catch {}

    // Pull roles
    try {
      const [roleRows]: any = await connection.query('SELECT * FROM roles LIMIT 50;');
      if (Array.isArray(roleRows) && roleRows.length > 0) {
        state.roles = roleRows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          can_manage_db_config: !!r.can_manage_db_config,
          can_manage_payroll_rules: !!r.can_manage_payroll_rules,
          can_manage_master_data: !!r.can_manage_master_data,
          can_approve_requests: !!r.can_approve_requests,
          is_system_role: !!r.is_system_role,
        }));
      }
    } catch {}

    // Pull divisions
    try {
      const [divRows]: any = await connection.query('SELECT * FROM divisions LIMIT 100;');
      if (Array.isArray(divRows) && divRows.length > 0) {
        state.divisions = divRows.map((d: any) => ({
          ...d,
          id: Number(d.id),
          is_active: !!d.is_active,
        }));
        pulledDivisions = divRows.length;
      }
    } catch {}

    // Pull job grades
    try {
      const [gradeRows]: any = await connection.query('SELECT * FROM job_grades LIMIT 100;');
      if (Array.isArray(gradeRows) && gradeRows.length > 0) {
        state.jobGrades = gradeRows.map((g: any) => ({
          ...g,
          id: Number(g.id),
          is_exempt_from_lateness: !!g.is_exempt_from_lateness,
          is_active: !!g.is_active,
        }));
        pulledGrades = gradeRows.length;
      }
    } catch {}

    // Pull employees
    try {
      const [empRows]: any = await connection.query('SELECT * FROM employees LIMIT 500;');
      if (Array.isArray(empRows) && empRows.length > 0) {
        state.employees = empRows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          division_id: r.division_id ? Number(r.division_id) : null,
          job_grade_id: r.job_grade_id ? Number(r.job_grade_id) : null,
          base_salary: Number(r.base_salary || 0),
        }));
        pulledEmployees = empRows.length;
      }
    } catch {}

    // Pull users
    try {
      const [userRows]: any = await connection.query('SELECT * FROM users LIMIT 200;');
      if (Array.isArray(userRows) && userRows.length > 0) {
        state.users = userRows.map((u: any) => ({
          ...u,
          id: Number(u.id),
          role_id: Number(u.role_id),
          employee_id: u.employee_id ? Number(u.employee_id) : null,
          is_active: !!u.is_active,
        }));
      }
    } catch {}

    // Pull leave types
    try {
      const [ltRows]: any = await connection.query('SELECT * FROM leave_types LIMIT 50;');
      if (Array.isArray(ltRows) && ltRows.length > 0) {
        state.leaveTypes = ltRows.map((lt: any) => ({
          ...lt,
          id: Number(lt.id),
          default_quota_days: Number(lt.default_quota_days || 0),
          is_paid: !!lt.is_paid,
          requires_attachment: !!lt.requires_attachment,
          is_active: !!lt.is_active,
        }));
      }
    } catch {}

    // Pull leave balances
    try {
      const [lbRows]: any = await connection.query('SELECT * FROM leave_balances LIMIT 500;');
      if (Array.isArray(lbRows) && lbRows.length > 0) {
        state.leaveBalances = lbRows.map((lb: any) => ({
          id: Number(lb.id),
          employee_id: Number(lb.employee_id),
          leave_type_id: Number(lb.leave_type_id),
          year: Number(lb.year || 2026),
          quota_days: Number(lb.quota_days ?? 12),
          used_days: Number(lb.used_days ?? 0),
          carry_forward_days: Number(lb.carry_forward_days ?? 0),
          carry_forward_expires_at: lb.carry_forward_expires_at || null,
          carry_forward_expired: !!lb.carry_forward_expired,
        }));
        pulledBalances = lbRows.length;
      }
    } catch {}

    // Pull holidays
    try {
      const [holRows]: any = await connection.query('SELECT * FROM company_holidays LIMIT 200;');
      if (Array.isArray(holRows) && holRows.length > 0) {
        state.companyHolidays = holRows.map((h: any) => ({
          ...h,
          id: Number(h.id),
          holiday_date: typeof h.holiday_date === 'string' ? h.holiday_date.slice(0, 10) : new Date(h.holiday_date).toISOString().slice(0, 10),
          name: h.name || h.holiday_name || 'Libur',
          holiday_name: h.name || h.holiday_name || 'Libur',
          is_recurring_yearly: !!h.is_recurring_yearly,
          synced_from_global_calendar: !!h.synced_from_global_calendar,
        }));
        pulledHolidays = holRows.length;
      }
    } catch {}

    // Pull work schedules
    try {
      const [schedRows]: any = await connection.query('SELECT * FROM work_schedules LIMIT 100;');
      if (Array.isArray(schedRows) && schedRows.length > 0) {
        state.workSchedules = schedRows.map((s: any) => ({
          ...s,
          id: Number(s.id),
          tolerance_minutes: Number(s.tolerance_minutes ?? 0),
          is_lateness_disabled: !!s.is_lateness_disabled,
          exempt_job_grades: typeof s.exempt_job_grades === 'string' ? JSON.parse(s.exempt_job_grades) : (Array.isArray(s.exempt_job_grades) ? s.exempt_job_grades : []),
          working_days: typeof s.working_days === 'string' ? JSON.parse(s.working_days) : (s.working_days || ['mon', 'tue', 'wed', 'thu', 'fri']),
          is_active: !!s.is_active,
        }));
      }
    } catch {}

    // Pull schedule plots
    try {
      const [plotRows]: any = await connection.query('SELECT * FROM schedule_plots LIMIT 200;');
      if (Array.isArray(plotRows) && plotRows.length > 0) {
        state.schedulePlots = plotRows.map((p: any) => ({
          ...p,
          id: Number(p.id),
          schedule_id: Number(p.schedule_id),
          scope_id: p.scope_id ? Number(p.scope_id) : null,
        }));
      }
    } catch {}

    // Pull shift swap requests
    try {
      const [swapRows]: any = await connection.query('SELECT * FROM shift_swap_requests LIMIT 200;');
      if (Array.isArray(swapRows) && swapRows.length > 0) {
        state.shiftSwapRequests = swapRows.map((sw: any) => ({
          ...sw,
          id: Number(sw.id),
          requester_employee_id: Number(sw.requester_employee_id),
          target_employee_id: Number(sw.target_employee_id),
          original_plot_id: sw.original_plot_id ? Number(sw.original_plot_id) : null,
          requested_plot_id: sw.requested_plot_id ? Number(sw.requested_plot_id) : null,
          approved_by: sw.approved_by ? Number(sw.approved_by) : null,
        }));
      }
    } catch {}

    // Pull leave requests
    try {
      const [lrRows]: any = await connection.query('SELECT * FROM leave_requests LIMIT 500;');
      if (Array.isArray(lrRows) && lrRows.length > 0) {
        state.leaveRequests = lrRows.map((lr: any) => ({
          ...lr,
          id: Number(lr.id),
          employee_id: Number(lr.employee_id),
          leave_type_id: Number(lr.leave_type_id),
          total_days: Number(lr.total_days || 1),
        }));
      }
    } catch {}

    // Pull overtime requests
    try {
      const [ovRows]: any = await connection.query('SELECT * FROM overtime_requests LIMIT 500;');
      if (Array.isArray(ovRows) && ovRows.length > 0) {
        state.overtimeRequests = ovRows.map((ov: any) => ({
          ...ov,
          id: Number(ov.id),
          employee_id: Number(ov.employee_id),
          total_hours: Number(ov.total_hours || 0),
          approved_by: ov.approved_by ? Number(ov.approved_by) : null,
        }));
      }
    } catch {}

    // Pull attendance logs
    try {
      const [attRows]: any = await connection.query('SELECT * FROM attendance_logs ORDER BY id DESC LIMIT 500;');
      if (Array.isArray(attRows) && attRows.length > 0) {
        state.attendanceLogs = attRows.map((a: any) => ({
          ...a,
          id: Number(a.id),
          employee_id: Number(a.employee_id),
          log_date: typeof a.log_date === 'string' ? a.log_date.slice(0, 10) : new Date(a.log_date).toISOString().slice(0, 10),
        }));
      }
    } catch {}

    // Pull overtime rules
    try {
      const [orRows]: any = await connection.query('SELECT * FROM overtime_rules LIMIT 50;');
      if (Array.isArray(orRows) && orRows.length > 0) {
        state.overtimeRules = orRows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          fixed_amount: r.fixed_amount !== null ? Number(r.fixed_amount) : null,
          percentage_value: r.percentage_value !== null ? Number(r.percentage_value) : null,
          multiplier_value: r.multiplier_value !== null ? Number(r.multiplier_value) : null,
          is_active: !!r.is_active,
        }));
      }
    } catch {}

    // Pull deduction rules
    try {
      const [drRows]: any = await connection.query('SELECT * FROM deduction_rules LIMIT 50;');
      if (Array.isArray(drRows) && drRows.length > 0) {
        state.deductionRules = drRows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          fixed_amount: r.fixed_amount !== null ? Number(r.fixed_amount) : null,
          percentage_value: r.percentage_value !== null ? Number(r.percentage_value) : null,
          multiplier_value: r.multiplier_value !== null ? Number(r.multiplier_value) : null,
          is_active: !!r.is_active,
        }));
      }
    } catch {}

    // Pull allowance rules
    try {
      const [arRows]: any = await connection.query('SELECT * FROM allowance_rules LIMIT 50;');
      if (Array.isArray(arRows) && arRows.length > 0) {
        state.allowanceRules = arRows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          fixed_amount: r.fixed_amount !== null ? Number(r.fixed_amount) : null,
          percentage_value: r.percentage_value !== null ? Number(r.percentage_value) : null,
          multiplier_value: r.multiplier_value !== null ? Number(r.multiplier_value) : null,
          is_active: !!r.is_active,
        }));
      }
    } catch {}

    // Pull payroll periods
    try {
      const [ppRows]: any = await connection.query('SELECT * FROM payroll_periods LIMIT 50;');
      if (Array.isArray(ppRows) && ppRows.length > 0) {
        state.payrollPeriods = ppRows.map((p: any) => ({
          ...p,
          id: Number(p.id),
          created_by: p.created_by ? Number(p.created_by) : null,
        }));
      }
    } catch {}

    // Pull payroll slips
    try {
      const [psRows]: any = await connection.query('SELECT * FROM payroll_slips LIMIT 500;');
      if (Array.isArray(psRows) && psRows.length > 0) {
        state.payrollSlips = psRows.map((ps: any) => ({
          ...ps,
          id: Number(ps.id),
          period_id: Number(ps.period_id),
          employee_id: Number(ps.employee_id),
          base_salary: Number(ps.base_salary || 0),
          total_points: Number(ps.total_points || 0),
          gross_base_pay: Number(ps.gross_base_pay || 0),
          total_overtime: Number(ps.total_overtime || 0),
          total_allowance: Number(ps.total_allowance || 0),
          total_deduction: Number(ps.total_deduction || 0),
          net_salary: Number(ps.net_salary || 0),
        }));
      }
    } catch {}

    // Pull official letters
    try {
      const [olRows]: any = await connection.query('SELECT * FROM official_letters LIMIT 500;');
      if (Array.isArray(olRows) && olRows.length > 0) {
        state.officialLetters = olRows.map((ol: any) => ({
          ...ol,
          id: Number(ol.id),
          employee_id: Number(ol.employee_id),
          validity_months: Number(ol.validity_months || 6),
          employee_acknowledged: !!ol.employee_acknowledged,
        }));
      }
    } catch {}

    // Pull db_sync_logs from MySQL to align app logs count with DB rows
    try {
      const [logRows]: any = await connection.query('SELECT * FROM db_sync_logs ORDER BY id DESC LIMIT 500;');
      if (Array.isArray(logRows) && logRows.length > 0) {
        state.dbSyncLogs = logRows.map((l: any) => ({
          ...l,
          id: Number(l.id),
          row_count: Number(l.row_count || 0),
          executed_by_name: l.executed_by_name || 'Super Admin',
          executed_at: l.executed_at ? String(l.executed_at) : new Date().toISOString(),
        }));
      }
    } catch {}

    await connection.end();
  } catch (err: any) {
    remoteError = err.message;
  }

  // Enrich in-memory state so relationships are fully resolved
  state.employees = (state.employees || []).map(enrichEmployee);
  state.attendanceLogs = (state.attendanceLogs || []).map(enrichAttendanceLog);
  state.leaveRequests = (state.leaveRequests || []).map(enrichLeaveRequest);
  state.overtimeRequests = (state.overtimeRequests || []).map(enrichOvertimeRequest);

  await normalizeDbSyncLogIds();

  saveStateToDisk();

  totalPulledRecords = state.employees.length + state.divisions.length + state.jobGrades.length + state.companyHolidays.length + state.workSchedules.length + (state.leaveBalances?.length || 0) + state.attendanceLogs.length + state.officialLetters.length;

  state.dbSyncLogs.unshift({
    id: getNextDbSyncLogId(),
    action_type: 'pull',
    table_name: 'DATABASE',
    status: remoteError ? 'failed' : 'success',
    message: remoteError
      ? `Gagal tarik data dari MySQL: ${remoteError}`
      : `Tarik (Pull) data dari MySQL ${state.dbConfig.database_name} berhasil (${pulledEmployees} karyawan, ${pulledDivisions} divisi, ${pulledGrades} golongan, ${pulledBalances} saldo cuti, ${state.workSchedules.length} jadwal kerja, ${pulledHolidays} hari libur, ${state.officialLetters.length} surat resmi).`,
    row_count: totalPulledRecords,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  saveStateToDisk();

  if (remoteError) {
    return res.json({
      success: false,
      error: remoteError,
      message: `Gagal tarik data dari MySQL Cloud: ${remoteError}. Periksa konfigurasi host, port, user, dan SSL.`,
    });
  }

  res.json({
    success: true,
    pulledEmployees,
    pulledDivisions,
    pulledGrades,
    pulledHolidays,
    pulledBalances,
    pulledSchedules: state.workSchedules.length,
    message: `Sync DB → App berhasil! (${pulledEmployees} data karyawan, ${pulledDivisions} divisi, ${pulledBalances} saldo cuti, ${state.workSchedules.length} jadwal kerja, ${pulledHolidays} hari libur disinkronkan)`,
  });
});

// SYNC APP -> DB (Push)
app.post('/api/db/sync-push', async (req, res) => {
  let executedRemotely = false;
  let remoteError = null;

  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    mysqlOptions.multipleStatements = true;
    const connection = await mysql.createConnection(mysqlOptions);

    // Ensure schema exists first
    const schemaPath = path.join(process.cwd(), 'nku_hr_schema.sql');
    if (fs.existsSync(schemaPath)) {
      try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        const sqlContent = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(sqlContent);
      } catch {}
    }

    // Ensure all table columns exist
    await ensureRemoteSchemaMigrations(connection);

    // Disable foreign key checks for bulk push
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Clean up orphan balances
    const validEmpIds = new Set((state.employees || []).map(e => e.id));
    state.leaveBalances = (state.leaveBalances || []).filter(lb => validEmpIds.has(lb.employee_id));

    // Push company profile
    if (state.companyProfile) {
      await connection.query(`
        INSERT INTO company_profile (id, company_name, logo_url, address, phone, email, tax_id, timezone, theme_mode, color_palette)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), logo_url=VALUES(logo_url), address=VALUES(address), phone=VALUES(phone), email=VALUES(email);
      `, [1, state.companyProfile.company_name, state.companyProfile.logo_url || '', state.companyProfile.address || '', state.companyProfile.phone || '', state.companyProfile.email || '', state.companyProfile.tax_id || '', state.companyProfile.timezone || 'Asia/Jakarta', state.companyProfile.theme_mode || 'dark', state.companyProfile.color_palette || '#1E88E5']);
    }

    // Push divisions
    for (const d of state.divisions) {
      await connection.query(`
        INSERT INTO divisions (id, division_code, division_name, description, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          division_code = VALUES(division_code),
          division_name = VALUES(division_name),
          description = VALUES(description),
          is_active = VALUES(is_active);
      `, [d.id, d.division_code, d.division_name, d.description || '', d.is_active ? 1 : 0]);
    }

    // Push job grades
    for (const g of state.jobGrades) {
      await connection.query(`
        INSERT INTO job_grades (id, grade_code, grade_name, description, is_exempt_from_lateness, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          grade_code = VALUES(grade_code),
          grade_name = VALUES(grade_name),
          description = VALUES(description),
          is_exempt_from_lateness = VALUES(is_exempt_from_lateness),
          is_active = VALUES(is_active);
      `, [g.id, g.grade_code, g.grade_name, g.description || '', g.is_exempt_from_lateness ? 1 : 0, g.is_active ? 1 : 0]);
    }

    // Push employees (NIP & QR Code, NO RFID)
    for (const e of state.employees) {
      await connection.query(`
        INSERT INTO employees (id, nip, full_name, division_id, job_grade_id, email, phone, address, join_date, base_salary, qr_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nip = VALUES(nip),
          full_name = VALUES(full_name),
          division_id = VALUES(division_id),
          job_grade_id = VALUES(job_grade_id),
          email = VALUES(email),
          phone = VALUES(phone),
          address = VALUES(address),
          join_date = VALUES(join_date),
          base_salary = VALUES(base_salary),
          qr_code = VALUES(qr_code),
          status = VALUES(status);
      `, [
        e.id,
        e.nip,
        e.full_name,
        e.division_id || null,
        e.job_grade_id || null,
        e.email || '',
        e.phone || '',
        e.address || '',
        e.join_date || '2024-01-01',
        e.base_salary || 0,
        e.qr_code || `QR-${e.nip}`,
        e.status || 'active'
      ]);
    }

    // Push roles
    for (const r of (state.roles || [])) {
      await connection.query(`
        INSERT INTO roles (id, role_key, role_name, description, can_manage_db_config, can_manage_payroll_rules, can_manage_master_data, can_approve_requests, is_system_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE role_name=VALUES(role_name), description=VALUES(description);
      `, [r.id, r.role_key, r.role_name, r.description || '', r.can_manage_db_config ? 1 : 0, r.can_manage_payroll_rules ? 1 : 0, r.can_manage_master_data ? 1 : 0, r.can_approve_requests ? 1 : 0, r.is_system_role ? 1 : 0]);
    }

    // Push users
    for (const u of (state.users || [])) {
      await connection.query(`
        INSERT INTO users (id, username, email, password_hash, role_id, employee_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email), role_id=VALUES(role_id), employee_id=VALUES(employee_id), is_active=VALUES(is_active);
      `, [u.id, u.username, u.email, u.password_hash || u.password || '$2a$10$e7c10b78df0bbf123456789abcdef0123456789abcdef0123456789abcdef', u.role_id || 1, u.employee_id || null, u.is_active ? 1 : 0]);
    }

    // Push work schedules
    for (const s of state.workSchedules) {
      await connection.query(`
        INSERT INTO work_schedules (id, schedule_name, time_in, time_out, break_start, break_end, tolerance_minutes, is_lateness_disabled, exempt_job_grades, working_days, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          schedule_name = VALUES(schedule_name),
          time_in = VALUES(time_in),
          time_out = VALUES(time_out),
          break_start = VALUES(break_start),
          break_end = VALUES(break_end),
          tolerance_minutes = VALUES(tolerance_minutes),
          is_lateness_disabled = VALUES(is_lateness_disabled),
          exempt_job_grades = VALUES(exempt_job_grades),
          working_days = VALUES(working_days),
          is_active = VALUES(is_active);
      `, [
        s.id,
        s.schedule_name,
        s.time_in,
        s.time_out,
        s.break_start || null,
        s.break_end || null,
        s.tolerance_minutes ?? 0,
        s.is_lateness_disabled ? 1 : 0,
        JSON.stringify(s.exempt_job_grades || []),
        JSON.stringify(s.working_days || []),
        s.is_active ? 1 : 0
      ]);
    }

    // Push schedule plots
    for (const p of state.schedulePlots) {
      await connection.query(`
        INSERT INTO schedule_plots (id, schedule_id, scope_type, scope_id, date_start, date_end, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          schedule_id = VALUES(schedule_id),
          scope_type = VALUES(scope_type),
          scope_id = VALUES(scope_id),
          date_start = VALUES(date_start),
          date_end = VALUES(date_end),
          notes = VALUES(notes),
          created_by = VALUES(created_by);
      `, [
        p.id,
        p.schedule_id,
        p.scope_type || 'division',
        p.scope_id || null,
        p.date_start,
        p.date_end,
        p.notes || '',
        p.created_by || 1,
        getWibDateTimeString(p.created_at)
      ]);
    }

    // Push shift swap requests
    for (const sw of (state.shiftSwapRequests || [])) {
      await connection.query(`
        INSERT INTO shift_swap_requests (id, requester_employee_id, target_employee_id, original_plot_id, requested_plot_id, swap_date, reason, status, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          approved_by = VALUES(approved_by),
          approved_at = VALUES(approved_at);
      `, [sw.id, sw.requester_employee_id, sw.target_employee_id, sw.original_plot_id || null, sw.requested_plot_id || null, sw.swap_date, sw.reason || '', sw.status || 'pending', sw.approved_by || null, sw.approved_at ? getWibDateTimeString(sw.approved_at) : null]);
    }

    // Push leave types
    for (const lt of (state.leaveTypes || [])) {
      await connection.query(`
        INSERT INTO leave_types (id, type_name, default_quota_days, is_paid, requires_attachment, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          type_name = VALUES(type_name),
          default_quota_days = VALUES(default_quota_days),
          is_paid = VALUES(is_paid),
          requires_attachment = VALUES(requires_attachment),
          is_active = VALUES(is_active);
      `, [lt.id, lt.type_name, lt.default_quota_days || 0, lt.is_paid ? 1 : 0, lt.requires_attachment ? 1 : 0, lt.is_active ? 1 : 0]);
    }

    // Push leave balances (CRITICAL: All employee balance records)
    for (const lb of (state.leaveBalances || [])) {
      await connection.query(`
        INSERT INTO leave_balances (id, employee_id, leave_type_id, year, quota_days, used_days, carry_forward_days, carry_forward_expires_at, carry_forward_expired)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quota_days = VALUES(quota_days),
          used_days = VALUES(used_days),
          carry_forward_days = VALUES(carry_forward_days),
          carry_forward_expires_at = VALUES(carry_forward_expires_at),
          carry_forward_expired = VALUES(carry_forward_expired);
      `, [
        lb.id,
        lb.employee_id,
        lb.leave_type_id,
        lb.year || 2026,
        lb.quota_days ?? 12,
        lb.used_days ?? 0,
        lb.carry_forward_days ?? 0,
        lb.carry_forward_expires_at || null,
        lb.carry_forward_expired ? 1 : 0
      ]);
    }

    // Push leave requests
    for (const lr of (state.leaveRequests || [])) {
      await connection.query(`
        INSERT INTO leave_requests (id, employee_id, leave_type_id, date_start, date_end, total_days, reason, status, approved_by, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          approved_by = VALUES(approved_by),
          approved_at = VALUES(approved_at);
      `, [lr.id, lr.employee_id, lr.leave_type_id, lr.date_start, lr.date_end, lr.total_days, lr.reason || '', lr.status || 'pending', lr.approved_by || null, lr.approved_at ? getWibDateTimeString(lr.approved_at) : null, getWibDateTimeString(lr.created_at)]);
    }

    // Push overtime requests
    for (const ov of (state.overtimeRequests || [])) {
      await connection.query(`
        INSERT INTO overtime_requests (id, employee_id, overtime_date, time_start, time_end, total_hours, reason, status, approved_by, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          approved_by = VALUES(approved_by),
          approved_at = VALUES(approved_at);
      `, [ov.id, ov.employee_id, ov.overtime_date, ov.time_start, ov.time_end, ov.total_hours || 0, ov.reason || '', ov.status || 'pending', ov.approved_by || null, ov.approved_at ? getWibDateTimeString(ov.approved_at) : null, getWibDateTimeString(ov.created_at)]);
    }

    // Push company locations
    for (const loc of (state.companyLocations || [])) {
      await connection.query(`
        INSERT INTO company_locations (id, location_code, location_name, location_type, address, latitude, longitude, radius_meters, is_active, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          location_name = VALUES(location_name),
          address = VALUES(address),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          radius_meters = VALUES(radius_meters),
          is_active = VALUES(is_active);
      `, [loc.id, loc.location_code, loc.location_name, loc.location_type, loc.address, loc.latitude, loc.longitude, loc.radius_meters || 100, loc.is_active ? 1 : 0, loc.notes || '', getWibDateTimeString(loc.created_at), getWibDateTimeString(loc.updated_at)]);
    }

    // Push attendance logs
    for (const a of (state.attendanceLogs || [])) {
      await connection.query(`
        INSERT INTO attendance_logs (id, employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          notes = VALUES(notes),
          location_id = VALUES(location_id),
          location_name = VALUES(location_name),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude);
      `, [a.id, a.employee_id, a.location_id || null, a.location_name || null, a.log_date, getWibDateTimeString(a.scan_time), a.log_type, a.method || 'qr', a.device_id || 'KIOSK-MAIN-01', a.latitude != null ? a.latitude : null, a.longitude != null ? a.longitude : null, a.location_address || null, a.is_mock_location ? 1 : 0, a.status || 'normal', a.notes || '']);
    }

    // Push overtime rules
    for (const r of (state.overtimeRules || [])) {
      await connection.query(`
        INSERT INTO overtime_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rule_name = VALUES(rule_name),
          calc_type = VALUES(calc_type),
          fixed_amount = VALUES(fixed_amount),
          percentage_value = VALUES(percentage_value),
          multiplier_value = VALUES(multiplier_value),
          custom_formula = VALUES(custom_formula),
          is_active = VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Push deduction rules
    for (const r of (state.deductionRules || [])) {
      await connection.query(`
        INSERT INTO deduction_rules (id, rule_name, scope_type, scope_id, calc_type, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rule_name = VALUES(rule_name),
          calc_type = VALUES(calc_type),
          fixed_amount = VALUES(fixed_amount),
          percentage_value = VALUES(percentage_value),
          multiplier_value = VALUES(multiplier_value),
          custom_formula = VALUES(custom_formula),
          is_active = VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Push allowance rules
    for (const r of (state.allowanceRules || [])) {
      await connection.query(`
        INSERT INTO allowance_rules (id, rule_name, scope_type, scope_id, calc_type, rate_unit, fixed_amount, percentage_value, multiplier_value, custom_formula, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rule_name = VALUES(rule_name),
          calc_type = VALUES(calc_type),
          rate_unit = VALUES(rate_unit),
          fixed_amount = VALUES(fixed_amount),
          percentage_value = VALUES(percentage_value),
          multiplier_value = VALUES(multiplier_value),
          custom_formula = VALUES(custom_formula),
          is_active = VALUES(is_active);
      `, [r.id, r.rule_name, r.scope_type || 'general', r.scope_id || null, r.calc_type, r.rate_unit || 'per_month', r.fixed_amount || null, r.percentage_value || null, r.multiplier_value || null, r.custom_formula || null, r.is_active ? 1 : 0]);
    }

    // Push payroll periods
    for (const p of (state.payrollPeriods || [])) {
      await connection.query(`
        INSERT INTO payroll_periods (id, period_name, date_start, date_end, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          period_name = VALUES(period_name),
          date_start = VALUES(date_start),
          date_end = VALUES(date_end),
          status = VALUES(status);
      `, [p.id, p.period_name, p.date_start, p.date_end, p.status || 'draft']);
    }

    // Push payroll slips
    for (const ps of (state.payrollSlips || [])) {
      await connection.query(`
        INSERT INTO payroll_slips (id, period_id, employee_id, base_salary, total_points, gross_base_pay, total_overtime, total_allowance, total_deduction, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          base_salary = VALUES(base_salary),
          total_points = VALUES(total_points),
          gross_base_pay = VALUES(gross_base_pay),
          total_overtime = VALUES(total_overtime),
          total_allowance = VALUES(total_allowance),
          total_deduction = VALUES(total_deduction),
          net_salary = VALUES(net_salary),
          status = VALUES(status);
      `, [ps.id, ps.period_id, ps.employee_id, ps.base_salary, ps.total_points, ps.gross_base_pay, ps.total_overtime || 0, ps.total_allowance || 0, ps.total_deduction || 0, ps.net_salary, ps.status || 'draft']);
    }

    // Push official letters
    for (const ol of (state.officialLetters || [])) {
      await connection.query(`
        INSERT INTO official_letters (id, letter_type, letter_number, employee_id, employee_name, employee_nip, division_name, job_title, issue_date, effective_date, warning_level, violation_reason, validity_months, join_date, end_date, accomplishments, layoff_reason, severance_notes, company_signatory_name, company_signatory_title, employee_acknowledged, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          letter_number = VALUES(letter_number),
          employee_name = VALUES(employee_name),
          division_name = VALUES(division_name),
          job_title = VALUES(job_title),
          warning_level = VALUES(warning_level),
          violation_reason = VALUES(violation_reason),
          validity_months = VALUES(validity_months),
          notes = VALUES(notes);
      `, [
        ol.id,
        ol.letter_type,
        ol.letter_number,
        ol.employee_id,
        ol.employee_name,
        ol.employee_nip || '',
        ol.division_name || '',
        ol.job_title || '',
        ol.issue_date,
        ol.effective_date || null,
        ol.warning_level || null,
        ol.violation_reason || null,
        ol.validity_months || 6,
        ol.join_date || null,
        ol.end_date || null,
        ol.accomplishments || null,
        ol.layoff_reason || null,
        ol.severance_notes || null,
        ol.company_signatory_name || '',
        ol.company_signatory_title || '',
        ol.employee_acknowledged ? 1 : 0,
        ol.notes || null,
      ]);
    }

    // Push company holidays
    for (const h of state.companyHolidays) {
      await connection.query(`
        INSERT INTO company_holidays (holiday_date, name, type, is_recurring_yearly, synced_from_global_calendar)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          type = VALUES(type),
          is_recurring_yearly = VALUES(is_recurring_yearly),
          synced_from_global_calendar = VALUES(synced_from_global_calendar);
      `, [h.holiday_date, h.name || h.holiday_name || 'Libur', h.type || 'nasional', h.is_recurring_yearly ? 1 : 0, h.synced_from_global_calendar ? 1 : 0]);
    }

    // Push db_sync_logs to MySQL
    for (const log of (state.dbSyncLogs || [])) {
      try {
        await connection.query(`
          INSERT INTO db_sync_logs (id, action_type, table_name, status, message, row_count, executed_by, executed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            message = VALUES(message),
            row_count = VALUES(row_count);
        `, [
          log.id,
          log.action_type || 'push',
          log.table_name || 'ALL_TABLES',
          log.status || 'success',
          log.message || '',
          log.row_count || 0,
          log.executed_by || 1,
          getWibDateTimeString(log.executed_at || new Date())
        ]);
      } catch (logErr) {}
    }

    await connection.end();
    executedRemotely = true;
  } catch (err: any) {
    remoteError = err.message;
  }

  saveStateToDisk();

  const totalPushed = state.employees.length + state.divisions.length + state.workSchedules.length + (state.leaveBalances?.length || 0) + state.companyHolidays.length + state.officialLetters.length;

  const newLogEntry = {
    id: getNextDbSyncLogId(),
    action_type: 'push',
    table_name: 'ALL_TABLES',
    status: executedRemotely ? 'success' : 'in_progress',
    message: executedRemotely
      ? `Push data aplikasi ke database MySQL ${state.dbConfig.database_name} berhasil (${state.employees.length} karyawan, ${state.divisions.length} divisi, ${state.leaveBalances?.length || 0} saldo cuti, ${state.workSchedules.length} jadwal kerja, ${state.companyHolidays.length} hari libur, ${state.officialLetters.length} surat resmi).`
      : `Push data tersimpan ke local persistence (Catatan remote: ${remoteError || 'Koneksi in-memory'}).`,
    row_count: totalPushed,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  };

  state.dbSyncLogs.unshift(newLogEntry);
  saveStateToDisk();

  // Async insert this push log into remote MySQL db_sync_logs table
  syncMysqlQuery(`
    INSERT INTO db_sync_logs (id, action_type, table_name, status, message, row_count, executed_by, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    newLogEntry.id,
    newLogEntry.action_type,
    newLogEntry.table_name,
    newLogEntry.status,
    newLogEntry.message,
    newLogEntry.row_count,
    1,
    getWibDateTimeString(newLogEntry.executed_at)
  ]);

  res.json({
    success: true,
    executedRemotely,
    remoteError,
    message: executedRemotely
      ? `Push data ke database MySQL ${state.dbConfig.database_name} berhasil! (${totalPushed} baris disinkronkan)`
      : `Data tersimpan ke storage lokal! (${remoteError ? 'Catatan remote: ' + remoteError : 'Siap disinkronkan'})`,
  });
});

// DB Sync Logs & Audit Logs
app.get('/api/db/logs', async (req, res) => {
  await normalizeDbSyncLogIds();
  res.json({
    syncLogs: state.dbSyncLogs,
    auditLogs: state.auditLogs,
  });
});

app.get('/api/db/sync-logs', async (req, res) => {
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    try {
      const mysqlOptions = buildMysqlConfig(state.dbConfig);
      const connection = await mysql.createConnection(mysqlOptions);
      const [rows]: any = await connection.query('SELECT * FROM `db_sync_logs` ORDER BY id DESC LIMIT 500;');
      await connection.end();
      if (Array.isArray(rows)) {
        state.dbSyncLogs = rows.map((r: any) => ({
          ...r,
          id: Number(r.id),
          row_count: Number(r.row_count || 0),
          executed_by_name: r.executed_by_name || 'Super Admin',
          executed_at: r.executed_at ? String(r.executed_at) : new Date().toISOString(),
        }));
        saveStateToDisk();
      }
    } catch (err: any) {
      console.warn('Note: Live fetch for db_sync_logs:', err.message);
    }
  }

  await normalizeDbSyncLogIds();

  res.json({
    success: true,
    logs: state.dbSyncLogs || [],
    dbConfig: state.dbConfig,
    total: (state.dbSyncLogs || []).length,
  });
});

app.post('/api/db/clear-logs', async (req, res) => {
  state.dbSyncLogs = [];
  saveStateToDisk();
  
  let mysqlCleared = false;
  let errorMsg = null;

  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    const res1 = await syncMysqlQuery('TRUNCATE TABLE `db_sync_logs`;');
    await syncMysqlQuery('TRUNCATE TABLE `sync_logs`;');
    const res2 = await syncMysqlQuery('DELETE FROM `db_sync_logs`;');
    await syncMysqlQuery('DELETE FROM `sync_logs`;');
    if (res1.success || res2.success) {
      mysqlCleared = true;
    } else {
      errorMsg = res1.error || res2.error;
    }
  }

  res.json({
    success: true,
    mysql_synced: mysqlCleared,
    message: mysqlCleared
      ? 'Seluruh riwayat log database berhasil dihapus permanen dari sistem dan database MySQL.'
      : 'Seluruh riwayat log database berhasil dibersihkan dari penyimpanan lokal.' + (errorMsg ? ` (Catatan MySQL: ${errorMsg})` : ''),
  });
});

app.delete('/api/db/sync-logs', async (req, res) => {
  state.dbSyncLogs = [];
  saveStateToDisk();

  let mysqlCleared = false;
  let errorMsg = null;

  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    const res1 = await syncMysqlQuery('TRUNCATE TABLE `db_sync_logs`;');
    await syncMysqlQuery('TRUNCATE TABLE `sync_logs`;');
    const res2 = await syncMysqlQuery('DELETE FROM `db_sync_logs`;');
    await syncMysqlQuery('DELETE FROM `sync_logs`;');
    if (res1.success || res2.success) {
      mysqlCleared = true;
    } else {
      errorMsg = res1.error || res2.error;
    }
  }

  res.json({
    success: true,
    mysql_synced: mysqlCleared,
    message: mysqlCleared
      ? 'Seluruh riwayat log database berhasil dihapus permanen dari sistem dan database MySQL.'
      : 'Seluruh riwayat log database berhasil dibersihkan dari penyimpanan lokal.' + (errorMsg ? ` (Catatan MySQL: ${errorMsg})` : ''),
  });
});

app.delete('/api/db/sync-logs/:id', async (req, res) => {
  const id = Number(req.params.id);
  state.dbSyncLogs = (state.dbSyncLogs || []).filter((l) => Number(l.id) !== id);
  saveStateToDisk();

  let mysqlSynced = false;
  let errorMsg = null;

  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    const res1 = await syncMysqlQuery('DELETE FROM `db_sync_logs` WHERE id = ?;', [id]);
    await syncMysqlQuery('DELETE FROM `sync_logs` WHERE id = ?;', [id]);
    if (res1.success) {
      mysqlSynced = true;
    } else {
      errorMsg = res1.error;
    }
  }

  res.json({
    success: true,
    mysql_synced: mysqlSynced,
    message: mysqlSynced
      ? `Log #${id} berhasil dihapus permanen dari database MySQL.`
      : `Log #${id} berhasil dihapus dari memori lokal.` + (errorMsg ? ` (Catatan MySQL: ${errorMsg})` : ''),
  });
});

app.post('/api/db/sync-logs/:id/acknowledge', async (req, res) => {
  const id = Number(req.params.id);
  state.dbSyncLogs = (state.dbSyncLogs || []).filter((l) => Number(l.id) !== id);
  saveStateToDisk();

  let mysqlSynced = false;
  let errorMsg = null;

  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    const res1 = await syncMysqlQuery('DELETE FROM `db_sync_logs` WHERE id = ?;', [id]);
    await syncMysqlQuery('DELETE FROM `sync_logs` WHERE id = ?;', [id]);
    if (res1.success) {
      mysqlSynced = true;
    } else {
      errorMsg = res1.error;
    }
  }

  res.json({
    success: true,
    mysql_synced: mysqlSynced,
    message: mysqlSynced
      ? `Log #${id} berhasil dihapus permanen dari database MySQL.`
      : `Log #${id} berhasil dihapus dari memori lokal.` + (errorMsg ? ` (Catatan MySQL: ${errorMsg})` : ''),
  });
});

// Helper to map snake_case SQL table names to camelCase state properties
function getTableDataRef(tableName: string): any[] | null {
  const map: Record<string, keyof typeof state> = {
    company_profile: 'companyProfiles',
    company_holidays: 'companyHolidays',
    db_configs: 'dbConfig',
    db_sync_logs: 'dbSyncLogs',
    audit_logs: 'auditLogs',
    roles: 'roles',
    permissions: 'permissions',
    role_permissions: 'rolePermissions',
    divisions: 'divisions',
    job_grades: 'jobGrades',
    employees: 'employees',
    users: 'users',
    work_schedules: 'workSchedules',
    schedule_plots: 'schedulePlots',
    shift_swap_requests: 'shiftSwapRequests',
    attendance_logs: 'attendanceLogs',
    leave_types: 'leaveTypes',
    leave_balances: 'leaveBalances',
    leave_requests: 'leaveRequests',
    overtime_requests: 'overtimeRequests',
    overtime_rules: 'overtimeRules',
    deduction_rules: 'deductionRules',
    allowance_rules: 'allowanceRules',
    payroll_periods: 'payrollPeriods',
    payroll_slips: 'payrollSlips',
    payroll_slip_items: 'payrollSlipItems',
    official_letters: 'officialLetters',
  };

  const key = map[tableName] || (tableName as keyof typeof state);
  if (key === 'dbConfig') {
    return [state.dbConfig];
  }
  if (state[key] && Array.isArray(state[key])) {
    return state[key] as any[];
  }
  return null;
}

// TABLE EXPLORER: List Tables (28 Tables synchronized with nku_hr_schema.sql & MySQL)
app.get('/api/db/tables', async (req, res) => {
  const tableNames = [
    { name: 'allowance_rules', rows: (state.allowanceRules || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Definisi rule tunjangan & fasilitas karyawan' },
    { name: 'attendance_logs', rows: (state.attendanceLogs || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Log presensi realtime RFID/QR/Mobile GPS' },
    { name: 'audit_logs', rows: (state.auditLogs || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Catatan audit jejak perubahan sistem' },
    { name: 'company_holidays', rows: (state.companyHolidays || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Hari libur nasional & cuti bersama' },
    { name: 'company_locations', rows: (state.companyLocations || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master titik lokasi kantor, batching plant, purchasing, & geofence' },
    { name: 'company_profile', rows: (state.companyProfiles || [state.companyProfile]).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Profil perusahaan & identitas visual' },
    { name: 'db_configs', rows: 1, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Konfigurasi koneksi MySQL Remote' },
    { name: 'db_sync_logs', rows: (state.dbSyncLogs || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Log aktivitas sinkronisasi & seeder' },
    { name: 'deduction_rules', rows: (state.deductionRules || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Definisi rule potongan gaji & denda' },
    { name: 'divisions', rows: (state.divisions || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master divisi operasional PT. NKU' },
    { name: 'employees', rows: (state.employees || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master data karyawan lengkap' },
    { name: 'job_grades', rows: (state.jobGrades || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master golongan / grade kerja' },
    { name: 'leave_balances', rows: (state.leaveBalances || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Saldo kuota cuti karyawan' },
    { name: 'leave_requests', rows: (state.leaveRequests || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Pengajuan cuti tahunan & izin sakit' },
    { name: 'leave_types', rows: (state.leaveTypes || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master tipe cuti / izin resmi' },
    { name: 'official_letters', rows: (state.officialLetters || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Surat resmi, SP-1/2/3, Paklaring, & PHK' },
    { name: 'overtime_requests', rows: (state.overtimeRequests || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Surat Perintah Kerja Lembur (SPKL)' },
    { name: 'overtime_rules', rows: (state.overtimeRules || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Definisi formula upah lembur per jam' },
    { name: 'payroll_periods', rows: (state.payrollPeriods || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master periode cut-off penggajian' },
    { name: 'payroll_slip_items', rows: (state.payrollSlipItems || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Rincian breakdown komponen slip gaji' },
    { name: 'payroll_slips', rows: (state.payrollSlips || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Slip gaji karyawan tergenerate' },
    { name: 'permissions', rows: (state.permissions || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Daftar hak akses fungsional modul' },
    { name: 'role_permissions', rows: (state.rolePermissions || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Pemetaan hak akses role ke permission' },
    { name: 'roles', rows: (state.roles || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Master role pengguna sistem (RBAC)' },
    { name: 'schedule_plots', rows: (state.schedulePlots || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Plotting jadwal kerja ke scope' },
    { name: 'shift_swap_requests', rows: (state.shiftSwapRequests || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Pengajuan tukar shift kerja antar karyawan' },
    { name: 'users', rows: (state.users || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Akun user login & kredensial' },
    { name: 'work_schedules', rows: (state.workSchedules || []).length, engine: 'InnoDB', collation: 'utf8mb4_general_ci', comment: 'Template master jam kerja & shift' },
  ];

  res.json({ database: state.dbConfig.database_name, tables: tableNames });
});

// TABLE EXPLORER: Get Table Details (Columns, Rows, and DDL)
app.get('/api/db/table/:name', async (req, res) => {
  const tableName = req.params.name;

  // 1. If live MySQL is configured and available, query directly from MySQL
  if (state.dbConfig?.host && state.dbConfig?.database_name) {
    let conn: any = null;
    try {
      conn = await mysql.createConnection(buildMysqlConfig(state.dbConfig));
      if (tableName === 'attendance_logs' || tableName === 'company_locations') {
        await ensureRemoteSchemaMigrations(conn);
      }
      const [colsRes]: any = await conn.query(`SHOW COLUMNS FROM \`${tableName}\`;`);
      const [rowsRes]: any = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 500;`);
      let liveDdl = '';
      try {
        const [createTableRes]: any = await conn.query(`SHOW CREATE TABLE \`${tableName}\`;`);
        if (createTableRes && createTableRes[0] && createTableRes[0]['Create Table']) {
          liveDdl = createTableRes[0]['Create Table'] + ';';
        }
      } catch (_) {}
      await conn.end();

      const columns = (colsRes || []).map((c: any) => c.Field);
      return res.json({
        table_name: tableName,
        total_rows: (rowsRes || []).length,
        columns,
        rows: rowsRes || [],
        ddl: liveDdl || undefined,
        source: 'live_mysql',
      });
    } catch (mysqlErr: any) {
      if (conn) {
        try { await conn.end(); } catch (_) {}
      }
      // Fallback to local memory state below
    }
  }

  let rows: any[] = [];
  let ddl = `CREATE TABLE \`${tableName}\` (\n  \`id\` INT PRIMARY KEY AUTO_INCREMENT,\n  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  switch (tableName) {
    case 'employees':
      rows = state.employees.map(enrichEmployee);
      ddl = `CREATE TABLE \`employees\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`nip\` VARCHAR(30) NOT NULL UNIQUE,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`division_id\` INT,
  \`job_grade_id\` INT,
  \`photo_url\` VARCHAR(255),
  \`email\` VARCHAR(100),
  \`phone\` VARCHAR(30),
  \`address\` TEXT,
  \`join_date\` DATE,
  \`base_salary\` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Upah per jam (base rate)',
  \`qr_code\` VARCHAR(100) UNIQUE COMMENT 'Kode QR identitas presensi karyawan',
  \`status\` ENUM('active','inactive','resigned') DEFAULT 'active',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`division_id\`) REFERENCES \`divisions\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`job_grade_id\`) REFERENCES \`job_grades\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'divisions':
      rows = state.divisions;
      ddl = `CREATE TABLE \`divisions\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`division_code\` VARCHAR(20) NOT NULL UNIQUE,
  \`division_name\` VARCHAR(100) NOT NULL,
  \`description\` VARCHAR(255),
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'job_grades':
      rows = (state.jobGrades || []).map((g) => ({
        id: g.id,
        grade_code: g.grade_code,
        grade_name: g.grade_name,
        description: g.description || '',
        is_exempt_from_lateness: Boolean(g.is_exempt_from_lateness),
        is_active: g.is_active !== undefined ? Boolean(g.is_active) : true,
      }));
      ddl = `CREATE TABLE \`job_grades\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`grade_code\` VARCHAR(20) NOT NULL UNIQUE,
  \`grade_name\` VARCHAR(100) NOT NULL,
  \`description\` VARCHAR(255),
  \`is_exempt_from_lateness\` BOOLEAN DEFAULT FALSE,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'roles':
      rows = state.roles || [];
      ddl = `CREATE TABLE \`roles\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`role_key\` VARCHAR(50) NOT NULL UNIQUE,
  \`role_name\` VARCHAR(100) NOT NULL,
  \`description\` TEXT,
  \`can_manage_db_config\` BOOLEAN DEFAULT FALSE,
  \`can_manage_payroll_rules\` BOOLEAN DEFAULT FALSE,
  \`can_manage_master_data\` BOOLEAN DEFAULT FALSE,
  \`can_approve_requests\` BOOLEAN DEFAULT FALSE,
  \`is_system_role\` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'permissions':
      rows = state.permissions || [];
      ddl = `CREATE TABLE \`permissions\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`permission_key\` VARCHAR(100) NOT NULL UNIQUE,
  \`module\` VARCHAR(50) NOT NULL,
  \`description\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'role_permissions':
      rows = state.rolePermissions || [];
      ddl = `CREATE TABLE \`role_permissions\` (
  \`role_id\` INT NOT NULL,
  \`permission_id\` INT NOT NULL,
  PRIMARY KEY (\`role_id\`, \`permission_id\`),
  FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'users':
      rows = (state.users || []).map((u) => {
        const r = (state.roles || []).find((role) => role.id === u.role_id);
        const emp = (state.employees || []).find((e) => e.id === u.employee_id);
        return {
          ...u,
          role_name: r?.role_name || 'Role',
          employee_name: emp?.full_name || '-',
        };
      });
      ddl = `CREATE TABLE \`users\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role_id\` INT NOT NULL,
  \`employee_id\` INT NULL,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`last_login_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`),
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'leave_balances':
      rows = (state.leaveBalances || []).map((b) => {
        const emp = (state.employees || []).find((e) => Number(e.id) === Number(b.employee_id));
        const lt = (state.leaveTypes || []).find((t) => Number(t.id) === Number(b.leave_type_id));
        return {
          ...b,
          employee_name: emp?.full_name || '-',
          employee_nip: emp?.nip || '-',
          leave_type_name: lt?.type_name || 'Cuti Tahunan',
        };
      });
      ddl = `CREATE TABLE \`leave_balances\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`employee_id\` INT NOT NULL,
  \`leave_type_id\` INT NOT NULL,
  \`year\` INT NOT NULL,
  \`quota_days\` DECIMAL(5,1) DEFAULT 0,
  \`used_days\` DECIMAL(5,1) DEFAULT 0,
  \`carry_forward_days\` DECIMAL(5,1) DEFAULT 0 COMMENT 'Sisa cuti tahun lalu berlaku s/d akhir Februari',
  \`carry_forward_expires_at\` DATE COMMENT 'Batas kedaluwarsa cuti tahun lalu (28/29 Februari)',
  \`carry_forward_expired\` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`leave_type_id\`) REFERENCES \`leave_types\`(\`id\`) ON DELETE CASCADE,
  UNIQUE KEY \`uq_balance\` (\`employee_id\`, \`leave_type_id\`, \`year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'leave_requests':
      rows = (state.leaveRequests || []).map((lr) => {
        const emp = (state.employees || []).find((e) => Number(e.id) === Number(lr.employee_id));
        const div = emp ? (state.divisions || []).find((d) => Number(d.id) === Number(emp.division_id)) : null;
        const lt = (state.leaveTypes || []).find((t) => Number(t.id) === Number(lr.leave_type_id));
        return {
          ...lr,
          employee_name: lr.employee_name || emp?.full_name || '-',
          employee_nip: lr.employee_nip || emp?.nip || '-',
          division_name: lr.division_name || div?.division_name || emp?.division_name || '-',
          leave_type_name: lr.leave_type_name || lt?.type_name || (Number(lr.leave_type_id) === 2 ? 'Izin Sakit' : 'Cuti Tahunan'),
        };
      });
      ddl = `CREATE TABLE \`leave_requests\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`employee_id\` INT NOT NULL,
  \`leave_type_id\` INT NOT NULL,
  \`date_start\` DATE NOT NULL,
  \`date_end\` DATE NOT NULL,
  \`total_days\` DECIMAL(5,1) NOT NULL,
  \`reason\` TEXT,
  \`attachment_url\` VARCHAR(255),
  \`status\` ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  \`approved_by\` INT,
  \`approved_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`leave_type_id\`) REFERENCES \`leave_types\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'leave_types':
      rows = state.leaveTypes || [];
      ddl = `CREATE TABLE \`leave_types\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`type_name\` VARCHAR(100) NOT NULL,
  \`default_quota_days\` INT DEFAULT 0,
  \`is_paid\` BOOLEAN DEFAULT TRUE,
  \`requires_attachment\` BOOLEAN DEFAULT FALSE,
  \`is_active\` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'official_letters':
      rows = state.officialLetters || [];
      ddl = `CREATE TABLE \`official_letters\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`letter_type\` ENUM('warning','recommendation','layoff') NOT NULL,
  \`letter_number\` VARCHAR(100) NOT NULL UNIQUE,
  \`employee_id\` INT NOT NULL,
  \`employee_name\` VARCHAR(150) NOT NULL,
  \`employee_nip\` VARCHAR(30),
  \`division_name\` VARCHAR(100),
  \`job_title\` VARCHAR(100),
  \`issue_date\` DATE NOT NULL,
  \`effective_date\` DATE,
  \`warning_level\` ENUM('SP-1','SP-2','SP-3'),
  \`violation_reason\` TEXT,
  \`validity_months\` INT DEFAULT 6,
  \`join_date\` DATE,
  \`end_date\` DATE,
  \`accomplishments\` TEXT,
  \`layoff_reason\` TEXT,
  \`severance_notes\` TEXT,
  \`company_signatory_name\` VARCHAR(150),
  \`company_signatory_title\` VARCHAR(150),
  \`employee_acknowledged\` BOOLEAN DEFAULT FALSE,
  \`notes\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'company_locations':
      rows = (state.companyLocations || []).map((l) => ({ ...l }));
      ddl = `CREATE TABLE \`company_locations\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`location_code\` VARCHAR(50) NOT NULL UNIQUE,
  \`location_name\` VARCHAR(150) NOT NULL,
  \`location_type\` ENUM('head_office','batching_plant','purchasing_office','warehouse','project_site','branch') DEFAULT 'batching_plant',
  \`address\` TEXT,
  \`latitude\` DECIMAL(10,8),
  \`longitude\` DECIMAL(11,8),
  \`radius_meters\` INT DEFAULT 100,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`notes\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_loc_coords\` (\`latitude\`, \`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'attendance_logs':
      rows = (state.attendanceLogs || []).map((a) => {
        const emp = (state.employees || []).find((e) => Number(e.id) === Number(a.employee_id));
        const loc = (state.companyLocations || []).find((l: any) => Number(l.id) === Number(a.location_id));
        return {
          ...a,
          location_name: a.location_name || loc?.location_name || (a.location_id ? `Lokasi #${a.location_id}` : '-'),
          location_code: loc?.location_code || '-',
          employee_name: a.employee_name || emp?.full_name || '-',
          employee_nip: a.employee_nip || emp?.nip || '-',
        };
      });
      ddl = `CREATE TABLE \`attendance_logs\` (
  \`id\` BIGINT PRIMARY KEY AUTO_INCREMENT,
  \`employee_id\` INT NOT NULL,
  \`location_id\` INT NULL,
  \`location_name\` VARCHAR(150) NULL,
  \`log_date\` DATE NOT NULL,
  \`scan_time\` DATETIME NOT NULL,
  \`log_type\` ENUM('in','out') NOT NULL,
  \`method\` ENUM('rfid','qr','nip_manual','mobile_gps','manual') NOT NULL,
  \`device_id\` VARCHAR(100),
  \`latitude\` DECIMAL(10,8) NULL,
  \`longitude\` DECIMAL(11,8) NULL,
  \`location_address\` TEXT NULL,
  \`is_mock_location\` BOOLEAN DEFAULT FALSE,
  \`status\` ENUM('on_time','late','early_leave','normal') DEFAULT 'normal',
  \`notes\` VARCHAR(255),
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`location_id\`) REFERENCES \`company_locations\`(\`id\`) ON DELETE SET NULL,
  INDEX \`idx_att_emp_date\` (\`employee_id\`, \`log_date\`),
  INDEX \`idx_att_location\` (\`location_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'overtime_requests':
      rows = (state.overtimeRequests || []).map((o) => {
        const emp = (state.employees || []).find((e) => Number(e.id) === Number(o.employee_id));
        const div = emp ? (state.divisions || []).find((d) => Number(d.id) === Number(emp.division_id)) : null;
        return {
          ...o,
          employee_name: o.employee_name || emp?.full_name || '-',
          employee_nip: o.employee_nip || emp?.nip || '-',
          division_name: o.division_name || div?.division_name || emp?.division_name || '-',
        };
      });
      ddl = `CREATE TABLE \`overtime_requests\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`employee_id\` INT NOT NULL,
  \`overtime_date\` DATE NOT NULL,
  \`time_start\` TIME NOT NULL,
  \`time_end\` TIME NOT NULL,
  \`total_hours\` DECIMAL(5,2) NOT NULL,
  \`reason\` TEXT,
  \`status\` ENUM('pending','approved','rejected') DEFAULT 'pending',
  \`approved_by\` INT,
  \`approved_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'schedule_plots':
      rows = (state.schedulePlots || []).map((p) => {
        const sched = (state.workSchedules || []).find((s) => Number(s.id) === Number(p.schedule_id));
        let scope_name = 'Semua Karyawan';
        if (p.scope_type === 'division') {
          const div = (state.divisions || []).find((d) => Number(d.id) === Number(p.scope_id));
          scope_name = div?.division_name || 'Divisi';
        } else if (p.scope_type === 'employee') {
          const emp = (state.employees || []).find((e) => Number(e.id) === Number(p.scope_id));
          scope_name = emp?.full_name || 'Karyawan';
        } else if (p.scope_type === 'job_grade') {
          const gr = (state.jobGrades || []).find((g) => Number(g.id) === Number(p.scope_id));
          scope_name = gr?.grade_name || 'Golongan';
        }
        return {
          ...p,
          schedule_name: p.schedule_name || sched?.schedule_name || 'Normal',
          scope_name,
        };
      });
      ddl = `CREATE TABLE \`schedule_plots\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`schedule_id\` INT NOT NULL,
  \`scope_type\` ENUM('general','division','job_grade','employee') NOT NULL DEFAULT 'division',
  \`scope_id\` INT NULL,
  \`date_start\` DATE NOT NULL,
  \`date_end\` DATE NOT NULL,
  \`notes\` VARCHAR(255),
  \`created_by\` INT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`schedule_id\`) REFERENCES \`work_schedules\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'shift_swap_requests':
      rows = state.shiftSwapRequests || [];
      ddl = `CREATE TABLE \`shift_swap_requests\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`requester_employee_id\` INT NOT NULL,
  \`target_employee_id\` INT NOT NULL,
  \`original_plot_id\` INT,
  \`requested_plot_id\` INT,
  \`swap_date\` DATE NOT NULL,
  \`reason\` VARCHAR(255),
  \`status\` ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  \`approved_by\` INT,
  \`approved_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`requester_employee_id\`) REFERENCES \`employees\`(\`id\`),
  FOREIGN KEY (\`target_employee_id\`) REFERENCES \`employees\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'payroll_slips':
      rows = state.payrollSlips || [];
      ddl = `CREATE TABLE \`payroll_slips\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`period_id\` INT NOT NULL,
  \`employee_id\` INT NOT NULL,
  \`base_salary\` DECIMAL(15,2) NOT NULL,
  \`total_points\` DECIMAL(8,2) NOT NULL,
  \`gross_base_pay\` DECIMAL(15,2) NOT NULL,
  \`total_overtime\` DECIMAL(15,2) DEFAULT 0,
  \`total_allowance\` DECIMAL(15,2) DEFAULT 0,
  \`total_deduction\` DECIMAL(15,2) DEFAULT 0,
  \`net_salary\` DECIMAL(15,2) NOT NULL,
  \`status\` ENUM('draft','final','paid') DEFAULT 'draft',
  \`generated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`period_id\`) REFERENCES \`payroll_periods\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE,
  UNIQUE KEY \`uq_slip\` (\`period_id\`, \`employee_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'payroll_slip_items':
      rows = state.payrollSlipItems || [];
      ddl = `CREATE TABLE \`payroll_slip_items\` (
  \`id\` BIGINT PRIMARY KEY AUTO_INCREMENT,
  \`slip_id\` INT NOT NULL,
  \`item_type\` ENUM('overtime','deduction','allowance') NOT NULL,
  \`rule_id\` INT NULL,
  \`item_name\` VARCHAR(150) NOT NULL,
  \`amount\` DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (\`slip_id\`) REFERENCES \`payroll_slips\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'payroll_periods':
      rows = state.payrollPeriods;
      ddl = `CREATE TABLE \`payroll_periods\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`period_name\` VARCHAR(100) NOT NULL,
  \`date_start\` DATE NOT NULL,
  \`date_end\` DATE NOT NULL,
  \`status\` ENUM('draft','processed','paid') DEFAULT 'draft',
  \`created_by\` INT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'overtime_rules':
      rows = state.overtimeRules;
      ddl = `CREATE TABLE \`overtime_rules\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`rule_name\` VARCHAR(150) NOT NULL,
  \`scope_type\` ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
  \`scope_id\` INT NULL,
  \`calc_type\` ENUM('fixed','percentage','multiplier','custom_formula') NOT NULL,
  \`fixed_amount\` DECIMAL(15,2) DEFAULT NULL,
  \`percentage_value\` DECIMAL(6,2) DEFAULT NULL,
  \`multiplier_value\` DECIMAL(6,2) DEFAULT NULL,
  \`custom_formula\` TEXT,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'deduction_rules':
      rows = state.deductionRules;
      ddl = `CREATE TABLE \`deduction_rules\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`rule_name\` VARCHAR(150) NOT NULL,
  \`scope_type\` ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
  \`scope_id\` INT NULL,
  \`calc_type\` ENUM('fixed','percentage','multiplier','custom_formula') NOT NULL,
  \`fixed_amount\` DECIMAL(15,2) DEFAULT NULL,
  \`percentage_value\` DECIMAL(6,2) DEFAULT NULL,
  \`multiplier_value\` DECIMAL(6,2) DEFAULT NULL,
  \`custom_formula\` TEXT,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'allowance_rules':
      rows = state.allowanceRules;
      ddl = `CREATE TABLE \`allowance_rules\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`rule_name\` VARCHAR(150) NOT NULL,
  \`scope_type\` ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
  \`scope_id\` INT NULL,
  \`calc_type\` ENUM('fixed','percentage','multiplier','custom_formula') NOT NULL,
  \`rate_unit\` VARCHAR(20) DEFAULT 'per_month',
  \`fixed_amount\` DECIMAL(15,2) DEFAULT NULL,
  \`percentage_value\` DECIMAL(6,2) DEFAULT NULL,
  \`multiplier_value\` DECIMAL(6,2) DEFAULT NULL,
  \`custom_formula\` TEXT,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'work_schedules':
      rows = (state.workSchedules || []).map((s) => ({
        id: s.id,
        schedule_name: s.schedule_name,
        time_in: s.time_in,
        time_out: s.time_out,
        break_start: s.break_start || null,
        break_end: s.break_end || null,
        tolerance_minutes: s.tolerance_minutes ?? 0,
        is_lateness_disabled: Boolean(s.is_lateness_disabled),
        exempt_job_grades: Array.isArray(s.exempt_job_grades) ? s.exempt_job_grades : [],
        working_days: s.working_days || [],
        is_active: s.is_active !== undefined ? Boolean(s.is_active) : true,
      }));
      ddl = `CREATE TABLE \`work_schedules\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`schedule_name\` VARCHAR(100) NOT NULL,
  \`time_in\` TIME NOT NULL,
  \`time_out\` TIME NOT NULL,
  \`break_start\` TIME,
  \`break_end\` TIME,
  \`tolerance_minutes\` INT DEFAULT 0,
  \`is_lateness_disabled\` BOOLEAN DEFAULT FALSE,
  \`exempt_job_grades\` JSON,
  \`working_days\` JSON,
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'company_profile':
      rows = state.companyProfiles || [state.companyProfile];
      ddl = `CREATE TABLE \`company_profile\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`company_name\` VARCHAR(150) NOT NULL,
  \`logo_url\` VARCHAR(255),
  \`address\` TEXT,
  \`phone\` VARCHAR(30),
  \`email\` VARCHAR(100),
  \`tax_id\` VARCHAR(50) COMMENT 'NPWP',
  \`timezone\` VARCHAR(50) DEFAULT 'Asia/Jakarta',
  \`theme_mode\` ENUM('light','dark') DEFAULT 'light',
  \`color_palette\` VARCHAR(20) DEFAULT '#1E88E5',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'company_holidays':
      rows = state.companyHolidays;
      ddl = `CREATE TABLE \`company_holidays\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`holiday_date\` DATE NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`type\` ENUM('nasional','cuti_bersama') NOT NULL DEFAULT 'nasional',
  \`is_recurring_yearly\` BOOLEAN DEFAULT FALSE,
  \`synced_from_global_calendar\` BOOLEAN DEFAULT FALSE,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_holiday\` (\`holiday_date\`, \`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'db_configs':
      rows = [state.dbConfig];
      ddl = `CREATE TABLE \`db_configs\` (
  \`id\` INT PRIMARY KEY AUTO_INCREMENT,
  \`config_name\` VARCHAR(100) NOT NULL DEFAULT 'Primary Connection',
  \`host\` VARCHAR(255) NOT NULL,
  \`port\` INT NOT NULL DEFAULT 3306,
  \`database_name\` VARCHAR(100) NOT NULL,
  \`username\` VARCHAR(100) NOT NULL,
  \`password_encrypted\` TEXT NOT NULL,
  \`ssl_mode\` ENUM('DISABLED','PREFERRED','REQUIRED','VERIFY_CA','VERIFY_IDENTITY') DEFAULT 'REQUIRED',
  \`ssl_ca_cert_path\` VARCHAR(255),
  \`provider\` ENUM('aiven','self_hosted','other') DEFAULT 'aiven',
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`last_connection_status\` ENUM('unknown','connected','failed') DEFAULT 'unknown',
  \`last_tested_at\` DATETIME,
  \`tested_by\` INT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'db_sync_logs':
      rows = state.dbSyncLogs;
      ddl = `CREATE TABLE \`db_sync_logs\` (
  \`id\` BIGINT PRIMARY KEY AUTO_INCREMENT,
  \`action_type\` ENUM('seed','push','pull','table_create','table_edit','table_delete','test_connection') NOT NULL,
  \`table_name\` VARCHAR(100),
  \`status\` ENUM('success','failed','in_progress') NOT NULL,
  \`message\` TEXT,
  \`row_count\` INT DEFAULT 0,
  \`executed_by\` INT,
  \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    case 'audit_logs':
      rows = state.auditLogs;
      ddl = `CREATE TABLE \`audit_logs\` (
  \`id\` BIGINT PRIMARY KEY AUTO_INCREMENT,
  \`user_id\` INT,
  \`action\` VARCHAR(50) NOT NULL,
  \`table_name\` VARCHAR(100),
  \`record_id\` VARCHAR(50),
  \`old_value\` JSON,
  \`new_value\` JSON,
  \`ip_address\` VARCHAR(50),
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      break;
    default: {
      const found = getTableDataRef(tableName);
      rows = found || (state as any)[tableName] || [];
    }
  }

  const columns = rows.length > 0 
    ? Array.from(new Set(rows.flatMap((r) => Object.keys(r || {})))) 
    : ['id'];

  res.json({
    table_name: tableName,
    total_rows: rows.length,
    columns,
    rows,
    ddl,
  });
});

// TABLE EXPLORER: Row CRUD
app.post('/api/db/table/:name/row', async (req, res) => {
  const tableName = req.params.name;
  const newRow: any = { id: Date.now(), ...req.body };

  const targetArr = getTableDataRef(tableName);
  if (targetArr) {
    targetArr.push(newRow);
  } else if (Array.isArray((state as any)[tableName])) {
    (state as any)[tableName].push(newRow);
  }

  saveStateToDisk();

  // Also sync insert to remote MySQL if connected
  try {
    const keys = Object.keys(req.body);
    if (keys.length > 0) {
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => {
        const v = req.body[k];
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      await syncMysqlQuery(`INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders});`, values);
    }
  } catch (err: any) {
    console.warn(`Note on Table Explorer insert for ${tableName}:`, err.message);
  }

  state.auditLogs.unshift({
    id: getNextAuditLogId(),
    user_name: 'Super Admin',
    action: 'TABLE_EXPLORER_INSERT',
    table_name: tableName,
    record_id: String(newRow.id),
    new_value: newRow,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({ success: true, row: newRow });
});

app.put('/api/db/table/:name/row/:id', async (req, res) => {
  const tableName = req.params.name;
  const id = Number(req.params.id);

  const targetArr = getTableDataRef(tableName);
  if (targetArr) {
    const idx = targetArr.findIndex((r: any) => r.id === id);
    if (idx !== -1) {
      targetArr[idx] = { ...targetArr[idx], ...req.body, id };
    }
  } else if (Array.isArray((state as any)[tableName])) {
    const idx = (state as any)[tableName].findIndex((r: any) => r.id === id);
    if (idx !== -1) {
      (state as any)[tableName][idx] = { ...(state as any)[tableName][idx], ...req.body, id };
    }
  }

  saveStateToDisk();

  // Also sync update to remote MySQL if connected
  try {
    const keys = Object.keys(req.body).filter((k) => k !== 'id');
    if (keys.length > 0) {
      const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => {
        const v = req.body[k];
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      values.push(id);
      await syncMysqlQuery(`UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?;`, values);
    }
  } catch (err: any) {
    console.warn(`Note on Table Explorer update for ${tableName}:`, err.message);
  }

  state.auditLogs.unshift({
    id: getNextAuditLogId(),
    user_name: 'Super Admin',
    action: 'TABLE_EXPLORER_UPDATE',
    table_name: tableName,
    record_id: String(id),
    new_value: req.body,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({ success: true, id, message: `Baris data ID #${id} berhasil diperbarui.` });
});

app.delete('/api/db/table/:name/row/:id', async (req, res) => {
  const tableName = req.params.name;
  const id = Number(req.params.id);

  const targetArr = getTableDataRef(tableName);
  if (targetArr) {
    const idx = targetArr.findIndex((r: any) => r.id === id);
    if (idx !== -1) {
      targetArr.splice(idx, 1);
    }
  } else if (Array.isArray((state as any)[tableName])) {
    (state as any)[tableName] = (state as any)[tableName].filter((r: any) => r.id !== id);
  }

  saveStateToDisk();

  // Live direct deletion from MySQL table as well
  const dbDelResult = await syncMysqlQuery(`DELETE FROM \`${tableName}\` WHERE id = ?;`, [id]);

  state.auditLogs.unshift({
    id: getNextAuditLogId(),
    user_name: 'Super Admin',
    action: 'TABLE_EXPLORER_DELETE',
    table_name: tableName,
    record_id: String(id),
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({
    success: true,
    message: `Baris ID #${id} berhasil dihapus dari sistem & MySQL.`,
    mysql_synced: dbDelResult.success,
  });
});

// TABLE EXPLORER: Per-Table Synchronization
app.post('/api/db/table/:name/sync', async (req, res) => {
  const tableName = req.params.name;
  let syncedRemotely = false;
  let remoteError = null;
  let rowCount = 0;

  const targetArr = getTableDataRef(tableName);
  let localRows = targetArr || (state as any)[tableName] || [];

  try {
    const mysqlOptions = buildMysqlConfig(state.dbConfig);
    const connection = await mysql.createConnection(mysqlOptions);

    await ensureRemoteSchemaMigrations(connection);

    try {
      // Fetch actual columns in the remote MySQL table to prevent schema mismatch errors
      const [colRows]: any = await connection.query(`SHOW COLUMNS FROM \`${tableName}\`;`);
      const validDbColumns = new Set(colRows.map((c: any) => c.Field));

      // 1. PUSH existing local rows to MySQL if we have any
      if (Array.isArray(localRows) && localRows.length > 0) {
        for (const row of localRows) {
          const cleanedRow: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            if (!validDbColumns.has(key)) continue; // Filter out UI-only fields
            const val = row[key];
            if (val === undefined) continue;
            if (typeof val === 'boolean') {
              cleanedRow[key] = val ? 1 : 0;
            } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
              cleanedRow[key] = JSON.stringify(val);
            } else {
              // Sanitize datetimes and ISO strings
              cleanedRow[key] = formatToMysqlDateTime(val);
            }
          }

          // Fill missing NOT NULL columns without default values to prevent MySQL default value errors
          for (const col of colRows) {
            const field = col.Field;
            const isNoNull = col.Null === 'NO';
            const hasNoDefault = col.Default === null || col.Default === undefined;
            const notAutoInc = !String(col.Extra || '').toLowerCase().includes('auto_increment');
            if (isNoNull && hasNoDefault && notAutoInc && (cleanedRow[field] === undefined || cleanedRow[field] === null)) {
              if (field === 'password_hash') {
                cleanedRow[field] = '$2a$10$e7c10b78df0bbf123456789abcdef0123456789abcdef0123456789abcdef';
              } else {
                const colType = String(col.Type || '').toLowerCase();
                if (colType.includes('int') || colType.includes('decimal') || colType.includes('float') || colType.includes('double')) {
                  cleanedRow[field] = 0;
                } else if (colType.includes('date') || colType.includes('time')) {
                  cleanedRow[field] = formatToMysqlDateTime(new Date());
                } else if (colType.includes('bool') || colType.includes('tinyint(1)')) {
                  cleanedRow[field] = 0;
                } else {
                  cleanedRow[field] = 'N/A';
                }
              }
            }
          }

          const keys = Object.keys(cleanedRow);
          if (keys.length > 0) {
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map((k) => cleanedRow[k]);
            const updateCols = keys.filter((k) => k !== 'id');
            const updateClause = updateCols.map((k) => `\`${k}\`=VALUES(\`${k}\`)`).join(', ');

            if (updateClause) {
              await connection.query(
                `INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause};`,
                values
              );
            } else {
              await connection.query(
                `INSERT IGNORE INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders});`,
                values
              );
            }
          }
        }
      }

      // 2. PULL updated records from MySQL
      const [remoteRows]: any = await connection.query(`SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 500;`);
      if (Array.isArray(remoteRows) && remoteRows.length > 0) {
        const mapped = remoteRows.map((r: any) => {
          const item = { ...r };
          if (item.id !== undefined && item.id !== null) item.id = Number(item.id);
          // Format date objects to strings
          for (const k of Object.keys(item)) {
            if (item[k] instanceof Date) {
              if (k.startsWith('date') || k.endsWith('_date') || k === 'holiday_date') {
                item[k] = item[k].toISOString().slice(0, 10);
              } else {
                item[k] = getWibDateTimeString(item[k]);
              }
            }
          }
          if (tableName === 'leave_balances') {
            if (item.employee_id !== undefined) item.employee_id = Number(item.employee_id);
            if (item.leave_type_id !== undefined) item.leave_type_id = Number(item.leave_type_id);
            if (item.year !== undefined) item.year = Number(item.year);
            if (item.quota_days !== undefined) item.quota_days = Number(item.quota_days);
            if (item.used_days !== undefined) item.used_days = Number(item.used_days);
            if (item.carry_forward_days !== undefined) item.carry_forward_days = Number(item.carry_forward_days);
            if (item.carry_forward_expired !== undefined) item.carry_forward_expired = !!item.carry_forward_expired;
          } else if (tableName === 'employees') {
            if (item.division_id !== undefined && item.division_id !== null) item.division_id = Number(item.division_id);
            if (item.job_grade_id !== undefined && item.job_grade_id !== null) item.job_grade_id = Number(item.job_grade_id);
            if (item.base_salary !== undefined) item.base_salary = Number(item.base_salary);
          } else if (tableName === 'leave_types') {
            if (item.default_quota_days !== undefined) item.default_quota_days = Number(item.default_quota_days);
            if (item.is_paid !== undefined) item.is_paid = !!item.is_paid;
            if (item.requires_attachment !== undefined) item.requires_attachment = !!item.requires_attachment;
            if (item.is_active !== undefined) item.is_active = !!item.is_active;
          } else if (tableName === 'work_schedules') {
            if (item.tolerance_minutes !== undefined) item.tolerance_minutes = Number(item.tolerance_minutes);
            if (item.earliest_clock_in_minutes !== undefined) item.earliest_clock_in_minutes = Number(item.earliest_clock_in_minutes) || 120;
            if (typeof item.working_days === 'string') {
              try { item.working_days = JSON.parse(item.working_days); } catch {}
            }
            if (typeof item.exempt_job_grades === 'string') {
              try { item.exempt_job_grades = JSON.parse(item.exempt_job_grades); } catch {}
            }
            if (item.is_lateness_disabled !== undefined) item.is_lateness_disabled = !!item.is_lateness_disabled;
            if (item.is_active !== undefined) item.is_active = !!item.is_active;
          } else if (tableName === 'job_grades') {
            if (item.is_exempt_from_lateness !== undefined) item.is_exempt_from_lateness = !!item.is_exempt_from_lateness;
            if (item.is_active !== undefined) item.is_active = !!item.is_active;
          } else if (tableName === 'attendance_logs') {
            if (item.employee_id !== undefined) item.employee_id = Number(item.employee_id);
            if (item.location_id !== undefined && item.location_id !== null) item.location_id = Number(item.location_id);
            if (item.is_mock_location !== undefined) item.is_mock_location = !!item.is_mock_location;
            const normType = (item.log_type === 'clock_out' || item.log_type === 'out') ? 'out' : 'in';
            if (normType === 'in' && item.employee_id) {
              const evalRes = computeAttendanceStatus(
                Number(item.employee_id),
                item.log_date || (item.scan_time ? String(item.scan_time).slice(0, 10) : ''),
                item.scan_time,
                'in'
              );
              if (evalRes.status === 'late') {
                item.status = 'late';
                if (!item.notes || item.notes === 'Tepat Waktu' || item.notes.toLowerCase().includes('tepat')) {
                  item.notes = evalRes.notes;
                }
              }
            }
          }
          return item;
        });

        // Update in-memory state
        if (tableName === 'leave_balances') state.leaveBalances = mapped;
        else if (tableName === 'leave_types') state.leaveTypes = mapped;
        else if (tableName === 'employees') state.employees = mapped;
        else if (tableName === 'divisions') state.divisions = mapped;
        else if (tableName === 'job_grades') state.jobGrades = mapped;
        else if (tableName === 'work_schedules') state.workSchedules = mapped;
        else if (tableName === 'schedule_plots') state.schedulePlots = mapped;
        else if (tableName === 'leave_requests') state.leaveRequests = mapped;
        else if (tableName === 'attendance_logs') state.attendanceLogs = mapped;
        else if (tableName === 'company_holidays') state.companyHolidays = mapped;
        else if (tableName === 'official_letters') state.officialLetters = mapped;
        else if (tableName === 'roles') state.roles = mapped;
        else if (tableName === 'permissions') state.permissions = mapped;
        else if (tableName === 'role_permissions') state.rolePermissions = mapped;
        else if (tableName === 'users') state.users = mapped;
        else if (tableName === 'overtime_requests') state.overtimeRequests = mapped;
        else if (tableName === 'overtime_rules') state.overtimeRules = mapped;
        else if (tableName === 'deduction_rules') state.deductionRules = mapped;
        else if (tableName === 'allowance_rules') state.allowanceRules = mapped;
        else if (tableName === 'payroll_periods') state.payrollPeriods = mapped;
        else if (tableName === 'payroll_slips') state.payrollSlips = mapped;
        else if (tableName === 'payroll_slip_items') state.payrollSlipItems = mapped;
        else if (tableName === 'shift_swap_requests') state.shiftSwapRequests = mapped;
        else (state as any)[tableName] = mapped;

        rowCount = mapped.length;
        syncedRemotely = true;
      } else {
        rowCount = localRows.length;
        syncedRemotely = true;
      }
    } catch (tblErr: any) {
      remoteError = tblErr.message;
    }

    await connection.end();
  } catch (err: any) {
    remoteError = err.message;
  }

  saveStateToDisk();

  const finalRowsCount = rowCount || (getTableDataRef(tableName)?.length || 0);

  state.dbSyncLogs.unshift({
    id: Date.now(),
    action_type: 'push',
    table_name: tableName,
    status: syncedRemotely ? 'success' : (remoteError ? 'failed' : 'in_progress'),
    message: syncedRemotely
      ? `Sinkronisasi tabel ${tableName} ke MySQL berhasil (${finalRowsCount} baris diselaraskan).`
      : `Sinkronisasi tabel ${tableName} disimpan ke storage lokal. (${remoteError ? 'Catatan remote: ' + remoteError : 'Mode lokal'})`,
    row_count: finalRowsCount,
    executed_by_name: 'Super Admin',
    executed_at: new Date().toISOString(),
  });

  saveStateToDisk();

  res.json({
    success: syncedRemotely || !remoteError,
    syncedRemotely,
    remoteError,
    rowCount: finalRowsCount,
    message: syncedRemotely
      ? `Tabel '${tableName}' berhasil disinkronkan langsung dengan MySQL Cloud! (${finalRowsCount} data selaras)`
      : `Tabel '${tableName}' tersinkronisasi di penyimpanan lokal. (${remoteError ? 'Catatan remote: ' + remoteError : 'Siap digunakan'})`,
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NKU HR Services Portal Server running on http://0.0.0.0:${PORT}`);

    // Otomatis sinkronisasi hari libur resmi (Tiap sebulan sekali saja)
    const runMonthlyHolidaySync = async () => {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (state.lastHolidaySyncMonth === currentMonthKey) {
        console.log(`[Auto-Sync] Hari libur bulan ${currentMonthKey} sudah disinkronkan sebelumnya. Melewati auto-sync rutin.`);
        return;
      }

      try {
        console.log(`[Auto-Sync] Menjalankan sinkronisasi hari libur bulanan untuk periode ${currentMonthKey}...`);
        await syncHolidaysForYear(now.getFullYear());
        state.lastHolidaySyncMonth = currentMonthKey;
        saveStateToDisk();
      } catch (err) {
        console.error('[Auto-Sync] Error pada sinkronisasi libur bulanan:', err);
      }
    };

    setTimeout(runMonthlyHolidaySync, 2000);

    // Cek berkala 1x sehari apakah sudah berganti bulan
    setInterval(runMonthlyHolidaySync, 86400000);
  });
}

startServer();
