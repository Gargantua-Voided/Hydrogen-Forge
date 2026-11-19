import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Usb,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Bluetooth,
  Keyboard,
  FileUp,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  getRandomHex,
  computePasswordVerifier,
  deriveKeyFromPassword,
  encryptData,
} from '../services/crypto';
import { firmwareFlasher, FlashProgress, BinaryImagePart } from '../services/firmwareFlasher';
import { serialProvisioning } from '../services/serialConnection';
import { db } from '../services/db';
import { Device, KeyboardLayoutId, FirmwareManifest } from '../types';

interface SetupWizardProps {
  onComplete: (device: Device) => void;
  onCancel: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);
  const [isWebBleSupported, setIsWebBleSupported] = useState(false);

  // Step 2: Real Serial Ping
  const [serialConnected, setSerialConnected] = useState(false);
  const [detectedHardware, setDetectedHardware] = useState<string>('');
  const [serialError, setSerialError] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Step 3: Device Credentials
  const [deviceName, setDeviceName] = useState('HydroGen');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [layout, setLayout] = useState<KeyboardLayoutId>('DE_QWERTZ');

  // Step 4: Real Firmware Flashing
  const [manifest, setManifest] = useState<FirmwareManifest | null>(null);
  const [customFirmwareFile, setCustomFirmwareFile] = useState<File | null>(null);
  const [customBootloaderFile, setCustomBootloaderFile] = useState<File | null>(null);
  const [customPartitionsFile, setCustomPartitionsFile] = useState<File | null>(null);
  const [eraseAll, setEraseAll] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress>({
    stage: 'idle',
    percentage: 0,
    logMessage: 'Ready',
  });
  const [flashLogs, setFlashLogs] = useState<string[]>([]);
  const [flashCompleted, setFlashCompleted] = useState(false);

  // Step 5: Real Provisioning
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);

  useEffect(() => {
    setIsWebSerialSupported(typeof navigator !== 'undefined' && 'serial' in navigator);
    setIsWebBleSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
    firmwareFlasher.loadManifest().then((m) => setManifest(m));
  }, []);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleTestSerialPort = async () => {
    setSerialError(null);
    setIsPinging(true);
    const res = await serialProvisioning.pingDevice();
    setIsPinging(false);
    if (res.connected) {
      setSerialConnected(true);
      setDetectedHardware(res.hardware || 'ESP32-S3-DevKitC-1-N16R8');
    } else {
      setSerialError(res.error || 'Could not communicate over USB-to-UART.');
    }
  };

  const handleStartFlash = async () => {
    setIsFlashing(true);
    setFlashCompleted(false);
    setFlashLogs([]);

    try {
      let images: BinaryImagePart[] = [];

      if (customFirmwareFile) {
        if (customBootloaderFile) {
          images.push({
            name: customBootloaderFile.name,
            address: 0x0,
            data: new Uint8Array(await customBootloaderFile.arrayBuffer()),
          });
        }
        if (customPartitionsFile) {
          images.push({
            name: customPartitionsFile.name,
            address: 0x8000,
            data: new Uint8Array(await customPartitionsFile.arrayBuffer()),
          });
        }
        images.push({
          name: customFirmwareFile.name,
          address: 0x10000,
          data: new Uint8Array(await customFirmwareFile.arrayBuffer()),
        });
      } else if (manifest && manifest.releases.length > 0) {
        images = await firmwareFlasher.fetchReleaseFiles(manifest.releases[0]);
      } else {
        throw new Error('Select a compiled firmware.bin file to flash.');
      }

      const res = await firmwareFlasher.flashBinaries(images, 921600, eraseAll, (p) => {
        setFlashProgress(p);
        if (p.logMessage) {
          setFlashLogs((prev) => [...prev.slice(-20), p.logMessage!]);
        }
      });

      if (res.success) {
        setFlashCompleted(true);
      }
    } catch (err: any) {
      setFlashProgress({
        stage: 'error',
        percentage: 0,
        logMessage: err?.message || 'Flashing failed.',
      });
    } finally {
      setIsFlashing(false);
    }
  };

  const handleStartProvisioning = async () => {
    setIsProvisioning(true);
    setProvisionError(null);

    try {
      const saltHex = getRandomHex(16);
      const verifierHex = await computePasswordVerifier(password, saltHex);
      const masterKey = await deriveKeyFromPassword(password, saltHex, 'encrypt');
      const encryptedCreds = await encryptData(
        JSON.stringify({ username, password, createdAt: new Date().toISOString() }),
        masterKey
      );

      const res = await serialProvisioning.provisionDevice({
        deviceName,
        username,
        saltHex,
        verifierHex,
        layout,
      });

      if (res.success) {
        const newDevice: Device = {
          id: `dev_${Date.now()}`,
          name: deviceName,
          username,
          encrypted_credentials: encryptedCreds,
          salt: saltHex,
          firmware_version: res.firmwareVersion || '1.2.0',
          device_identifier: getRandomHex(6).toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_connected_at: new Date().toISOString(),
          preferred_layout: layout,
        };

        db.saveDevice(newDevice);
        setCreatedDevice(newDevice);
        setCurrentStep(6);
      } else {
        setProvisionError(res.message);
      }
    } catch (e: any) {
      setProvisionError(e?.message || 'Provisioning failed.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const stepLabels = ['Overview', 'USB-to-UART', 'Credentials', 'Flash Firmware', 'Provision NVS', 'Done'];
  const canFlash = Boolean(customFirmwareFile) || Boolean(manifest?.releases.length);

  return (
    <div className="max-w-xl mx-auto py-2">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-800">{stepLabels[currentStep - 1]}</span>
          <span className="font-mono tabular-nums">{currentStep} / 6</span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-6">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Hydrogen Forge"
                className="w-10 h-10 object-contain shrink-0"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900">ESP32-S3-DevKitC-1-N16R8</h2>
                <p className="text-xs text-slate-500">Dual-USB Port Assignment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Usb className="w-3.5 h-3.5 text-blue-600" />
                  <span>USB-to-UART Port</span>
                </div>
                <p className="text-slate-600">Controller PC · Flashing, provisioning & serial debug</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Native USB OTG Port</span>
                </div>
                <p className="text-slate-600">Target PC · Standard USB HID keyboard output</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                {isWebSerialSupported ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                Web Serial
              </span>
              <span className="inline-flex items-center gap-1.5">
                {isWebBleSupported ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                Web Bluetooth
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-900">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                <span>Start</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Usb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Connect USB-to-UART Port</h3>
                <p className="text-xs text-slate-500">Select the CP210x / UART port connected to this computer</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSerialPort}
              disabled={isPinging}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {isPinging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
              <span>{isPinging ? 'Pinging Device...' : 'Select & Verify UART Port'}</span>
            </button>

            {serialConnected && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected: {detectedHardware}</span>
              </div>
            )}

            {serialError && (
              <div className="space-y-2 text-xs">
                <p className="text-rose-600">{serialError}</p>
                <p className="text-slate-500">
                  If flashing a blank board before firmware is installed, you can proceed straight to Step 4 to flash via ROM bootloader.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Device Credentials</h3>
                <p className="text-xs text-slate-500">Stored in ESP32-S3 NVS</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder="admin"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Keyboard Layout</label>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as KeyboardLayoutId)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
                  >
                    <option value="DE_QWERTZ">German (QWERTZ)</option>
                    <option value="US">US English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          passwordStrength.score >= 80
                            ? 'bg-emerald-500'
                            : passwordStrength.score >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{passwordStrength.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={!deviceName || !username || passwordStrength.score < 40}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REAL FIRMWARE FLASHING */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Flash Firmware via esptool-js</h3>
                <p className="text-xs text-slate-500">USB-to-UART → 16MB QIO Flash</p>
              </div>
            </div>

            {manifest && manifest.releases.length > 0 && !customFirmwareFile && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{manifest.releases[0].title}</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700">
                  {manifest.releases[0].files.length} bins
                </span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <FileUp className="w-4 h-4 text-blue-600" />
                  <span>
                    {customFirmwareFile
                      ? customFirmwareFile.name
                      : manifest
                      ? 'Or override with local firmware.bin (0x10000)'
                      : 'Select firmware.bin (0x10000)'}
                  </span>
                </span>
                <input
                  type="file"
                  accept=".bin"
                  onChange={(e) => setCustomFirmwareFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {(!manifest || customFirmwareFile) && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-600 truncate">
                    <FileUp className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{customBootloaderFile ? customBootloaderFile.name : 'bootloader.bin (0x0)'}</span>
                    <input
                      type="file"
                      accept=".bin"
                      onChange={(e) => setCustomBootloaderFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-600 truncate">
                    <FileUp className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{customPartitionsFile ? customPartitionsFile.name : 'partitions.bin (0x8000)'}</span>
                    <input
                      type="file"
                      accept=".bin"
                      onChange={(e) => setCustomPartitionsFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eraseAll}
                  onChange={(e) => setEraseAll(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Erase all flash before writing (clears stale partitions/NVS)</span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs gap-2">
                <span
                  className={`truncate ${
                    flashProgress.stage === 'error'
                      ? 'text-rose-600 font-medium'
                      : 'text-slate-600 capitalize'
                  }`}
                >
                  {flashProgress.stage === 'error'
                    ? flashProgress.logMessage
                    : flashProgress.stage}
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                  {flashProgress.percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    flashProgress.stage === 'error' ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${flashProgress.percentage}%` }}
                />
              </div>
            </div>

            {flashLogs.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 max-h-28 overflow-y-auto">
                {flashLogs.map((l, i) => (
                  <div key={i} className="truncate">
                    {l}
                  </div>
                ))}
              </div>
            )}

            {!flashCompleted ? (
              <button
                type="button"
                onClick={handleStartFlash}
                disabled={isFlashing || !canFlash}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                {isFlashing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Flashing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Flash Firmware</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Firmware flashed</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={isFlashing}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                <span>{flashCompleted ? 'Next' : 'Skip if Already Flashed'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Provision NVS Credentials</h3>
                <p className="text-xs text-slate-500">Writes salted verifier over USB-to-UART</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-2">
              <div>Device: <strong className="text-slate-900">{deviceName}</strong></div>
              <div>User: <strong className="text-slate-900">{username}</strong></div>
              <div>Layout: <strong className="text-slate-900">{layout}</strong></div>
              <div>Storage: <strong className="text-slate-900">ESP32 NVS</strong></div>
            </div>

            {provisionError && <p className="text-xs text-rose-600">{provisionError}</p>}

            <button
              type="button"
              onClick={handleStartProvisioning}
              disabled={isProvisioning}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {isProvisioning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Writing to NVS...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Provision via USB-to-UART</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={isProvisioning}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {currentStep === 6 && (
          <div className="space-y-5 text-center py-3">
            <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full" />
              <div className="relative w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/25 ring-4 ring-blue-500/15 shrink-0">
                <Bluetooth className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white" />
                </span>
              </div>
              <div className="h-0.5 flex-1 border-t-2 border-dashed border-slate-200" />
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                <Keyboard className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Device Provisioned</h3>
              <p className="text-xs text-slate-500 mt-1">
                Plug Native USB OTG into the target computer.
              </p>
            </div>

            <button
              type="button"
              onClick={() => createdDevice && onComplete(createdDevice)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/25 ring-2 ring-blue-500/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <Bluetooth className="w-4 h-4" />
              <span>Connect BLE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
