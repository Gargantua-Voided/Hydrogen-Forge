export type KeyboardLayoutId = 'DE_QWERTZ' | 'US';

export type ActionType = 
  | 'TYPE_TEXT'
  | 'PRESS_KEY'
  | 'KEY_COMBINATION'
  | 'DELAY'
  | 'TYPE_PARAMETER'
  | 'KEY_RELEASE';

export type ShortcutCategory = 
  | 'All'
  | 'Productivity'
  | 'Development'
  | 'Text Expander'
  | 'System'
  | 'Media'
  | 'Custom';

export interface Device {
  id: string;
  name: string;
  username: string;
  encrypted_credentials: string; // Base64 AES-GCM ciphertext
  salt: string;                  // Hex salt for PBKDF2 / verifier
  firmware_version: string;
  device_identifier: string;     // MAC or BLE UUID
  created_at: string;
  updated_at: string;
  last_connected_at: string | null;
  preferred_layout: KeyboardLayoutId;
}

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  icon: string;                  // Lucide icon name
  category: ShortcutCategory;
  color_gradient: string;        // e.g., 'from-blue-500 to-indigo-600'
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  actions?: ShortcutAction[];
  parameters?: ShortcutParameter[];
}

export interface ShortcutAction {
  id: string;
  shortcut_id: string;
  action_type: ActionType;
  action_order: number;
  configuration: ActionConfiguration;
}

export interface ActionConfiguration {
  text?: string;
  key?: string;                  // 'Enter', 'Tab', 'Escape', 'F5', etc.
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;              // Win / Cmd
    altGr?: boolean;             // German AltGr
  };
  delay_ms?: number;
  parameter_name?: string;       // For TYPE_PARAMETER
  description?: string;
}

export interface ShortcutParameter {
  id: string;
  shortcut_id: string;
  name: string;                  // e.g. "recipient_name", "branch"
  parameter_type: 'text' | 'number' | 'secret';
  default_value: string;
  label?: string;
}

export interface ApplicationSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  shortcut_id: string;
  shortcut_name: string;
  status: 'success' | 'failed' | 'canceled';
  duration_ms: number;
  details: string;
  layout_used: KeyboardLayoutId;
}

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'error';

export type ConnectionMode = 'ble' | 'serial';

export interface FirmwareRelease {
  version: string;
  release_date: string;
  target_chip: string;
  min_app_version: string;
  title: string;
  notes: string[];
  files: {
    name: string;
    offset: string;
    size: number;
    url: string;
  }[];
}

export interface FirmwareManifest {
  latest_version: string;
  releases: FirmwareRelease[];
}
