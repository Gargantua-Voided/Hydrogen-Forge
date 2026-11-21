import {
  ConnectionState,
  Device,
  KeyboardLayoutId,
  ShortcutAction,
} from '../types';
import { computeChallengeHmac, computePasswordVerifier, getRandomHex } from './crypto';
import { HID_KEY_CODES } from './keyboardLayouts';

export interface BleStatusMessage {
  status: 'IDLE' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'AUTH_REQUIRED' | 'LAYOUT_UPDATED';
  details?: string;
  timestamp?: number;
}

export type StatusListener = (msg: BleStatusMessage) => void;
export type ConnectionListener = (state: ConnectionState) => void;

const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_CHAR_AUTH_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_CHAR_COMMAND_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_CHAR_STATUS_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';

class BleConnectionService {
  private device: any = null;
  private gattServer: any = null;
  private authCharacteristic: any = null;
  private commandCharacteristic: any = null;
  private statusCharacteristic: any = null;

  private state: ConnectionState = 'disconnected';
  private activeDevice: Device | null = null;
  private sessionToken = '';
  private isConnecting = false;
  private statusListeners: StatusListener[] = [];
  private connectionListeners: ConnectionListener[] = [];

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isGattDisconnectError(err: any): boolean {
    const msg = String(err?.message || err || '').toLowerCase();
    const name = String(err?.name || '').toLowerCase();
    return (
      name === 'networkerror' ||
      msg.includes('disconnected') ||
      msg.includes('gatt server') ||
      msg.includes('gatt operation') ||
      msg.includes('not connected') ||
      msg.includes('connection')
    );
  }

  private handleGattDisconnected = (event: any): void => {
    if (this.isConnecting) return;
    if (event?.target && this.device && event.target !== this.device) return;
    this.cleanupConnection(true);
  };

  private handleStatusValueChanged = (e: any): void => {
    if (!e?.target?.value) return;
    const text = new TextDecoder().decode(e.target.value).replace(/\0+$/, '').trim();
    try {
      const parsed: BleStatusMessage = JSON.parse(text);
      this.notifyStatus(parsed);
    } catch {
      // Ignore malformed status frame
    }
  };

  isBleSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getActiveDevice(): Device | null {
    return this.activeDevice;
  }

  private setState(next: ConnectionState): void {
    this.state = next;
    this.connectionListeners.forEach((l) => l(next));
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(msg: BleStatusMessage): void {
    this.statusListeners.forEach((l) => l(msg));
  }

  getConnectedBleInfo(): { name: string; id: string } | null {
    if (!this.device) return null;
    return {
      name: this.device.name || 'HydroGen',
      id: this.device.id || '',
    };
  }

  private async establishGattSession(targetBleDevice: any): Promise<void> {
    if (!targetBleDevice?.gatt) {
      throw new Error('Selected Bluetooth device does not expose a GATT server.');
    }

    const maxAttempts = 3;
    this.isConnecting = true;

    try {
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1 || targetBleDevice.gatt.connected) {
            if (targetBleDevice.gatt.connected) {
              try {
                targetBleDevice.gatt.disconnect();
              } catch {
                // Ignore stale disconnect errors
              }
            }
            await this.delay(attempt === 1 ? 300 : 500 * attempt);
          }

          const server = await targetBleDevice.gatt.connect();
          if (!server || !server.connected) {
            throw new Error(
              'GATT Server is disconnected. Cannot retrieve services. (Re)connect first with `device.gatt.connect`.'
            );
          }

          // Allow ESP32 NimBLE LL feature exchange / MTU / connection parameter update to settle.
          // On Windows, the OS BLE driver takes 400-600ms to stabilize GATT database caching.
          await this.delay(attempt === 1 ? 450 : 650);

          if (!server.connected) {
            throw new Error(
              'GATT Server is disconnected. Cannot retrieve services. (Re)connect first with `device.gatt.connect`.'
            );
          }

          let service: any = null;
          try {
            service = await server.getPrimaryService(BLE_SERVICE_UUID);
          } catch (svcErr: any) {
            // If primary service query failed on attempt 1 but server is still connected, give it one quick grace retry
            if (server.connected && this.isGattDisconnectError(svcErr)) {
              await this.delay(350);
              if (server.connected) {
                service = await server.getPrimaryService(BLE_SERVICE_UUID);
              } else {
                throw svcErr;
              }
            } else {
              throw svcErr;
            }
          }

          const authChar = await service.getCharacteristic(BLE_CHAR_AUTH_UUID);
          const commandChar = await service.getCharacteristic(BLE_CHAR_COMMAND_UUID);
          const statusChar = await service.getCharacteristic(BLE_CHAR_STATUS_UUID);

          statusChar.removeEventListener('characteristicvaluechanged', this.handleStatusValueChanged);
          statusChar.addEventListener('characteristicvaluechanged', this.handleStatusValueChanged);

          try {
            await statusChar.startNotifications();
          } catch {
            // Notifications on status char are optional; only fail if the link itself dropped
            if (!server.connected) {
              throw new Error('GATT Server disconnected while enabling status notifications.');
            }
          }

          if (!server.connected) {
            throw new Error('GATT Server is disconnected after service discovery.');
          }

          this.gattServer = server;
          this.authCharacteristic = authChar;
          this.commandCharacteristic = commandChar;
          this.statusCharacteristic = statusChar;
          return;
        } catch (err: any) {
          lastError = err;
          const canRetry =
            attempt < maxAttempts &&
            (!targetBleDevice.gatt.connected || this.isGattDisconnectError(err));
          if (!canRetry) {
            break;
          }
        }
      }

