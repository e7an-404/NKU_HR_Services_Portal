/**
 * API Client for NKU HR Services Portal
 */
import {
  CompanyProfile,
  CompanyHoliday,
  DbConfig,
  DbSyncLog,
  AuditLog,
  Division,
  JobGrade,
  Employee,
  User,
  WorkSchedule,
  SchedulePlot,
  AttendanceLog,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  OvertimeRequest,
  OvertimeRule,
  DeductionRule,
  AllowanceRule,
  PayrollPeriod,
  PayrollSlip,
  OfficialLetter,
} from '../types';

// Global safeguard against non-JSON responses (e.g. "Rate exceeded." or plain-text proxy errors)
if (typeof Response !== 'undefined' && !(Response.prototype as any).__safeJsonPatched) {
  const _originalJson = Response.prototype.json;
  Response.prototype.json = async function () {
    try {
      const text = await this.text();
      if (!text || text.trim() === '') {
        return {} as any;
      }
      try {
        return JSON.parse(text);
      } catch {
        if (text.includes('Rate exceeded')) {
          console.warn('[API Rate Limited]: Server/proxy returned "Rate exceeded." Handled gracefully.');
          return { error: 'Rate exceeded', success: false, message: 'Permintaan terlalu sering, silakan tunggu sesaat.' } as any;
        }
        return { error: text, message: text } as any;
      }
    } catch {
      return {} as any;
    }
  };
  (Response.prototype as any).__safeJsonPatched = true;
}

