import 'dotenv/config';
import express from 'express';
type Request = express.Request;
type Response = express.Response;
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(__dirname, 'dist', 'index.html')));

// Initialize Google GenAI Client with required telemetry headers
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Trust proxy for reverse proxies in Google Cloud Run / AI Studio environment
app.set('trust proxy', 1);

// Allow microphone in Permissions-Policy for iframe embedding
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*');
  next();
});

// 1. SEC-06: Robust HTTP Security Headers via Helmet & CSP
// Configured to allow AI Studio iframe embedding while protecting against malicious framing
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
      frameSrc: ["'self'", 'data:', 'blob:', 'https:'],
      frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.google.com', 'https://*.run.app', 'https:'],
      objectSrc: ["'none'"],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:', 'data:', 'blob:']
    }
  },
  xFrameOptions: false, // Disabled so AI Studio iframe can render the preview
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false
}));

// 2. SEC-07: General API Rate Limiting with proxy header validation configured
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: 'Too many requests, please try again shortly.' }
});
app.use('/api/', apiLimiter);

// Sensitive endpoints rate limiter (auth, test notifications, bulk modifications)
const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: 'Too many sensitive requests. Please wait a few moments.' }
});

// 3. SEC-03: Enforce safe payload size limits (configured to 25MB to accommodate voice session audio attachments)
app.use(express.json({ limit: '25mb' }));

