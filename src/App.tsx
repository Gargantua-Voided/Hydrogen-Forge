/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  X,
  Shield,
  Lock,
  Unlock,
  Bluetooth,
  Keyboard,
} from 'lucide-react';
import { VaultSidebar, VaultNavTab } from './components/VaultSidebar';
import { VaultView } from './components/VaultView';
import { DevicesView } from './components/DevicesView';
import { SetupWizard } from './components/SetupWizard';
import { FirmwareView } from './components/FirmwareView';
import { SettingsView } from './components/SettingsView';
import { ShortcutEditorModal } from './components/ShortcutEditorModal';
import { ParameterPromptModal } from './components/ParameterPromptModal';
import { DeviceUnlockModal, UnlockSuccessInfo } from './components/DeviceUnlockModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { db } from './services/db';
import { bleConnection } from './services/bleConnection';
import { deriveKeyFromPassword, encryptData, getRandomHex } from './services/crypto';
import {
  Shortcut,
  ShortcutAction,
  ShortcutParameter,
  Device,
  ExecutionLogEntry,
  ConnectionState,
  KeyboardLayoutId,
  ShortcutCategory,
} from './types';

export default function App() {
  const [activeNav, setActiveNav] = useState<VaultNavTab>('vault');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentLayout, setCurrentLayout] = useState<KeyboardLayoutId>('DE_QWERTZ');
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null | undefined>(undefined);
  const [parameterPromptShortcut, setParameterPromptShortcut] = useState<Shortcut | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockTargetDevice, setUnlockTargetDevice] = useState<Device | null>(null);
  const [pendingBleName, setPendingBleName] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    db.init().then(() => {
      refreshData();
      const savedLayout = db.getSetting('default_keyboard_layout', 'DE_QWERTZ') as KeyboardLayoutId;
      setCurrentLayout(savedLayout);
    });

    const unsubConn = bleConnection.onConnectionChange((nextState) => {
      setConnectionState(nextState);
    });

    return () => unsubConn();
  }, []);

  const refreshData = () => {
    const loadedShortcuts = db.getShortcuts();
    const loadedDevices = db.getDevices();
    const loadedLogs = db.getExecutionLogs();

    setShortcuts(loadedShortcuts);
    setDevices(loadedDevices);
    setExecutionLogs(loadedLogs);

    if (loadedDevices.length > 0 && !activeDevice) {
      setActiveDevice(loadedDevices[0]);
    }
  };

  const handleLayoutChange = (layout: KeyboardLayoutId) => {
    setCurrentLayout(layout);
    db.setSetting('default_keyboard_layout', layout);
    bleConnection.updateLayout(layout);
  };

  const handleConnectDevice = async (targetDev?: Device, forceBlePicker = false) => {
    setStatusError(null);

    if (connectionState === 'connecting' || connectionState === 'authenticating') {
      return;
    }

    if (!forceBlePicker && connectionState === 'authenticated') {
      bleConnection.disconnect();
      setConnectionState('disconnected');
      return;
    }

    if (!forceBlePicker && connectionState === 'connected') {
      setUnlockTargetDevice(targetDev || activeDevice || devices[0] || null);
      setPendingBleName(bleConnection.getConnectedBleInfo()?.name);
      setShowUnlockModal(true);
      return;
    }

    if (connectionState !== 'disconnected') {
      bleConnection.disconnect();
    }

    const dev = forceBlePicker ? undefined : targetDev || activeDevice || devices[0];
    const res = await bleConnection.connect(dev);
    if (res.success) {
      if (dev) {
        setActiveDevice(dev);
        setUnlockTargetDevice(dev);
      } else {
        setUnlockTargetDevice(null);
      }
      setPendingBleName(res.deviceName || 'HydroGen');
      setShowUnlockModal(true);
    } else {
      setStatusError(res.message);
    }
  };

  const handleUnlockSuccess = async (info: UnlockSuccessInfo) => {
    const now = new Date().toISOString();
    let encryptedCreds = unlockTargetDevice?.encrypted_credentials || '';

    if (info.salt) {
      try {
        const masterKey = await deriveKeyFromPassword(info.password, info.salt, 'encrypt');
        encryptedCreds = await encryptData(
          JSON.stringify({ username: info.username, password: info.password, createdAt: now }),
          masterKey
        );
      } catch {
        // Keep existing encrypted credentials if local encryption fails
      }
    }

    const existingDevices = db.getDevices();
    const matched =
      unlockTargetDevice ||
      existingDevices.find(
        (d) =>
          (info.salt && d.salt === info.salt && d.username === info.username) ||
          (d.name === info.deviceName && d.username === info.username)
      ) ||
      null;

    const savedDevice: Device = matched
      ? {
          ...matched,
          name: info.deviceName || matched.name,
          username: info.username,
          salt: info.salt || matched.salt,
          encrypted_credentials: encryptedCreds || matched.encrypted_credentials,
          firmware_version: info.firmwareVersion || matched.firmware_version,
          last_connected_at: now,
          updated_at: now,
        }
      : {
          id: `dev_${Date.now()}`,
          name: info.deviceName || 'HydroGen',
          username: info.username,
          encrypted_credentials: encryptedCreds,
          salt: info.salt,
          firmware_version: info.firmwareVersion || '1.2.0',
          device_identifier:
            bleConnection.getConnectedBleInfo()?.id || getRandomHex(6).toUpperCase(),
          created_at: now,
          updated_at: now,
          last_connected_at: now,
          preferred_layout: currentLayout,
        };

    db.saveDevice(savedDevice);
    setActiveDevice(savedDevice);
    refreshData();
    setConnectionState('authenticated');
  };

  const handleRunShortcut = async (shortcut: Shortcut) => {
    setStatusError(null);
    if (connectionState !== 'authenticated') {
      setStatusError('Unlock your HydroGen hardware key via BLE to inject keystrokes.');
      return;
    }

    if (shortcut.parameters && shortcut.parameters.length > 0) {
      setParameterPromptShortcut(shortcut);
      return;
    }
    await executeShortcutWithVariables(shortcut, {});
  };

  const executeShortcutWithVariables = async (
    shortcut: Shortcut,
    variables: Record<string, string>
  ) => {
    const actions = shortcut.actions || [];
    const res = await bleConnection.executeMacro(actions, variables, currentLayout);

    if (!res.success) {
      setStatusError(res.message);
    }

    db.addExecutionLog({
      shortcut_id: shortcut.id,
      shortcut_name: shortcut.name,
      status: res.success ? 'success' : 'failed',
      duration_ms: res.durationMs,
      details: res.message,
      layout_used: currentLayout,
    });

    setExecutionLogs(db.getExecutionLogs());
  };

  const handleSendDirectText = async (text: string) => {
    setStatusError(null);
    const directAction: ShortcutAction = {
      id: `direct_${Date.now()}`,
      shortcut_id: 'direct_send',
      action_type: 'TYPE_TEXT',
      action_order: 1,
      configuration: { text },
    };

    const res = await bleConnection.executeMacro([directAction], {}, currentLayout);
    if (!res.success) {
      setStatusError(res.message);
    }

    db.addExecutionLog({
      shortcut_id: 'direct_send',
      shortcut_name: `Type: ${text.slice(0, 24)}${text.length > 24 ? '…' : ''}`,
      status: res.success ? 'success' : 'failed',
      duration_ms: res.durationMs,
      details: res.message,
      layout_used: currentLayout,
    });
    setExecutionLogs(db.getExecutionLogs());
  };

  const handleSaveShortcut = (
    sc: Shortcut,
    actions: Omit<ShortcutAction, 'id' | 'shortcut_id'>[],
    parameters: Omit<ShortcutParameter, 'id' | 'shortcut_id'>[]
  ) => {
    db.saveShortcut(sc, actions, parameters);
    refreshData();
  };

  const handleDuplicateShortcut = (sc: Shortcut) => {
    const clone: Shortcut = {
      ...sc,
      id: `sc_${Date.now()}`,
      name: `${sc.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const actions = (sc.actions || []).map((a) => ({
      action_type: a.action_type,
      action_order: a.action_order,
      configuration: a.configuration,
    }));
    const parameters = (sc.parameters || []).map((p) => ({
      name: p.name,
      label: p.label,
      parameter_type: p.parameter_type,
      default_value: p.default_value,
    }));

    db.saveShortcut(clone, actions, parameters);
    refreshData();
  };

  const handleDeleteShortcut = (id: string) => {
    db.deleteShortcut(id);
    refreshData();
  };

  const handleToggleFavorite = (id: string) => {
    db.toggleFavorite(id);
    refreshData();
  };

  // Category counts computation for password manager sidebar
  const categoryCounts = useMemo(() => {
    const counts: Record<ShortcutCategory, number> = {
      Productivity: 0,
      Development: 0,
      'Text Expander': 0,
      System: 0,
      Media: 0,
      Custom: 0,
      All: shortcuts.length,
    };
    shortcuts.forEach((s) => {
      if (counts[s.category] !== undefined) {
        counts[s.category]++;
      }
    });
    return counts;
  }, [shortcuts]);

  const favoritesCount = useMemo(() => {
    return shortcuts.filter((s) => s.is_favorite).length;
  }, [shortcuts]);

  const activeCategoryFilter = useMemo(() => {
    if (activeNav === 'favorites') return 'Favorites';
    if (activeNav.startsWith('category_')) {
      return activeNav.replace('category_', '') as ShortcutCategory;
    }
    return 'All';
  }, [activeNav]);

  const isVaultView =
    activeNav === 'vault' || activeNav === 'favorites' || activeNav.startsWith('category_');

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Mobile Top App Bar */}
      <div className="md:hidden h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-40 text-white">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm tracking-tight">HydroGen Vault</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleConnectDevice()}
          className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border ${
            connectionState === 'authenticated'
              ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
              : connectionState === 'connected'
              ? 'bg-amber-950/60 border-amber-600 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {connectionState === 'authenticated' ? (
            <>
              <Unlock className="w-3 h-3 text-emerald-400" />
              <span>Unlocked</span>
            </>
          ) : connectionState === 'connected' ? (
            <>
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Locked</span>
            </>
          ) : (
            <>
              <Bluetooth className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Responsive Vault Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto transition-transform duration-200 md:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <VaultSidebar
            activeNav={activeNav}
            onNavChange={(nav) => {
              setActiveNav(nav);
              setMobileSidebarOpen(false);
            }}
            connectionState={connectionState}
            activeDevice={activeDevice}
            onConnectClick={() => handleConnectDevice()}
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            totalShortcutsCount={shortcuts.length}
            favoritesCount={favoritesCount}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
          {statusError && (
            <div className="m-3 mb-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0">
              <span className="font-medium">{statusError}</span>
              <div className="flex items-center gap-2.5 ml-auto shrink-0">
                {statusError.includes('embedded preview frame') && (
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-800 underline hover:text-rose-950"
                  >
                    Open in New Tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setStatusError(null)}
                  className="font-semibold text-rose-600 hover:text-rose-900 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col">
            {isVaultView && (
              <VaultView
                shortcuts={shortcuts}
                activeCategoryFilter={activeCategoryFilter}
                connectionState={connectionState}
                currentLayout={currentLayout}
                executionLogs={executionLogs}
                onRunShortcut={handleRunShortcut}
                onEditShortcut={(sc) => setEditingShortcut(sc)}
                onDuplicateShortcut={handleDuplicateShortcut}
                onDeleteShortcut={handleDeleteShortcut}
                onToggleFavorite={handleToggleFavorite}
                onCreateShortcutClick={() => setEditingShortcut(null)}
                onSendDirectText={handleSendDirectText}
                onConnectClick={() => handleConnectDevice()}
              />
            )}

            {activeNav === 'devices' && (
              <div className="max-w-4xl w-full mx-auto py-2">
                <DevicesView
                  devices={devices}
                  activeDevice={activeDevice}
                  connectionState={connectionState}
                  connectionMode="ble"
                  onConnect={(dev) => handleConnectDevice(dev)}
                  onConnectNewBle={() => handleConnectDevice(undefined, true)}
                  onDisconnect={() => {
                    bleConnection.disconnect();
                    setConnectionState('disconnected');
                  }}
                  onRefreshDevices={refreshData}
                  onOpenSetupWizard={() => setActiveNav('setup')}
                  onOpenFlasher={(dev) => {
                    if (dev) setActiveDevice(dev);
                    setActiveNav('firmware');
                  }}
                />
              </div>
            )}

            {activeNav === 'setup' && (
              <div className="max-w-xl w-full mx-auto py-2">
                <SetupWizard
                  onComplete={(newDev) => {
                    refreshData();
                    setActiveDevice(newDev);
                    setActiveNav('vault');
                    handleConnectDevice(newDev);
                  }}
                  onCancel={() => setActiveNav('vault')}
                />
              </div>
            )}

            {activeNav === 'firmware' && (
              <div className="max-w-2xl w-full mx-auto py-2">
                <FirmwareView onConnectClick={() => handleConnectDevice()} />
              </div>
            )}

            {activeNav === 'settings' && (
              <div className="max-w-2xl w-full mx-auto py-2">
                <SettingsView
                  currentLayout={currentLayout}
                  onLayoutChange={handleLayoutChange}
                  onRefreshAll={refreshData}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {editingShortcut !== undefined && (
        <ShortcutEditorModal
          shortcut={editingShortcut}
          onSave={handleSaveShortcut}
          onClose={() => setEditingShortcut(undefined)}
        />
      )}

      {parameterPromptShortcut && (
        <ParameterPromptModal
          shortcut={parameterPromptShortcut}
          onExecute={(variables) => {
            executeShortcutWithVariables(parameterPromptShortcut, variables);
            setParameterPromptShortcut(null);
          }}
          onClose={() => setParameterPromptShortcut(null)}
        />
      )}

      {showUnlockModal && (
        <DeviceUnlockModal
          device={unlockTargetDevice}
          bleDeviceName={pendingBleName}
          onSuccess={handleUnlockSuccess}
          onClose={() => setShowUnlockModal(false)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
