import React, { useState } from 'react';
import { 
  Shield, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  Send,
  History,
  FileCheck,
  Edit,
  UserCheck
} from 'lucide-react';
import { TimetableEntry, DayOfWeek, TimetableChangeLog, CourseDomain, ClassType, ConflictReport } from '../types/timetable';
import { detectConflicts } from '../utils/storage';

interface AdminPanelProps {
  timetable: TimetableEntry[];
  changeLogs: TimetableChangeLog[];
  onAddCourse: (entry: Omit<TimetableEntry, 'id'>) => Promise<boolean>;
  onRescheduleCourse: (courseId: string, updates: Partial<TimetableEntry>) => Promise<boolean>;
  onCancelCourse: (courseId: string, reason: string) => Promise<boolean>;
  onRestoreCourse: (courseId: string) => Promise<boolean>;
  onBroadcastAnnouncement: (title: string, message: string) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  timetable,
  changeLogs,
  onAddCourse,
  onRescheduleCourse,
  onCancelCourse,
  onRestoreCourse,
  onBroadcastAnnouncement
}) => {
  const [activeModal, setActiveModal] = useState<'none' | 'add' | 'reschedule' | 'cancel' | 'announce'>('none');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // Reschedule form state
  const [rescheduleDay, setRescheduleDay] = useState<DayOfWeek>('Monday');
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('08:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>('10:00');
  const [rescheduleVenue, setRescheduleVenue] = useState<string>('LBB 016');
  
  // Cancel form state
  const [cancelReason, setCancelReason] = useState<string>('Instructor on official academic symposium leave');

  // Announcement state
  const [announceTitle, setAnnounceTitle] = useState<string>('Mid-Semester Examination Schedule Notice');
  const [announceMsg, setAnnounceMsg] = useState<string>('All laboratory practical evaluations commence next week in LBB 016 and LBB 011. Please inspect your individual project requirements.');

  // Add course state
  const [newCode, setNewCode] = useState('BCS 399');
  const [newName, setNewName] = useState('Distributed Cloud Architecture');
  const [newLecturer, setNewLecturer] = useState('Dr. Alice Mwamburi');
  const [newDay, setNewDay] = useState<DayOfWeek>('Wednesday');
  const [newStart, setNewStart] = useState('11:00');
  const [newEnd, setNewEnd] = useState('13:00');
  const [newVenue, setNewVenue] = useState('LBB 016');
  const [newDomain, setNewDomain] = useState<CourseDomain>('systems');
  const [newClassType, setNewClassType] = useState<ClassType>('Lecture');
  const [newCredits, setNewCredits] = useState(3);
  const [newDesc, setNewDesc] = useState('Cloud computing principles, distributed consensus algorithms, and Kubernetes orchestrations.');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const conflictReport: ConflictReport = detectConflicts(timetable);

  const daysList: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const venuesList = ['LBB 016', 'LBB 011', 'SPD 004', 'ECA 301', 'ECA 205', 'Main Auditorium'];

  const handleOpenReschedule = (courseId: string) => {
    const course = timetable.find(c => c.id === courseId);
    if (!course) return;
    setSelectedCourseId(courseId);
    setRescheduleDay(course.day);
    setRescheduleStartTime(course.startTime);
    setRescheduleEndTime(course.endTime);
    setRescheduleVenue(course.venue);
    setActiveModal('reschedule');
  };

  const handleOpenCancel = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveModal('cancel');
  };

  const submitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = timetable.find(c => c.id === selectedCourseId);
    if (!course) return;

    // Convert time to minutes
    const [sH, sM] = rescheduleStartTime.split(':').map(Number);
    const [eH, eM] = rescheduleEndTime.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    const timeDisplay = `${formatTimeAmPm(rescheduleStartTime)} - ${formatTimeAmPm(rescheduleEndTime)}`;

    const success = await onRescheduleCourse(selectedCourseId, {
      day: rescheduleDay,
      dayIndex: daysList.indexOf(rescheduleDay) + 1,
      startTime: rescheduleStartTime,
      endTime: rescheduleEndTime,
      timeDisplay,
      startMinutes: startM,
      endMinutes: endM,
      venue: rescheduleVenue
    });

    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `Successfully rescheduled ${course.courseCode} to ${rescheduleDay} ${timeDisplay} at ${rescheduleVenue}. Students notified.`
      });
      setActiveModal('none');
    }
  };

  const submitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = timetable.find(c => c.id === selectedCourseId);
    if (!course) return;

    const success = await onCancelCourse(selectedCourseId, cancelReason);
    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `Cancelled session for ${course.courseCode}. Notifications dispatched to cohort.`
      });
      setActiveModal('none');
    }
  };

  const submitAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const [sH, sM] = newStart.split(':').map(Number);
    const [eH, eM] = newEnd.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    const timeDisplay = `${formatTimeAmPm(newStart)} - ${formatTimeAmPm(newEnd)}`;

    const success = await onAddCourse({
      courseCode: newCode,
      courseName: newName,
      lecturer: newLecturer,
      day: newDay,
      dayIndex: daysList.indexOf(newDay) + 1,
      startTime: newStart,
      endTime: newEnd,
      timeDisplay,
      startMinutes: startM,
      endMinutes: endM,
      venue: newVenue,
      building: newVenue.includes('LBB') ? 'Main Science Quad' : 'Engineering Complex',
      classType: newClassType,
      domain: newDomain,
      domainLabel: newDomain === 'core' ? 'CS Core' : newDomain === 'programming' ? 'Programming & Dev' : 'Systems & Networks',
      credits: newCredits,
      colorTheme: newDomain === 'core' ? 'cyan' : newDomain === 'programming' ? 'emerald' : 'amber',
      description: newDesc,
      techStack: ['Distributed Systems', 'Cloud APIs', 'Docker']
    });

    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `New curriculum entry ${newCode} published into active timetable.`
      });
      setActiveModal('none');
    }
  };

  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await onBroadcastAnnouncement(announceTitle, announceMsg);
    setFeedbackMsg({
      type: 'success',
      text: 'Departmental timetable announcement broadcast to all students.'
    });
    setActiveModal('none');
  };

  function formatTimeAmPm(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. ADMIN HEADER */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold mb-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Timetable Directorate · Administrative Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Academic Timetable & Schedule Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Add courses, reschedule lectures, detect room conflicts, cancel classes, and publish synchronized updates directly to students' mobile devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveModal('add')}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </button>

            <button
              onClick={() => setActiveModal('announce')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>
      </section>

      {/* FEEDBACK TOAST BANNER */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : 'bg-rose-950/80 border-rose-700 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. LIVE CONFLICT DETECTION ENGINE */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Timetable Conflict & Overlap Detection Scanner
            </h2>
          </div>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
            conflictReport.hasConflict
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
          }`}>
            {conflictReport.hasConflict ? `${conflictReport.conflictingEntries.length} Conflicts Found` : '0 Conflicts Detected'}
          </span>
        </div>

        {conflictReport.hasConflict ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              The automated validator checks every course for overlapping room assignments, lecturer double-bookings, and student elective time overlaps:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conflictReport.conflictingEntries.map((c, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950 border border-amber-800/80 space-y-2 text-xs">
                  <span className="font-mono font-bold text-amber-300 block">{c.description}</span>
                  <div className="text-slate-400 space-y-1 font-mono text-[11px]">
                    <div>• {c.first.courseCode}: {c.first.day} {c.first.timeDisplay} ({c.first.venue})</div>
                    <div>• {c.second.courseCode}: {c.second.day} {c.second.timeDisplay} ({c.second.venue})</div>
                  </div>
                  <button
                    onClick={() => handleOpenReschedule(c.second.id)}
                    className="mt-2 px-3 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-100 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    Reschedule {c.second.courseCode} to Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All 12 course sessions are completely conflict-free in time and venue allocations.</span>
          </div>
        )}
      </section>

      {/* 3. SCHEDULE MASTER TABLE & QUICK ACTIONS */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Course Timetable Directory</h2>
            <p className="text-xs text-slate-400">All current semester modules and administrative actions</p>
          </div>
          <span className="text-xs font-mono text-cyan-400">{timetable.length} Active Modules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Day & Time</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Lecturer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {timetable.map((course) => (
                <tr key={course.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <span className="text-cyan-400 block">{course.courseCode}</span>
                    <span className="text-slate-300 font-sans font-normal text-xs block">{course.courseName}</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-200 block">{course.day}</span>
                    <span className="text-slate-400 text-[11px] block">{course.timeDisplay}</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-cyan-300">
                    {course.venue}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-sans text-slate-300">
                    {course.lecturer}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {course.isCancelled ? (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-sans">
                      <button
                        onClick={() => handleOpenReschedule(course.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                        title="Reschedule day, time, or venue"
                      >
                        Reschedule
                      </button>

                      {course.isCancelled ? (
                        <button
                          onClick={() => onRestoreCourse(course.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenCancel(course.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-medium transition-colors cursor-pointer"
                          title="Cancel session and notify cohort"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. ADMINISTRATIVE AUDIT LOG */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Administrative Audit & Synchronization Log</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{changeLogs.length} Records</span>
        </div>

        <div className="space-y-3">
          {changeLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No recent changes recorded.
            </div>
          ) : (
            changeLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400 uppercase">
                    {log.changeType} · {log.courseCode} ({log.courseName})
                  </span>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-slate-300 text-xs font-sans">
                  <span className="text-slate-500 font-mono text-[11px]">Change: </span>
                  <span className="line-through text-slate-500 mr-2">{log.previousDetails}</span>
                  <span className="text-emerald-400 font-semibold">{log.newDetails}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Authorized by: {log.performedBy}</span>
                  <span className="text-cyan-400">{log.notifiedStudentsCount} Students Synchronized</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL: RESCHEDULE CLASS */}
      {activeModal === 'reschedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Reschedule Class Session</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitReschedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Day</label>
                <select
                  value={rescheduleDay}
                  onChange={(e) => setRescheduleDay(e.target.value as DayOfWeek)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  {daysList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Start Time</label>
                  <input
                    type="time"
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">End Time</label>
                  <input
                    type="time"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Assigned Room / Venue</label>
                <select
                  value={rescheduleVenue}
                  onChange={(e) => setRescheduleVenue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  {venuesList.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 text-slate-400 text-[11px] leading-relaxed">
                Publishing this change updates the master database, cancels any pending reminders for the old slot, schedules new reminders, and sends an alert to all students.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                >
                  Publish & Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL CLASS */}
      {activeModal === 'cancel' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Cancel Class Session</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCancel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Reason for Cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white leading-relaxed font-sans"
                  placeholder="Enter official reason..."
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-200 text-[11px]">
                Pending reminder alarms for this class will be automatically decommissioned and students notified immediately.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COURSE */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Academic Course Entry</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitAddCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Course Code</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Credits</label>
                  <input
                    type="number"
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Course Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Course Lecturer</label>
                <input
                  type="text"
                  value={newLecturer}
                  onChange={(e) => setNewLecturer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Day</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    {daysList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Venue</label>
                  <select
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    {venuesList.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Domain</label>
                  <select
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value as CourseDomain)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    <option value="core">CS Core & Theory</option>
                    <option value="programming">Programming & Dev</option>
                    <option value="data">Data & Databases</option>
                    <option value="systems">Networks & Systems</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Description / Syllabus</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                >
                  Save & Validate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      {activeModal === 'announce' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Broadcast Department Notice</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Notice Title</label>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Message Body</label>
                <textarea
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                >
                  Broadcast to Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
