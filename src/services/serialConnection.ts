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

    // Release DTR & RTS so the ESP32-S3 is neither held in reset nor forced into ROM bootloader
    try {
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch {
      // Ignore if driver doesn't support manual flow control signals
    }

    this.activePort = port;
    return port;
  }

  private async writeJsonLine(port: any, commandObj: Record<string, unknown>): Promise<void> {
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    try {
      await writer.write(encoder.encode(JSON.stringify(commandObj) + '\n'));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Keeps one reader open on `port`:
   * 1. Polls `PING` every 400ms (up to 6s) until the ESP32-S3 finishes booting and emits READY or PONG.
   * 2. Once awake, sends `commandObj` (if not already PING) and waits for a matching JSON response.
   */
  private async waitForBootAndSend(
    port: any,
    commandObj: Record<string, unknown>,
    expectedStatuses: string[]
  ): Promise<any> {
    const decoder = new TextDecoder();
    const reader = port.readable.getReader();
    const recentLines: string[] = [];
    let buffer = '';
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let bootTimer: ReturnType<typeof setTimeout> | null = null;
    let overallTimer: ReturnType<typeof setTimeout> | null = null;
    let bootConfirmed = commandObj.command === 'PING';
    let mainCommandSent = commandObj.command === 'PING';

    const sendPingSafely = () => {
      this.writeJsonLine(port, { command: 'PING' }).catch(() => {});
    };

    try {
      // Wait 250ms after DTR/RTS release, then poll PING until firmware finishes booting
      bootTimer = setTimeout(() => {
        if (!bootConfirmed) {
          sendPingSafely();
        } else if (commandObj.command === 'PING') {
          this.writeJsonLine(port, commandObj).catch(() => {});
        }
      }, 250);

      pingTimer = setInterval(() => {
        if (!bootConfirmed) {
          sendPingSafely();
        } else if (commandObj.command === 'PING') {
          this.writeJsonLine(port, commandObj).catch(() => {});
        }
      }, 500);

      const readPromise = (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            throw new Error('Serial stream closed before receiving response.');
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const trimmed = rawLine.trim();
            if (!trimmed) continue;
            recentLines.push(trimmed);
            if (recentLines.length > 10) recentLines.shift();

            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (!bootConfirmed && (parsed.status === 'READY' || parsed.status === 'PONG')) {
                  bootConfirmed = true;
                  if (pingTimer) {
                    clearInterval(pingTimer);
                    pingTimer = null;
                  }
                  if (!mainCommandSent) {
                    mainCommandSent = true;
                    await this.writeJsonLine(port, commandObj);
                    continue;
                  }
                }
                if (expectedStatuses.includes(parsed.status) || parsed.status === 'ERROR') {
                  return parsed;
                }
              } catch {
                // Ignore non-JSON lines containing braces
              }
            }
          }
        }
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        overallTimer = setTimeout(() => {
          const hint = recentLines.length > 0
            ? ` UART output: "${recentLines.slice(-3).join(' | ')}"`
            : ' Check that you selected the USB-to-UART COM port (not Native USB OTG) and firmware flashed cleanly.';
          reject(new Error(`ESP32-S3 UART response timed out.${hint}`));
        }, 8000);
      });

      return await Promise.race([readPromise, timeoutPromise]);
    } finally {
      if (bootTimer) clearTimeout(bootTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (overallTimer) clearTimeout(overallTimer);
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
      const resp = await this.waitForBootAndSend(port, { command: 'PING' }, ['PONG']);
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
      const parsed = await this.waitForBootAndSend(
        port,
        {
          command: 'PROVISION',
          device_name: payload.deviceName,
          username: payload.username,
          salt: payload.saltHex,
          verifier: payload.verifierHex,
          layout: payload.layout,
        },
        ['PROVISIONED_SUCCESS']
      );

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
      const resp = await this.waitForBootAndSend(port, { command: 'FACTORY_RESET' }, ['RESET_OK']);
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
        this.activePort = null;
      }
    }
  }
}

export const serialProvisioning = new SerialProvisioningService();
