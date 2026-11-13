import React, { useState, useMemo } from 'react';
import { Plus, Search, Zap } from 'lucide-react';
import { Shortcut, ShortcutCategory } from '../types';
import { ShortcutCard } from './ShortcutCard';

interface ShortcutsViewProps {
  shortcuts: Shortcut[];
  onRunShortcut: (shortcut: Shortcut) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onDuplicateShortcut: (shortcut: Shortcut) => void;
  onDeleteShortcut: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCreateShortcutClick: () => void;
}

const CATEGORIES: ShortcutCategory[] = [
  'All',
  'Productivity',
  'Development',
  'Text Expander',
  'System',
  'Media',
  'Custom',
];

export const ShortcutsView: React.FC<ShortcutsViewProps> = ({
  shortcuts,
  onRunShortcut,
  onEditShortcut,
  onDuplicateShortcut,
  onDeleteShortcut,
  onToggleFavorite,
  onCreateShortcutClick,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = useMemo(() => {
    return shortcuts
      .filter((s) => {
        const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
        const matchesSearch =
          searchQuery === '' ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [shortcuts, selectedCategory, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Shortcuts</h2>

        <button
          type="button"
          onClick={onCreateShortcutClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Shortcut</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative md:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredShortcuts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-300 bg-white rounded-2xl text-slate-500 text-xs space-y-3">
          <Zap className="w-6 h-6 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">
            {shortcuts.length === 0 ? 'No shortcuts yet' : 'No matching shortcuts'}
          </p>
          {shortcuts.length === 0 && (
            <button
              type="button"
              onClick={onCreateShortcutClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Shortcut</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredShortcuts.map((sc) => (
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
  );
};
