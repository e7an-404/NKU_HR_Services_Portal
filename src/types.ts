/**
 * NKU HR Services Portal - Type Definitions
 * PT. NINDYA KRIDA UTAMA (NKU)
 */

export type UserRole = 'super_admin' | 'hr_admin' | 'payroll_admin' | 'manager' | 'kiosk_device';

export interface CompanyProfile {
  id: number;
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string; // NPWP
  website?: string;
  timezone: string;
  theme_mode: 'light' | 'dark';
  color_palette: string; // e.g. #1E88E5
  created_at?: string;
  updated_at?: string;
}

export interface CompanyHoliday {
  id: number;
  holiday_date: string;
  name: string;
  type: 'nasional' | 'cuti_bersama';
  is_recurring_yearly: boolean;
  synced_from_global_calendar: boolean;
  created_at?: string;
  holiday_name?: string;
  is_joint_leave?: boolean;
}

export type Holiday = CompanyHoliday;

export interface DbConfig {
  id: number;
  config_name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted?: string;
  password_plain?: string; // used in UI form
  ssl_mode: 'DISABLED' | 'PREFERRED' | 'REQUIRED' | 'VERIFY_CA' | 'VERIFY_IDENTITY';
  ssl_ca_cert_path?: string;
  ssl_ca_cert_name?: string;
  ssl_client_cert_path?: string;
  ssl_client_key_path?: string;
  provider: 'aiven' | 'self_hosted' | 'other';
  is_active: boolean;
  last_connection_status: 'unknown' | 'connected' | 'failed';
  last_tested_at?: string;
  last_latency_ms?: number;
  last_error_message?: string;
  tested_by?: number;
  user?: string;
  password?: string;
  database?: string;
  ca_certificate?: string;
}

export type DatabaseConfig = DbConfig;

export interface DbSyncLog {
  id: number;
  action_type: 'seed' | 'push' | 'pull' | 'table_create' | 'table_edit' | 'table_delete' | 'test_connection';
  table_name?: string;
  status: 'success' | 'failed' | 'in_progress';
  message: string;
  row_count: number;
  executed_by_name?: string;
  executed_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}

export interface Role {
  id: number;
  role_key: UserRole;
  role_name: string;
  description: string;
  can_manage_db_config: boolean;
  can_manage_payroll_rules: boolean;
  can_manage_master_data: boolean;
  can_approve_requests: boolean;
  is_system_role: boolean;
}

export interface Division {
  id: number;
  division_code: string;
  division_name: string;
  description: string;
  is_active: boolean;
  created_at?: string;
}

export interface JobGrade {
  id: number;
  grade_code: string;
  grade_name: string;
  description: string;
  is_active: boolean;
  is_exempt_from_lateness?: boolean; // Pengecualian denda & status keterlambatan
  created_at?: string;
}

export interface Employee {
  id: number;
  nip: string;
  full_name: string;
  division_id: number | null;
  division_name?: string;
  job_grade_id: number | null;
  job_grade_name?: string;
  photo_url?: string;
  avatar_url?: string;
  email: string;
  phone: string;
  address?: string;
  join_date: string;
  base_salary: number; // upah per jam (IDR)
  daily_salary?: number; // gaji harian (IDR)
  rfid_code?: string;
  bank_account?: string; // Alihfungsi rfid_code / nomor rekening bank transfer karyawan
  qr_code?: string;
  status: 'active' | 'inactive' | 'resigned';
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_key: UserRole;
  role_name: string;
  employee_id?: number | null;
  employee_name?: string;
  employee_nip?: string;
  division_id?: number | null;
  division_name?: string;
  is_active: boolean;
  last_login_at?: string;
}

export interface WorkSchedule {
  id: number;
  schedule_name: string;
  time_in: string; // "08:00:00"
  time_out: string; // "17:00:00"
  break_start?: string;
  break_end?: string;
  tolerance_minutes: number;
  earliest_clock_in_minutes?: number; // Menit paling awal boleh presensi masuk (default 120m / 2 jam sebelum jam masuk)
  working_days: string[]; // ["mon", "tue", "wed", "thu", "fri"]
  is_active: boolean;
  target_division?: string;
  is_lateness_disabled?: boolean; // Menonaktifkan kalkulasi keterlambatan untuk seluruh karyawan pada jadwal ini
  exempt_job_grades?: number[]; // Daftar ID Golongan yang dibebaskan dari keterlambatan
  created_at?: string;
}

export interface SchedulePlot {
  id: number;
  schedule_id: number;
  schedule_name?: string;
  scope_type: 'general' | 'division' | 'job_grade' | 'employee';
  scope_id?: number | null;
  scope_name?: string;
  date_start: string;
  date_end: string;
  notes?: string;
  created_by?: number;
  created_at?: string;
}

