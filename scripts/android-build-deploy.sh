#!/usr/bin/env bash
set -euo pipefail

# Android SDK environment
export ANDROID_HOME=/opt/android-sdk
export NDK_HOME=/opt/android-sdk/ndk/27.0.12077973
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk

APK_DIR="src-tauri/gen/android/app/build/outputs/apk/universal/release"
APK_UNSIGNED="$APK_DIR/app-universal-release-unsigned.apk"
APK_SIGNED="$APK_DIR/app-universal-release-signed.apk"
KEYSTORE="src-tauri/debug.keystore"
PACKAGE="org.bocken.app"

MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"
TAURI_CONF="src-tauri/tauri.conf.json"
DEV_SERVER="http://192.168.1.4:5173"
PROD_DIST="https://bocken.org"

usage() {
    echo "Usage: $0 [build|deploy|run|debug]"
    echo "  build   - Build and sign the APK"
    echo "  deploy  - Build + install on connected device"
    echo "  run     - Build + install + launch on device"
    echo "  debug   - Deploy pointing at local dev server (cleartext enabled)"
    exit 1
}

ensure_keystore() {
    if [ ! -f "$KEYSTORE" ]; then
        echo ":: Generating debug keystore..."
        keytool -genkey -v -keystore "$KEYSTORE" \
            -alias debug -keyalg RSA -keysize 2048 -validity 10000 \
            -storepass android -keypass android \
            -dname "CN=Debug,O=Bocken,C=DE"
    fi
}

ensure_android_project() {
    local id_path
    id_path="src-tauri/gen/android/app/src/main/java/$(echo "$PACKAGE" | tr '.' '/')"
    if [ ! -d "$id_path" ]; then
        echo ":: Android project missing or identifier changed, regenerating..."
        rm -rf src-tauri/gen/android
        pnpm tauri android init
    fi
}

build() {
    ensure_android_project

    echo ":: Building Android APK..."
    pnpm tauri android build --apk

    ensure_keystore

    echo ":: Signing APK..."
    # zipalign
    "$ANDROID_HOME/build-tools/35.0.0/zipalign" -f -v 4 \
        "$APK_UNSIGNED" "$APK_SIGNED" > /dev/null

    # sign with apksigner
    "$ANDROID_HOME/build-tools/35.0.0/apksigner" sign \
        --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android \
        "$APK_SIGNED"

    echo ":: Signed APK at: $APK_SIGNED"
}

deploy() {
    if ! adb devices | grep -q "device$"; then
        echo "!! No device connected. Connect your phone and enable USB debugging."
        exit 1
    fi

    build

    echo ":: Installing APK on device..."
    adb install -r "$APK_SIGNED"
    echo ":: Installed successfully."
}

run() {
    deploy

    echo ":: Launching app..."
    adb shell am start -n "$PACKAGE/.MainActivity"
    echo ":: App launched."
}

enable_debug() {
    echo ":: Enabling debug config (cleartext + local dev server)..."
    sed -i 's|\${usesCleartextTraffic}|true|' "$MANIFEST"
    sed -i "s|\"frontendDist\": \"$PROD_DIST\"|\"frontendDist\": \"$DEV_SERVER\"|" "$TAURI_CONF"
}

restore_release() {
    echo ":: Restoring release config..."
    sed -i 's|android:usesCleartextTraffic="true"|android:usesCleartextTraffic="${usesCleartextTraffic}"|' "$MANIFEST"
    sed -i "s|\"frontendDist\": \"$DEV_SERVER\"|\"frontendDist\": \"$PROD_DIST\"|" "$TAURI_CONF"
}

debug() {
    enable_debug
    trap restore_release EXIT
    deploy
}

case "${1:-}" in
    build)  build ;;
    deploy) deploy ;;
    run)    run ;;
    debug)  debug ;;
    *)      usage ;;
esac
