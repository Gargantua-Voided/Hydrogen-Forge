#include <Arduino.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "USB.h"
#include "USBHIDKeyboard.h"
#include "config.h"
#include "keyboard_layouts.h"
#include "auth.h"
#include "macro_engine.h"

// Hardware instances
USBHIDKeyboard Keyboard;
DeviceAuth auth;
MacroEngine macroEngine;

// BLE Server & Characteristics
NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pAuthChar = nullptr;
NimBLECharacteristic* pCommandChar = nullptr;
NimBLECharacteristic* pStatusChar = nullptr;
bool bleClientConnected = false;

// Boot button hardware recovery state
unsigned long bootButtonPressStart = 0;
bool bootButtonPressed = false;

// Forward declarations
void handleSerialCommands();
void setupBleServer();
void sendStatusNotification(const String& status, const String& details = "");

class ServerCallbacks: public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) {
        bleClientConnected = true;
        auth.generateChallenge();
    }

    void onDisconnect(NimBLEServer* pServer) {
        bleClientConnected = false;
        auth.invalidateSession();
        NimBLEDevice::startAdvertising();
    }
};

class AuthCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string rxVal = pCharacteristic->getValue();
        if (rxVal.empty()) return;

        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, rxVal);
        if (err) {
            static const char errJson[] = "{\"status\":\"ERROR\",\"message\":\"Malformed JSON\"}";
            pCharacteristic->setValue((const uint8_t*)errJson, sizeof(errJson) - 1);
            pCharacteristic->notify();
            return;
        }

        const char* cmd = doc["command"] | "";

        if (strcmp(cmd, "GET_CHALLENGE") == 0) {
            String ch = auth.generateChallenge();
            JsonDocument resp;
            resp["status"] = "OK";
            resp["challenge"] = ch;
            resp["salt"] = auth.passwordSalt;
            String respStr;
            serializeJson(resp, respStr);
            pCharacteristic->setValue((const uint8_t*)respStr.c_str(), respStr.length());
            pCharacteristic->notify();
        } 
        else if (strcmp(cmd, "AUTH") == 0) {
            const char* user = doc["username"] | "";
            const char* hmac = doc["hmac"] | "";
            uint64_t ts = doc["timestamp"] | (uint64_t)0;
            const char* nonce = doc["nonce"] | "";

            bool success = auth.verifyChallengeResponse(user, hmac, ts, nonce);
            JsonDocument resp;
            if (success) {
                resp["status"] = "AUTHENTICATED";
                resp["token"] = auth.activeSessionToken;
                resp["device_name"] = auth.deviceName;
                resp["firmware"] = FIRMWARE_VERSION;
            } else {
                resp["status"] = "UNAUTHORIZED";
                resp["message"] = "Invalid credentials or lockout active";
            }
            String respStr;
            serializeJson(resp, respStr);
            pCharacteristic->setValue((const uint8_t*)respStr.c_str(), respStr.length());
            pCharacteristic->notify();
        }
    }
};

class CommandCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string rxVal = pCharacteristic->getValue();
        if (rxVal.empty()) return;

        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, rxVal);
        if (err) {
            sendStatusNotification("ERROR", "Invalid JSON command");
            return;
        }

        const char* token = doc["token"] | "";
        if (!auth.validateSession(token)) {
            sendStatusNotification("AUTH_REQUIRED", "Session invalid or expired");
            return;
        }

        const char* action = doc["action"] | "";

        if (strcmp(action, "CANCEL") == 0) {
            macroEngine.cancelExecution();
            sendStatusNotification("CANCELED", "Macro canceled");
            return;
        }

        if (strcmp(action, "SET_LAYOUT") == 0) {
            const char* layoutStr = doc["layout"] | "DE_QWERTZ";
            if (strcmp(layoutStr, "US") == 0) {
                macroEngine.setLayout(LAYOUT_US);
            } else {
                macroEngine.setLayout(LAYOUT_DE_QWERTZ);
            }
            sendStatusNotification("LAYOUT_UPDATED", layoutStr);
            return;
        }

        if (strcmp(action, "EXECUTE_MACRO") == 0) {
            JsonArray actionsArray = doc["actions"].as<JsonArray>();
            std::vector<MacroAction> actionsList;

            for (JsonObject a : actionsArray) {
                MacroAction m;
                m.type = (ActionType)(a["type"].as<int>());
                m.textPayload = a["text"] | "";
                m.modifiers = a["modifiers"] | 0;
                m.scancode = a["scancode"] | 0;
                m.delayMs = a["delay"] | 0;
                actionsList.push_back(m);
            }

            sendStatusNotification("EXECUTING", String(actionsList.size()) + " actions");
            String errStr;
            bool ok = macroEngine.executeMacro(actionsList, errStr);
            if (ok) {
                sendStatusNotification("COMPLETED", "All actions typed successfully");
            } else {
                sendStatusNotification("FAILED", errStr);
            }
        }
    }
};

void sendStatusNotification(const String& status, const String& details) {
    if (pStatusChar && bleClientConnected) {
        JsonDocument doc;
        doc["status"] = status;
        doc["details"] = details;
        doc["timestamp"] = millis();
        String json;
        serializeJson(doc, json);
        pStatusChar->setValue((const uint8_t*)json.c_str(), json.length());
        pStatusChar->notify();
    }
}

