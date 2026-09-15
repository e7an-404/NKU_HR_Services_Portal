import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarCheck,
  FileCheck2,
  Monitor,
  Banknote,
  Database,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  Pin,
  PinOff,
  CreditCard,
  Sliders,
  Building2,
  FileSignature,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types';
import { getAccessibleAccentColor } from '../lib/companyUtils';

export type ActiveTab =
  | 'dashboard'
  | 'sdm'
  | 'schedules'
  | 'calendar'
  | 'requests'
  | 'official_letters'
  | 'kiosk'
  | 'payroll'
  | 'idcard_review'
  | 'app_config'
  | 'db_config'
  | 'table_explorer'
  | 'company_profile'
  | 'manual'
  | 'ai_assistant';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  accentColor: string;
  isDarkMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  accentColor,
  isDarkMode = true,
}) => {
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isExpanded = isPinned || isHovered;
  const isSuperAdmin = userRole === 'super_admin';
  const isKioskOnly = userRole === 'kiosk_device';
  const accessibleColor = getAccessibleAccentColor(accentColor, isDarkMode);

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['super_admin', 'hr_admin', 'payroll_admin', 'manager'],
    },
    {
      id: 'ai_assistant' as ActiveTab,
      label: 'Asisten AI HR',
      icon: Sparkles,
      badge: 'Gemini',
      allowedRoles: ['super_admin', 'hr_admin', 'payroll_admin', 'manager'],
    },
    {
      id: 'kiosk' as ActiveTab,
      label: 'Terminal Kiosk',
      icon: Monitor,
      badge: 'Device',
      allowedRoles: ['super_admin', 'hr_admin', 'kiosk_device'],
    },
    {
      id: 'manual' as ActiveTab,
      label: 'Manual Operation',
      icon: BookOpen,
      allowedRoles: ['super_admin', 'hr_admin', 'payroll_admin', 'manager'],
    },
    {
      id: 'sdm' as ActiveTab,
      label: 'Management SDM',
      icon: Users,
      badge: 'Master',
      allowedRoles: ['super_admin', 'hr_admin'],
    },
    {
      id: 'schedules' as ActiveTab,
      label: 'Management Jadwal Kerja',
      icon: CalendarDays,
      allowedRoles: ['super_admin', 'hr_admin'],
    },
    {
      id: 'requests' as ActiveTab,
      label: 'Management Requests',
      icon: FileCheck2,
      badge: 'Approval',
      allowedRoles: ['super_admin', 'hr_admin', 'manager'],
    },
    {
      id: 'calendar' as ActiveTab,
      label: 'Kalender & Rekap Absensi',
      icon: CalendarCheck,
      allowedRoles: ['super_admin', 'hr_admin', 'manager'],
    },
    {
      id: 'payroll' as ActiveTab,
      label: 'Management Gaji',
      icon: Banknote,
      badge: 'Payroll',
      allowedRoles: ['super_admin', 'payroll_admin'],
    },
    {
      id: 'official_letters' as ActiveTab,
      label: 'Surat Resmi & SP / PHK',
      icon: FileSignature,
      badge: 'Legal',
      allowedRoles: ['super_admin', 'hr_admin', 'manager'],
    },
    {
      id: 'app_config' as ActiveTab,
      label: 'App Config',
      icon: Sliders,
      badge: 'Settings',
      allowedRoles: ['super_admin', 'hr_admin', 'payroll_admin', 'manager'],
    },
    {
      id: 'db_config' as ActiveTab,
      label: 'Konfigurasi Sistem & Database',
      icon: Database,
      badge: 'MySQL Live',
      allowedRoles: ['super_admin'],
    },
  ];

  // If kiosk device, restrict to kiosk only
  const visibleItems = isKioskOnly
    ? menuItems.filter((m) => m.id === 'kiosk')
    : menuItems.filter((m) => m.allowedRoles.includes(userRole));

  return (
    <aside
      id="main-sidebar"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212] h-full overflow-y-auto custom-scrollbar p-0 flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      <div>
        {/* Sidebar Header + Pin Button (Flush at top, no gap) */}
        <div className="flex items-center justify-between px-3 h-11 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161616]/60 shrink-0">
          {isExpanded ? (
            <>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap overflow-hidden">
                Navigasi Utama
              </span>
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  !isPinned
                    ? 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : ''
                }`}
                style={
                  isPinned
                    ? {
                        color: accessibleColor,
                        backgroundColor: `${accentColor}20`,
                      }
                    : undefined
                }
                title={isPinned ? 'Unpin Sidebar (Otomatis Shrink)' : 'Pin Sidebar (Selalu Lebar)'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            </>
          ) : (
            <div className="w-full text-center py-0.5">
              <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MENU</span>
            </div>
          )}
        </div>

        {/* Menu Items Container with comfortable padding */}
        <div className="p-2 space-y-1">

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full flex items-center ${
                isExpanded ? 'justify-between px-3 py-2.5' : 'justify-center p-2.5'
              } rounded-xl text-xs transition-all group ${
                isActive
                  ? 'border-l-4 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
              style={
                isActive
                  ? {
                      borderLeftColor: accentColor,
                      backgroundColor: `${accentColor}20`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    !isActive ? 'text-slate-500 dark:text-slate-300' : ''
                  }`}
                  style={isActive ? { color: accessibleColor } : undefined}
                />
                {isExpanded && (
                  <span
                    className="truncate tracking-wide text-left animate-in fade-in duration-150"
                    style={isActive ? { color: accessibleColor } : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </div>

              {isExpanded && item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none shrink-0 ${
                    isActive
                      ? 'border font-bold'
                      : 'bg-slate-200 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#27272a]'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${accentColor}25`,
                          color: accessibleColor,
                          borderColor: `${accentColor}60`,
                        }
                      : undefined
                  }
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {/* Role Notice in bottom of sidebar */}
      <div className="p-2 shrink-0">
        {isExpanded ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-slate-800 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
                RBAC Aktif
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {isSuperAdmin
                ? 'Akses Super Admin: Anda memiliki hak penuh mengelola database live & DDL.'
                : `Login sebagai ${userRole}. Menu dibatasi sesuai hak akses peran.`}
            </p>
          </div>
        ) : (
          <div className="p-2 flex justify-center rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-slate-800" title={`RBAC: ${userRole}`}>
            <ShieldAlert className="w-4 h-4" style={{ color: accentColor }} />
          </div>
        )}
      </div>
    </aside>
  );
};