      const rawDetail = lastError?.message
        ? ` (${lastError.name ? `${lastError.name}: ` : ''}${lastError.message})`
        : '';

      if (this.isGattDisconnectError(lastError)) {
        throw new Error(
          `[WINDOWS_BLE_CONFLICT] BLE GATT connection dropped during service discovery${rawDetail}. In Windows Settings > Bluetooth & devices, select 'Remove device' for HydroGen, reboot the board, and connect directly from this website.`
        );
      }

      throw lastError || new Error('Failed to establish BLE GATT session.');
    } finally {
      this.isConnecting = false;
    }
  }

  async connect(
    targetDevice?: Device
  ): Promise<{
    success: boolean;
    message: string;
    deviceName?: string;
    bleDeviceId?: string;
    isWindowsConflict?: boolean;
  }> {
    if (!this.isBleSupported()) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser. Use Chrome or Edge.',
      };
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return {
        success: false,
        message: 'Web Bluetooth requires a secure HTTPS (or localhost) context.',
      };
    }

    if (this.isConnecting) {
      return {
        success: false,
        message: 'Bluetooth connection already in progress.',
      };
    }

    // Disconnect any previous session synchronously before requestDevice() to preserve user gesture
    if (this.gattServer?.connected) {
      try {
        this.gattServer.disconnect();
      } catch {
        // Ignore
      }
    }
    this.cleanupConnection(false);

    this.activeDevice = targetDevice || null;
    this.setState('connecting');

    try {
      const selectedDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUID] },
          { namePrefix: 'HydroGen' },
          { name: 'HydroGen' },
        ],
        optionalServices: [BLE_SERVICE_UUID],
      });

      this.device = selectedDevice;
      selectedDevice.removeEventListener('gattserverdisconnected', this.handleGattDisconnected);
      selectedDevice.addEventListener('gattserverdisconnected', this.handleGattDisconnected);

      await this.establishGattSession(selectedDevice);

      const resolvedName = selectedDevice.name || targetDevice?.name || 'HydroGen';
      this.setState('connected');
      return {
        success: true,
        message: `Connected to ${resolvedName} via BLE`,
        deviceName: resolvedName,
        bleDeviceId: selectedDevice.id || undefined,
      };
    } catch (e: any) {
      this.cleanupConnection(true);
      const rawMsg = String(e?.message || '');
      const lowerMsg = rawMsg.toLowerCase();

      if (
        e?.name === 'SecurityError' ||
        lowerMsg.includes('permissions policy') ||
        lowerMsg.includes('disallowed')
      ) {
        return {
          success: false,
          message:
            'Web Bluetooth is blocked inside this embedded preview frame. Open the app directly in a standalone Chrome or Edge tab to connect via BLE.',
        };
      }

      const isWindowsConflict =
        rawMsg.includes('[WINDOWS_BLE_CONFLICT]') ||
        lowerMsg.includes('gatt server is disconnected') ||
        lowerMsg.includes('cannot retrieve services') ||
        this.isGattDisconnectError(e);

      const cleanMsg = rawMsg.replace(/\[WINDOWS_BLE_CONFLICT\]\s*/g, '');

      return {
        success: false,
        message: cleanMsg || 'Bluetooth connection canceled or failed.',
        isWindowsConflict,
      };
    }
  }

  private async ensureGattReady(): Promise<void> {
    if (!this.device) {
      throw new Error('No Bluetooth device selected. Connect via BLE first.');
    }
    if (
      !this.gattServer?.connected ||
      !this.authCharacteristic ||
      !this.commandCharacteristic ||
      !this.statusCharacteristic
    ) {
      await this.establishGattSession(this.device);
    }
  }

  private async writeCharacteristic(characteristic: any, data: BufferSource): Promise<void> {
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await characteristic.writeValueWithResponse(data);
    } else {
      await characteristic.writeValue(data);
    }
  }

  private parseBleJson(rawValue: DataView, stepLabel: string): any {
    const text = new TextDecoder().decode(rawValue).replace(/\0+$/, '').trim();
    try {
      return JSON.parse(text);
    } catch {
      const hex = Array.from(new Uint8Array(rawValue.buffer, rawValue.byteOffset, rawValue.byteLength))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      throw new Error(
        `Invalid BLE ${stepLabel} response ("${text.slice(0, 32)}" [${hex}]). Reflash the latest HydroGen firmware.`
      );
    }
  }

  async authenticateWithPassword(
    username: string,
    password: string,
    fallbackSalt?: string
  ): Promise<{
    success: boolean;
    message: string;
    deviceName?: string;
    firmwareVersion?: string;
    salt?: string;
  }> {
    if (this.state !== 'connected' && this.state !== 'authenticating') {
      return { success: false, message: 'Device not connected.' };
    }

    this.setState('authenticating');

    try {
      await this.ensureGattReady();
      const enc = new TextEncoder();

      await this.writeCharacteristic(
        this.authCharacteristic,
        enc.encode(JSON.stringify({ command: 'GET_CHALLENGE' }))
      );
      await this.delay(150);

      const rawChallengeVal = await this.authCharacteristic.readValue();
      const challengeJson = this.parseBleJson(rawChallengeVal, 'challenge');

      if (challengeJson.status !== 'OK' || !challengeJson.challenge) {
        throw new Error(challengeJson.message || 'Failed to obtain challenge from HydroGen.');
      }

      const effectiveSalt = challengeJson.salt || fallbackSalt || '';
      if (!effectiveSalt) {
        throw new Error(
          'Device did not provide a credential salt. Provision this device over USB-to-UART first.'
        );
      }

      const passwordVerifierHex = await computePasswordVerifier(password, effectiveSalt);

      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = getRandomHex(16);
      const hmacHex = await computeChallengeHmac(
        passwordVerifierHex,
        challengeJson.challenge,
        timestamp,
        nonce
      );

      const authCmd = {
        command: 'AUTH',
        username: username.trim() || 'admin',
        hmac: hmacHex,
        timestamp,
        nonce,
      };

      await this.writeCharacteristic(this.authCharacteristic, enc.encode(JSON.stringify(authCmd)));
      await new Promise((r) => setTimeout(r, 200));

      const authRespRaw = await this.authCharacteristic.readValue();
      const authResp = this.parseBleJson(authRespRaw, 'auth');

      if (authResp.status === 'AUTHENTICATED' && authResp.token) {
        this.sessionToken = authResp.token;
        this.setState('authenticated');
        this.notifyStatus({ status: 'IDLE', details: 'Authenticated' });
        return {
          success: true,
          message: 'Authenticated via HMAC-SHA256.',
          deviceName: authResp.device_name || this.device?.name || 'HydroGen',
          firmwareVersion: authResp.firmware || '1.2.0',
          salt: effectiveSalt,
        };
      }

      this.setState('connected');
      return {
        success: false,
        message: authResp.message || 'Authentication rejected.',
      };
    } catch (e: any) {
      if (!this.device?.gatt?.connected && this.isGattDisconnectError(e)) {
        this.cleanupConnection(true);
      } else {
        this.setState('connected');
      }
      return { success: false, message: e?.message || 'Authentication failed.' };
    }
  }

  async authenticate(passwordVerifierHex: string): Promise<{ success: boolean; message: string }> {
    if (this.state !== 'connected' && this.state !== 'authenticating') {
      return { success: false, message: 'Device not connected.' };
    }

    this.setState('authenticating');

    try {
      await this.ensureGattReady();
      const enc = new TextEncoder();

      await this.writeCharacteristic(
        this.authCharacteristic,
        enc.encode(JSON.stringify({ command: 'GET_CHALLENGE' }))
      );
      await this.delay(150);

      const rawChallengeVal = await this.authCharacteristic.readValue();
      const challengeJson = this.parseBleJson(rawChallengeVal, 'challenge');

      if (challengeJson.status !== 'OK' || !challengeJson.challenge) {
        throw new Error(challengeJson.message || 'Failed to obtain challenge from HydroGen.');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = getRandomHex(16);
      const hmacHex = await computeChallengeHmac(
        passwordVerifierHex,
        challengeJson.challenge,
        timestamp,
        nonce
      );

      const authCmd = {
        command: 'AUTH',
        username: this.activeDevice?.username || 'admin',
        hmac: hmacHex,
        timestamp,
        nonce,
      };

      await this.writeCharacteristic(this.authCharacteristic, enc.encode(JSON.stringify(authCmd)));
      await new Promise((r) => setTimeout(r, 200));

      const authRespRaw = await this.authCharacteristic.readValue();
      const authResp = this.parseBleJson(authRespRaw, 'auth');

      if (authResp.status === 'AUTHENTICATED' && authResp.token) {
        this.sessionToken = authResp.token;
        this.setState('authenticated');
        this.notifyStatus({ status: 'IDLE', details: 'Authenticated' });
        return { success: true, message: 'Authenticated via HMAC-SHA256.' };
      }

      this.setState('connected');
      return {
        success: false,
        message: authResp.message || 'Authentication rejected.',
      };
    } catch (e: any) {
      if (!this.device?.gatt?.connected && this.isGattDisconnectError(e)) {
        this.cleanupConnection(true);
      } else {
        this.setState('connected');
      }
      return { success: false, message: e?.message || 'Authentication failed.' };
    }
  }

  private resolveScancode(keyName?: string): number {
    if (!keyName) return 0;
    if (HID_KEY_CODES[keyName] !== undefined) return HID_KEY_CODES[keyName];
    const lower = keyName.toLowerCase();
    if (HID_KEY_CODES[lower] !== undefined) return HID_KEY_CODES[lower];
    return 0;
  }

  async executeMacro(
    actions: ShortcutAction[],
    resolvedVariables: Record<string, string> = {},
    layout: KeyboardLayoutId = 'DE_QWERTZ'
  ): Promise<{ success: boolean; message: string; durationMs: number }> {
    if (this.state !== 'authenticated' || !this.commandCharacteristic) {
      return {
        success: false,
        message: 'Connect and authenticate a HydroGen device via BLE first.',
        durationMs: 0,
      };
    }

    const startTime = Date.now();

    const formattedActions = actions.map((act) => {
      let text = act.configuration.text || '';
      if (act.action_type === 'TYPE_PARAMETER' && act.configuration.parameter_name) {
        text = resolvedVariables[act.configuration.parameter_name] || '';
      }

      let modifiers = 0;
      if (act.configuration.modifiers) {
        const m = act.configuration.modifiers;
        if (m.ctrl) modifiers |= 0x01;
        if (m.shift) modifiers |= 0x02;
        if (m.alt) modifiers |= 0x04;
        if (m.meta) modifiers |= 0x08;
        if (m.altGr) modifiers |= 0x40;
      }

      const scancode =
        act.action_type === 'PRESS_KEY' || act.action_type === 'KEY_COMBINATION'
          ? this.resolveScancode(act.configuration.key)
          : 0;

      return {
        type: this.actionTypeToInt(act.action_type),
        text,
        modifiers,
        scancode,
        delay: act.configuration.delay_ms || 0,
      };
    });

    try {
      const payload = {
        action: 'EXECUTE_MACRO',
        token: this.sessionToken,
        layout,
        actions: formattedActions,
      };

      const enc = new TextEncoder();
      await this.writeCharacteristic(this.commandCharacteristic, enc.encode(JSON.stringify(payload)));

      const durationMs = Date.now() - startTime;
      return { success: true, message: 'Macro transmitted over BLE GATT.', durationMs };
    } catch (e: any) {
      this.notifyStatus({ status: 'FAILED', details: e?.message });
      return {
        success: false,
        message: e?.message || 'Failed to write macro command over BLE.',
        durationMs: Date.now() - startTime,
      };
    }
  }

  async cancelExecution(): Promise<void> {
    if (this.commandCharacteristic && this.state === 'authenticated') {
      try {
        const payload = { action: 'CANCEL', token: this.sessionToken };
        await this.writeCharacteristic(
          this.commandCharacteristic,
          new TextEncoder().encode(JSON.stringify(payload))
        );
      } catch {
        // Ignore cancel write failure
      }
    }
  }

  async updateLayout(layout: KeyboardLayoutId): Promise<void> {
    if (this.activeDevice) {
      this.activeDevice.preferred_layout = layout;
    }

    if (this.commandCharacteristic && this.state === 'authenticated') {
      try {
        const payload = { action: 'SET_LAYOUT', token: this.sessionToken, layout };
        await this.writeCharacteristic(
          this.commandCharacteristic,
          new TextEncoder().encode(JSON.stringify(payload))
        );
      } catch {
        // Ignore layout write failure
      }
    }
  }

  disconnect(): void {
    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch {
        // Ignore
      }
    }
    this.cleanupConnection(true);
  }

  private cleanupConnection(notify = true): void {
    if (this.statusCharacteristic) {
      try {
        this.statusCharacteristic.removeEventListener(
          'characteristicvaluechanged',
          this.handleStatusValueChanged
        );
      } catch {
        // Ignore
      }
    }
    if (this.device) {
      try {
        this.device.removeEventListener('gattserverdisconnected', this.handleGattDisconnected);
      } catch {
        // Ignore
      }
    }
    this.device = null;
    this.gattServer = null;
    this.authCharacteristic = null;
    this.commandCharacteristic = null;
    this.statusCharacteristic = null;
    this.sessionToken = '';
    if (notify) {
      this.setState('disconnected');
      this.notifyStatus({ status: 'IDLE', details: 'Disconnected' });
    }
  }

  private actionTypeToInt(type: string): number {
    switch (type) {
      case 'TYPE_TEXT':
      case 'TYPE_PARAMETER':
        return 1;
      case 'PRESS_KEY':
        return 2;
      case 'KEY_COMBINATION':
        return 3;
      case 'DELAY':
        return 4;
      case 'KEY_RELEASE':
        return 5;
      default:
        return 1;
    }
  }
}

export const bleConnection = new BleConnectionService();
