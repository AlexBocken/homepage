# anki-bridge

Lets people sync Anki against our own server using their normal Bocken
(Authentik) credentials. It is a small reverse proxy in front of Anki's built-in
sync server, which it also supervises.

```
Anki desktop / AnkiDroid
        │  https://anki.bocken.org/
        ▼
      nginx ─────────────► bridge :8092 ─────────────► anki --syncserver :27701
                               │                          (child process)
                               └──► Authentik (flow executor + admin API)
```

## Why a separate service

Anki's sync server has no notion of external identity. Its accounts are
`SYNC_USER1`, `SYNC_USER2`, … environment variables in `username:password` form,
read **once at startup** — there is no runtime API for adding one. Rather than
maintaining a patched Anki, the bridge keeps a per-user account of its own and
respawns the server when the list changes.

Users never learn those credentials. They type their Authentik username and
password into Anki; the bridge checks them and substitutes the managed account.

## How it works

Exactly one request in the sync protocol carries a password: `POST
/sync/hostKey`. Everything after it authenticates with the session key
(`hkey`) that request returns. So the bridge only inspects that one route, and
streams everything else through untouched.

On `/sync/hostKey` it:

1. unwraps the zstd-compressed `{"u", "p"}` body,
2. resolves whatever was typed — username **or** email address — to the
   canonical Authentik username (see below),
3. verifies the password by driving Authentik's authentication flow (the same
   technique as the website's `verifyPassword()` — Authentik has no
   "check password" endpoint),
4. requires membership of `anki_users`,
5. creates a sync account for the user if this is their first login, respawning
   the sync server so it picks it up,
6. forwards the request with the managed credentials and returns the sync
   server's own reply.

### Username or email

Both work, and both land on the **same** sync account. The identifier is
canonicalised to the Authentik username before anything is keyed off it —
provisioning on the raw input would give one person two accounts and two
collections that then silently drift apart. Email matching is
case-insensitive; an email shared by two accounts is rejected rather than
guessed, since Authentik does not enforce uniqueness there.

The password itself is submitted to Authentik exactly as typed, so the bridge
accepts precisely the identifiers your authentication flow's identification
stage is configured for. Authentik's default flow lists both username and
email; if yours has been narrowed to one, the bridge follows it.

### Why respawning is safe

Anki derives the session key as `hkey = sha1("username:password")` over the raw
env string (`derive_hkey`, `rslib/src/sync/http_server/mod.rs`). It is not random
and not stored, so **a restart does not log anybody out** — every client's key
still matches. Restarting only interrupts syncs that are in flight at that
moment, and the supervisor waits for those to finish (up to `DRAIN_TIMEOUT`)
before pulling the server down. Clients that do get cut simply retry.

This only happens on a user's *first ever* login. `tests/test_integration.py`
verifies both halves of this against a real `anki --syncserver`.

### Revoking access

Session keys never expire on their own, so two mechanisms cover revocation:

- **Group check.** Every proxied request re-checks `anki_users` membership,
  cached for `GROUP_CACHE_TTL` (default 1 h). Remove someone from the group and
  they stop syncing within the hour. If Authentik is unreachable the last known
  answer is reused, so an SSO outage does not cut off active users.
- **Rotation.** `AccountStore.rotate(username)` issues a new secret, which
  changes the hkey and immediately invalidates every client logged in as that
  user. Use it if a key is believed compromised:

  ```sh
  sudo -u anki-bridge venv/bin/python -c \
    "from accounts import AccountStore; AccountStore('/var/lib/anki-bridge/accounts.db').rotate('alex')"
  sudo systemctl restart anki-bridge
  ```

## Install on the server

The unit expects the service at `/usr/share/webapps/homepage/anki-bridge` (next
to the deployed site), with its venv created **there** so absolute paths resolve.
`anki` itself must be installed on the host (`pacman -S anki`) — only the
`--syncserver` mode is used, no GUI, no X.

