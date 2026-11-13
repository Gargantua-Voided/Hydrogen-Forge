import { KeyboardLayoutId } from '../types';

export interface HidKeyReport {
  modifiers: number;
  scancode: number;
  char: string;
  label: string;
  isGermanSpecial?: boolean;
}

// HID Modifiers Bitmask (Usage Page 0x07)
export const MOD_LCTRL  = 0x01;
export const MOD_LSHIFT = 0x02;
export const MOD_LALT   = 0x04;
export const MOD_LMETA  = 0x08; // Win / Cmd
export const MOD_RCTRL  = 0x10;
export const MOD_RSHIFT = 0x20;
export const MOD_RALT   = 0x40; // AltGr on European ISO keyboards
export const MOD_RMETA  = 0x80;

// HID Scancodes for standard keys
export const HID_KEY_CODES: Record<string, number> = {
  // Letters
  a: 0x04, b: 0x05, c: 0x06, d: 0x07, e: 0x08, f: 0x09, g: 0x0a,
  h: 0x0b, i: 0x0c, j: 0x0d, k: 0x0e, l: 0x0f, m: 0x10, n: 0x11,
  o: 0x12, p: 0x13, q: 0x14, r: 0x15, s: 0x16, t: 0x17, u: 0x18,
  v: 0x19, w: 0x1a, x: 0x1b, y: 0x1c, z: 0x1d,

  // Digits
  '1': 0x1e, '2': 0x1f, '3': 0x20, '4': 0x21, '5': 0x22,
  '6': 0x23, '7': 0x24, '8': 0x25, '9': 0x26, '0': 0x27,

  // Special & Controls
  Enter: 0x28,
  Escape: 0x29,
  Backspace: 0x2a,
  Tab: 0x2b,
  Space: 0x2c,
  CapsLock: 0x39,

  // Functional
  F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,

  // Navigation
  PrintScreen: 0x46,
  ScrollLock: 0x47,
  Pause: 0x48,
  Insert: 0x49,
  Home: 0x4a,
  PageUp: 0x4b,
  Delete: 0x4c,
  End: 0x4d,
  PageDown: 0x4e,
  ArrowRight: 0x4f,
  ArrowLeft: 0x50,
  ArrowDown: 0x51,
  ArrowUp: 0x52,

  // Punctuation
  Minus: 0x2d,
  Equal: 0x2e,
  LeftBracket: 0x2f,
  RightBracket: 0x30,
  Backslash: 0x31,
  Semicolon: 0x33,
  Quote: 0x34,
  Grave: 0x35,
  Comma: 0x36,
  Dot: 0x37,
  Slash: 0x38,
  NonUsBackslash: 0x64, // ISO < > | key
};

export const AVAILABLE_SPECIAL_KEYS = [
  { key: 'Enter', label: 'Return / Enter' },
  { key: 'Tab', label: 'Tab ⇥' },
  { key: 'Space', label: 'Space ␣' },
  { key: 'Backspace', label: 'Backspace ⌫' },
  { key: 'Escape', label: 'Escape ⎋' },
  { key: 'Delete', label: 'Delete ⌦' },
  { key: 'ArrowUp', label: 'Up Arrow ↑' },
  { key: 'ArrowDown', label: 'Down Arrow ↓' },
  { key: 'ArrowLeft', label: 'Left Arrow ←' },
  { key: 'ArrowRight', label: 'Right Arrow →' },
  { key: 'F1', label: 'F1' },
  { key: 'F2', label: 'F2' },
  { key: 'F3', label: 'F3' },
  { key: 'F4', label: 'F4' },
  { key: 'F5', label: 'F5 (Refresh)' },
  { key: 'F6', label: 'F6' },
  { key: 'F7', label: 'F7' },
  { key: 'F8', label: 'F8' },
  { key: 'F9', label: 'F9' },
  { key: 'F10', label: 'F10' },
  { key: 'F11', label: 'F11 (Fullscreen)' },
  { key: 'F12', label: 'F12 (DevTools)' },
  { key: 'Home', label: 'Home' },
  { key: 'End', label: 'End' },
  { key: 'PageUp', label: 'Page Up' },
  { key: 'PageDown', label: 'Page Down' },
];

/**
 * Maps a single character into an HID report according to layout
 */
export function charToHidReport(char: string, layout: KeyboardLayoutId): HidKeyReport | null {
  if (layout === 'US') {
    return mapCharUs(char);
  } else {
    return mapCharDeQwertz(char);
  }
}

