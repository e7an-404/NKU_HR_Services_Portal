import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Minimize2,
  Maximize2,
  ChevronUp,
  Search,
  Zap,
  ExternalLink,
  ShieldCheck,
  Server,
  Activity,
  X,
  GripVertical,
  RotateCcw,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { DbSyncLog, DatabaseConfig } from '../types';
import { api } from '../lib/api';

interface FloatingDbConfigLogProps {
  dbConfig: DatabaseConfig;
  onNavigateToDbConfig?: (subTab?: 'db_connection' | 'table_explorer' | 'company' | 'holidays') => void;
  accentColor?: string;
  currentUserRole?: string;
}

export const FloatingDbConfigLog: React.FC<FloatingDbConfigLogProps> = ({
  dbConfig,
  onNavigateToDbConfig,
  accentColor = '#F59E0B',
  currentUserRole,
}) => {
  // Hanya tampil saat super admin yang login
  if (currentUserRole !== 'super_admin') {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<DbSyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'idle' | 'success' | 'failed'; latency?: number; message?: string }>({ status: 'idle' });
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Auto-minimize after 5 seconds on cursor leave
  const autoMinimizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoMinimizeCountdown, setAutoMinimizeCountdown] = useState<number | null>(null);

  const clearAutoMinimizeTimer = () => {
    if (autoMinimizeTimerRef.current) {
      clearTimeout(autoMinimizeTimerRef.current);
      autoMinimizeTimerRef.current = null;
    }
    setAutoMinimizeCountdown(null);
  };

  const handleMouseEnterDrawer = () => {
    clearAutoMinimizeTimer();
  };

  const handleMouseLeaveDrawer = () => {
    // Auto-close/minimize log drawer after 3 seconds on cursor leave
    if ((isOpen || !isMinimized) && !confirmDeleteModal) {
      clearAutoMinimizeTimer();
      autoMinimizeTimerRef.current = setTimeout(() => {
        setIsMinimized(true);
        setIsOpen(false);
        autoMinimizeTimerRef.current = null;
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      clearAutoMinimizeTimer();
    };
  }, []);

  // Confirmation Modal State (Avoids browser window.confirm in iframe)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'clear_all' | 'delete_row';
    logId?: number;
    logTitle?: string;
    isProcessing?: boolean;
  } | null>(null);

  // Dragging state (Default null = bottom-right CSS dock)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore clicks on buttons/inputs/selects
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    e.preventDefault();

    const el = document.getElementById('floating-db-config-log');
    const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth - 470, top: window.innerHeight - 580 };

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const widgetWidth = isOpen ? 470 : 260;
      const widgetHeight = isOpen ? (isMinimized ? 64 : 580) : 48;

      const maxX = Math.max(10, window.innerWidth - widgetWidth - 10);
      const maxY = Math.max(10, window.innerHeight - widgetHeight - 10);

      const newX = Math.max(10, Math.min(maxX, dragRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(maxY, dragRef.current.initialY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getDbSyncLogs();
      if (res && res.logs) {
        setLogs(res.logs);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    // Periodic refresh every 15 seconds to keep live logs updated
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleTestPing = async () => {
    setTestingPing(true);
    try {
      const res = await api.testDbConnection(dbConfig);
      setPingResult({
        status: res.success ? 'success' : 'failed',
        latency: res.latency_ms || 32,
        message: res.message || (res.success ? 'Koneksi MySQL live terverifikasi' : 'Gagal terhubung'),
      });
      fetchLogs();
    } catch (err: any) {
      setPingResult({
        status: 'failed',
        message: err.message || 'Koneksi gagal',
      });
    } finally {
      setTestingPing(false);
    }
  };

  // Open confirmation for clear all logs
  const handleOpenClearAllConfirm = () => {
    clearAutoMinimizeTimer();
    setConfirmDeleteModal({
      type: 'clear_all',
      logTitle: 'Seluruh riwayat log aktivitas database',
    });
  };

  // Open confirmation for single log delete
  const handleOpenDeleteRowConfirm = (log: DbSyncLog, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    clearAutoMinimizeTimer();
    setConfirmDeleteModal({
      type: 'delete_row',
      logId: log.id,
      logTitle: log.message ? log.message.slice(0, 75) : `Log #${log.id}`,
    });
  };

  // Execute confirmed deletion
  const handleExecuteConfirmedDelete = async () => {
    if (!confirmDeleteModal) return;
    setConfirmDeleteModal((prev) => prev ? { ...prev, isProcessing: true } : null);

    try {
      if (confirmDeleteModal.type === 'clear_all') {
        setLogs([]);
        await api.clearDbSyncLogs();
        setActionSuccessMessage('Seluruh log database berhasil dibersihkan');
      } else if (confirmDeleteModal.type === 'delete_row' && confirmDeleteModal.logId) {
        const idToDelete = confirmDeleteModal.logId;
        setLogs((prev) => prev.filter((l) => Number(l.id) !== Number(idToDelete)));
        await api.deleteDbSyncLog(idToDelete);
        setActionSuccessMessage(`Log #${idToDelete} berhasil dihapus`);
      }
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed executing delete log action', err);
      fetchLogs();
    } finally {
      setConfirmDeleteModal(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all') {
      if (filterType === 'seed' && log.action_type !== 'seed') return false;
      if (filterType === 'sync' && log.action_type !== 'push' && log.action_type !== 'pull') return false;
      if (filterType === 'crud' && !['table_create', 'table_edit', 'table_delete'].includes(log.action_type)) return false;
      if (filterType === 'test' && log.action_type !== 'test_connection') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = (log.message || '').toLowerCase().includes(q);
      const matchTbl = (log.table_name || '').toLowerCase().includes(q);
      const matchType = (log.action_type || '').toLowerCase().includes(q);
      return matchMsg || matchTbl || matchType;
    }
    return true;
  });

  const isConnected = dbConfig.last_connection_status === 'connected' || pingResult.status === 'success';

  return (
    <div
      id="floating-db-config-log"
      className={`select-none z-40 ${
        position
          ? 'fixed'
          : 'fixed bottom-5 right-5'
      } ${isDragging ? 'cursor-grabbing opacity-95' : ''}`}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto',
            }
          : undefined
      }
    >
      {/* 1. FLOATING PILL / TRIGGER (When Closed) */}
      {!isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="group flex items-center gap-2 p-1 rounded-full bg-white/95 dark:bg-[#111425]/90 text-slate-900 dark:text-white border border-slate-200 dark:border-[#2c3358] shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-grab active:cursor-grabbing"
          title="Klik untuk membuka log DB, drag untuk memindahkan posisi"
        >
          <div className="pl-2 pr-0.5 text-slate-400 hover:text-slate-200">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              fetchLogs();
            }}
            className="flex items-center gap-3 pr-4 py-1.5 focus:outline-hidden"
          >
            {/* Pulsing indicator */}
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span
                className={`absolute w-4 h-4 rounded-full animate-ping opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <Database
                className="w-4 h-4 group-hover:rotate-12 transition-transform"
                style={{ color: accentColor }}
              />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>DB Log: {dbConfig.database || dbConfig.database_name || 'MySQL'}</span>
                  {logs.length > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        borderColor: `${accentColor}40`,
                        color: accentColor,
                      }}
                    >
                      {logs.length}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-none">
                  {isConnected ? 'Live Connected' : 'Ready / Active'} &bull; SSL {dbConfig.ssl_mode || 'REQ'}
                </div>
              </div>
            </div>

            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors ml-1" />
          </button>
        </div>
      )}

      {/* 2. FLOATING LOG DRAWER / WINDOW (When Open) */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnterDrawer}
          onMouseLeave={handleMouseLeaveDrawer}
          className={`w-[470px] max-w-[calc(100vw-2.5rem)] rounded-3xl bg-white/95 dark:bg-[#121215]/95 text-slate-900 dark:text-white border border-slate-200 dark:border-[#27272a] shadow-2xl backdrop-blur-2xl flex flex-col transition-all duration-300 overflow-hidden relative ${
            isMinimized ? 'h-[64px]' : 'max-h-[640px] h-[580px]'
          }`}
        >
          {/* Draggable Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            className="px-4 py-3 bg-slate-100/90 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing"
            title="Klik & drag header ini untuk memindahkan window log"
          >
            <div className="flex items-center gap-2">
              <div className="text-slate-400 dark:text-slate-500 p-0.5" title="Drag untuk memindahkan window">
                <GripVertical className="w-4 h-4" />
              </div>
              <div
                className="w-8 h-8 rounded-xl border flex items-center justify-center"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}40`,
                  color: accentColor,
                }}
              >
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                    Log Konfigurasi Database
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">
                  {dbConfig.host || 'mysql.cloud'}:{dbConfig.port || 3306}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {position && (
                <button
                  onClick={() => setPosition(null)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
                  title="Kembalikan ke posisi awal (Bawah Kanan)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
                title="Segarkan Log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
                title={isMinimized ? 'Perbesar' : 'Minimalkan'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Tutup Widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Connection Status Ribbon & Quick Ping */}
              <div className="px-4 sm:px-5 py-2.5 bg-slate-50/80 dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between gap-2 shrink-0 transition-colors">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 min-w-0">
                  <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-900 dark:text-white font-bold truncate">
                    {dbConfig.database || dbConfig.database_name}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                    SSL: {dbConfig.ssl_mode || 'REQ'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTestPing}
                    disabled={testingPing}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 transition-colors disabled:opacity-50 border cursor-pointer"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      borderColor: `${accentColor}40`,
                      color: accentColor,
                    }}
                  >
                    <Activity className={`w-3 h-3 ${testingPing ? 'animate-spin' : ''}`} />
                    <span>{testingPing ? 'Pinging...' : 'Test Ping'}</span>
                  </button>

                  {onNavigateToDbConfig && (
                    <button
                      onClick={() => {
                        onNavigateToDbConfig('db_connection');
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                      title="Buka Halaman Konfigurasi Database (Koneksi Database MySQL)"
                    >
                      <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Setting</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Toast message if any */}
              {actionSuccessMessage && (
                <div className="px-4 py-1.5 bg-emerald-100/90 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{actionSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setActionSuccessMessage(null)}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Ping Result Banner if active */}
              {pingResult.status !== 'idle' && (
                <div
                  className={`px-4 py-2 text-[11px] font-mono flex items-center justify-between border-b ${
                    pingResult.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {pingResult.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    )}
                    <span>{pingResult.message}</span>
                  </div>
                  {pingResult.latency && <span>{pingResult.latency}ms</span>}
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="p-3 bg-slate-50/70 dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] space-y-2 shrink-0 transition-colors">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari log database (tabel, aksi, status)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Filter Pills & Actions (Clear All) */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {[
                      { id: 'all', label: 'Semua' },
                      { id: 'seed', label: 'Seed/DDL' },
                      { id: 'sync', label: 'Push/Pull' },
                      { id: 'crud', label: 'Tabel CRUD' },
                      { id: 'test', label: 'Koneksi' },
                    ].map((f) => {
                      const isActive = filterType === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setFilterType(f.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors shrink-0 border cursor-pointer ${
                            isActive
                              ? ''
                              : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#202024]'
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: accentColor,
                                  borderColor: accentColor,
                                  color: '#FFFFFF',
                                }
                              : undefined
                          }
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Clear All Button with In-App Confirmation */}
                  <button
                    onClick={handleOpenClearAllConfirm}
                    disabled={logs.length === 0}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Hapus / Bersihkan semua riwayat log (Clear All dengan konfirmasi)"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Log Items Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-transparent transition-colors">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-mono">
                    <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    Tidak ada aktivitas log database yang cocok.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isSuccess = log.status === 'success';
                    let typeBadgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                    let typeLabel = log.action_type;

                    if (log.action_type === 'seed') {
                      typeBadgeClass = 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
                      typeLabel = 'SEED DDL';
                    } else if (log.action_type === 'push') {
                      typeBadgeClass = 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
                      typeLabel = 'PUSH SYNC';
                    } else if (log.action_type === 'pull') {
                      typeBadgeClass = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
                      typeLabel = 'PULL SYNC';
                    } else if (['table_create', 'table_edit', 'table_delete'].includes(log.action_type)) {
                      typeBadgeClass = 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
                      typeLabel = log.action_type.replace('table_', 'ROW_').toUpperCase();
                    } else if (log.action_type === 'test_connection') {
                      typeBadgeClass = 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
                      typeLabel = 'PING TEST';
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-[#202024] border border-slate-200 dark:border-[#27272a] transition-all shadow-2xs group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              #{log.id}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${typeBadgeClass}`}
                            >
                              {typeLabel}
                            </span>
                            {log.table_name && (
                              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700/50">
                                {log.table_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              <span>{new Date(log.executed_at).toLocaleTimeString('id-ID')}</span>
                              {isSuccess ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0" />
                              )}
                            </div>

                            {/* Tombol Hapus Baris Log (dengan konfirmasi modal) */}
                            <button
                              onClick={(e) => handleOpenDeleteRowConfirm(log, e)}
                              className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold font-mono text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/60 dark:hover:bg-rose-500/20 border border-slate-200 hover:border-rose-200 dark:border-slate-700/60 dark:hover:border-rose-500/40 flex items-center gap-1 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                              title="Hapus baris log ini (dengan konfirmasi)"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-800 dark:text-slate-200 font-sans leading-relaxed break-words">
                          {log.message}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400">
                          <span>Oleh: {log.executed_by_name || 'System'}</span>
                          {log.row_count !== undefined && (
                            <span>{log.row_count} baris diproses</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 dark:bg-[#121215] border-t border-slate-200 dark:border-[#27272a] flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono shrink-0 transition-colors">
                <span>{logs.length} riwayat operasi terekam</span>
                {onNavigateToDbConfig && (
                  <button
                    onClick={() => {
                      onNavigateToDbConfig();
                      setIsOpen(false);
                    }}
                    className="font-bold flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                    style={{ color: accentColor }}
                  >
                    Tabel Explorer &rarr;
                  </button>
                )}
              </div>
            </>
          )}

          {/* Dedicated In-Component Confirmation Modal for Deleting Logs (Avoids iframe window.confirm) */}
          {confirmDeleteModal && (
            <div
              className="absolute inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#3f3f46] p-4 text-left shadow-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-rose-500 dark:text-rose-400">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {confirmDeleteModal.type === 'clear_all'
                        ? 'Bersihkan Semua Log Database?'
                        : 'Hapus Catatan Log Database?'}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {confirmDeleteModal.type === 'clear_all'
                        ? 'Tindakan ini tidak dapat dibatalkan'
                        : `ID Log: #${confirmDeleteModal.logId}`}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] text-xs text-slate-700 dark:text-slate-300">
                  {confirmDeleteModal.type === 'clear_all' ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Apakah Anda yakin ingin menghapus <strong className="text-rose-600 dark:text-rose-400 font-semibold">seluruh riwayat log aktivitas database</strong>? Semua {logs.length} catatan riwayat sinkronisasi & DDL akan dibersihkan.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                        Apakah Anda yakin ingin menghapus baris log ini?
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono italic bg-white dark:bg-black/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 line-clamp-3">
                        "{confirmDeleteModal.logTitle || '-'}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={confirmDeleteModal.isProcessing}
                    onClick={() => setConfirmDeleteModal(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={confirmDeleteModal.isProcessing}
                    onClick={handleExecuteConfirmedDelete}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {confirmDeleteModal.isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmDeleteModal.isProcessing
                        ? 'Menghapus...'
                        : (confirmDeleteModal.type === 'clear_all' ? 'Ya, Bersihkan Semua' : 'Ya, Hapus Log')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