```sh
sudo install -d /usr/share/webapps/homepage/anki-bridge
sudo cp app.py accounts.py authentik.py supervisor.py requirements.txt \
        /usr/share/webapps/homepage/anki-bridge/
cd /usr/share/webapps/homepage/anki-bridge

uv venv venv
uv pip install --python venv/bin/python -r requirements.txt
# …or plain venv:
#   python -m venv venv && ./venv/bin/pip install -r requirements.txt
```

Then the secrets file:

```sh
sudo install -d -m 700 /etc/anki-bridge
sudo tee /etc/anki-bridge/env >/dev/null <<'EOF'
AUTHENTIK_ISSUER=https://sso.bocken.org/application/o/main/
AUTHENTIK_API_TOKEN=<service-account token, needs read on core/users>
BRIDGE_TOKEN=<random; the website sends this on /internal/*>
ANKI_SYNC_PUBLIC_URL=https://anki.bocken.org/
EOF
sudo chmod 600 /etc/anki-bridge/env
```

`AUTHENTIK_API_TOKEN` only needs to read users (for group membership). It is the
same kind of token the website uses; a separate one is preferable so it can be
revoked independently.

## Run as a service

```sh
sudo cp anki-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now anki-bridge
curl -s localhost:8092/health
```

The unit is hardened, with one deliberate difference from `cospend-ocr` and
`finance-service`: **no `IPAddressDeny=any`**, because this service must reach
Authentik. If your Authentik runs on the same host, uncomment the
`IPAddressDeny`/`IPAddressAllow=localhost` pair in the unit; otherwise add the
SSO host's address to `IPAddressAllow`.

## nginx

Anki uploads whole collections, so the defaults will not do — buffering a
100 MB body to disk before forwarding it will time the client out.

```nginx
server {
    server_name anki.bocken.org;

    client_max_body_size 250m;        # must exceed MAX_SYNC_PAYLOAD_MEGS
    proxy_request_buffering off;      # stream full-sync uploads
    proxy_buffering off;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    # The website talks to /internal/ over loopback. Nothing outside should.
    location /internal/ { return 404; }

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Wire up the website

The site reads these from its `.env` (and `.env_prod`, since
`scripts/deploy.sh` builds against that), inlined at build time:

```
ANKI_BRIDGE_URL=http://127.0.0.1:8092
ANKI_BRIDGE_TOKEN=<same value as BRIDGE_TOKEN above>
ANKI_SYNC_PUBLIC_URL=https://anki.bocken.org/
```

Users also need the `anki_users` group, which they can request themselves from
the settings page.

## Using it from Anki

Tools → Preferences → Syncing → *Self-hosted sync server*:
`https://anki.bocken.org/`. Then sync and log in with your normal Bocken
password, and either your username or your email address. Anki says "AnkiWeb"
throughout even with a custom server configured — that is Anki's wording, not a
misconfiguration.

## Tests

```sh
./venv/bin/pytest              # includes the integration tests if anki is installed
./venv/bin/pytest -m "not integration"
```

The integration suite boots a real `anki --syncserver` on a temporary
`SYNC_BASE` and checks the protocol assumptions the design depends on — the hkey
derivation, and that a restart preserves sessions. Run it after any Anki upgrade;
it is the thing that will tell you if the protocol moved.

## Operations

- **State** lives in `/var/lib/anki-bridge`: `accounts.db` plus one collection
  folder per user under `sync/`.
- **`accounts.db` is secret material.** The session key is derivable from what
  it stores, so anyone who reads the file has remote read/write on every user's
  collection. Hashing the column would not change that — Anki hashes whatever
  string is in the env to make the key. Keep backups encrypted.
- **Collections are the users' only copy on this server.** Back up
  `/var/lib/anki-bridge/sync` along with everything else; a lost collection
  folder means that user's next sync starts from whatever their client holds.
- **Failed logins count toward Authentik's throttling.** Anki retries by itself,
  so a user repeatedly entering the wrong password can end up rate-limited at
  the SSO level rather than seeing a clean rejection.
- **Anki upgrades** replace the sync server binary this service supervises.
  Restart `anki-bridge` afterwards, and run the integration tests.
