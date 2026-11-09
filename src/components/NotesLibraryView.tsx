import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Calendar, 
  Tag, 
  Sparkles, 
  CheckSquare, 
  HelpCircle,
  ExternalLink,
  Filter,
  FileText,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { SessionNote, TimetableEntry, SupportingDocument } from '../types/timetable';

interface NotesLibraryViewProps {
  notes: SessionNote[];
  timetable: TimetableEntry[];
  onOpenNoteModal: (note?: SessionNote | null, courseCode?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenDocumentViewer?: (doc: SupportingDocument) => void;
}

export const NotesLibraryView: React.FC<NotesLibraryViewProps> = ({
  notes,
  timetable,
  onOpenNoteModal,
  onDeleteNote,
  onOpenDocumentViewer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [activeExpandedNoteId, setActiveExpandedNoteId] = useState<string | null>(notes[0]?.id || null);

  // Extract unique course codes and tags
  const courseCodes = Array.from(new Set(timetable.map(c => c.courseCode)));
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.courseCode && n.courseCode.toLowerCase().includes(q)) ||
      (n.keyConcepts && n.keyConcepts.some(k => k.toLowerCase().includes(q))) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));

    const matchesCourse = selectedCourse === 'ALL' || n.courseCode === selectedCourse;
    const matchesTag = selectedTag === 'ALL' || (n.tags && n.tags.includes(selectedTag));

    return matchesSearch && matchesCourse && matchesTag;
  });

  const handleExportAllJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `smart_remind_notes_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono font-semibold">
              Academic Knowledge Base
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {notes.length} Course Session Notes
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Notes Library & Lecture Materials
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Retrieve session summaries, core theoretical concepts, instructor highlights, problem sets, and view attached PDFs and slide decks in-browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportAllJson}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-mono flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All JSON</span>
          </button>

          <button
            onClick={() => onOpenNoteModal(null)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Session Note</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, notes, formulas..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl pl-10 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Course Filter & Tag filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Course:</span>
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Courses ({timetable.length})</option>
            {courseCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          )}
        </div>

      </div>

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No session notes found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || selectedCourse !== 'ALL'
              ? 'Try clearing your search query or module filters.'
              : 'Record notes and attach PDF/slide materials during your lecture sessions.'}
          </p>
          <button
            onClick={() => onOpenNoteModal(null)}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Notes Sidebar Navigation */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredNotes.map(n => {
              const isSelected = activeExpandedNoteId === n.id;
              const docCount = (n.documents || []).length;

              return (
                <div
                  key={n.id}
                  onClick={() => setActiveExpandedNoteId(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-950/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 text-[11px] font-mono font-bold">
                      {n.courseCode || 'General Note'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {n.sessionDate || n.date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {n.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {n.content}
                  </p>

                  {/* Badges preview */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                    {docCount > 0 && (
                      <span className="bg-cyan-950 border border-cyan-800 px-1.5 py-0.5 rounded text-cyan-300 font-bold">
                        {docCount} PDF/Doc{docCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {n.keyConcepts?.length > 0 && (
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">
                        {n.keyConcepts.length} concepts
                      </span>
                    )}
                    {n.assignments?.length > 0 && (
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300">
                        {n.assignments.length} tasks
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Note Detailed Reader Pane */}
          <div className="lg:col-span-7">
            {(() => {
              const activeNote = notes.find(n => n.id === activeExpandedNoteId) || filteredNotes[0];
              if (!activeNote) return null;

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                  
                  {/* Note header & actions */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-mono font-bold">
                          {activeNote.courseCode || 'ACADEMIC'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Session Date: {activeNote.sessionDate || activeNote.date}
                        </span>
                        {activeNote.venue && (
                          <span className="text-xs text-slate-400 font-mono">
                            · {activeNote.venue}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        {activeNote.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenNoteModal(activeNote)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete note "${activeNote.title}"?`)) {
                            onDeleteNote(activeNote.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Supporting Documents / Attachments (PDFs, slides, images) */}
                  {activeNote.documents && activeNote.documents.length > 0 && (
                    <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>Supporting Materials & Documents ({activeNote.documents.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Click to view in-browser</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeNote.documents.map(doc => (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 hover:border-cyan-500 transition-colors"
                          >
                            <div className="truncate">
                              <span className="text-xs font-bold text-white block truncate">{doc.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{doc.sizeFormatted}</span>
                            </div>

                            <button
                              onClick={() => onOpenDocumentViewer && onOpenDocumentViewer(doc)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main content body */}
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    {activeNote.content}
                  </div>

                  {/* Summary */}
                  {activeNote.summary && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="font-bold text-cyan-300 block mb-1 font-mono uppercase text-[10px]">Session Summary</span>
                      <p className="text-slate-300 leading-relaxed">{activeNote.summary}</p>
                    </div>
                  )}

                  {/* Key concepts */}
                  {activeNote.keyConcepts && activeNote.keyConcepts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Core Concepts & Principles</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeNote.keyConcepts.map((c, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-cyan-900/40 text-xs text-slate-200">
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lecturer Highlights */}
                  {activeNote.lecturerHighlights && activeNote.lecturerHighlights.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
                        <span>Lecturer Highlights & Exam Emphasis</span>
                      </div>
                      <div className="space-y-1.5">
                        {activeNote.lecturerHighlights.map((h, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200">
                            • {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignments & Tasks */}
                  {activeNote.assignments && activeNote.assignments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Follow-up Assignments & Tasks</span>
                      </div>
                      <div className="space-y-1.5">
                        {activeNote.assignments.map((a, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200 flex items-center gap-2">
                            <span>☐</span>
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Questions */}
                  {activeNote.questions && activeNote.questions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Questions for Consultation</span>
                      </div>
                      <div className="space-y-1.5">
                        {activeNote.questions.map((q, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-200">
                            ? {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* References & Tags */}
                  <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {(activeNote.tags || []).map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {activeNote.id}
                    </span>
                  </div>

                </div>
              );
            })()}
          </div>

        </div>
      )}

    </div>
  );
};
