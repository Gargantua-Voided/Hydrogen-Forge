import {
  Device,
  Shortcut,
  ShortcutAction,
  ShortcutParameter,
  ExecutionLogEntry,
} from '../types';
import { MIGRATIONS, LocalDatabaseState } from './migrations';

const STORAGE_KEY = 'esp32_macro_commander_db_v1';

class LocalDatabase {
  private state: LocalDatabaseState | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed reading from local storage:', e);
    }

    if (!this.state) {
      this.state = {
        version: 0,
        devices: [],
        shortcuts: [],
        shortcut_actions: [],
        shortcut_parameters: [],
        application_settings: [
          {
            id: 'cfg_layout',
            setting_key: 'default_keyboard_layout',
            setting_value: 'DE_QWERTZ',
          },
          {
            id: 'cfg_timeout',
            setting_key: 'macro_timeout_ms',
            setting_value: '15000',
          },
        ],
        execution_logs: [],
      };
    }

    // Run pending migrations
    for (const migration of MIGRATIONS) {
      if (this.state.version < migration.version) {
        migration.up(this.state);
        this.state.version = migration.version;
      }
    }

    this.saveState();
    this.isInitialized = true;
  }

  private saveState(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  }

  // Devices
  getDevices(): Device[] {
    return [...(this.state?.devices || [])];
  }

  getDevice(id: string): Device | undefined {
    return this.state?.devices.find((d) => d.id === id);
  }

  saveDevice(device: Device): void {
    if (!this.state) return;
    const idx = this.state.devices.findIndex((d) => d.id === device.id);
    if (idx >= 0) {
      this.state.devices[idx] = { ...device, updated_at: new Date().toISOString() };
    } else {
      this.state.devices.push(device);
    }
    this.saveState();
  }

  deleteDevice(id: string): void {
    if (!this.state) return;
    this.state.devices = this.state.devices.filter((d) => d.id !== id);
    this.saveState();
  }

  // Shortcuts
  getShortcuts(): Shortcut[] {
    if (!this.state) return [];
    return this.state.shortcuts.map((sc) => {
      const actions = this.state!.shortcut_actions
        .filter((a) => a.shortcut_id === sc.id)
        .sort((a, b) => a.action_order - b.action_order);

      const parameters = this.state!.shortcut_parameters.filter(
        (p) => p.shortcut_id === sc.id
      );

      return {
        ...sc,
        actions,
        parameters,
      };
    });
  }

  getShortcut(id: string): Shortcut | undefined {
    return this.getShortcuts().find((sc) => sc.id === id);
  }

  saveShortcut(
    shortcut: Shortcut,
    actions: Omit<ShortcutAction, 'id' | 'shortcut_id'>[],
    parameters: Omit<ShortcutParameter, 'id' | 'shortcut_id'>[] = []
  ): void {
    if (!this.state) return;

    const existingIdx = this.state.shortcuts.findIndex((s) => s.id === shortcut.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      this.state.shortcuts[existingIdx] = {
        ...shortcut,
        updated_at: now,
      };
    } else {
      this.state.shortcuts.push({
        ...shortcut,
        created_at: shortcut.created_at || now,
        updated_at: now,
      });
    }

    // Replace actions
    this.state.shortcut_actions = this.state.shortcut_actions.filter(
      (a) => a.shortcut_id !== shortcut.id
    );
    actions.forEach((act, idx) => {
      this.state!.shortcut_actions.push({
        id: `act_${shortcut.id}_${Date.now()}_${idx + 1}`,
        shortcut_id: shortcut.id,
        action_type: act.action_type,
        action_order: idx + 1,
        configuration: act.configuration,
      });
    });

    // Replace parameters
    this.state.shortcut_parameters = this.state.shortcut_parameters.filter(
      (p) => p.shortcut_id !== shortcut.id
    );
    parameters.forEach((param, idx) => {
      this.state!.shortcut_parameters.push({
        id: `param_${shortcut.id}_${Date.now()}_${idx + 1}`,
        shortcut_id: shortcut.id,
        name: param.name,
        label: param.label || param.name,
        parameter_type: param.parameter_type,
        default_value: param.default_value,
      });
    });

    this.saveState();
  }

  deleteShortcut(id: string): void {
    if (!this.state) return;
    this.state.shortcuts = this.state.shortcuts.filter((s) => s.id !== id);
    this.state.shortcut_actions = this.state.shortcut_actions.filter(
      (a) => a.shortcut_id !== id
    );
    this.state.shortcut_parameters = this.state.shortcut_parameters.filter(
      (p) => p.shortcut_id !== id
    );
    this.saveState();
  }

  toggleFavorite(id: string): void {
    if (!this.state) return;
    const sc = this.state.shortcuts.find((s) => s.id === id);
    if (sc) {
      sc.is_favorite = !sc.is_favorite;
      sc.updated_at = new Date().toISOString();
      this.saveState();
    }
  }

  // Execution Logs
  getExecutionLogs(): ExecutionLogEntry[] {
    return [...(this.state?.execution_logs || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addExecutionLog(log: Omit<ExecutionLogEntry, 'id' | 'timestamp'>): void {
    if (!this.state) return;
    const entry: ExecutionLogEntry = {
      ...log,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    this.state.execution_logs.unshift(entry);
    if (this.state.execution_logs.length > 100) {
      this.state.execution_logs = this.state.execution_logs.slice(0, 100);
    }
    this.saveState();
  }

  clearExecutionLogs(): void {
    if (!this.state) return;
    this.state.execution_logs = [];
    this.saveState();
  }

  // Settings
  getSetting(key: string, defaultValue = ''): string {
    const s = this.state?.application_settings.find((item) => item.setting_key === key);
    return s ? s.setting_value : defaultValue;
  }

  setSetting(key: string, value: string): void {
    if (!this.state) return;
    const s = this.state.application_settings.find((item) => item.setting_key === key);
    if (s) {
      s.setting_value = value;
    } else {
      this.state.application_settings.push({
        id: `cfg_${Date.now()}`,
        setting_key: key,
        setting_value: value,
      });
    }
    this.saveState();
  }

  // Export / Import
  exportDatabaseJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !parsed.shortcuts ||
        !parsed.shortcut_actions ||
        !Array.isArray(parsed.shortcuts)
      ) {
        throw new Error('Invalid database format');
      }
      this.state = parsed;
      this.saveState();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const db = new LocalDatabase();
