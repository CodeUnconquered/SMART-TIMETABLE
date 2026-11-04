import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Smartphone, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  Calendar, 
  Mail, 
  IdCard, 
  GraduationCap,
  KeyRound,
  Download
} from 'lucide-react';
import { UserProfile, NotificationPreferences } from '../types/timetable';
import { getLastSyncTime } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileViewProps {
  user: UserProfile;
  preferences: NotificationPreferences;
  onUpdateUser: (user: UserProfile) => void;
  onSwitchRole: () => void;
  onSync: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  preferences,
  onUpdateUser,
  onSwitchRole,
  onSync
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editRegId, setEditRegId] = useState(user.studentId);

  const lastSync = getLastSyncTime();

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name: editName,
      email: editEmail,
      studentId: editRegId
    });
    setEditing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. PROFILE HEADER CARD */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xl font-bold font-mono shadow-lg shadow-cyan-950/60">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.name}</h1>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  user.role === 'admin'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  {user.role === 'admin' ? 'Timetable Administrator' : 'Student'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              <p className="text-xs text-slate-300">{user.program} · {user.year}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onSwitchRole}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Switch to {user.role === 'admin' ? 'Student' : 'Admin'} Mode
            </button>

            <button
              onClick={() => setEditing(!editing)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-800 space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Registration / Staff ID</label>
                <input
                  type="text"
                  value={editRegId}
                  onChange={(e) => setEditRegId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. DEVICE INSTALLATION & SYNCHRONIZATION STATUS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Device & PWA Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Mobile Installation (PWA)</h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">PWA Ready</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The application is configured as a standalone Progressive Web App with offline caching, Service Worker push handlers, and Android installation support.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Offline Caching:</span>
              <span className="text-emerald-400 font-bold">Active (CacheStorage v1)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Service Worker:</span>
              <span className="text-emerald-400 font-bold">Registered (/sw.js)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Display Mode:</span>
              <span className="text-cyan-300">Standalone (Full Screen)</span>
            </div>
          </div>

          <div className="pt-2">
            <PWAInstallButton />
          </div>
        </div>

        {/* Database & Synchronization Engine */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Schedule Synchronization</h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">v3.4.1</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Local timetable records are kept synchronized with the university central schedule database. If offline, changes queue automatically.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Last Synchronized:</span>
              <span className="text-white">{new Date(lastSync).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Server Timezone:</span>
              <span className="text-cyan-300">{preferences.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sync Status:</span>
              <span className="text-emerald-400">{syncDone ? 'Updated just now' : 'Up to date'}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing Records...' : 'Synchronize Now'}</span>
            </button>
          </div>
        </div>

      </section>

      {/* 3. ACADEMIC CALENDAR MILESTONES */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Semester II Academic Milestones</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">2026/2027 Session</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-cyan-400 font-bold block text-sm">Week 7 - 8</span>
            <span className="text-white font-semibold font-sans block">Continuous Assessment Tests (CATs)</span>
            <span className="text-slate-400 text-[11px] block">Algorithms & Database Systems II Practical</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-purple-400 font-bold block text-sm">Week 11 - 12</span>
            <span className="text-white font-semibold font-sans block">Software Engineering Project Demos</span>
            <span className="text-slate-400 text-[11px] block">Specialised Programs Complex (SPD 004)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block text-sm">Week 14 - 16</span>
            <span className="text-white font-semibold font-sans block">Final Semester Examinations</span>
            <span className="text-slate-400 text-[11px] block">Main University Examination Centre</span>
          </div>
        </div>
      </section>

    </div>
  );
};
