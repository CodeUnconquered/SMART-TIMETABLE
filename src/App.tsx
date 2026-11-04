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
import { NotificationsView } from './components/NotificationsView';
import { AdminPanel } from './components/AdminPanel';
import { ProfileView } from './components/ProfileView';
import { CourseModal } from './components/CourseModal';
import { useNotifications } from './hooks/useNotifications';
import { TimetableEntry, TimetableChangeLog, UserProfile, NotificationPreferences } from './types/timetable';
import { 
  getCachedTimetable, 
  setCachedTimetable, 
  getCachedChanges, 
  setCachedChanges, 
  getUserProfile, 
  setUserProfile, 
  getPreferences, 
  setPreferences 
} from './utils/storage';
import { DEFAULT_USER, DEFAULT_ADMIN } from './utils/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => getCachedTimetable());
  const [changeLogs, setChangeLogs] = useState<TimetableChangeLog[]>(() => getCachedChanges());
  const [user, setUser] = useState<UserProfile>(() => getUserProfile());
  const [selectedCourse, setSelectedCourse] = useState<TimetableEntry | null>(null);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Initialize notifications & sound engine
  const {
    permission,
    notifications,
    unreadCount,
    preferences,
    requestPermission,
    deliverNotification,
    triggerTestNotification,
    markAllAsRead,
    clearNotifications,
    setPreferencesState
  } = useNotifications(timetable);

  // Show a non-intrusive toast notification
  const showToast = useCallback((title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch from server / synchronize data
  const syncWithServer = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setTimetable(json.data);
          setCachedTimetable(json.data);
        }
      }

      const resChanges = await fetch('/api/changes');
      if (resChanges.ok) {
        const jsonChanges = await resChanges.json();
        if (jsonChanges.data && Array.isArray(jsonChanges.data)) {
          setChangeLogs(jsonChanges.data);
          setCachedChanges(jsonChanges.data);
        }
      }
    } catch {
      // Offline fallback: Cached data remains untouched
      console.log('[Sync] Network unreachable, running in offline mode with cached timetable.');
    }
  }, []);

  // Sync on initial load
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Switch between Student and Administrator mode
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
        showToast('Course Added', `Successfully added ${newEntry.courseCode} to timetable.`);
        return true;
      } else {
        const errJson = await res.json();
        showToast('Add Failed', errJson.error || 'Conflict detected');
        return false;
      }
    } catch {
      // Offline fallback
      const fallbackEntry: TimetableEntry = {
        ...newEntry,
        id: `bcs-${Date.now().toString(36)}`
      };
      const updated = [...timetable, fallbackEntry];
      setTimetable(updated);
      setCachedTimetable(updated);
      showToast('Saved Locally', `Offline mode: Saved ${newEntry.courseCode} to local cache.`);
      return true;
    }
  };

  // Reschedule course (Admin)
  const handleRescheduleCourse = async (courseId: string, updates: Partial<TimetableEntry>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = timetable.map(c => c.id === courseId ? json.updated : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);
        
        // Notify student locally
        deliverNotification({
          title: `TIMETABLE UPDATE: ${json.updated.courseCode}`,
          message: `${json.updated.courseName} rescheduled to ${json.updated.day} ${json.updated.timeDisplay} at ${json.updated.venue}.`,
          courseCode: json.updated.courseCode,
          venue: json.updated.venue,
          timeSlot: json.updated.timeDisplay,
          type: 'rescheduled'
        });

        syncWithServer();
        showToast('Class Rescheduled', `Updated ${json.updated.courseCode} schedule.`);
        return true;
      }
      return false;
    } catch {
      // Local fallback
      const updatedList = timetable.map(c => c.id === courseId ? { ...c, ...updates } : c);
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Updated Locally', 'Offline mode: Schedule updated in device storage.');
      return true;
    }
  };

  // Cancel course (Admin)
  const handleCancelCourse = async (courseId: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/timetable/${courseId}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        const updatedList = timetable.map(c => c.id === courseId ? json.entry : c);
        setTimetable(updatedList);
        setCachedTimetable(updatedList);

        deliverNotification({
          title: `CLASS CANCELLED: ${json.entry.courseCode}`,
          message: `${json.entry.courseName} on ${json.entry.day} cancelled. Reason: ${reason}`,
          courseCode: json.entry.courseCode,
          venue: json.entry.venue,
          timeSlot: json.entry.timeDisplay,
          type: 'cancelled'
        });

        syncWithServer();
        showToast('Class Cancelled', `Session cancelled and alert delivered.`);
        return true;
      }
      return false;
    } catch {
      const updatedList = timetable.map(c => c.id === courseId ? { ...c, isCancelled: true, cancelReason: reason } : c);
      setTimetable(updatedList);
      setCachedTimetable(updatedList);
      showToast('Cancelled Locally', 'Offline mode: Class cancelled locally.');
      return true;
    }
  };

  // Restore cancelled course
  const handleRestoreCourse = async (courseId: string): Promise<boolean> => {
    return handleRescheduleCourse(courseId, { isCancelled: false, cancelReason: undefined });
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = async (title: string, message: string) => {
    deliverNotification({
      title,
      message,
      type: 'system'
    });
    showToast('Notice Broadcast', 'Notice delivered to notification feed with audible chime.');
  };

  // Simulate reminder for a specific course
  const handleTriggerSpecificReminder = async (course?: TimetableEntry) => {
    if (course) {
      await deliverNotification({
        title: `UPCOMING CLASS REMINDER: ${course.courseCode}`,
        message: `Your ${course.courseName} class starts in 30 minutes at ${course.venue}. Please prepare and arrive on time.`,
        courseCode: course.courseCode,
        venue: course.venue,
        timeSlot: course.timeDisplay,
        type: 'reminder',
        minutesBefore: 30
      });
      showToast('Chime & Alert Dispatched', `Audible reminder triggered for ${course.courseCode}`);
    } else {
      await triggerTestNotification();
      showToast('Chime & Alert Dispatched', 'Test academic alert played with audio synthesis.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      
      {/* Offline Connectivity Banner */}
      <OfflineBanner onSync={syncWithServer} />

      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
        user={user}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main Responsive Viewport Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24 md:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            timetable={timetable}
            user={user}
            preferences={preferences}
            onSelectCourse={setSelectedCourse}
            onTriggerTestReminder={handleTriggerSpecificReminder}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'timetable' && (
          <TimetableView
            timetable={timetable}
            onSelectCourse={setSelectedCourse}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            preferences={preferences}
            onUpdatePreferences={(newPrefs) => {
              setPreferencesState(newPrefs);
              setPreferences(newPrefs);
              showToast('Preferences Saved', 'Reminder settings updated.');
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
            onAddCourse={handleAddCourse}
            onRescheduleCourse={handleRescheduleCourse}
            onCancelCourse={handleCancelCourse}
            onRestoreCourse={handleRestoreCourse}
            onBroadcastAnnouncement={handleBroadcastAnnouncement}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            preferences={preferences}
            onUpdateUser={(updated) => {
              setUser(updated);
              setUserProfile(updated);
              showToast('Profile Updated', 'Student profile details saved.');
            }}
            onSwitchRole={handleSwitchRole}
            onSync={syncWithServer}
          />
        )}
      </main>

      {/* Course Detail Syllabus & Notes Modal */}
      <CourseModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onTriggerTestReminder={(course) => handleTriggerSpecificReminder(course)}
      />

      {/* Floating System Toast */}
      {toast && (
        <aside 
          aria-label="System notification"
          className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/60 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-white animate-in slide-in-from-bottom-3"
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

      {/* Mobile Ergonomic Thumb Bottom Tab Bar */}
      <MobileBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />

      {/* Clean Footer (No-Print) */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Smart Academic Timetable</span>
            <span>·</span>
            <span>BSc. Computer Science Semester II</span>
            <span>·</span>
            <span className="font-mono text-[11px]">v3.4.1</span>
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
