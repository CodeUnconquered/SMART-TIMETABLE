import React from 'react';
import { X, Download, Trash2, FileText, ExternalLink } from 'lucide-react';
import { SupportingDocument } from '../types/timetable';

interface DocumentViewerModalProps {
  document: SupportingDocument | null;
  onClose: () => void;
  onDelete?: (documentId: string) => void;
}

export function isSafeDocumentUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  // Strictly block javascript:, vbscript:, and inline HTML data URLs
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('data:text/html') || trimmed.startsWith('data:text/javascript')) return false;
  // Allow safe web URLs and valid media data URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('data:application/pdf') || trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  return false;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  onClose,
  onDelete
}) => {
  if (!doc) return null;

  const isSafe = isSafeDocumentUrl(doc.url);
  const isPdf = isSafe && (doc.type === 'pdf' || doc.mimeType?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf'));
  const isImage = isSafe && (doc.type === 'image' || doc.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.name));
  const isAudio = isSafe && (doc.type === 'audio' || doc.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(doc.name));

  const handleDownload = () => {
    if (!isSafe) {
      console.warn('[Security] Blocked unsafe document URL download:', doc.url);
      return;
    }
    const a = window.document.createElement('a');
    a.href = doc.url;
    // Sanitize filename to prevent directory traversal or header manipulation
    a.download = doc.name.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
    >
      <div className="relative w-full max-w-4xl h-[88vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Viewer Control Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 id="doc-viewer-title" className="text-xs sm:text-sm font-bold text-white truncate">
                {doc.name}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {doc.sizeFormatted} · Attached {new Date(doc.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Remove attachment "${doc.name}" from session?`)) {
                    onDelete(doc.id);
                    onClose();
                  }
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Delete attachment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-Browser Document Canvas */}
        <div className="flex-1 bg-slate-950/90 p-2 sm:p-4 overflow-auto flex items-center justify-center">
          {!isSafe ? (
            <div className="text-center p-8 space-y-4 max-w-md bg-rose-950/30 border border-rose-800/50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-900/50 border border-rose-750 text-rose-400 mx-auto flex items-center justify-center">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Attachment Blocked by Security Policy</h4>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                This attachment uses an unrecognized or potentially hazardous URI scheme and has been restricted to protect your device.
              </p>
            </div>
          ) : isPdf ? (
            <iframe
              src={doc.url}
              title={doc.name}
              sandbox="allow-downloads allow-same-origin"
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={doc.url}
                alt={doc.name}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          ) : isAudio ? (
            <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{doc.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Recorded Voice Session Note ({doc.sizeFormatted})</p>
              </div>
              <audio controls src={doc.url} className="w-full mt-2" />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4 max-w-md">
              <FileText className="w-16 h-16 text-cyan-400 mx-auto opacity-70" />
              <h4 className="text-base font-bold text-white">{doc.name}</h4>
              <p className="text-xs text-slate-400">
                This document type ({doc.mimeType || 'binary/doc'}) is ready for review. You can download it directly to view in your preferred desktop reader.
              </p>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Attachment</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
