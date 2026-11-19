/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ShortcutsView } from './components/ShortcutsView';
import { DevicesView } from './components/DevicesView';
import { SetupWizard } from './components/SetupWizard';
import { FirmwareView } from './components/FirmwareView';
import { SettingsView } from './components/SettingsView';
import { ShortcutEditorModal } from './components/ShortcutEditorModal';
import { ParameterPromptModal } from './components/ParameterPromptModal';
import { DeviceUnlockModal } from './components/DeviceUnlockModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { db } from './services/db';
import { bleConnection } from './services/bleConnection';
import {
  Shortcut,
  ShortcutAction,
  ShortcutParameter,
  Device,
  ExecutionLogEntry,
  ConnectionState,
  KeyboardLayoutId,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

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

  const handleConnectDevice = async (targetDev?: Device) => {
    setStatusError(null);

    if (connectionState === 'authenticated') {
      bleConnection.disconnect();
      setConnectionState('disconnected');
      return;
    }

    if (connectionState === 'connected') {
      if (activeDevice) setShowUnlockModal(true);
      return;
    }

    const dev = targetDev || activeDevice || devices[0];
    if (!dev) {
      setActiveTab('setup');
      return;
    }

    const res = await bleConnection.connect(dev);
    if (res.success) {
      setActiveDevice(dev);
      setShowUnlockModal(true);
    } else {
      setStatusError(res.message);
    }
  };

  const handleRunShortcut = async (shortcut: Shortcut) => {
    setStatusError(null);
    if (connectionState !== 'authenticated') {
      setStatusError('Connect and authenticate your HydroGen via BLE before running macros.');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectionState={connectionState}
        activeDevice={activeDevice}
        onConnectClick={() => handleConnectDevice()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {statusError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 flex items-center justify-between">
            <span>{statusError}</span>
            <button
              type="button"
              onClick={() => setStatusError(null)}
              className="font-semibold hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            shortcuts={shortcuts}
            activeDevice={activeDevice}
            connectionState={connectionState}
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            executionLogs={executionLogs}
            onRunShortcut={handleRunShortcut}
            onEditShortcut={(sc) => setEditingShortcut(sc)}
            onDuplicateShortcut={handleDuplicateShortcut}
            onDeleteShortcut={handleDeleteShortcut}
            onToggleFavorite={handleToggleFavorite}
            onSendDirectText={handleSendDirectText}
            onConnectClick={() => handleConnectDevice()}
            onCreateShortcutClick={() => setEditingShortcut(null)}
            onOpenSetupClick={() => setActiveTab('setup')}
          />
        )}

        {activeTab === 'shortcuts' && (
          <ShortcutsView
            shortcuts={shortcuts}
            onRunShortcut={handleRunShortcut}
            onEditShortcut={(sc) => setEditingShortcut(sc)}
            onDuplicateShortcut={handleDuplicateShortcut}
            onDeleteShortcut={handleDeleteShortcut}
            onToggleFavorite={handleToggleFavorite}
            onCreateShortcutClick={() => setEditingShortcut(null)}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesView
            devices={devices}
            activeDevice={activeDevice}
            connectionState={connectionState}
            connectionMode="ble"
            onConnect={(dev) => handleConnectDevice(dev)}
            onDisconnect={() => {
              bleConnection.disconnect();
              setConnectionState('disconnected');
            }}
            onRefreshDevices={refreshData}
            onOpenSetupWizard={() => setActiveTab('setup')}
            onOpenFlasher={(dev) => {
              if (dev) setActiveDevice(dev);
              setActiveTab('firmware');
            }}
          />
        )}

        {activeTab === 'setup' && (
          <SetupWizard
            onComplete={(newDev) => {
              refreshData();
              setActiveDevice(newDev);
              setActiveTab('dashboard');
              handleConnectDevice(newDev);
            }}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'firmware' && <FirmwareView onConnectClick={() => handleConnectDevice()} />}

        {activeTab === 'settings' && (
          <SettingsView
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            onRefreshAll={refreshData}
          />
        )}
      </main>

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

      {showUnlockModal && activeDevice && (
        <DeviceUnlockModal
          device={activeDevice}
          onSuccess={() => setConnectionState('authenticated')}
          onClose={() => setShowUnlockModal(false)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
