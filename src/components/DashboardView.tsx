import React, { useState } from 'react';
import {
  Plus,
  Cpu,
  Usb,
  Bluetooth,
  BluetoothOff,
  Lock,
  CheckCircle2,
  AlertCircle,
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
  onOpenTroubleshoot?: () => void;
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
  onOpenTroubleshoot,
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
      {/* Section 1: Either two clear onboarding paths (Use Ready Device vs Prepare New Device) OR Active Device Status */}
      {!activeDevice ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Bluetooth className="w-4 h-4 text-blue-600" />
                <span>Use Ready Device</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Already flashed and provisioned your HydroGen? Connect wirelessly over Bluetooth to unlock and run macros.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onConnectClick}
                disabled={connectionState === 'connecting' || connectionState === 'authenticating'}
                className="h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${connectionState === 'connecting' ? 'animate-pulse' : ''}`} />
                <span>{connectionState === 'connecting' ? 'Connecting...' : 'Connect via Bluetooth'}</span>
              </button>
              {onOpenTroubleshoot && (
                <button
                  type="button"
                  onClick={onOpenTroubleshoot}
                  className="h-9 inline-flex items-center justify-center px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Troubleshoot
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Usb className="w-4 h-4 text-slate-600" />
                <span>Prepare New Device</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Setting up a blank ESP32-S3 board? Flash the firmware and write your credentials via USB-to-UART.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onOpenSetupClick}
                className="h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Usb className="w-3.5 h-3.5 text-slate-500" />
                <span>Flash & Setup via USB</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                connectionState === 'authenticated'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : connectionState === 'connected'
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {activeDevice.name}
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
                    : 'Disconnected'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">v{activeDevice.firmware_version}</span>
                <span aria-hidden="true">·</span>
                <span>{activeDevice.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {connectionState === 'disconnected' && onOpenTroubleshoot && (
              <button
                type="button"
                onClick={onOpenTroubleshoot}
                className="h-9 inline-flex items-center justify-center px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Troubleshoot Windows Bluetooth connection"
              >
                <span>Windows Help</span>
              </button>
            )}
            <button
              type="button"
              onClick={onConnectClick}
              disabled={connectionState === 'connecting' || connectionState === 'authenticating'}
              className={`h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60 ${
                connectionState === 'authenticated'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                  : connectionState === 'connected'
                  ? 'bg-amber-500 hover:bg-amber-400 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {connectionState === 'authenticated' ? (
                <>
                  <BluetoothOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </>
              ) : connectionState === 'connected' ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </>
              ) : connectionState === 'connecting' ? (
                <>
                  <Bluetooth className="w-3.5 h-3.5 animate-pulse" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Connect via Bluetooth</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Direct HID Type Bar with explicit Target Keyboard Layout Selector */}
      <form
        onSubmit={handleDirectSend}
        className={`rounded-2xl border p-2.5 pl-4 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-2.5 transition-all ${
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
              : 'Connect & unlock HydroGen to type text remotely...'
          }
          className="flex-1 min-w-44 h-9 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent disabled:cursor-not-allowed"
        />

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div
            className="h-9 inline-flex items-center gap-1.5 px-2 bg-slate-100 border border-slate-200/80 rounded-lg text-xs"
            title="Target PC Keyboard Scancode Layout: German QWERTZ or US QWERTY"
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              PC Layout
            </span>
            <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => onLayoutChange('DE_QWERTZ')}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                  currentLayout === 'DE_QWERTZ'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="German QWERTZ keyboard (supports ä, ö, ü, ß)"
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange('US')}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                  currentLayout === 'US'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="US QWERTY keyboard"
              >
                US
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!directText.trim() || connectionState !== 'authenticated' || isSending}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
        </div>
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
            className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
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
