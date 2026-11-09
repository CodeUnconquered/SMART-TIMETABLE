import React from 'react';
import { CustomFieldDefinition } from '../types/timetable';

interface DynamicFieldRendererProps {
  definitions: CustomFieldDefinition[];
  values: Record<string, string | number | boolean | string[]>;
  onChange: (name: string, value: string | number | boolean | string[]) => void;
  target: 'course' | 'task';
  readOnly?: boolean;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  definitions,
  values,
  onChange,
  target,
  readOnly = false
}) => {
  const applicableFields = definitions.filter(
    def => def.appliesTo === 'all' || def.appliesTo === target
  );

  if (applicableFields.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Custom Attributes & Metadata
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">
          {applicableFields.length} custom field{applicableFields.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applicableFields.map(field => {
          const val = values[field.name] !== undefined ? values[field.name] : (field.defaultValue ?? '');

          if (readOnly) {
            return (
              <div key={field.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] font-mono text-slate-400 block mb-1">
                  {field.label}
                </span>
                {field.type === 'url' && typeof val === 'string' && val ? (
                  <a
                    href={val}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline break-all"
                  >
                    {val}
                  </a>
                ) : field.type === 'checkbox' ? (
                  <span className={`text-xs font-semibold ${val ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {val ? 'Yes / Enabled' : 'No / Disabled'}
                  </span>
                ) : Array.isArray(val) ? (
                  <div className="flex flex-wrap gap-1">
                    {val.map((item, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-200 font-mono">
                    {String(val || '—')}
                  </span>
                )}
              </div>
            );
          }

          // Editable inputs
          switch (field.type) {
            case 'text':
            case 'url':
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-400 text-[10px]">*required</span>}
                  </label>
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={(val as string) || ''}
                    placeholder={field.type === 'url' ? 'https://...' : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              );

            case 'long_text':
              return (
                <div key={field.id} className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-400 text-[10px]">*required</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={(val as string) || ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              );

            case 'number':
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-400 text-[10px]">*required</span>}
                  </label>
                  <input
                    type="number"
                    value={val as number}
                    onChange={(e) => onChange(field.name, parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              );

            case 'date':
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {field.label}
                  </label>
                  <input
                    type="date"
                    value={(val as string) || ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              );

            case 'time':
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {field.label}
                  </label>
                  <input
                    type="time"
                    value={(val as string) || ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              );

            case 'dropdown':
              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {field.label}
                  </label>
                  <select
                    value={(val as string) || ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select option...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );

            case 'checkbox':
              return (
                <div key={field.id} className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id={`field-${field.id}`}
                    checked={Boolean(val)}
                    onChange={(e) => onChange(field.name, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor={`field-${field.id}`} className="text-xs text-slate-300 cursor-pointer">
                    {field.label}
                  </label>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
