#pragma once

#include <Arduino.h>

// Firmware metadata
#define FIRMWARE_VERSION "1.2.0"
#define HARDWARE_TARGET "ESP32-S3-DevKitC-1-N16R8"
#define USB_HID_MANUFACTURER "HydrogenForge"
#define USB_HID_PRODUCT "Hydrogen Forge HID Keyboard"
#define NVS_NAMESPACE "macro_cfg"

// Hardware Pin Definitions
#define PIN_RECOVERY_BOOT 0       // GPIO0 (BOOT button) held for 10s triggers factory reset
#define PIN_STATUS_LED    48      // On-board RGB LED pin on ESP32-S3-DevKitC-1 (or GPIO 21 on variants)

// BLE GATT Service & Characteristic UUIDs
#define BLE_SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_CHAR_AUTH_UUID         "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_CHAR_COMMAND_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_CHAR_STATUS_UUID       "6E400004-B5A3-F393-E0A9-E50E24DCCA9E"

// Macro limits & execution constraints
#define MAX_MACRO_ACTIONS          128
#define MAX_TEXT_LENGTH            512
#define MAX_PAYLOAD_BYTES          1024
#define DEFAULT_EXECUTION_TIMEOUT_MS 15000
#define MAX_FAILED_AUTH_ATTEMPTS   5
#define AUTH_LOCKOUT_MS            60000
#define SESSION_EXPIRY_MS          3600000  // 1 hour
