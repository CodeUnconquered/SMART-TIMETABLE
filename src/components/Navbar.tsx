import React from 'react';
import { Shield, Sun, Moon } from 'lucide-react';
import { UserProfile, GlobalThemeMode } from '../types/timetable';

export type NavTab = 'dashboard' | 'timetable' | 'tasks' | 'notes' | 'notifications' | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount: number;
  user?: UserProfile;
  currentTheme?: GlobalThemeMode;
  onToggleTheme?: () => void;
  onSwitchRole?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  user,
  currentTheme = 'dark',
  onToggleTheme,
  onSwitchRole
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Brand Wordmark: SMART REMIND */}
        <button
          onClick={() => onTabChange('dashboard')}
          className="text-lg font-black tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer"
        >
          <img 
            src="/icon.svg" 
            alt="Smart Remind Icon" 
            className="w-8 h-8 rounded-xl object-contain shadow-md shadow-cyan-950/40 shrink-0" 
          />
          <span className="font-extrabold tracking-tight">SmartRemind</span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-300">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onTabChange('timetable')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'timetable'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            7-Day Schedule
          </button>

          <button
            onClick={() => onTabChange('tasks')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1 cursor-pointer ${
              activeTab === 'tasks'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            <span>Personal Tasks</span>
          </button>

          <button
            onClick={() => onTabChange('notes')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1 cursor-pointer ${
              activeTab === 'notes'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            <span>Notes & Materials</span>
          </button>

          <button
            onClick={() => onTabChange('notifications')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notifications'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            <span>Alarms & Alerts</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-[10px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('admin')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Admin</span>
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/60 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shadow-sm shrink-0"
              title={`Current Theme: ${currentTheme === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-slate-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-slate-700">Dark</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

