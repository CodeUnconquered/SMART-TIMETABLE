import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { Bell, Shield } from 'lucide-react';
import { UserProfile } from '../types/timetable';

export type NavTab = 'dashboard' | 'timetable' | 'notifications' | 'admin' | 'profile';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount: number;
  user: UserProfile;
  onSwitchRole: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  user,
  onSwitchRole
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onTabChange('dashboard')}
          className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-mono font-extrabold shadow-sm">
            CS
          </span>
          <span>ClassRemind</span>
        </button>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onTabChange('timetable')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'timetable'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            My Timetable
          </button>

          <button
            onClick={() => onTabChange('notifications')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notifications'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <span>Alerts</span>
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
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => onTabChange('profile')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'profile'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton />
          
          <button
            onClick={onSwitchRole}
            title={`Current: ${user.role}. Click to switch role.`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>{user.role === 'admin' ? 'Admin Mode' : 'Student'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
