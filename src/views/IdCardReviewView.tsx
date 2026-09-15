import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Download,
  Building2,
  BadgeCheck,
} from 'lucide-react';
import { Employee, CompanyProfile } from '../types';
import { getCompanyInitials, getContrastTextColorStyle } from '../lib/companyUtils';
import { formatDateDDMMYYYY, formatPhoneNumber } from '../lib/formatUtils';

interface IdCardReviewViewProps {
  employees: Employee[];
  companyProfile?: CompanyProfile | null;
}

export const IdCardReviewView: React.FC<IdCardReviewViewProps> = ({
  employees,
  companyProfile,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<number>(
    employees.length > 0 ? employees[0].id : 0
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'nip_asc' | 'nip_desc'>('name_asc');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  const companyName = companyProfile?.company_name || 'PT. NINDYA KRIDA UTAMA';
  const accentColor = companyProfile?.color_palette || '#F59E0B';

  // Sort employees (Default Alphabet Ascending A-Z)
  const sortedEmployees = React.useMemo(() => {
    const list = [...employees];
    return list.sort((a, b) => {
      if (sortOrder === 'name_asc') return a.full_name.localeCompare(b.full_name);
      if (sortOrder === 'name_desc') return b.full_name.localeCompare(a.full_name);
      if (sortOrder === 'nip_asc') return (a.nip || '').localeCompare(b.nip || '');
      if (sortOrder === 'nip_desc') return (b.nip || '').localeCompare(a.nip || '');
      return a.full_name.localeCompare(b.full_name);
    });
  }, [employees, sortOrder]);

  // Filter employees for search
  const filteredEmployees = sortedEmployees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.division_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmployee =
    sortedEmployees.find((emp) => emp.id === selectedEmpId) || sortedEmployees[0] || null;

  // Auto-generate QR code from NIP whenever selected employee changes
  useEffect(() => {
    if (!selectedEmployee) return;
    const codeToEncode = selectedEmployee.nip || 'NKU-0001';
    QRCode.toDataURL(codeToEncode, {
      width: 260,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [selectedEmployee]);

  // Keep selectedEmpId valid when employees list updates
  useEffect(() => {
    if (employees.length > 0 && !employees.some((e) => e.id === selectedEmpId)) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees]);

  const handlePrint = () => {
    const cardEl = cardRef.current;
    if (!cardEl || !selectedEmployee) return;

    // Try popup window first
    const printWin = window.open('', '_blank', 'width=420,height=650');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak ID Card - ${selectedEmployee.full_name} (${selectedEmployee.nip})</title>
            <style>
              @page {
                size: 80mm 120mm portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 15px;
                background-color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-card-wrapper {
                width: 75mm;
                box-sizing: border-box;
              }
              ${Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map((el) => el.outerHTML)
                .join('\n')}
            </style>
          </head>
          <body>
            <div class="print-card-wrapper">
              ${cardEl.outerHTML}
            </div>
            <script>
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 400);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      // Fallback Method 2: Inject printable DOM element
      const existingPrintArea = document.getElementById('nku-print-area');
      if (existingPrintArea) existingPrintArea.remove();

      const printArea = document.createElement('div');
      printArea.id = 'nku-print-area';
      printArea.className = 'fixed inset-0 z-[9999] bg-white flex items-center justify-center p-4';
      printArea.innerHTML = `
        <style>
          @media print {
            body > *:not(#nku-print-area) { display: none !important; }
            #nku-print-area { display: flex !important; position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; }
          }
        </style>
        <div style="width: 320px;">
          ${cardEl.outerHTML}
        </div>
      `;
      document.body.appendChild(printArea);
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          printArea.remove();
        }, 1000);
      }, 200);
    }
  };

  const handlePrev = () => {
    const list = filteredEmployees.length > 0 ? filteredEmployees : employees;
    const currentIndex = list.findIndex((e) => e.id === selectedEmpId);
    if (currentIndex > 0) {
      setSelectedEmpId(list[currentIndex - 1].id);
    } else {
      setSelectedEmpId(list[list.length - 1].id);
    }
  };

  const handleNext = () => {
    const list = filteredEmployees.length > 0 ? filteredEmployees : employees;
    const currentIndex = list.findIndex((e) => e.id === selectedEmpId);
    if (currentIndex < list.length - 1) {
      setSelectedEmpId(list[currentIndex + 1].id);
    } else {
      setSelectedEmpId(list[0].id);
    }
  };

  const avatarUrl =
    selectedEmployee?.avatar_url ||
    selectedEmployee?.photo_url ||
    '';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="p-6 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl shrink-0"
            style={{
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
              color: accentColor,
            }}
          >
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Page Review & Cetak ID Card
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Tinjau kartu tanda pengenal karyawan dengan standar QR Code auto-generated NIP.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Combobox Selection, Print Button & Quick Search */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-bold uppercase tracking-wider"
                  style={{ color: accentColor }}
                >
                  Pilih Nama Karyawan (Combobox)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold">Urutan:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-[#18181b] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#27272a] rounded-lg focus:outline-hidden cursor-pointer"
                  >
                    <option value="name_asc">Nama (A - Z) [Default]</option>
                    <option value="name_desc">Nama (Z - A)</option>
                    <option value="nip_asc">NIP (0 - 9)</option>
                    <option value="nip_desc">NIP (9 - 0)</option>
                  </select>
                </div>
              </div>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white border border-slate-200 dark:border-[#27272a] rounded-2xl focus:outline-hidden cursor-pointer shadow-inner"
              >
                {sortedEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} — {emp.nip} ({emp.division_name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Cetak ID Card tepat di bawah Combobox */}
            <button
              onClick={handlePrint}
              disabled={!selectedEmployee}
              className="w-full py-3 px-4 rounded-2xl active:scale-[0.98] disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
              style={{
                backgroundColor: accentColor,
                color: getContrastTextColorStyle(accentColor),
                boxShadow: `0 8px 20px -4px ${accentColor}40`,
              }}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu ID (PDF / Print)</span>
            </button>

            {/* Quick Search */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Filter Pencarian Cepat:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-300" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari NIP, Nama, Divisi..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Employee Quick List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-300">
                  Tidak ada karyawan yang cocok
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = emp.id === selectedEmpId;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'text-white'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27272a]'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${accentColor}20`,
                              borderColor: accentColor,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-[#27272a] border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {emp.avatar_url || emp.photo_url ? (
                            <img
                              src={emp.avatar_url || emp.photo_url}
                              alt={emp.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-slate-900 dark:text-white">{emp.full_name}</div>
                          <div className="text-[10px] font-mono" style={{ color: accentColor }}>
                            {emp.nip} &bull; {emp.division_name || 'Staff'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 shrink-0 transition-transform text-slate-400"
                        style={{ color: isSelected ? accentColor : undefined }}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: High Fidelity ID Card Badge Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4 p-6 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] relative shadow-sm">
          {/* Card Navigation Controls */}
          <div className="flex items-center justify-between w-full max-w-sm mb-2">
            <button
              onClick={handlePrev}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1 transition-colors border border-slate-200 dark:border-[#27272a]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              {selectedEmployee ? selectedEmployee.nip : '-'}
            </span>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1 transition-colors border border-slate-200 dark:border-[#27272a]"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedEmployee ? (
            <div
              ref={cardRef}
              id="nku-employee-id-card-review"
              className="w-[300px] sm:w-[320px] rounded-3xl bg-gradient-to-b from-[#14234b] via-[#0f1a38] to-[#0a1024] border border-blue-500/40 shadow-2xl p-5 relative text-white select-none overflow-hidden flex flex-col justify-between"
              style={{
                minHeight: '430px',
                boxShadow: '0 20px 50px -10px rgba(245, 158, 11, 0.2)',
              }}
            >
              {/* Ambient Badge Glow Highlights */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Lanyard Slot Cutout */}
              <div className="w-14 h-2.5 rounded-full bg-[#060913] border border-blue-800/80 mx-auto mb-3 shadow-inner" />

              {/* Card Header: Perfectly Centered Company Name without logo (Request 2) */}
              <div className="flex items-center justify-center mb-2 w-full text-center">
                <div className="font-company text-[13px] sm:text-[14px] font-black tracking-wider text-white uppercase leading-tight text-center">
                  {companyName}
                </div>
              </div>

              {/* Employee Portrait Photo */}
              <div className="relative mx-auto my-1.5">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-2 border-amber-400/80 p-0.5 bg-gradient-to-b from-amber-400/20 to-transparent shadow-lg overflow-hidden flex items-center justify-center bg-slate-900">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={selectedEmployee.full_name}
                      className="w-full h-full object-cover rounded-xl"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Employee Names & Designation */}
              <div className="text-center my-1">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight leading-tight line-clamp-1">
                  {selectedEmployee.full_name}
                </h3>
                <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                  {selectedEmployee.division_name || companyName}
                </div>
              </div>

              {/* Prominent Large QR Code Section */}
              <div className="my-2 py-2 px-3 bg-[#080d1a]/80 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="p-2 rounded-2xl bg-white shadow-xl border-2 border-amber-400/80 my-1">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${selectedEmployee.nip}`}
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 animate-pulse rounded-lg" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <div className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase">
                    NOMOR INDUK PEGAWAI (NIP)
                  </div>
                  <div className="text-base font-mono font-black text-amber-400 tracking-wider">
                    {selectedEmployee.nip}
                  </div>
                  <div className="text-[10px] font-mono text-slate-300 mt-0.5">
                    Bergabung: {formatDateDDMMYYYY(selectedEmployee.join_date)}
                  </div>
                </div>
              </div>

              {/* Card Bottom Tag */}
              <div className="mt-2 pt-1 text-center border-t border-blue-900/40">
                <div className="text-[8px] font-mono text-blue-300/70 tracking-wider">
                  {companyName}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-300">
              Pilih karyawan untuk menampilkan ID Card
            </div>
          )}

          {/* Details Bar below card */}
          {selectedEmployee && (
            <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-200">
                <span className="text-slate-300">Nomor Telepon:</span>
                <span className="font-mono font-bold text-white">
                  {formatPhoneNumber(selectedEmployee.phone)}
                </span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span className="text-slate-300">Email Resmi:</span>
                <span className="font-mono text-white">{selectedEmployee.email || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span className="text-slate-300">Jabatan / Golongan:</span>
                <span className="font-bold text-amber-400">
                  {selectedEmployee.job_grade_name || 'Staff'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
