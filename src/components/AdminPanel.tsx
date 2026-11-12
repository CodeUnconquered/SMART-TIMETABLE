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
  Copy,
  Sliders,
  CalendarDays,
  X,
  Info,
  Phone,
  Sun,
  Moon,
  Palette,
  CheckSquare,
  Bell,
  Check
} from 'lucide-react';
import { 
  TimetableEntry, 
  DayOfWeek, 
  TimetableChangeLog, 
  CourseDomain, 
  ClassType, 
  ConflictReport,
  CustomFieldDefinition,
  OccurrenceOverride,
  GlobalThemeMode,
  PersonalTask,
  ActivityPriority,
  ActivityStatus,
  UserProfile
} from '../types/timetable';
import { detectConflicts } from '../utils/storage';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';

interface AdminPanelProps {
  timetable: TimetableEntry[];
  changeLogs: TimetableChangeLog[];
  tasks?: PersonalTask[];
  customFields?: CustomFieldDefinition[];
  currentTheme?: GlobalThemeMode;
  onUpdateGlobalTheme?: (theme: GlobalThemeMode) => Promise<void>;
  onAddCourse: (entry: Omit<TimetableEntry, 'id'>) => Promise<boolean>;
  onEditCourse?: (courseId: string, updates: Partial<TimetableEntry>) => Promise<boolean>;
  onEditTask?: (taskId: string, updates: Partial<PersonalTask>) => Promise<boolean | void>;
  onDeleteTask?: (taskId: string) => Promise<boolean | void>;
  onCancelOccurrence: (courseId: string, date: string, reason: string) => Promise<boolean>;
  onRescheduleOccurrence: (
    courseId: string,
    details: {
      originalDate: string;
      rescheduledDate: string;
      rescheduledDay: DayOfWeek;
      rescheduledStartTime: string;
      rescheduledEndTime: string;
      rescheduledTimeDisplay: string;
      rescheduledVenue: string;
      rescheduledInstructions?: string;
      reason?: string;
    }
  ) => Promise<boolean>;
  onRestoreOccurrence: (courseId: string, date: string) => Promise<boolean>;
  onDeleteCoursePermanent: (courseId: string) => Promise<boolean>;
  onDuplicateCourse: (courseId: string) => Promise<boolean>;
  onBroadcastAnnouncement: (title: string, message: string) => Promise<void>;
  onAddCustomField?: (field: Omit<CustomFieldDefinition, 'id'>) => Promise<boolean>;
  user?: UserProfile;
  onSwitchRole?: () => void;
}

