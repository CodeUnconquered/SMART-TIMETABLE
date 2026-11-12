import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Tag, 
  Sparkles, 
  Paperclip, 
  FileText, 
  Eye, 
  HelpCircle, 
  CheckSquare, 
  Search, 
  Clock, 
  MapPin,
  Mic,
  Volume2
} from 'lucide-react';
import { SessionNote, SupportingDocument } from '../types/timetable';
import { DocumentViewerModal } from './DocumentViewerModal';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';

interface SessionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: SessionNote | null;
  timetableEntryId?: string;
  courseCode?: string;
  taskId?: string;
  sessionDate?: string;
  sessionTimeSlot?: string;
  venue?: string;
  onSave: (note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onOpenDocumentViewer?: (doc: SupportingDocument) => void;
}

export const SessionNotesModal: React.FC<SessionNotesModalProps> = ({
  isOpen,
  onClose,
  note,
  timetableEntryId,
  courseCode,
  sessionDate,
  sessionTimeSlot,
  venue,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(sessionDate || new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(sessionTimeSlot || '');
  const [courseVenue, setCourseVenue] = useState(venue || '');
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [lecturerExplanations, setLecturerExplanations] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [researchItems, setResearchItems] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Scratch input states
  const [newConcept, setNewConcept] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newAssignment, setNewAssignment] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newResearch, setNewResearch] = useState('');
  const [newTag, setNewTag] = useState('');

  // Active document preview modal state
  const [previewDoc, setPreviewDoc] = useState<SupportingDocument | null>(null);

  // Voice note recorder and speech-to-text panel toggle
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setDate(note.sessionDate || note.createdAt.split('T')[0]);
      setTimeSlot(note.sessionTimeSlot || '');
      setCourseVenue(note.venue || '');
      setKeyConcepts(note.keyConcepts || []);
      setLecturerExplanations(note.lecturerExplanations || []);
      setAssignments(note.assignments || []);
      setQuestions(note.questions || []);
      setResearchItems(note.researchItems || []);
      setSummary(note.summary || '');
      setDocuments(note.documents || []);
      setTags(note.tags || []);
    } else {
      const code = courseCode || 'Academic Module';
      setTitle(`${code} Session Learning Notes`);
      setContent('');
      setDate(sessionDate || new Date().toISOString().split('T')[0]);
      setTimeSlot(sessionTimeSlot || '');
      setCourseVenue(venue || '');
      setKeyConcepts([]);
      setLecturerExplanations([]);
      setAssignments([]);
      setQuestions([]);
      setResearchItems([]);
      setSummary('');
      setDocuments([]);
      setTags(courseCode ? [courseCode] : ['Lecture']);
    }
  }, [note, courseCode, sessionDate, sessionTimeSlot, venue, isOpen]);

  if (!isOpen) return null;

  // File Upload Handler (converts to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Limit to 10MB per attachment for local persistence
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        let type: SupportingDocument['type'] = 'doc';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(file.name)) type = 'audio';

        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeFormatted = file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.round(file.size / 1024)} KB`;

        const newDoc: SupportingDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          type,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          sizeFormatted,
          url: resultUrl,
          uploadedAt: new Date().toISOString()
        };

        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveDoc = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSave({
      id: note?.id,
      title: title.trim(),
      content: content.trim(),
      sessionDate: date,
      sessionTimeSlot: timeSlot || undefined,
      venue: courseVenue || undefined,
      timetableEntryId: timetableEntryId || note?.timetableEntryId,
      courseCode: courseCode || note?.courseCode,
      keyConcepts,
      lecturerExplanations,
      assignments,
      questions,
      researchItems,
      summary: summary.trim() || undefined,
      documents,
      tags
    });
    onClose();
  };

  const handleExportMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `**Course:** ${courseCode || 'Course Module'} | **Date:** ${date} | **Slot:** ${timeSlot || 'Scheduled Class'}\n\n`;
    
    if (summary) {
      md += `## Executive Summary\n${summary}\n\n`;
    }

    md += `## Detailed Session Notes\n\n${content}\n\n`;

    if (keyConcepts.length > 0) {
      md += `### Core Concepts & Formulas\n` + keyConcepts.map(c => `- ${c}`).join('\n') + '\n\n';
    }
    if (lecturerExplanations.length > 0) {
      md += `### Lecturer Explanations & Context\n` + lecturerExplanations.map(e => `- ${e}`).join('\n') + '\n\n';
    }
    if (assignments.length > 0) {
      md += `### Assignments & Action Items\n` + assignments.map(a => `- [ ] ${a}`).join('\n') + '\n\n';
    }
    if (questions.length > 0) {
      md += `### Consultation Questions\n` + questions.map(q => `- ? ${q}`).join('\n') + '\n\n';
    }
    if (researchItems.length > 0) {
      md += `### Further Research\n` + researchItems.map(r => `- * ${r}`).join('\n') + '\n\n';
    }
    if (documents.length > 0) {
      md += `### Supporting Documents\n` + documents.map(d => `- [Attachment] ${d.name} (${d.sizeFormatted})`).join('\n') + '\n\n';
    }
    if (tags.length > 0) {
      md += `**Tags:** ${tags.map(t => `#${t}`).join(' ')}\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addItem = (
    list: string[], 
    setList: React.Dispatch<React.SetStateAction<string[]>>, 
    val: string, 
    setVal: (v: string) => void
  ) => {
    if (val.trim()) {
      setList([...list, val.trim()]);
      setVal('');
    }
  };

  const removeItem = (
    list: string[], 
    setList: React.Dispatch<React.SetStateAction<string[]>>, 
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {courseCode || 'COURSE SESSION'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Session: {date}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                  {note ? 'Edit Course Session Notes' : 'Record Session Notes & Materials'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
            
            {/* Meta Row: Date, TimeSlot, Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-400 block mb-1">Session Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Scheduled Time</span>
                <input
                  type="text"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  placeholder="e.g. 8:00 AM - 10:00 AM"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Venue / Classroom</span>
                <input
                  type="text"
                  value={courseVenue}
                  onChange={(e) => setCourseVenue(e.target.value)}
                  placeholder="e.g. Computer Lab 2"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Note Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Session Topic / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Query Optimization & B+ Tree Concurrency Control"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Brief Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Brief Executive Summary
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two sentences summarizing the primary takeaway of the lecture..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Detailed Notes Body */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-300">
                  Detailed Learning Notes (What you learned, theorems, proofs, code) <span className="text-rose-400">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showVoiceRecorder
                        ? 'bg-rose-950/90 text-rose-300 border border-rose-800 ring-1 ring-rose-500/40'
                        : 'bg-cyan-950/90 text-cyan-300 hover:bg-cyan-900 border border-cyan-700/60 shadow-sm'
                    }`}
                    title="Speak your session notes and automatically transcribe voice into written text"
                  >
                    <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>{showVoiceRecorder ? 'Close Voice Recorder' : 'Voice Recorder & Transcribe'}</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">{content.length} chars</span>
                </div>
              </div>

              {/* Interactive Voice Recorder & Speech-to-Text Transcriber */}
              {showVoiceRecorder && (
                <VoiceNoteRecorder
                  courseCode={courseCode}
                  topicTitle={title}
                  onApplyTranscription={(transcribedText, mode) => {
                    if (mode === 'append') {
                      setContent(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
                    } else if (mode === 'replace') {
                      setContent(transcribedText);
                    } else if (mode === 'summary') {
                      setSummary(transcribedText);
                    }
                  }}
                  onAttachAudio={(audioDoc) => {
                    setDocuments(prev => [...prev, audioDoc]);
                  }}
                  onClose={() => setShowVoiceRecorder(false)}
                />
              )}

              <textarea
                required
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write detailed notes from the lecture, algorithms, steps, code snippets, or click 'Voice Recorder & Transcribe' above to speak your notes..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3.5 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* SUPPORTING DOCUMENTS SECTION (PDF, Images, Slides, Voice Audio) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Supporting Learning Documents (PDF, Slides, Images, Voice Recordings)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Attach lab PDFs, lecture slides, diagrams, tutorial sheets, or recorded voice notes. View or listen directly in-browser.
                  </p>
                </div>

                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*,.doc,.docx,.txt,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                  No learning documents or voice audio attached yet. Click "Attach Document" or use "Voice Recorder" to record lecture audio.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {doc.type === 'audio' || doc.mimeType?.startsWith('audio/') ? (
                          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-white block truncate">{doc.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {doc.sizeFormatted} · {doc.type === 'audio' ? 'Voice Recording' : doc.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{doc.type === 'audio' ? 'Play Audio' : 'View in Browser'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Core Concepts */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Important Concepts & Definitions</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(keyConcepts, setKeyConcepts, newConcept, setNewConcept);
                    }
                  }}
                  placeholder="e.g. 2-Phase Locking Strict Isolation"
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => addItem(keyConcepts, setKeyConcepts, newConcept, setNewConcept)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>
              {keyConcepts.length > 0 && (
                <div className="space-y-1 mt-2">
                  {keyConcepts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-slate-300">
                      <span>• {item}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(keyConcepts, setKeyConcepts, idx)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lecturer Explanations */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                Lecturer Explanations & Exam Hints
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(lecturerExplanations, setLecturerExplanations, newExplanation, setNewExplanation);
                    }
                  }}
                  placeholder="e.g. Prof stated the exam will test B+ tree node splitting with even fan-out"
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => addItem(lecturerExplanations, setLecturerExplanations, newExplanation, setNewExplanation)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>
              {lecturerExplanations.length > 0 && (
                <div className="space-y-1 mt-2">
                  {lecturerExplanations.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-amber-200/90">
                      <span>• {item}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(lecturerExplanations, setLecturerExplanations, idx)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments & Consultation Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignments */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Assignments & Deadlines</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAssignment}
                    onChange={(e) => setNewAssignment(e.target.value)}
                    placeholder="e.g. Lab Exercise 3 due Monday"
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addItem(assignments, setAssignments, newAssignment, setNewAssignment)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs"
                  >
                    Add
                  </button>
                </div>
                {assignments.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded text-xs text-slate-300">
                    <span>☐ {item}</span>
                    <button type="button" onClick={() => removeItem(assignments, setAssignments, idx)} className="text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Questions */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questions for Consultation</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. How does WAL prevent phantom reads?"
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addItem(questions, setQuestions, newQuestion, setNewQuestion)}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs"
                  >
                    Add
                  </button>
                </div>
                {questions.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded text-xs text-slate-300">
                    <span>? {item}</span>
                    <button type="button" onClick={() => removeItem(questions, setQuestions, idx)} className="text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Things to Research Later */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
                <span>Things to Research Later</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResearch}
                  onChange={(e) => setNewResearch(e.target.value)}
                  placeholder="e.g. Compare PostgreSQL MVCC with MySQL InnoDB lock engine"
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => addItem(researchItems, setResearchItems, newResearch, setNewResearch)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs"
                >
                  Add
                </button>
              </div>
              {researchItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded text-xs text-slate-300">
                  <span>* {item}</span>
                  <button type="button" onClick={() => removeItem(researchItems, setResearchItems, idx)} className="text-slate-400 hover:text-rose-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tags</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag e.g. Midterm, Lab"
                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => addItem(tags, setTags, newTag, setNewTag)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[11px] px-2 py-0.5 rounded-md">
                      #{t}
                      <button type="button" onClick={() => removeItem(tags, setTags, idx)} className="text-cyan-400 hover:text-rose-400">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </form>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-mono flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Session Notes</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Embedded Document Viewer Modal */}
      {previewDoc && (
        <DocumentViewerModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDelete={handleRemoveDoc}
        />
      )}
    </>
  );
};
