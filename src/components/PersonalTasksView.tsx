import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Bell, 
  Calendar, 
  CheckSquare, 
  RotateCcw,
  Sparkles,
  Search
} from 'lucide-react';
import { PersonalTask, ActivityStatus, CustomFieldDefinition } from '../types/timetable';

interface PersonalTasksViewProps {
  tasks: PersonalTask[];
  customFields?: CustomFieldDefinition[];
  onOpenTaskModal: (task?: PersonalTask | null) => void;
  onUpdateTask: (taskId: string, updates: Partial<PersonalTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onTriggerTaskReminder: (task: PersonalTask) => void;
}

export const PersonalTasksView: React.FC<PersonalTasksViewProps> = ({
  tasks,
  customFields = [],
  onOpenTaskModal,
  onUpdateTask,
  onDeleteTask,
  onTriggerTaskReminder
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter(task => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      (task.location && task.location.toLowerCase().includes(q));

    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-400 text-xs font-mono font-semibold">
              Personal Productivity & Study
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {tasks.length} Activities Logged
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Personal Tasks & Activity Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Schedule revision blocks, programming projects, workouts, and personal milestones with smart alarm reminders.
          </p>
        </div>

        <button
          onClick={() => onOpenTaskModal(null)}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/60 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Personal Task</span>
        </button>
      </div>

      {/* Productivity Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Scheduled</span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{tasks.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">In Progress</span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{inProgressCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">Pending</span>
          <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">{pendingCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">Completed</span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{completedCount}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, locations, notes..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl pl-10 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Categories</option>
            <option value="study">Study / Revision</option>
            <option value="assignment">Assignment / Coursework</option>
            <option value="project">Project / Coding</option>
            <option value="reading">Reading / Research</option>
            <option value="meeting">Meetings</option>
            <option value="exercise">Exercise / Fitness</option>
            <option value="walk">Walk / Outdoors</option>
            <option value="commitment">Commitments</option>
            <option value="religious">Church / Faith</option>
            <option value="personal">Personal Routine</option>
            <option value="other">Other Activities</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ActivityStatus | 'all')}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Task Cards */}
      {filteredTasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No activities match your filters</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Schedule your non-academic sessions, revision milestones, or fitness routines to keep your week balanced.
          </p>
          <button
            onClick={() => onOpenTaskModal(null)}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Activity</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';

            const priorityBadgeColor = 
              task.priority === 'urgent' ? 'bg-rose-950/80 border-rose-800 text-rose-300' :
              task.priority === 'high' ? 'bg-amber-950/80 border-amber-800 text-amber-300' :
              task.priority === 'medium' ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300' :
              'bg-slate-950 border-slate-800 text-slate-400';

            return (
              <div
                key={task.id}
                className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'bg-slate-950/60 border-slate-850 opacity-75'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                <div>
                  {/* Top category & priority row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono uppercase font-bold text-slate-300">
                      {task.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${priorityBadgeColor}`}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-base font-bold text-white tracking-tight ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h3>

                  {/* Time & Date */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {task.date}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {task.startTime} - {task.endTime}
                    </span>
                  </div>

                  {/* Location */}
                  {task.location && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{task.location}</span>
                    </div>
                  )}

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed line-clamp-3">
                      {task.description}
                    </p>
                  )}

                  {/* Recurring badge */}
                  {task.recurring?.enabled && (
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-purple-300">
                      <RotateCcw className="w-3 h-3" />
                      <span>Repeats every: {task.recurring.days.join(', ')}</span>
                    </div>
                  )}

                  {/* Configured Smart Reminders Badge */}
                  {task.reminderIntervals && task.reminderIntervals.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-purple-300 bg-purple-950/40 border border-purple-900/50 rounded-xl px-2.5 py-1">
                      <Bell className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Reminders:</span>
                      {task.reminderIntervals.map((min, idx) => (
                        <span key={idx} className="bg-purple-900/60 text-purple-200 px-1.5 py-0.2 rounded text-[10px]">
                          {min === 0 ? 'Start' : `${min}m`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom status and actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.status !== 'completed' ? (
                      <button
                        onClick={() => onUpdateTask(task.id, { status: 'completed' })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Mark as completed"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateTask(task.id, { status: 'pending' })}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-mono transition-colors cursor-pointer"
                        title="Reopen task"
                      >
                        Reopen
                      </button>
                    )}

                    {task.status === 'pending' && (
                      <button
                        onClick={() => onUpdateTask(task.id, { status: 'in_progress' })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Start
                      </button>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        onClick={() => {
                          // Postpone by 1 day or next convenient slot
                          const d = new Date(task.date);
                          d.setDate(d.getDate() + 1);
                          const nextDate = d.toISOString().split('T')[0];
                          onUpdateTask(task.id, { date: nextDate });
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
                        title="Postpone to tomorrow"
                      >
                        +1 Day
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTriggerTaskReminder(task)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Trigger 10s audible alarm test for this task"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenTaskModal(task)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete task "${task.title}"?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
