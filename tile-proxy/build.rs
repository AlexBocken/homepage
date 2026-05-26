// Reads `tile-proxy/.env` (gitignored, KEY=VALUE per line, `#` comments) and
// forwards each entry to rustc as `--env KEY=VALUE`, so `option_env!("KEY")`
// in main.rs picks the value up at compile time. This keeps secrets like
// THUNDERFOREST_API_KEY out of the shell and out of git — the key is read
// once at build time and baked into the binary; the running process never
// touches the file.
//
// `cargo:rerun-if-changed=.env` forces a recompile whenever the file is
// edited (set, unset, rotated), so a stale key never lingers in the cached
// binary. We also watch the env var of the same name so explicit
// `THUNDERFOREST_API_KEY=... cargo build` still works (env var wins over
// .env, mirroring how dotenv-style tools behave).
use std::fs;

fn main() {
    println!("cargo:rerun-if-changed=.env");
    println!("cargo:rerun-if-env-changed=THUNDERFOREST_API_KEY");

    let Ok(contents) = fs::read_to_string(".env") else {
        return; // .env is optional — the binary falls back to OpenTopoMap.
    };

    for raw in contents.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        // Strip optional surrounding quotes around the value, then trim.
        let value = value.trim().trim_matches('"').trim_matches('\'');
        if key.is_empty() {
            continue;
        }
        // Explicit shell env var beats the .env entry — same precedence as
        // standard dotenv tooling. std::env::var here reflects what was set
        // on the cargo invocation.
        if std::env::var_os(key).is_some() {
            continue;
        }
        println!("cargo:rustc-env={key}={value}");
    }
}
