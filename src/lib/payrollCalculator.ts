import { AttendanceLog, OvertimeRequest, Employee, WorkSchedule, SchedulePlot, OvertimeTierSlot } from '../types';

export interface DailyWorkCalculation {
  date: string;
  inTime?: string;
  outTime?: string;
  rawElapsedHours: number | null;
  scheduledShiftHours: number; // Durasi jam kerja shift sesuai plot jadwal HR
  scheduleName: string; // Nama shift yang diplotkan
  regularHours: number; // Maksimal jam shift sesuai plot jika tidak ada form lembur (SPKL) yang disetujui
  overtimeHours: number; // 0 jika tidak ada form SPKL lembur yang disetujui
  hasApprovedOtForm: boolean;
  otReason?: string;
  notes: string;
}

export interface EmployeePayrollPeriodSummary {
  employeeId: number;
  totalWorkedDays: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  baseRatePerHour: number;
  earnedBasePay: number; // totalRegularHours * baseRatePerHour
  earnedOvertimePay: number;
  dailyBreakdown: DailyWorkCalculation[];
  explanation: string;
}

/**
 * Helper to determine the specific shift schedule plotted for an employee on a given date.
 * Hierarchy:
 * 1. Employee-specific plot
 * 2. Division plot
 * 3. Job grade plot (filtered by schedule target division)
 * 4. General plot (filtered by schedule target division)
 * 5. Target division on template
 * 6. Default schedule
 */
export function isEmployeeMatchingScheduleDivision(
  employee: Employee | { division_id?: number; division_name?: string },
  targetDivisionText?: string
): boolean {
  if (!targetDivisionText) return true;
  const target = targetDivisionText.trim().toLowerCase();
  if (
    !target ||
    target.includes('semua divisi') ||
    target.includes('umum') ||
    target === 'all'
  ) {
    return true;
  }
  if (!employee.division_name) return false;
  const empDiv = employee.division_name.trim().toLowerCase();
  const allowed = target.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowed.some((a) => empDiv.includes(a) || a.includes(empDiv));
}

export function getPlottedScheduleForEmployee(
  employee: Employee,
  date: string,
  schedules?: WorkSchedule[],
  schedulePlots?: SchedulePlot[]
): WorkSchedule | null {
  if (!schedules || schedules.length === 0) return null;

  if (schedulePlots && schedulePlots.length > 0) {
    // 1. Employee specific (highest priority)
    const empPlot = schedulePlots.find(
      (p) => p.scope_type === 'employee' && Number(p.scope_id) === Number(employee.id) && date >= p.date_start && date <= p.date_end
    );
    if (empPlot) {
      const match = schedules.find((s) => Number(s.id) === Number(empPlot.schedule_id));
      if (match) return match;
    }

    // 2. Division specific
    if (employee.division_id) {
      const divPlot = schedulePlots.find(
        (p) => p.scope_type === 'division' && Number(p.scope_id) === Number(employee.division_id) && date >= p.date_start && date <= p.date_end
      );
      if (divPlot) {
        const match = schedules.find((s) => Number(s.id) === Number(divPlot.schedule_id));
        if (match) return match;
      }
    }

    // 3. Job grade specific (Must also respect schedule template target division if configured)
    if (employee.job_grade_id) {
      const gradePlot = schedulePlots.find((p) => {
        if (p.scope_type !== 'job_grade' || Number(p.scope_id) !== Number(employee.job_grade_id)) return false;
        if (date < p.date_start || date > p.date_end) return false;
        const targetSched = schedules.find((s) => Number(s.id) === Number(p.schedule_id));
        return isEmployeeMatchingScheduleDivision(employee, targetSched?.target_division);
      });
      if (gradePlot) {
        const match = schedules.find((s) => Number(s.id) === Number(gradePlot.schedule_id));
        if (match) return match;
      }
    }

    // 4. General plot (Must also respect schedule template target division if configured)
    const genPlot = schedulePlots.find((p) => {
      if (p.scope_type !== 'general') return false;
      if (date < p.date_start || date > p.date_end) return false;
      const targetSched = schedules.find((s) => Number(s.id) === Number(p.schedule_id));
      return isEmployeeMatchingScheduleDivision(employee, targetSched?.target_division);
    });
    if (genPlot) {
      const match = schedules.find((s) => Number(s.id) === Number(genPlot.schedule_id));
      if (match) return match;
    }
  }

  // Fallback to active schedule matching employee's division or default first active schedule
  const divMatch = schedules.find(
    (s) => s.is_active && isEmployeeMatchingScheduleDivision(employee, s.target_division)
  );
  if (divMatch) return divMatch;

  return schedules.find((s) => s.is_active) || schedules[0] || null;
}

