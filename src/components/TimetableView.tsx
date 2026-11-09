import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Calendar, 
  ListFilter, 
  Clock, 
  MapPin, 
  Download, 
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  BookOpen,
  User,
  CheckSquare,
  Square,
  Bell,
  Info,
  Phone
} from 'lucide-react';
import { 
  TimetableEntry, 
  DayOfWeek, 
  CourseDomain, 
  ConflictReport, 
  PersonalTask,
  OccurrenceOverride 
} from '../types/timetable';
import { detectConflicts } from '../utils/storage';

interface TimetableViewProps {
  timetable: TimetableEntry[];
  tasks?: PersonalTask[];
  onSelectCourse: (course: TimetableEntry) => void;
  onSelectTask?: (task: PersonalTask) => void;
  onToggleTaskComplete?: (taskId: string, currentStatus: string) => void;
}

type ViewMode = 'grid' | 'agenda' | 'calendar';
type ActivityFilter = 'all' | 'classes' | 'tasks';

// 7-day schedule strictly starting on Sunday
const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  tasks = [],
  onSelectCourse,
  onSelectTask,
  onToggleTaskComplete
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<CourseDomain | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [showConflictDetails, setShowConflictDetails] = useState<boolean>(false);

  // Run conflict detection
  const conflictReport: ConflictReport = detectConflicts(timetable, tasks);

  const conflictingCourseIds = new Set<string>();
  conflictReport.conflictingEntries.forEach(c => {
    conflictingCourseIds.add(c.first.id);
    conflictingCourseIds.add(c.second.id);
  });

  // Filter courses
  const filteredCourses = timetable.filter(course => {
    if (activityFilter === 'tasks') return false;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      course.courseCode.toLowerCase().includes(q) ||
      course.courseName.toLowerCase().includes(q) ||
      course.venue.toLowerCase().includes(q) ||
      course.lecturer.toLowerCase().includes(q) ||
      course.domainLabel.toLowerCase().includes(q);

    const matchesDomain = domainFilter === 'all' || course.domain === domainFilter;
    const matchesDay = selectedDay === 'ALL' || course.day === selectedDay;
    const matchesConflict = !showConflictsOnly || conflictingCourseIds.has(course.id);

    return matchesSearch && matchesDomain && matchesDay && matchesConflict;
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (activityFilter === 'classes') return false;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      (task.location && task.location.toLowerCase().includes(q));

    // Determine day from task date
    const taskDateObj = new Date(task.date);
    const taskDay = DAYS_OF_WEEK[taskDateObj.getDay()];
    const matchesDay = selectedDay === 'ALL' || taskDay === selectedDay;

    return matchesSearch && matchesDay;
  });

  // Export full schedule ICS
  const handleExportAllICS = () => {
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Smart Remind Unified//EN\r\n';
    
    // Add Courses
    timetable.forEach(c => {
      ics += [
        'BEGIN:VEVENT',
        `SUMMARY:[Class] ${c.courseCode} - ${c.courseName}`,
        `LOCATION:${c.venue}`,
        `DESCRIPTION:${c.domainLabel}\\nLecturer: ${c.lecturer}\\n${c.description}`,
        'STATUS:CONFIRMED',
        'END:VEVENT\r\n'
      ].join('\r\n');
    });

    // Add Tasks
    tasks.forEach(t => {
      ics += [
        'BEGIN:VEVENT',
        `SUMMARY:[Task] ${t.title} (${t.category})`,
        `LOCATION:${t.location || 'Personal'}`,
        `DESCRIPTION:${t.description}`,
        'STATUS:CONFIRMED',
        'END:VEVENT\r\n'
      ].join('\r\n');
    });

    ics += 'END:VCALENDAR';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'smart_remind_academic_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. CONTROLS & TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4 no-print">
        
        {/* Top row: Search input + View switcher + Action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code (e.g. BCS 312), lecturer, venue..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-400 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-cyan-500 font-mono transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Switcher & Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Filter: All vs Classes vs Tasks */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl" role="tablist">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityFilter === 'all'
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter('classes')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityFilter === 'classes'
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Official Courses
              </button>
              <button
                onClick={() => setActivityFilter('tasks')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityFilter === 'tasks'
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Personal Tasks
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl" role="tablist">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>7-Day Grid</span>
              </button>

              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
            </div>

            {/* Export ICS */}
            <button
              onClick={handleExportAllICS}
              title="Export complete schedule to Apple/Google/Outlook Calendar"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ICS</span>
            </button>
          </div>

        </div>

        {/* Second row: Mobile-First Day Selector (Sunday first) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          
          {/* 7-Day Day Selector Buttons: Sunday to Saturday */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-[11px] font-mono text-slate-400 uppercase mr-1 shrink-0">Day:</span>
            <button
              onClick={() => setSelectedDay('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
                selectedDay === 'ALL'
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              All 7 Days
            </button>
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = selectedDay === d;
              const dayCoursesCount = timetable.filter(c => c.day === d).length;
              const dayTasksCount = tasks.filter(t => DAYS_OF_WEEK[new Date(t.date).getDay()] === d).length;
              const totalCount = dayCoursesCount + dayTasksCount;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{d.slice(0, 3)}</span>
                  {totalCount > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-cyan-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Conflict Filter Toggle */}
          {conflictReport.hasConflict && (
            <button
              onClick={() => setShowConflictsOnly(!showConflictsOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showConflictsOnly
                  ? 'bg-amber-950 border border-amber-600 text-amber-300 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-amber-400 hover:bg-slate-850'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{conflictReport.conflictingEntries.length} Conflicts</span>
            </button>
          )}

        </div>

      </div>

      {/* 2. CONFLICT DIAGNOSTIC BANNER */}
      {conflictReport.hasConflict && (
        <aside 
          aria-label="Schedule conflict warnings"
          className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 text-xs text-amber-200 space-y-2 no-print"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold font-mono text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Schedule Warning: {conflictReport.conflictingEntries.length} Overlapping Sessions Detected</span>
            </div>
            <button
              onClick={() => setShowConflictDetails(!showConflictDetails)}
              className="text-[11px] underline hover:text-white font-mono cursor-pointer"
            >
              {showConflictDetails ? 'Hide Details' : 'View Conflict Breakdown'}
            </button>
          </div>

          {showConflictDetails && (
            <div className="pt-2 border-t border-amber-900/60 space-y-1.5 font-mono text-[11px]">
              {conflictReport.conflictingEntries.map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-950/60 border border-amber-900/40 flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">#{i + 1}</span>
                  <div>
                    <span className="font-semibold text-white">{c.type.toUpperCase()}: </span>
                    <span className="text-amber-200/90">{c.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* 3. VIEW MODE 1: 7-DAY WEEKLY GRID (SUNDAY TO SATURDAY) */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-start">
            {DAYS_OF_WEEK.map((day) => {
              if (selectedDay !== 'ALL' && selectedDay !== day) return null;

              const dayCourses = filteredCourses
                .filter(c => c.day === day)
                .sort((a, b) => a.startMinutes - b.endMinutes);

              const dayTasks = filteredTasks.filter(t => {
                const d = new Date(t.date);
                return DAYS_OF_WEEK[d.getDay()] === day;
              });

              const isSunday = day === 'Sunday';
              const isSaturday = day === 'Saturday';

              return (
                <div
                  key={day}
                  className={`bg-slate-900/90 border rounded-2xl overflow-hidden flex flex-col ${
                    isSunday ? 'border-purple-800/60 shadow-lg shadow-purple-950/20' :
                    isSaturday ? 'border-blue-800/60' :
                    'border-slate-800'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${
                    isSunday ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' :
                    isSaturday ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' :
                    'bg-slate-950/80 border-slate-800 text-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight">{day}</span>
                      {isSunday && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-900/80 text-purple-200">
                          Day 1
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {dayCourses.length + dayTasks.length} events
                    </span>
                  </div>

                  {/* Day Sessions List */}
                  <div className="p-3 space-y-3 min-h-[140px]">
                    {dayCourses.length === 0 && dayTasks.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                        <span className="text-xs font-mono">No scheduled events</span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {isSunday || isSaturday ? 'Open for study & rest' : 'Free session window'}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Render Courses (DISTINCT SMART COURSE CARD) */}
                        {dayCourses.map((course) => {
                          const isConflicted = conflictingCourseIds.has(course.id);
                          const overrides = course.occurrenceOverrides || [];
                          const hasCancelledOverride = overrides.some(o => o.status === 'cancelled');
                          const hasRescheduledOverride = overrides.some(o => o.status === 'rescheduled');

                          return (
                            <div
                              key={course.id}
                              onClick={() => onSelectCourse(course)}
                              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer group shadow-sm ${
                                hasCancelledOverride
                                  ? 'bg-rose-950/20 border-rose-800/70 hover:border-rose-500'
                                  : isConflicted
                                  ? 'bg-amber-950/20 border-amber-600/60 hover:border-amber-500 hover:bg-slate-850'
                                  : 'bg-slate-950/90 border-slate-800 hover:border-cyan-500 hover:bg-slate-850'
                              }`}
                            >
                              {/* Top Bar: Code + Time */}
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="font-mono text-xs font-extrabold text-cyan-400 group-hover:text-cyan-300">
                                  {course.courseCode}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  {course.startTime}
                                </span>
                              </div>

                              {/* Course Name */}
                              <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
                                {course.courseName}
                              </h4>

                              {/* Venue (Free text) & Lecturer */}
                              <div className="mt-2.5 pt-2 border-t border-slate-850 space-y-1 text-[11px] font-mono">
                                <div className="flex items-center gap-1.5 text-slate-200">
                                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span className="truncate font-semibold">{course.venue}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 text-slate-400 text-[10px]">
                                  <div className="flex items-center gap-1 truncate">
                                    <User className="w-3 h-3 text-cyan-400 shrink-0" />
                                    <span className="truncate">{course.lecturer}</span>
                                  </div>
                                  {course.lecturerPhone && (
                                    <a
                                      href={`tel:${course.lecturerPhone}`}
                                      className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] shrink-0 inline-flex items-center gap-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Call Lecturer"
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>{course.lecturerPhone}</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Occurrence Override Notice if applicable */}
                              {hasCancelledOverride && (
                                <div className="mt-2 px-2 py-1 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-300 text-[10px] font-mono">
                                  Class cancelled for upcoming date. Resumes next week.
                                </div>
                              )}
                              {hasRescheduledOverride && (
                                <div className="mt-2 px-2 py-1 rounded-lg bg-cyan-950/90 border border-cyan-800 text-cyan-300 text-[10px] font-mono">
                                  Date rescheduled. Tap for details.
                                </div>
                              )}

                              {/* Card Action Link */}
                              <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-cyan-400 font-semibold group-hover:text-cyan-300">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  <span>Session & Notes</span>
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          );
                        })}

                        {/* Render Personal Tasks (DISTINCT PERSONAL TASK CARD) */}
                        {dayTasks.map((task) => {
                          const isDone = task.status === 'completed';

                          return (
                            <div
                              key={task.id}
                              onClick={() => onSelectTask && onSelectTask(task)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                isDone
                                  ? 'bg-slate-950/40 border-slate-850 opacity-60'
                                  : 'bg-purple-950/20 border-purple-800/50 hover:border-purple-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[9px] uppercase font-bold text-purple-300 px-1.5 py-0.5 rounded bg-purple-900/60">
                                  Task · {task.category}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {task.startTime}
                                </span>
                              </div>

                              <div className="flex items-start gap-2 mt-1">
                                {onToggleTaskComplete && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleTaskComplete(task.id, task.status);
                                    }}
                                    className="mt-0.5 text-purple-400 hover:text-purple-300"
                                  >
                                    {isDone ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <h4 className={`text-xs font-semibold leading-tight ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {task.title}
                                </h4>
                              </div>

                              {task.location && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                                  <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                                  <span className="truncate">{task.location}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VIEW MODE 2: DAILY AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            if (selectedDay !== 'ALL' && selectedDay !== day) return null;

            const dayCourses = filteredCourses
              .filter(c => c.day === day)
              .sort((a, b) => a.startMinutes - b.endMinutes);

            const dayTasks = filteredTasks.filter(t => {
              const d = new Date(t.date);
              return DAYS_OF_WEEK[d.getDay()] === day;
            });

            if (dayCourses.length === 0 && dayTasks.length === 0) return null;

            return (
              <div key={day} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                    <h3 className="text-lg font-bold text-white tracking-tight">{day}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {dayCourses.length} official courses · {dayTasks.length} personal tasks
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Official Course Rows */}
                  {dayCourses.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCourse(c)}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-cyan-400">{c.courseCode}</span>
                          <span className="text-xs font-mono text-slate-400">· {c.classType}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                            Academic Course
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{c.courseName}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            {c.timeDisplay}
                          </span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            {c.venue}
                          </span>
                          <span>Lecturer: {c.lecturer}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Session Notes & Materials</span>
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                  ))}

                  {/* Personal Task Rows */}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask && onSelectTask(t)}
                      className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/50 hover:border-purple-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-300">PERSONAL TASK</span>
                          <span className="text-xs font-mono text-slate-400">· {t.category.toUpperCase()}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-200 font-mono">
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{t.title}</h4>
                        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            {t.startTime} - {t.endTime}
                          </span>
                          {t.location && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              {t.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 self-end sm:self-center" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. VIEW MODE 3: MONTH PLANNER VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Monthly Academic Semester View</h3>
            <span className="text-xs font-mono text-slate-400">Weekly schedule mapped over semester cycle</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-b border-slate-800">
                {d.slice(0, 3)}
              </div>
            ))}
            {/* 35 Calendar day cells */}
            {Array.from({ length: 35 }).map((_, idx) => {
              const dayOfWeek = DAYS_OF_WEEK[idx % 7];
              const dayCourses = timetable.filter(c => c.day === dayOfWeek);
              const dayTasks = tasks.filter(t => {
                const d = new Date(t.date);
                return DAYS_OF_WEEK[d.getDay()] === dayOfWeek;
              });

              return (
                <div key={idx} className="min-h-[85px] p-2 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    {(idx % 31) + 1}
                  </span>
                  <div className="space-y-1">
                    {dayCourses.slice(0, 2).map(c => (
                      <div
                        key={c.id}
                        onClick={() => onSelectCourse(c)}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 truncate cursor-pointer hover:border-cyan-400"
                        title={c.courseName}
                      >
                        {c.courseCode}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map(t => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask && onSelectTask(t)}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 truncate cursor-pointer hover:border-purple-400"
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
