import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Star,
  Play,
  Key,
  Clock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Send,
  Keyboard,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  CornerDownLeft,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  Shortcut,
  ShortcutAction,
  ConnectionState,
  KeyboardLayoutId,
  ExecutionLogEntry,
  ShortcutCategory,
} from '../types';

interface VaultViewProps {
  shortcuts: Shortcut[];
  activeCategoryFilter: ShortcutCategory | 'All' | 'Favorites';
  connectionState: ConnectionState;
  currentLayout: KeyboardLayoutId;
  executionLogs: ExecutionLogEntry[];
  onRunShortcut: (shortcut: Shortcut) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onDuplicateShortcut: (shortcut: Shortcut) => void;
  onDeleteShortcut: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCreateShortcutClick: () => void;
  onSendDirectText: (text: string) => Promise<void>;
  onConnectClick: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  shortcuts,
  activeCategoryFilter,
  connectionState,
  currentLayout,
  executionLogs,
  onRunShortcut,
  onEditShortcut,
  onDuplicateShortcut,
  onDeleteShortcut,
  onToggleFavorite,
  onCreateShortcutClick,
  onSendDirectText,
  onConnectClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShortcutId, setSelectedShortcutId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [directText, setDirectText] = useState('');
  const [isDirectSending, setIsDirectSending] = useState(false);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    return shortcuts
      .filter((s) => {
        if (activeCategoryFilter === 'Favorites') {
          if (!s.is_favorite) return false;
        } else if (activeCategoryFilter !== 'All') {
          if (s.category !== activeCategoryFilter) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const inName = s.name.toLowerCase().includes(q);
        const inDesc = s.description.toLowerCase().includes(q);
        const inActions = (s.actions || []).some(
          (a) =>
            a.configuration.text?.toLowerCase().includes(q) ||
            a.configuration.key?.toLowerCase().includes(q)
        );
        return inName || inDesc || inActions;
      })
      .sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [shortcuts, activeCategoryFilter, searchQuery]);

  // Selected shortcut
  const selectedShortcut = useMemo(() => {
    if (selectedShortcutId) {
      const found = shortcuts.find((s) => s.id === selectedShortcutId);
      if (found) return found;
    }
    return filteredShortcuts[0] || null;
  }, [shortcuts, selectedShortcutId, filteredShortcuts]);

