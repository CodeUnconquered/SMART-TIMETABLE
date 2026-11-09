import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  User, 
  Bell, 
  BookOpen, 
  Layers, 
  Calendar,
  Download,
  Info,
  FileText,
  Eye,
  FileUp,
  Phone
} from 'lucide-react';
import { TimetableEntry, CustomFieldDefinition, SessionNote, SupportingDocument } from '../types/timetable';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';

interface CourseModalProps {
  course: TimetableEntry | null;
  notes?: SessionNote[];
  customFields?: CustomFieldDefinition[];
  onClose: () => void;
  onTriggerTestReminder: (course: TimetableEntry) => void;
  onOpenNoteModal?: (courseCode: string, entryId: string, note?: SessionNote | null) => void;
  onOpenDocumentViewer?: (doc: SupportingDocument) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  notes = [],
  customFields = [],
  onClose,
  onTriggerTestReminder,
  onOpenNoteModal,
  onOpenDocumentViewer
}) => {
  if (!course) return null;

  const durationHours = ((course.endMinutes - course.startMinutes) / 60).toFixed(1);

  // Filter notes that belong to this course
  const courseNotes = notes.filter(n => n.courseCode === course.courseCode || n.timetableEntryId === course.id);

  // Collect all supporting documents from these notes
  const courseDocuments = courseNotes.flatMap(n => n.documents || []);

  // Generate .ICS file download for this course
  const handleExportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Remind//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${course.courseCode} - ${course.courseName}`,
      `LOCATION:${course.venue}`,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Ribbon */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
              {course.courseCode}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{course.classType}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{course.credits} Credits</span>
            {course.academicPeriod && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">{course.academicPeriod}</span>
              </>
            )}
          </div>

          <h2 id="modal-title" className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
            {course.courseName}
          </h2>

          {/* Occurrence overrides if active */}
          {course.occurrenceOverrides && course.occurrenceOverrides.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {course.occurrenceOverrides.map(o => (
                <div 
                  key={o.date} 
                  className={`text-xs px-3.5 py-2 rounded-xl border font-mono ${
                    o.status === 'cancelled'
                      ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                      : 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                  }`}
                >
                  <strong>{o.date}:</strong> {o.status === 'cancelled' ? `Class session cancelled (${o.reason || 'Lecturer unavailable'})` : `Rescheduled to ${o.rescheduledDate} ${o.rescheduledTimeDisplay} at ${o.rescheduledVenue}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-left text-sm text-slate-300">
          
          {/* Schedule & Venue Meta Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-0.5">Recurring Slot</span>
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
              <span className="text-slate-400 block mb-0.5">Venue & Classroom (Free Text)</span>
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {course.venue}
              </span>
            </div>
          </div>

          {/* Lecturer Info */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-mono block">Course Instructor</span>
                <span className="text-white font-semibold text-sm">{course.lecturer}</span>
              </div>
            </div>
            {course.lecturerPhone ? (
              <a
                href={`tel:${course.lecturerPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-800 hover:border-cyan-500 text-xs text-cyan-300 hover:text-white font-mono transition-colors"
                title="Call Instructor"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>{course.lecturerPhone}</span>
              </a>
            ) : course.lecturerEmail ? (
              <a
                href={`mailto:${course.lecturerEmail}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
              >
                {course.lecturerEmail}
              </a>
            ) : null}
          </div>

          {/* Special Instructions / Remarks if present */}
          {course.instructions && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 flex items-start gap-2.5 text-xs text-cyan-200">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-cyan-300">Instructor Instructions & Remarks:</span>
                <span>{course.instructions}</span>
              </div>
            </div>
          )}

          {/* Course Session Notes & Attached Documents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                  Course Session Notes & Materials ({courseNotes.length})
                </h3>
              </div>
              {onOpenNoteModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNoteModal(course.courseCode, course.id, null);
                  }}
                  className="text-xs text-cyan-400 hover:underline font-mono cursor-pointer"
                >
                  + Add Session Note
                </button>
              )}
            </div>

            {courseNotes.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                <span>No session notes recorded for this module yet.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {courseNotes.map(n => (
                  <div key={n.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{n.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{n.sessionDate || n.date}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{n.content}</p>

                    {/* Attached Documents in note */}
                    {n.documents && n.documents.length > 0 && (
                      <div className="pt-2 border-t border-slate-850 flex flex-wrap gap-2">
                        {n.documents.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => onOpenDocumentViewer && onOpenDocumentViewer(doc)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-[11px] font-mono text-cyan-300 cursor-pointer"
                            title="Preview in-browser"
                          >
                            <FileText className="w-3 h-3 text-cyan-400" />
                            <span className="truncate max-w-[150px]">{doc.name}</span>
                            <Eye className="w-3 h-3 text-slate-400 ml-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Curriculum Description */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Curriculum Description
            </h3>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              {course.description}
            </p>
          </div>

          {/* Custom Fields */}
          {course.customFields && Object.keys(course.customFields).length > 0 && (
            <DynamicFieldRenderer
              definitions={customFields}
              values={course.customFields}
              onChange={() => {}}
              target="course"
              readOnly={true}
            />
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTriggerTestReminder(course)}
              className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Test ~10s audible alarm alert"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Alarm</span>
            </button>

            <button
              onClick={handleExportICS}
              className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ICS</span>
            </button>
          </div>

          {onOpenNoteModal && (
            <button
              onClick={() => {
                onClose();
                onOpenNoteModal(course.courseCode, course.id, null);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Record Session Note</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
