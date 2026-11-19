#pragma once

#include <Arduino.h>
#include <vector>
#include "USB.h"
#include "USBHIDKeyboard.h"
#include "keyboard_layouts.h"
#include "config.h"

extern USBHIDKeyboard Keyboard;

enum ActionType {
    ACTION_TYPE_TEXT = 1,
    ACTION_PRESS_KEY = 2,
    ACTION_COMBINATION = 3,
    ACTION_DELAY = 4,
    ACTION_RELEASE_ALL = 5
};

struct MacroAction {
    ActionType type;
    String textPayload;
    uint8_t modifiers;
    uint8_t scancode;
    uint32_t delayMs;
};

class MacroEngine {
public:
    KeyboardLayout currentLayout = LAYOUT_DE_QWERTZ; // Default to German QWERTZ
    bool isExecuting = false;
    bool cancelRequested = false;

    void setLayout(KeyboardLayout layout) {
        currentLayout = layout;
    }

    void cancelExecution() {
        cancelRequested = true;
        Keyboard.releaseAll();
    }

    bool executeMacro(const std::vector<MacroAction>& actions, String& outError) {
        if (actions.empty()) {
            outError = "Empty action list";
            return false;
        }

        if (actions.size() > MAX_MACRO_ACTIONS) {
            outError = "Action count exceeds maximum limit";
            return false;
        }

        isExecuting = true;
        cancelRequested = false;
        unsigned long startTime = millis();

        for (size_t i = 0; i < actions.size(); i++) {
            if (cancelRequested) {
                Keyboard.releaseAll();
                isExecuting = false;
                outError = "Execution canceled by user";
                return false;
            }

            if (millis() - startTime > DEFAULT_EXECUTION_TIMEOUT_MS) {
                Keyboard.releaseAll();
                isExecuting = false;
                outError = "Macro execution timed out";
                return false;
            }

            const MacroAction& act = actions[i];

            switch (act.type) {
                case ACTION_TYPE_TEXT:
                    typeUtf8String(act.textPayload);
                    break;

                case ACTION_PRESS_KEY:
                    if (act.scancode != 0) {
                        Keyboard.pressRaw(act.scancode);
                        delay(20);
                        Keyboard.releaseRaw(act.scancode);
                    }
                    break;

                case ACTION_COMBINATION:
                    // Apply modifiers
                    if (act.modifiers & KEY_MOD_LCTRL) Keyboard.pressRaw(0xE0);
                    if (act.modifiers & KEY_MOD_LSHIFT) Keyboard.pressRaw(0xE1);
                    if (act.modifiers & KEY_MOD_LALT) Keyboard.pressRaw(0xE2);
                    if (act.modifiers & KEY_MOD_LMETA) Keyboard.pressRaw(0xE3);
                    if (act.modifiers & KEY_MOD_RALT) Keyboard.pressRaw(0xE6); // AltGr

                    delay(15);
                    if (act.scancode != 0) {
                        Keyboard.pressRaw(act.scancode);
                        delay(25);
                        Keyboard.releaseRaw(act.scancode);
                    }
                    delay(15);
                    Keyboard.releaseAll();
                    break;

                case ACTION_DELAY:
                    {
                        uint32_t remaining = act.delayMs;
                        while (remaining > 0 && !cancelRequested) {
                            uint32_t step = min((uint32_t)50, remaining);
                            delay(step);
                            remaining -= step;
                        }
                    }
                    break;

                case ACTION_RELEASE_ALL:
                    Keyboard.releaseAll();
                    break;
            }

            delay(10); // Inter-action buffer
        }

        Keyboard.releaseAll();
        isExecuting = false;
        return true;
    }

private:
    void typeUtf8String(const String& str) {
        size_t len = str.length();
        size_t i = 0;

        while (i < len && !cancelRequested) {
            uint32_t codepoint = 0;
            uint8_t byte0 = (uint8_t)str[i];

            if ((byte0 & 0x80) == 0) {
                codepoint = byte0;
                i += 1;
            } else if ((byte0 & 0xE0) == 0xC0 && i + 1 < len) {
                codepoint = ((byte0 & 0x1F) << 6) | ((uint8_t)str[i + 1] & 0x3F);
                i += 2;
            } else if ((byte0 & 0xF0) == 0xE0 && i + 2 < len) {
                codepoint = ((byte0 & 0x0F) << 12) | (((uint8_t)str[i + 1] & 0x3F) << 6) | ((uint8_t)str[i + 2] & 0x3F);
                i += 3;
            } else {
                i += 1; // Skip unrecognized byte
                continue;
            }

            HidKeyMapping rep = mapCharToHid(codepoint, currentLayout);
            if (rep.scancode != 0) {
                // Apply modifiers
                if (rep.modifiers & KEY_MOD_LSHIFT) Keyboard.pressRaw(0xE1);
                if (rep.modifiers & KEY_MOD_RALT) Keyboard.pressRaw(0xE6); // AltGr

                delay(12);
                Keyboard.pressRaw(rep.scancode);
                delay(15);
                Keyboard.releaseRaw(rep.scancode);

                if (rep.modifiers & KEY_MOD_LSHIFT) Keyboard.releaseRaw(0xE1);
                if (rep.modifiers & KEY_MOD_RALT) Keyboard.releaseRaw(0xE6);
                delay(10);
            }
        }
    }
};
