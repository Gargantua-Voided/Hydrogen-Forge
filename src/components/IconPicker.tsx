import React from 'react';
import * as Icons from 'lucide-react';

export const SHORTCUT_GRADIENTS = [
  { id: 'blue', label: 'Ocean', value: 'from-blue-600 to-indigo-700' },
  { id: 'orange', label: 'Sunset', value: 'from-amber-500 to-orange-600' },
  { id: 'green', label: 'Emerald', value: 'from-emerald-500 to-teal-700' },
  { id: 'purple', label: 'Violet', value: 'from-purple-600 to-indigo-800' },
  { id: 'rose', label: 'Crimson', value: 'from-rose-500 to-red-700' },
  { id: 'pink', label: 'Pink', value: 'from-pink-500 to-rose-600' },
  { id: 'cyan', label: 'Cyan', value: 'from-cyan-500 to-blue-600' },
  { id: 'slate', label: 'Slate', value: 'from-slate-700 to-slate-900' },
];

export const POPULAR_ICONS = [
  'Terminal', 'Mail', 'GitBranch', 'Lock', 'Code', 'Play', 'Zap',
  'Globe', 'Cpu', 'Keyboard', 'FileText', 'Bookmark', 'Shield',
  'Settings', 'Sliders', 'Sparkles', 'Volume2', 'Database', 'Command',
  'Layers', 'Folder', 'Share2', 'Compass', 'Hash',
];

interface IconPickerProps {
  selectedIcon: string;
  selectedGradient: string;
  onSelectIcon: (iconName: string) => void;
  onSelectGradient: (gradient: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  selectedGradient,
  onSelectIcon,
  onSelectGradient,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">Color</label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SHORTCUT_GRADIENTS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGradient(g.value)}
              className={`h-8 rounded-xl bg-gradient-to-br ${g.value} transition-all ${
                selectedGradient === g.value ? 'ring-2 ring-blue-600 ring-offset-2' : 'opacity-90'
              }`}
              title={g.label}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">Icon</label>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
          {POPULAR_ICONS.map((iconName) => {
            const IconComp = (Icons as any)[iconName] || Icons.Zap;
            const isSelected = selectedIcon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onSelectIcon(iconName)}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
                title={iconName}
              >
                <IconComp className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
