import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  Trash2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  Clock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { getAccessibleAccentColor } from '../lib/companyUtils';
import { api } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiAssistantViewProps {
  company: CompanyProfile;
  accentColor: string;
  isDarkMode?: boolean;
  onNavigate?: (tabId: any) => void;
}

// Custom Markdown renderer component to support lists, bold text, beautiful tables, and interactive shortcut buttons
const MarkdownFormatter: React.FC<{ 
  text: string; 
  isAi?: boolean; 
  onNavigate?: (tabId: any) => void;
  accessibleColor?: string;
}> = ({ text, isAi = true, onNavigate, accessibleColor }) => {
  if (!text) return null;

  // Split text into lines to process lists, headers, code blocks, tables, and shortcuts
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let codeBlock = false;
  let codeLines: string[] = [];

  const textClass = isAi 
    ? "text-xs text-slate-900 dark:text-slate-100 leading-relaxed my-1 font-medium"
    : "text-xs text-white leading-relaxed my-1 font-medium";

  const listContainerClass = "flex items-start gap-2.5 my-1.5 ml-2 text-xs " + (isAi ? "text-slate-900 dark:text-slate-100 font-medium" : "text-white font-medium");

  const bulletClass = isAi ? "text-amber-500 font-bold shrink-0 mt-0.5" : "text-white/90 font-bold shrink-0 mt-0.5";
  const numberClass = isAi ? "text-indigo-500 font-bold shrink-0" : "text-white/90 font-bold shrink-0";

  const flushTable = (key: number) => {
    if (!currentTable) return null;
    const table = currentTable;
    currentTable = null;
    return (
      <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-md max-w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              {table.headers.map((h, i) => (
                <th key={i} className="px-4 py-3.5 font-extrabold whitespace-nowrap">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors odd:bg-white dark:odd:bg-[#121212]/40">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 text-slate-900 dark:text-slate-100 font-semibold">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const parseInlineStyles = (lineStr: string) => {
    // Basic bold parsing: **text**
    const parts = lineStr.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className={isAi ? "font-black text-slate-950 dark:text-white" : "font-black text-white underline"}>
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block Toggle
    if (line.startsWith('```')) {
      if (codeBlock) {
        // End block
        codeBlock = false;
        elements.push(
          <pre key={`code-${i}`} className="my-3 p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-850 shadow-inner">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      } else {
        codeBlock = true;
      }
      continue;
    }

    if (codeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table Line Parsing: starts/ends with "|" and contains at least one "|"
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const rawCells = line.split('|').map(c => c.trim());
      // remove first and last elements since they are empty because of bounding '|'
      if (rawCells[0] === '') rawCells.shift();
      if (rawCells[rawCells.length - 1] === '') rawCells.pop();

      // Skip separator row (e.g. |---|---|)
      if (rawCells.every(c => c.match(/^[-:]+$/))) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: rawCells, rows: [] };
      } else {
        currentTable.rows.push(rawCells);
      }
      continue;
    } else if (currentTable) {
      // Table ended, flush it
      const tbl = flushTable(i);
      if (tbl) elements.push(tbl);
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className={`text-xs font-black mt-4 mb-2 uppercase tracking-wide ${isAi ? "text-slate-950 dark:text-white" : "text-white"}`}>
          {parseInlineStyles(line.substring(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className={`text-sm font-black mt-5 mb-2.5 border-b pb-1.5 ${isAi ? "text-slate-950 dark:text-white border-slate-200 dark:border-slate-800" : "text-white border-white/20"}`}>
          {parseInlineStyles(line.substring(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className={`text-base font-black mt-6 mb-3 ${isAi ? "text-slate-950 dark:text-white" : "text-white"}`}>
          {parseInlineStyles(line.substring(2))}
        </h2>
      );
    }
    // Bullet list
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <div key={i} className={listContainerClass}>
          <span className={bulletClass}>•</span>
          <span className="leading-relaxed">{parseInlineStyles(line.trim().substring(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className={listContainerClass}>
            <span className={numberClass}>{match[1]}.</span>
            <span className="leading-relaxed">{parseInlineStyles(match[2])}</span>
          </div>
        );
      }
    }
    // Blank line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Shortcut button trigger: [PINTASAN: tab_id | label]
    else if (line.trim().startsWith('[PINTASAN:') && line.trim().endsWith(']')) {
      const match = line.trim().match(/^\[PINTASAN:\s*([a-zA-Z0-9_-]+)\s*\|\s*([^\]]+)\]$/);
      if (match) {
        const tabId = match[1];
        const label = match[2];
        elements.push(
          <div key={i} className="my-2 flex justify-start">
            <button
              onClick={() => onNavigate && onNavigate(tabId)}
              className="px-4 py-2.5 hover:brightness-95 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap"
              style={{ backgroundColor: accessibleColor || '#8b5cf6' }}
            >
              <span>{label}</span>
              <ArrowRight className="w-3.5 h-3.5 animate-bounce-horizontal" />
            </button>
          </div>
        );
      } else {
        elements.push(
          <p key={i} className={textClass}>
            {parseInlineStyles(line)}
          </p>
        );
      }
    }
    // Standard paragraph line
    else {
      elements.push(
        <p key={i} className={textClass}>
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  // Final flush in case table is at the very end of the output
  if (currentTable) {
    const tbl = flushTable(9999);
    if (tbl) elements.push(tbl);
  }

  return <div className="space-y-0.5">{elements}</div>;
};

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  company,
  accentColor,
  isDarkMode = true,
  onNavigate,
}) => {
  const accessibleColor = getAccessibleAccentColor(accentColor, isDarkMode);

  // Messages State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Selamat datang di **Asisten AI HR PT. Nindya Krida Utama (NKU)**! 🌟

Saya terhubung langsung dengan basis data kepegawaian, daftar divisi, jadwal shift, dan log presensi lapangan Anda secara real-time.

Berikut beberapa tugas pintar yang bisa saya bantu sekarang:
- **Analisis Kedisiplinan**: *"Siapa yang sering terlambat bulan ini? Urutkan dari yang paling sering."*
- **Rekap Presensi Karyawan**: *"Buatkan rekap absen lengkap dari tanggal 1 sampai 30 bulan ini."*
- **Slip Gaji Manual**: *"Buatkan draf slip gaji detail untuk Karyawan bernama Adi"*
- **Status Karyawan**: *"Tampilkan statistik karyawan dan divisi perusahaan kita."*

Silakan ajukan pertanyaan Anda melalui bar chat di bawah ini! 👇`,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isPresetsExpanded, setIsPresetsExpanded] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setErrorNotice(null);
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      // Build history payloads omitting ID/timestamps to keep payloads standard
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.askAi(textToSend, historyPayload);

      if (res.success && res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-ai`,
            role: 'assistant',
            content: res.reply,
            timestamp: new Date(),
          },
        ]);
      } else {
        setErrorNotice(res.error || 'Gagal menerima respon dari asisten AI.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || 'Koneksi ke backend asisten AI terputus.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat obrolan?')) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Riwayat obrolan telah dibersihkan. Ada hal lain yang bisa saya bantu terkait data HR PT. Nindya Krida Utama (NKU) hari ini?',
          timestamp: new Date(),
        },
      ]);
      setErrorNotice(null);
    }
  };

  const suggestedQuestions = [
    {
      title: 'Daftar Keterlambatan',
      desc: 'Cari tahu siapa yang tidak disiplin',
      icon: Clock,
      query: 'Siapa karyawan yang paling sering terlambat bulan ini? Tolong urutkan denda atau frekuensi keterlambatannya dari yang paling tidak disiplin.',
      color: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-700 dark:text-rose-300',
    },
    {
      title: 'Rekap Absen Tanggal 1-30',
      desc: 'Tarik laporan seluruh log kehadiran',
      icon: CalendarDays,
      query: 'Tolong buatkan rekapitulasi data absensi dari tanggal 1 sampai 30 bulan ini secara lengkap.',
      color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    },
    {
      title: 'Slip Gaji Karyawan',
      desc: 'Draf slip payroll otomatis',
      icon: FileText,
      query: 'Buatkan draf slip gaji lengkap untuk karyawan dengan NIP NKU001 (atau Karyawan Adi). Sertakan rincian gaji, denda, dan tunjangannya.',
      color: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    },
    {
      title: 'Kinerja Divisi',
      desc: 'Statistik persebaran karyawan',
      icon: TrendingUp,
      query: 'Berapa jumlah karyawan aktif per divisi dan bagaimana persebaran jadwal kerjanya?',
      color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-700 dark:text-amber-300',
    },
  ];

  return (
    <div className="h-[76vh] lg:h-[78vh] flex flex-col gap-2 animate-in fade-in duration-200 max-w-full">
      {/* Header Panel */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${accessibleColor}, #A855F7)`,
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Asisten AI HR Portal NKU
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Gemini Powered
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Analisis cerdas, draf slip gaji, & rekapitulasi presensi karyawan PT. Nindya Krida Utama menggunakan kecerdasan buatan.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus Riwayat Obrolan</span>
        </button>
      </div>

      {/* PRESETS FOR QUICK ACTIONS (COLLAPSIBLE) */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs shrink-0 transition-all duration-200">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <HelpCircle className="w-4 h-4 text-purple-500 shrink-0" />
            <span>Pilih Tugas Cepat AI:</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Formulasi Lokal & Terenkripsi</span>
            </div>
            {/* Collapse / Expand Toggle Button */}
            <button
              onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isPresetsExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Tampilkan ({suggestedQuestions.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Render horizontal presets only when expanded */}
        {isPresetsExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-in fade-in-20 duration-150">
            {suggestedQuestions.map((q, idx) => {
              const IconComp = q.icon;
              return (
                <button
                  key={idx}
                  disabled={isSending}
                  onClick={() => handleSendMessage(q.query)}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${q.color} ${
                    isSending ? 'opacity-50 pointer-events-none' : 'hover:shadow-xs'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-white/75 dark:bg-black/25 shrink-0 flex items-center justify-center">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold tracking-tight truncate leading-tight">{q.title}</h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate leading-normal">{q.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Chat Area - Expanded to take 100% of remaining vertical space */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xs">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isAi = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isAi ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    isAi
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'text-white'
                  }`}
                  style={!isAi ? { backgroundColor: accessibleColor } : undefined}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>

                {/* Bubble Content */}
                <div className="space-y-1">
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-xs text-xs leading-relaxed ${
                      isAi
                        ? 'bg-slate-50 dark:bg-[#161616] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/70 rounded-tl-none'
                        : 'text-white rounded-tr-none'
                    }`}
                    style={!isAi ? { backgroundColor: accessibleColor } : undefined}
                  >
                    <MarkdownFormatter 
                      text={m.content} 
                      isAi={isAi} 
                      onNavigate={onNavigate}
                      accessibleColor={accessibleColor}
                    />
                  </div>
                  {/* Timestamp */}
                  <div className={`text-[9px] text-slate-400 dark:text-slate-500 px-1 ${!isAi ? 'text-right' : 'text-left'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading / Typing Indicator */}
          {isSending && (
            <div className="flex gap-3 max-w-[80%] self-start mr-auto">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 flex items-center justify-center animate-bounce">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800/70 px-4 py-3 rounded-2xl rounded-tl-none shadow-xs text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                <span>Asisten AI sedang menghitung data dan menyusun laporan untuk Anda...</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errorNotice && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Kesalahan Asisten AI:</span>
                {errorNotice}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Form Input Area with Minimized Padding */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-2 sm:p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            disabled={isSending}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ketik pertanyaan HR Anda di sini... (misal: 'Siapa yang terlambat hari ini?')"
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="p-2.5 rounded-xl hover:opacity-90 active:scale-95 text-white transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            style={{
              backgroundColor: accessibleColor,
            }}
            title="Kirim pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
