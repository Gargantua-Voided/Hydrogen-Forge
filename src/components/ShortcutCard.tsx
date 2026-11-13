import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Play, Star, MoreVertical, Copy, Trash2, Edit3 } from 'lucide-react';
import { Shortcut } from '../types';

interface ShortcutCardProps {
  shortcut: Shortcut;
  onRun: (shortcut: Shortcut) => void;
  onEdit: (shortcut: Shortcut) => void;
  onDuplicate: (shortcut: Shortcut) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isRunning?: boolean;
}

export const ShortcutCard: React.FC<ShortcutCardProps> = ({
  shortcut,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  isRunning = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const IconComp = (Icons as any)[shortcut.icon] || Icons.Zap;
  const actionCount = shortcut.actions?.length || 0;

  return (
    <div
      className={`group relative rounded-2xl p-4 bg-gradient-to-br ${
        shortcut.color_gradient || 'from-blue-600 to-indigo-700'
      } text-white shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[136px] select-none ${
        isRunning ? 'ring-2 ring-blue-500 scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
          <IconComp className="w-4 h-4 stroke-[2.2]" />
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(shortcut.id);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              shortcut.is_favorite
                ? 'text-amber-300 bg-white/15'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={shortcut.is_favorite ? 'Remove favorite' : 'Favorite'}
          >
            <Star className={`w-3.5 h-3.5 ${shortcut.is_favorite ? 'fill-current' : ''}`} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-8 z-40 w-32 rounded-xl bg-white text-slate-800 shadow-lg border border-slate-200 py-1 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit(shortcut);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate(shortcut);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(shortcut.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 cursor-pointer" onClick={() => onEdit(shortcut)}>
        <h4 className="font-semibold text-sm leading-snug line-clamp-1 text-white">
          {shortcut.name}
        </h4>
      </div>

      <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
        <span>
          {actionCount} {actionCount === 1 ? 'action' : 'actions'}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRun(shortcut);
          }}
          disabled={isRunning}
          className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-transform"
          title="Run"
        >
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </button>
      </div>
    </div>
  );
};
