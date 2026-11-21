import React from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Star,
  Folder,
  Code,
  AlignLeft,
  Terminal,
  PlayCircle,
  Boxes,
  Cpu,
  PlusCircle,
  Download,
  Settings,
  Bluetooth,
  BluetoothOff,
  Keyboard,
  CheckCircle2,
} from 'lucide-react';
import { ConnectionState, Device, KeyboardLayoutId, ShortcutCategory } from '../types';

export type VaultNavTab =
  | 'vault'
  | 'favorites'
  | 'category_Productivity'
  | 'category_Development'
  | 'category_Text Expander'
  | 'category_System'
  | 'category_Media'
  | 'category_Custom'
  | 'devices'
  | 'setup'
  | 'firmware'
  | 'settings';

interface VaultSidebarProps {
  activeNav: VaultNavTab;
  onNavChange: (nav: VaultNavTab) => void;
  connectionState: ConnectionState;
  activeDevice: Device | null;
  onConnectClick: () => void;
  currentLayout: KeyboardLayoutId;
  onLayoutChange: (layout: KeyboardLayoutId) => void;
  totalShortcutsCount: number;
  favoritesCount: number;
  categoryCounts: Record<ShortcutCategory, number>;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  activeNav,
  onNavChange,
  connectionState,
  activeDevice,
  onConnectClick,
  currentLayout,
  onLayoutChange,
  totalShortcutsCount,
  favoritesCount,
  categoryCounts,
}) => {
  const isConnected = connectionState === 'connected' || connectionState === 'authenticated';
  const isUnlocked = connectionState === 'authenticated';

  const categoryItems: { cat: ShortcutCategory; label: string; icon: React.ElementType }[] = [
    { cat: 'Productivity', label: 'Productivity', icon: Folder },
    { cat: 'Development', label: 'Development', icon: Code },
    { cat: 'Text Expander', label: 'Text Expander', icon: AlignLeft },
    { cat: 'System', label: 'System & Shell', icon: Terminal },
    { cat: 'Media', label: 'Media & Audio', icon: PlayCircle },
    { cat: 'Custom', label: 'Custom Macros', icon: Boxes },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-1.5">
              <span>HydroGen Vault</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">Hardware Keystroke Key</div>
          </div>
        </div>
      </div>

      {/* Hardware Key Security Token Status Card */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`inline-flex rounded-full h-2 w-2 ${
                    isUnlocked
                      ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                      : isConnected
                      ? 'bg-amber-400 shadow-xs shadow-amber-400/50'
                      : connectionState === 'connecting'
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
              </span>
              <span className="font-semibold text-slate-200 truncate text-[11px]">
                {activeDevice?.name || 'HydroGen Key'}
              </span>
            </div>

            <span className="font-mono text-[10px] text-slate-400 shrink-0 tabular-nums">
              {isUnlocked ? 'UNLOCKED' : isConnected ? 'LOCKED' : 'OFFLINE'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">
              {isUnlocked
                ? `Ready · v${activeDevice?.firmware_version || '1.2.0'}`
                : isConnected
                ? 'Master password required'
                : 'Connect via BLE to inject'}
            </span>
          </div>

          <button
            type="button"
            onClick={onConnectClick}
            disabled={connectionState === 'connecting'}
            className={`w-full h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${
              isUnlocked
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : isConnected
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isUnlocked ? (
              <>
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Lock Vault</span>
              </>
            ) : isConnected ? (
              <>
                <Unlock className="w-3 h-3" />
                <span>Unlock Vault</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <Bluetooth className="w-3 h-3 animate-pulse" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Bluetooth className="w-3 h-3" />
                <span>Connect Hardware Key</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-medium">
        {/* Section: Vault Items */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Vault Items
          </div>

          <button
            type="button"
            onClick={() => onNavChange('vault')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
              activeNav === 'vault'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5" />
              <span>All Items</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {totalShortcutsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavChange('favorites')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
              activeNav === 'favorites'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Favorites</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {favoritesCount}
            </span>
          </button>
        </div>

        {/* Section: Categories */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Categories
          </div>

          {categoryItems.map((item) => {
            const navId: VaultNavTab = `category_${item.cat}` as VaultNavTab;
            const count = categoryCounts[item.cat] || 0;
            const IconComp = item.icon;
            const isActive = activeNav === navId;

            return (
              <button
                key={item.cat}
                type="button"
                onClick={() => onNavChange(navId)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComp className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section: Hardware Key & Setup */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Hardware &amp; Security
          </div>

          <button
            type="button"
            onClick={() => onNavChange('devices')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
              activeNav === 'devices'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Hardware Keys</span>
          </button>

          <button
            type="button"
            onClick={() => onNavChange('setup')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
              activeNav === 'setup'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Provision New Key</span>
          </button>

          <button
            type="button"
            onClick={() => onNavChange('firmware')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
              activeNav === 'firmware'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Firmware Flasher</span>
          </button>

          <button
            type="button"
            onClick={() => onNavChange('settings')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
              activeNav === 'settings'
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Vault Preferences</span>
          </button>
        </div>
      </nav>

      {/* Target PC Scancode Layout Switcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium truncate">PC Layout</span>
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-800 border border-slate-700/80 rounded-md shrink-0">
            <button
              type="button"
              onClick={() => onLayoutChange('DE_QWERTZ')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                currentLayout === 'DE_QWERTZ'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="German QWERTZ layout"
            >
              DE
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('US')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                currentLayout === 'US'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="US QWERTY layout"
            >
              US
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
