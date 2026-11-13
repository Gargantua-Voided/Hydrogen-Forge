#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include <mbedtls/sha256.h>
#include <mbedtls/md.h>
#include "config.h"

class DeviceAuth {
public:
    String deviceName;
    String username;
    String passwordSalt;
    String passwordVerifier; // Hex SHA-256 of salt + password
    bool isProvisioned = false;

    // Active session state
    bool isSessionActive = false;
    String currentChallenge;
    String activeSessionToken;
    unsigned long sessionStartTime = 0;

    // Rate limiting
    uint8_t failedAttempts = 0;
    unsigned long lockoutUntil = 0;

    bool init() {
        Preferences prefs;
        prefs.begin(NVS_NAMESPACE, true);
        isProvisioned = prefs.getBool("provisioned", false);
        if (isProvisioned) {
            deviceName = prefs.getString("dev_name", "ESP32S3-Macro");
            username = prefs.getString("username", "admin");
            passwordSalt = prefs.getString("salt", "");
            passwordVerifier = prefs.getString("verifier", "");
        } else {
            deviceName = "ESP32S3-Macro-Unconfigured";
        }
        prefs.end();
        return isProvisioned;
    }

    bool provision(const String& name, const String& user, const String& salt, const String& verifier) {
        if (name.length() == 0 || user.length() == 0 || verifier.length() == 0) {
            return false;
        }

        Preferences prefs;
        prefs.begin(NVS_NAMESPACE, false);
        prefs.putString("dev_name", name);
        prefs.putString("username", user);
        prefs.putString("salt", salt);
        prefs.putString("verifier", verifier);
        prefs.putBool("provisioned", true);
        prefs.end();

        deviceName = name;
        username = user;
        passwordSalt = salt;
        passwordVerifier = verifier;
        isProvisioned = true;
        return true;
    }

    void factoryReset() {
        Preferences prefs;
        prefs.begin(NVS_NAMESPACE, false);
        prefs.clear();
        prefs.end();
        isProvisioned = false;
        isSessionActive = false;
        deviceName = "ESP32S3-Macro-Unconfigured";
        username = "";
        passwordSalt = "";
        passwordVerifier = "";
    }

    // Generate 32-byte cryptographically secure random hex challenge
    String generateChallenge() {
        uint8_t randomBytes[32];
        for (int i = 0; i < 32; i += 4) {
            uint32_t r = esp_random();
            memcpy(randomBytes + i, &r, 4);
        }

        char hexBuf[65];
        for (int i = 0; i < 32; i++) {
            sprintf(hexBuf + (i * 2), "%02x", randomBytes[i]);
        }
        hexBuf[64] = 0;
        currentChallenge = String(hexBuf);
        return currentChallenge;
    }

    // Verify HMAC response: HMAC_SHA256(verifier, challenge + ":" + timestamp + ":" + nonce)
    bool verifyChallengeResponse(const String& user, const String& responseHmac, unsigned long timestamp, const String& nonce) {
        // Check rate limiting lockout
        if (millis() < lockoutUntil) {
            return false;
        }

        if (!isProvisioned || user != username || currentChallenge.length() == 0) {
            recordFailedAttempt();
            return false;
        }

        String payload = currentChallenge + ":" + String(timestamp) + ":" + nonce;
        String expectedHmac = computeHmacSha256(passwordVerifier, payload);

        if (expectedHmac.equalsIgnoreCase(responseHmac)) {
            // Authentication successful!
            failedAttempts = 0;
            isSessionActive = true;
            sessionStartTime = millis();
            activeSessionToken = generateChallenge(); // New token for session
            currentChallenge = ""; // Invalidate challenge
            return true;
        }

        recordFailedAttempt();
        return false;
    }

    bool validateSession(const String& token) {
        if (!isSessionActive || token.length() == 0) return false;
        if (millis() - sessionStartTime > SESSION_EXPIRY_MS) {
            invalidateSession();
            return false;
        }
        return (token == activeSessionToken);
    }

    void invalidateSession() {
        isSessionActive = false;
        activeSessionToken = "";
        currentChallenge = "";
    }

private:
    void recordFailedAttempt() {
        failedAttempts++;
        if (failedAttempts >= MAX_FAILED_AUTH_ATTEMPTS) {
            lockoutUntil = millis() + AUTH_LOCKOUT_MS;
        }
    }

    String computeHmacSha256(const String& key, const String& data) {
        uint8_t hmacResult[32];
        mbedtls_md_context_t ctx;
        mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

        mbedtls_md_init(&ctx);
        mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
        mbedtls_md_hmac_starts(&ctx, (const unsigned char*)key.c_str(), key.length());
        mbedtls_md_hmac_update(&ctx, (const unsigned char*)data.c_str(), data.length());
        mbedtls_md_hmac_finish(&ctx, hmacResult);
        mbedtls_md_free(&ctx);

        char hexBuf[65];
        for (int i = 0; i < 32; i++) {
            sprintf(hexBuf + (i * 2), "%02x", hmacResult[i]);
        }
        hexBuf[64] = 0;
        return String(hexBuf);
    }
};
