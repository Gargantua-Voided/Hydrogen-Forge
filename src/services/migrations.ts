/**
 * Database Migrations System for Local SQLite / OPFS / Encrypted Storage
 */

export interface Migration {
  version: number;
  name: string;
  up: (db: LocalDatabaseState) => void;
}

export interface LocalDatabaseState {
  version: number;
  devices: any[];
  shortcuts: any[];
  shortcut_actions: any[];
  shortcut_parameters: any[];
  application_settings: any[];
  execution_logs: any[];
}

const LEGACY_SEED_IDS = new Set([
  'sc_term_proj',
  'sc_email_sig',
  'sc_git_push',
  'sc_lock_pc',
  'sc_snippet_code',
]);

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'Initial Schema',
    up: (db) => {
      if (!db.devices) db.devices = [];
      if (!db.shortcuts) db.shortcuts = [];
      if (!db.shortcut_actions) db.shortcut_actions = [];
      if (!db.shortcut_parameters) db.shortcut_parameters = [];
      if (!db.application_settings) db.application_settings = [];
      if (!db.execution_logs) db.execution_logs = [];
    },
  },
  {
    version: 2,
    name: 'Add German QWERTZ Support & Timeout Preferences',
    up: (db) => {
      const hasLayout = db.application_settings.some(
        (s: any) => s.setting_key === 'default_keyboard_layout'
      );
      if (!hasLayout) {
        db.application_settings.push({
          id: 'setting_layout',
          setting_key: 'default_keyboard_layout',
          setting_value: 'DE_QWERTZ',
        });
      }

      const hasTimeout = db.application_settings.some(
        (s: any) => s.setting_key === 'macro_timeout_ms'
      );
      if (!hasTimeout) {
        db.application_settings.push({
          id: 'setting_timeout',
          setting_key: 'macro_timeout_ms',
          setting_value: '15000',
        });
      }

      db.devices.forEach((d: any) => {
        if (!d.preferred_layout) {
          d.preferred_layout = 'DE_QWERTZ';
        }
      });
    },
  },
  {
    version: 3,
    name: 'Remove Default Seed Shortcuts',
    up: (db) => {
      db.shortcuts = db.shortcuts.filter((s: any) => !LEGACY_SEED_IDS.has(s.id));
      db.shortcut_actions = db.shortcut_actions.filter(
        (a: any) => !LEGACY_SEED_IDS.has(a.shortcut_id)
      );
      db.shortcut_parameters = db.shortcut_parameters.filter(
        (p: any) => !LEGACY_SEED_IDS.has(p.shortcut_id)
      );
    },
  },
];
