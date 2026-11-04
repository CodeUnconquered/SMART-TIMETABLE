import React from 'react';
import { LayoutDashboard, CalendarDays, Bell, Shield, User } from 'lucide-react';
import { NavTab } from './Navbar';

interface MobileBottomBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount: number;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  onTabChange,
  unreadCount
}) => {
  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe no-print"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Today</span>
        </button>

        <button
          onClick={() => onTabChange('timetable')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'timetable' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Schedule</span>
        </button>

        <button
          onClick={() => onTabChange('notifications')}
          className={`relative flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'notifications' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Alerts</span>
        </button>

        <button
          onClick={() => onTabChange('admin')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'admin' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Admin</span>
        </button>

        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'profile' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Profile</span>
        </button>

      </div>
    </nav>
  );
};
