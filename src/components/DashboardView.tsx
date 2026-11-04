import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Bell, 
  Calendar, 
  CheckCircle, 
  ArrowRight, 
  Volume2, 
  Sparkles,
  FileText,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { TimetableEntry, UserProfile, NotificationPreferences } from '../types/timetable';
import { NavTab } from './Navbar';

interface DashboardViewProps {
  timetable: TimetableEntry[];
  user: UserProfile;
  preferences: NotificationPreferences;
  onSelectCourse: (course: TimetableEntry) => void;
  onTriggerTestReminder: (course?: TimetableEntry) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  timetable,
  user,
  preferences,
  onSelectCourse,
  onTriggerTestReminder,
  onNavigateTab
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showScheduleImage, setShowScheduleImage] = useState<boolean>(false);

  // Keep live time ticking every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentDayIndex = currentTime.getDay(); // 0 is Sunday, 1 is Monday ... 5 is Friday
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Active courses (not cancelled)
  const activeTimetable = timetable.filter(c => !c.isCancelled);

  // Today's classes
  const todaysClasses = activeTimetable
    .filter(c => c.dayIndex === currentDayIndex)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // Find currently ongoing class
  const ongoingClass = todaysClasses.find(
    c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
  );

  // Find next upcoming class today
  const upcomingToday = todaysClasses.find(c => c.startMinutes > currentMinutes);

  // If no more classes today, find first class on next scheduled day
  const nextScheduledClass = upcomingToday || (() => {
    const sorted = [...activeTimetable].sort((a, b) => {
      // sort by days ahead
      const dayDiffA = (a.dayIndex - currentDayIndex + 7) % 7 || 7;
      const dayDiffB = (b.dayIndex - currentDayIndex + 7) % 7 || 7;
      if (dayDiffA !== dayDiffB) return dayDiffA - dayDiffB;
      return a.startMinutes - b.startMinutes;
    });
    return sorted[0];
  })();

  // Calculate remaining classes today
  const remainingTodayCount = todaysClasses.filter(c => c.endMinutes > currentMinutes).length;

  // Format today's date
  const dateFormatted = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const timeFormatted = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. WELCOME & TIME ZONE BANNER */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
              <span>{user.program}</span>
              <span className="text-slate-600">/</span>
              <span>{user.year} · {user.semester}</span>
              <span className="text-slate-600">/</span>
              <span>{preferences.timezone}</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your smart academic timetable is actively monitoring schedules. Next reminder is configured for{' '}
              <strong className="text-cyan-300">{preferences.reminderIntervals.join(', ')} minutes</strong> before each session with audible chime alert.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-right">
              <span className="text-[11px] text-slate-400 block">{dateFormatted}</span>
              <span className="text-xl font-bold text-cyan-400 block mt-0.5 tabular-nums">{timeFormatted}</span>
            </div>

            <button
              onClick={() => onTriggerTestReminder()}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              title="Test the synthetic audible reminder chime"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Test Chime</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. NEXT UPCOMING / ONGOING CLASS HERO SPOTLIGHT */}
      <section aria-labelledby="next-class-title">
        <div className="flex items-center justify-between mb-3">
          <h2 id="next-class-title" className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{ongoingClass ? 'Class in Progress Now' : 'Next Scheduled Session'}</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {ongoingClass ? 'Active Attendance' : 'Smart Reminder Armed'}
          </span>
        </div>

        {ongoingClass ? (
          <div className="rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold">IN PROGRESS NOW · CONCLUDES IN {ongoingClass.endMinutes - currentMinutes} MIN</span>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {ongoingClass.courseCode}: {ongoingClass.courseName}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Venue: {ongoingClass.venue} ({ongoingClass.building})
                  </span>
                  <span>·</span>
                  <span>Time: {ongoingClass.timeDisplay}</span>
                  <span>·</span>
                  <span>Lecturer: {ongoingClass.lecturer}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectCourse(ongoingClass)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
              >
                <span>View Course Notes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : nextScheduledClass ? (
          <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900 p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>
                    UPCOMING: {nextScheduledClass.day.toUpperCase()} · {nextScheduledClass.timeDisplay}
                  </span>
                  {nextScheduledClass.dayIndex === currentDayIndex && (
                    <span className="text-emerald-400 font-bold">
                      (Starts in {nextScheduledClass.startMinutes - currentMinutes} mins)
                    </span>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-white">
                  {nextScheduledClass.courseCode}: {nextScheduledClass.courseName}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Venue: {nextScheduledClass.venue} ({nextScheduledClass.building})
                  </span>
                  <span>·</span>
                  <span>Instructor: {nextScheduledClass.lecturer}</span>
                  <span>·</span>
                  <span className="text-slate-400">Alerts set for 30m, 15m, 5m</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onTriggerTestReminder(nextScheduledClass)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  title="Simulate prompt reminder alert"
                >
                  <Bell className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Simulate Alert</span>
                </button>

                <button
                  onClick={() => onSelectCourse(nextScheduledClass)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Syllabus & Info</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-slate-400 text-sm">
            No upcoming classes scheduled. Check your full weekly timetable.
          </div>
        )}
      </section>

      {/* 3. QUICK STATS SUMMARY CHIPS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-mono block">Classes Today</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">{todaysClasses.length}</span>
            <span className="text-xs text-cyan-400 font-mono">Sessions</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-mono block">Remaining Today</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">{remainingTodayCount}</span>
            <span className="text-xs text-slate-400 font-mono">Pending</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-mono block">Weekly Workload</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">28h</span>
            <span className="text-xs text-purple-400 font-mono">12 Modules</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-mono block">Primary Facilities</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-cyan-300 font-mono tabular-nums">3</span>
            <span className="text-xs text-slate-400 font-mono">LBB/SPD/ECA</span>
          </div>
        </div>
      </section>

      {/* 4. TODAY'S SCHEDULE TIMELINE */}
      <section aria-labelledby="today-schedule-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="today-schedule-title" className="text-lg font-bold text-white">
              Today's Classes ({currentTime.toLocaleDateString('en-US', { weekday: 'long' })})
            </h2>
            <p className="text-xs text-slate-400">All lectures and laboratory practicals scheduled for this date</p>
          </div>
          <button
            onClick={() => onNavigateTab('timetable')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            Full Weekly View
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No lectures scheduled for today</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Use this time for coursework, code revisions in interactive Python, or lab assignments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaysClasses.map((item) => {
              const isPast = currentMinutes >= item.endMinutes;
              const isNow = currentMinutes >= item.startMinutes && currentMinutes < item.endMinutes;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectCourse(item)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isNow
                      ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/40'
                      : isPast
                      ? 'bg-slate-900/50 border-slate-800 opacity-60'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-cyan-400">{item.courseCode}</span>
                      <span className="text-slate-400">{item.classType}</span>
                    </div>

                    <h4 className="text-base font-bold text-white leading-snug">
                      {item.courseName}
                    </h4>

                    <div className="space-y-1 text-xs font-mono text-slate-300 pt-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{item.timeDisplay}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-300">{item.venue} · {item.building}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">{item.lecturer}</span>
                    <span className="text-cyan-400 font-medium flex items-center gap-1">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {isNow && (
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-lg bg-cyan-600 text-[10px] font-bold text-white uppercase tracking-wider">
                      In Session
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. VERIFIED TIMETABLE SOURCE PREVIEW DRAWER */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Official Department Schedule Source Document</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified computer science faculty timetable image loaded from university records.
            </p>
          </div>
          <button
            onClick={() => setShowScheduleImage(!showScheduleImage)}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            {showScheduleImage ? 'Hide Source Image' : 'View Verified Image'}
          </button>
        </div>

        {showScheduleImage && (
          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 animate-in fade-in">
            <img 
              src="/public/assets/aistudio/image_04514670.png" 
              alt="Official BCS Computer Science Academic Timetable" 
              className="w-full max-h-[500px] object-contain rounded-lg mx-auto"
            />
            <div className="p-2 text-center text-[11px] font-mono text-slate-400">
              Department of Computer Science & Informatics · Verified Timetable Grid
            </div>
          </div>
        )}
      </section>

      {/* 6. CAMPUS LABORATORY & INFRASTRUCTURE DIRECTORY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Allocated Facilities & Laboratory Hubs</span>
            </h2>
            <p className="text-xs text-slate-400">Official lecture theatres and computer laboratories for BCS Year 3</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                LBB 016
              </span>
              <span className="text-[11px] font-mono text-emerald-400">Ground Floor</span>
            </div>
            <h3 className="font-bold text-white text-sm">Systems & Algorithms Computer Lab</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipped with 60 high-performance workstations for Automata Theory, Python Interactive Programming, Java, and Algorithms computing.
            </p>
            <div className="pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800">
              Main Science Quad · Wing A
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
                LBB 011
              </span>
              <span className="text-[11px] font-mono text-emerald-400">Ground Floor</span>
            </div>
            <h3 className="font-bold text-white text-sm">Networking & Analytics Facility</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipped with Cisco enterprise rack switch units and dual displays for Computer Networks, Network Programming, and Data Analysis.
            </p>
            <div className="pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800">
              Main Science Quad · Wing B
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950 border border-purple-800">
                ECA 301 / SPD 004
              </span>
              <span className="text-[11px] font-mono text-purple-400">Level 3 / Ground</span>
            </div>
            <h3 className="font-bold text-white text-sm">Engineering Amphitheatre & Studios</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tiered audio-visual auditorium optimized for Software Engineering symposia and Digital Signal Processing (DSP) lectures.
            </p>
            <div className="pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800">
              Engineering Complex & SPD
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
