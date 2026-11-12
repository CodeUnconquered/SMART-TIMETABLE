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
  ChevronRight, 
  BookOpen, 
  Plus, 
  CheckSquare, 
  VolumeX,
  User,
  Info,
  Phone
} from 'lucide-react';
import { TimetableEntry, UserProfile, NotificationPreferences, PersonalTask, SessionNote } from '../types/timetable';
import { NavTab } from './Navbar';

interface DashboardViewProps {
  timetable: TimetableEntry[];
  tasks?: PersonalTask[];
  notes?: SessionNote[];
  user: UserProfile;
  preferences: NotificationPreferences;
  onSelectCourse: (course: TimetableEntry) => void;
  onSelectTask?: (task: PersonalTask) => void;
  onTriggerTestReminder: (course?: TimetableEntry) => void;
  onOpenNoteModal?: (note?: SessionNote | null, courseCode?: string) => void;
  onOpenTaskModal?: (task?: PersonalTask | null) => void;
  onNavigateTab: (tab: NavTab) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  timetable,
  tasks = [],
  notes = [],
  user,
  preferences,
  onSelectCourse,
  onSelectTask,
  onTriggerTestReminder,
  onOpenNoteModal,
  onOpenTaskModal,
  onNavigateTab
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentDayIndex = currentTime.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const currentDayName = DAYS_OF_WEEK[currentDayIndex];
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentDateStr = currentTime.toISOString().split('T')[0];