  const togglePasswordReveal = (actionId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directText.trim() || connectionState !== 'authenticated') return;
    setIsDirectSending(true);
    const text = directText;
    setDirectText('');
    await onSendDirectText(text);
    setIsDirectSending(false);
  };

  const itemLogs = useMemo(() => {
    if (!selectedShortcut) return [];
    return executionLogs.filter((l) => l.shortcut_id === selectedShortcut.id).slice(0, 5);
  }, [selectedShortcut, executionLogs]);

  const renderIcon = (iconName?: string, className = 'w-4 h-4') => {
    const IconComp = iconName && (Icons as any)[iconName] ? (Icons as any)[iconName] : Key;
    return <IconComp className={className} />;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-[calc(100vh-3.5rem)] bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {/* COLUMN 1: VAULT MASTER LIST */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 shrink-0">
        {/* Search & New Item Header */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault items..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={onCreateShortcutClick}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="Add New Vault Item"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
            <span className="font-semibold text-slate-700">
              {activeCategoryFilter === 'All'
                ? 'All Items'
                : activeCategoryFilter === 'Favorites'
                ? 'Starred Items'
                : activeCategoryFilter}
            </span>
            <span className="font-mono tabular-nums">
              {filteredShortcuts.length} {filteredShortcuts.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500 text-xs">
              <Key className="w-6 h-6 mx-auto text-slate-300" />
              <p className="font-medium text-slate-700">No vault items found</p>
              <p className="text-[11px] text-slate-400">
                {shortcuts.length === 0
                  ? 'Your vault is currently empty.'
                  : 'Try adjusting your search or category filter.'}
              </p>
              {shortcuts.length === 0 && (
                <button
                  type="button"
                  onClick={onCreateShortcutClick}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Item</span>
                </button>
              )}
            </div>
          ) : (
            filteredShortcuts.map((sc) => {
              const isSelected = selectedShortcut?.id === sc.id;
              const firstAction = sc.actions?.[0];
              const previewText =
                firstAction?.action_type === 'TYPE_TEXT'
                  ? `Types: "${firstAction.configuration.text?.slice(0, 20)}..."`
                  : firstAction?.action_type === 'KEY_COMBINATION'
                  ? `Keys: ${firstAction.configuration.key || 'Combo'}`
                  : `${sc.actions?.length || 0} keystroke actions`;

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedShortcutId(sc.id)}
                  className={`group relative p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 text-slate-900 border-l-2 border-blue-600'
                      : 'hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-white border-blue-200 text-blue-600 shadow-xs'
                        : 'bg-white border-slate-200/90 text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {renderIcon(sc.icon, 'w-4 h-4')}
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {sc.name}
                      </h4>
                      {sc.is_favorite && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {sc.description || previewText}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <span>{sc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {sc.actions?.length || 0} {sc.actions?.length === 1 ? 'step' : 'steps'}
                      </span>
                    </div>
                  </div>

                  {/* Quick AutoFill / Type Button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunShortcut(sc);
                      }}
                      className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-[11px] font-semibold shadow-xs"
                      title="AutoFill / Inject into PC"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Fill</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: VAULT ITEM DETAIL INSPECTOR */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {selectedShortcut ? (
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Item Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                  {renderIcon(selectedShortcut.icon, 'w-6 h-6')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedShortcut.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{selectedShortcut.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] tabular-nums">
                      {selectedShortcut.actions?.length || 0} Keystroke Actions
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedShortcut.id)}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors ${
                    selectedShortcut.is_favorite
                      ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                  }`}
                  title={selectedShortcut.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${selectedShortcut.is_favorite ? 'fill-current' : ''}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => onEditShortcut(selectedShortcut)}
                  className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicateShortcut(selectedShortcut)}
                  className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteShortcut(selectedShortcut.id)}
                  className="h-8 inline-flex items-center justify-center w-8 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                  title="Delete Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Action Hero: Fill / Type into Target PC */}
            <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-blue-600" />
                  <span>Hardware Keystroke Injection</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Sends keystrokes over BLE to HydroGen &rarr; outputs over USB HID to target PC ({currentLayout === 'DE_QWERTZ' ? 'German QWERTZ' : 'US QWERTY'}).
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRunShortcut(selectedShortcut)}
                className={`h-9 inline-flex items-center justify-center gap-2 px-5 rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap ${
                  connectionState === 'authenticated'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : connectionState === 'connected'
                    ? 'bg-amber-500 hover:bg-amber-400 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {connectionState === 'authenticated'
                    ? 'AutoFill into PC'
                    : connectionState === 'connected'
                    ? 'Unlock to AutoFill'
                    : 'Connect Key to AutoFill'}
                </span>
                <CornerDownLeft className="w-3 h-3 opacity-60 ml-0.5" />
              </button>
            </div>

            {/* Description */}
            {selectedShortcut.description && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                  Notes
                </span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                  {selectedShortcut.description}
                </p>
              </div>
            )}

            {/* Keystrokes & Values Vault Sequence */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                  Keystroke Sequence
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedShortcut.actions?.length || 0} Steps
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {(selectedShortcut.actions || []).map((action, idx) => {
                  const isRevealed = revealedPasswords[action.id];
                  const rawText = action.configuration.text || '';
                  const isPasswordLike =
                    action.action_type === 'TYPE_TEXT' &&
                    (selectedShortcut.category === 'System' ||
                      selectedShortcut.name.toLowerCase().includes('password') ||
                      selectedShortcut.name.toLowerCase().includes('secret') ||
                      selectedShortcut.name.toLowerCase().includes('pin'));

                  return (
                    <div key={action.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {action.action_type === 'TYPE_TEXT'
                                ? 'Type Text'
                                : action.action_type === 'KEY_COMBINATION'
                                ? 'Key Combination'
                                : action.action_type === 'PRESS_KEY'
                                ? 'Press Key'
                                : action.action_type === 'DELAY'
                                ? 'Pause / Delay'
                                : 'Insert Parameter'}
                            </span>
                          </div>

                          <div className="text-slate-700 font-mono text-[11px] truncate">
                            {action.action_type === 'TYPE_TEXT' ? (
                              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                                {isPasswordLike && !isRevealed ? '••••••••••••' : rawText}
                              </span>
                            ) : action.action_type === 'KEY_COMBINATION' ||
                              action.action_type === 'PRESS_KEY' ? (
                              <div className="flex items-center gap-1">
                                {action.configuration.modifiers?.ctrl && (
                                  <kbd className="kbd-key bg-slate-100 border border-slate-300">
                                    Ctrl
                                  </kbd>
                                )}
                                {action.configuration.modifiers?.alt && (
                                  <kbd className="kbd-key bg-slate-100 border border-slate-300">
                                    Alt
                                  </kbd>
                                )}
                                {action.configuration.modifiers?.shift && (
                                  <kbd className="kbd-key bg-slate-100 border border-slate-300">
                                    Shift
                                  </kbd>
                                )}
                                {action.configuration.modifiers?.meta && (
                                  <kbd className="kbd-key bg-slate-100 border border-slate-300">
                                    Win
                                  </kbd>
                                )}
                                {action.configuration.key && (
                                  <kbd className="kbd-key bg-slate-100 border border-slate-300">
                                    {action.configuration.key}
                                  </kbd>
                                )}
                              </div>
                            ) : action.action_type === 'DELAY' ? (
                              <span className="text-slate-500">
                                {action.configuration.delay_ms || 100} ms
                              </span>
                            ) : (
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {`{${action.configuration.parameter_name}}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right action tools */}
                      {action.action_type === 'TYPE_TEXT' && rawText && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isPasswordLike && (
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(action.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title={isRevealed ? 'Hide' : 'Reveal'}
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyText(rawText, action.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="Copy to clipboard"
                          >
                            {copiedId === action.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Execution History */}
            {itemLogs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                  Recent Injections
                </span>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                  {itemLogs.map((log) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span className="capitalize font-medium text-slate-800">
                          {log.status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {log.duration_ms} ms · {log.layout_used}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Keystroke Streamer Bar */}
            <div className="pt-2">
              <form
                onSubmit={handleDirectSubmit}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs"
              >
                <Keyboard className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  disabled={connectionState !== 'authenticated'}
                  placeholder={
                    connectionState === 'authenticated'
                      ? 'Type custom text directly into target PC...'
                      : 'Connect & unlock HydroGen to stream keystrokes...'
                  }
                  className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!directText.trim() || connectionState !== 'authenticated' || isDirectSending}
                  className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold text-[11px] disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No item selected</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an item from the vault list to view its keystroke sequence and details.
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateShortcutClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Item</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
