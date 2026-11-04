export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ClassType = 'Lecture' | 'Lab Practical' | 'Tutorial' | 'Studio' | 'Seminar';

export type CourseDomain = 'core' | 'programming' | 'data' | 'systems';

export interface TimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  lecturer: string;
  lecturerEmail?: string;
  day: DayOfWeek;
  dayIndex: number; // 1 = Mon, 5 = Fri
  startTime: string; // "07:00"
  endTime: string; // "10:00"
  timeDisplay: string; // "7:00 AM - 10:00 AM"
  startMinutes: number; // minutes from midnight
  endMinutes: number;
  venue: string;
  building: string;
  classType: ClassType;
  domain: CourseDomain;
  domainLabel: string;
  credits: number;
  colorTheme: 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo';
  description: string;
  techStack: string[];
  isCancelled?: boolean;
  cancelReason?: string;
  lastUpdated?: string;
  originalTime?: string;
  studentGroup?: string;
}

export interface TimetableChangeLog {
  id: string;
  entryId: string;
  courseCode: string;
  courseName: string;
  changeType: 'rescheduled' | 'cancelled' | 'venue_changed' | 'lecturer_changed' | 'restored';
  previousDetails: string;
  newDetails: string;
  timestamp: string;
  performedBy: string;
  notifiedStudentsCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  courseCode?: string;
  venue?: string;
  timeSlot?: string;
  type: 'reminder' | 'rescheduled' | 'cancelled' | 'system' | 'sync';
  timestamp: string;
  read: boolean;
  minutesBefore?: number;
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  browserNotificationsEnabled: boolean;
  reminderIntervals: number[]; // e.g. [30, 15, 5]
  soundType: 'chime' | 'pulse' | 'subtle';
  timezone: string; // e.g. 'Africa/Nairobi'
  autoQuietHours: boolean;
  quietStart: string; // '22:00'
  quietEnd: string; // '06:00'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  studentId: string;
  program: string;
  year: string;
  semester: string;
  academicGroup: string;
  avatarUrl?: string;
}

export interface ConflictReport {
  hasConflict: boolean;
  conflictingEntries: Array<{
    first: TimetableEntry;
    second: TimetableEntry;
    type: 'venue_overlap' | 'time_overlap' | 'lecturer_double_booking';
    description: string;
  }>;
}