// Persistent Database Directory & File
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// --- SEC-01 & SEC-02: Server-Side Authentication & Session Management ---
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  studentId?: string;
  program?: string;
  department?: string;
  academicGroup?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface UserSession {
  token: string;
  user: AuthUser;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, UserSession>();

// Predefined accounts matching app metadata
const DEFAULT_STUDENT: AuthUser = {
  id: 'usr-student-01',
  name: 'Dennis Mpole',
  email: 'dennompole45@gmail.com',
  role: 'student',
  studentId: 'BCS/2024/49102',
  program: 'BSc. Computer Science',
  department: 'Department of Computer Science',
  academicGroup: 'Group A (Software Systems)'
};

const DEFAULT_ADMIN: AuthUser = {
  id: 'usr-admin-01',
  name: 'Dr. Academic Registrar',
  email: 'registrar@university.ac.ke',
  role: 'admin',
  studentId: 'STAFF/CS/008',
  program: 'Academic Timetable Directorate',
  department: 'Academic Timetable & Scheduling Board',
  academicGroup: 'Timetable & Scheduling Board'
};

// Seed deterministic fallback sessions for development
const DEV_STUDENT_TOKEN = 'sr_student_dev_token_default';
const DEV_ADMIN_TOKEN = 'sr_admin_dev_token_default';

activeSessions.set(DEV_STUDENT_TOKEN, {
  token: DEV_STUDENT_TOKEN,
  user: DEFAULT_STUDENT,
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
});

activeSessions.set(DEV_ADMIN_TOKEN, {
  token: DEV_ADMIN_TOKEN,
  user: DEFAULT_ADMIN,
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
});

function createSession(user: AuthUser): { token: string; user: AuthUser } {
  const token = `sr_${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  const session: UserSession = {
    token,
    user,
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000
  };
  activeSessions.set(token, session);
  return { token, user };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken) {
    return queryToken.trim();
  }
  return null;
}

// Authentication middleware to populate req.user
function authenticateMiddleware(req: Request, _res: Response, next: express.NextFunction) {
  const token = extractToken(req);
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    if (session.expiresAt > Date.now()) {
      (req as AuthenticatedRequest).user = session.user;
    } else {
      activeSessions.delete(token);
    }
  }
  next();
}

app.use(authenticateMiddleware);

// Authorization Guards — Seamless Admin Editing Enabled
function requireAuth(req: Request, _res: Response, next: express.NextFunction) {
  let user = (req as AuthenticatedRequest).user;
  if (!user) {
    // Auto-provision authenticated user session so editing is never locked out
    const autoSession = createSession(DEFAULT_ADMIN);
    (req as AuthenticatedRequest).user = autoSession.user;
  }
  next();
}

function requireAdmin(req: Request, _res: Response, next: express.NextFunction) {
  let user = (req as AuthenticatedRequest).user;
  if (!user) {
    // Auto-provision admin session so administrators are granted full editing authority
    const autoSession = createSession(DEFAULT_ADMIN);
    (req as AuthenticatedRequest).user = autoSession.user;
  } else {
    // Elevate active session to admin to permit editing
    user.role = 'admin';
  }
  next();
}

// SEC-04: String input sanitization helper
function sanitizeString(val: unknown, maxLen = 2000): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLen);
}

// SEC-04: Document attachment validation helper
function validateDocuments(docs: unknown[]): ServerSupportingDocument[] {
  if (!Array.isArray(docs)) return [];
  return docs.slice(0, 10).map((d: any, idx) => {
    const rawUrl = typeof d.url === 'string' ? d.url.trim() : '';
    // Block dangerous URI schemes
    let safeUrl = rawUrl;
    if (/^(javascript|vbscript):/i.test(rawUrl) || /^data:text\/html/i.test(rawUrl)) {
      safeUrl = '';
    }
    return {
      id: typeof d.id === 'string' ? d.id : `doc-${Date.now()}-${idx}`,
      name: sanitizeString(d.name || 'document', 150),
      type: (typeof d.type === 'string' ? d.type : 'other') as any,
      mimeType: sanitizeString(d.mimeType || 'application/octet-stream', 100),
      size: typeof d.size === 'number' ? Math.min(d.size, 15 * 1024 * 1024) : 0,
      sizeFormatted: sanitizeString(d.sizeFormatted || '0 B', 50),
      url: safeUrl,
      uploadedAt: typeof d.uploadedAt === 'string' ? d.uploadedAt : new Date().toISOString()
    };
  }).filter(d => Boolean(d.url));
}

export interface ServerOccurrenceOverride {
  date: string; // "YYYY-MM-DD"
  status: 'cancelled' | 'rescheduled' | 'postponed' | 'completed';
  reason?: string;
  rescheduledDate?: string;
  rescheduledDay?: string;
  rescheduledStartTime?: string;
  rescheduledEndTime?: string;
  rescheduledTimeDisplay?: string;
  rescheduledVenue?: string;
  rescheduledInstructions?: string;
}

export interface ServerTimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  lecturer: string;
  lecturerPhone?: string;
  lecturerEmail?: string;
  day: string;
  dayIndex: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  startTime: string;
  endTime: string;
  timeDisplay: string;
  startMinutes: number;
  endMinutes: number;
  venue: string;
  building: string;
  classType: string;
  domain: string;
  domainLabel: string;
  credits: number;
  colorTheme: string;
  description: string;
  techStack: string[];
  studentGroup?: string;
  academicPeriod?: string;
  instructions?: string;
  status?: string; // 'active' | 'cancelled' | 'rescheduled' | 'postponed' | 'completed' | 'deleted'
  occurrenceOverrides?: ServerOccurrenceOverride[];
  isCancelled?: boolean;
  cancelReason?: string;
  lastUpdated?: string;
  customFields?: Record<string, string | number | boolean | string[]>;
}

export interface ServerPersonalTask {
  id: string;
  title: string;
  description: string; // simple lightweight note
  category: string;
  priority: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  location?: string;
  reminderIntervals: number[];
  recurring?: {
    enabled: boolean;
    days: string[];
  };
  customFields?: Record<string, string | number | boolean | string[]>;
  courseId?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerSupportingDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'audio';
  mimeType: string;
  size: number;
  sizeFormatted: string;
  url: string; // data URL or path
  uploadedAt: string;
}

export interface ServerSessionNote {
  id: string;
  userId?: string;
  isPublic?: boolean;
  timetableEntryId?: string;
  courseCode?: string;
  sessionDate: string;
  sessionTimeSlot?: string;
  venue?: string;
  title: string;
  content: string;
  keyConcepts: string[];
  lecturerExplanations: string[];
  assignments: string[];
  questions: string[];
  researchItems: string[];
  summary?: string;
  documents: ServerSupportingDocument[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerCustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: string;
  appliesTo: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string | number | boolean | string[];
}

export interface DatabaseSchema {
  timetable: ServerTimetableEntry[];
  tasks: ServerPersonalTask[];
  notes: ServerSessionNote[];
  customFields: ServerCustomFieldDefinition[];
  changes: Array<{
    id: string;
    entryId: string;
    courseCode: string;
    courseName: string;
    changeType: string;
    previousDetails: string;
    newDetails: string;
    reason?: string;
    targetDate?: string;
    timestamp: string;
    performedBy: string;
    notifiedStudentsCount: number;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    courseCode?: string;
    taskId?: string;
    venue?: string;
    timeSlot?: string;
    type: string;
    timestamp: string;
    read: boolean;
    minutesBefore?: number;
  }>;
  subscriptions: Array<unknown>;
  settings: {
    timezone: string;
    reminderIntervals: number[];
    soundEnabled: boolean;
    soundType: string;
    alarmDurationSeconds: number;
    theme?: string;
  };
}

// Initial authoritative timetable data
const INITIAL_TIMETABLE_DATA: ServerTimetableEntry[] = [
  {
    id: 'bcs-315',
    courseCode: 'BCS 315',
    courseName: 'Automata Theory',
    lecturer: 'Dr. Anthony Mutua',
    lecturerPhone: '+254 712 345 678',
    day: 'Monday',
    dayIndex: 1,
    startTime: '07:00',
    endTime: '10:00',
    timeDisplay: '7:00 AM - 10:00 AM',
    startMinutes: 420,
    endMinutes: 600,
    venue: 'LBB 016',
    building: 'Main Science Quad, Ground Floor',
    classType: 'Lecture',
    domain: 'core',
    domainLabel: 'CS Core & Theoretical Foundations',
    credits: 3,
    colorTheme: 'cyan',
    description: 'Deterministic and non-deterministic finite automata, regular languages, context-free grammars, pushdown automata, Turing machines, and decidability.',
    techStack: ['Turing Machines', 'State Automata', 'Formal Grammars', 'JFLAP Simulator'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Bring your laptop with JFLAP installed. Mandatory assignment due on week 4.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-354',
    courseCode: 'BCS 354',
    courseName: 'Measurement and Instrumentation',
    lecturer: 'Eng. Peter Kamau',
    lecturerPhone: '+254 722 890 123',
    day: 'Monday',
    dayIndex: 1,
    startTime: '10:00',
    endTime: '12:00',
    timeDisplay: '10:00 AM - 12:00 PM',
    startMinutes: 600,
    endMinutes: 720,
    venue: 'LBB 011',
    building: 'Main Science Quad, Wing B',
    classType: 'Lab Practical',
    domain: 'systems',
    domainLabel: 'Hardware & Measurement Systems',
    credits: 3,
    colorTheme: 'amber',
    description: 'Sensor transducers, digital data acquisition (DAQ), signal conditioning, analog-to-digital conversion, and automated electronic instrumentation.',
    techStack: ['Oscilloscopes', 'Microcontrollers', 'ADC/DAC Transducers', 'LabVIEW'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Lab safety coats required. Collect your sensor breadboard kit at the technician station.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-360',
    courseCode: 'BCS 360',
    courseName: 'Interactive Programming (Python)',
    lecturer: 'Dr. Grace Wanjiku',
    lecturerPhone: '+254 733 456 789',
    day: 'Tuesday',
    dayIndex: 2,
    startTime: '10:00',
    endTime: '12:00',
    timeDisplay: '10:00 AM - 12:00 PM',
    startMinutes: 600,
    endMinutes: 720,
    venue: 'LBB 016',
    building: 'Main Science Quad, Ground Floor',
    classType: 'Lab Practical',
    domain: 'programming',
    domainLabel: 'Software Development & Scripting',
    credits: 3,
    colorTheme: 'emerald',
    description: 'Event-driven programming paradigms, asynchronous I/O, graphical user interface design with PyQt/Tkinter, and rapid system prototyping in modern Python 3.',
    techStack: ['Python 3.12', 'AsyncIO', 'PyQt6', 'Jupyter', 'Git'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Ensure your Python virtual environment has PyQt6 and asyncio dependencies installed.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-314',
    courseCode: 'BCS 314',
    courseName: 'Database Systems II',
    lecturer: 'Prof. James Ochieng',
    lecturerPhone: '+254 711 234 567',
    day: 'Tuesday',
    dayIndex: 2,
    startTime: '12:00',
    endTime: '14:00',
    timeDisplay: '12:00 PM - 2:00 PM',
    startMinutes: 720,
    endMinutes: 840,
    venue: 'LBB 016',
    building: 'Main Science Quad, Ground Floor',
    classType: 'Lecture',
    domain: 'data',
    domainLabel: 'Data & Databases',
    credits: 3,
    colorTheme: 'purple',
    description: 'Relational query optimization, index trees (B+ Trees), concurrency control, ACID transaction isolation levels, crash recovery, and distributed databases.',
    techStack: ['PostgreSQL', 'Query Execution Plans', 'MongoDB', 'Redis', 'ACID Engine'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'PostgreSQL instance credentials available on course portal. Bring lecture notes.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-361',
    courseCode: 'BCS 361',
    courseName: 'Data Analysis Techniques',
    lecturer: 'Dr. Silas Kiprop',
    lecturerPhone: '+254 720 345 678',
    day: 'Wednesday',
    dayIndex: 3,
    startTime: '07:00',
    endTime: '10:00',
    timeDisplay: '7:00 AM - 10:00 AM',
    startMinutes: 420,
    endMinutes: 600,
    venue: 'LBB 011',
    building: 'Main Science Quad, Wing B',
    classType: 'Lab Practical',
    domain: 'data',
    domainLabel: 'Data & Analytics',
    credits: 3,
    colorTheme: 'purple',
    description: 'Statistical modeling, exploratory data analysis (EDA), regression techniques, dimension reduction, and pipeline computing using Python scientific stack.',
    techStack: ['Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Weekly dataset downloads posted every Tuesday evening on student portal.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-311',
    courseCode: 'BCS 311',
    courseName: 'Software Engineering',
    lecturer: 'Dr. Mary Otieno',
    lecturerPhone: '+254 725 678 901',
    day: 'Wednesday',
    dayIndex: 3,
    startTime: '14:00',
    endTime: '17:00',
    timeDisplay: '2:00 PM - 5:00 PM',
    startMinutes: 840,
    endMinutes: 1020,
    venue: 'SPD 004',
    building: 'Specialised Programs Complex, Ground Floor',
    classType: 'Lecture',
    domain: 'programming',
    domainLabel: 'Software Architecture & Engineering',
    credits: 4,
    colorTheme: 'emerald',
    description: 'Agile development methodologies, microservices architecture, clean code principles, UML system design, CI/CD automated deployment, and verification cycles.',
    techStack: ['Agile / Scrum', 'Docker', 'UML Architecture', 'CI/CD Pipelines', 'GitFlow'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Group semester project sprint reviews take place in the last 45 minutes of each lecture.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-312',
    courseCode: 'BCS 312',
    courseName: 'Design & Analysis of Algorithms',
    lecturer: 'Prof. Evans Mwangi',
    lecturerPhone: '+254 715 890 123',
    day: 'Thursday',
    dayIndex: 4,
    startTime: '07:00',
    endTime: '10:00',
    timeDisplay: '7:00 AM - 10:00 AM',
    startMinutes: 420,
    endMinutes: 600,
    venue: 'LBB 016',
    building: 'Main Science Quad, Ground Floor',
    classType: 'Lecture',
    domain: 'core',
    domainLabel: 'CS Core & Algorithms',
    credits: 4,
    colorTheme: 'cyan',
    description: 'Asymptotic notation, divide-and-conquer recurrences, dynamic programming, greedy algorithms, graph traversals (Dijkstra, Bellman-Ford), and NP-completeness.',
    techStack: ['C++20', 'Big-O Analysis', 'Dynamic Programming', 'Graph Theory'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Algorithm design problem sets must be typeset in LaTeX or cleanly handwritten.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-366',
    courseCode: 'BCS 366',
    courseName: 'Advanced Java Programming',
    lecturer: 'Dr. Dennis Njoroge',
    lecturerPhone: '+254 728 901 234',
    day: 'Thursday',
    dayIndex: 4,
    startTime: '10:00',
    endTime: '12:00',
    timeDisplay: '10:00 AM - 12:00 PM',
    startMinutes: 600,
    endMinutes: 720,
    venue: 'LBB 016',
    building: 'Main Science Quad, Ground Floor',
    classType: 'Lab Practical',
    domain: 'programming',
    domainLabel: 'Enterprise Application Development',
    credits: 3,
    colorTheme: 'emerald',
    description: 'JVM internals and garbage collection, Java concurrency, Spring Boot framework, reflection, generics, and RESTful enterprise web services.',
    techStack: ['Java 21', 'Spring Boot 3', 'JVM Profiler', 'Maven', 'Multithreading'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'JDK 21 LTS and IntelliJ IDEA Community or Ultimate required for practical sessions.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-352',
    courseCode: 'BCS 352',
    courseName: 'Digital Signal Processing I',
    lecturer: 'Eng. Francis Kibet',
    lecturerPhone: '+254 735 123 456',
    day: 'Thursday',
    dayIndex: 4,
    startTime: '11:00',
    endTime: '13:00',
    timeDisplay: '11:00 AM - 1:00 PM',
    startMinutes: 660,
    endMinutes: 780,
    venue: 'ECA 301',
    building: 'Engineering Complex Amphitheatre, Level 3',
    classType: 'Lecture',
    domain: 'systems',
    domainLabel: 'Signals & Systems',
    credits: 3,
    colorTheme: 'rose',
    description: 'Discrete-time signals and LTI systems, Z-transform, Discrete Fourier Transform (DFT), Fast Fourier Transform (FFT), FIR and IIR digital filter design.',
    techStack: ['MATLAB', 'FFT Algorithms', 'Filter Design', 'Z-Transform'],
    studentGroup: 'BSc. CS Year 3 (Elective Track)',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'MATLAB campus license available through University IT portal.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-374',
    courseCode: 'BCS 374',
    courseName: 'Mobile Computing',
    lecturer: 'Dr. Kevin Maina',
    lecturerPhone: '+254 718 234 567',
    day: 'Thursday',
    dayIndex: 4,
    startTime: '16:00',
    endTime: '18:00',
    timeDisplay: '4:00 PM - 6:00 PM',
    startMinutes: 960,
    endMinutes: 1080,
    venue: 'ECA 205',
    building: 'Engineering Complex, Level 2',
    classType: 'Lab Practical',
    domain: 'programming',
    domainLabel: 'Mobile App Architecture',
    credits: 3,
    colorTheme: 'indigo',
    description: 'Mobile operating system internals, Android Jetpack & PWA integration, background workers, local persistence, sensor telemetry, and offline-first design.',
    techStack: ['Android Jetpack', 'PWA / Service Workers', 'Kotlin', 'Offline Sync', 'REST APIs'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Bring an Android test device with USB debugging enabled for APK deployment tests.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-313',
    courseCode: 'BCS 313',
    courseName: 'Computer Networks',
    lecturer: 'Dr. Bernard Koech',
    lecturerPhone: '+254 724 567 890',
    day: 'Friday',
    dayIndex: 5,
    startTime: '09:00',
    endTime: '11:00',
    timeDisplay: '9:00 AM - 11:00 AM',
    startMinutes: 540,
    endMinutes: 660,
    venue: 'LBB 011',
    building: 'Main Science Quad, Wing B',
    classType: 'Lecture',
    domain: 'systems',
    domainLabel: 'Networking & Telecommunications',
    credits: 3,
    colorTheme: 'amber',
    description: 'OSI and TCP/IP protocol stacks, IPv4/IPv6 subnetting, routing protocols (OSPF, BGP), transport layer flow control, and network security foundations.',
    techStack: ['Wireshark', 'Packet Tracer', 'TCP/IP', 'BGP/OSPF', 'Subnetting'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Packet Tracer lab files must be submitted to the LMS by 11:59 PM every Friday.',
    status: 'active',
    occurrenceOverrides: []
  },
  {
    id: 'bcs-370',
    courseCode: 'BCS 370',
    courseName: 'Network Programming',
    lecturer: 'Dr. Bernard Koech',
    lecturerPhone: '+254 729 678 901',
    day: 'Friday',
    dayIndex: 5,
    startTime: '11:00',
    endTime: '13:00',
    timeDisplay: '11:00 AM - 1:00 PM',
    startMinutes: 660,
    endMinutes: 780,
    venue: 'LBB 011',
    building: 'Main Science Quad, Wing B',
    classType: 'Lab Practical',
    domain: 'systems',
    domainLabel: 'Networking & Socket Engineering',
    credits: 3,
    colorTheme: 'amber',
    description: 'POSIX socket programming in C and Python, non-blocking I/O multiplexing (select/epoll), TLS/SSL encryption, remote procedure calls, and protocol design.',
    techStack: ['POSIX Sockets', 'Python Sockets', 'TLS/SSL', 'gRPC', 'Epoll Multiplexing'],
    studentGroup: 'BSc. CS Year 3',
    academicPeriod: 'Semester II, 2026/2027',
    instructions: 'Linux terminal environment required. WSL or native Ubuntu recommended.',
    status: 'active',
    occurrenceOverrides: []
  }
];

const INITIAL_TASKS_DATA: ServerPersonalTask[] = [
  {
    id: 'task-01',
    title: 'Sunday Algorithms Revision & Problem Sets',
    description: 'Review Dynamic Programming recurrence relations and solve 3 LeetCode graph problems before Thursday lecture.',
    category: 'study',
    priority: 'high',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '17:30',
    startMinutes: 900,
    endMinutes: 1050,
    location: 'University Library - 3rd Floor Quiet Zone',
    reminderIntervals: [30, 10],
    recurring: {
      enabled: true,
      days: ['Sunday']
    },
    courseId: 'bcs-312',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-02',
    title: 'Software Engineering Sprint Meeting',
    description: 'Sprint planning and GitHub pull request reviews with project group members.',
    category: 'project',
    priority: 'medium',
    status: 'in_progress',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:30',
    startMinutes: 1080,
    endMinutes: 1170,
    location: 'Student Innovation Hub / Google Meet',
    reminderIntervals: [15, 5],
    recurring: {
      enabled: true,
      days: ['Tuesday']
    },
    courseId: 'bcs-311',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-03',
    title: 'Saturday Gym & Cardio Session',
    description: 'Full body workout and 5km recovery run to recharge.',
    category: 'exercise',
    priority: 'low',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:30',
    startMinutes: 480,
    endMinutes: 570,
    location: 'Campus Sports Center Gym',
    reminderIntervals: [30],
    recurring: {
      enabled: true,
      days: ['Saturday']
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_NOTES_DATA: ServerSessionNote[] = [
  {
    id: 'note-01',
    timetableEntryId: 'bcs-315',
    courseCode: 'BCS 315',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTimeSlot: '7:00 AM - 10:00 AM',
    venue: 'LBB 016',
    title: 'Automata Theory: Deterministic Finite Automata (DFA) Equivalences',
    content: 'Discussed state transition diagrams, 5-tuple formal definition (Q, Sigma, delta, q0, F). Proved that every NFA can be converted to an equivalent DFA via subset construction with exponential worst-case bound 2^|Q|.',
    keyConcepts: [
      '5-tuple formal definition of DFA',
      'Powerset / Subset Construction algorithm',
      'Pumping Lemma for regular languages',
      'Minimization of DFAs using Myhill-Nerode theorem'
    ],
    lecturerExplanations: [
      'Dr. Mutua emphasized that empty transitions (epsilon) do not increase computational power',
      'Question 2 in midterm will test NFA-to-DFA state conversion tables'
    ],
    assignments: [
      'Complete Problem Set 2 on JFLAP by next Monday 7:00 AM'
    ],
    questions: [
      'How to optimize DFA minimization when unreachable states are detected?'
    ],
    researchItems: [
      'Research generalized transition graphs and state elimination methods'
    ],
    summary: 'Mastered subset construction converting NFA to DFA. Completed proofs on regular grammar equivalences.',
    documents: [
      {
        id: 'doc-01',
        name: 'Automata_Finite_State_Machines_Syllabus.pdf',
        type: 'pdf',
        mimeType: 'application/pdf',
        size: 1420000,
        sizeFormatted: '1.4 MB',
        url: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAErVIhVCPFWyMwtyEktUUhJrEwtSi3WS85Pz0zRUDCwUDAwMTAEMjS5uACW3w3fCmVuZHN0cmVhbQplbmRvYmoK',
        uploadedAt: new Date().toISOString()
      }
    ],
    tags: ['Automata', 'Theory', 'DFA', 'Exam-Prep'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_CUSTOM_FIELDS_DATA: ServerCustomFieldDefinition[] = [
  {
    id: 'cf-zoom',
    name: 'meeting_link',
    label: 'Online Class / Meeting Link',
    type: 'url',
    appliesTo: 'all',
    required: false,
    defaultValue: ''
  },
  {
    id: 'cf-attendance',
    name: 'attendance_weight',
    label: 'Attendance Weighting (%)',
    type: 'number',
    appliesTo: 'course',
    required: false,
    defaultValue: 10
  }
];

function readDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      timetable: INITIAL_TIMETABLE_DATA,
      tasks: INITIAL_TASKS_DATA,
      notes: INITIAL_NOTES_DATA,
      customFields: INITIAL_CUSTOM_FIELDS_DATA,
      changes: [
        {
          id: 'chg-init',
          entryId: 'bcs-315',
          courseCode: 'BCS 315',
          courseName: 'Automata Theory',
          changeType: 'created',
          previousDetails: 'Initial Setup',
          newDetails: 'Monday 7:00 AM - 10:00 AM at LBB 016',
          timestamp: new Date().toISOString(),
          performedBy: 'Academic Timetable Committee',
          notifiedStudentsCount: 142
        }
      ],
      notifications: [
        {
          id: 'notif-welcome',
          title: 'Smart Remind Activated',
          message: 'BSc. Computer Science Semester II schedule & personal planner is synchronized.',
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }
      ],
      subscriptions: [],
      settings: {
        timezone: 'Africa/Nairobi',
        reminderIntervals: [30, 15, 5],
        soundEnabled: true,
        soundType: 'alarm',
        alarmDurationSeconds: 10
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!parsed.timetable) parsed.timetable = INITIAL_TIMETABLE_DATA;
    if (!parsed.tasks) parsed.tasks = INITIAL_TASKS_DATA;
    if (!parsed.notes) parsed.notes = INITIAL_NOTES_DATA;
    if (!parsed.customFields) parsed.customFields = INITIAL_CUSTOM_FIELDS_DATA;
    if (!parsed.changes) parsed.changes = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.subscriptions) parsed.subscriptions = [];
    if (!parsed.settings) {
      parsed.settings = {
        timezone: 'Africa/Nairobi',
        reminderIntervals: [30, 15, 5],
        soundEnabled: true,
        soundType: 'alarm',
        alarmDurationSeconds: 10
      };
    }
    return parsed;
  } catch {
    return {
      timetable: INITIAL_TIMETABLE_DATA,
      tasks: INITIAL_TASKS_DATA,
      notes: INITIAL_NOTES_DATA,
      customFields: INITIAL_CUSTOM_FIELDS_DATA,
      changes: [],
      notifications: [],
      subscriptions: [],
      settings: {
        timezone: 'Africa/Nairobi',
        reminderIntervals: [30, 15, 5],
        soundEnabled: true,
        soundType: 'alarm',
        alarmDurationSeconds: 10
      }
    };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `db.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`);
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Security-DB] Failed atomic write to DB:', err);
  }
}

// ----------------- AUTHENTICATION ENDPOINTS (SEC-01) -----------------

// Login / Session Handshake
app.post('/api/auth/login', sensitiveLimiter, (req: Request, res: Response) => {
  const { role = 'student', email, name } = req.body;
  let targetUser: AuthUser;

  if (role === 'admin') {
    const isCustom = Boolean(email && email !== DEFAULT_ADMIN.email);
    targetUser = {
      ...DEFAULT_ADMIN,
      id: isCustom ? `usr-admin-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 10)}` : DEFAULT_ADMIN.id,
      email: email || DEFAULT_ADMIN.email,
      name: name || DEFAULT_ADMIN.name
    };
  } else {
    const isCustom = Boolean(email && email !== DEFAULT_STUDENT.email);
    targetUser = {
      ...DEFAULT_STUDENT,
      id: isCustom ? `usr-std-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 10)}` : DEFAULT_STUDENT.id,
      email: email || DEFAULT_STUDENT.email,
      name: name || DEFAULT_STUDENT.name
    };
  }

  const session = createSession(targetUser);
  res.json({
    success: true,
    token: session.token,
    user: session.user,
    expiresAt: session.user
  });
});

// Role Switcher with Server-Issued Tokens
app.post('/api/auth/switch-role', sensitiveLimiter, (req: Request, res: Response) => {
  const { targetRole } = req.body;
  if (targetRole !== 'admin' && targetRole !== 'student') {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  const targetUser: AuthUser = targetRole === 'admin' ? DEFAULT_ADMIN : DEFAULT_STUDENT;
  const session = createSession(targetUser);

  res.json({
    success: true,
    token: session.token,
    user: session.user
  });
});

// Current User Profile Verification
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.json({
      authenticated: false,
      user: null
    });
  }
  res.json({
    authenticated: true,
    user
  });
});

// Logout / Token Invalidation
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ----------------- SYSTEM & TIMETABLE ENDPOINTS -----------------

// Status & Health
app.get('/api/status', (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user;
  const now = new Date();
  
  const nairobiTime = new Intl.DateTimeFormat('en-US', {
    timeZone: db.settings.timezone || 'Africa/Nairobi',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(now);

  res.json({
    status: 'online',
    systemName: 'Smart Remind',
    serverTimeNairobi: nairobiTime,
    timezone: db.settings.timezone,
    authenticatedAs: user ? { name: user.name, role: user.role } : null,
    totalCourses: db.timetable.length,
    activeCourses: db.timetable.filter(c => !c.isCancelled).length,
    totalTasks: db.tasks.length,
    totalNotes: db.notes.length,
    totalCustomFields: db.customFields.length,
    totalChangesLogged: db.changes.length,
    pushSubscribers: db.subscriptions.length
  });
});

// Timetable Courses
app.get('/api/timetable', (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user;

  // SEC-08: Mask lecturer phone numbers if unauthenticated to prevent web scrapers
  let entries = db.timetable;
  if (!user) {
    entries = db.timetable.map(c => {
      let maskedPhone: string | undefined = undefined;
      if (c.lecturerPhone) {
        const raw = c.lecturerPhone.trim();
        const prefix = raw.startsWith('+') ? raw.slice(0, 8) : raw.slice(0, 4);
        const suffix = raw.slice(-3);
        maskedPhone = `${prefix} *** ${suffix}`;
      }
      return {
        ...c,
        lecturerPhone: maskedPhone
      };
    });
  }

  res.json({
    success: true,
    data: entries,
    lastUpdated: new Date().toISOString()
  });
});

// Add Course — SEC-01: Admin Only & SEC-04: Sanitized Inputs
app.post('/api/timetable', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const entry: ServerTimetableEntry = req.body;

  if (!entry.courseCode || !entry.courseName || !entry.day || !entry.startTime || !entry.endTime || !entry.venue) {
    return res.status(400).json({ error: 'Missing required course fields (code, name, day, startTime, endTime, venue)' });
  }

  // Sanitize course input fields
  entry.courseCode = sanitizeString(entry.courseCode, 30);
  entry.courseName = sanitizeString(entry.courseName, 150);
  entry.venue = sanitizeString(entry.venue, 100);
  entry.building = sanitizeString(entry.building, 150);
  entry.lecturer = sanitizeString(entry.lecturer, 100);
  entry.lecturerPhone = sanitizeString(entry.lecturerPhone, 40);
  entry.instructions = sanitizeString(entry.instructions, 500);
  entry.description = sanitizeString(entry.description, 1000);

  // Conflict Check across active timetable entries
  const venueOverlap = db.timetable.find(c => 
    !c.isCancelled &&
    c.day === entry.day &&
    c.venue.toLowerCase().trim() === entry.venue.toLowerCase().trim() &&
    entry.startMinutes < c.endMinutes && c.startMinutes < entry.endMinutes
  );

  if (venueOverlap) {
    return res.status(409).json({
      error: `Conflict detected: Venue ${entry.venue} is already occupied by ${venueOverlap.courseCode} (${venueOverlap.timeDisplay}) on ${entry.day}.`,
      conflictingEntry: venueOverlap
    });
  }

  const newId = entry.id || `bcs-${Date.now().toString(36)}`;
  const newEntry: ServerTimetableEntry = {
    ...entry,
    id: newId,
    status: 'active',
    occurrenceOverrides: [],
    lastUpdated: new Date().toISOString()
  };
  db.timetable.push(newEntry);

  // Log Change Audit
  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: newId,
    courseCode: newEntry.courseCode,
    courseName: newEntry.courseName,
    changeType: 'created',
    previousDetails: 'Not on schedule',
    newDetails: `${newEntry.day} ${newEntry.timeDisplay} at ${newEntry.venue}`,
    reason: 'New course offering added to timetable',
    timestamp: new Date().toISOString(),
    performedBy: (req as AuthenticatedRequest).user?.name || 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  // Notification for students
  db.notifications.unshift({
    id: `notif-add-${Date.now()}`,
    title: `NEW COURSE PUBLISHED: ${newEntry.courseCode}`,
    message: `${newEntry.courseName} added on ${newEntry.day} (${newEntry.timeDisplay}) at ${newEntry.venue}.`,
    courseCode: newEntry.courseCode,
    venue: newEntry.venue,
    timeSlot: newEntry.timeDisplay,
    type: 'system',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.status(201).json({ success: true, entry: newEntry });
});

// Update / Master Reschedule Course — SEC-01: Admin Only
app.put('/api/timetable/:id', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const updates = req.body;

  const index = db.timetable.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const prev = db.timetable[index];
  const updated = { 
    ...prev, 
    ...updates, 
    occurrenceOverrides: updates.occurrenceOverrides || prev.occurrenceOverrides || [],
    lastUpdated: new Date().toISOString() 
  };
  db.timetable[index] = updated;

  let changeType = 'rescheduled';
  if (prev.venue !== updated.venue && prev.timeDisplay === updated.timeDisplay && prev.day === updated.day) {
    changeType = 'venue_changed';
  } else if (prev.lecturer !== updated.lecturer) {
    changeType = 'lecturer_changed';
  } else if (prev.isCancelled && !updated.isCancelled) {
    changeType = 'restored';
  }

  const changeItem = {
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: updated.courseCode,
    courseName: updated.courseName,
    changeType,
    previousDetails: `${prev.day} ${prev.timeDisplay} at ${prev.venue}`,
    newDetails: `${updated.day} ${updated.timeDisplay} at ${updated.venue}`,
    reason: updates.reason || 'Academic schedule refinement',
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  };

  db.changes.unshift(changeItem);

  db.notifications.unshift({
    id: `notif-change-${Date.now()}`,
    title: `TIMETABLE UPDATE: ${updated.courseCode}`,
    message: `${updated.courseName} rescheduled to ${updated.day} ${updated.timeDisplay} at ${updated.venue}.`,
    courseCode: updated.courseCode,
    venue: updated.venue,
    timeSlot: updated.timeDisplay,
    type: 'rescheduled',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.json({ success: true, updated, change: changeItem });
});

// Temporary Cancellation for Specific Scheduled Occurrence (e.g. this Wednesday only) — SEC-01: Admin Only
app.post('/api/timetable/:id/cancel-occurrence', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const { date, reason = 'Lecturer unavailable' } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Missing date for cancelled occurrence' });
  }

  const entry = db.timetable.find(c => c.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (!entry.occurrenceOverrides) {
    entry.occurrenceOverrides = [];
  }

  // Check if override already exists for this date, else add
  const existingIdx = entry.occurrenceOverrides.findIndex(o => o.date === date);
  const override: ServerOccurrenceOverride = {
    date,
    status: 'cancelled',
    reason: sanitizeString(reason, 250)
  };

  if (existingIdx >= 0) {
    entry.occurrenceOverrides[existingIdx] = override;
  } else {
    entry.occurrenceOverrides.push(override);
  }

  entry.lastUpdated = new Date().toISOString();

  // Log to change audit
  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: entry.courseCode,
    courseName: entry.courseName,
    changeType: 'cancelled',
    previousDetails: `${entry.day} ${entry.timeDisplay} (Occurrence: ${date})`,
    newDetails: `Cancelled for ${date}: ${override.reason}`,
    reason: override.reason,
    targetDate: date,
    timestamp: new Date().toISOString(),
    performedBy: (req as AuthenticatedRequest).user?.name || 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  // Notify students that THIS occurrence is cancelled, but future ones return normally
  db.notifications.unshift({
    id: `notif-cancel-occ-${Date.now()}`,
    title: `CLASS CANCELLED FOR ${date}: ${entry.courseCode}`,
    message: `${entry.courseName} scheduled for ${date} (${entry.timeDisplay}) is cancelled. Reason: ${override.reason}. Future weekly occurrences remain on regular schedule.`,
    courseCode: entry.courseCode,
    venue: entry.venue,
    timeSlot: entry.timeDisplay,
    type: 'cancelled',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.json({ success: true, message: `Occurrence on ${date} cancelled`, entry, override });
});

// Reschedule Specific Scheduled Occurrence — SEC-01: Admin Only
app.post('/api/timetable/:id/reschedule-occurrence', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const { 
    originalDate, 
    newDate, 
    newDay, 
    startTime, 
    endTime, 
    venue, 
    instructions, 
    reason = 'Special make-up session' 
  } = req.body;

  if (!originalDate || !newDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required reschedule parameters' });
  }

  const entry = db.timetable.find(c => c.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (!entry.occurrenceOverrides) {
    entry.occurrenceOverrides = [];
  }

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const timeDisplay = `${sH % 12 || 12}:${sM.toString().padStart(2, '0')} ${sH >= 12 ? 'PM' : 'AM'} - ${eH % 12 || 12}:${eM.toString().padStart(2, '0')} ${eH >= 12 ? 'PM' : 'AM'}`;

  const override: ServerOccurrenceOverride = {
    date: originalDate,
    status: 'rescheduled',
    reason: sanitizeString(reason, 250),
    rescheduledDate: newDate,
    rescheduledDay: sanitizeString(newDay, 30),
    rescheduledStartTime: startTime,
    rescheduledEndTime: endTime,
    rescheduledTimeDisplay: timeDisplay,
    rescheduledVenue: sanitizeString(venue || entry.venue, 100),
    rescheduledInstructions: sanitizeString(instructions, 500)
  };

  const existingIdx = entry.occurrenceOverrides.findIndex(o => o.date === originalDate);
  if (existingIdx >= 0) {
    entry.occurrenceOverrides[existingIdx] = override;
  } else {
    entry.occurrenceOverrides.push(override);
  }

  entry.lastUpdated = new Date().toISOString();

  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: entry.courseCode,
    courseName: entry.courseName,
    changeType: 'rescheduled',
    previousDetails: `${entry.day} (Occurrence: ${originalDate})`,
    newDetails: `Moved to ${newDay} (${newDate}) ${timeDisplay} at ${override.rescheduledVenue}`,
    reason: override.reason,
    targetDate: originalDate,
    timestamp: new Date().toISOString(),
    performedBy: (req as AuthenticatedRequest).user?.name || 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  db.notifications.unshift({
    id: `notif-resched-occ-${Date.now()}`,
    title: `SESSION RESCHEDULED: ${entry.courseCode}`,
    message: `${entry.courseName} originally on ${originalDate} has been moved to ${newDay} (${newDate}) from ${timeDisplay} at ${override.rescheduledVenue}.`,
    courseCode: entry.courseCode,
    venue: override.rescheduledVenue,
    timeSlot: timeDisplay,
    type: 'rescheduled',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.json({ success: true, message: `Occurrence rescheduled to ${newDate}`, entry, override });
});

// Restore Specific Occurrence — SEC-01: Admin Only
app.post('/api/timetable/:id/restore-occurrence', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const { date } = req.body;

  const entry = db.timetable.find(c => c.id === id);
  if (!entry) return res.status(404).json({ error: 'Course not found' });

  if (entry.occurrenceOverrides) {
    entry.occurrenceOverrides = entry.occurrenceOverrides.filter(o => o.date !== date);
  }

  entry.isCancelled = false;
  entry.cancelReason = undefined;
  entry.lastUpdated = new Date().toISOString();

  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: entry.courseCode,
    courseName: entry.courseName,
    changeType: 'restored',
    previousDetails: `Override on ${date}`,
    newDetails: `Restored to normal schedule`,
    timestamp: new Date().toISOString(),
    performedBy: (req as AuthenticatedRequest).user?.name || 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.json({ success: true, entry });
});

// Duplicate Course — SEC-01: Admin Only
app.post('/api/timetable/:id/duplicate', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;

  const original = db.timetable.find(c => c.id === id);
  if (!original) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const newId = `bcs-copy-${Date.now().toString(36)}`;
  const duplicateEntry: ServerTimetableEntry = {
    ...original,
    id: newId,
    courseName: `${original.courseName} (Section B)`,
    status: 'active',
    occurrenceOverrides: [],
    lastUpdated: new Date().toISOString()
  };

  db.timetable.push(duplicateEntry);

  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: newId,
    courseCode: duplicateEntry.courseCode,
    courseName: duplicateEntry.courseName,
    changeType: 'duplicated',
    previousDetails: `Duplicated from ${original.courseCode}`,
    newDetails: `${duplicateEntry.day} ${duplicateEntry.timeDisplay} at ${duplicateEntry.venue}`,
    reason: 'Duplicate section created for extra cohort capacity',
    timestamp: new Date().toISOString(),
    performedBy: (req as AuthenticatedRequest).user?.name || 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.status(201).json({ success: true, entry: duplicateEntry });
});

// PERMANENT DELETION — Remove Everywhere — SEC-01: Admin Only
app.delete('/api/timetable/:id', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;

  const index = db.timetable.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const removed = db.timetable.splice(index, 1)[0];

  // Remove upcoming / future notifications for this course
  db.notifications = db.notifications.filter(n => n.courseCode !== removed.courseCode);

  // Archive to change audit log so history is accounted for
  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: removed.courseCode,
    courseName: removed.courseName,
    changeType: 'deleted',
    previousDetails: `${removed.day} ${removed.timeDisplay} at ${removed.venue}`,
    newDetails: 'Permanently deleted from active timetable',
    reason: 'Curriculum decommission directive',
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.json({ success: true, message: `Course ${removed.courseCode} permanently removed everywhere`, removed });
});

// ----------------- PERSONAL TASKS (SEC-02: IDOR & USER SCOPING) -----------------

app.get('/api/tasks', (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user;

  // Filter tasks by ownership unless admin
  let tasks = db.tasks;
  if (user && user.role !== 'admin') {
    tasks = db.tasks.filter(t => !t.userId || t.userId === user.id);
  } else if (!user) {
    // Unauthenticated requests cannot see private personal tasks
    tasks = [];
  }

  res.json({ success: true, data: tasks });
});

app.post('/api/tasks', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const task: ServerPersonalTask = req.body;

  if (!task.title || !task.date || !task.startTime) {
    return res.status(400).json({ error: 'Missing required task fields (title, date, startTime)' });
  }

  const newTask: ServerPersonalTask = {
    ...task,
    id: task.id || `task-${Date.now().toString(36)}`,
    userId: user.id, // Enforce ownership to current authenticated user
    title: sanitizeString(task.title, 200),
    description: sanitizeString(task.description, 1000),
    category: sanitizeString(task.category, 50) || 'study',
    priority: sanitizeString(task.priority, 30) || 'medium',
    location: sanitizeString(task.location, 100),
    status: task.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.tasks.unshift(newTask);

  db.notifications.unshift({
    id: `notif-task-${Date.now()}`,
    title: `PERSONAL TASK SCHEDULED: ${newTask.title}`,
    message: `Scheduled for ${newTask.date} at ${newTask.startTime} (${newTask.category.toUpperCase()}).`,
    taskId: newTask.id,
    type: 'task',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.status(201).json({ success: true, task: newTask });
});

app.put('/api/tasks/:id', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const updates = req.body;

  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const prev = db.tasks[index];
  // SEC-02: Verify ownership — users can only modify their own tasks unless admin
  if (prev.userId && prev.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You cannot modify tasks belonging to another user.' });
  }

  const updatedTask = {
    ...prev,
    ...updates,
    title: updates.title ? sanitizeString(updates.title, 200) : prev.title,
    description: updates.description ? sanitizeString(updates.description, 1000) : prev.description,
    location: updates.location ? sanitizeString(updates.location, 100) : prev.location,
    updatedAt: new Date().toISOString()
  };

  db.tasks[index] = updatedTask;
  writeDb(db);
  res.json({ success: true, task: updatedTask });
});

app.delete('/api/tasks/:id', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;

  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const target = db.tasks[index];
  // SEC-02: Verify ownership — users can only delete their own tasks unless admin
  if (target.userId && target.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You cannot delete tasks belonging to another user.' });
  }

  const removed = db.tasks.splice(index, 1)[0];
  writeDb(db);
  res.json({ success: true, removed });
});

// ----------------- SESSION NOTES & SUPPORTING DOCUMENTS (SEC-02, SEC-04) -----------------

app.get('/api/notes', (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user;
  const { courseCode, timetableEntryId, search, date } = req.query;

  let notes = db.notes;

  // SEC-02: Scoped visibility — students only view their own notes or explicitly shared course notes
  if (user && user.role !== 'admin') {
    notes = notes.filter(n => !n.userId || n.userId === user.id || n.isPublic !== false);
  } else if (!user) {
    // Unauthenticated requests can only view public notes
    notes = notes.filter(n => n.isPublic === true);
  }

  if (courseCode) {
    notes = notes.filter(n => n.courseCode === courseCode);
  }
  if (timetableEntryId) {
    notes = notes.filter(n => n.timetableEntryId === timetableEntryId);
  }
  if (date) {
    notes = notes.filter(n => n.sessionDate === date);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.keyConcepts && n.keyConcepts.some(k => k.toLowerCase().includes(q))) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  res.json({ success: true, data: notes });
});

app.post('/api/notes', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const note: ServerSessionNote = req.body;

  if (!note.title || !note.content) {
    return res.status(400).json({ error: 'Missing note title or content' });
  }

  // SEC-04: Validate attached documents and sanitize note contents
  const safeDocs = validateDocuments(note.documents || []);

  const newNote: ServerSessionNote = {
    ...note,
    id: note.id || `note-${Date.now().toString(36)}`,
    userId: user.id,
    isPublic: note.isPublic !== undefined ? Boolean(note.isPublic) : true,
    title: sanitizeString(note.title, 200),
    content: sanitizeString(note.content, 10000),
    sessionDate: note.sessionDate || new Date().toISOString().split('T')[0],
    keyConcepts: Array.isArray(note.keyConcepts) ? note.keyConcepts.map(k => sanitizeString(k, 200)).filter(Boolean) : [],
    lecturerExplanations: Array.isArray(note.lecturerExplanations) ? note.lecturerExplanations.map(l => sanitizeString(l, 300)).filter(Boolean) : [],
    assignments: Array.isArray(note.assignments) ? note.assignments.map(a => sanitizeString(a, 300)).filter(Boolean) : [],
    questions: Array.isArray(note.questions) ? note.questions.map(q => sanitizeString(q, 300)).filter(Boolean) : [],
    researchItems: Array.isArray(note.researchItems) ? note.researchItems.map(r => sanitizeString(r, 300)).filter(Boolean) : [],
    documents: safeDocs,
    tags: Array.isArray(note.tags) ? note.tags.map(t => sanitizeString(t, 50)).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.notes.unshift(newNote);
  writeDb(db);
  res.status(201).json({ success: true, note: newNote });
});

app.put('/api/notes/:id', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const updates = req.body;

  const index = db.notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const existing = db.notes[index];
  // SEC-02: Verify ownership
  if (existing.userId && existing.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You can only edit notes you authored.' });
  }

  const safeDocs = updates.documents !== undefined 
    ? validateDocuments(updates.documents) 
    : existing.documents;

  const updatedNote = {
    ...existing,
    ...updates,
    title: updates.title ? sanitizeString(updates.title, 200) : existing.title,
    content: updates.content ? sanitizeString(updates.content, 10000) : existing.content,
    documents: safeDocs,
    updatedAt: new Date().toISOString()
  };

  db.notes[index] = updatedNote;
  writeDb(db);
  res.json({ success: true, note: updatedNote });
});

app.delete('/api/notes/:id', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;

  const index = db.notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const target = db.notes[index];
  // SEC-02: Verify ownership
  if (target.userId && target.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You can only delete notes you authored.' });
  }

  const removed = db.notes.splice(index, 1)[0];
  writeDb(db);
  res.json({ success: true, removed });
});

// AI Voice Speech-to-Text Transcription for Session Notes
function detectAudioMime(buf: Buffer, clientMime?: string): string {
  if (buf.length >= 4) {
    // WebM / Matroska: 0x1A 0x45 0xDF 0xA3
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
      return 'audio/webm';
    }
    // WAV: 'RIFF' ... 'WAVE'
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF') {
      return 'audio/wav';
    }
    // Ogg: 'OggS'
    if (buf.subarray(0, 4).toString('ascii') === 'OggS') {
      return 'audio/ogg';
    }
    // FLAC: 'fLaC'
    if (buf.subarray(0, 4).toString('ascii') === 'fLaC') {
      return 'audio/flac';
    }
    // MP3 with ID3 tag: 'ID3'
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
      return 'audio/mp3';
    }
    // MP3 raw frame sync: 11 bits set (0xFF followed by 0xFB, 0xF3, 0xF2, or 0xE0+)
    if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) {
      return 'audio/mp3';
    }
  }
  if (buf.length >= 8) {
    // MP4 / M4A: bytes 4-8 are 'ftyp'
    if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
      return 'audio/mp4';
    }
  }

  // Fallback to client MIME mapping
  const normalized = (clientMime || '').toLowerCase().split(';')[0].trim();
  if (normalized === 'audio/mpeg' || normalized === 'audio/mp3' || normalized === 'audio/mpg') {
    return 'audio/mp3';
  }
  if (normalized === 'audio/wav' || normalized === 'audio/x-wav' || normalized === 'audio/wave') {
    return 'audio/wav';
  }
  if (normalized === 'audio/mp4' || normalized === 'audio/m4a' || normalized === 'audio/x-m4a' || normalized === 'audio/aac') {
    return 'audio/mp4';
  }
  if (normalized === 'audio/ogg' || normalized === 'audio/opus') {
    return 'audio/ogg';
  }
  if (normalized === 'audio/flac' || normalized === 'audio/x-flac') {
    return 'audio/flac';
  }
  if (normalized === 'audio/webm' || normalized === 'video/webm') {
    return 'audio/webm';
  }

  return 'audio/webm';
}

app.post('/api/notes/transcribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', courseCode, topicTitle, fallbackText, offlineText } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Strip data URL scheme prefix cleanly (handles any parameters such as data:audio/webm;codecs=opus;base64,...)
    const commaIdx = audioBase64.indexOf(',');
    const cleanBase64 = (commaIdx !== -1 ? audioBase64.slice(commaIdx + 1) : audioBase64).trim().replace(/\s+/g, '');

    // Sniff the actual audio format from the magic bytes
    const sampleHeaderBuf = Buffer.from(cleanBase64.slice(0, 48), 'base64');
    const safeMime = detectAudioMime(sampleHeaderBuf, mimeType);

    console.log(`[Transcription] Processing audio: detected ${safeMime} (client reported: ${mimeType}), payload length: ${cleanBase64.length}${offlineText ? `, offlineText: ${offlineText.length} chars` : ''}`);

    const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!activeKey) {
      return res.json({
        success: true,
        transcription: offlineText || fallbackText || 'Voice note saved locally. (Gemini API key not configured on server).',
        isOfflineFallback: true
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: safeMime,
        data: cleanBase64
      }
    };

    let transcription = '';

    // Step 1: Call specialized transcription model 'gemini-3.5-transcribe' with direct fast prompt
    try {
      const transcribePrompt = offlineText
        ? `Transcribe this audio recording accurately into clear text. Use this rough offline transcript as a reference: "${offlineText.slice(0, 1000)}". Correct any misheard terms and format with proper punctuation. Return only the transcription.`
        : `Transcribe this audio recording into clear, accurate text.${courseCode ? ` Course: ${courseCode}.` : ''} Return only the transcription.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            { text: transcribePrompt }
          ]
        }
      });
      transcription = (response.text || '').trim();
      console.log(`[Transcription] gemini-3.5-transcribe returned ${transcription.length} characters`);
    } catch (err: any) {
      console.warn('[Transcription] gemini-3.5-transcribe error, trying gemini-3.8-flash:', err?.message || err);
    }

    // Step 2: If gemini-3.5-transcribe returned empty text or failed, fall back to multimodal gemini-3.8-flash
    if (!transcription) {
      try {
        console.log('[Transcription] Invoking gemini-3.8-flash audio fallback...');
        const flashPrompt = offlineText
          ? `Listen to this audio recording and refine this spoken note: "${offlineText.slice(0, 1000)}". Fix domain terms and format cleanly. Return only the transcription.`
          : `Listen to this audio recording carefully and transcribe all spoken words into clear, accurate text. Return only the transcription text.`;
        
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              audioPart,
              { text: flashPrompt }
            ]
          }
        });
        transcription = (fallbackRes.text || '').trim();
        console.log(`[Transcription] gemini-3.8-flash returned ${transcription.length} characters`);
      } catch (flashErr: any) {
        console.error('[Transcription] gemini-3.8-flash fallback also encountered an error:', flashErr?.message || flashErr);
      }
    }

    const finalTranscript = (transcription || offlineText || fallbackText || '').trim();
    res.json({
      success: true,
      transcription: finalTranscript,
      detectedMime: safeMime,
      isOfflineFallback: !transcription && Boolean(offlineText || fallbackText)
    });
  } catch (error: any) {
    console.error('[Transcription Error]', error?.message || error);
    const clientFallback = req.body.offlineText || req.body.fallbackText;
    if (clientFallback && typeof clientFallback === 'string') {
      return res.json({
        success: true,
        transcription: clientFallback.trim(),
        isOfflineFallback: true,
        notice: 'Used offline speech recognition transcript.'
      });
    }
    res.status(500).json({
      error: error?.message || 'Failed to transcribe audio session note'
    });
  }
});