/**
 * Calculates shift duration in hours from a WorkSchedule (accounting for break time if specified).
 */
export function getScheduleShiftHours(schedule: WorkSchedule | null): number {
  if (!schedule) return 8.0;
  try {
    const timeIn = schedule.time_in || '08:00:00';
    const timeOut = schedule.time_out || '17:00:00';
    const [inH, inM] = timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    let totalMinutes = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Overnight shift

    // Subtract break time if configured
    if (schedule.break_start && schedule.break_end) {
      const [bStartH, bStartM] = schedule.break_start.split(':').map(Number);
      const [bEndH, bEndM] = schedule.break_end.split(':').map(Number);
      let breakMinutes = (bEndH * 60 + (bEndM || 0)) - (bStartH * 60 + (bStartM || 0));
      if (breakMinutes < 0) breakMinutes += 24 * 60;
      totalMinutes -= breakMinutes;
    }

    const calculatedHours = Math.round((totalMinutes / 60) * 10) / 10;
    return calculatedHours > 0 ? calculatedHours : 8.0;
  } catch {
    return 8.0;
  }
}

/**
 * Calculates work hours and overtime strictly enforcing the business rule:
 * "Clock-out jam berapapun jika tidak ada form lembur terhadap karyawan terkait,
 * maka tidak dikalikan. Jadi upah/jam * jam plot jadwal yang sudah di-registerkan HR."
 */
