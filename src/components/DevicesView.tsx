import React, { useState } from 'react';
import {
  Plus,
  Wifi,
  WifiOff,
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenFlasher(undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Flash Firmware</span>
          </button>

          <button
            type="button"
            onClick={onOpenSetupWizard}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-300 bg-white rounded-2xl text-slate-500 text-xs space-y-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Hydrogen Forge"
            className="w-12 h-12 mx-auto object-contain opacity-85"
          />
          <p className="font-semibold text-slate-700">No devices configured</p>
          <button
            type="button"
            onClick={onOpenSetupWizard}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Start Setup Wizard
          </button>
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
                      <img
                        src={`${import.meta.env.BASE_URL}logo.png`}
                        alt="Hydrogen Forge"
                        className="w-9 h-9 object-contain shrink-0"
                      />
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConnect(device)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Connect</span>
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
