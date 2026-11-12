import React, { useEffect, useState } from 'react';
import { BellRing, VolumeX, Volume2, CheckCircle, Clock, MapPin } from 'lucide-react';
import { stopProlongedAlarm, stopVoiceAnnouncement } from '../utils/audio';

interface AlarmRingingModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  courseCode?: string;
  venue?: string;
  timeSlot?: string;
  spokenAnnouncement?: string;
  durationSeconds?: number;
  onDismiss: () => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  isOpen,
  title,
  message,
  courseCode,
  venue,
  timeSlot,
  spokenAnnouncement,
  durationSeconds = 10,
  onDismiss
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(durationSeconds);

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, durationSeconds]);

  if (!isOpen) return null;

  const handleStop = () => {
    stopProlongedAlarm();
    stopVoiceAnnouncement();
    onDismiss();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl text-slate-100 overflow-hidden animate-in zoom-in-95">
        
        {/* Pulsing ring background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        {/* Top header with animated bell */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 animate-bounce">
            <BellRing className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-mono font-semibold uppercase tracking-wider animate-pulse">
                Audible Alarm Active
              </span>
              <span className="text-xs font-mono text-slate-400">
                {secondsRemaining > 0 ? `${secondsRemaining}s auto-stop` : 'Completed'}
              </span>
            </div>
            <h2 id="alarm-modal-title" className="text-lg font-bold text-white tracking-tight mt-0.5">
              {title}
            </h2>
          </div>
        </div>

        {/* Course / Event Details Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
          {courseCode && (
            <div className="text-sm font-mono font-bold text-cyan-400">
              {courseCode}
            </div>
          )}
          <p className="text-sm text-slate-300 leading-relaxed">
            {message}
          </p>

          {spokenAnnouncement && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs shadow-inner">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <div className="leading-snug">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wide block">Spoken Voice Announcement</span>
                <span className="italic text-slate-100">&ldquo;{spokenAnnouncement}&rdquo;</span>
              </div>
            </div>
          )}

          {(venue || timeSlot) && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
              {timeSlot && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{timeSlot}</span>
                </div>
              )}
              {venue && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{venue}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleStop}
            className="flex-1 py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
            <span>Stop Alarm</span>
          </button>

          <button
            onClick={handleStop}
            className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-slate-400" />
            <span>Dismiss</span>
          </button>
        </div>

      </div>
    </div>
  );
};
