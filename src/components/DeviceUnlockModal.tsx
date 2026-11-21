import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Device } from '../types';
import { bleConnection } from '../services/bleConnection';

export interface UnlockSuccessInfo {
  deviceName: string;
  username: string;
  password: string;
  salt: string;
  firmwareVersion: string;
}

interface DeviceUnlockModalProps {
  device: Device | null;
  bleDeviceName?: string;
  onSuccess: (info: UnlockSuccessInfo) => void;
  onClose: () => void;
}

export const DeviceUnlockModal: React.FC<DeviceUnlockModalProps> = ({
  device,
  bleDeviceName,
  onSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState(device?.username || 'admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = device?.name || bleDeviceName || 'HydroGen';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await bleConnection.authenticateWithPassword(
        trimmedUser,
        password,
        device?.salt
      );
      if (res.success) {
        onSuccess({
          deviceName: res.deviceName || displayName,
          username: trimmedUser,
          password,
          salt: res.salt || device?.salt || '',
          firmwareVersion: res.firmwareVersion || device?.firmware_version || '1.2.0',
        });
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Hydrogen Forge"
              className="w-6 h-6 object-contain"
            />
            <Lock className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Unlock Vault · {displayName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label htmlFor="unlock-username" className="block font-medium text-slate-700 mb-1">
              Username
            </label>
            <input
              id="unlock-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label htmlFor="unlock-password" className="block font-medium text-slate-700 mb-1">
              Master Password
            </label>
            <div className="relative">
              <input
                id="unlock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Enter master password..."
                className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="mt-1.5 text-rose-600 text-[11px]">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !username.trim() || !password}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
            >
              {isVerifying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isVerifying ? 'Verifying...' : 'Unlock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
