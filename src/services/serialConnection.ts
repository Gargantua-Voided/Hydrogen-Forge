import { KeyboardLayoutId } from '../types';

export interface ProvisionPayload {
  deviceName: string;
  username: string;
  saltHex: string;
  verifierHex: string;
  layout: KeyboardLayoutId;
}

export interface ProvisionResult {
  success: boolean;
  message: string;
  firmwareVersion?: string;
  deviceName?: string;
}

export interface PingResult {
  connected: boolean;
  firmwareVersion?: string;
  hardware?: string;
  deviceName?: string;
  isProvisioned?: boolean;
  error?: string;
}

class SerialProvisioningService {
  private activePort: any = null;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  private async requestAndOpenPort(): Promise<any> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Use Chrome or Edge.');
    }

    const port = await (navigator as any).serial.requestPort({
      filters: [
        { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (USB-to-UART)
        { usbVendorId: 0x1a86 }, // WCH CH340/CH343
        { usbVendorId: 0x0403 }, // FTDI
        { usbVendorId: 0x303a }, // Espressif
      ],
    });

    await port.open({ baudRate: 115200 });
    this.activePort = port;
    return port;
  }

  private async sendJsonCommand(port: any, commandObj: Record<string, unknown>, timeoutMs = 5000): Promise<any> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const writer = port.writable.getWriter();
    await writer.write(encoder.encode(JSON.stringify(commandObj) + '\n'));
    writer.releaseLock();

    const reader = port.readable.getReader();
    let buffer = '';

    try {
      const readPromise = (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              return JSON.parse(trimmed);
            }
          }
        }
        throw new Error('Serial stream closed before receiving JSON response.');
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ESP32-S3 UART response timed out.')), timeoutMs)
      );

      return await Promise.race([readPromise, timeoutPromise]);
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
      reader.releaseLock();
    }
  }

  async pingDevice(): Promise<PingResult> {
    let port: any = null;
    try {
      port = await this.requestAndOpenPort();
      // Brief pause for UART bridge stabilization
      await new Promise((r) => setTimeout(r, 150));

      const resp = await this.sendJsonCommand(port, { command: 'PING' });
      if (resp.status === 'PONG') {
        return {
          connected: true,
          firmwareVersion: resp.firmware,
          hardware: resp.hardware,
          deviceName: resp.device_name,
          isProvisioned: Boolean(resp.is_provisioned),
        };
      }
      return { connected: false, error: resp.message || 'Unexpected PING response from device.' };
    } catch (e: any) {
      return { connected: false, error: e?.message || 'Failed to connect to USB-to-UART port.' };
    } finally {
      if (port) {
        try {
          await port.close();
        } catch {
          // Ignore close error
        }
        this.activePort = null;
      }
    }
  }

  async provisionDevice(payload: ProvisionPayload): Promise<ProvisionResult> {
    let port: any = null;
    try {
      port = await this.requestAndOpenPort();
      await new Promise((r) => setTimeout(r, 150));

      const parsed = await this.sendJsonCommand(port, {
        command: 'PROVISION',
        device_name: payload.deviceName,
        username: payload.username,
        salt: payload.saltHex,
        verifier: payload.verifierHex,
        layout: payload.layout,
      });

      if (parsed.status === 'PROVISIONED_SUCCESS') {
        return {
          success: true,
          message: 'Provisioned into ESP32-S3 NVS.',
          firmwareVersion: parsed.firmware || '1.2.0',
          deviceName: parsed.device_name || payload.deviceName,
        };
      }

      return {
        success: false,
        message: parsed.message || 'Provisioning rejected by ESP32-S3.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Failed to communicate over USB-to-UART.',
      };
    } finally {
      if (port) {
        try {
          await port.close();
        } catch {
          // Ignore close error
        }
        this.activePort = null;
      }
    }
  }

  async factoryResetDevice(): Promise<{ success: boolean; message: string }> {
    let port: any = null;
    try {
      port = await this.requestAndOpenPort();
      const resp = await this.sendJsonCommand(port, { command: 'FACTORY_RESET' });
      return {
        success: resp.status === 'RESET_OK',
        message: resp.message || 'Factory reset command sent.',
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to reset device over UART.' };
    } finally {
      if (port) {
        try {
          await port.close();
        } catch {
          // Ignore
        }
      }
    }
  }
}

export const serialProvisioning = new SerialProvisioningService();
