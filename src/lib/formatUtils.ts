/**
 * Formatting utilities for NKU HR Services Portal
 */

/**
 * Format date to dd-MM-yyyy (e.g. 04-09-2026)
 */
export function formatDateDDMMYYYY(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string') {
      const cleanStr = dateStr.trim();
      // Extract pure date part by stripping time separated by 'T' or space ' '
      const datePart = cleanStr.includes('T')
        ? cleanStr.split('T')[0]
        : cleanStr.includes(' ')
        ? cleanStr.split(' ')[0]
        : cleanStr;

      if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD -> DD-MM-YYYY
            return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
          } else if (parts[2].length === 4) {
            // Already DD-MM-YYYY
            return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
          }
        }
      }
      if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
          } else if (parts[2].length === 4) {
            return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
          }
        }
      }
    }
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Format datetime to dd-MM-yyyy HH:mm
 */
export function formatDateTimeDDMMYYYY(dtStr?: string | Date | null): string {
  if (!dtStr) return '-';
  const datePart = formatDateDDMMYYYY(dtStr);
  const timePart = formatTimeHHMM(dtStr);
  if (datePart === '-' && timePart === '-') return '-';
  if (timePart === '-' || timePart === '00:00') return datePart;
  return `${datePart} ${timePart}`;
}

/**
 * Format time to HH:mm (e.g. 08:30)
 */
export function formatTimeHHMM(timeStr?: string | Date | null): string {
  if (!timeStr) return '-';
  if (typeof timeStr === 'string') {
    const cleanStr = timeStr.trim();
    let rawTime = cleanStr;
    if (cleanStr.includes('T')) {
      rawTime = cleanStr.split('T')[1];
    } else if (cleanStr.includes(' ') && cleanStr.includes('-')) {
      rawTime = cleanStr.split(' ')[1];
    }
    if (rawTime && rawTime.includes(':')) {
      const parts = rawTime.split(':');
      if (parts.length >= 2) {
        const hh = parts[0].replace(/\D/g, '').padStart(2, '0');
        const mm = parts[1].replace(/\D/g, '').padStart(2, '0');
        if (hh.length === 2 && mm.length === 2) {
          return `${hh}:${mm}`;
        }
      }
    }
  }
  try {
    const d = typeof timeStr === 'string' ? new Date(timeStr) : timeStr;
    if (isNaN(d.getTime())) return String(timeStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return String(timeStr);
  }
}

/**
 * Format number with Indonesian thousand separators (e.g. 25.000, 5.000.000)
 */
export function formatThousandNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('id-ID');
}

/**
 * Parse thousand-separated string back to number
 */
export function parseThousandNumber(formattedStr: string): number {
  if (!formattedStr) return 0;
  const cleanDigits = String(formattedStr).replace(/\D/g, '');
  return Number(cleanDigits) || 0;
}

/**
 * Format phone numbers into xxxx-xxxx-xxxx format (e.g., 0812-3456-789 or 0812-3456-7890)
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;
  
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 13) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length > 4) {
    return digits.match(/.{1,4}/g)?.join('-') || digits;
  }
  return digits;
}

/**
 * Format currency to Rupiah string
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
