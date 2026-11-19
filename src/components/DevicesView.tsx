import React, { useState } from 'react';
import {
  Plus,
  Cpu,
  Bluetooth,
  BluetoothOff,
  Trash2,
  Edit3,
  Download,
} from 'lucide-react';
import { Device, ConnectionState, ConnectionMode } from '../types';
import { db } from '../services/db';

interface DevicesViewProps {
  devices: Device[];
  activeDevice: Device | null;
  connectionState: ConnectionState;
  connectionMode: ConnectionMode;
  onConnect: (device: Device) => void;
  onConnectNewBle: () => void;
  onDisconnect: () => void;
  onRefreshDevices: () => void;
  onOpenSetupWizard: () => void;
  onOpenFlasher: (device?: Device) => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  activeDevice,
  connectionState,
  onConnect,
  onConnectNewBle,
  onDisconnect,
  onRefreshDevices,
  onOpenSetupWizard,
  onOpenFlasher,
}) => {
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newName, setNewName] = useState('');

  const handleStartRename = (device: Device) => {
    setEditingDevice(device);
    setNewName(device.name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice || !newName.trim()) return;
    db.saveDevice({ ...editingDevice, name: newName.trim() });
    setEditingDevice(null);
    onRefreshDevices();
  };

  const handleDeleteDevice = (id: string) => {
    if (confirm('Remove this device registration?')) {
      if (activeDevice?.id === id) onDisconnect();
      db.deleteDevice(id);
      onRefreshDevices();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Devices</h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onConnectNewBle}
            className="h-9 inline-flex items-center justify-center gap-2 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Connect via Bluetooth</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenFlasher(undefined)}
            className="h-9 inline-flex items-center justify-center gap-2 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Flash Firmware</span>
          </button>

          <button
            type="button"
            onClick={onOpenSetupWizard}
            className="h-9 inline-flex items-center justify-center gap-2 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Prepare New Board</span>
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Bluetooth className="w-4 h-4 text-blue-600" />
                <span>Use Ready Device</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Already flashed and provisioned your ESP32-S3? Pair wirelessly over Bluetooth to start executing macros.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onConnectNewBle}
                className="h-9 inline-flex items-center justify-center gap-2 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Connect via Bluetooth</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Download className="w-4 h-4 text-slate-600" />
                <span>Prepare New Device</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                First time setting up a board? Flash firmware and write NVS credentials over USB-to-UART.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onOpenSetupWizard}
                className="h-9 inline-flex items-center justify-center gap-2 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Flash & Setup via USB</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isActive = activeDevice?.id === device.id;
            return (
              <div
                key={device.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
                  isActive ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isActive && connectionState === 'authenticated'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-blue-50 border-blue-200 text-blue-600'
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{device.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span>{device.username}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">v{device.firmware_version}</span>
                          <span aria-hidden="true">·</span>
                          <span>{device.preferred_layout === 'DE_QWERTZ' ? 'DE' : 'US'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartRename(device)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(device.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onOpenFlasher(device)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Reflash</span>
                  </button>

                  {isActive && connectionState === 'authenticated' ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                      <BluetoothOff className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConnect(device)}
                      disabled={connectionState === 'connecting' || connectionState === 'authenticating'}
                      className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>{connectionState === 'connecting' ? 'Connecting...' : 'Connect via Bluetooth'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Rename Device</h3>
            <form onSubmit={handleSaveRename} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
