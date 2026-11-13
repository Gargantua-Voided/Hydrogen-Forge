import React from 'react';
import { Wifi, WifiOff, Lock, CheckCircle2 } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ConnectionState, Device } from '../types';

export type NavTab = 'dashboard' | 'shortcuts' | 'devices' | 'setup' | 'firmware' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  connectionState: ConnectionState;
  activeDevice: Device | null;
  onConnectClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  connectionState,
  activeDevice,
  onConnectClick,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'devices', label: 'Devices' },
    { id: 'setup', label: 'Setup' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2 text-slate-900 font-bold tracking-tight text-sm whitespace-nowrap shrink-0"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Hydrogen Forge"
            className="w-8 h-8 object-contain"
          />
          <span>Hydrogen Forge</span>
        </button>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id || (item.id === 'devices' && activeTab === 'firmware');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onConnectClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap border ${
              connectionState === 'authenticated'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : connectionState === 'connected'
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : connectionState === 'connecting' || connectionState === 'authenticating'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
            }`}
          >
            {connectionState === 'authenticated' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeDevice?.name || 'Connected'}</span>
              </>
            ) : connectionState === 'connected' ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Unlock</span>
              </>
            ) : connectionState === 'connecting' || connectionState === 'authenticating' ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>Connecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Connect BLE</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex md:hidden items-center justify-around px-2 py-1.5 border-t border-slate-100 bg-slate-50/70 text-xs overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.id || (item.id === 'devices' && activeTab === 'firmware');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
                isActive ? 'bg-white font-semibold text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
