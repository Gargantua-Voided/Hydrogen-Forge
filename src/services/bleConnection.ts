import {
  ConnectionState,
  Device,
  KeyboardLayoutId,
  ShortcutAction,
} from '../types';
import { computeChallengeHmac, getRandomHex } from './crypto';
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
  private statusListeners: StatusListener[] = [];
  private connectionListeners: ConnectionListener[] = [];

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

  async connect(targetDevice: Device): Promise<{ success: boolean; message: string }> {
    if (!this.isBleSupported()) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser. Use Chrome or Edge.',
      };
    }

    this.activeDevice = targetDevice;
    this.setState('connecting');

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
        optionalServices: [BLE_SERVICE_UUID],
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.cleanupConnection();
      });

      this.gattServer = await this.device.gatt.connect();
      const service = await this.gattServer.getPrimaryService(BLE_SERVICE_UUID);

      this.authCharacteristic = await service.getCharacteristic(BLE_CHAR_AUTH_UUID);
      this.commandCharacteristic = await service.getCharacteristic(BLE_CHAR_COMMAND_UUID);
      this.statusCharacteristic = await service.getCharacteristic(BLE_CHAR_STATUS_UUID);

      await this.statusCharacteristic.startNotifications();
      this.statusCharacteristic.addEventListener('characteristicvaluechanged', (e: any) => {
        const text = new TextDecoder().decode(e.target.value);
        try {
          const parsed: BleStatusMessage = JSON.parse(text);
          this.notifyStatus(parsed);
        } catch {
          // Ignore malformed status frame
        }
      });

      this.setState('connected');
      return { success: true, message: `Connected to ${this.device.name || targetDevice.name} via BLE` };
    } catch (e: any) {
      this.setState('disconnected');
      return { success: false, message: e?.message || 'Bluetooth connection canceled or failed.' };
    }
  }

  async authenticate(passwordVerifierHex: string): Promise<{ success: boolean; message: string }> {
    if (this.state !== 'connected' && this.state !== 'authenticating') {
      return { success: false, message: 'Device not connected.' };
    }

    this.setState('authenticating');

    try {
      const enc = new TextEncoder();
      const dec = new TextDecoder();

      await this.authCharacteristic.writeValue(enc.encode(JSON.stringify({ command: 'GET_CHALLENGE' })));
      await new Promise((r) => setTimeout(r, 150));

      const rawChallengeVal = await this.authCharacteristic.readValue();
      const challengeJson = JSON.parse(dec.decode(rawChallengeVal));

      if (challengeJson.status !== 'OK' || !challengeJson.challenge) {
        throw new Error('Failed to obtain challenge from ESP32-S3.');
      }

      const timestamp = Date.now();
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

      await this.authCharacteristic.writeValue(enc.encode(JSON.stringify(authCmd)));
      await new Promise((r) => setTimeout(r, 200));

      const authRespRaw = await this.authCharacteristic.readValue();
      const authResp = JSON.parse(dec.decode(authRespRaw));

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
      this.setState('connected');
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
        message: 'Connect and authenticate an ESP32-S3 via BLE first.',
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
      await this.commandCharacteristic.writeValue(enc.encode(JSON.stringify(payload)));

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
        await this.commandCharacteristic.writeValue(new TextEncoder().encode(JSON.stringify(payload)));
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
        await this.commandCharacteristic.writeValue(new TextEncoder().encode(JSON.stringify(payload)));
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
    this.cleanupConnection();
  }

  private cleanupConnection(): void {
    this.device = null;
    this.gattServer = null;
    this.authCharacteristic = null;
    this.commandCharacteristic = null;
    this.statusCharacteristic = null;
    this.sessionToken = '';
    this.setState('disconnected');
    this.notifyStatus({ status: 'IDLE', details: 'Disconnected' });
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
