import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem, NotificationPreferences, TimetableEntry, PersonalTask } from '../types/timetable';
import { 
  playNotificationSound, 
  startProlongedAlarm, 
  stopProlongedAlarm, 
  triggerVibration,
  generateVoiceAnnouncementText,
  speakVoiceAnnouncement,
  stopVoiceAnnouncement
} from '../utils/audio';
import { getCachedNotifications, setCachedNotifications, getPreferences } from '../utils/storage';

export interface ScheduledReminderPayload {
  id: string;
  title: string;
  body: string;
  triggerAtTime: number; // epoch ms
  intervalMinutes: number;
  courseCode?: string;
  venue?: string;
  timeSlot?: string;
  lecturer?: string;
  lecturerPhone?: string;
  instructions?: string;
  triggered: boolean;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useNotifications(timetable: TimetableEntry[], tasks: PersonalTask[] = []) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(getPreferences());
  const [activeRingingAlarm, setActiveRingingAlarm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    courseCode?: string;
    venue?: string;
    timeSlot?: string;
    spokenAnnouncement?: string;
  } | null>(null);

  const seenRemindersRef = useRef<Set<string>>(new Set());

  // Load cached notifications and check permissions
  useEffect(() => {
    setNotifications(getCachedNotifications());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Post reminders to Service Worker for background execution
  const syncRemindersToServiceWorker = useCallback((reminders: ScheduledReminderPayload[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('smart_remind_scheduled_alarms', JSON.stringify(reminders));
    } catch {
      // ignore
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SYNC_SCHEDULED_REMINDERS',
            reminders
          });
        }
      }).catch((err) => {
        console.warn('[SW-Sync] Could not reach Service Worker:', err);
      });
    }
  }, []);

  // Deliver an active notification with audio, vibration, and system popup
  const deliverNotification = useCallback(
    async (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
      const prefs = getPreferences();
      const newItem: NotificationItem = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Generate dynamic voice announcement text based on reminder details
      const spokenAnnouncement = generateVoiceAnnouncementText({
        title: newItem.title,
        message: newItem.message,
        courseCode: newItem.courseCode,
        type: newItem.type,
        minutesBefore: newItem.minutesBefore,
        venue: newItem.venue
      });

      // 1. Prolonged Alarm / Visual Alert
      if (item.type === 'reminder' || item.type === 'task') {
        if (prefs.soundEnabled) {
          startProlongedAlarm(prefs.alarmDurationSeconds || 10, () => {
            setActiveRingingAlarm(null);
          });
        }
        setActiveRingingAlarm({
          isOpen: true,
          title: newItem.title,
          message: newItem.message,
          courseCode: newItem.courseCode,
          venue: newItem.venue,
          timeSlot: newItem.timeSlot,
          spokenAnnouncement: prefs.voiceAnnouncementEnabled !== false ? spokenAnnouncement : undefined
        });
      } else if (prefs.soundEnabled) {
        playNotificationSound(prefs.soundType);
      }

      // 2. Voice announcement (Optional: speaks dynamic message aloud)
      if (prefs.voiceAnnouncementEnabled !== false && (item.type === 'reminder' || item.type === 'task')) {
        setTimeout(() => {
          speakVoiceAnnouncement(spokenAnnouncement, prefs.voiceSpeechRate || 1.0);
        }, 350);
      }

      // 3. Hardware vibration
      if (prefs.vibrationEnabled) {
        triggerVibration([300, 150, 300, 150, 400]);
      }

      // 3. System-level OS notification (works on Android / Windows / macOS / iOS)
      if (
        prefs.browserNotificationsEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(newItem.title, {
              body: newItem.message,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `smart-remind-${newItem.courseCode || newItem.taskId || 'alert'}`,
              renotify: true,
              vibrate: [300, 150, 300, 150, 400],
              data: { url: '/' }
            } as unknown as NotificationOptions);
          } else {
            new Notification(newItem.title, {
              body: newItem.message,
              icon: '/icon-192.png'
            });
          }
        } catch (err) {
          console.warn('System notification trigger failed:', err);
        }
      }

      // 4. Update in-app notifications history
      setNotifications((prev) => {
        const updated = [newItem, ...prev].slice(0, 60);
        setCachedNotifications(updated);
        return updated;
      });

      return newItem;
    },
    []
  );

  // Trigger manual test reminder
  const triggerTestNotification = useCallback(async () => {
    return deliverNotification({
      title: 'UPCOMING SESSION ALARM: Automated Background Test',
      message: 'Class session starts in 30 minutes at Main Lecture Hall. Lecturer: Dr. Anthony Mutua (+254 712 345 678).',
      courseCode: 'BCS 315',
      venue: 'Main Science Quad, LBB 016',
      timeSlot: '7:00 AM - 10:00 AM',
      type: 'reminder',
      minutesBefore: 30
    });
  }, [deliverNotification]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      setCachedNotifications(updated);
      return updated;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setCachedNotifications([]);
  }, []);

  // Compute and schedule upcoming reminders whenever timetable or tasks update
  useEffect(() => {
    const prefs = getPreferences();
    const intervals = prefs.reminderIntervals || [30, 15, 5];
    const now = new Date();
    const scheduledList: ScheduledReminderPayload[] = [];

    // Schedule for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const targetDayName = DAYS_OF_WEEK[targetDate.getDay()];

      // 1. Course Modules
      timetable.forEach((entry) => {
        if (entry.isCancelled) return;

        const overrides = entry.occurrenceOverrides || [];
        const todayOverride = overrides.find((o) => o.date === targetDateStr);

        // If cancelled for this specific date, do NOT schedule reminder
        if (todayOverride && todayOverride.status === 'cancelled') {
          return;
        }

        // Determine if course runs on this day
        let effectiveStartTime = entry.startTime;
        let effectiveTimeDisplay = entry.timeDisplay;
        let effectiveVenue = entry.venue;

        if (todayOverride && todayOverride.status === 'rescheduled') {
          // If rescheduled to another date, it runs on rescheduledDate
          return;
        }

        // Check if another date was rescheduled to today
        const rescheduledToToday = overrides.find(
          (o) => o.status === 'rescheduled' && o.rescheduledDate === targetDateStr
        );

        if (rescheduledToToday) {
          effectiveStartTime = rescheduledToToday.rescheduledStartTime || entry.startTime;
          effectiveTimeDisplay = rescheduledToToday.rescheduledTimeDisplay || entry.timeDisplay;
          effectiveVenue = rescheduledToToday.rescheduledVenue || entry.venue;
        } else if (entry.day !== targetDayName) {
          return;
        }

        // Parse start time to calculate epoch ms
        const [sH, sM] = effectiveStartTime.split(':').map(Number);
        const sessionStartDate = new Date(targetDate);
        sessionStartDate.setHours(sH, sM, 0, 0);

        intervals.forEach((interval) => {
          const triggerAtTime = sessionStartDate.getTime() - interval * 60 * 1000;
          const reminderId = `rem-class-${entry.id}-${targetDateStr}-${interval}`;

          // Only keep future reminders or reminders within the last 5 minutes
          if (triggerAtTime > Date.now() - 5 * 60 * 1000) {
            const lecturerContact = entry.lecturerPhone 
              ? `${entry.lecturer} (Tel: ${entry.lecturerPhone})` 
              : entry.lecturer;

            const instructionsPart = entry.instructions ? `\nInstructions: ${entry.instructions}` : '';

            scheduledList.push({
              id: reminderId,
              title: `CLASS REMINDER: ${entry.courseCode} (${interval}m before)`,
              body: `${entry.courseName}\nTime: ${effectiveTimeDisplay}\nVenue: ${effectiveVenue}\nLecturer: ${lecturerContact}${instructionsPart}`,
              triggerAtTime,
              intervalMinutes: interval,
              courseCode: entry.courseCode,
              venue: effectiveVenue,
              timeSlot: effectiveTimeDisplay,
              lecturer: entry.lecturer,
              lecturerPhone: entry.lecturerPhone,
              instructions: entry.instructions,
              triggered: seenRemindersRef.current.has(reminderId)
            });
          }
        });
      });

      // 2. Personal Tasks
      tasks.forEach((task) => {
        if (task.status === 'completed' || task.status === 'cancelled') return;

        const isTaskToday = task.date === targetDateStr || 
          (task.recurring?.enabled && task.recurring.days.includes(targetDayName as any));

        if (!isTaskToday) return;

        const [sH, sM] = task.startTime.split(':').map(Number);
        const taskStartDate = new Date(targetDate);
        taskStartDate.setHours(sH, sM, 0, 0);

        const taskIntervals = (task.reminderIntervals && task.reminderIntervals.length > 0)
          ? task.reminderIntervals
          : [15, 5];

        taskIntervals.forEach((interval) => {
          const triggerAtTime = taskStartDate.getTime() - interval * 60 * 1000;
          const reminderId = `rem-task-${task.id}-${targetDateStr}-${interval}`;

          if (triggerAtTime > Date.now() - 5 * 60 * 1000) {
            const timeLeadLabel = interval === 0 ? 'Starts now' : `${interval}m before`;
            scheduledList.push({
              id: reminderId,
              title: `TASK REMINDER: ${task.title} (${timeLeadLabel})`,
              body: `Activity: ${task.category.toUpperCase()}\nTime: ${task.startTime} - ${task.endTime}\nLocation: ${task.location || 'Designated Venue'}${task.description ? `\nNote: ${task.description}` : ''}`,
              triggerAtTime,
              intervalMinutes: interval,
              venue: task.location,
              timeSlot: `${task.startTime} - ${task.endTime}`,
              instructions: task.description,
              triggered: seenRemindersRef.current.has(reminderId)
            });
          }
        });
      });
    }

    // Sync full list of reminders to Service Worker for background triggering
    syncRemindersToServiceWorker(scheduledList);
  }, [timetable, tasks, syncRemindersToServiceWorker]);

  // Foreground active reminder checker (runs every 10 seconds while app is open)
  useEffect(() => {
    const checkForegroundReminders = () => {
      const now = Date.now();
      let scheduledRaw = localStorage.getItem('smart_remind_scheduled_alarms');
      if (!scheduledRaw) return;

      try {
        const scheduled: ScheduledReminderPayload[] = JSON.parse(scheduledRaw);

        scheduled.forEach((reminder) => {
          if (
            !reminder.triggered &&
            !seenRemindersRef.current.has(reminder.id) &&
            now >= reminder.triggerAtTime &&
            now - reminder.triggerAtTime < 2 * 60 * 1000
          ) {
            seenRemindersRef.current.add(reminder.id);

            deliverNotification({
              title: reminder.title,
              message: reminder.body,
              courseCode: reminder.courseCode,
              venue: reminder.venue,
              timeSlot: reminder.timeSlot,
              type: reminder.courseCode ? 'reminder' : 'task',
              minutesBefore: reminder.intervalMinutes
            });
          }
        });
      } catch {
        // ignore
      }
    };

    checkForegroundReminders();
    const intervalId = setInterval(checkForegroundReminders, 10000);
    return () => clearInterval(intervalId);
  }, [deliverNotification]);

  // Handle online connectivity return: re-sync with Service Worker
  useEffect(() => {
    const handleOnline = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_CHECK' });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    permission,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    preferences,
    activeRingingAlarm,
    dismissActiveAlarm: () => {
      stopProlongedAlarm();
      stopVoiceAnnouncement();
      setActiveRingingAlarm(null);
    },
    requestPermission,
    deliverNotification,
    triggerTestNotification,
    markAllAsRead,
    clearNotifications,
    setPreferencesState
  };
}
