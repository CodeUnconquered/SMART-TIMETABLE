import React, { useState } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Clock, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  Sliders, 
  CheckCircle2, 
  Info,
  Calendar,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { NotificationItem, NotificationPreferences } from '../types/timetable';
import { playNotificationSound, triggerVibration } from '../utils/audio';
import { setPreferences } from '../utils/storage';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  preferences: NotificationPreferences;
  onUpdatePreferences: (prefs: NotificationPreferences) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onTriggerTestReminder: () => Promise<NotificationItem>;
  onRequestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  preferences,
  onUpdatePreferences,
  onMarkAllAsRead,
  onClearNotifications,
  onTriggerTestReminder,
  onRequestPermission,
  permissionStatus
}) => {
  const [filterType, setFilterType] = useState<'all' | 'reminder' | 'update'>('all');
  const [testTriggered, setTestTriggered] = useState(false);
  const [customIntervalInput, setCustomIntervalInput] = useState('');

  // Handle sound toggle
  const toggleSound = () => {
    const updated = { ...preferences, soundEnabled: !preferences.soundEnabled };
    onUpdatePreferences(updated);
    setPreferences(updated);
    if (updated.soundEnabled) {
      playNotificationSound(updated.soundType);
    }
  };

  // Handle vibration toggle
  const toggleVibration = () => {
    const updated = { ...preferences, vibrationEnabled: !preferences.vibrationEnabled };
    onUpdatePreferences(updated);
    setPreferences(updated);
    if (updated.vibrationEnabled) {
      triggerVibration([200, 100, 200]);
    }
  };

  // Handle sound type switch
  const changeSoundType = (type: 'chime' | 'pulse' | 'subtle') => {
    const updated = { ...preferences, soundType: type };
    onUpdatePreferences(updated);
    setPreferences(updated);
    playNotificationSound(type);
  };

  // Add/remove interval
  const toggleInterval = (minutes: number) => {
    let intervals = [...preferences.reminderIntervals];
    if (intervals.includes(minutes)) {
      if (intervals.length === 1) return; // Keep at least one interval
      intervals = intervals.filter(m => m !== minutes);
    } else {
      intervals.push(minutes);
      intervals.sort((a, b) => b - a);
    }
    const updated = { ...preferences, reminderIntervals: intervals };
    onUpdatePreferences(updated);
    setPreferences(updated);
  };

  const handleAddCustomInterval = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customIntervalInput, 10);
    if (!isNaN(val) && val > 0 && val <= 180 && !preferences.reminderIntervals.includes(val)) {
      const intervals = [...preferences.reminderIntervals, val].sort((a, b) => b - a);
      const updated = { ...preferences, reminderIntervals: intervals };
      onUpdatePreferences(updated);
      setPreferences(updated);
      setCustomIntervalInput('');
    }
  };

  // Run audible test
  const handleRunTest = async () => {
    setTestTriggered(true);
    await onTriggerTestReminder();
    setTimeout(() => setTestTriggered(false), 3000);
  };

  // Filter list
  const filteredNotifications = notifications.filter(item => {
    if (filterType === 'reminder') return item.type === 'reminder';
    if (filterType === 'update') return item.type === 'rescheduled' || item.type === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. HEADER & STATUS */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-cyan-400" />
              <span>Smart Class Reminder & Audible Alert System</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automated reminders deliver audible chimes and mobile push notifications prior to scheduled lectures and practicals.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            disabled={testTriggered}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-950/60 shrink-0"
          >
            <Volume2 className="w-4 h-4" />
            <span>{testTriggered ? 'Chime Alert Triggered!' : 'Test Audible Alert Now'}</span>
          </button>
        </div>
      </section>

      {/* 2. AUDIO & REMINDER CONFIGURATION MATRIX */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Audible Notification Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Audible Sound Engine</span>
            </h2>
            <span className="text-[11px] font-mono text-cyan-400">Web Audio API</span>
          </div>

          {/* Sound Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Audible Sound Alert</span>
              <span className="text-xs text-slate-400">Play melodic chime when a class reminder triggers</span>
            </div>
            <button
              onClick={toggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                preferences.soundEnabled ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  preferences.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Tone Profiles */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block">
              Audio Melodic Profile
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => changeSoundType('chime')}
                className={`p-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                  preferences.soundType === 'chime'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block font-bold">Chime</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">3-Tone Arpeggio</span>
              </button>

              <button
                onClick={() => changeSoundType('pulse')}
                className={`p-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                  preferences.soundType === 'pulse'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block font-bold">Pulse</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Dual High Pulse</span>
              </button>

              <button
                onClick={() => changeSoundType('subtle')}
                className={`p-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                  preferences.soundType === 'subtle'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block font-bold">Subtle</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Soft Bell C5</span>
              </button>
            </div>
          </div>

          {/* Device Vibration Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Device Vibration</span>
              <span className="text-xs text-slate-400">Haptic vibration pattern on supported Android phones</span>
            </div>
            <button
              onClick={toggleVibration}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                preferences.vibrationEnabled ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  preferences.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Browser / Push Notifications Permission */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white block">System Push Notifications</span>
              <span className="text-xs text-slate-400 font-mono">
                Status: {permissionStatus === 'granted' ? 'Allowed' : permissionStatus === 'denied' ? 'Blocked' : 'Not Requested'}
              </span>
            </div>
            {permissionStatus !== 'granted' ? (
              <button
                onClick={onRequestPermission}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
              >
                Enable
              </button>
            ) : (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Right Card: Reminder Intervals Customizer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Reminder Timing Intervals</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Scheduled In Advance</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Select how many minutes before class start you want to be alerted. The application will dispatch scheduled reminders at each active threshold.
          </p>

          {/* Standard Thresholds */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block">
              Active Reminder Intervals
            </span>
            <div className="flex flex-wrap gap-2">
              {[60, 45, 30, 15, 10, 5].map((mins) => {
                const isActive = preferences.reminderIntervals.includes(mins);
                return (
                  <button
                    key={mins}
                    onClick={() => toggleInterval(mins)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{mins} mins</span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add custom minute form */}
          <form onSubmit={handleAddCustomInterval} className="pt-2 flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="180"
              value={customIntervalInput}
              onChange={(e) => setCustomIntervalInput(e.target.value)}
              placeholder="Custom mins (e.g. 20)"
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              Add Interval
            </button>
          </form>

          {/* OS Constraints Explanatory Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Info className="w-3.5 h-3.5" />
              <span>Android & OS Notification Guidance</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When installed as a PWA, reminders trigger via Service Worker push events. System volume, Do Not Disturb, and battery optimization profiles are respected by Android to ensure non-intrusive delivery.
            </p>
          </div>
        </div>

      </section>

      {/* 3. NOTIFICATION FEED & HISTORY */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Notifications & Schedule Updates ({notifications.length})</span>
            </h2>
            <p className="text-xs text-slate-400">Class reminders, timetable reschedule notices, and system logs</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('reminder')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'reminder' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reminders
              </button>
              <button
                onClick={() => setFilterType('update')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'update' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Updates
              </button>
            </div>

            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark Read</span>
            </button>

            <button
              onClick={onClearNotifications}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-1">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">Notification inbox is clear</p>
            <p>Upcoming reminders will automatically appear here as class time approaches.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const isUpdate = notif.type === 'rescheduled' || notif.type === 'cancelled';
              const isCancel = notif.type === 'cancelled';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !notif.read
                      ? 'bg-slate-850 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        isCancel
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isUpdate
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}>
                        {notif.type.toUpperCase()}
                      </span>

                      {notif.courseCode && (
                        <span className="font-bold text-white">{notif.courseCode}</span>
                      )}

                      {notif.venue && (
                        <span className="text-slate-400">· Room: {notif.venue}</span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-white">
                      {notif.title}
                    </h4>

                    <p className="text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 shrink-0 text-left sm:text-right">
                    <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="block text-[10px] text-slate-600">{new Date(notif.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};