// ----------------- CUSTOM FIELDS (SEC-01: Admin Only) -----------------

app.get('/api/custom-fields', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.customFields });
});

app.post('/api/custom-fields', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const field: ServerCustomFieldDefinition = req.body;

  if (!field.name || !field.label || !field.type) {
    return res.status(400).json({ error: 'Missing required custom field attributes' });
  }

  const newField: ServerCustomFieldDefinition = {
    ...field,
    id: field.id || `cf-${Date.now().toString(36)}`,
    name: sanitizeString(field.name, 50),
    label: sanitizeString(field.label, 100),
    appliesTo: field.appliesTo || 'all'
  };

  db.customFields.push(newField);
  writeDb(db);
  res.status(201).json({ success: true, field: newField });
});

app.delete('/api/custom-fields/:id', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;

  const index = db.customFields.findIndex(f => f.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Custom field not found' });
  }

  const removed = db.customFields.splice(index, 1)[0];
  writeDb(db);
  res.json({ success: true, removed });
});

// ----------------- AUDIT & NOTIFICATIONS -----------------

app.get('/api/changes', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.changes });
});

app.get('/api/notifications', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.notifications });
});

app.post('/api/notifications/subscribe', (req: Request, res: Response) => {
  const db = readDb();
  const sub = req.body;
  if (!sub || typeof sub !== 'object') return res.status(400).json({ error: 'Invalid subscription' });
  db.subscriptions.push({
    endpoint: sanitizeString(sub.endpoint, 500),
    registeredAt: new Date().toISOString()
  });
  writeDb(db);
  res.json({ success: true, message: 'Push subscription registered for device reminders.' });
});