const ALL_DAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  timetable,
  changeLogs,
  tasks = [],
  customFields = [],
  currentTheme = 'dark',
  user,
  onSwitchRole,
  onUpdateGlobalTheme,
  onAddCourse,
  onEditCourse,
  onEditTask,
  onDeleteTask,
  onCancelOccurrence,
  onRescheduleOccurrence,
  onRestoreOccurrence,
  onDeleteCoursePermanent,
  onDuplicateCourse,
  onBroadcastAnnouncement,
  onAddCustomField
}) => {
  const [activeModal, setActiveModal] = useState<
    'none' | 'add' | 'edit_course' | 'edit_task' | 'cancel_occurrence' | 'reschedule_occurrence' | 'permanent_delete' | 'announce' | 'custom_field'
  >('none');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [adminViewTab, setAdminViewTab] = useState<'courses' | 'tasks' | 'audit'>('courses');

  // Course Editing State
  const [editingCourse, setEditingCourse] = useState<TimetableEntry | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editLecturer, setEditLecturer] = useState('');
  const [editLecturerPhone, setEditLecturerPhone] = useState('');
  const [editDay, setEditDay] = useState<DayOfWeek>('Monday');
  const [editStartTime, setEditStartTime] = useState('07:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editVenue, setEditVenue] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editClassType, setEditClassType] = useState<ClassType>('Lecture');
  const [editDomain, setEditDomain] = useState<CourseDomain>('core');
  const [editCredits, setEditCredits] = useState(3);
  const [editDesc, setEditDesc] = useState('');
  const [editAcademicPeriod, setEditAcademicPeriod] = useState('Semester II, 2026/2027');
  const [editInstructions, setEditInstructions] = useState('');
  const [editTimeError, setEditTimeError] = useState('');

  // Personal Task Editing State
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<PersonalTask['category']>('study');
  const [editTaskPriority, setEditTaskPriority] = useState<ActivityPriority>('medium');
  const [editTaskStatus, setEditTaskStatus] = useState<ActivityStatus>('pending');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskStartTime, setEditTaskStartTime] = useState('14:00');
  const [editTaskEndTime, setEditTaskEndTime] = useState('16:00');
  const [editTaskLocation, setEditTaskLocation] = useState('');
  const [editTaskReminders, setEditTaskReminders] = useState<number[]>([15]);
  const [editTaskTimeError, setEditTaskTimeError] = useState('');
  
  // Date-specific occurrence cancellation state
  const [cancelOccurrenceDate, setCancelOccurrenceDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [cancelReason, setCancelReason] = useState<string>('Instructor on official academic symposium leave');

  // Date-specific occurrence rescheduling state
  const [rescheduleOriginalDate, setRescheduleOriginalDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('08:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>('10:00');
  const [rescheduleVenue, setRescheduleVenue] = useState<string>('MMUST Main Campus, Lab 4');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Departmental lab reallocation');
  const [rescheduleInstructions, setRescheduleInstructions] = useState<string>('');
  const [rescheduleTimeError, setRescheduleTimeError] = useState<string>('');

  // Permanent deletion confirmation state
  const [permanentDeleteCourse, setPermanentDeleteCourse] = useState<TimetableEntry | null>(null);

  // Announcement state
  const [announceTitle, setAnnounceTitle] = useState<string>('Academic Timetable Update Notice');
  const [announceMsg, setAnnounceMsg] = useState<string>('All lab practical sessions and lecture rooms have been updated for Semester II.');

  // Add course state
  const [newCode, setNewCode] = useState('BCS 399');
  const [newName, setNewName] = useState('Distributed Cloud Architecture');
  const [newLecturer, setNewLecturer] = useState('Dr. Alice Mwamburi');
  const [newLecturerPhone, setNewLecturerPhone] = useState('+254 712 345 678');
  const [newDatePicker, setNewDatePicker] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newDay, setNewDay] = useState<DayOfWeek>('Monday');
  const [newStart, setNewStart] = useState('11:00');
  const [newEnd, setNewEnd] = useState('13:00');
  const [newVenue, setNewVenue] = useState('MMUST Main Campus, Lab 4');
  const [newDomain, setNewDomain] = useState<CourseDomain>('systems');
  const [newClassType, setNewClassType] = useState<ClassType>('Lecture');
  const [newCredits, setNewCredits] = useState(3);
  const [newDesc, setNewDesc] = useState('Cloud computing principles, distributed consensus algorithms, and container orchestration.');
  const [newAcademicPeriod, setNewAcademicPeriod] = useState('Semester II, 2026/2027');
  const [newInstructions, setNewInstructions] = useState('Bring laptop for cloud lab container deployments.');
  const [newCustomFields, setNewCustomFields] = useState<Record<string, string | number | boolean | string[]>>({});
  const [addTimeError, setAddTimeError] = useState<string>('');

  // Custom Field definition state
  const [cfName, setCfName] = useState('');
  const [cfLabel, setCfLabel] = useState('');
  const [cfType, setCfType] = useState<'text' | 'long_text' | 'number' | 'date' | 'time' | 'dropdown' | 'checkbox' | 'url'>('text');
  const [cfAppliesTo, setCfAppliesTo] = useState<'course' | 'task' | 'all'>('all');
  const [cfOptions, setCfOptions] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const conflictReport: ConflictReport = detectConflicts(timetable);

  // Helper to calculate next upcoming date matching day of week
  const getNextDateForDay = (targetDay: DayOfWeek): string => {
    const today = new Date();
    const currentDayIdx = today.getDay();
    const targetIdx = ALL_DAYS.indexOf(targetDay);
    let diff = (targetIdx - currentDayIdx + 7) % 7;
    if (diff === 0) diff = 7; // next week
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toISOString().split('T')[0];
  };

  const handleOpenCancelOccurrence = (courseId: string) => {
    const course = timetable.find(c => c.id === courseId);
    if (!course) return;
    setSelectedCourseId(courseId);
    setCancelOccurrenceDate(getNextDateForDay(course.day));
    setCancelReason('Instructor on official academic symposium leave');
    setActiveModal('cancel_occurrence');
  };

  const handleOpenRescheduleOccurrence = (courseId: string) => {
    const course = timetable.find(c => c.id === courseId);
    if (!course) return;
    setSelectedCourseId(courseId);
    const origDate = getNextDateForDay(course.day);
    setRescheduleOriginalDate(origDate);
    setRescheduleTargetDate(origDate);
    setRescheduleStartTime(course.startTime);
    setRescheduleEndTime(course.endTime);
    setRescheduleVenue(course.venue);
    setRescheduleInstructions(course.instructions || '');
    setRescheduleReason('Timetable optimization');
    setRescheduleTimeError('');
    setActiveModal('reschedule_occurrence');
  };

  const handleOpenPermanentDelete = (course: TimetableEntry) => {
    setPermanentDeleteCourse(course);
    setActiveModal('permanent_delete');
  };

  // Calendar date handler for Add Course: auto-derives day of week
  const handleDatePickedForNewCourse = (dateStr: string) => {
    setNewDatePicker(dateStr);
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const derivedDay = ALL_DAYS[d.getDay()];
        setNewDay(derivedDay);
      }
    }
  };

  const submitAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTimeError('');

    const [sH, sM] = newStart.split(':').map(Number);
    const [eH, eM] = newEnd.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    if (endM <= startM) {
      setAddTimeError('End time must be later than start time.');
      return;
    }

    if (!newVenue.trim()) {
      setAddTimeError('Please specify the venue/classroom (free text).');
      return;
    }

    const timeDisplay = `${formatTimeAmPm(newStart)} - ${formatTimeAmPm(newEnd)}`;

    const success = await onAddCourse({
      courseCode: newCode.trim(),
      courseName: newName.trim(),
      lecturer: newLecturer.trim(),
      lecturerPhone: newLecturerPhone.trim() || undefined,
      day: newDay,
      dayIndex: ALL_DAYS.indexOf(newDay),
      startTime: newStart,
      endTime: newEnd,
      timeDisplay,
      startMinutes: startM,
      endMinutes: endM,
      venue: newVenue.trim(),
      building: newVenue.trim(),
      classType: newClassType,
      domain: newDomain,
      domainLabel: newDomain === 'core' ? 'CS Core' : newDomain === 'programming' ? 'Programming & Dev' : 'Systems & Networks',
      credits: newCredits,
      colorTheme: newDomain === 'core' ? 'cyan' : newDomain === 'programming' ? 'emerald' : 'amber',
      description: newDesc,
      academicPeriod: newAcademicPeriod,
      instructions: newInstructions.trim() || undefined,
      customFields: newCustomFields,
      status: 'active',
      occurrenceOverrides: []
    });

    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `New curriculum module ${newCode} published to active timetable.`
      });
      setActiveModal('none');
    }
  };

  const handleOpenEditCourse = (course: TimetableEntry) => {
    setEditingCourse(course);
    setEditCode(course.courseCode);
    setEditName(course.courseName);
    setEditLecturer(course.lecturer);
    setEditLecturerPhone(course.lecturerPhone || '');
    setEditDay(course.day);
    setEditStartTime(course.startTime);
    setEditEndTime(course.endTime);
    setEditVenue(course.venue);
    setEditBuilding(course.building || '');
    setEditClassType(course.classType as ClassType);
    setEditDomain(course.domain as CourseDomain);
    setEditCredits(course.credits || 3);
    setEditDesc(course.description || '');
    setEditAcademicPeriod(course.academicPeriod || 'Semester II, 2026/2027');
    setEditInstructions(course.instructions || '');
    setEditTimeError('');
    setActiveModal('edit_course');
  };

  const submitEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !onEditCourse) return;
    setEditTimeError('');

    const [sH, sM] = editStartTime.split(':').map(Number);
    const [eH, eM] = editEndTime.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    if (endM <= startM) {
      setEditTimeError('End time must be later than start time.');
      return;
    }

    const timeDisplay = `${formatTimeAmPm(editStartTime)} - ${formatTimeAmPm(editEndTime)}`;
    const dayIndex = ALL_DAYS.indexOf(editDay);

    const ok = await onEditCourse(editingCourse.id, {
      courseCode: editCode.trim().toUpperCase(),
      courseName: editName.trim(),
      lecturer: editLecturer.trim(),
      lecturerPhone: editLecturerPhone.trim() || undefined,
      day: editDay,
      dayIndex: dayIndex >= 0 ? dayIndex : 1,
      startTime: editStartTime,
      endTime: editEndTime,
      timeDisplay,
      startMinutes: startM,
      endMinutes: endM,
      venue: editVenue.trim(),
      building: editBuilding.trim() || editVenue.trim(),
      classType: editClassType,
      domain: editDomain,
      domainLabel: editDomain === 'core' ? 'CS Core' : editDomain === 'programming' ? 'Programming & Dev' : 'Systems & Networks',
      credits: editCredits,
      description: editDesc.trim(),
      academicPeriod: editAcademicPeriod.trim(),
      instructions: editInstructions.trim() || undefined
    });

    if (ok) {
      setFeedbackMsg({
        type: 'success',
        text: `Updated course ${editCode.trim().toUpperCase()} and synchronized reminders across the system.`
      });
      setActiveModal('none');
      setEditingCourse(null);
    }
  };

  const handleOpenEditTask = (task: PersonalTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskCategory(task.category);
    setEditTaskPriority(task.priority);
    setEditTaskStatus(task.status);
    setEditTaskDate(task.date);
    setEditTaskStartTime(task.startTime);
    setEditTaskEndTime(task.endTime);
    setEditTaskLocation(task.location || '');
    setEditTaskReminders(task.reminderIntervals || [15]);
    setEditTaskTimeError('');
    setActiveModal('edit_task');
  };

  const submitEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !onEditTask) return;
    setEditTaskTimeError('');

    const [sH, sM] = editTaskStartTime.split(':').map(Number);
    const [eH, eM] = editTaskEndTime.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    if (endM <= startM) {
      setEditTaskTimeError('End time must be later than start time.');
      return;
    }

    const ok = await onEditTask(editingTask.id, {
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim(),
      category: editTaskCategory,
      priority: editTaskPriority,
      status: editTaskStatus,
      date: editTaskDate,
      startTime: editTaskStartTime,
      endTime: editTaskEndTime,
      startMinutes: startM,
      endMinutes: endM,
      location: editTaskLocation.trim() || undefined,
      reminderIntervals: editTaskReminders
    });

    if (ok) {
      setFeedbackMsg({
        type: 'success',
        text: `Updated personal task "${editTaskTitle.trim()}" and re-armed background alarms.`
      });
      setActiveModal('none');
      setEditingTask(null);
    }
  };

  const submitCancelOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = timetable.find(c => c.id === selectedCourseId);
    if (!course) return;

    if (!cancelOccurrenceDate) {
      return;
    }

    const success = await onCancelOccurrence(selectedCourseId, cancelOccurrenceDate, cancelReason.trim());
    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `Temporarily cancelled ${course.courseCode} for ${cancelOccurrenceDate}. Next weekly sessions remain intact.`
      });
      setActiveModal('none');
    }
  };

  const submitRescheduleOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleTimeError('');

    const course = timetable.find(c => c.id === selectedCourseId);
    if (!course) return;

    const [sH, sM] = rescheduleStartTime.split(':').map(Number);
    const [eH, eM] = rescheduleEndTime.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;

    if (endM <= startM) {
      setRescheduleTimeError('End time must be later than start time.');
      return;
    }

    if (!rescheduleVenue.trim()) {
      setRescheduleTimeError('Please enter a venue (free text).');
      return;
    }

    // Auto derive day of week from rescheduleTargetDate
    const targetDateObj = new Date(rescheduleTargetDate);
    const targetDay = ALL_DAYS[targetDateObj.getDay()];
    const timeDisplay = `${formatTimeAmPm(rescheduleStartTime)} - ${formatTimeAmPm(rescheduleEndTime)}`;

    const success = await onRescheduleOccurrence(selectedCourseId, {
      originalDate: rescheduleOriginalDate,
      rescheduledDate: rescheduleTargetDate,
      rescheduledDay: targetDay,
      rescheduledStartTime: rescheduleStartTime,
      rescheduledEndTime: rescheduleEndTime,
      rescheduledTimeDisplay: timeDisplay,
      rescheduledVenue: rescheduleVenue.trim(),
      rescheduledInstructions: rescheduleInstructions.trim() || undefined,
      reason: rescheduleReason.trim() || undefined
    });

    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `Rescheduled ${course.courseCode} on ${rescheduleOriginalDate} to ${targetDay} (${rescheduleTargetDate}) ${timeDisplay} at ${rescheduleVenue}.`
      });
      setActiveModal('none');
    }
  };

  const submitPermanentDelete = async () => {
    if (!permanentDeleteCourse) return;
    const courseCode = permanentDeleteCourse.courseCode;

    const success = await onDeleteCoursePermanent(permanentDeleteCourse.id);
    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: `Permanently deleted ${courseCode} from all views, calendars, and notification queues.`
      });
      setActiveModal('none');
      setPermanentDeleteCourse(null);
    }
  };

  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await onBroadcastAnnouncement(announceTitle, announceMsg);
    setFeedbackMsg({
      type: 'success',
      text: 'Departmental timetable announcement broadcast to all students with audible alerts.'
    });
    setActiveModal('none');
  };

  const submitCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfName || !cfLabel || !onAddCustomField) return;

    const options = cfOptions
      ? cfOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const ok = await onAddCustomField({
      name: cfName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: cfLabel.trim(),
      type: cfType,
      appliesTo: cfAppliesTo,
      options
    });

    if (ok) {
      setFeedbackMsg({
        type: 'success',
        text: `Custom field "${cfLabel}" added to schema.`
      });
      setCfName('');
      setCfLabel('');
      setCfOptions('');
      setActiveModal('none');
    }
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
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold mb-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Timetable Directorate · Administrative Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Curriculum & Schedule Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Full administrative authority to publish courses with free-text venues, cancel specific class occurrences temporarily, reschedule dates, or permanently delete courses everywhere.
            </p>

            {/* Admin Permissions Status Banner */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold">Admin Permissions Granted:</span>
                <span className="text-emerald-200">Full Course, Task & Schedule Editing Active</span>
              </div>

              {onSwitchRole && user?.role !== 'admin' && (
                <button
                  type="button"
                  onClick={onSwitchRole}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Activate Admin Mode</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setAddTimeError('');
                setActiveModal('add');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Create & Publish Course</span>
            </button>

            <button
              onClick={() => setActiveModal('custom_field')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Custom Fields</span>
            </button>

            <button
              onClick={() => setActiveModal('announce')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>
      </section>

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : 'bg-rose-950/80 border-rose-700 text-rose-200'
        }`}>
          <div className="flex items-center gap-2 font-medium">
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

      {/* 2. GLOBAL THEME SETTINGS (LIGHT & DARK INTERFACE) */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Theme Settings · Global System Interface</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Global Dark and Light Theme Settings
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
              Choose the global visual theme for Smart Remind. The administrator's selection applies immediately across the entire system — including student dashboards, 7-day timetables, personal tasks, session notes, forms, modals, and navigation bars.
            </p>
          </div>

          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-bold shrink-0 self-start sm:self-auto">
            Current: {currentTheme.toUpperCase()} THEME
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Light Theme Card */}
          <div
            onClick={() => onUpdateGlobalTheme && onUpdateGlobalTheme('light')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
              currentTheme === 'light'
                ? 'bg-white border-cyan-500 shadow-xl ring-2 ring-cyan-500/30'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold border border-amber-500/30">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Light Theme</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Clean, bright interface</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentTheme === 'light' ? 'border-cyan-600 bg-cyan-600' : 'border-slate-400'
                }`}>
                  {currentTheme === 'light' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                A clean, bright interface with soft slate-50 backgrounds, high-contrast typography, and crisp borders. Optimal for daylight lecture halls and active classroom sessions.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono flex items-center justify-between">
              <span>Daylight Contrast: Maximum</span>
              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">Clean & Bright</span>
            </div>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => onUpdateGlobalTheme && onUpdateGlobalTheme('dark')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
              currentTheme === 'dark'
                ? 'bg-slate-950 border-cyan-500 shadow-xl ring-2 ring-cyan-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold border border-indigo-800">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dark Theme</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Comfortable dark interface</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentTheme === 'dark' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-600'
                }`}>
                  {currentTheme === 'dark' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                A comfortable dark interface with deep slate-950 surfaces, gentle accents, and reduced eye strain. Optimal for evening study sessions, library research, and OLED efficiency.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono flex items-center justify-between">
              <span>Eye Strain Relief: High</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-bold">Comfortable Dark</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ADMINISTRATIVE WORKSPACE SUB-NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setAdminViewTab('courses')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminViewTab === 'courses'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Academic Courses ({timetable.length})</span>
        </button>

        <button
          onClick={() => setAdminViewTab('tasks')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminViewTab === 'tasks'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Personal Tasks & Routines ({tasks.length})</span>
        </button>

        <button
          onClick={() => setAdminViewTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminViewTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Curriculum Audit Log ({changeLogs.length})</span>
        </button>
      </div>

      {/* 4. COURSE INVENTORY & ACTIONS TABLE */}
      {adminViewTab === 'courses' && (
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Active Academic Course Modules</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {timetable.length} active master courses in academic schedule
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3 font-semibold">Course Code & Name</th>
                <th className="pb-3 font-semibold">Recurring Schedule</th>
                <th className="pb-3 font-semibold">Venue (Free Text)</th>
                <th className="pb-3 font-semibold">Instructor</th>
                <th className="pb-3 font-semibold">Overrides</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {timetable.map(course => {
                const activeOverrides = course.occurrenceOverrides || [];
                const cancelledOverrides = activeOverrides.filter(o => o.status === 'cancelled');
                const rescheduledOverrides = activeOverrides.filter(o => o.status === 'rescheduled');

                return (
                  <tr key={course.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 pr-3 font-sans">
                      <span className="font-mono font-bold text-cyan-400 block">{course.courseCode}</span>
                      <span className="text-slate-200 font-semibold text-xs block">{course.courseName}</span>
                      {course.instructions && (
                        <span className="text-[10px] text-slate-400 italic block">{course.instructions}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-slate-200 font-semibold block">{course.day}</span>
                      <span className="text-slate-400 text-[11px] block">{course.timeDisplay}</span>
                    </td>
                    <td className="py-3 pr-3 text-slate-300">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{course.venue}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-300 font-sans">
                      <span className="text-xs block font-semibold">{course.lecturer}</span>
                      {course.lecturerPhone ? (
                        <a 
                          href={`tel:${course.lecturerPhone}`}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 mt-0.5"
                          title="Call Lecturer"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{course.lecturerPhone}</span>
                        </a>
                      ) : course.lecturerEmail ? (
                        <span className="text-[10px] text-slate-400 font-mono block">{course.lecturerEmail}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      {activeOverrides.length === 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                          Active Regular
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {cancelledOverrides.map(o => (
                            <div key={o.date} className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[9px] font-mono">
                                {o.date}: Cancelled
                              </span>
                              <button
                                onClick={async () => {
                                  const ok = await onRestoreOccurrence(course.id, o.date);
                                  if (ok) {
                                    setFeedbackMsg({
                                      type: 'success',
                                      text: `Restored session on ${o.date} for ${course.courseCode}.`
                                    });
                                  }
                                }}
                                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                                title="Undo cancellation for this date"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                          {rescheduledOverrides.map(o => (
                            <div key={o.date} className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[9px] font-mono">
                                {o.date} → {o.rescheduledDate}
                              </span>
                              <button
                                onClick={async () => {
                                  const ok = await onRestoreOccurrence(course.id, o.date);
                                  if (ok) {
                                    setFeedbackMsg({
                                      type: 'success',
                                      text: `Restored original schedule on ${o.date} for ${course.courseCode}.`
                                    });
                                  }
                                }}
                                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                                title="Reset reschedule for this date"
                              >
                                Reset
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        
                        {/* Edit Course Details */}
                        <button
                          onClick={() => handleOpenEditCourse(course)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                          title="Edit course code, title, instructor, times, venue, and syllabus"
                        >
                          <Edit className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Edit</span>
                        </button>

                        {/* Reschedule Occurrence */}
                        <button
                          onClick={() => handleOpenRescheduleOccurrence(course.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold cursor-pointer"
                          title="Reschedule a specific class date"
                        >
                          Reschedule Date
                        </button>

                        {/* Cancel Specific Occurrence */}
                        <button
                          onClick={() => handleOpenCancelOccurrence(course.id)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-950 text-amber-300 text-xs font-semibold cursor-pointer"
                          title="Temporarily cancel specific occurrence (leaves future weeks active)"
                        >
                          Cancel Date
                        </button>

                        {/* Duplicate Section */}
                        <button
                          onClick={async () => {
                            const ok = await onDuplicateCourse(course.id);
                            if (ok) {
                              setFeedbackMsg({
                                type: 'success',
                                text: `Successfully duplicated section for ${course.courseCode}.`
                              });
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          title="Duplicate course section"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Permanent Delete Everywhere */}
                        <button
                          onClick={() => handleOpenPermanentDelete(course)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Permanently Delete Course Everywhere"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* 5. ADMIN PERSONAL TASK MANAGEMENT & EDITING */}
      {adminViewTab === 'tasks' && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-semibold">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span>Personal Schedules & Activities Directory</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Admin Personal Task Management & Editing
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
                Administrative authority to edit task titles, descriptions, categories, priorities, dates, times, venues, and background reminder intervals.
              </p>
            </div>

            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-purple-400 font-bold shrink-0 self-start sm:self-auto">
              {tasks.length} Scheduled Activities
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-mono bg-slate-950/40 rounded-2xl border border-slate-800">
              No personal tasks or routines logged currently.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Activity Title & Note</th>
                    <th className="pb-3 font-semibold">Category & Priority</th>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold">Reminders</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {tasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    return (
                      <tr key={task.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pr-3 font-sans">
                          <span className={`font-bold text-white block text-xs ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">
                              {task.description}
                            </span>
                          )}
                          {task.location && (
                            <span className="text-[10px] text-rose-300 flex items-center gap-1 mt-0.5 font-sans">
                              <MapPin className="w-3 h-3" />
                              {task.location}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[9px] font-mono uppercase font-semibold">
                              {task.category}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold ${
                              task.priority === 'urgent' ? 'text-rose-400 bg-rose-950/60' :
                              task.priority === 'high' ? 'text-amber-400 bg-amber-950/60' :
                              'text-cyan-400 bg-cyan-950/60'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-slate-200 font-semibold block">{task.date}</span>
                          <span className="text-slate-400 text-[11px] block">{task.startTime} - {task.endTime}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.reminderIntervals && task.reminderIntervals.length > 0 ? (
                              task.reminderIntervals.map((min, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[9px] font-mono">
                                  {min === 0 ? 'Start' : `${min}m`}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            task.status === 'completed' ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' :
                            task.status === 'in_progress' ? 'bg-amber-950 border border-amber-800 text-amber-300' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => handleOpenEditTask(task)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950 text-purple-300 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                              title="Edit personal task"
                            >
                              <Edit className="w-3.5 h-3.5 text-purple-400" />
                              <span>Edit</span>
                            </button>

                            {onEditTask && (
                              <button
                                onClick={() => onEditTask(task.id, {
                                  status: task.status === 'completed' ? 'pending' : 'completed'
                                })}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950 text-emerald-300 text-xs font-semibold cursor-pointer"
                                title={task.status === 'completed' ? 'Reopen task' : 'Mark task complete'}
                              >
                                {task.status === 'completed' ? 'Reopen' : 'Done'}
                              </button>
                            )}

                            {onDeleteTask && (
                              <button
                                onClick={() => {
                                  if (confirm(`Admin action: Delete personal task "${task.title}"?`)) {
                                    onDeleteTask(task.id);
                                    setFeedbackMsg({
                                      type: 'success',
                                      text: `Deleted task "${task.title}".`
                                    });
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6. AUDIT CHANGE LOG HISTORY */}
      {adminViewTab === 'audit' && (
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Audit Log & Modification History</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {changeLogs.length} audit entries
          </span>
        </div>

        <div className="space-y-2.5">
          {changeLogs.slice(0, 10).map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400">{log.courseCode}</span>
                  <span className="text-slate-400">·</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono uppercase text-slate-300">
                    {log.changeType.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    by {log.performedBy}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 line-through">{log.previousDetails}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-emerald-400 font-semibold">{log.newDetails}</span>
                </div>
                {log.reason && (
                  <p className="text-[11px] text-slate-400 italic">
                    Reason: {log.reason}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400 block">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 block">
                  {log.notifiedStudentsCount} students alerted
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 4. MODAL: CREATE & PUBLISH COURSE */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create & Publish Academic Course</h3>
                <p className="text-xs text-slate-400">Add an authoritative curriculum module to the student timetable</p>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addTimeError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addTimeError}</span>
              </div>
            )}

            <form onSubmit={submitAddCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. BCS 312"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Design & Analysis of Algorithms"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Instructor / Lecturer *</label>
                  <input
                    type="text"
                    required
                    value={newLecturer}
                    onChange={(e) => setNewLecturer(e.target.value)}
                    placeholder="e.g. Dr. Alice Mwamburi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lecturer Phone Number (Primary Contact) *</label>
                  <input
                    type="tel"
                    required
                    value={newLecturerPhone}
                    onChange={(e) => setNewLecturerPhone(e.target.value)}
                    placeholder="e.g. +254 712 345 678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Date & Day Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Semester Start Calendar Date
                  </label>
                  <input
                    type="date"
                    value={newDatePicker}
                    onChange={(e) => handleDatePickedForNewCourse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Day of Week (Auto-Derived or Set) *
                  </label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400"
                  >
                    {ALL_DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Class Type</label>
                  <select
                    value={newClassType}
                    onChange={(e) => setNewClassType(e.target.value as ClassType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab Practical">Lab Practical</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar</option>
                  </select>
                </div>
              </div>

              {/* Time pickers with validation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Venue MUST BE FREE TEXT */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Venue / Classroom (Free Text Input) *
                </label>
                <input
                  type="text"
                  required
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  placeholder="e.g. MMUST Main Campus, Lab 4 or Room B12"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter any custom building, lab number, campus wing, or room code without dropdown constraints.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Academic Instructions / Remarks</label>
                <input
                  type="text"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="e.g. Bring scientific calculator, lab coat required"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Curriculum Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs"
                />
              </div>

              {/* Dynamic custom fields */}
              <DynamicFieldRenderer
                definitions={customFields}
                values={newCustomFields}
                onChange={(name, val) => setNewCustomFields(prev => ({ ...prev, [name]: val }))}
                target="course"
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/60 cursor-pointer"
                >
                  Publish Course Everywhere
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: TEMPORARILY CANCEL SPECIFIC OCCURRENCE */}
      {activeModal === 'cancel_occurrence' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-base font-bold text-amber-400">Cancel Class for Specific Date</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Temporary Occurrence Cancellation:</strong> Cancelling affects <em>only</em> the selected date. Future weekly sessions automatically resume normally.
              </span>
            </div>

            <form onSubmit={submitCancelOccurrence} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Specific Occurrence Date *
                </label>
                <input
                  type="date"
                  required
                  value={cancelOccurrenceDate}
                  onChange={(e) => setCancelOccurrenceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Lecturer unavailable / Official faculty symposium"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/60 cursor-pointer"
                >
                  Confirm Temporary Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: RESCHEDULE SPECIFIC OCCURRENCE */}
      {activeModal === 'reschedule_occurrence' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-base font-bold text-white">Reschedule Specific Scheduled Occurrence</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleTimeError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rescheduleTimeError}</span>
              </div>
            )}

            <form onSubmit={submitRescheduleOccurrence} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Original Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleOriginalDate}
                    onChange={(e) => setRescheduleOriginalDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Rescheduled Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleTargetDate}
                    onChange={(e) => setRescheduleTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  New Venue (Free Text Input) *
                </label>
                <input
                  type="text"
                  required
                  value={rescheduleVenue}
                  onChange={(e) => setRescheduleVenue(e.target.value)}
                  placeholder="e.g. MMUST Main Campus, Lab 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Official Reason</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Additional Instructions</label>
                <input
                  type="text"
                  value={rescheduleInstructions}
                  onChange={(e) => setRescheduleInstructions(e.target.value)}
                  placeholder="e.g. Bring practical workbooks"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/60 cursor-pointer"
                >
                  Confirm Date Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: PERMANENT COURSE DELETION (PURGE EVERYWHERE) */}
      {activeModal === 'permanent_delete' && permanentDeleteCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete Course Everywhere?</h3>
                <span className="text-xs font-mono text-rose-300 font-bold">
                  {permanentDeleteCourse.courseCode} · {permanentDeleteCourse.courseName}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200 leading-relaxed space-y-2 mb-4">
              <p>
                <strong>This action cannot be undone.</strong> Permanent deletion will:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Remove the course completely from admin & student timetables.</li>
                <li>Remove it from daily, weekly, and monthly calendar views.</li>
                <li>Purge upcoming class reminders and audible alarm queues.</li>
                <li>Remove it from dashboard widgets and syllabus listings.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  setPermanentDeleteCourse(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={submitPermanentDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/70 cursor-pointer"
              >
                Permanently Delete Everywhere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: CUSTOM FIELD SCHEMA BUILDER */}
      {activeModal === 'custom_field' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-2">Define Custom Field Attribute</h3>
            <p className="text-xs text-slate-400 mb-4">
              Extend course cards and personal tasks with custom schema inputs.
            </p>
            <form onSubmit={submitCustomField} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Identifier Key (e.g. lab_group)</label>
                <input
                  type="text"
                  required
                  value={cfName}
                  onChange={(e) => setCfName(e.target.value)}
                  placeholder="e.g. lab_group"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Display Label</label>
                <input
                  type="text"
                  required
                  value={cfLabel}
                  onChange={(e) => setCfLabel(e.target.value)}
                  placeholder="e.g. Assigned Laboratory Group"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Field Type</label>
                  <select
                    value={cfType}
                    onChange={(e) => setCfType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="text">Short Text</option>
                    <option value="long_text">Long Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="url">URL Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Applies To</label>
                  <select
                    value={cfAppliesTo}
                    onChange={(e) => setCfAppliesTo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="all">Both Courses & Tasks</option>
                    <option value="course">Courses Only</option>
                    <option value="task">Tasks Only</option>
                  </select>
                </div>
              </div>

              {cfType === 'dropdown' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Dropdown Options (comma-separated)</label>
                  <input
                    type="text"
                    value={cfOptions}
                    onChange={(e) => setCfOptions(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  Save Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: BROADCAST NOTICE */}
      {activeModal === 'announce' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-3">Broadcast Timetable Announcement</h3>
            <form onSubmit={submitAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Announcement Subject *</label>
                <input
                  type="text"
                  required
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Message Body *</label>
                <textarea
                  required
                  rows={4}
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: EDIT COURSE INFORMATION */}
      {activeModal === 'edit_course' && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Edit Course: {editingCourse.courseCode}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Update code, title, instructor contact, time, venue, or syllabus
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModal('none');
                  setEditingCourse(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitEditCourse} className="space-y-4 overflow-y-auto flex-1 pr-1 pt-4">
              {editTimeError && (
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editTimeError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lecturer / Instructor Name *</label>
                  <input
                    type="text"
                    required
                    value={editLecturer}
                    onChange={(e) => setEditLecturer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lecturer Phone Number (Primary) *</label>
                  <input
                    type="tel"
                    required
                    value={editLecturerPhone}
                    onChange={(e) => setEditLecturerPhone(e.target.value)}
                    placeholder="+254 712 345 678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Day of Week *</label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    {ALL_DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => {
                      setEditStartTime(e.target.value);
                      setEditTimeError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={(e) => {
                      setEditEndTime(e.target.value);
                      setEditTimeError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Venue / Classroom (Free Text) *</label>
                  <input
                    type="text"
                    required
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    placeholder="e.g. LBB 016 or Room 402"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Building / Quad</label>
                  <input
                    type="text"
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                    placeholder="e.g. Science Quad, Wing B"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Class Type</label>
                  <select
                    value={editClassType}
                    onChange={(e) => setEditClassType(e.target.value as ClassType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab Practical">Lab Practical</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Curriculum Domain</label>
                  <select
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value as CourseDomain)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="core">Core CS / Theory</option>
                    <option value="programming">Software Development</option>
                    <option value="systems">Hardware & Systems</option>
                    <option value="data">Data & Databases</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={editCredits}
                    onChange={(e) => setEditCredits(parseInt(e.target.value, 10) || 3)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Additional Instructions / Remarks</label>
                <input
                  type="text"
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="e.g. Bring laptops with Python 3.12 installed"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Course Description / Scope</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('none');
                    setEditingCourse(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/60 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Course Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: EDIT PERSONAL TASK */}
      {activeModal === 'edit_task' && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Admin Edit Personal Task
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Modify title, category, scheduled time, location, or reminder lead times
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModal('none');
                  setEditingTask(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitEditTask} className="space-y-4 overflow-y-auto flex-1 pr-1 pt-4">
              {editTaskTimeError && (
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editTaskTimeError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task / Activity Title *</label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes / Plan</label>
                <textarea
                  rows={2}
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={editTaskCategory}
                    onChange={(e) => setEditTaskCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="study">Study / Revision</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project / Dev</option>
                    <option value="reading">Reading</option>
                    <option value="meeting">Meeting</option>
                    <option value="exercise">Exercise</option>
                    <option value="walk">Walk</option>
                    <option value="commitment">Commitment</option>
                    <option value="religious">Faith</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
                  <select
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={editTaskStartTime}
                    onChange={(e) => {
                      setEditTaskStartTime(e.target.value);
                      setEditTaskTimeError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={editTaskEndTime}
                    onChange={(e) => {
                      setEditTaskEndTime(e.target.value);
                      setEditTaskTimeError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={editTaskLocation}
                  onChange={(e) => setEditTaskLocation(e.target.value)}
                  placeholder="e.g. Home Desk, Library 3rd Floor"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Reminder Lead Times */}
              <div className="space-y-2 pt-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">🔔 Configured Reminders</label>
                  <span className="text-[11px] font-mono text-purple-400">{editTaskReminders.length} active</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { min: 0, label: 'At start' },
                    { min: 5, label: '5m' },
                    { min: 10, label: '10m' },
                    { min: 15, label: '15m' },
                    { min: 30, label: '30m' },
                    { min: 60, label: '1h' },
                    { min: 120, label: '2h' },
                    { min: 1440, label: '1d' }
                  ].map(({ min, label }) => {
                    const isSelected = editTaskReminders.includes(min);
                    return (
                      <button
                        key={min}
                        type="button"
                        onClick={() => {
                          setEditTaskReminders(prev => 
                            prev.includes(min) ? prev.filter(m => m !== min) : [...prev, min]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('none');
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Task Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
