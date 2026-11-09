import React from 'react';
import { LayoutDashboard, CalendarDays, Bell, Shield, User, BookOpen, CheckSquare } from 'lucide-react';
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe no-print"
    >
      <div className="grid grid-cols-6 h-16 items-center px-1">
        
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[9px] tracking-tight mt-1">Today</span>
        </button>

        <button
          onClick={() => onTabChange('timetable')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'timetable' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-[9px] tracking-tight mt-1">7-Day</span>
        </button>

        <button
          onClick={() => onTabChange('tasks')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'tasks' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-[9px] tracking-tight mt-1">Tasks</span>
        </button>

        <button
          onClick={() => onTabChange('notes')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'notes' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[9px] tracking-tight mt-1">Notes</span>
        </button>

        <button
          onClick={() => onTabChange('notifications')}
          className={`relative flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'notifications' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[9px] tracking-tight mt-1">Alerts</span>
        </button>

        <button
          onClick={() => onTabChange('admin')}
          className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'admin' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="text-[9px] tracking-tight mt-1">Admin</span>
        </button>

      </div>
    </nav>
  );
};