function mapCharUs(char: string): HidKeyReport | null {
  if (char >= 'a' && char <= 'z') {
    return { modifiers: 0, scancode: HID_KEY_CODES[char], char, label: char };
  }
  if (char >= 'A' && char <= 'Z') {
    return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES[char.toLowerCase()], char, label: char };
  }
  if (char >= '1' && char <= '9') {
    return { modifiers: 0, scancode: HID_KEY_CODES[char], char, label: char };
  }
  if (char === '0') {
    return { modifiers: 0, scancode: HID_KEY_CODES['0'], char, label: '0' };
  }

  switch (char) {
    case ' ': return { modifiers: 0, scancode: HID_KEY_CODES.Space, char, label: 'Space' };
    case '\n': return { modifiers: 0, scancode: HID_KEY_CODES.Enter, char, label: 'Enter' };
    case '\t': return { modifiers: 0, scancode: HID_KEY_CODES.Tab, char, label: 'Tab' };
    case '!': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['1'], char, label: '!' };
    case '@': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['2'], char, label: '@' };
    case '#': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['3'], char, label: '#' };
    case '$': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['4'], char, label: '$' };
    case '%': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['5'], char, label: '%' };
    case '^': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['6'], char, label: '^' };
    case '&': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['7'], char, label: '&' };
    case '*': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['8'], char, label: '*' };
    case '(': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['9'], char, label: '(' };
    case ')': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['0'], char, label: ')' };
    case '-': return { modifiers: 0, scancode: HID_KEY_CODES.Minus, char, label: '-' };
    case '_': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Minus, char, label: '_' };
    case '=': return { modifiers: 0, scancode: HID_KEY_CODES.Equal, char, label: '=' };
    case '+': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Equal, char, label: '+' };
    case '[': return { modifiers: 0, scancode: HID_KEY_CODES.LeftBracket, char, label: '[' };
    case '{': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.LeftBracket, char, label: '{' };
    case ']': return { modifiers: 0, scancode: HID_KEY_CODES.RightBracket, char, label: ']' };
    case '}': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.RightBracket, char, label: '}' };
    case '\\': return { modifiers: 0, scancode: HID_KEY_CODES.Backslash, char, label: '\\' };
    case '|': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Backslash, char, label: '|' };
    case ';': return { modifiers: 0, scancode: HID_KEY_CODES.Semicolon, char, label: ';' };
    case ':': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Semicolon, char, label: ':' };
    case '\'': return { modifiers: 0, scancode: HID_KEY_CODES.Quote, char, label: '\'' };
    case '"': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Quote, char, label: '"' };
    case '`': return { modifiers: 0, scancode: HID_KEY_CODES.Grave, char, label: '`' };
    case '~': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Grave, char, label: '~' };
    case ',': return { modifiers: 0, scancode: HID_KEY_CODES.Comma, char, label: ',' };
    case '<': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Comma, char, label: '<' };
    case '.': return { modifiers: 0, scancode: HID_KEY_CODES.Dot, char, label: '.' };
    case '>': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Dot, char, label: '>' };
    case '/': return { modifiers: 0, scancode: HID_KEY_CODES.Slash, char, label: '/' };
    case '?': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Slash, char, label: '?' };
    default: return null;
  }
}

