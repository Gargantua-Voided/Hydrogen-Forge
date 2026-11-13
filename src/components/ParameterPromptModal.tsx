import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { Shortcut } from '../types';

interface ParameterPromptModalProps {
  shortcut: Shortcut;
  onExecute: (resolvedValues: Record<string, string>) => void;
  onClose: () => void;
}

export const ParameterPromptModal: React.FC<ParameterPromptModalProps> = ({
  shortcut,
  onExecute,
  onClose,
}) => {
  const parameters = shortcut.parameters || [];
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    parameters.forEach((p) => {
      initial[p.name] = p.default_value;
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute(formValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{shortcut.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {parameters.map((param) => (
            <div key={param.id}>
              <label className="block font-medium text-slate-700 mb-1">
                {param.label || param.name}
              </label>
              <input
                type={param.parameter_type === 'secret' ? 'password' : 'text'}
                value={formValues[param.name] ?? ''}
                onChange={(e) => setFormValues({ ...formValues, [param.name]: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
