export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export type ClassType = 'Lecture' | 'Lab Practical' | 'Tutorial' | 'Studio' | 'Seminar';

export type CourseDomain = 'core' | 'programming' | 'data' | 'systems' | 'personal' | 'general';

export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';

export type CourseLifecycleStatus = 'active' | 'cancelled' | 'rescheduled' | 'postponed' | 'completed' | 'deleted';

export interface OccurrenceOverride {
  date: string; // "YYYY-MM-DD" of the scheduled occurrence
  status: 'cancelled' | 'rescheduled' | 'postponed' | 'completed';
  reason?: string;
  // Rescheduled occurrence details
  rescheduledDate?: string; // "YYYY-MM-DD"
  rescheduledDay?: DayOfWeek;
  rescheduledStartTime?: string;
  rescheduledEndTime?: string;
  rescheduledTimeDisplay?: string;
  rescheduledVenue?: string;
  rescheduledInstructions?: string;
}

export type CustomFieldType = 
  | 'text' 
  | 'long_text' 
  | 'number' 
  | 'date' 
  | 'time' 
  | 'dropdown' 
  | 'multi_select' 
  | 'checkbox' 
  | 'url';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  appliesTo: 'course' | 'task' | 'all';
  required?: boolean;
  options?: string[];
  defaultValue?: string | number | boolean | string[];
}

export interface TimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  lecturer: string;
  lecturerPhone?: string;
  lecturerEmail?: string; // backwards compatibility
  day: DayOfWeek;
  dayIndex: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
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
  colorTheme: 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | 'blue';
  description: string;
  techStack?: string[];
  academicPeriod?: string; // e.g. "Semester II, 2026/2027"
  instructions?: string; // Special remarks or instructions
  status?: CourseLifecycleStatus; // Default 'active'
  occurrenceOverrides?: OccurrenceOverride[]; // Specific dates cancelled/rescheduled
  isCancelled?: boolean;
  cancelReason?: string;
  lastUpdated?: string;
  originalTime?: string;
  studentGroup?: string;
  customFields?: Record<string, string | number | boolean | string[]>;
}

export type GlobalThemeMode = 'light' | 'dark';

export interface PersonalTask {
  id: string;
  title: string;
  description: string; // simple lightweight task note
  category: 'study' | 'project' | 'assignment' | 'exercise' | 'walk' | 'reading' | 'meeting' | 'commitment' | 'religious' | 'personal' | 'other';
  priority: ActivityPriority;
  status: ActivityStatus;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  startMinutes: number;
  endMinutes: number;
  location?: string;
  reminderIntervals: number[]; // e.g. [30, 15, 5]
  recurring?: {
    enabled: boolean;
    days: DayOfWeek[];
  };
  customFields?: Record<string, string | number | boolean | string[]>;
  courseId?: string; // optional link to a course
  createdAt: string;
  updatedAt: string;
}

export interface SupportingDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  mimeType: string;
  size: number;
  sizeFormatted: string; // e.g. "1.4 MB"
  url: string; // base64 data URL or path
  uploadedAt: string;
}

export interface SessionNote {
  id: string;
  timetableEntryId?: string;
  courseCode?: string;
  sessionDate?: string; // "YYYY-MM-DD"
  date?: string; // backwards compatibility
  sessionTimeSlot?: string; // "8:00 AM - 10:00 AM"
  timeSlot?: string; // backwards compatibility
  venue?: string;
  title: string;
  content: string; // What I learned / detailed notes
  keyConcepts: string[]; // Important concepts
  lecturerExplanations?: string[]; // Lecturer explanations
  lecturerHighlights?: string[]; // Backwards compatibility
  assignments: string[]; // Assignments
  questions: string[]; // Questions
  researchItems?: string[]; // Things to research later
  summary?: string; // Brief summary
  documents?: SupportingDocument[]; // Attached learning materials (PDF, images, etc.)
  references?: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimetableChangeLog {
  id: string;
  entryId: string;
  courseCode: string;
  courseName: string;
  changeType: 'created' | 'rescheduled' | 'cancelled' | 'postponed' | 'venue_changed' | 'lecturer_changed' | 'restored' | 'duplicated' | 'deleted';
  previousDetails: string;
  newDetails: string;
  reason?: string;
  targetDate?: string; // if change applies to a specific occurrence
  timestamp: string;
  performedBy: string;
  notifiedStudentsCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  courseCode?: string;
  taskId?: string;
  venue?: string;
  timeSlot?: string;
  type: 'reminder' | 'rescheduled' | 'cancelled' | 'postponed' | 'system' | 'sync' | 'task';
  timestamp: string;
  read: boolean;
  minutesBefore?: number;
  isAlarmTriggered?: boolean;
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  browserNotificationsEnabled: boolean;
  reminderIntervals: number[];
  soundType: 'alarm' | 'chime' | 'pulse' | 'subtle';
  alarmDurationSeconds: number;
  timezone: string;
  autoQuietHours: boolean;
  quietStart: string;
  quietEnd: string;
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
    first: TimetableEntry | PersonalTask;
    second: TimetableEntry | PersonalTask;
    type: 'venue_overlap' | 'time_overlap' | 'lecturer_double_booking';
    description: string;
  }>;
}
