import { 
  TimetableEntry, 
  NotificationItem, 
  NotificationPreferences, 
  UserProfile, 
  TimetableChangeLog, 
  ConflictReport,
  PersonalTask,
  SessionNote,
  CustomFieldDefinition,
  GlobalThemeMode
} from '../types/timetable';
import { 
  INITIAL_TIMETABLE, 
  DEFAULT_USER, 
  DEFAULT_PREFERENCES,
  INITIAL_TASKS,
  INITIAL_NOTES,
  INITIAL_CUSTOM_FIELDS
} from './initialData';

const STORAGE_KEYS = {
  TIMETABLE: 'smart_remind_timetable_entries_v2',
  NOTIFICATIONS: 'smart_remind_notifications_v2',
  CHANGES: 'smart_remind_changes_v2',
  PREFERENCES: 'smart_remind_preferences_v2',
  USER: 'smart_remind_user_v2',
  TASKS: 'smart_remind_personal_tasks_v2',
  NOTES: 'smart_remind_session_notes_v2',
  CUSTOM_FIELDS: 'smart_remind_custom_fields_v2',
  THEME: 'smart_remind_global_theme_v1',
  LAST_SYNC: 'smart_remind_last_sync_timestamp',
  AUTH_TOKEN: 'smart_remind_auth_token_v3'
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getCachedTimetable(): TimetableEntry[] {
  if (typeof window === 'undefined') return INITIAL_TIMETABLE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (!raw) {
      setCachedTimetable(INITIAL_TIMETABLE);
      return INITIAL_TIMETABLE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TIMETABLE;
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

export function getCachedTasks(): PersonalTask[] {
  if (typeof window === 'undefined') return INITIAL_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      setCachedTasks(INITIAL_TASKS);
      return INITIAL_TASKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

export function setCachedTasks(tasks: PersonalTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.warn('Failed saving tasks to cache:', err);
  }
}

export function getCachedNotes(): SessionNote[] {
  if (typeof window === 'undefined') return INITIAL_NOTES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) {
      setCachedNotes(INITIAL_NOTES);
      return INITIAL_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTES;
  } catch {
    return INITIAL_NOTES;
  }
}

export function setCachedNotes(notes: SessionNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (err) {
    console.warn('Failed saving notes to cache:', err);
  }
}

export function getCachedCustomFields(): CustomFieldDefinition[] {
  if (typeof window === 'undefined') return INITIAL_CUSTOM_FIELDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS);
    if (!raw) {
      setCachedCustomFields(INITIAL_CUSTOM_FIELDS);
      return INITIAL_CUSTOM_FIELDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CUSTOM_FIELDS;
  } catch {
    return INITIAL_CUSTOM_FIELDS;
  }
}

export function setCachedCustomFields(fields: CustomFieldDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS, JSON.stringify(fields));
  } catch (err) {
    console.warn('Failed saving custom fields to cache:', err);
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
          title: 'Smart Remind Activated',
          message: 'Academic timetable & personal productivity assistant synchronized for Semester II.',
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      setCachedNotifications(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
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
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.reminderIntervals)
      ? { ...DEFAULT_PREFERENCES, ...parsed }
      : DEFAULT_PREFERENCES;
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
    if (!raw) return DEFAULT_USER;
    const parsed = JSON.parse(raw);
    return parsed && parsed.name ? { ...DEFAULT_USER, ...parsed } : DEFAULT_USER;
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
 * Detect conflicts across timetable entries and personal tasks
 */
export function detectConflicts(
  entries: TimetableEntry[],
  tasks: PersonalTask[] = []
): ConflictReport {
  const activeEntries = entries.filter(e => !e.isCancelled);
  const conflicts: ConflictReport['conflictingEntries'] = [];

  // 1. Course vs Course
  for (let i = 0; i < activeEntries.length; i++) {
    for (let j = i + 1; j < activeEntries.length; j++) {
      const a = activeEntries[i];
      const b = activeEntries[j];

      if (a.day !== b.day) continue;
      const timeOverlaps = a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
      if (!timeOverlaps) continue;

      if (a.venue.toLowerCase().trim() === b.venue.toLowerCase().trim()) {
        conflicts.push({
          first: a,
          second: b,
          type: 'venue_overlap',
          description: `Venue Conflict: Both ${a.courseCode} and ${b.courseCode} are assigned to ${a.venue} simultaneously on ${a.day}.`
        });
      } else if (a.lecturer && b.lecturer && a.lecturer.toLowerCase().trim() === b.lecturer.toLowerCase().trim()) {
        conflicts.push({
          first: a,
          second: b,
          type: 'lecturer_double_booking',
          description: `Lecturer Conflict: ${a.lecturer} is scheduled for both ${a.courseCode} (${a.venue}) and ${b.courseCode} (${b.venue}) at the same time.`
        });
      } else {
        conflicts.push({
          first: a,
          second: b,
          type: 'time_overlap',
          description: `Schedule Conflict / Track Overlap: ${a.courseCode} (${a.timeDisplay} at ${a.venue}) overlaps with ${b.courseCode} (${b.timeDisplay} at ${b.venue}).`
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictingEntries: conflicts
  };
}

/**
 * Global Theme Management across Smart Remind
 */
export function getGlobalTheme(): GlobalThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) as GlobalThemeMode;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // fallback
  }
  return 'dark';
}

export function setGlobalTheme(theme: GlobalThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.warn('Failed saving global theme:', err);
  }
}

export function applyGlobalTheme(theme: GlobalThemeMode): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  setGlobalTheme(theme);

  // Update browser theme color for mobile status bars
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#020617' : '#0284c7');
  }
}

