#pragma once

#include <Arduino.h>

enum KeyboardLayout {
    LAYOUT_US = 0,
    LAYOUT_DE_QWERTZ = 1
};

// Standard USB HID Modifiers (Usage Page 0x07)
#define KEY_MOD_NONE      0x00
#define KEY_MOD_LCTRL     0x01
#define KEY_MOD_LSHIFT    0x02
#define KEY_MOD_LALT      0x04
#define KEY_MOD_LMETA     0x08  // Windows / Command key
#define KEY_MOD_RCTRL     0x10
#define KEY_MOD_RSHIFT    0x20
#define KEY_MOD_RALT      0x40  // AltGr on European keyboards
#define KEY_MOD_RMETA     0x80

// USB HID Usage IDs for standard keys
#define HID_KEY_A         0x04
#define HID_KEY_B         0x05
#define HID_KEY_C         0x06
#define HID_KEY_D         0x07
#define HID_KEY_E         0x08
#define HID_KEY_F         0x09
#define HID_KEY_G         0x0A
#define HID_KEY_H         0x0B
#define HID_KEY_I         0x0C
#define HID_KEY_J         0x0D
#define HID_KEY_K         0x0E
#define HID_KEY_L         0x0F
#define HID_KEY_M         0x10
#define HID_KEY_N         0x11
#define HID_KEY_O         0x12
#define HID_KEY_P         0x13
#define HID_KEY_Q         0x14
#define HID_KEY_R         0x15
#define HID_KEY_S         0x16
#define HID_KEY_T         0x17
#define HID_KEY_U         0x18
#define HID_KEY_V         0x19
#define HID_KEY_W         0x1A
#define HID_KEY_X         0x1B
#define HID_KEY_Y         0x1C
#define HID_KEY_Z         0x1D

#define HID_KEY_1         0x1E
#define HID_KEY_2         0x1F
#define HID_KEY_3         0x20
#define HID_KEY_4         0x21
#define HID_KEY_5         0x22
#define HID_KEY_6         0x23
#define HID_KEY_7         0x24
#define HID_KEY_8         0x25
#define HID_KEY_9         0x26
#define HID_KEY_0         0x27

#define HID_KEY_ENTER     0x28
#define HID_KEY_ESCAPE    0x29
#define HID_KEY_BACKSPACE 0x2A
#define HID_KEY_TAB       0x2B
#define HID_KEY_SPACE     0x2C
#define HID_KEY_MINUS     0x2D
#define HID_KEY_EQUAL     0x2E
#define HID_KEY_LEFTBRACE 0x2F
#define HID_KEY_RIGHTBRACE 0x30
#define HID_KEY_BACKSLASH 0x31
#define HID_KEY_SEMICOLON 0x33
#define HID_KEY_QUOTE     0x34
#define HID_KEY_GRAVE     0x35
#define HID_KEY_COMMA     0x36
#define HID_KEY_DOT       0x37
#define HID_KEY_SLASH     0x38
#define HID_KEY_CAPSLOCK  0x39

#define HID_KEY_F1        0x3A
#define HID_KEY_F2        0x3B
#define HID_KEY_F3        0x3C
#define HID_KEY_F4        0x3D
#define HID_KEY_F5        0x3E
#define HID_KEY_F6        0x3F
#define HID_KEY_F7        0x40
#define HID_KEY_F8        0x41
#define HID_KEY_F9        0x42
#define HID_KEY_F10       0x43
#define HID_KEY_F11       0x44
#define HID_KEY_F12       0x45

#define HID_KEY_UP        0x52
#define HID_KEY_DOWN      0x51
#define HID_KEY_LEFT      0x50
#define HID_KEY_RIGHT     0x4F

// Non-US / German specific HID keycodes
#define HID_KEY_NONUS_BACKSLASH 0x64 // < > | key on ISO German keyboard

struct HidKeyMapping {
    uint8_t modifiers;
    uint8_t scancode;
};

