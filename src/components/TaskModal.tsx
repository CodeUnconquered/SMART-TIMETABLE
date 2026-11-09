import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, Save, CheckSquare } from 'lucide-react';
import { PersonalTask, ActivityPriority, DayOfWeek, CustomFieldDefinition } from '../types/timetable';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: PersonalTask | null;
  customFields?: CustomFieldDefinition[];
  onSave: (task: Omit<PersonalTask, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
}

const DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PersonalTask['category']>('study');
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('20:00');
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([15]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<DayOfWeek[]>(['Sunday']);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setCategory(task.category);
      setPriority(task.priority);
      setDate(task.date);
      setStartTime(task.startTime);
      setEndTime(task.endTime);
      setLocation(task.location || '');
      setReminderMinutes(task.reminderIntervals || [15]);
      setIsRecurring(Boolean(task.recurring?.enabled));
      setRecurringDays(task.recurring?.days || ['Sunday']);
      setTimeError(null);
    } else {
      setTitle('');
      setDescription('');
      setCategory('study');
      setPriority('medium');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('19:00');
      setEndTime('20:00');
      setLocation('');
      setReminderMinutes([15]);
      setIsRecurring(false);
      setRecurringDays(['Sunday']);
      setTimeError(null);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (endMinutes <= startMinutes) {
      setTimeError('End time must be later than start time.');
      return;
    }

    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: task?.status || 'pending',
      date,
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      location: location.trim() || undefined,
      reminderIntervals: reminderMinutes,
      recurring: isRecurring ? { enabled: true, days: recurringDays } : undefined
    });
    onClose();
  };

  const toggleDay = (day: DayOfWeek) => {
    setRecurringDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleReminder = (min: number) => {
    setReminderMinutes(prev =>
      prev.includes(min) ? prev.filter(m => m !== min) : [...prev, min]
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {task ? 'Edit Personal Task' : 'Schedule Personal Activity'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Lightweight task, study routine, or personal activity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Personal Study, Database Revision, Gym"
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          {/* Simple Note / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Task Note / Plan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note on what you will work on (e.g. solve 3 database indexing problems)..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PersonalTask['category'])}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="study">Study / Revision</option>
                <option value="assignment">Assignment / Coursework</option>
                <option value="project">Project / Coding</option>
                <option value="reading">Reading / Research</option>
                <option value="meeting">Meeting / Discussion</option>
                <option value="exercise">Exercise / Fitness</option>
                <option value="walk">Walk / Outdoor Routine</option>
                <option value="commitment">Commitment / Obligation</option>
                <option value="religious">Spiritual / Faith</option>
                <option value="personal">Personal Routine</option>
                <option value="other">Other Activity</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Date</span>
              <span className="text-[11px] font-mono text-cyan-400">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {timeError && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{timeError}</span>
            </div>
          )}

          {/* Reminder Lead Times */}
          <div className="space-y-2 pt-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🔔 Configured Smart Reminders</span>
              </label>
              <span className="text-[11px] font-mono text-purple-400">
                {reminderMinutes.length} active
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-tight">
              Reminders will trigger automatic alarms & device notifications even when the app is closed.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { min: 0, label: 'At start time' },
                { min: 5, label: '5m before' },
                { min: 10, label: '10m before' },
                { min: 15, label: '15m before' },
                { min: 30, label: '30m before' },
                { min: 60, label: '1h before' },
                { min: 120, label: '2h before' },
                { min: 1440, label: '1 day before' }
              ].map(({ min, label }) => {
                const isSelected = reminderMinutes.includes(min);
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => toggleReminder(min)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50 border border-purple-500'
                        : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Location (Optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Home Desk, Library 3rd Floor"
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Weekly Recurrence */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                Repeat Weekly
              </label>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-purple-500 bg-slate-950 cursor-pointer"
              />
            </div>

            {isRecurring && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DAYS.map(day => {
                  const isSel = recurringDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Task</span>
          </button>
        </div>

      </div>
    </div>
  );
};
