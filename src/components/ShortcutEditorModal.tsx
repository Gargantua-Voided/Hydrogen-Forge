import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Save,
  Clock,
  Keyboard as KeyboardIcon,
  Command,
  Type,
  Variable,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Shortcut,
  ShortcutAction,
  ShortcutParameter,
  ActionType,
  ShortcutCategory,
} from '../types';
import { IconPicker } from './IconPicker';
import { AVAILABLE_SPECIAL_KEYS } from '../services/keyboardLayouts';

interface ShortcutEditorModalProps {
  shortcut?: Shortcut | null;
  onSave: (
    shortcut: Shortcut,
    actions: Omit<ShortcutAction, 'id' | 'shortcut_id'>[],
    parameters: Omit<ShortcutParameter, 'id' | 'shortcut_id'>[]
  ) => void;
  onClose: () => void;
}

export const ShortcutEditorModal: React.FC<ShortcutEditorModalProps> = ({
  shortcut,
  onSave,
  onClose,
}) => {
  const isEditing = !!shortcut;

  const [name, setName] = useState(shortcut?.name || '');
  const [description, setDescription] = useState(shortcut?.description || '');
  const [category, setCategory] = useState<ShortcutCategory>(shortcut?.category || 'Productivity');
  const [icon, setIcon] = useState(shortcut?.icon || 'Terminal');
  const [colorGradient, setColorGradient] = useState(
    shortcut?.color_gradient || 'from-blue-600 to-indigo-700'
  );
  const [isFavorite, setIsFavorite] = useState(shortcut?.is_favorite ?? true);

  const [actions, setActions] = useState<Omit<ShortcutAction, 'id' | 'shortcut_id'>[]>(
    shortcut?.actions
      ? shortcut.actions.map((a) => ({
          action_type: a.action_type,
          action_order: a.action_order,
          configuration: { ...a.configuration },
        }))
      : [
          {
            action_type: 'TYPE_TEXT',
            action_order: 1,
            configuration: { text: '' },
          },
        ]
  );

  const [parameters, setParameters] = useState<Omit<ShortcutParameter, 'id' | 'shortcut_id'>[]>(
    shortcut?.parameters
      ? shortcut.parameters.map((p) => ({
          name: p.name,
          label: p.label || p.name,
          parameter_type: p.parameter_type,
          default_value: p.default_value,
        }))
      : []
  );

  const [activeTab, setActiveTab] = useState<'actions' | 'parameters' | 'appearance'>('actions');

  const handleMoveAction = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= actions.length) return;
    const updated = [...actions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updated.forEach((a, i) => (a.action_order = i + 1));
    setActions(updated);
  };

  const handleDuplicateAction = (index: number) => {
    const act = actions[index];
    const clone = {
      action_type: act.action_type,
      action_order: act.action_order + 1,
      configuration: JSON.parse(JSON.stringify(act.configuration)),
    };
    const updated = [...actions];
    updated.splice(index + 1, 0, clone);
    updated.forEach((a, i) => (a.action_order = i + 1));
    setActions(updated);
  };

  const handleDeleteAction = (index: number) => {
    const updated = actions.filter((_, i) => i !== index);
    updated.forEach((a, i) => (a.action_order = i + 1));
    setActions(updated);
  };

  const handleAddAction = (type: ActionType) => {
    let config: any = {};
    if (type === 'TYPE_TEXT') config = { text: '' };
    else if (type === 'PRESS_KEY') config = { key: 'Enter' };
    else if (type === 'KEY_COMBINATION') config = { key: 'c', modifiers: { ctrl: true } };
    else if (type === 'DELAY') config = { delay_ms: 500 };
    else if (type === 'TYPE_PARAMETER') config = { parameter_name: parameters[0]?.name || 'variable' };
    else if (type === 'KEY_RELEASE') config = {};

    setActions([
      ...actions,
      { action_type: type, action_order: actions.length + 1, configuration: config },
    ]);
  };

  const updateActionConfig = (index: number, updates: any) => {
    const updated = [...actions];
    updated[index].configuration = { ...updated[index].configuration, ...updates };
    setActions(updated);
  };

  const handleAddParameter = () => {
    const newName = `param_${parameters.length + 1}`;
    setParameters([
      ...parameters,
      { name: newName, label: `Variable ${parameters.length + 1}`, parameter_type: 'text', default_value: '' },
    ]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payloadShortcut: Shortcut = {
      id: shortcut?.id || `sc_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      color_gradient: colorGradient,
      is_favorite: isFavorite,
      created_at: shortcut?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(payloadShortcut, actions, parameters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colorGradient} text-white flex items-center justify-center`}>
              <KeyboardIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shortcut Name..."
              autoFocus
              className="text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-5 border-b border-slate-100 bg-slate-50/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Actions ({actions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parameters')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'parameters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Variable className="w-3.5 h-3.5" />
            <span>Variables ({parameters.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'appearance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Style</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                  Add an action block below.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {actions.map((act, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[11px] font-mono font-semibold text-slate-500 flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            {act.action_type === 'TYPE_TEXT' && <Type className="w-3.5 h-3.5 text-blue-600" />}
                            {act.action_type === 'PRESS_KEY' && <KeyboardIcon className="w-3.5 h-3.5 text-emerald-600" />}
                            {act.action_type === 'KEY_COMBINATION' && <Command className="w-3.5 h-3.5 text-purple-600" />}
                            {act.action_type === 'DELAY' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                            {act.action_type === 'TYPE_PARAMETER' && <Variable className="w-3.5 h-3.5 text-pink-600" />}
                            {act.action_type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveAction(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveAction(index, 'down')}
                            disabled={index === actions.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateAction(index)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(index)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {act.action_type === 'TYPE_TEXT' && (
                        <textarea
                          value={act.configuration.text ?? ''}
                          onChange={(e) => updateActionConfig(index, { text: e.target.value })}
                          placeholder="Text to type..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      )}

                      {act.action_type === 'PRESS_KEY' && (
                        <select
                          value={act.configuration.key || 'Enter'}
                          onChange={(e) => updateActionConfig(index, { key: e.target.value })}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900"
                        >
                          {AVAILABLE_SPECIAL_KEYS.map((k) => (
                            <option key={k.key} value={k.key}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {act.action_type === 'KEY_COMBINATION' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {['ctrl', 'alt', 'shift', 'meta', 'altGr'].map((mod) => {
                            const isChecked = !!(act.configuration.modifiers as any)?.[mod];
                            return (
                              <button
                                key={mod}
                                type="button"
                                onClick={() => {
                                  const mods = { ...(act.configuration.modifiers || {}) };
                                  (mods as any)[mod] = !isChecked;
                                  updateActionConfig(index, { modifiers: mods });
                                }}
                                className={`px-2 py-1 text-xs font-mono rounded-md border transition-colors ${
                                  isChecked
                                    ? 'bg-purple-600 text-white border-purple-600 font-semibold'
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}
                              >
                                {mod === 'meta' ? 'Win' : mod === 'altGr' ? 'AltGr' : mod.toUpperCase()}
                              </button>
                            );
                          })}
                          <span className="text-xs text-slate-400 mx-1">+</span>
                          <input
                            type="text"
                            maxLength={10}
                            value={act.configuration.key || 'c'}
                            onChange={(e) => updateActionConfig(index, { key: e.target.value })}
                            className="w-16 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 bg-white text-center"
                          />
                        </div>
                      )}

                      {act.action_type === 'DELAY' && (
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="50"
                            max="5000"
                            step="50"
                            value={act.configuration.delay_ms || 500}
                            onChange={(e) => updateActionConfig(index, { delay_ms: Number(e.target.value) })}
                            className="flex-1 accent-amber-500"
                          />
                          <span className="text-xs font-mono font-semibold text-slate-700 w-16 text-right tabular-nums">
                            {act.configuration.delay_ms || 500} ms
                          </span>
                        </div>
                      )}

                      {act.action_type === 'TYPE_PARAMETER' && (
                        <div>
                          {parameters.length > 0 ? (
                            <select
                              value={act.configuration.parameter_name || parameters[0].name}
                              onChange={(e) => updateActionConfig(index, { parameter_name: e.target.value })}
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900"
                            >
                              {parameters.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.label || p.name} ({`{${p.name}}`})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-amber-600">
                              Add a variable in the Variables tab first.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddAction('TYPE_TEXT')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <Type className="w-3.5 h-3.5 text-blue-600" />
                  <span>Type Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('PRESS_KEY')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <KeyboardIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Press Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('KEY_COMBINATION')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <Command className="w-3.5 h-3.5 text-purple-600" />
                  <span>Combo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('DELAY')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Delay</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('TYPE_PARAMETER')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <Variable className="w-3.5 h-3.5 text-pink-600" />
                  <span>Variable</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'parameters' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variable</span>
                </button>
              </div>

              {parameters.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                  No input variables defined.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {parameters.map((param, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-blue-600">
                          {`{${param.name}}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setParameters(parameters.filter((_, i) => i !== pIdx))}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <input
                          type="text"
                          value={param.label || ''}
                          onChange={(e) => {
                            const updated = [...parameters];
                            updated[pIdx].label = e.target.value;
                            setParameters(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => {
                            const updated = [...parameters];
                            updated[pIdx].name = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                            setParameters(updated);
                          }}
                          className="px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 bg-white"
                          placeholder="key_name"
                        />
                        <input
                          type="text"
                          value={param.default_value}
                          onChange={(e) => {
                            const updated = [...parameters];
                            updated[pIdx].default_value = e.target.value;
                            setParameters(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          placeholder="Default value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ShortcutCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
                  >
                    <option value="Productivity">Productivity</option>
                    <option value="Development">Development</option>
                    <option value="Text Expander">Text Expander</option>
                    <option value="System">System</option>
                    <option value="Media">Media</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional note"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Pin to Dashboard Favorites</span>
              </label>

              <IconPicker
                selectedIcon={icon}
                selectedGradient={colorGradient}
                onSelectIcon={setIcon}
                onSelectGradient={setColorGradient}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Save' : 'Create'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