export function calculateEmployeeWorkHours(
  employee: Employee,
  attendanceLogs: AttendanceLog[],
  overtimeRequests: OvertimeRequest[],
  periodStart: string,
  periodEnd: string,
  otMultiplier: number = 1.5,
  schedules?: WorkSchedule[],
  schedulePlots?: SchedulePlot[],
  tierSlots?: OvertimeTierSlot[]
): EmployeePayrollPeriodSummary {
  const baseRate = Number(employee.base_salary) || 25000;

  // Filter logs for this employee in the period
  const empLogs = attendanceLogs.filter(
    (l) =>
      Number(l.employee_id) === Number(employee.id) &&
      l.log_date >= periodStart &&
      l.log_date <= periodEnd
  );

  // Filter approved overtimes for this employee in the period
  const empApprovedOvertimes = overtimeRequests.filter(
    (o) =>
      Number(o.employee_id) === Number(employee.id) &&
      o.status === 'approved' &&
      o.overtime_date >= periodStart &&
      o.overtime_date <= periodEnd
  );

  // Group logs by date
  const logsByDate = new Map<string, AttendanceLog[]>();
  empLogs.forEach((log) => {
    const d = log.log_date;
    if (!logsByDate.has(d)) {
      logsByDate.set(d, []);
    }
    logsByDate.get(d)!.push(log);
  });

  // Also include dates that only have approved overtime (e.g. weekend or holiday work)
  empApprovedOvertimes.forEach((ot) => {
    if (!logsByDate.has(ot.overtime_date)) {
      logsByDate.set(ot.overtime_date, []);
    }
  });

  const dailyBreakdown: DailyWorkCalculation[] = [];
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;

  const sortedDates = Array.from(logsByDate.keys()).sort();

  for (const date of sortedDates) {
    const dayLogs = logsByDate.get(date) || [];
    const approvedOt = empApprovedOvertimes.find((ot) => ot.overtime_date === date);

    const inLog = dayLogs.find((l) => l.log_type === 'in') || dayLogs[0];
    const outLog = dayLogs.find((l) => l.log_type === 'out');

    // Determine the scheduled plot for this employee on this date
    const plottedSchedule = getPlottedScheduleForEmployee(employee, date, schedules, schedulePlots);
    const scheduledHours = getScheduleShiftHours(plottedSchedule);
    const scheduleName = plottedSchedule?.schedule_name || 'Shift Standar';

    let rawElapsedHours: number | null = null;
    if (inLog?.scan_time && outLog?.scan_time) {
      try {
        const inTime = new Date(inLog.scan_time.replace(' ', 'T')).getTime();
        const outTime = new Date(outLog.scan_time.replace(' ', 'T')).getTime();
        if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
          const diffMs = outTime - inTime;
          rawElapsedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        }
      } catch {
        rawElapsedHours = null;
      }
    }

    let regularHours = scheduledHours;
    let overtimeHours = 0;
    let notes = '';

    if (dayLogs.length > 0) {
      if (rawElapsedHours !== null) {
        if (rawElapsedHours < scheduledHours) {
          // Worked less than the scheduled shift
          regularHours = Math.max(1, rawElapsedHours);
          notes = `Hadir ${rawElapsedHours} jam (kurang dari plot jadwal ${scheduleName}: ${scheduledHours} jam)`;
        } else {
          // Worked equal to or more than scheduled shift
          if (approvedOt) {
            regularHours = scheduledHours;
            overtimeHours = Number(approvedOt.total_hours) || Math.max(0, Math.round((rawElapsedHours - scheduledHours) * 10) / 10);
            notes = `Hadir ${rawElapsedHours} jam (${scheduledHours} jam reguler [${scheduleName}] + ${overtimeHours} jam lembur SPKL disetujui)`;
          } else {
            // STRICT RULE: Clock-out jam berapapun tanpa form lembur tidak dikalikan, tetap sesuai plot jadwal HR!
            regularHours = scheduledHours;
            overtimeHours = 0;
            const clockOutText = outLog?.scan_time ? outLog.scan_time.slice(11, 16) : '-';
            notes = `Clock-out jam ${clockOutText}: tanpa form SPKL lembur disetujui, jam kerja dibatasi sesuai plot jadwal HR (${scheduleName}: ${scheduledHours} jam) (upah/jam * ${scheduledHours})`;
          }
        }
      } else {
        // Only clock-in log available or no clock-out recorded yet
        if (approvedOt) {
          regularHours = scheduledHours;
          overtimeHours = Number(approvedOt.total_hours) || 0;
          notes = `Presensi tercatat (${scheduleName}: ${scheduledHours} jam) + SPKL lembur disetujui (${overtimeHours} jam)`;
        } else {
          regularHours = scheduledHours;
          overtimeHours = 0;
          notes = `Presensi tercatat sesuai plot jadwal HR (${scheduleName}: ${scheduledHours} jam kerja reguler)`;
        }
      }
    } else if (approvedOt) {
      // Overtime on weekend/holiday without regular clock-in
      regularHours = 0;
      overtimeHours = Number(approvedOt.total_hours) || 0;
      notes = `Penugasan lembur SPKL akhir pekan / hari libur (${overtimeHours} jam)`;
    }

    totalRegularHours += regularHours;
    totalOvertimeHours += overtimeHours;

    dailyBreakdown.push({
      date,
      inTime: inLog?.scan_time,
      outTime: outLog?.scan_time,
      rawElapsedHours,
      scheduledShiftHours: scheduledHours,
      scheduleName,
      regularHours,
      overtimeHours,
      hasApprovedOtForm: !!approvedOt,
      otReason: approvedOt?.reason,
      notes,
    });
  }

  // Calculate actual earned amounts directly from logged work & approved overtimes in this period
  const earnedBasePay = Math.round(totalRegularHours * baseRate);
  let earnedOvertimePay = 0;
  if (empApprovedOvertimes.length > 0) {
    earnedOvertimePay = empApprovedOvertimes.reduce((sum, ot) => {
      const res = calculateMultiTierOvertime(ot, baseRate, Number(employee.daily_salary) || 0, tierSlots);
      return sum + res.totalAmount;
    }, 0);
  } else {
    earnedOvertimePay = Math.round(totalOvertimeHours * baseRate * otMultiplier);
  }

  return {
    employeeId: employee.id,
    totalWorkedDays: sortedDates.length,
    totalRegularHours: Math.round(totalRegularHours * 10) / 10,
    totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
    baseRatePerHour: baseRate,
    earnedBasePay,
    earnedOvertimePay,
    dailyBreakdown,
    explanation:
      'Sistem menghitung upah dasar proporsional sesuai plot jadwal kerja yang diregisterkan HR. Clock-out jam berapapun tanpa form lembur (SPKL) yang disetujui tidak akan dikalikan atau dihitung lembur (tetap upah/jam * durasi plot jadwal).',
  };
}

export interface MultiTierOvertimeResult {
  totalAmount: number;
  s1Hours: number;
  s2Hours: number;
  s3Hours: number;
  otherHours: number;
  breakdownText: string;
}

export function calculateMultiTierOvertime(
  ot: { time_start?: string; time_end?: string; total_hours?: number },
  baseSalary: number,
  dailySalaryInput?: number,
  customTierSlots?: OvertimeTierSlot[]
): MultiTierOvertimeResult {
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

  const activeSlots: OvertimeTierSlot[] = (customTierSlots && customTierSlots.length > 0)
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

  activeSlots.forEach((slot, idx) => {
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
        slotAmount = slot.rate_value;
      } else if (slot.rate_type === 'daily_multiplier') {
        slotAmount = (overlapHours / (slotTotalHours || 1)) * (slot.rate_value * dailySalary);
      } else if (slot.rate_type === 'hourly_multiplier') {
        slotAmount = overlapHours * baseSalary * slot.rate_value;
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
