/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { OfflineBanner } from './components/OfflineBanner';
import { DashboardView } from './components/DashboardView';
import { TimetableView } from './components/TimetableView';
import { PersonalTasksView } from './components/PersonalTasksView';
import { NotesLibraryView } from './components/NotesLibraryView';
import { NotificationsView } from './components/NotificationsView';
import { AdminPanel } from './components/AdminPanel';
import { CourseModal } from './components/CourseModal';
import { SessionNotesModal } from './components/SessionNotesModal';
import { TaskModal } from './components/TaskModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import { useNotifications } from './hooks/useNotifications';
import { 
  TimetableEntry, 
  TimetableChangeLog, 
  UserProfile, 
  PersonalTask, 
  SessionNote, 
  CustomFieldDefinition,
  SupportingDocument,
  DayOfWeek,
  GlobalThemeMode
} from './types/timetable';
import { 
  getCachedTimetable, 
  setCachedTimetable, 
  getCachedTasks, 
  setCachedTasks, 
  getCachedNotes, 
  setCachedNotes, 
  getCachedCustomFields, 
  setCachedCustomFields, 
  getCachedChanges, 
  setCachedChanges, 
  getUserProfile, 
  setUserProfile, 
  setPreferences,
  getGlobalTheme,
  setGlobalTheme,
  applyGlobalTheme
} from './utils/storage';
import { DEFAULT_USER, DEFAULT_ADMIN } from './utils/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => getCachedTimetable());
  const [tasks, setTasks] = useState<PersonalTask[]>(() => getCachedTasks());
  const [notes, setNotes] = useState<SessionNote[]>(() => getCachedNotes());
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => getCachedCustomFields());
  const [changeLogs, setChangeLogs] = useState<TimetableChangeLog[]>(() => getCachedChanges());
  const [user, setUser] = useState<UserProfile>(() => getUserProfile());

  // Global Theme State (light vs dark)
  const [globalTheme, setGlobalThemeState] = useState<GlobalThemeMode>(() => {
    const t = getGlobalTheme();
    applyGlobalTheme(t);
    return t;
  });

  useEffect(() => {
    applyGlobalTheme(globalTheme);
  }, [globalTheme]);

  // Active Modals state
  const [selectedCourse, setSelectedCourse] = useState<TimetableEntry | null>(null);
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<SupportingDocument | null>(null);

  const [noteModalState, setNoteModalState] = useState<{
    isOpen: boolean;
    note?: SessionNote | null;
    courseCode?: string;
    timetableEntryId?: string;
    taskId?: string;
  }>({ isOpen: false });

  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    task?: PersonalTask | null;
  }>({ isOpen: false });

  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Initialize notifications & sound engine with active alarm handler
  const {
    permission,
    notifications,
    unreadCount,
    preferences,
    activeRingingAlarm,
    dismissActiveAlarm,
    requestPermission,
    deliverNotification,
    triggerTestNotification,
    markAllAsRead,
    clearNotifications,
    setPreferencesState
  } = useNotifications(timetable, tasks);

  const showToast = useCallback((title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch from server / synchronize data
  const syncWithServer = useCallback(async () => {
    try {
      // 1. Timetable
      const res = await fetch('/api/timetable');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setTimetable(json.data);
          setCachedTimetable(json.data);
        }
      }

      // 2. Tasks
      const resTasks = await fetch('/api/tasks');
      if (resTasks.ok) {
        const jsonTasks = await resTasks.json();
        if (jsonTasks.data && Array.isArray(jsonTasks.data)) {
          setTasks(jsonTasks.data);
          setCachedTasks(jsonTasks.data);
        }
      }

      // 3. Notes
      const resNotes = await fetch('/api/notes');
      if (resNotes.ok) {
        const jsonNotes = await resNotes.json();
        if (jsonNotes.data && Array.isArray(jsonNotes.data)) {
          setNotes(jsonNotes.data);
          setCachedNotes(jsonNotes.data);
        }
      }

      // 4. Custom fields
      const resFields = await fetch('/api/custom-fields');
      if (resFields.ok) {
        const jsonFields = await resFields.json();
        if (jsonFields.data && Array.isArray(jsonFields.data)) {
          setCustomFields(jsonFields.data);
          setCachedCustomFields(jsonFields.data);
        }
      }

      // 5. Change audit log
      const resChanges = await fetch('/api/changes');
      if (resChanges.ok) {
        const jsonChanges = await resChanges.json();
        if (jsonChanges.data && Array.isArray(jsonChanges.data)) {
          setChangeLogs(jsonChanges.data);
          setCachedChanges(jsonChanges.data);
        }
      }

      // 6. Global Theme & System Settings
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const jsonSettings = await resSettings.json();
        if (jsonSettings.data && jsonSettings.data.theme) {
          const sTheme = jsonSettings.data.theme as GlobalThemeMode;
          setGlobalThemeState(sTheme);
          applyGlobalTheme(sTheme);
        }
      }
    } catch {
      console.log('[Sync] Network unreachable, running in offline mode with cached Smart Remind records.');
    }
  }, []);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Global Theme Update Handler
  const handleUpdateGlobalTheme = async (newTheme: GlobalThemeMode) => {
    setGlobalThemeState(newTheme);
    applyGlobalTheme(newTheme);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      });
      showToast(
        'System Theme Updated',
        `Switched to ${newTheme === 'light' ? 'Light Theme ☀️' : 'Dark Theme 🌙'} across the entire system.`
      );
    } catch {
      showToast(
        'Theme Saved Locally',
        `Switched to ${newTheme.toUpperCase()} theme (offline mode).`
      );
    }
  };

  // Switch Role
  const handleSwitchRole = () => {
    const newUser = user.role === 'admin' ? DEFAULT_USER : DEFAULT_ADMIN;
    setUser(newUser);
    setUserProfile(newUser);
    showToast(
      'Role Switched',
      `Switched to ${newUser.role === 'admin' ? 'Timetable Administrator' : 'Student'} profile.`
    );
  };

  // Add course (Admin)
  const handleAddCourse = async (newEntry: Omit<TimetableEntry, 'id'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      if (res.ok) {
        const json = await res.json();
        const updated = [...timetable, json.entry];
        setTimetable(updated);
        setCachedTimetable(updated);
        syncWithServer();
        showToast('Course Published', `Added ${newEntry.courseCode} to academic schedule.`);
        return true;
      } else {
        const errJson = await res.json();
        showToast('Add Failed', errJson.error || 'Conflict detected');
        return false;
      }
    } catch {
      const fallbackEntry: TimetableEntry = {
        ...newEntry,
        id: `bcs-${Date.now().toString(36)}`,
        occurrenceOverrides: []
      };
      const updated = [...timetable, fallbackEntry];
      setTimetable(updated);
      setCachedTimetable(updated);
      showToast('Saved Locally', `Offline mode: Saved ${newEntry.courseCode} to local cache.`);
      return true;
    }
  };

  // Edit course (Admin)
  const handleEditCourse = async (courseId: string, updates: Partial<TimetableEntry>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        const updatedCourse = json.updated || { ...timetable.find(c => c.id === courseId), ...updates };
        const updatedList = timetable.map(c => c.id === courseId ? updatedCourse : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);
        syncWithServer();
        showToast('Course Updated', `${updatedCourse.courseCode} changes saved successfully.`);
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.map(c => c.id === courseId ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c);
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Saved Locally', 'Offline mode: Course changes saved.');
      return true;
    }
  };

  // 1. Temporary Occurrence Cancellation (Admin)
  const handleCancelOccurrence = async (courseId: string, date: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}/cancel-occurrence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason })
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = timetable.map(c => c.id === courseId ? json.entry : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);

        deliverNotification({
          title: `CLASS OCCURRENCE CANCELLED: ${json.entry.courseCode}`,
          message: `${json.entry.courseName} session on ${date} is cancelled. (${reason}). Subsequent weekly classes will proceed normally.`,
          courseCode: json.entry.courseCode,
          venue: json.entry.venue,
          timeSlot: json.entry.timeDisplay,
          type: 'cancelled'
        });

        syncWithServer();
        showToast('Occurrence Cancelled', `Session on ${date} cancelled. Future weeks remain active.`);
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.map(c => {
        if (c.id === courseId) {
          const overrides = c.occurrenceOverrides || [];
          return {
            ...c,
            occurrenceOverrides: [
              ...overrides.filter(o => o.date !== date),
              { date, status: 'cancelled' as const, reason }
            ]
          };
        }
        return c;
      });
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Cancelled Locally', `Offline mode: Cancelled occurrence for ${date}.`);
      return true;
    }
  };

  // 2. Specific Occurrence Rescheduling (Admin)
  const handleRescheduleOccurrence = async (
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
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}/reschedule-occurrence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = timetable.map(c => c.id === courseId ? json.entry : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);

        deliverNotification({
          title: `SESSION RESCHEDULED: ${json.entry.courseCode}`,
          message: `The ${details.originalDate} session has been moved to ${details.rescheduledDay} (${details.rescheduledDate}) ${details.rescheduledTimeDisplay} at ${details.rescheduledVenue}.`,
          courseCode: json.entry.courseCode,
          venue: details.rescheduledVenue,
          timeSlot: details.rescheduledTimeDisplay,
          type: 'rescheduled'
        });

        syncWithServer();
        showToast('Occurrence Rescheduled', `Updated occurrence to ${details.rescheduledDate}.`);
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.map(c => {
        if (c.id === courseId) {
          const overrides = c.occurrenceOverrides || [];
          return {
            ...c,
            occurrenceOverrides: [
              ...overrides.filter(o => o.date !== details.originalDate),
              {
                date: details.originalDate,
                status: 'rescheduled' as const,
                reason: details.reason,
                rescheduledDate: details.rescheduledDate,
                rescheduledDay: details.rescheduledDay,
                rescheduledStartTime: details.rescheduledStartTime,
                rescheduledEndTime: details.rescheduledEndTime,
                rescheduledTimeDisplay: details.rescheduledTimeDisplay,
                rescheduledVenue: details.rescheduledVenue,
                rescheduledInstructions: details.rescheduledInstructions
              }
            ]
          };
        }
        return c;
      });
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Rescheduled Locally', `Offline mode: Saved occurrence reschedule.`);
      return true;
    }
  };

  // 3. Restore Specific Occurrence
  const handleRestoreOccurrence = async (courseId: string, date: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}/restore-occurrence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = timetable.map(c => c.id === courseId ? json.entry : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);
        syncWithServer();
        showToast('Occurrence Restored', `Restored regular schedule for ${date}.`);
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.map(c => {
        if (c.id === courseId) {
          const overrides = c.occurrenceOverrides || [];
          return {
            ...c,
            occurrenceOverrides: overrides.filter(o => o.date !== date)
          };
        }
        return c;
      });
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Restored Locally', `Offline mode: Restored occurrence.`);
      return true;
    }
  };

  // 4. Permanent Course Deletion Everywhere
  const handleDeleteCoursePermanent = async (courseId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedList = timetable.filter(c => c.id !== courseId);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);
        syncWithServer();
        showToast('Course Deleted Everywhere', 'Course purged completely from all timetables and reminders.');
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.filter(c => c.id !== courseId);
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Deleted Locally', 'Offline mode: Removed from local cache.');
      return true;
    }
  };

  // Duplicate course (Admin)
  const handleDuplicateCourse = async (courseId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}/duplicate`, {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = [...timetable, json.entry];
        setTimetable(updatedList);
        setCachedTimetable(updatedList);
        syncWithServer();
        showToast('Section Duplicated', `Duplicated section created.`);
        return true;
      }
      return false;
    } catch {
      const original = timetable.find(c => c.id === courseId);
      if (original) {
        const dupe: TimetableEntry = { 
          ...original, 
          id: `bcs-copy-${Date.now().toString(36)}`, 
          courseName: `${original.courseName} (Section B)`,
          occurrenceOverrides: []
        };
        const updated = [...timetable, dupe];
        setTimetable(updated);
        setCachedTimetable(updated);
        showToast('Duplicated Locally', 'Offline mode: Duplicated section locally.');
        return true;
      }
      return false;
    }
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = async (title: string, message: string) => {
    deliverNotification({
      title,
      message,
      type: 'system'
    });
    showToast('Notice Broadcast', 'Delivered notice to cohort with audible alert.');
  };

  // Add custom field definition
  const handleAddCustomField = async (field: Omit<CustomFieldDefinition, 'id'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field)
      });
      if (res.ok) {
        const json = await res.json();
        const updated = [...customFields, json.field];
        setCustomFields(updated);
        setCachedCustomFields(updated);
        return true;
      }
      return false;
    } catch {
      const fallback: CustomFieldDefinition = { ...field, id: `cf-${Date.now().toString(36)}` };
      const updated = [...customFields, fallback];
      setCustomFields(updated);
      setCachedCustomFields(updated);
      return true;
    }
  };

  // Task Operations (Strictly Lightweight Personal Tasks)
  const handleSaveTask = async (taskData: Omit<PersonalTask, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (taskData.id) {
      try {
        const res = await fetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (res.ok) {
          const json = await res.json();
          const updated = tasks.map(t => t.id === taskData.id ? json.task : t);
          setTasks(updated);
          setCachedTasks(updated);
          showToast('Task Updated', `Saved changes to "${taskData.title}".`);
          return;
        }
      } catch {
        // fallback
      }
      const updated = tasks.map(t => t.id === taskData.id ? { ...t, ...taskData, updatedAt: new Date().toISOString() } : t);
      setTasks(updated);
      setCachedTasks(updated);
      showToast('Saved Locally', `Task updated in local cache.`);
    } else {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (res.ok) {
          const json = await res.json();
          const updated = [json.task, ...tasks];
          setTasks(updated);
          setCachedTasks(updated);
          showToast('Task Scheduled', `Scheduled "${taskData.title}".`);
          return;
        }
      } catch {
        // fallback
      }
      const newTask: PersonalTask = {
        ...taskData,
        id: `task-${Date.now().toString(36)}`,
        status: taskData.status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updated = [newTask, ...tasks];
      setTasks(updated);
      setCachedTasks(updated);
      showToast('Scheduled Locally', `Saved "${taskData.title}" offline.`);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, updates: Partial<PersonalTask>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch {
      // ignore
    }
    const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    setTasks(updated);
    setCachedTasks(updated);
    showToast('Task Updated', 'Status updated.');
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    setCachedTasks(updated);
    showToast('Task Removed', 'Activity deleted from schedule.');
  };

  // Notes Operations
  const handleSaveNote = async (noteData: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (noteData.id) {
      try {
        const res = await fetch(`/api/notes/${noteData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData)
        });
        if (res.ok) {
          const json = await res.json();
          const updated = notes.map(n => n.id === noteData.id ? json.note : n);
          setNotes(updated);
          setCachedNotes(updated);
          showToast('Note Updated', `Saved notes for "${noteData.title}".`);
          return;
        }
      } catch {
        // fallback
      }
      const updated = notes.map(n => n.id === noteData.id ? { ...n, ...noteData, updatedAt: new Date().toISOString() } : n);
      setNotes(updated);
      setCachedNotes(updated);
      showToast('Saved Locally', 'Note updated in local cache.');
    } else {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData)
        });
        if (res.ok) {
          const json = await res.json();
          const updated = [json.note, ...notes];
          setNotes(updated);
          setCachedNotes(updated);
          showToast('Note Recorded', `Added session note to Notes Library.`);
          return;
        }
      } catch {
        // fallback
      }
      const newNote: SessionNote = {
        ...noteData,
        id: `note-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updated = [newNote, ...notes];
      setNotes(updated);
      setCachedNotes(updated);
      showToast('Saved Locally', 'Session note saved in local cache.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    setCachedNotes(updated);
    showToast('Note Deleted', 'Removed from Notes Library.');
  };

  // Specific Reminder / Alarm test
  const handleTriggerSpecificReminder = async (course?: TimetableEntry) => {
    if (course) {
      await deliverNotification({
        title: `UPCOMING CLASS REMINDER: ${course.courseCode}`,
        message: `Your ${course.courseName} class starts in 30 minutes at ${course.venue}. Please prepare and arrive promptly.`,
        courseCode: course.courseCode,
        venue: course.venue,
        timeSlot: course.timeDisplay,
        type: 'reminder',
        minutesBefore: 30
      });
      showToast('Audible Alarm Triggered', `10-second alarm sounding for ${course.courseCode}`);
    } else {
      await triggerTestNotification();
      showToast('Audible Alarm Triggered', '10-second test alarm sequence sounding.');
    }
  };

  const handleTriggerTaskReminder = async (task: PersonalTask) => {
    await deliverNotification({
      title: `TASK REMINDER: ${task.title}`,
      message: `Your scheduled ${task.category.toUpperCase()} session starts now at ${task.location || 'designated venue'}.`,
      taskId: task.id,
      venue: task.location,
      timeSlot: `${task.startTime} - ${task.endTime}`,
      type: 'task',
      minutesBefore: 15
    });
    showToast('Task Alarm Triggered', `Alarm sounding for "${task.title}".`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      
      {/* Offline Connectivity Banner */}
      <OfflineBanner onSync={syncWithServer} />

      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
        user={user}
        currentTheme={globalTheme}
        onToggleTheme={() => handleUpdateGlobalTheme(globalTheme === 'dark' ? 'light' : 'dark')}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main Responsive Viewport Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24 lg:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            timetable={timetable}
            tasks={tasks}
            notes={notes}
            user={user}
            preferences={preferences}
            onSelectCourse={setSelectedCourse}
            onSelectTask={(task) => setTaskModalState({ isOpen: true, task })}
            onTriggerTestReminder={handleTriggerSpecificReminder}
            onOpenNoteModal={(note, courseCode) => setNoteModalState({ isOpen: true, note, courseCode })}
            onOpenTaskModal={(task) => setTaskModalState({ isOpen: true, task })}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'timetable' && (
          <TimetableView
            timetable={timetable}
            tasks={tasks}
            onSelectCourse={setSelectedCourse}
            onSelectTask={(task) => setTaskModalState({ isOpen: true, task })}
            onToggleTaskComplete={(taskId, currentStatus) => {
              handleUpdateTaskStatus(taskId, {
                status: currentStatus === 'completed' ? 'pending' : 'completed'
              });
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <PersonalTasksView
            tasks={tasks}
            customFields={customFields}
            onOpenTaskModal={(task) => setTaskModalState({ isOpen: true, task })}
            onUpdateTask={handleUpdateTaskStatus}
            onDeleteTask={handleDeleteTask}
            onTriggerTaskReminder={handleTriggerTaskReminder}
          />
        )}

        {activeTab === 'notes' && (
          <NotesLibraryView
            notes={notes}
            timetable={timetable}
            onOpenNoteModal={(note, courseCode) => setNoteModalState({ isOpen: true, note, courseCode })}
            onDeleteNote={handleDeleteNote}
            onOpenDocumentViewer={setActiveDocumentViewer}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            preferences={preferences}
            onUpdatePreferences={(newPrefs) => {
              setPreferencesState(newPrefs);
              setPreferences(newPrefs);
              showToast('Preferences Saved', 'Reminder and alarm settings updated.');
            }}
            onMarkAllAsRead={markAllAsRead}
            onClearNotifications={clearNotifications}
            onTriggerTestReminder={triggerTestNotification}
            onRequestPermission={requestPermission}
            permissionStatus={permission}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            timetable={timetable}
            changeLogs={changeLogs}
            tasks={tasks}
            customFields={customFields}
            currentTheme={globalTheme}
            onUpdateGlobalTheme={handleUpdateGlobalTheme}
            onAddCourse={handleAddCourse}
            onEditCourse={handleEditCourse}
            onEditTask={handleUpdateTaskStatus}
            onDeleteTask={handleDeleteTask}
            onCancelOccurrence={handleCancelOccurrence}
            onRescheduleOccurrence={handleRescheduleOccurrence}
            onRestoreOccurrence={handleRestoreOccurrence}
            onDeleteCoursePermanent={handleDeleteCoursePermanent}
            onDuplicateCourse={handleDuplicateCourse}
            onBroadcastAnnouncement={handleBroadcastAnnouncement}
            onAddCustomField={handleAddCustomField}
          />
        )}
      </main>

      {/* Floating Audible Alarm Ringing Modal */}
      {activeRingingAlarm && activeRingingAlarm.isOpen && (
        <AlarmRingingModal
          isOpen={activeRingingAlarm.isOpen}
          title={activeRingingAlarm.title}
          message={activeRingingAlarm.message}
          courseCode={activeRingingAlarm.courseCode}
          venue={activeRingingAlarm.venue}
          timeSlot={activeRingingAlarm.timeSlot}
          durationSeconds={preferences.alarmDurationSeconds || 10}
          onDismiss={dismissActiveAlarm}
        />
      )}

      {/* Course Detail Syllabus Modal */}
      <CourseModal
        course={selectedCourse}
        notes={notes}
        customFields={customFields}
        onClose={() => setSelectedCourse(null)}
        onTriggerTestReminder={(course) => handleTriggerSpecificReminder(course)}
        onOpenNoteModal={(courseCode, entryId, note) => {
          setSelectedCourse(null);
          setNoteModalState({ isOpen: true, courseCode, timetableEntryId: entryId, note });
        }}
        onOpenDocumentViewer={setActiveDocumentViewer}
      />

      {/* Session Notes Modal */}
      <SessionNotesModal
        isOpen={noteModalState.isOpen}
        onClose={() => setNoteModalState({ isOpen: false })}
        note={noteModalState.note}
        courseCode={noteModalState.courseCode}
        timetableEntryId={noteModalState.timetableEntryId}
        taskId={noteModalState.taskId}
        onSave={handleSaveNote}
        onOpenDocumentViewer={setActiveDocumentViewer}
      />

      {/* Lightweight Personal Task Modal */}
      <TaskModal
        isOpen={taskModalState.isOpen}
        onClose={() => setTaskModalState({ isOpen: false })}
        task={taskModalState.task}
        customFields={customFields}
        onSave={handleSaveTask}
      />

      {/* In-Browser Supporting Document Viewer Modal */}
      <DocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />

      {/* Floating System Toast */}
      {toast && (
        <aside 
          aria-label="System notification"
          className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/60 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-white animate-in slide-in-from-bottom-3"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <span className="font-bold block text-cyan-300">{toast.title}</span>
            <span className="text-slate-300">{toast.message}</span>
          </div>
        </aside>
      )}

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <MobileBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />

      {/* Clean Modern Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-200">Smart Remind</span>
            <span>·</span>
            <span>Academic & Personal Productivity Management System</span>
            <span>·</span>
            <span className="font-mono text-[11px]">v4.0.0</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>PWA & Offline Capable</span>
            <span>·</span>
            <span>Timezone: Africa/Nairobi</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