  // Active courses for today, taking occurrence overrides into account
  const todaysClasses = timetable
    .filter(course => {
      // Check if course has an override specifically on today's date
      const overrides = course.occurrenceOverrides || [];
      const todayOverride = overrides.find(o => o.date === currentDateStr);
      
      // If cancelled today, exclude from active classes
      if (todayOverride && todayOverride.status === 'cancelled') {
        return false;
      }

      // If scheduled day is today
      if (course.day === currentDayName) {
        return true;
      }

      // If rescheduled to today from another day
      const rescheduledToToday = overrides.find(
        o => o.status === 'rescheduled' && o.rescheduledDate === currentDateStr
      );
      return !!rescheduledToToday;
    })
    .map(course => {
      // If rescheduled to today with new times, adapt display
      const overrides = course.occurrenceOverrides || [];
      const rescheduledToToday = overrides.find(
        o => o.status === 'rescheduled' && o.rescheduledDate === currentDateStr
      );
      if (rescheduledToToday) {
        return {
          ...course,
          startTime: rescheduledToToday.rescheduledStartTime || course.startTime,
          endTime: rescheduledToToday.rescheduledEndTime || course.endTime,
          timeDisplay: rescheduledToToday.rescheduledTimeDisplay || course.timeDisplay,
          venue: rescheduledToToday.rescheduledVenue || course.venue
        };
      }
      return course;
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // Today's tasks
  const todaysTasks = tasks
    .filter(t => t.date === currentDateStr || (t.recurring?.enabled && t.recurring.days.includes(currentDayName as any)))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // Find currently ongoing class
  const ongoingClass = todaysClasses.find(
    c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
  );

  // Find next upcoming class today
  const upcomingToday = todaysClasses.find(c => c.startMinutes > currentMinutes);

  // Next scheduled class (today or upcoming day)
  const nextScheduledClass = upcomingToday || (() => {
    const sorted = [...timetable].sort((a, b) => {
      const dayDiffA = (a.dayIndex - currentDayIndex + 7) % 7 || 7;
      const dayDiffB = (b.dayIndex - currentDayIndex + 7) % 7 || 7;
      if (dayDiffA !== dayDiffB) return dayDiffA - dayDiffB;
      return a.startMinutes - b.startMinutes;
    });
    return sorted[0];
  })();

  const currentHour = currentTime.getHours();
  const timeGreeting = currentHour >= 5 && currentHour < 12 
    ? 'Good morning! ☀️' 
    : currentHour >= 12 && currentHour < 18 
    ? 'Good afternoon! 👋' 
    : 'Good evening! 🌙';

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. WELCOME & MOTIVATIONAL STATEMENT BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-cyan-400 font-semibold tracking-wide flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Smart Academic & Personal Productivity</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {timeGreeting}
            </h1>
            
            <p className="text-base sm:text-lg font-semibold text-cyan-400">
              Plan your day. Stay focused. Make every moment count.
            </p>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your time, your plans, your progress — all in one place. <strong>Smart Remind</strong> is actively managing your schedule with automated background reminders and audible alarms.
            </p>
          </div>
        </div>
      </section>

      {/* 2. QUICK ACTION LAUNCHPAD */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onOpenTaskModal && onOpenTaskModal(null)}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-850 text-left transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center mb-2">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white block">Add Personal Task</span>
          <span className="text-[11px] text-slate-400 block">Study sessions, projects</span>
        </button>

        <button
          onClick={() => onOpenNoteModal && onOpenNoteModal(null)}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-850 text-left transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center mb-2">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white block">Take Session Note</span>
          <span className="text-[11px] text-slate-400 block">Record lecture insights</span>
        </button>

        <button
          onClick={() => onNavigateTab('notes')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-850 text-left transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mb-2">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white block">Notes & Materials</span>
          <span className="text-[11px] text-slate-400 block">{notes.length} notes & docs stored</span>
        </button>

        <button
          onClick={() => onNavigateTab('timetable')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-850 text-left transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white block">7-Day Schedule</span>
          <span className="text-[11px] text-slate-400 block">Sunday to Saturday</span>
        </button>
      </section>

      {/* 3. NEXT UPCOMING / ONGOING CLASS HERO SPOTLIGHT */}
      <section aria-labelledby="next-class-title">
        <div className="flex items-center justify-between mb-3">
          <h2 id="next-class-title" className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{ongoingClass ? 'Ongoing Session Right Now' : 'Next Scheduled Session'}</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {ongoingClass ? 'Active Session' : nextScheduledClass ? `${nextScheduledClass.day}` : 'Schedule Clear'}
          </span>
        </div>

        {ongoingClass ? (
          <div className="relative overflow-hidden rounded-3xl bg-emerald-950/30 border-2 border-emerald-500/70 p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    In Progress · Ends at {ongoingClass.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black font-mono text-emerald-300">{ongoingClass.courseCode}</span>
                  <span className="text-xl font-bold text-white">{ongoingClass.courseName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5 text-white">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <strong>{ongoingClass.venue}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Lecturer: {ongoingClass.lecturer}</span>
                    {ongoingClass.lecturerPhone && (
                      <a 
                        href={`tel:${ongoingClass.lecturerPhone}`} 
                        className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-mono text-[11px]"
                        title="Call Lecturer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>{ongoingClass.lecturerPhone}</span>
                      </a>
                    )}
                  </span>
                  <span>Type: {ongoingClass.classType}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenNoteModal && (
                  <button
                    onClick={() => onOpenNoteModal(null, ongoingClass.courseCode)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Take Session Note</span>
                  </button>
                )}
                <button
                  onClick={() => onSelectCourse(ongoingClass)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  View Syllabus
                </button>
              </div>
            </div>
          </div>
        ) : nextScheduledClass ? (
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl hover:border-cyan-500/60 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono font-bold">
                    {nextScheduledClass.day} {nextScheduledClass.timeDisplay}
                  </span>
                  {nextScheduledClass.day === currentDayName && (
                    <span className="text-xs font-mono text-amber-400">
                      Starts in {Math.max(0, nextScheduledClass.startMinutes - currentMinutes)} minutes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black font-mono text-cyan-400">{nextScheduledClass.courseCode}</span>
                  <span className="text-xl font-bold text-white">{nextScheduledClass.courseName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {nextScheduledClass.venue}
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Lecturer: {nextScheduledClass.lecturer}</span>
                    {nextScheduledClass.lecturerPhone && (
                      <a 
                        href={`tel:${nextScheduledClass.lecturerPhone}`} 
                        className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-mono text-[11px]"
                        title="Call Lecturer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>{nextScheduledClass.lecturerPhone}</span>
                      </a>
                    )}
                  </span>
                  <span>Track: {nextScheduledClass.domainLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => onTriggerTestReminder(nextScheduledClass)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Test alarm alert for this session"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Alarm Test</span>
                </button>
                <button
                  onClick={() => onSelectCourse(nextScheduledClass)}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/60 cursor-pointer"
                >
                  <span>Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">All lectures completed for today</p>
            <p className="text-xs text-slate-400 mt-1">Review your personal tasks or notes for upcoming modules.</p>
          </div>
        )}
      </section>

      {/* 4. TODAY'S UNIFIED TIMELINE (CLASSES + TASKS) */}
      <section aria-labelledby="today-timeline-title">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="today-timeline-title" className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Today's Complete Schedule ({currentDayName})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {todaysClasses.length} university lectures & {todaysTasks.length} personal tasks
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('timetable')}
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full 7-Day Timetable</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaysClasses.length === 0 && todaysTasks.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
            <p className="text-xs font-mono">No lectures or tasks scheduled for {currentDayName}.</p>
            <button
              onClick={() => onOpenTaskModal && onOpenTaskModal(null)}
              className="mt-3 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Study Session</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Render Official Courses */}
            {todaysClasses.map(course => {
              const isPast = course.endMinutes <= currentMinutes;
              const isNow = currentMinutes >= course.startMinutes && currentMinutes < course.endMinutes;

              return (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse(course)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isNow
                      ? 'bg-emerald-950/20 border-emerald-500 shadow-lg'
                      : isPast
                      ? 'bg-slate-950/40 border-slate-850 opacity-60'
                      : 'bg-slate-900 border-slate-800 hover:border-cyan-500'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-cyan-400">{course.courseCode}</span>
                      <span className="text-xs text-slate-400">· {course.classType}</span>
                      {isNow && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          NOW
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white">{course.courseName}</h4>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {course.timeDisplay}
                      </span>
                      <span className="flex items-center gap-1 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {course.venue}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerTestReminder(course);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Trigger 10s Alarm for this class"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              );
            })}

            {/* Render Personal Tasks */}
            {todaysTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectTask && onSelectTask(task)}
                className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/50 hover:border-purple-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-purple-300">
                      PERSONAL TASK · {task.category}
                    </span>
                    <span className="text-[10px] px-1.5 rounded bg-purple-900/60 text-purple-200 font-mono">
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {task.startTime} - {task.endTime}
                    </span>
                    {task.location && (
                      <span className="flex items-center gap-1 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {task.location}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 self-end sm:self-center" />
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
