import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Usb, ShieldAlert, CheckCircle2, FileUp } from 'lucide-react';
import { firmwareFlasher, FlashProgress, BinaryImagePart } from '../services/firmwareFlasher';
import { FirmwareManifest, FirmwareRelease } from '../types';

export const FirmwareView: React.FC = () => {
  const [manifest, setManifest] = useState<FirmwareManifest | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<FirmwareRelease | null>(null);
  const [baudRate, setBaudRate] = useState<number>(921600);
  const [eraseAll, setEraseAll] = useState<boolean>(false);

  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [bootloaderFile, setBootloaderFile] = useState<File | null>(null);
  const [partitionsFile, setPartitionsFile] = useState<File | null>(null);

  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [progress, setProgress] = useState<FlashProgress>({
    stage: 'idle',
    percentage: 0,
    logMessage: 'Ready',
  });
  const [flashLogs, setFlashLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  useEffect(() => {
    firmwareFlasher.loadManifest().then((m) => {
      setManifest(m);
      if (m && m.releases.length > 0) setSelectedRelease(m.releases[0]);
    });
  }, []);

  const handleStartFlash = async () => {
    setIsFlashing(true);
    setIsComplete(false);
    setFlashLogs([]);

    try {
      let images: BinaryImagePart[] = [];

      if (firmwareFile) {
        if (bootloaderFile) {
          images.push({
            name: bootloaderFile.name,
            address: 0x0,
            data: new Uint8Array(await bootloaderFile.arrayBuffer()),
          });
        }
        if (partitionsFile) {
          images.push({
            name: partitionsFile.name,
            address: 0x8000,
            data: new Uint8Array(await partitionsFile.arrayBuffer()),
          });
        }
        images.push({
          name: firmwareFile.name,
          address: 0x10000,
          data: new Uint8Array(await firmwareFile.arrayBuffer()),
        });
      } else if (selectedRelease) {
        images = await firmwareFlasher.fetchReleaseFiles(selectedRelease);
      } else {
        throw new Error('Select a compiled .bin file to flash.');
      }

      const res = await firmwareFlasher.flashBinaries(images, baudRate, eraseAll, (p) => {
        setProgress(p);
        if (p.logMessage) setFlashLogs((prev) => [...prev.slice(-20), p.logMessage!]);
      });

      if (res.success) setIsComplete(true);
    } catch (err: any) {
      setProgress({
        stage: 'error',
        percentage: 0,
        logMessage: err?.message || 'Flashing failed.',
      });
    } finally {
      setIsFlashing(false);
    }
  };

  const canFlash = Boolean(firmwareFile) || Boolean(selectedRelease);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Firmware Flasher</h2>
        <p className="text-xs text-slate-500">Connect ESP32-S3-DevKitC-1-N16R8 via USB-to-UART port</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {manifest && manifest.releases.length > 0 && (
          <div className="text-xs">
            <label className="block font-medium text-slate-600 mb-1">Hosted Release</label>
            <select
              value={selectedRelease?.version || ''}
              onChange={(e) => {
                const r = manifest.releases.find((rel) => rel.version === e.target.value);
                if (r) setSelectedRelease(r);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
            >
              {manifest.releases.map((rel) => (
                <option key={rel.version} value={rel.version}>
                  {rel.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2.5 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <FileUp className="w-4 h-4 text-blue-600" />
              <span>{firmwareFile ? firmwareFile.name : 'Select firmware.bin (0x10000)'}</span>
            </span>
            <input
              type="file"
              accept=".bin"
              onChange={(e) => setFirmwareFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-600 truncate">
              <FileUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{bootloaderFile ? bootloaderFile.name : 'bootloader.bin (0x0)'}</span>
              <input
                type="file"
                accept=".bin"
                onChange={(e) => setBootloaderFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-600 truncate">
              <FileUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{partitionsFile ? partitionsFile.name : 'partitions.bin (0x8000)'}</span>
              <input
                type="file"
                accept=".bin"
                onChange={(e) => setPartitionsFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
          <div>
            <label className="block font-medium text-slate-600 mb-1">Baud Rate</label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
            >
              <option value={921600}>921,600 bps</option>
              <option value={460800}>460,800 bps</option>
              <option value={115200}>115,200 bps</option>
            </select>
          </div>

          <label className="flex items-center gap-2 py-2 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={eraseAll}
              onChange={(e) => setEraseAll(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Erase all flash before writing</span>
          </label>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600 capitalize">
              {progress.stage}: {progress.logMessage}
            </span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {flashLogs.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 max-h-36 overflow-y-auto">
            {flashLogs.map((log, i) => (
              <div key={i} className="truncate">
                {log}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Flashed & Verified</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Usb className="w-3.5 h-3.5" />
              <span>USB-to-UART → Controller PC</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleStartFlash}
            disabled={isFlashing || !canFlash}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
          >
            {isFlashing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Flashing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Flash ESP32-S3</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Hardware Reset:</strong> Hold the <strong>BOOT (GPIO0)</strong> button for 10 seconds to clear stored NVS credentials.
        </span>
      </div>
    </div>
  );
};
