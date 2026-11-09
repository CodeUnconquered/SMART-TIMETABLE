import express from 'express';
type Request = express.Request;
type Response = express.Response;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(__dirname, 'dist', 'index.html')));

// Support JSON payloads with base64 document attachments up to 25MB
app.use(express.json({ limit: '25mb' }));

// Persistent Database Directory & File
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

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
  createdAt: string;
  updatedAt: string;
}

export interface ServerSupportingDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  mimeType: string;
  size: number;
  sizeFormatted: string;
  url: string; // data URL or path
  uploadedAt: string;
}

export interface ServerSessionNote {
  id: string;
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
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed writing DB:', err);
  }
}

// ----------------- API ENDPOINTS -----------------

// Status & Health
app.get('/api/status', (_req: Request, res: Response) => {
  const db = readDb();
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
    totalCourses: db.timetable.length,
    activeCourses: db.timetable.filter(c => !c.isCancelled).length,
    totalTasks: db.tasks.length,
    totalNotes: db.notes.length,
    totalCustomFields: db.customFields.length,
    totalChangesLogged: db.changes.length,
    pushSubscribers: db.subscriptions.length
  });
});

// ----------------- TIMETABLE COURSES -----------------

app.get('/api/timetable', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.timetable,
    lastUpdated: new Date().toISOString()
  });
});

// Add Course (with free text venue and auto-derived day)
app.post('/api/timetable', (req: Request, res: Response) => {
  const db = readDb();
  const entry: ServerTimetableEntry = req.body;

  if (!entry.courseCode || !entry.courseName || !entry.day || !entry.startTime || !entry.endTime || !entry.venue) {
    return res.status(400).json({ error: 'Missing required course fields (code, name, day, startTime, endTime, venue)' });
  }

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
    performedBy: 'Academic Timetable Administrator',
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

// Update / Master Reschedule Course
app.put('/api/timetable/:id', (req: Request, res: Response) => {
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

// Temporary Cancellation for Specific Scheduled Occurrence (e.g. this Wednesday only)
app.post('/api/timetable/:id/cancel-occurrence', (req: Request, res: Response) => {
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
    reason
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
    newDetails: `Cancelled for ${date}: ${reason}`,
    reason,
    targetDate: date,
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  // Notify students that THIS occurrence is cancelled, but future ones return normally
  db.notifications.unshift({
    id: `notif-cancel-occ-${Date.now()}`,
    title: `CLASS CANCELLED FOR ${date}: ${entry.courseCode}`,
    message: `${entry.courseName} scheduled for ${date} (${entry.timeDisplay}) is cancelled. Reason: ${reason}. Future weekly occurrences remain on regular schedule.`,
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

// Reschedule Specific Scheduled Occurrence (e.g. this week's class moved to Friday)
app.post('/api/timetable/:id/reschedule-occurrence', (req: Request, res: Response) => {
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
    reason,
    rescheduledDate: newDate,
    rescheduledDay: newDay,
    rescheduledStartTime: startTime,
    rescheduledEndTime: endTime,
    rescheduledTimeDisplay: timeDisplay,
    rescheduledVenue: venue || entry.venue,
    rescheduledInstructions: instructions
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
    reason,
    targetDate: originalDate,
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
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

// Restore Specific Occurrence
app.post('/api/timetable/:id/restore-occurrence', (req: Request, res: Response) => {
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
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.json({ success: true, entry });
});

// Duplicate Course
app.post('/api/timetable/:id/duplicate', (req: Request, res: Response) => {
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
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.status(201).json({ success: true, entry: duplicateEntry });
});

// PERMANENT DELETION — Remove Everywhere
app.delete('/api/timetable/:id', (req: Request, res: Response) => {
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

// ----------------- PERSONAL TASKS -----------------

app.get('/api/tasks', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.tasks });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const db = readDb();
  const task: ServerPersonalTask = req.body;

  if (!task.title || !task.date || !task.startTime) {
    return res.status(400).json({ error: 'Missing required task fields (title, date, startTime)' });
  }

  const newTask: ServerPersonalTask = {
    ...task,
    id: task.id || `task-${Date.now().toString(36)}`,
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

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const updates = req.body;

  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const prev = db.tasks[index];
  const updatedTask = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  db.tasks[index] = updatedTask;
  writeDb(db);
  res.json({ success: true, task: updatedTask });
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;

  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const removed = db.tasks.splice(index, 1)[0];
  writeDb(db);
  res.json({ success: true, removed });
});

// ----------------- SESSION NOTES & SUPPORTING DOCUMENTS -----------------

app.get('/api/notes', (req: Request, res: Response) => {
  const db = readDb();
  const { courseCode, timetableEntryId, search, date } = req.query;

  let notes = db.notes;

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

app.post('/api/notes', (req: Request, res: Response) => {
  const db = readDb();
  const note: ServerSessionNote = req.body;

  if (!note.title || !note.content) {
    return res.status(400).json({ error: 'Missing note title or content' });
  }

  const newNote: ServerSessionNote = {
    ...note,
    id: note.id || `note-${Date.now().toString(36)}`,
    sessionDate: note.sessionDate || new Date().toISOString().split('T')[0],
    keyConcepts: note.keyConcepts || [],
    lecturerExplanations: note.lecturerExplanations || [],
    assignments: note.assignments || [],
    questions: note.questions || [],
    researchItems: note.researchItems || [],
    documents: note.documents || [],
    tags: note.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.notes.unshift(newNote);
  writeDb(db);
  res.status(201).json({ success: true, note: newNote });
});

app.put('/api/notes/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const updates = req.body;

  const index = db.notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const updatedNote = {
    ...db.notes[index],
    ...updates,
    documents: updates.documents !== undefined ? updates.documents : db.notes[index].documents,
    updatedAt: new Date().toISOString()
  };

  db.notes[index] = updatedNote;
  writeDb(db);
  res.json({ success: true, note: updatedNote });
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;

  const index = db.notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const removed = db.notes.splice(index, 1)[0];
  writeDb(db);
  res.json({ success: true, removed });
});

// ----------------- CUSTOM FIELDS -----------------

app.get('/api/custom-fields', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.customFields });
});

app.post('/api/custom-fields', (req: Request, res: Response) => {
  const db = readDb();
  const field: ServerCustomFieldDefinition = req.body;

  if (!field.name || !field.label || !field.type) {
    return res.status(400).json({ error: 'Missing required custom field attributes' });
  }

  const newField: ServerCustomFieldDefinition = {
    ...field,
    id: field.id || `cf-${Date.now().toString(36)}`,
    appliesTo: field.appliesTo || 'all'
  };

  db.customFields.push(newField);
  writeDb(db);
  res.status(201).json({ success: true, field: newField });
});

app.delete('/api/custom-fields/:id', (req: Request, res: Response) => {
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
  if (!sub) return res.status(400).json({ error: 'Invalid subscription' });
  db.subscriptions.push({ ...sub, registeredAt: new Date().toISOString() });
  writeDb(db);
  res.json({ success: true, message: 'Push subscription registered for device reminders.' });
});

app.post('/api/notifications/test', (req: Request, res: Response) => {
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
    minutesBefore: interval
  };

  db.notifications.unshift(testNotif);
  writeDb(db);

  res.json({ success: true, notification: testNotif });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.settings });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json({ success: true, data: db.settings });
});

app.post('/api/sync', (req: Request, res: Response) => {
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
