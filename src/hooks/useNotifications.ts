import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem, NotificationPreferences, TimetableEntry } from '../types/timetable';
import { playNotificationSound, triggerVibration } from '../utils/audio';
import { getCachedNotifications, setCachedNotifications, getPreferences } from '../utils/storage';

export function useNotifications(timetable: TimetableEntry[]) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(getPreferences());
  const seenRemindersRef = useRef<Set<string>>(new Set());

  // Load cached notifications
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

  // Deliver a notification with sound and vibration
  const deliverNotification = useCallback(
    async (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
      const prefs = getPreferences();
      const newItem: NotificationItem = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        read: false
      };

      // 1. Play audible sound if enabled
      if (prefs.soundEnabled) {
        playNotificationSound(prefs.soundType);
      }

      // 2. Vibrate if enabled
      if (prefs.vibrationEnabled) {
        triggerVibration([250, 150, 250]);
      }

      // 3. System notification if granted and enabled
      if (prefs.browserNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(newItem.title, {
              body: newItem.message,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `class-${newItem.courseCode || 'alert'}`,
              vibrate: [250, 150, 250],
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

      // 4. Update in-app notifications
      setNotifications(prev => {
        const updated = [newItem, ...prev].slice(0, 50);
        setCachedNotifications(updated);
        return updated;
      });

      return newItem;
    },
    []
  );

  // Trigger test reminder
  const triggerTestNotification = useCallback(async () => {
    return deliverNotification({
      title: 'TEST REMINDER: Database Systems II',
      message: 'Your lecture starts in 30 minutes at LBB 016. Prepare your notes and arrive promptly.',
      courseCode: 'BCS 314',
      venue: 'LBB 016',
      timeSlot: '12:00 PM - 2:00 PM',
      type: 'reminder',
      minutesBefore: 30
    });
  }, [deliverNotification]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      setCachedNotifications(updated);
      return updated;
    });
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setCachedNotifications([]);
  }, []);

  // Active reminder scheduler engine (runs every 20 seconds in foreground)
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 Sun, 1 Mon ... 6 Sat
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dateStr = now.toISOString().split('T')[0];
      const prefs = getPreferences();

      // Check against current active classes
      timetable.forEach(entry => {
        if (entry.isCancelled) return;
        if (entry.dayIndex !== currentDay) return;

        const intervals = prefs.reminderIntervals || [30, 15, 5];

        intervals.forEach(interval => {
          const reminderTargetMinute = entry.startMinutes - interval;
          const key = `${entry.id}-${interval}-${dateStr}`;

          // If within the active target minute and not yet seen today
          if (
            currentMinutes >= reminderTargetMinute &&
            currentMinutes < reminderTargetMinute + 2 &&
            !seenRemindersRef.current.has(key)
          ) {
            seenRemindersRef.current.add(key);

            deliverNotification({
              title: `UPCOMING CLASS REMINDER: ${entry.courseCode}`,
              message: `Your ${entry.courseName} class starts in ${interval} minutes. Venue: ${entry.venue} (${entry.timeDisplay}).`,
              courseCode: entry.courseCode,
              venue: entry.venue,
              timeSlot: entry.timeDisplay,
              type: 'reminder',
              minutesBefore: interval
            });
          }
        });
      });
    };

    // Run initial check and set interval
    checkSchedule();
    const timer = setInterval(checkSchedule, 20000);
    return () => clearInterval(timer);
  }, [timetable, deliverNotification]);

  return {
    permission,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    preferences,
    requestPermission,
    deliverNotification,
    triggerTestNotification,
    markAllAsRead,
    clearNotifications,
    setPreferencesState
  };
}
