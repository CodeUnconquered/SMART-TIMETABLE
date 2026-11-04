import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Persistent Database Directory & File
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface ServerTimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  lecturer: string;
  lecturerEmail?: string;
  day: string;
  dayIndex: number;
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
  isCancelled?: boolean;
  cancelReason?: string;
  lastUpdated?: string;
}

// Initial authoritative schedule data
const INITIAL_TIMETABLE_DATA: ServerTimetableEntry[] = [
  {
    id: 'bcs-315',
    courseCode: 'BCS 315',
    courseName: 'Automata Theory',
    lecturer: 'Dr. Anthony Mutua',
    lecturerEmail: 'a.mutua@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-354',
    courseCode: 'BCS 354',
    courseName: 'Measurement and Instrumentation',
    lecturer: 'Eng. Peter Kamau',
    lecturerEmail: 'p.kamau@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-360',
    courseCode: 'BCS 360',
    courseName: 'Interactive Programming (Python)',
    lecturer: 'Dr. Grace Wanjiku',
    lecturerEmail: 'g.wanjiku@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-314',
    courseCode: 'BCS 314',
    courseName: 'Database Systems II',
    lecturer: 'Prof. James Ochieng',
    lecturerEmail: 'j.ochieng@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-361',
    courseCode: 'BCS 361',
    courseName: 'Data Analysis Techniques',
    lecturer: 'Dr. Silas Kiprop',
    lecturerEmail: 's.kiprop@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-311',
    courseCode: 'BCS 311',
    courseName: 'Software Engineering',
    lecturer: 'Dr. Mary Otieno',
    lecturerEmail: 'm.otieno@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-312',
    courseCode: 'BCS 312',
    courseName: 'Design & Analysis of Algorithms',
    lecturer: 'Prof. Evans Mwangi',
    lecturerEmail: 'e.mwangi@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-366',
    courseCode: 'BCS 366',
    courseName: 'Advanced Java Programming',
    lecturer: 'Dr. Dennis Njoroge',
    lecturerEmail: 'd.njoroge@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-352',
    courseCode: 'BCS 352',
    courseName: 'Digital Signal Processing I',
    lecturer: 'Eng. Francis Kibet',
    lecturerEmail: 'f.kibet@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3 (Elective Track)'
  },
  {
    id: 'bcs-374',
    courseCode: 'BCS 374',
    courseName: 'Mobile Computing',
    lecturer: 'Dr. Kevin Maina',
    lecturerEmail: 'k.maina@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-313',
    courseCode: 'BCS 313',
    courseName: 'Computer Networks',
    lecturer: 'Dr. Bernard Koech',
    lecturerEmail: 'b.koech@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  },
  {
    id: 'bcs-370',
    courseCode: 'BCS 370',
    courseName: 'Network Programming',
    lecturer: 'Dr. Bernard Koech',
    lecturerEmail: 'b.koech@university.ac.ke',
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
    studentGroup: 'BSc. CS Year 3'
  }
];

interface DatabaseSchema {
  timetable: ServerTimetableEntry[];
  changes: Array<{
    id: string;
    entryId: string;
    courseCode: string;
    courseName: string;
    changeType: string;
    previousDetails: string;
    newDetails: string;
    timestamp: string;
    performedBy: string;
    notifiedStudentsCount: number;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    courseCode?: string;
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
  };
}

// Ensure database file exists
function readDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      timetable: INITIAL_TIMETABLE_DATA,
      changes: [
        {
          id: 'chg-init',
          entryId: 'bcs-315',
          courseCode: 'BCS 315',
          courseName: 'Automata Theory',
          changeType: 'restored',
          previousDetails: 'Semester I Schedule',
          newDetails: 'Monday 7:00 AM - 10:00 AM at LBB 016',
          timestamp: new Date().toISOString(),
          performedBy: 'Timetable Scheduling Committee',
          notifiedStudentsCount: 142
        }
      ],
      notifications: [
        {
          id: 'notif-welcome',
          title: 'Timetable Synchronized',
          message: 'BSc. Computer Science Semester II schedule is ready with 12 active modules.',
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }
      ],
      subscriptions: [],
      settings: {
        timezone: 'Africa/Nairobi',
        reminderIntervals: [30, 15, 5],
        soundEnabled: true
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return {
      timetable: INITIAL_TIMETABLE_DATA,
      changes: [],
      notifications: [],
      subscriptions: [],
      settings: {
        timezone: 'Africa/Nairobi',
        reminderIntervals: [30, 15, 5],
        soundEnabled: true
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

// Health & Status
app.get('/api/status', (_req: Request, res: Response) => {
  const db = readDb();
  const now = new Date();
  
  // Format current time in Nairobi
  const nairobiTime = new Intl.DateTimeFormat('en-US', {
    timeZone: db.settings.timezone || 'Africa/Nairobi',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(now);

  res.json({
    status: 'online',
    serverTimeNairobi: nairobiTime,
    timezone: db.settings.timezone,
    totalCourses: db.timetable.length,
    activeCourses: db.timetable.filter(c => !c.isCancelled).length,
    totalChangesLogged: db.changes.length,
    pushSubscribers: db.subscriptions.length
  });
});

// Timetable Listing
app.get('/api/timetable', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.timetable,
    lastUpdated: new Date().toISOString()
  });
});

// Add Course (with conflict detection)
app.post('/api/timetable', (req: Request, res: Response) => {
  const db = readDb();
  const entry = req.body;

  if (!entry.courseCode || !entry.courseName || !entry.day || !entry.startTime) {
    return res.status(400).json({ error: 'Missing required course fields' });
  }

  // Conflict Check
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

  const newId = `bcs-${Date.now().toString(36)}`;
  const newEntry = { ...entry, id: newId };
  db.timetable.push(newEntry);

  // Log Change
  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: newId,
    courseCode: newEntry.courseCode,
    courseName: newEntry.courseName,
    changeType: 'restored',
    previousDetails: 'New Course Added',
    newDetails: `${newEntry.day} ${newEntry.timeDisplay} at ${newEntry.venue}`,
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  writeDb(db);
  res.status(201).json({ success: true, entry: newEntry });
});

// Reschedule / Update Course
app.put('/api/timetable/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const updates = req.body;

  const index = db.timetable.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const prev = db.timetable[index];
  const updated = { ...prev, ...updates, lastUpdated: new Date().toISOString() };
  db.timetable[index] = updated;

  // Determine what changed for the audit log
  let changeType = 'rescheduled';
  if (prev.venue !== updated.venue && prev.timeDisplay === updated.timeDisplay) {
    changeType = 'venue_changed';
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
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  };

  db.changes.unshift(changeItem);

  // Generate notification alert for students
  db.notifications.unshift({
    id: `notif-change-${Date.now()}`,
    title: `TIMETABLE UPDATE: ${updated.courseCode}`,
    message: `${updated.courseName} has been rescheduled to ${updated.day} ${updated.timeDisplay} at ${updated.venue}.`,
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

// Cancel Course
app.delete('/api/timetable/:id', (req: Request, res: Response) => {
  const db = readDb();
  const { id } = req.params;
  const reason = (req.query.reason as string) || 'Faculty Administrative Directive';

  const entry = db.timetable.find(c => c.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Course not found' });
  }

  entry.isCancelled = true;
  entry.cancelReason = reason;
  entry.lastUpdated = new Date().toISOString();

  // Log change
  db.changes.unshift({
    id: `chg-${Date.now()}`,
    entryId: id,
    courseCode: entry.courseCode,
    courseName: entry.courseName,
    changeType: 'cancelled',
    previousDetails: `${entry.day} ${entry.timeDisplay} at ${entry.venue}`,
    newDetails: `Class Cancelled: ${reason}`,
    timestamp: new Date().toISOString(),
    performedBy: 'Academic Timetable Administrator',
    notifiedStudentsCount: 142
  });

  // Notify students
  db.notifications.unshift({
    id: `notif-cancel-${Date.now()}`,
    title: `CLASS CANCELLED: ${entry.courseCode}`,
    message: `The scheduled ${entry.courseName} class on ${entry.day} (${entry.timeDisplay}) has been cancelled. Reason: ${reason}`,
    courseCode: entry.courseCode,
    venue: entry.venue,
    timeSlot: entry.timeDisplay,
    type: 'cancelled',
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);
  res.json({ success: true, message: 'Class cancelled and students notified', entry });
});

// Changes Audit Log
app.get('/api/changes', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.changes });
});

// Notifications
app.get('/api/notifications', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ success: true, data: db.notifications });
});

// Push Subscription Registration
app.post('/api/notifications/subscribe', (req: Request, res: Response) => {
  const db = readDb();
  const sub = req.body;
  if (!sub) return res.status(400).json({ error: 'Invalid subscription' });
  db.subscriptions.push({ ...sub, registeredAt: new Date().toISOString() });
  writeDb(db);
  res.json({ success: true, message: 'Push subscription registered for device reminders.' });
});

// Trigger Immediate Test Reminder
app.post('/api/notifications/test', (req: Request, res: Response) => {
  const db = readDb();
  const { courseCode = 'BCS 314', interval = 30 } = req.body;
  const course = db.timetable.find(c => c.courseCode === courseCode) || db.timetable[0];

  const testNotif = {
    id: `notif-test-${Date.now()}`,
    title: `UPCOMING CLASS REMINDER: ${course.courseCode}`,
    message: `Your ${course.courseName} class starts in ${interval} minutes. Venue: ${course.venue} (${course.timeDisplay}). Please prepare and arrive on time.`,
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

// Settings
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

// Device Sync Endpoint
app.post('/api/sync', (req: Request, res: Response) => {
  const db = readDb();
  const { lastSyncTime } = req.body;
  
  // Filter changes since lastSyncTime if provided
  const newChanges = lastSyncTime 
    ? db.changes.filter(c => new Date(c.timestamp) > new Date(lastSyncTime))
    : db.changes;

  res.json({
    success: true,
    serverTime: new Date().toISOString(),
    timetable: db.timetable,
    recentChanges: newChanges,
    activeVersion: '3.4.1'
  });
});

// ----------------- VITE & STATIC SERVING -----------------
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Academic Timetable] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
