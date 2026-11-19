import { ESPLoader, Transport } from 'esptool-js';
import { FirmwareManifest, FirmwareRelease } from '../types';

export interface FlashProgress {
  stage: 'idle' | 'connecting' | 'syncing' | 'writing' | 'verifying' | 'completed' | 'error';
  percentage: number;
  logMessage?: string;
}

export interface BinaryImagePart {
  name: string;
  address: number;
  data: Uint8Array;
}

export type FlashProgressCallback = (progress: FlashProgress) => void;

class FirmwareFlasherService {
  isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  private resolveAssetUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    return `${cleanBase}${cleanPath}`;
  }

  /**
   * Loads real firmware manifest if deployed alongside the PWA (built by GitHub Actions).
   * Verifies that the referenced binary file actually exists before returning the manifest.
   */
  async loadManifest(): Promise<FirmwareManifest | null> {
    try {
      const res = await fetch(this.resolveAssetUrl('firmware/manifest.json'));
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) return null;

      const manifest = (await res.json()) as FirmwareManifest;
      const firstFile = manifest?.releases?.[0]?.files?.[0];
      if (!firstFile) return null;

      const head = await fetch(this.resolveAssetUrl(firstFile.url), { method: 'HEAD' });
      const binType = head.headers.get('content-type') || '';
      if (!head.ok || binType.includes('text/html')) return null;

      return manifest;
    } catch {
      return null;
    }
  }

  /**
   * Fetches binary files from a real FirmwareRelease manifest
   */
  async fetchReleaseFiles(release: FirmwareRelease): Promise<BinaryImagePart[]> {
    const parts: BinaryImagePart[] = [];
    for (const file of release.files) {
      const res = await fetch(this.resolveAssetUrl(file.url));
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        throw new Error(`Firmware file not found: ${file.name}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0) {
        throw new Error(`Firmware file is empty: ${file.name}`);
      }
      parts.push({
        name: file.name,
        address: parseInt(file.offset, 16),
        data: buf,
      });
    }
    return parts;
  }

  /**
   * Flashes real binary images to ESP32-S3-DevKitC-1-N16R8 via Web Serial & esptool-js
   */
  async flashBinaries(
    images: BinaryImagePart[],
    baudRate = 921600,
    eraseAll = false,
    onProgress: FlashProgressCallback
  ): Promise<{ success: boolean; chipName?: string; error?: string }> {
    if (!this.isWebSerialSupported()) {
      const msg = 'Web Serial API is not supported in this browser. Use Chrome or Edge.';
      onProgress({ stage: 'error', percentage: 0, logMessage: msg });
      return { success: false, error: msg };
    }

    if (images.length === 0) {
      const msg = 'No firmware binary files provided.';
      onProgress({ stage: 'error', percentage: 0, logMessage: msg });
      return { success: false, error: msg };
    }

    let transport: Transport | null = null;

    try {
      onProgress({
        stage: 'connecting',
        percentage: 2,
        logMessage: 'Select the USB-to-UART serial port for ESP32-S3-DevKitC-1-N16R8...',
      });

      const port = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (USB-to-UART on DevKitC-1)
          { usbVendorId: 0x1a86 }, // WCH CH340/CH343
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif
        ],
      });

      transport = new Transport(port, false);

      const terminal = {
        clean: () => {},
        writeLine: (data: string) => {
          onProgress({ stage: 'syncing', percentage: 10, logMessage: data });
        },
        write: (data: string) => {
          if (data.trim()) {
            onProgress({ stage: 'syncing', percentage: 10, logMessage: data.trim() });
          }
        },
      };

      const esploader = new ESPLoader({
        transport,
        baudrate: baudRate,
        romBaudrate: 115200,
        terminal,
      });

      onProgress({
        stage: 'syncing',
        percentage: 8,
        logMessage: 'Connecting to ESP32-S3 ROM bootloader...',
      });

      const chipName = await esploader.main();

      onProgress({
        stage: 'writing',
        percentage: 15,
        logMessage: `Detected ${chipName}. Starting flash write...`,
      });

      const totalBytes = images.reduce((sum, img) => sum + img.data.byteLength, 0);
      const completedOffsets = new Array<number>(images.length).fill(0);

      await esploader.writeFlash({
        fileArray: images.map((img) => ({ data: img.data, address: img.address })),
        flashMode: 'qio',
        flashFreq: '80m',
        flashSize: '16MB',
        eraseAll,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          completedOffsets[fileIndex] = written;
          const totalWritten = completedOffsets.reduce((a, b) => a + b, 0);
          const pct = Math.min(95, Math.round(15 + (totalWritten / Math.max(1, totalBytes)) * 80));
          const currentName = images[fileIndex]?.name || 'image';
          onProgress({
            stage: 'writing',
            percentage: pct,
            logMessage: `Flashing ${currentName}: ${Math.round((written / Math.max(1, total)) * 100)}%`,
          });
        },
      });

      onProgress({
        stage: 'verifying',
        percentage: 97,
        logMessage: 'Resetting ESP32-S3...',
      });

      await esploader.after('hard_reset');
      await transport.disconnect();

      onProgress({
        stage: 'completed',
        percentage: 100,
        logMessage: `Successfully flashed ${chipName}.`,
      });

      return { success: true, chipName };
    } catch (err: any) {
      if (transport) {
        try {
          await transport.disconnect();
        } catch {
          // Ignore disconnect cleanup error
        }
      }
      const msg = err?.message || 'Flashing failed.';
      onProgress({ stage: 'error', percentage: 0, logMessage: msg });
      return { success: false, error: msg };
    }
  }
}

export const firmwareFlasher = new FirmwareFlasherService();
