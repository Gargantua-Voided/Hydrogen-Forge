import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Check } from 'lucide-react';
import { db } from '../services/db';
import { KeyboardLayoutId } from '../types';

interface SettingsViewProps {
  currentLayout: KeyboardLayoutId;
  onLayoutChange: (layout: KeyboardLayoutId) => void;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLayout,
  onLayoutChange,
  onRefreshAll,
}) => {
  const [timeoutMs, setTimeoutMs] = useState<number>(() =>
    Number(db.getSetting('macro_timeout_ms', '15000'))
  );
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSavePreferences = () => {
    db.setSetting('default_keyboard_layout', currentLayout);
    db.setSetting('macro_timeout_ms', String(timeoutMs));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1800);
  };

  const handleExportDatabase = () => {
    const jsonStr = db.exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esp32_macro_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const ok = db.importDatabaseJson(event.target?.result as string);
      setImportStatus(ok ? 'Backup restored' : 'Invalid backup file');
      if (ok) onRefreshAll();
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-lg font-bold text-slate-900 tracking-tight">Settings</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 text-xs">
        <div>
          <label className="block font-semibold text-slate-800 mb-2">Keyboard Layout</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onLayoutChange('DE_QWERTZ')}
              className={`p-3 rounded-xl border text-left transition-all ${
                currentLayout === 'DE_QWERTZ'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/15'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-slate-900">German QWERTZ</div>
              <div className="text-[11px] text-slate-500 mt-0.5">ä, ö, ü, ß, @, €, AltGr</div>
            </button>

            <button
              type="button"
              onClick={() => onLayoutChange('US')}
              className={`p-3 rounded-xl border text-left transition-all ${
                currentLayout === 'US'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/15'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-slate-900">US English</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Standard ANSI QWERTY</div>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-800">Macro Timeout</label>
            <span className="font-mono text-slate-700 tabular-nums">{timeoutMs / 1000}s</span>
          </div>
          <input
            type="range"
            min="5000"
            max="30000"
            step="1000"
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
        <h3 className="font-semibold text-slate-800">Local Backup</h3>

        {importStatus && (
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 font-medium">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportDatabase}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export JSON</span>
          </button>

          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear execution history?')) {
                db.clearExecutionLogs();
                onRefreshAll();
              }
            }}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Activity History</span>
          </button>
        </div>
      </div>
    </div>
  );
};
