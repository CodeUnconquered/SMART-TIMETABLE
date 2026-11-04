import { TimetableEntry, NotificationItem, NotificationPreferences, UserProfile, TimetableChangeLog, ConflictReport } from '../types/timetable';
import { INITIAL_TIMETABLE, DEFAULT_USER, DEFAULT_PREFERENCES } from './initialData';

const STORAGE_KEYS = {
  TIMETABLE: 'academic_timetable_entries_v1',
  NOTIFICATIONS: 'academic_notifications_v1',
  CHANGES: 'academic_changes_v1',
  PREFERENCES: 'academic_preferences_v1',
  USER: 'academic_user_v1',
  OFFLINE_QUEUE: 'academic_offline_queue_v1',
  LAST_SYNC: 'academic_last_sync_timestamp'
};

export function getCachedTimetable(): TimetableEntry[] {
  if (typeof window === 'undefined') return INITIAL_TIMETABLE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (!raw) {
      setCachedTimetable(INITIAL_TIMETABLE);
      return INITIAL_TIMETABLE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TIMETABLE;
  }
}

export function setCachedTimetable(entries: TimetableEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(entries));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.warn('Failed saving timetable to cache:', err);
  }
}

export function getCachedNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      const initial: NotificationItem[] = [
        {
          id: 'notif-welcome',
          title: 'Timetable Synchronized',
          message: 'BSc. Computer Science Semester II schedule is ready with 12 active modules.',
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      setCachedNotifications(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCachedNotifications(items: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed saving notifications to cache:', err);
  }
}

export function getCachedChanges(): TimetableChangeLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHANGES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedChanges(logs: TimetableChangeLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CHANGES, JSON.stringify(logs));
  } catch (err) {
    console.warn('Failed saving changes to cache:', err);
  }
}

export function getPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (err) {
    console.warn('Failed saving preferences:', err);
  }
}

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export function setUserProfile(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed saving user profile:', err);
  }
}

export function getLastSyncTime(): string {
  if (typeof window === 'undefined') return 'Never';
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString();
}

/**
 * Detect conflicts across timetable entries
 */
export function detectConflicts(entries: TimetableEntry[]): ConflictReport {
  const activeEntries = entries.filter(e => !e.isCancelled);
  const conflicts: ConflictReport['conflictingEntries'] = [];

  for (let i = 0; i < activeEntries.length; i++) {
    for (let j = i + 1; j < activeEntries.length; j++) {
      const a = activeEntries[i];
      const b = activeEntries[j];

      // Same day check
      if (a.day !== b.day) continue;

      // Time overlap check: startA < endB && startB < endA
      const timeOverlaps = a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
      if (!timeOverlaps) continue;

      // Conflict Type 1: Venue overlap (different classes in same venue at same time)
      if (a.venue.toLowerCase().trim() === b.venue.toLowerCase().trim()) {
        conflicts.push({
          first: a,
          second: b,
          type: 'venue_overlap',
          description: `Venue Conflict: Both ${a.courseCode} and ${b.courseCode} are assigned to ${a.venue} simultaneously on ${a.day}.`
        });
      }

      // Conflict Type 2: Lecturer double booking
      if (a.lecturer && b.lecturer && a.lecturer.toLowerCase().trim() === b.lecturer.toLowerCase().trim()) {
        conflicts.push({
          first: a,
          second: b,
          type: 'lecturer_double_booking',
          description: `Lecturer Conflict: ${a.lecturer} is scheduled for both ${a.courseCode} (${a.venue}) and ${b.courseCode} (${b.venue}) at the same time.`
        });
      }

      // Conflict Type 3: Student Cohort track overlap (e.g. Thursday 11:00 AM)
      if (a.venue !== b.venue && a.lecturer !== b.lecturer) {
        conflicts.push({
          first: a,
          second: b,
          type: 'time_overlap',
          description: `Schedule Conflict / Elective Overlap: ${a.courseCode} (${a.timeDisplay} at ${a.venue}) overlaps with ${b.courseCode} (${b.timeDisplay} at ${b.venue}).`
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictingEntries: conflicts
  };
}
