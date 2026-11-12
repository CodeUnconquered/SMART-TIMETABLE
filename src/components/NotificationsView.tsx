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
  Smartphone,
  ShieldAlert,
  BellRing,
  Mic,
  MessageSquare
} from 'lucide-react';
import { NotificationItem, NotificationPreferences } from '../types/timetable';
import { 
  playNotificationSound, 
  triggerVibration, 
  startProlongedAlarm, 
  stopProlongedAlarm,
  speakVoiceAnnouncement,
  stopVoiceAnnouncement 
} from '../utils/audio';
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
  const [filterType, setFilterType] = useState<'all' | 'reminder' | 'update' | 'task'>('all');
  const [testTriggered, setTestTriggered] = useState(false);
  const [customIntervalInput, setCustomIntervalInput] = useState('');
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null);

  // Toggle sound
  const toggleSound = () => {
    const updated = { ...preferences, soundEnabled: !preferences.soundEnabled };
    onUpdatePreferences(updated);
    setPreferences(updated);
    if (updated.soundEnabled) {
      playNotificationSound(updated.soundType);
    }
  };

  // Toggle voice announcements
  const toggleVoiceAnnouncement = () => {
    const isCurrentlyEnabled = preferences.voiceAnnouncementEnabled !== false;
    const updated = { ...preferences, voiceAnnouncementEnabled: !isCurrentlyEnabled };
    onUpdatePreferences(updated);
    setPreferences(updated);
    if (!isCurrentlyEnabled) {
      speakVoiceAnnouncement("Voice announcements enabled. Reminders will be spoken aloud.", updated.voiceSpeechRate || 1.0);
    } else {
      stopVoiceAnnouncement();
      setActiveSpeakingText(null);
    }
  };

  // Change voice speech rate
  const changeVoiceSpeechRate = (rate: number) => {
    const updated = { ...preferences, voiceSpeechRate: rate };
    onUpdatePreferences(updated);
    setPreferences(updated);
    speakVoiceAnnouncement("BCS 361 is starting in 30 minutes.", rate);
  };

  // Preview custom voice sample
  const handleTestSpeech = async (text: string) => {
    if (activeSpeakingText === text) {
      stopVoiceAnnouncement();
      setActiveSpeakingText(null);
      return;
    }
    setActiveSpeakingText(text);
    await speakVoiceAnnouncement(text, preferences.voiceSpeechRate || 1.0);
    setActiveSpeakingText(null);
  };

  // Toggle vibration
  const toggleVibration = () => {
    const updated = { ...preferences, vibrationEnabled: !preferences.vibrationEnabled };
    onUpdatePreferences(updated);
    setPreferences(updated);
    if (updated.vibrationEnabled) {
      triggerVibration([200, 100, 200]);
    }
  };

  // Change sound type
  const changeSoundType = (type: 'alarm' | 'chime' | 'pulse' | 'subtle') => {
    const updated = { ...preferences, soundType: type };
    onUpdatePreferences(updated);
    setPreferences(updated);
    playNotificationSound(type);
  };

  // Change alarm duration
  const changeAlarmDuration = (sec: number) => {
    const updated = { ...preferences, alarmDurationSeconds: sec };
    onUpdatePreferences(updated);
    setPreferences(updated);
  };

  // Add/remove interval
  const toggleInterval = (minutes: number) => {
    let intervals = [...preferences.reminderIntervals];
    if (intervals.includes(minutes)) {
      if (intervals.length === 1) return;
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

  // Trigger prolonged 10s audible alarm test
  const handleTestProlongedAlarm = () => {
    if (isAlarmPlaying) {
      stopProlongedAlarm();
      setIsAlarmPlaying(false);
      return;
    }

    setIsAlarmPlaying(true);
    startProlongedAlarm(preferences.alarmDurationSeconds || 10, () => {
      setIsAlarmPlaying(false);
    });
  };

  const filteredNotifications = notifications.filter(item => {
    if (filterType === 'reminder') return item.type === 'reminder';
    if (filterType === 'update') return item.type === 'rescheduled' || item.type === 'cancelled';
    if (filterType === 'task') return item.type === 'task';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. HEADER & STATUS */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold mb-1">
              <BellRing className="w-4 h-4" />
              <span>Smart Remind · Audible Alarm & Alert System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Alarms, Push Notifications & Reminder Preferences
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automated scheduler monitors university classes and personal activities. Delivers synthetic ~10-second audible alarms and Android push alerts prior to each session.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleTestSpeech("BCS 361 is starting in 30 minutes.")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                activeSpeakingText
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white animate-pulse'
                  : 'bg-cyan-950/90 border border-cyan-700/70 hover:bg-cyan-900 text-cyan-200 shadow-cyan-950/60'
              }`}
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>{activeSpeakingText ? 'Stop Speaking' : 'Test Voice Announcement'}</span>
            </button>

            <button
              onClick={handleTestProlongedAlarm}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isAlarmPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60'
              }`}
            >
              <BellRing className="w-4 h-4" />
              <span>{isAlarmPlaying ? 'Stop Ongoing Alarm' : 'Test 10s Audible Alarm'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. TECHNICAL ALARM DIAGNOSTICS & ANDROID BACKGROUND EXPLANATION */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm font-mono uppercase tracking-wider">
          <Smartphone className="w-4 h-4" />
          <span>Notification & Background Alarm Engine Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">1. In-App Web Audio Synthesis</span>
            <p className="text-slate-400">
              When the application is open or focused, polyphonic Web Audio oscillators play continuous melodic chimes for ~10 seconds with zero external audio file latency.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">2. PWA Web Push on Android</span>
            <p className="text-slate-400">
              When installed on Android, background notifications are delivered via Service Worker Push. Audio alert length in background is governed by your Android OS notification channel volume.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">3. Android Battery Optimization</span>
            <p className="text-slate-400">
              For 100% reliable alarms when phone screen is locked: open Android App Info for <em>Smart Remind</em> → Battery → Select <strong>"Unrestricted"</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CONFIGURATION CONTROLS */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Sound & Reminder Interval Customization</span>
        </h2>

        {/* Permission and Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Permission */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Push Notifications</span>
              <span className="text-[11px] font-mono text-slate-400">
                Status: {permissionStatus.toUpperCase()}
              </span>
            </div>
            {permissionStatus !== 'granted' ? (
              <button
                onClick={onRequestPermission}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Enable
              </button>
            ) : (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Active
              </span>
            )}
          </div>

          {/* Sound Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Audible Sound</span>
              <span className="text-[11px] font-mono text-slate-400">
                {preferences.soundEnabled ? 'Synthesizer Active' : 'Muted'}
              </span>
            </div>
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                preferences.soundEnabled
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Voice Announcement Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Voice Announcements</span>
              <span className="text-[11px] font-mono text-slate-400">
                {preferences.voiceAnnouncementEnabled !== false ? 'Spoken Aloud' : 'Disabled'}
              </span>
            </div>
            <button
              onClick={toggleVoiceAnnouncement}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                preferences.voiceAnnouncementEnabled !== false
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title={preferences.voiceAnnouncementEnabled !== false ? 'Turn off voice announcements' : 'Turn on voice announcements'}
            >
              {preferences.voiceAnnouncementEnabled !== false ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Vibration Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Device Vibration</span>
              <span className="text-[11px] font-mono text-slate-400">
                {preferences.vibrationEnabled ? 'Haptic Feedback On' : 'Disabled'}
              </span>
            </div>
            <button
              onClick={toggleVibration}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                preferences.vibrationEnabled
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Vibrate className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice Announcement Spoken Reminders Panel */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Voice Spoken Announcement System
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  preferences.voiceAnnouncementEnabled !== false 
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800' 
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {preferences.voiceAnnouncementEnabled !== false ? 'Enabled · Speaks Reminders Aloud' : 'Disabled (Optional)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                When active, your device speaks reminders aloud when alarms trigger (e.g. <em>&ldquo;BCS 361 is starting in 30 minutes&rdquo;</em>). Works 100% offline using client-side speech synthesis without replacing standard visual alerts.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-mono text-slate-400">Speech Rate:</label>
              <div className="flex gap-1.5">
                {[
                  { rate: 0.85, label: '0.85x' },
                  { rate: 1.0, label: '1.0x' },
                  { rate: 1.15, label: '1.15x' }
                ].map(speed => (
                  <button
                    key={speed.rate}
                    onClick={() => changeVoiceSpeechRate(speed.rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      (preferences.voiceSpeechRate || 1.0) === speed.rate
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spoken Samples */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">
              Click any sample below to preview dynamic speech generation:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { 
                  label: 'Class 30m Prior', 
                  text: 'BCS 361 is starting in 30 minutes.',
                  desc: 'Academic class lead time' 
                },
                { 
                  label: 'Personal Study Session', 
                  text: 'Your personal study session starts in 10 minutes.',
                  desc: 'Personal study task' 
                },
                { 
                  label: 'Meeting Starting Now', 
                  text: 'Your meeting is starting now.',
                  desc: 'Immediate task alert' 
                },
                { 
                  label: 'Class Starting at Venue', 
                  text: 'BCS 361 is starting now at LBB 016.',
                  desc: 'Immediate class with venue' 
                }
              ].map(sample => {
                const isSpeakingThis = activeSpeakingText === sample.text;
                return (
                  <button
                    key={sample.label}
                    onClick={() => handleTestSpeech(sample.text)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSpeakingThis
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                          {sample.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({sample.desc})</span>
                      </div>
                      <p className="text-xs font-medium text-white italic truncate">
                        &ldquo;{sample.text}&rdquo;
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg shrink-0 ${isSpeakingThis ? 'bg-cyan-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                      <Volume2 className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tone and Alarm Duration Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Sound Tone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Audio Synthesis Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'alarm', label: 'Urgent Alarm' },
                { id: 'chime', label: 'Melodic Chime' },
                { id: 'pulse', label: 'Alert Pulse' },
                { id: 'subtle', label: 'Gentle Bell' }
              ].map(tone => (
                <button
                  key={tone.id}
                  onClick={() => changeSoundType(tone.id as any)}
                  className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    preferences.soundType === tone.id
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alarm Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Audible Ring Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map(sec => (
                <button
                  key={sec}
                  onClick={() => changeAlarmDuration(sec)}
                  className={`p-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
                    (preferences.alarmDurationSeconds || 10) === sec
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sec} Seconds
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reminder Intervals */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block">
            Reminder Lead Times (Minutes Before Scheduled Sessions)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[60, 45, 30, 20, 15, 10, 5].map(min => {
              const isSelected = preferences.reminderIntervals.includes(min);
              return (
                <button
                  key={min}
                  onClick={() => toggleInterval(min)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {min} min before
                </button>
              );
            })}
          </div>

          {/* Custom interval adder */}
          <form onSubmit={handleAddCustomInterval} className="flex gap-2 max-w-xs pt-1">
            <input
              type="number"
              min="1"
              max="180"
              value={customIntervalInput}
              onChange={(e) => setCustomIntervalInput(e.target.value)}
              placeholder="Custom minutes (e.g. 25)"
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 flex-1 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
            >
              Add
            </button>
          </form>
        </div>

      </section>

      {/* 4. NOTIFICATION HISTORY FEED */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Delivered Notification Feed</h2>
            <span className="text-xs font-mono text-slate-400">({filteredNotifications.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              Mark all read
            </button>
            <button
              onClick={onClearNotifications}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg ${filterType === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('reminder')}
            className={`px-3 py-1 rounded-lg ${filterType === 'reminder' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            Academic Reminders
          </button>
          <button
            onClick={() => setFilterType('task')}
            className={`px-3 py-1 rounded-lg ${filterType === 'task' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            Personal Tasks
          </button>
          <button
            onClick={() => setFilterType('update')}
            className={`px-3 py-1 rounded-lg ${filterType === 'update' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            Timetable Updates
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No notifications matching current filter.
            </div>
          ) : (
            filteredNotifications.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.read ? 'bg-slate-950/40 border-slate-850 opacity-70' : 'bg-slate-950 border-cyan-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        item.type === 'reminder' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        item.type === 'task' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        item.type === 'cancelled' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-slate-900 text-slate-300'
                      }`}>
                        {item.type}
                      </span>
                      {item.courseCode && (
                        <span className="font-mono text-xs font-bold text-white">{item.courseCode}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
};
