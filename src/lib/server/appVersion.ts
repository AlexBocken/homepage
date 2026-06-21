// Latest published native-app version, derived from the Tauri config at build
// time. The Android shell loads the live site (frontendDist = https://bocken.org),
// so this reflects whatever version the website was last deployed with — the
// in-app update check compares it against the installed APK's version.
import tauriConf from '../../../src-tauri/tauri.conf.json';

export const LATEST_APP_VERSION: string = tauriConf.version;
