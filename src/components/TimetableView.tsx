import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Calendar, 
  ListFilter, 
  Clock, 
  MapPin, 
  Download, 
  Printer, 
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { TimetableEntry, DayOfWeek, CourseDomain, ConflictReport } from '../types/timetable';
import { detectConflicts } from '../utils/storage';

interface TimetableViewProps {
  timetable: TimetableEntry[];
  onSelectCourse: (course: TimetableEntry) => void;
}

type ViewMode = 'grid' | 'agenda' | 'calendar';

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  onSelectCourse
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<CourseDomain | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [showConflictDetails, setShowConflictDetails] = useState<boolean>(false);

  // Run conflict detection across timetable
  const conflictReport: ConflictReport = detectConflicts(timetable);

  // Set of course IDs involved in conflicts
  const conflictingCourseIds = new Set<string>();
  conflictReport.conflictingEntries.forEach(c => {
    conflictingCourseIds.add(c.first.id);
    conflictingCourseIds.add(c.second.id);
  });

  // Filter courses
  const filteredCourses = timetable.filter(course => {
    // Search filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      course.courseCode.toLowerCase().includes(q) ||
      course.courseName.toLowerCase().includes(q) ||
      course.venue.toLowerCase().includes(q) ||
      course.lecturer.toLowerCase().includes(q) ||
      course.domainLabel.toLowerCase().includes(q);

    // Domain filter
    const matchesDomain = domainFilter === 'all' || course.domain === domainFilter;

    // Day filter
    const matchesDay = selectedDay === 'ALL' || course.day === selectedDay;

    // Conflict only filter
    const matchesConflict = !showConflictsOnly || conflictingCourseIds.has(course.id);

    return matchesSearch && matchesDomain && matchesDay && matchesConflict;
  });

  // Export full semester ICS
  const handleExportAllICS = () => {
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Academic Timetable//EN\r\n';
    timetable.forEach(c => {
      if (c.isCancelled) return;
      ics += [
        'BEGIN:VEVENT',
        `SUMMARY:${c.courseCode} - ${c.courseName}`,
        `LOCATION:${c.venue} (${c.building})`,
        `DESCRIPTION:${c.domainLabel}\\nLecturer: ${c.lecturer}\\n${c.description}`,
        'STATUS:CONFIRMED',
        'END:VEVENT\r\n'
      ].join('\r\n');
    });
    ics += 'END:VCALENDAR';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'academic_semester_timetable.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. CONTROLS & TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 no-print">
        
        {/* Top row: Search input + View switcher + Action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code (BCS 312), name, room, lecturer..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-400 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
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
            
            {/* View Mode Segmented Tabs */}
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
                <span>Grid</span>
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
                <span>Daily Agenda</span>
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
                <span>Planner</span>
              </button>
            </div>

            {/* ICS Export & Print */}
            <button
              onClick={handleExportAllICS}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download entire semester schedule to sync with Google Calendar / Outlook"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export .ICS</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

          </div>
        </div>

        {/* Second row: Domain Filters & Day Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Domain Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
            <span className="text-slate-400 font-mono text-[11px] mr-1 hidden sm:inline">DOMAIN:</span>
            
            <button
              onClick={() => setDomainFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                domainFilter === 'all'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Domains
            </button>

            <button
              onClick={() => setDomainFilter('core')}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                domainFilter === 'core'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              CS Core & Theory
            </button>

            <button
              onClick={() => setDomainFilter('programming')}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                domainFilter === 'programming'
                  ? 'bg-emerald-950 border border-emerald-500 text-emerald-400 font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Programming & Dev
            </button>

            <button
              onClick={() => setDomainFilter('data')}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                domainFilter === 'data'
                  ? 'bg-purple-950 border border-purple-500 text-purple-400 font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Data & Databases
            </button>

            <button
              onClick={() => setDomainFilter('systems')}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                domainFilter === 'systems'
                  ? 'bg-amber-950 border border-amber-500 text-amber-400 font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Networks & Systems
            </button>
          </div>

          {/* Day Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">DAY:</span>
            
            <button
              onClick={() => setSelectedDay('ALL')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                selectedDay === 'ALL'
                  ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>

            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  selectedDay === day
                    ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/50'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 2. CONFLICT DETECTION BANNER (If schedule overlaps detected) */}
      {conflictReport.hasConflict && (
        <aside aria-label="Timetable conflict alert" className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Timetable Conflict / Elective Overlap Detected ({conflictReport.conflictingEntries.length})</span>
            </div>
            <button
              onClick={() => setShowConflictDetails(!showConflictDetails)}
              className="text-xs text-amber-300 hover:text-amber-100 underline font-mono cursor-pointer"
            >
              {showConflictDetails ? 'Hide Details' : 'Inspect Overlaps'}
            </button>
          </div>

          <p className="text-amber-200/90 leading-relaxed">
            There is a scheduled overlap between Thursday elective track modules (BCS 366 Advanced Java: 10:00 AM - 12:00 PM at LBB 016, and BCS 352 DSP I: 11:00 AM - 1:00 PM at ECA 301).
          </p>

          {showConflictDetails && (
            <div className="mt-3 pt-3 border-t border-amber-800/80 space-y-2 font-mono text-[11px]">
              {conflictReport.conflictingEntries.map((c, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-900/60">
                  <span className="text-amber-400 font-bold block">{c.description}</span>
                  <span className="text-slate-400 block mt-1">
                    Affects students enrolled concurrently in {c.first.courseCode} and {c.second.courseCode}.
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* 3. TIMETABLE CONTENT VIEWPORT */}
      {filteredCourses.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Calendar className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-semibold text-white">No courses match your filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, domain category, or selected day.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDomainFilter('all');
              setSelectedDay('ALL');
              setShowConflictsOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* 3A. WEEKLY 5-COLUMN GRID MATRIX */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {days.map((day) => {
            const dayCourses = filteredCourses.filter(c => c.day === day);
            const isFaded = selectedDay !== 'ALL' && selectedDay !== day;

            return (
              <div
                key={day}
                className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-sm transition-opacity ${
                  isFaded ? 'opacity-30 pointer-events-none' : 'opacity-100'
                }`}
              >
                {/* Column Day Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wide">
                    {day}
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {dayCourses.length} {dayCourses.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                {/* Day Cards */}
                <div className="space-y-3 flex-1">
                  {dayCourses.length === 0 ? (
                    <div className="h-32 rounded-xl border border-dashed border-slate-800/80 flex flex-col items-center justify-center text-slate-600 text-xs text-center p-3">
                      <span>No sessions scheduled</span>
                    </div>
                  ) : (
                    dayCourses.map((course) => {
                      const hasConflict = conflictingCourseIds.has(course.id);
                      
                      return (
                        <div
                          key={course.id}
                          onClick={() => onSelectCourse(course)}
                          className={`timetable-card cursor-pointer group rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden border ${
                            course.isCancelled
                              ? 'bg-rose-950/20 border-rose-800/60 opacity-60'
                              : hasConflict
                              ? 'bg-slate-850 hover:bg-slate-800 border-amber-500/50'
                              : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-500/60'
                          }`}
                        >
                          {/* Code & Venue */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              {course.courseCode}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              <span>{course.venue}</span>
                            </span>
                          </div>

                          {/* Course Name */}
                          <h4 className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors line-clamp-2 leading-tight">
                            {course.courseName}
                          </h4>

                          {/* Time Slot & Lecturer */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-300">{course.timeDisplay}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                              {course.classType}
                            </span>
                          </div>

                          {/* Cancellation Banner */}
                          {course.isCancelled && (
                            <div className="mt-2 px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-mono">
                              Cancelled
                            </div>
                          )}

                          {/* Conflict Tag */}
                          {hasConflict && !course.isCancelled && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Time overlap</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : viewMode === 'agenda' ? (

        /* 3B. DAILY AGENDA DECK VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className="timetable-card cursor-pointer group bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-slate-950 border border-slate-800 text-cyan-400">
                    {course.day}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {course.courseCode} · {course.credits} Credits
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {course.courseName}
                </h3>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="space-y-1.5 pt-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{course.timeDisplay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300">{course.venue} · {course.building}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">{course.lecturer}</span>
                <span className="text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  View Syllabus <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* 3C. CHRONOLOGICAL PLANNER / TIMELINE MATRIX */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">Academic Session Planner Matrix</h3>
            <span className="text-xs text-slate-400 font-mono">BCS Year 3 Semester II</span>
          </div>

          <div className="divide-y divide-slate-800">
            {filteredCourses
              .sort((a, b) => a.dayIndex - b.dayIndex || a.startMinutes - b.startMinutes)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCourse(c)}
                  className="p-4 hover:bg-slate-850/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-20 font-mono font-bold text-cyan-400 uppercase text-xs">
                      {c.day}
                    </span>
                    <span className="w-36 font-mono text-slate-300">
                      {c.timeDisplay}
                    </span>
                    <div>
                      <span className="font-bold text-white block sm:inline">{c.courseCode} · </span>
                      <span className="text-slate-200">{c.courseName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 font-mono shrink-0">
                    <span className="text-cyan-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {c.venue}
                    </span>
                    <span className="hidden md:inline">{c.lecturer}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
          </div>
        </div>

      )}

    </div>
  );
};
