import React, { useState } from 'react';
import {
  Plus,
  Cpu,
  Usb,
  Bluetooth,
  BluetoothConnected,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Send,
  Keyboard,
} from 'lucide-react';
import {
  Shortcut,
  Device,
  ExecutionLogEntry,
  ConnectionState,
  KeyboardLayoutId,
} from '../types';
import { ShortcutCard } from './ShortcutCard';

interface DashboardViewProps {
  shortcuts: Shortcut[];
  activeDevice: Device | null;
  connectionState: ConnectionState;
  currentLayout: KeyboardLayoutId;
  onLayoutChange: (layout: KeyboardLayoutId) => void;
  executionLogs: ExecutionLogEntry[];
  onRunShortcut: (shortcut: Shortcut) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onDuplicateShortcut: (shortcut: Shortcut) => void;
  onDeleteShortcut: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSendDirectText: (text: string) => Promise<void>;
  onConnectClick: () => void;
  onCreateShortcutClick: () => void;
  onOpenSetupClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shortcuts,
  activeDevice,
  connectionState,
  currentLayout,
  onLayoutChange,
  executionLogs,
  onRunShortcut,
  onEditShortcut,
  onDuplicateShortcut,
  onDeleteShortcut,
  onToggleFavorite,
  onSendDirectText,
  onConnectClick,
  onCreateShortcutClick,
  onOpenSetupClick,
}) => {
  const [directText, setDirectText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const quickShortcuts = shortcuts.some((s) => s.is_favorite)
    ? shortcuts.filter((s) => s.is_favorite)
    : shortcuts.slice(0, 6);

  const handleDirectSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directText.trim() || connectionState !== 'authenticated') return;
    setIsSending(true);
    const payload = directText;
    setDirectText('');
    await onSendDirectText(payload);
    setIsSending(false);
  };

  return (
    <div className="space-y-6">
      {/* Hardware Controller Status Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
              connectionState === 'authenticated'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : connectionState === 'connected'
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : activeDevice
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-500'
                  : connectionState === 'connected'
                  ? 'bg-amber-500'
                  : activeDevice
                  ? 'bg-blue-500'
                  : 'bg-slate-300'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="truncate">{activeDevice ? activeDevice.name : 'ESP32-S3 Controller'}</span>
              {activeDevice && (
                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                  v{activeDevice.firmware_version}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span
                className={
                  connectionState === 'authenticated'
                    ? 'text-emerald-600 font-medium'
                    : connectionState === 'connected'
                    ? 'text-amber-600 font-medium'
                    : ''
                }
              >
                {connectionState === 'authenticated'
                  ? 'Ready'
                  : connectionState === 'connected'
                  ? 'Locked'
                  : activeDevice
                  ? 'Standby'
                  : 'Not paired'}
              </span>
              <span aria-hidden="true">·</span>
              <span>BLE GATT</span>
              <span aria-hidden="true">·</span>
              <span>{currentLayout === 'DE_QWERTZ' ? 'DE QWERTZ' : 'US'}</span>
            </div>
          </div>
        </div>

        {/* Visual Flow: Device -> BLE Connect -> USB HID Keyboard (or Setup flow when empty) */}
        {!activeDevice ? (
          <div className="flex items-center justify-center gap-2 flex-1 max-w-xs">
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
              <Usb className="w-3.5 h-3.5" />
            </div>
            <div className="h-0.5 flex-1 border-t-2 border-dashed border-slate-200" />
            <button
              type="button"
              onClick={onOpenSetupClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-600/20 whitespace-nowrap shrink-0"
            >
              <span>Setup Device</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="h-0.5 flex-1 border-t-2 border-dashed border-slate-200" />
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-1 max-w-sm">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
              title={activeDevice.name}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>

            <div
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse'
              }`}
            />

            <button
              type="button"
              onClick={onConnectClick}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : connectionState === 'connected'
                  ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-sm shadow-amber-500/25 ring-2 ring-amber-400/25'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/25 ring-2 ring-blue-500/20'
              }`}
            >
              {connectionState === 'authenticated' ? (
                <>
                  <BluetoothConnected className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </>
              ) : connectionState === 'connected' ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Connect BLE</span>
                </>
              )}
            </button>

            <div
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-400'
                  : 'bg-slate-200 border-t border-dashed border-slate-300'
              }`}
            />

            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="USB HID Keyboard"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => onLayoutChange('DE_QWERTZ')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                currentLayout === 'DE_QWERTZ'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              DE
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('US')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                currentLayout === 'US'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              US
            </button>
          </div>
        </div>
      </div>

      {/* Direct HID Type Bar */}
      <form
        onSubmit={handleDirectSend}
        className={`rounded-2xl border p-2.5 pl-4 shadow-xs flex items-center gap-3 transition-all ${
          connectionState === 'authenticated'
            ? 'border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/15'
            : 'border-slate-200/80 bg-slate-100/60'
        }`}
      >
        <Keyboard
          className={`w-4 h-4 shrink-0 ${
            connectionState === 'authenticated' ? 'text-blue-600' : 'text-slate-400'
          }`}
        />
        <input
          type="text"
          value={directText}
          onChange={(e) => setDirectText(e.target.value)}
          disabled={connectionState !== 'authenticated'}
          placeholder={
            connectionState === 'authenticated'
              ? 'Type text directly to target PC via USB HID...'
              : 'Connect & unlock ESP32-S3 to type text remotely...'
          }
          className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!directText.trim() || connectionState !== 'authenticated' || isSending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Type</span>
        </button>
      </form>

      {/* Shortcuts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {shortcuts.some((s) => s.is_favorite) ? 'Favorites' : 'Shortcuts'}
          </h2>

          <button
            type="button"
            onClick={onCreateShortcutClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Shortcut</span>
          </button>
        </div>

        {quickShortcuts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">No shortcuts yet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a shortcut to trigger USB HID macros over BLE.
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateShortcutClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Shortcut</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickShortcuts.map((sc) => (
              <ShortcutCard
                key={sc.id}
                shortcut={sc}
                onRun={onRunShortcut}
                onEdit={onEditShortcut}
                onDuplicate={onDuplicateShortcut}
                onDelete={onDeleteShortcut}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {executionLogs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Execution History</h3>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {executionLogs.length} {executionLogs.length === 1 ? 'run' : 'runs'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {executionLogs.slice(0, 8).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {log.shortcut_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          log.status === 'success'
                            ? 'text-emerald-600'
                            : log.status === 'canceled'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 tabular-nums text-right whitespace-nowrap">
                      {log.duration_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