// Translates a UTF-8 character or ASCII byte into HID report according to layout
inline HidKeyMapping mapCharToHid(uint32_t codepoint, KeyboardLayout layout) {
    HidKeyMapping rep = {KEY_MOD_NONE, 0};

    if (layout == LAYOUT_US) {
        // Standard US Layout
        if (codepoint >= 'a' && codepoint <= 'z') {
            rep.scancode = HID_KEY_A + (codepoint - 'a');
        } else if (codepoint >= 'A' && codepoint <= 'Z') {
            rep.modifiers = KEY_MOD_LSHIFT;
            rep.scancode = HID_KEY_A + (codepoint - 'A');
        } else if (codepoint >= '1' && codepoint <= '9') {
            rep.scancode = HID_KEY_1 + (codepoint - '1');
        } else if (codepoint == '0') {
            rep.scancode = HID_KEY_0;
        } else {
            switch (codepoint) {
                case ' ': rep.scancode = HID_KEY_SPACE; break;
                case '\n': case '\r': rep.scancode = HID_KEY_ENTER; break;
                case '\t': rep.scancode = HID_KEY_TAB; break;
                case '!': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_1; break;
                case '@': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_2; break;
                case '#': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_3; break;
                case '$': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_4; break;
                case '%': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_5; break;
                case '^': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_6; break;
                case '&': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_7; break;
                case '*': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_8; break;
                case '(': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_9; break;
                case ')': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_0; break;
                case '-': rep.scancode = HID_KEY_MINUS; break;
                case '_': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_MINUS; break;
                case '=': rep.scancode = HID_KEY_EQUAL; break;
                case '+': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_EQUAL; break;
                case '[': rep.scancode = HID_KEY_LEFTBRACE; break;
                case '{': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_LEFTBRACE; break;
                case ']': rep.scancode = HID_KEY_RIGHTBRACE; break;
                case '}': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_RIGHTBRACE; break;
                case '\\': rep.scancode = HID_KEY_BACKSLASH; break;
                case '|': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_BACKSLASH; break;
                case ';': rep.scancode = HID_KEY_SEMICOLON; break;
                case ':': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_SEMICOLON; break;
                case '\'': rep.scancode = HID_KEY_QUOTE; break;
                case '"': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_QUOTE; break;
                case '`': rep.scancode = HID_KEY_GRAVE; break;
                case '~': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_GRAVE; break;
                case ',': rep.scancode = HID_KEY_COMMA; break;
                case '<': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_COMMA; break;
                case '.': rep.scancode = HID_KEY_DOT; break;
                case '>': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_DOT; break;
                case '/': rep.scancode = HID_KEY_SLASH; break;
                case '?': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_SLASH; break;
            }
        }
    } else {
        // German QWERTZ Layout
        if (codepoint == 'z') {
            rep.scancode = HID_KEY_Y; // Z on German layout occupies physical Y key
        } else if (codepoint == 'Z') {
            rep.modifiers = KEY_MOD_LSHIFT;
            rep.scancode = HID_KEY_Y;
        } else if (codepoint == 'y') {
            rep.scancode = HID_KEY_Z; // Y on German layout occupies physical Z key
        } else if (codepoint == 'Y') {
            rep.modifiers = KEY_MOD_LSHIFT;
            rep.scancode = HID_KEY_Z;
        } else if (codepoint >= 'a' && codepoint <= 'x') {
            rep.scancode = HID_KEY_A + (codepoint - 'a');
        } else if (codepoint >= 'A' && codepoint <= 'X') {
            rep.modifiers = KEY_MOD_LSHIFT;
            rep.scancode = HID_KEY_A + (codepoint - 'A');
        } else if (codepoint >= '1' && codepoint <= '9') {
            rep.scancode = HID_KEY_1 + (codepoint - '1');
        } else if (codepoint == '0') {
            rep.scancode = HID_KEY_0;
        } else {
            switch (codepoint) {
                // German Umlauts and Eszett
                case 0x00E4: /* ä */ rep.scancode = HID_KEY_QUOTE; break;
                case 0x00C4: /* Ä */ rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_QUOTE; break;
                case 0x00F6: /* ö */ rep.scancode = HID_KEY_SEMICOLON; break;
                case 0x00D6: /* Ö */ rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_SEMICOLON; break;
                case 0x00FC: /* ü */ rep.scancode = HID_KEY_LEFTBRACE; break;
                case 0x00DC: /* Ü */ rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_LEFTBRACE; break;
                case 0x00DF: /* ß */ rep.scancode = HID_KEY_MINUS; break;
                case 0x1E9E: /* ẞ */ rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_MINUS; break;

                // Whitespace
                case ' ': rep.scancode = HID_KEY_SPACE; break;
                case '\n': case '\r': rep.scancode = HID_KEY_ENTER; break;
                case '\t': rep.scancode = HID_KEY_TAB; break;

                // Numbers row shifted
                case '!': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_1; break;
                case '"': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_2; break;
                case 0x00A7: /* § */ rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_3; break;
                case '$': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_4; break;
                case '%': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_5; break;
                case '&': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_6; break;
                case '/': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_7; break;
                case '(': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_8; break;
                case ')': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_9; break;
                case '=': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_0; break;
                case '?': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_MINUS; break;

                // AltGr combinations on German keyboards
                case '@': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_Q; break;
                case 0x20AC: /* € */ rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_E; break;
                case '{': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_7; break;
                case '[': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_8; break;
                case ']': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_9; break;
                case '}': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_0; break;
                case '\\': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_MINUS; break;
                case '~': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_RIGHTBRACE; break;
                case '|': rep.modifiers = KEY_MOD_RALT; rep.scancode = HID_KEY_NONUS_BACKSLASH; break;

                // Standard punctuation on German layout
                case ',': rep.scancode = HID_KEY_COMMA; break;
                case ';': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_COMMA; break;
                case '.': rep.scancode = HID_KEY_DOT; break;
                case ':': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_DOT; break;
                case '-': rep.scancode = HID_KEY_SLASH; break;
                case '_': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_SLASH; break;
                case '<': rep.scancode = HID_KEY_NONUS_BACKSLASH; break;
                case '>': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_NONUS_BACKSLASH; break;
                case '+': rep.scancode = HID_KEY_RIGHTBRACE; break;
                case '*': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_RIGHTBRACE; break;
                case '#': rep.scancode = HID_KEY_BACKSLASH; break;
                case '\'': rep.modifiers = KEY_MOD_LSHIFT; rep.scancode = HID_KEY_BACKSLASH; break;
            }
        }
    }

    return rep;
}