export interface CompanyLocation {
  id: number;
  location_code: string;
  location_name: string;
  location_type: 'head_office' | 'batching_plant' | 'purchasing_office' | 'branch_office' | 'warehouse' | 'project_site' | string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceLog {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_nip?: string;
  division_name?: string;
  log_date: string;
  scan_time: string;
  log_type: 'in' | 'out';
  method: 'rfid' | 'qr' | 'nip_manual' | 'mobile_gps' | 'manual';
  device_id?: string;
  location_id?: number | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
  is_mock_location?: boolean;
  status: 'on_time' | 'late' | 'early_leave' | 'normal';
  notes?: string;
  created_at?: string;
}

export interface LeaveType {
  id: number;
  type_name: string;
  default_quota_days: number;
  is_paid: boolean;
  requires_attachment: boolean;
  is_active: boolean;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_nip?: string;
  division_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  date_start: string;
  date_end: string;
  total_days: number;
  reason: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  created_at?: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_nip?: string;
  division_name?: string;
  job_grade_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  year: number;
  quota_days: number;
  used_days: number;
  remaining_days: number;
}

export interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_nip?: string;
  division_name?: string;
  overtime_date: string;
  time_start: string;
  time_end: string;
  total_hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  created_at?: string;
  group_code?: string;
  group_name?: string;
}

export type CalcType = 'fixed' | 'percentage' | 'multiplier' | 'custom_formula' | 'timeslot';
export type RuleScope = 'general' | 'division' | 'job_grade';

export interface OvertimeTierSlot {
  id?: string;
  time_start: string;
  time_end: string;
  rate_type: 'fixed' | 'daily_multiplier' | 'hourly_multiplier';
  rate_value: number;
  label?: string;
}

export type OvertimeRateUnit = 'per_hour' | 'per_3_hours' | 'per_day' | 'per_spkl';

export interface OvertimeRule {
  id: number;
  rule_name: string;
  scope_type?: RuleScope;
  scope_id?: number | null;
  scope_name?: string;
  calc_type?: CalcType;
  rate_unit?: OvertimeRateUnit; // 'per_hour' | 'per_3_hours' | 'per_day' | 'per_spkl'
  fixed_amount?: number;
  percentage_value?: number;
  multiplier_value?: number;
  custom_formula?: string; // e.g. "base_salary * hours * 1.5"
  tier_slots?: OvertimeTierSlot[];
  is_active?: boolean;
  multiplier?: number;
  formula?: string;
}

export interface DeductionRule {
  id: number;
  rule_name: string; // e.g. BPJS Kesehatan, BPJS TK, Potongan Koperasi
  scope_type?: RuleScope;
  scope_id?: number | null;
  scope_name?: string;
  calc_type?: CalcType;
  fixed_amount?: number;
  percentage_value?: number;
  multiplier_value?: number;
  custom_formula?: string;
  is_active?: boolean;
  deduction_type?: string;
  amount?: number;
  formula?: string;
}

export interface AllowanceRule {
  id: number;
  rule_name: string; // e.g. Uang Makan, Tunjangan Transport, Tunjangan Jabatan
  scope_type?: RuleScope;
  scope_id?: number | null;
  scope_name?: string;
  calc_type?: CalcType;
  rate_unit?: 'per_day' | 'per_month'; // 'per_day' (harian) atau 'per_month' (bulanan)
  fixed_amount?: number;
  percentage_value?: number;
  multiplier_value?: number;
  custom_formula?: string;
  is_active?: boolean;
  allowance_type?: string;
  amount?: number;
  formula?: string;
}

export interface PayrollPeriod {
  id: number;
  period_name: string; // e.g. "Agustus 2026"
  date_start: string;
  date_end: string;
  status: 'draft' | 'processed' | 'paid';
  created_by?: number;
  created_at?: string;
  total_slips?: number;
  total_payout?: number;
}

export interface PayrollSlipItem {
  id: number;
  slip_id: number;
  item_type: 'overtime' | 'deduction' | 'allowance';
  rule_id?: number | null;
  item_name: string;
  amount: number;
}

export interface PayrollSlip {
  id: number;
  period_id?: number;
  period_name?: string;
  employee_id: number;
  employee_name?: string;
  employee_nip?: string;
  division_name?: string;
  job_grade_name?: string;
  base_salary?: number; // upah per jam
  total_points?: number; // total jam kerja aktual
  gross_base_pay?: number; // base_salary * total_points
  total_overtime?: number;
  total_allowance?: number;
  total_deduction?: number;
  net_salary: number;
  status: 'draft' | 'final' | 'paid';
  generated_at?: string;
  items?: PayrollSlipItem[];
  period_start?: string;
  period_end?: string;
  total_hours?: number;
  overtime_hours?: number;
  base_salary_earned?: number;
  overtime_pay?: number;
  allowances_amount?: number;
  deductions_amount?: number;
}

export type OfficialLetterType = 'warning' | 'recommendation' | 'layoff';

export interface OfficialLetter {
  id: number;
  letter_type: OfficialLetterType;
  letter_number: string;
  employee_id: number;
  employee_name: string;
  employee_nip: string;
  division_name?: string;
  job_title?: string;
  issue_date: string;
  effective_date?: string;
  // Warning letter specifics
  warning_level?: 'SP-1' | 'SP-2' | 'SP-3';
  violation_reason?: string;
  validity_months?: number;
  // Recommendation letter specifics
  join_date?: string;
  end_date?: string;
  accomplishments?: string;
  // Layoff letter specifics
  layoff_reason?: string;
  severance_notes?: string;
  // Signatures
  company_signatory_name: string;
  company_signatory_title: string;
  employee_acknowledged: boolean;
  notes?: string;
  created_at?: string;
}