void setup() {
    // UART0 (USB-to-UART port): Used for flashing, initial provisioning, and serial debugging
    // Connected to the controller computer (ARDUINO_USB_CDC_ON_BOOT=0 keeps Serial on UART0)
    Serial.begin(115200);
    pinMode(PIN_RECOVERY_BOOT, INPUT_PULLUP);
    pinMode(PIN_STATUS_LED, OUTPUT);

    // Native USB OTG port: Enumerates strictly as a standard USB HID Keyboard
    // Connected permanently to the target computer
    USB.manufacturerName(USB_HID_MANUFACTURER);
    USB.productName(USB_HID_PRODUCT);
    Keyboard.begin();
    USB.begin();

    // Initialize Auth & NVS
    auth.init();

    // Initialize BLE
    setupBleServer();

    Serial.println("\n====================================");
    Serial.println("HydroGen Macro Controller");
    Serial.printf("Firmware: %s\n", FIRMWARE_VERSION);
    Serial.printf("UART Port: Provisioning & Debug Ready\n");
    Serial.printf("USB OTG Port: Standard USB HID Keyboard\n");
    Serial.printf("Device: %s\n", auth.deviceName.c_str());
    Serial.printf("Status: %s\n", auth.isProvisioned ? "PROVISIONED" : "UNCONFIGURED");
    Serial.println("====================================");
    Serial.printf("{\"status\":\"READY\",\"firmware\":\"%s\",\"hardware\":\"%s\",\"is_provisioned\":%s}\n",
                  FIRMWARE_VERSION, HARDWARE_TARGET, auth.isProvisioned ? "true" : "false");
    Serial.flush();
}

void setupBleServer() {
    NimBLEDevice::init(auth.deviceName.c_str());
    NimBLEDevice::setMTU(512);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9); // Max TX power
    NimBLEDevice::setSecurityAuth(false, false, false); // Application-level HMAC auth used

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    NimBLEService* pService = pServer->createService(BLE_SERVICE_UUID);

    pAuthChar = pService->createCharacteristic(
        BLE_CHAR_AUTH_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    pAuthChar->setCallbacks(new AuthCallbacks());

    pCommandChar = pService->createCharacteristic(
        BLE_CHAR_COMMAND_UUID,
        NIMBLE_PROPERTY::WRITE
    );
    pCommandChar->setCallbacks(new CommandCallbacks());

    pStatusChar = pService->createCharacteristic(
        BLE_CHAR_STATUS_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    pService->start();

    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMaxPreferred(0x12);
    pAdvertising->start();
}

void loop() {
    handleSerialCommands();

    // Check BOOT button for 10-second hold factory reset
    if (digitalRead(PIN_RECOVERY_BOOT) == LOW) {
        if (!bootButtonPressed) {
            bootButtonPressed = true;
            bootButtonPressStart = millis();
        } else if (millis() - bootButtonPressStart > 10000) {
            // Held for 10 seconds -> Factory Reset!
            Serial.println("[SECURITY] BOOT button held 10s: Triggering Factory Reset!");
            auth.factoryReset();
            for (int i = 0; i < 10; i++) {
                digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
                delay(100);
            }
            ESP.restart();
        }
    } else {
        bootButtonPressed = false;
    }

    delay(20);
}

// Handle USB Serial Provisioning & Diagnosis commands
void handleSerialCommands() {
    static String serialRxBuffer = "";
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\r') continue;
        if (c != '\n') {
            if (serialRxBuffer.length() < 2048) {
                serialRxBuffer += c;
            }
            continue;
        }

        String line = serialRxBuffer;
        serialRxBuffer = "";
        line.trim();
        if (line.length() == 0) continue;

        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, line);
        if (err) {
            Serial.println("{\"status\":\"ERROR\",\"message\":\"Invalid JSON\"}");
            Serial.flush();
            continue;
        }

        const char* cmd = doc["command"] | "";

        if (strcmp(cmd, "PING") == 0) {
            JsonDocument resp;
            resp["status"] = "PONG";
            resp["firmware"] = FIRMWARE_VERSION;
            resp["hardware"] = HARDWARE_TARGET;
            resp["device_name"] = auth.deviceName;
            resp["is_provisioned"] = auth.isProvisioned;
            String out;
            serializeJson(resp, out);
            Serial.println(out);
            Serial.flush();
        }
    else if (strcmp(cmd, "PROVISION") == 0) {
        const char* name = doc["device_name"] | "";
        const char* user = doc["username"] | "";
        const char* salt = doc["salt"] | "";
        const char* verifier = doc["verifier"] | "";
        const char* layout = doc["layout"] | "DE_QWERTZ";

        if (auth.provision(name, user, salt, verifier)) {
            if (strcmp(layout, "US") == 0) {
                macroEngine.setLayout(LAYOUT_US);
            } else {
                macroEngine.setLayout(LAYOUT_DE_QWERTZ);
            }
            JsonDocument resp;
            resp["status"] = "PROVISIONED_SUCCESS";
            resp["device_name"] = auth.deviceName;
            resp["firmware"] = FIRMWARE_VERSION;
            String out;
            serializeJson(resp, out);
            Serial.println(out);
            Serial.flush();
            delay(200);
            ESP.restart();
        } else {
            Serial.println("{\"status\":\"ERROR\",\"message\":\"Provisioning validation failed\"}");
            Serial.flush();
        }
    }
    else if (strcmp(cmd, "FACTORY_RESET") == 0) {
        auth.factoryReset();
        Serial.println("{\"status\":\"RESET_OK\",\"message\":\"Credentials cleared\"}");
        Serial.flush();
        delay(200);
        ESP.restart();
    }
    }
}