export const api = {
  // Auth
  async getCurrentUser(): Promise<{ user: User; roles: any[] }> {
    const res = await fetch('/api/auth/me');
    return res.json();
  },
  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch('/api/auth/users');
    return res.json();
  },
  async loginUser(usernameOrEmail: string, password?: string, authType?: string): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password, authType }),
    });
    return res.json();
  },
  async createUser(data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateUser(id: number, data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteUser(id: number): Promise<{ success: boolean; error?: string; message?: string }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  async resetOperatingData(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch('/api/system/reset-operating-data', {
      method: 'POST',
    });
    return res.json();
  },
  async switchUser(userId: number): Promise<{ user: User; message: string }> {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  // Company & Holidays
  async getCompanyProfile(): Promise<CompanyProfile> {
    const res = await fetch('/api/company');
    return res.json();
  },
  async getCompanies(): Promise<{ companies: CompanyProfile[]; activeCompanyId: number; activeCompany: CompanyProfile }> {
    const res = await fetch('/api/companies');
    return res.json();
  },
  async addCompany(data: Partial<CompanyProfile>): Promise<{ success: boolean; company: CompanyProfile; companies: CompanyProfile[] }> {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateCompany(
    idOrData: number | Partial<CompanyProfile>,
    dataOrId?: Partial<CompanyProfile> | number
  ): Promise<{ success: boolean; company: CompanyProfile; companies: CompanyProfile[]; activeCompany: CompanyProfile }> {
    let id: number = 1;
    let data: Partial<CompanyProfile> = {};

    if (typeof idOrData === 'number') {
      id = idOrData;
      data = (dataOrId as Partial<CompanyProfile>) || {};
    } else if (typeof dataOrId === 'number') {
      id = dataOrId;
      data = (idOrData as Partial<CompanyProfile>) || {};
    } else if (typeof idOrData === 'object' && idOrData !== null) {
      data = idOrData;
      id = Number(data.id) || 1;
    }

    const res = await fetch(`/api/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteCompany(id: number): Promise<{ success: boolean; companies: CompanyProfile[]; activeCompany: CompanyProfile; activeCompanyId: number; message?: string }> {
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async selectCompany(id: number): Promise<{ success: boolean; activeCompany: CompanyProfile; activeCompanyId: number; companies: CompanyProfile[]; message?: string }> {
    const res = await fetch(`/api/companies/${id}/select`, { method: 'POST' });
    return res.json();
  },
  async uploadLogo(imageBase64: string, companyId?: number): Promise<{ success: boolean; url: string; activeCompany: CompanyProfile; companies: CompanyProfile[]; message: string }> {
    const res = await fetch('/api/upload-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, companyId }),
    });
    return res.json();
  },
  async updateCompanyProfile(data: Partial<CompanyProfile>): Promise<{ success: boolean; company: CompanyProfile }> {
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const text = await res.text();
      if (!res.ok || text.includes('Rate exceeded')) {
        return {
          success: false,
          company: data as CompanyProfile,
        };
      }
      try {
        const json = JSON.parse(text);
        return json;
      } catch {
        return {
          success: true,
          company: data as CompanyProfile,
        };
      }
    } catch {
      return {
        success: false,
        company: data as CompanyProfile,
      };
    }
  },
  async getHolidays(): Promise<CompanyHoliday[]> {
    const res = await fetch('/api/holidays');
    return res.json();
  },
  async addHoliday(data: Partial<CompanyHoliday>): Promise<{ success: boolean; holiday: CompanyHoliday }> {
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteHoliday(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async updateHoliday(id: number, data: Partial<CompanyHoliday>): Promise<CompanyHoliday> {
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.holiday;
  },
  async syncHolidaysFromInternet(year?: number): Promise<{
    success: boolean;
    count: number;
    addedCount: number;
    updatedCount?: number;
    year?: number;
    source: string;
    holidays: CompanyHoliday[];
    message: string;
  }> {
    const res = await fetch('/api/holidays/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(year ? { year } : {}),
    });
    return res.json();
  },

  // Master SDM
  async getDivisions(): Promise<Division[]> {
    const res = await fetch('/api/divisions');
    return res.json();
  },
  async addDivision(data: Partial<Division>): Promise<{ success: boolean; division: Division }> {
    const res = await fetch('/api/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateDivision(id: number, data: Partial<Division>): Promise<{ success: boolean; division: Division }> {
    const res = await fetch(`/api/divisions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteDivision(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/divisions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getJobGrades(): Promise<JobGrade[]> {
    const res = await fetch('/api/job-grades');
    return res.json();
  },
  async addJobGrade(data: Partial<JobGrade>): Promise<{ success: boolean; jobGrade: JobGrade }> {
    const res = await fetch('/api/job-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateJobGrade(id: number, data: Partial<JobGrade>): Promise<{ success: boolean; jobGrade: JobGrade }> {
    const res = await fetch(`/api/job-grades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteJobGrade(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/job-grades/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async uploadPhoto(imageBase64: string): Promise<{ success: boolean; url: string; filename: string }> {
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    return res.json();
  },

  async getEmployees(): Promise<Employee[]> {
    const res = await fetch('/api/employees');
    return res.json();
  },
  async addEmployee(data: Partial<Employee>): Promise<{ success: boolean; employee: Employee }> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateEmployee(id: number, data: Partial<Employee>): Promise<{ success: boolean; employee: Employee }> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteEmployee(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Schedules
  async getSchedules(): Promise<WorkSchedule[]> {
    const res = await fetch('/api/schedules');
    return res.json();
  },
  async addSchedule(data: Partial<WorkSchedule>): Promise<{ success: boolean; schedule: WorkSchedule }> {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateSchedule(id: number, data: Partial<WorkSchedule>): Promise<{ success: boolean; schedule: WorkSchedule }> {
    const res = await fetch(`/api/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteSchedule(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getSchedulePlots(): Promise<SchedulePlot[]> {
    const res = await fetch('/api/schedule-plots');
    return res.json();
  },
  async addSchedulePlot(data: Partial<SchedulePlot>): Promise<{ success: boolean; plot: SchedulePlot }> {
    const res = await fetch('/api/schedule-plots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateSchedulePlot(id: number, data: Partial<SchedulePlot>): Promise<{ success: boolean; plot: SchedulePlot }> {
    const res = await fetch(`/api/schedule-plots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteSchedulePlot(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/schedule-plots/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Attendance
  async getAttendanceLogs(): Promise<AttendanceLog[]> {
    const res = await fetch('/api/attendance/logs');
    return res.json();
  },
  async scanAttendance(data: {
    method: 'rfid' | 'qr' | 'manual' | 'nip_manual' | 'mobile_gps';
    identifier: string;
    log_type?: 'in' | 'out';
    device_id?: string;
    log_date?: string;
    scan_time?: string;
    location_id?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    location_address?: string | null;
    is_mock_location?: boolean;
    force_early_clock_in?: boolean;
    early_clock_in_reason?: string;
  }): Promise<{ success: boolean; message: string; scan?: AttendanceLog; error?: string; requires_early_confirmation?: boolean; time_now?: string }> {
    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async mobileClockIn(data: {
    employee_id?: number;
    identifier?: string;
    location_id?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    location_address?: string | null;
    accuracy?: number;
    is_mock_location?: boolean;
    log_type?: 'in' | 'out';
    device_name?: string;
    notes?: string;
    force_early_clock_in?: boolean;
    early_clock_in_reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    requires_early_confirmation?: boolean;
    time_now?: string;
  }> {
    const res = await fetch('/api/attendance/mobile-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  // Company Work Locations (Head Office, Batching Plant, Purchasing Office, etc.)
  async getLocations(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/locations');
    return res.json();
  },
  async addLocation(data: any): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateLocation(id: number, data: any): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteLocation(id: number): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async updateAttendanceLog(id: number, data: Partial<AttendanceLog>): Promise<{ success: boolean; log?: AttendanceLog; error?: string; message?: string }> {
    const res = await fetch(`/api/attendance/logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async askAi(message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<{ success: boolean; reply?: string; error?: string }> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    return res.json();
  },
  async addAttendanceLog(data: {
    employee_id: number;
    location_id?: number | null;
    log_date: string;
    scan_time: string;
    log_type: 'in' | 'out';
    method?: string;
    device_id?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_address?: string | null;
    is_mock_location?: boolean;
    status?: string;
    notes?: string;
  }): Promise<{ success: boolean; log?: AttendanceLog; error?: string; message?: string }> {
    const res = await fetch('/api/attendance/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteAttendanceLog(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/attendance/logs/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Requests
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await fetch('/api/requests/leave');
    return res.json();
  },
  async addLeaveRequest(data: Partial<LeaveRequest>): Promise<{ success: boolean; request: LeaveRequest; error?: string }> {
    const res = await fetch('/api/requests/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateLeaveRequest(id: number, data: Partial<LeaveRequest>): Promise<{ success: boolean; request?: LeaveRequest; error?: string }> {
    const res = await fetch(`/api/requests/leave/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteLeaveRequest(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/requests/leave/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async approveLeaveRequest(id: number, status: 'approved' | 'rejected', approver_id?: number): Promise<{ success: boolean; request?: LeaveRequest }> {
    const res = await fetch(`/api/requests/leave/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approver_id }),
    });
    return res.json();
  },
  async getOvertimeRequests(): Promise<OvertimeRequest[]> {
    const res = await fetch('/api/requests/overtime');
    return res.json();
  },
  async addOvertimeRequest(data: any): Promise<{ success: boolean; request: OvertimeRequest; requests?: OvertimeRequest[] }> {
    const res = await fetch('/api/requests/overtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateOvertimeRequest(id: number, data: Partial<OvertimeRequest>): Promise<{ success: boolean; request?: OvertimeRequest; error?: string }> {
    const res = await fetch(`/api/requests/overtime/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteOvertimeRequest(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/requests/overtime/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async approveOvertimeRequest(id: number, status: 'approved' | 'rejected', approver_id?: number): Promise<{ success: boolean; request?: OvertimeRequest }> {
    const res = await fetch(`/api/requests/overtime/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approver_id }),
    });
    return res.json();
  },
  async getLeaveBalances(): Promise<LeaveBalance[]> {
    const res = await fetch('/api/requests/leave-balances');
    return res.json();
  },
  async syncLeaveBalances(): Promise<{ success: boolean; count: number; remote_synced: number; message: string }> {
    const res = await fetch('/api/requests/leave-balances/sync', { method: 'POST' });
    return res.json();
  },
  async updateLeaveBalance(id: number, data: { quota_days?: number; used_days?: number; carry_forward_days?: number }): Promise<{ success: boolean; balance?: LeaveBalance; message?: string }> {
    const res = await fetch(`/api/requests/leave-balances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async setLeaveQuota(data: { employee_id: number; leave_type_id: number; quota_days: number; year?: number }): Promise<{ success: boolean; balance?: LeaveBalance; message?: string }> {
    const res = await fetch('/api/requests/leave-balances/set-quota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async bulkSetLeaveQuota(data: { quota_days: number; year?: number }): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/requests/leave-balances/bulk-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Official HR Letters (Surat Peringatan, Paklaring, Layoff)
  async getOfficialLetters(): Promise<OfficialLetter[]> {
    const res = await fetch('/api/official-letters');
    return res.json();
  },
  async createOfficialLetter(data: Partial<OfficialLetter>): Promise<{ success: boolean; letter?: OfficialLetter; message?: string }> {
    const res = await fetch('/api/official-letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateOfficialLetter(id: number, data: Partial<OfficialLetter>): Promise<{ success: boolean; letter?: OfficialLetter; message?: string }> {
    const res = await fetch(`/api/official-letters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteOfficialLetter(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/official-letters/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Payroll
  async getOvertimeRules(): Promise<OvertimeRule[]> {
    const res = await fetch('/api/payroll/rules/overtime');
    return res.json();
  },
  async addOvertimeRule(data: Partial<OvertimeRule>): Promise<{ success: boolean; rule?: OvertimeRule }> {
    const res = await fetch('/api/payroll/rules/overtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateOvertimeRule(id: number, data: Partial<OvertimeRule>): Promise<{ success: boolean; rule?: OvertimeRule }> {
    const res = await fetch(`/api/payroll/rules/overtime/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteOvertimeRule(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/payroll/rules/overtime/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getDeductionRules(): Promise<DeductionRule[]> {
    const res = await fetch('/api/payroll/rules/deduction');
    return res.json();
  },
  async addDeductionRule(data: Partial<DeductionRule>): Promise<{ success: boolean; rule?: DeductionRule }> {
    const res = await fetch('/api/payroll/rules/deduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateDeductionRule(id: number, data: Partial<DeductionRule>): Promise<{ success: boolean; rule?: DeductionRule }> {
    const res = await fetch(`/api/payroll/rules/deduction/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteDeductionRule(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/payroll/rules/deduction/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getAllowanceRules(): Promise<AllowanceRule[]> {
    const res = await fetch('/api/payroll/rules/allowance');
    return res.json();
  },
  async addAllowanceRule(data: Partial<AllowanceRule>): Promise<{ success: boolean; rule?: AllowanceRule }> {
    const res = await fetch('/api/payroll/rules/allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateAllowanceRule(id: number, data: Partial<AllowanceRule>): Promise<{ success: boolean; rule?: AllowanceRule }> {
    const res = await fetch(`/api/payroll/rules/allowance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteAllowanceRule(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/payroll/rules/allowance/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    const res = await fetch('/api/payroll/periods');
    return res.json();
  },
  async addPayrollPeriod(data: Partial<PayrollPeriod>): Promise<{ success: boolean; period: PayrollPeriod }> {
    const res = await fetch('/api/payroll/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getPayrollSlips(periodId?: number): Promise<PayrollSlip[]> {
    const url = periodId ? `/api/payroll/slips?period_id=${periodId}` : '/api/payroll/slips';
    const res = await fetch(url);
    return res.json();
  },
  async updatePayrollSlip(id: number, data: Partial<PayrollSlip>): Promise<{ success: boolean; slip?: PayrollSlip; message?: string }> {
    const res = await fetch(`/api/payroll/slips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deletePayrollSlip(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/payroll/slips/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async generateSalarySlips(periodId: number): Promise<{ success: boolean; message: string; count?: number; error?: string }> {
    const res = await fetch('/api/payroll/generate-slips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: periodId }),
    });
    return res.json();
  },

  // DB Config & Live MySQL
  async getDbConfig(): Promise<DbConfig> {
    const res = await fetch('/api/db/config');
    return res.json();
  },
  async saveDbConfig(data: Partial<DbConfig>): Promise<{ success: boolean; dbConfig: DbConfig }> {
    const res = await fetch('/api/db/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async testDbConnection(data?: Partial<DbConfig>): Promise<{
    success: boolean;
    status: 'connected' | 'failed';
    latency_ms: number;
    server_info?: any;
    message: string;
    error?: string;
  }> {
    const res = await fetch('/api/db/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },
  async runDbSeeder(): Promise<{ success: boolean; message: string; executedRemotely?: boolean; remoteError?: string }> {
    const res = await fetch('/api/db/seed', { method: 'POST' });
    return res.json();
  },
  async wipeDatabaseForHandover(): Promise<{
    success: boolean;
    executedRemotely?: boolean;
    remoteError?: string;
    cleared_tables: string[];
    preserved_tables: { name: string; count?: number; description: string }[];
    message: string;
  }> {
    const res = await fetch('/api/db/wipe-for-handover', { method: 'POST' });
    return res.json();
  },
  async syncDbPull(): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await fetch('/api/db/sync-pull', { method: 'POST' });
    return res.json();
  },
  async syncDbPush(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/sync-push', { method: 'POST' });
    return res.json();
  },
  async getDbLogs(): Promise<{ syncLogs: DbSyncLog[]; auditLogs: AuditLog[] }> {
    const res = await fetch('/api/db/logs');
    return res.json();
  },
  async getDbSyncLogs(): Promise<{ success: boolean; logs: DbSyncLog[]; dbConfig: DbConfig; total: number }> {
    const res = await fetch('/api/db/sync-logs');
    return res.json();
  },
  async clearDbSyncLogs(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/clear-logs', { method: 'POST' });
    return res.json();
  },
  async deleteDbSyncLog(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/db/sync-logs/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async acknowledgeDbSyncLog(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/db/sync-logs/${id}/acknowledge`, { method: 'POST' });
    return res.json();
  },
  async uploadSslCert(certType: string, certContent: string, filename: string): Promise<{ success: boolean; cert_path: string; filename: string }> {
    const res = await fetch('/api/db/upload-cert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cert_type: certType, cert_content: certContent, filename }),
    });
    return res.json();
  },
  async getDbDdl(): Promise<{
    success: boolean;
    ddl: string;
    filename: string;
    tableCount: number;
    generatedAt: string;
  }> {
    const res = await fetch('/api/db/ddl');
    return res.json();
  },

  // Table Explorer
  async getTables(): Promise<{ database: string; tables: any[] }> {
    const res = await fetch('/api/db/tables');
    return res.json();
  },
  async getTableDetail(tableName: string): Promise<{
    table_name: string;
    total_rows: number;
    columns: string[];
    rows: any[];
    ddl: string;
  }> {
    const res = await fetch(`/api/db/table/${tableName}`);
    return res.json();
  },
  async addTableRow(tableName: string, data: any): Promise<{ success: boolean; row: any }> {
    const res = await fetch(`/api/db/table/${tableName}/row`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTableRow(tableName: string, rowId: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/db/table/${tableName}/row/${rowId}`, { method: 'DELETE' });
    return res.json();
  },
  async updateTableRow(tableName: string, rowId: number, data: any): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/db/table/${tableName}/row/${rowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async syncTable(tableName: string): Promise<{ success: boolean; rowCount: number; message: string; syncedRemotely?: boolean; remoteError?: string }> {
    const res = await fetch(`/api/db/table/${tableName}/sync`, { method: 'POST' });
    return res.json();
  },

  // Convenience Aliases & Bootstrap
  async getBootstrap(): Promise<{ success: boolean; data: any }> {
    try {
      // Fast path: fetch all bootstrap data in a single request to avoid rate-limiting burst
      try {
        const bootRes = await fetch('/api/bootstrap');
        if (bootRes.ok) {
          const bootJson = await bootRes.json();
          if (bootJson && bootJson.success && bootJson.data) {
            return bootJson;
          }
        }
      } catch {
        // Silently proceed to fallback
      }

      const [
        company,
        companiesData,
        usersData,
        employees,
        divisions,
        jobGrades,
        schedules,
        schedulePlots,
        holidays,
        attendanceLogs,
        leaveRequests,
        overtimeRequests,
        overtimeRules,
        deductionRules,
        allowanceRules,
        payrollSlips,
        dbConfig,
      ] = await Promise.all([
        api.getCompanyProfile().catch(() => null),
        api.getCompanies().catch(() => ({ companies: [], activeCompanyId: 1, activeCompany: null })),
        api.getUsers().catch(() => ({ users: [] })),
        api.getEmployees().catch(() => []),
        api.getDivisions().catch(() => []),
        api.getJobGrades().catch(() => []),
        api.getSchedules().catch(() => []),
        api.getSchedulePlots().catch(() => []),
        api.getHolidays().catch(() => []),
        api.getAttendanceLogs().catch(() => []),
        api.getLeaveRequests().catch(() => []),
        api.getOvertimeRequests().catch(() => []),
        api.getOvertimeRules().catch(() => []),
        api.getDeductionRules().catch(() => []),
        api.getAllowanceRules().catch(() => []),
        api.getPayrollSlips().catch(() => []),
        api.getDbConfig().catch(() => null),
      ]);

      const users = usersData?.users || [];
      const currentUser = users.find((u: User) => u.role_key === 'super_admin') || users[0];
      const activeComp = companiesData?.activeCompany || company || companiesData?.companies?.[0];
      const companies = companiesData?.companies && companiesData.companies.length > 0
        ? companiesData.companies
        : activeComp ? [activeComp] : [];

      return {
        success: true,
        data: {
          company: activeComp,
          companies,
          activeCompanyId: companiesData?.activeCompanyId || activeComp?.id || 1,
          currentUser,
          users,
          employees,
          divisions,
          jobGrades,
          schedules,
          schedulePlots,
          holidays,
          attendanceLogs,
          leaveRequests,
          overtimeRequests,
          overtimeRules,
          deductionRules,
          allowanceRules,
          payrollSlips,
          dbConfig,
        },
      };
    } catch (err: any) {
      return { success: false, data: {} };
    }
  },

  createEmployee: async (data: Partial<Employee>) => {
    const res = await api.addEmployee(data);
    return { success: res.success, data: res.employee };
  },
  createDivision: async (data: Partial<Division>) => {
    const res = await api.addDivision(data);
    return { success: res.success, data: res.division };
  },
  createJobGrade: async (data: Partial<JobGrade>) => {
    const res = await api.addJobGrade(data);
    return { success: res.success, data: res.jobGrade };
  },
  createSchedule: async (data: Partial<WorkSchedule>) => {
    const res = await api.addSchedule(data);
    return { success: res.success, data: res.schedule };
  },
  createSchedulePlot: async (data: Partial<SchedulePlot>) => {
    const res = await api.addSchedulePlot(data);
    return { success: res.success, data: res.plot };
  },
  createLeaveRequest: async (data: Partial<LeaveRequest>) => {
    const res = await api.addLeaveRequest(data);
    return { success: res.success, data: res.request };
  },
  createOvertimeRequest: async (data: any) => {
    const res = await api.addOvertimeRequest(data);
    return { success: res.success, data: res.request, requests: res.requests };
  },
  createOvertimeRule: async (data: Partial<OvertimeRule>) => {
    const res = await api.addOvertimeRule(data);
    return { success: res.success, data: res.rule || data };
  },
  createDeductionRule: async (data: Partial<DeductionRule>) => {
    const res = await api.addDeductionRule(data);
    return { success: res.success, data: res.rule || data };
  },
  createAllowanceRule: async (data: Partial<AllowanceRule>) => {
    const res = await api.addAllowanceRule(data);
    return { success: res.success, data: res.rule || data };
  },
  createHoliday: async (data: Partial<CompanyHoliday>) => {
    const res = await api.addHoliday(data);
    return { success: res.success, data: res.holiday };
  },
  createAttendanceLog: async (data: {
    employee_id: number;
    location_id?: number | null;
    log_date: string;
    scan_time: string;
    log_type: 'in' | 'out';
    method?: string;
    device_id?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_address?: string | null;
    is_mock_location?: boolean;
    status?: string;
    notes?: string;
  }) => {
    const res = await api.addAttendanceLog(data);
    return { success: res.success, data: res.log || data, error: res.error, message: res.message };
  },
  recordAttendance: async (data: {
    employee_id: number;
    log_type: 'clock_in' | 'clock_out';
    method: 'rfid' | 'qr' | 'manual' | 'nip_manual';
    notes?: string;
    log_date?: string;
    scan_time?: string;
    force_early_clock_in?: boolean;
    early_clock_in_reason?: string;
  }) => {
    const res = await api.scanAttendance({
      identifier: String(data.employee_id),
      log_type: data.log_type === 'clock_in' ? 'in' : 'out',
      method: data.method === 'manual' ? 'nip_manual' : data.method,
      log_date: data.log_date,
      scan_time: data.scan_time,
      force_early_clock_in: data.force_early_clock_in,
      early_clock_in_reason: data.early_clock_in_reason,
    });
    return { success: res.success, data: res.scan, error: res.error, message: res.message, requires_early_confirmation: res.requires_early_confirmation, time_now: res.time_now };
  },
  generatePayrollSlip: async (data: any) => {
    const res = await fetch('/api/payroll/slips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return { success: true, data: json.slip || data };
  },
  saveDatabaseConfig: async (data: Partial<DbConfig>) => {
    const res = await api.saveDbConfig(data);
    return { success: res.success, data: res.dbConfig };
  },
  testDatabaseConnection: async (data: Partial<DbConfig>) => {
    return await api.testDbConnection(data);
  },
  initDatabaseSchema: async () => {
    return await api.runDbSeeder();
  },
  getTableData: async (tableName: string) => {
    return await api.getTableDetail(tableName);
  },
};
