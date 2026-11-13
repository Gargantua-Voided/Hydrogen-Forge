# ESP32-S3-DevKitC-1-N16R8 Firmware

## USB Port Assignment
The `ESP32-S3-DevKitC-1-N16R8` board has two independent USB ports:

1. **USB-to-UART** (`UART` port, CP210x / CH343 bridge)
   - Connected to the **Controller Computer** (running this PWA)
   - Used for **firmware flashing** via Web Serial (`esptool-js`)
   - Used for **initial provisioning** (transferring device name, username, salt, and verifier into NVS)
   - Used for **serial debugging** (`115200` baud on UART0)

2. **Native USB OTG** (`USB` port, GPIO 19/20)
   - Connected permanently to the **Target Computer**
   - Enumerates strictly as a **standard USB HID Keyboard** (`ARDUINO_USB_MODE=0`, `ARDUINO_USB_CDC_ON_BOOT=0`)
   - Types received macro sequences and text strings into whichever application is focused on the target computer

## Physical Recovery
Hold the hardware **BOOT** button (`GPIO0`) for 10 seconds to clear stored NVS credentials.

## Building with PlatformIO
```bash
cd firmware
pio run
```