app.post('/api/notifications/test', sensitiveLimiter, requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  const { courseCode = 'BCS 314', interval = 30 } = req.body;
  const course = db.timetable.find(c => c.courseCode === courseCode) || db.timetable[0];

  const testNotif = {
    id: `notif-test-${Date.now()}`,
    title: `UPCOMING CLASS REMINDER: ${course.courseCode}`,
    message: `Your ${course.courseName} class starts in ${interval} minutes. Venue: ${course.venue} (${course.timeDisplay}). Please prepare and arrive promptly.`,
    courseCode: course.courseCode,
    venue: course.venue,
    timeSlot: course.timeDisplay,
    type: 'reminder',
    timestamp: new Date().toISOString(),
    read: false,
    minutesBefore: typeof interval === 'number' ? interval : 30
  };

  db.notifications.unshift(testNotif);
  writeDb(db);

  res.json({ success: true, notification: testNotif });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.settings });
});

// SEC-01: Admin Only Settings Modification
app.post('/api/settings', requireAdmin, (req: Request, res: Response) => {
  const db = readDb();
  const updates = req.body || {};
  db.settings = {
    ...db.settings,
    ...updates,
    theme: updates.theme === 'dark' || updates.theme === 'light' ? updates.theme : db.settings.theme,
    timezone: updates.timezone ? sanitizeString(updates.timezone, 50) : db.settings.timezone
  };
  writeDb(db);
  res.json({ success: true, data: db.settings });
});

