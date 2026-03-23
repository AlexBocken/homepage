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
PACKAGE="org.bocken.fitness"

usage() {
    echo "Usage: $0 [build|deploy|run]"
    echo "  build   - Build and sign the APK"
    echo "  deploy  - Build + install on connected device"
    echo "  run     - Build + install + launch on device"
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

build() {
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

case "${1:-}" in
    build)  build ;;
    deploy) deploy ;;
    run)    run ;;
    *)      usage ;;
esac