function mapCharDeQwertz(char: string): HidKeyReport | null {
  // German Z <-> Y swap
  if (char === 'z') {
    return { modifiers: 0, scancode: HID_KEY_CODES.y, char, label: 'z (QWERTZ)' };
  }
  if (char === 'Z') {
    return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.y, char, label: 'Z (QWERTZ)' };
  }
  if (char === 'y') {
    return { modifiers: 0, scancode: HID_KEY_CODES.z, char, label: 'y (QWERTZ)' };
  }
  if (char === 'Y') {
    return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.z, char, label: 'Y (QWERTZ)' };
  }

  // Regular letters a-x
  if (char >= 'a' && char <= 'x') {
    return { modifiers: 0, scancode: HID_KEY_CODES[char], char, label: char };
  }
  if (char >= 'A' && char <= 'X') {
    return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES[char.toLowerCase()], char, label: char };
  }

  // Digits 0-9
  if (char >= '1' && char <= '9') {
    return { modifiers: 0, scancode: HID_KEY_CODES[char], char, label: char };
  }
  if (char === '0') {
    return { modifiers: 0, scancode: HID_KEY_CODES['0'], char, label: '0' };
  }

  // German Umlauts & ß
  switch (char) {
    case 'ä': return { modifiers: 0, scancode: HID_KEY_CODES.Quote, char, label: 'ä', isGermanSpecial: true };
    case 'Ä': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Quote, char, label: 'Ä', isGermanSpecial: true };
    case 'ö': return { modifiers: 0, scancode: HID_KEY_CODES.Semicolon, char, label: 'ö', isGermanSpecial: true };
    case 'Ö': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Semicolon, char, label: 'Ö', isGermanSpecial: true };
    case 'ü': return { modifiers: 0, scancode: HID_KEY_CODES.LeftBracket, char, label: 'ü', isGermanSpecial: true };
    case 'Ü': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.LeftBracket, char, label: 'Ü', isGermanSpecial: true };
    case 'ß': return { modifiers: 0, scancode: HID_KEY_CODES.Minus, char, label: 'ß', isGermanSpecial: true };
    case 'ẞ': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Minus, char, label: 'ẞ', isGermanSpecial: true };

    // Whitespace
    case ' ': return { modifiers: 0, scancode: HID_KEY_CODES.Space, char, label: 'Space' };
    case '\n': return { modifiers: 0, scancode: HID_KEY_CODES.Enter, char, label: 'Enter' };
    case '\t': return { modifiers: 0, scancode: HID_KEY_CODES.Tab, char, label: 'Tab' };

    // German shifted numbers
    case '!': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['1'], char, label: '!' };
    case '"': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['2'], char, label: '"' };
    case '§': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['3'], char, label: '§', isGermanSpecial: true };
    case '$': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['4'], char, label: '$' };
    case '%': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['5'], char, label: '%' };
    case '&': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['6'], char, label: '&' };
    case '/': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['7'], char, label: '/' };
    case '(': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['8'], char, label: '(' };
    case ')': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['9'], char, label: ')' };
    case '=': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES['0'], char, label: '=' };
    case '?': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Minus, char, label: '?' };

    // German AltGr combinations
    case '@': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES.q, char, label: '@ (AltGr+Q)', isGermanSpecial: true };
    case '€': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES.e, char, label: '€ (AltGr+E)', isGermanSpecial: true };
    case '{': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES['7'], char, label: '{ (AltGr+7)', isGermanSpecial: true };
    case '[': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES['8'], char, label: '[ (AltGr+8)', isGermanSpecial: true };
    case ']': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES['9'], char, label: '] (AltGr+9)', isGermanSpecial: true };
    case '}': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES['0'], char, label: '} (AltGr+0)', isGermanSpecial: true };
    case '\\': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES.Minus, char, label: '\\ (AltGr+ß)', isGermanSpecial: true };
    case '~': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES.RightBracket, char, label: '~ (AltGr+])', isGermanSpecial: true };
    case '|': return { modifiers: MOD_RALT, scancode: HID_KEY_CODES.NonUsBackslash, char, label: '| (AltGr+<)', isGermanSpecial: true };

    // Punctuation
    case ',': return { modifiers: 0, scancode: HID_KEY_CODES.Comma, char, label: ',' };
    case ';': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Comma, char, label: ';' };
    case '.': return { modifiers: 0, scancode: HID_KEY_CODES.Dot, char, label: '.' };
    case ':': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Dot, char, label: ':' };
    case '-': return { modifiers: 0, scancode: HID_KEY_CODES.Slash, char, label: '-' };
    case '_': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Slash, char, label: '_' };
    case '<': return { modifiers: 0, scancode: HID_KEY_CODES.NonUsBackslash, char, label: '<' };
    case '>': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.NonUsBackslash, char, label: '>' };
    case '+': return { modifiers: 0, scancode: HID_KEY_CODES.RightBracket, char, label: '+' };
    case '*': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.RightBracket, char, label: '*' };
    case '#': return { modifiers: 0, scancode: HID_KEY_CODES.Backslash, char, label: '#' };
    case '\'': return { modifiers: MOD_LSHIFT, scancode: HID_KEY_CODES.Backslash, char, label: '\'' };

    default: return null;
  }
}

/**
 * Translates a complete string into a sequence of HID key reports
 */
export function stringToHidReports(str: string, layout: KeyboardLayoutId): {
  reports: HidKeyReport[];
  unsupportedChars: string[];
} {
  const reports: HidKeyReport[] = [];
  const unsupportedChars: string[] = [];

  for (const ch of str) {
    const rep = charToHidReport(ch, layout);
    if (rep) {
      reports.push(rep);
    } else {
      if (!unsupportedChars.includes(ch)) {
        unsupportedChars.push(ch);
      }
    }
  }

  return { reports, unsupportedChars };
}