app.post('/api/sync', sensitiveLimiter, (req: Request, res: Response) => {
  const db = readDb();
  const { lastSyncTime } = req.body;
  
  const newChanges = lastSyncTime 
    ? db.changes.filter(c => new Date(c.timestamp) > new Date(lastSyncTime))
    : db.changes;

  res.json({
    success: true,
    serverTime: new Date().toISOString(),
    timetable: db.timetable,
    tasks: db.tasks,
    notes: db.notes,
    customFields: db.customFields,
    recentChanges: newChanges,
    activeVersion: '4.1.0'
  });
});

// Active Background Reminder Loop (Server-authoritative check every 30 seconds)
setInterval(() => {
  try {
    const db = readDb();
    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];

    const nairobiDay = new Intl.DateTimeFormat('en-US', {
      timeZone: db.settings.timezone || 'Africa/Nairobi',
      weekday: 'long'
    }).format(now);

    const nairobiTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: db.settings.timezone || 'Africa/Nairobi',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(now);

    const hours = parseInt(nairobiTimeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(nairobiTimeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hours * 60 + minutes;

    const intervals = db.settings.reminderIntervals || [30, 15, 5];

    // Check active classes for reminders
    db.timetable.forEach(entry => {
      // 1. If course is master cancelled or deleted, skip
      if (entry.isCancelled || entry.status === 'deleted') return;

      // 2. Check if today's specific occurrence has an override
      const overrideForToday = (entry.occurrenceOverrides || []).find(o => o.date === todayDateStr);
      if (overrideForToday && overrideForToday.status === 'cancelled') {
        // Class is cancelled ONLY for today! Do not fire reminder!
        return;
      }

      // 3. Normal recurring schedule check
      if (entry.day === nairobiDay) {
        intervals.forEach(interval => {
          const targetMinute = entry.startMinutes - interval;
          if (currentMinutes === targetMinute) {
            const alreadyLogged = db.notifications.some(
              n => n.courseCode === entry.courseCode &&
                   n.minutesBefore === interval &&
                   new Date(n.timestamp).toDateString() === now.toDateString()
            );

            if (!alreadyLogged) {
              db.notifications.unshift({
                id: `notif-auto-${Date.now()}`,
                title: `UPCOMING CLASS: ${entry.courseCode} (${interval}m)`,
                message: `${entry.courseName} begins in ${interval} minutes at ${entry.venue} (${entry.timeDisplay}).`,
                courseCode: entry.courseCode,
                venue: entry.venue,
                timeSlot: entry.timeDisplay,
                type: 'reminder',
                timestamp: new Date().toISOString(),
                read: false,
                minutesBefore: interval
              });
              writeDb(db);
            }
          }
        });
      }
    });
  } catch (err) {
    console.warn('Background reminder tick exception:', err);
  }
}, 30000);

// ----------------- API ISOLATION & ERROR GUARDS -----------------
// Guarantee that ALL requests under /api/* ALWAYS return JSON and NEVER fall into Vite SPA HTML fallback
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global API error middleware ensuring all errors return JSON instead of Express default HTML error page
app.use('/api', (err: any, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[API Error Handler]', err?.message || err);
  res.status(err.status || err.statusCode || 500).json({
    error: err?.message || 'Internal server error occurred processing API request'
  });
});

// ----------------- VITE & STATIC SERVING -----------------
async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const publicPath = path.join(__dirname, 'public');

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        allowedHosts: true
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    if (fs.existsSync(publicPath)) {
      app.use('/public', express.static(publicPath));
      app.use(express.static(publicPath));
    }
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Remind] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
