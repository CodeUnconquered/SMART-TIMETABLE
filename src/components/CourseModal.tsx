import React from 'react';
import { X, CalendarPlus, MapPin, Clock, User, Bell, ExternalLink, BookOpen, Layers } from 'lucide-react';
import { TimetableEntry } from '../types/timetable';

interface CourseModalProps {
  course: TimetableEntry | null;
  onClose: () => void;
  onTriggerTestReminder: (course: TimetableEntry) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  onClose,
  onTriggerTestReminder
}) => {
  if (!course) return null;

  const durationHours = ((course.endMinutes - course.startMinutes) / 60).toFixed(1);

  // Generate .ICS file download for this course
  const handleExportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Academic Class Reminder//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${course.courseCode} - ${course.courseName}`,
      `LOCATION:${course.venue} (${course.building})`,
      `DESCRIPTION:${course.description}\\nLecturer: ${course.lecturer}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${course.courseCode.replace(/\s+/g, '_')}_schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Ribbon */}
        <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-850 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
              {course.courseCode}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{course.classType}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{course.credits} Academic Credits</span>
          </div>

          <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-white leading-tight">
            {course.courseName}
          </h2>

          {course.isCancelled && (
            <div className="mt-2 text-xs font-medium text-rose-300 bg-rose-950/80 border border-rose-800 px-3 py-1.5 rounded-lg">
              This class session is marked as cancelled: {course.cancelReason || 'Administrative directive'}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left text-sm text-slate-300">
          
          {/* Schedule & Venue Meta Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-0.5">Day & Time Window</span>
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                {course.day} · {course.timeDisplay}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Duration</span>
              <span className="text-white font-semibold">{durationHours} Hours Allocated</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Assigned Facility & Room</span>
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {course.venue} · {course.building}
              </span>
            </div>
          </div>

          {/* Lecturer Info */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-850 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-mono block">Course Instructor</span>
                <span className="text-white font-semibold text-sm">{course.lecturer}</span>
              </div>
            </div>
            {course.lecturerEmail && (
              <a
                href={`mailto:${course.lecturerEmail}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center gap-1"
              >
                Contact
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Description & Syllabus */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              Curriculum Scope & Syllabus Outline
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
              {course.description}
            </p>
          </div>

          {/* Tech Stack / Lab Tools */}
          {course.techStack && course.techStack.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Laboratory Software & Tooling Environment
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {course.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTriggerTestReminder(course)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate Class Alarm</span>
            </button>

            <button
              onClick={handleExportICS}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Export .ICS</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
