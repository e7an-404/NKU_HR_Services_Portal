import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, CheckCircle2, Printer, Sparkles, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Employee } from '../types';
import { getCompanyInitials } from '../lib/companyUtils';
import { formatDateDDMMYYYY } from '../lib/formatUtils';

interface EmployeeIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  allEmployees?: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
  companyName?: string;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  isOpen,
  onClose,
  employee,
  allEmployees = [],
  onSelectEmployee,
  companyName = 'PT. NINDYA KRIDA UTAMA',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!employee) return;
    // Always auto-generate QR code directly from NIP
    const codeToEncode = employee.nip || 'NKU-0001';
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
      .catch((err) => console.error('Error generating QR code:', err));
  }, [employee]);

  // Handle ESC key to close modal (Request 3)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    // Try popup window first
    const printWin = window.open('', '_blank', 'width=420,height=650');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Kartu Tanda Pengenal - ${employee.full_name} (${employee.nip})</title>
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
      // Fallback Method 2: Inject printable DOM element and trigger window.print()
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

  // Avatar fallback based on name or avatar url
  const avatarUrl =
    employee.avatar_url ||
    employee.photo_url ||
    '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-md bg-[#0D1527] border border-blue-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Kartu Tanda Pengenal (ID Card)
              </h2>
              <p className="text-[11px] text-slate-400">
                {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-blue-950/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Combobox Switcher */}
        {allEmployees.length > 0 && onSelectEmployee && (
          <div className="px-6 py-3 bg-[#090e1c] border-b border-blue-900/40 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pilih Karyawan (Combobox):</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {allEmployees.findIndex((emp) => emp.id === employee.id) + 1} dari {allEmployees.length}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={employee.id}
                onChange={(e) => {
                  const found = allEmployees.find((emp) => emp.id === Number(e.target.value));
                  if (found) onSelectEmployee(found);
                }}
                className="w-full text-xs font-semibold bg-[#121b33] text-white border border-blue-800/80 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nip} — {emp.full_name} ({emp.division_name || 'Staff'})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = allEmployees.findIndex((emp) => emp.id === employee.id);
                    if (currentIndex > 0) {
                      onSelectEmployee(allEmployees[currentIndex - 1]);
                    } else {
                      onSelectEmployee(allEmployees[allEmployees.length - 1]);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#121b33] text-slate-300 hover:text-white hover:bg-blue-900/50 transition-colors border border-blue-800/80"
                  title="Karyawan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = allEmployees.findIndex((emp) => emp.id === employee.id);
                    if (currentIndex < allEmployees.length - 1) {
                      onSelectEmployee(allEmployees[currentIndex + 1]);
                    } else {
                      onSelectEmployee(allEmployees[0]);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#121b33] text-slate-300 hover:text-white hover:bg-blue-900/50 transition-colors border border-blue-800/80"
                  title="Karyawan Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: The Clean ID Card Badge */}
        <div className="p-6 flex justify-center items-center bg-[#090E1C]/60">
          <div
            ref={cardRef}
            id="nku-employee-id-card"
            className="w-[300px] sm:w-[320px] rounded-3xl bg-gradient-to-b from-[#14234b] via-[#0f1a38] to-[#0a1024] border border-blue-500/40 shadow-2xl p-5 relative text-white select-none overflow-hidden flex flex-col justify-between"
            style={{
              minHeight: '430px',
              boxShadow: '0 20px 40px -15px rgba(0, 50, 150, 0.5)',
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
                    alt={employee.full_name}
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
                {employee.full_name}
              </h3>
              <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                {employee.division_name || companyName}
              </div>
            </div>

            {/* Prominent Large QR Code Section */}
            <div className="my-2 py-2 px-3 bg-[#080d1a]/80 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="p-2 rounded-2xl bg-white shadow-xl border-2 border-amber-400/80 my-1">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${employee.nip}`}
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
                  {employee.nip}
                </div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">
                  Bergabung: {formatDateDDMMYYYY(employee.join_date)}
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
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#0A1020] border-t border-blue-900/40">
          <div className="flex items-center gap-2 text-sky-400 text-xs">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
            <span className="text-[11px] text-slate-300">
              Discan di Terminal Kiosk Presensi NIP/QR
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-blue-900/40 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu ID</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

