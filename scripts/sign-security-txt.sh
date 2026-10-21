#!/usr/bin/env bash
# Generate and PGP-sign /.well-known/security.txt (RFC 9116), plus the public
# key it points at for encrypted reports.
#
# Run by scripts/deploy.sh before the build, so every deploy renews "Expires"
# (an expired security.txt must be ignored by readers) and re-signs the result.
# Both outputs are build artifacts and gitignored; the template lives here.
#
# Usage: scripts/sign-security-txt.sh
#   SECURITY_TXT_KEY  fingerprint of the signing key (default: Alexander's)

set -euo pipefail

KEY="${SECURITY_TXT_KEY:-F87B009461E6850B39C88CA81D237BE83F9B05E8}"
SITE="https://bocken.org"
OUT="static/.well-known/security.txt"
PUBKEY_OUT="static/pgp-key.txt"

cd "$(dirname "$0")/.."

if ! gpg --list-secret-keys "$KEY" >/dev/null 2>&1; then
    echo "!! No secret key $KEY in the local keyring — cannot sign security.txt."
    exit 1
fi

# RFC 9116 recommends less than a year; each deploy pushes it forward again.
expires=$(date -u -d '+360 days' +%Y-%m-%dT00:00:00Z)

mkdir -p "$(dirname "$OUT")"
gpg --armor --export-options export-minimal --export "$KEY" > "$PUBKEY_OUT"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
cat > "$tmp" <<EOF
# Security contact for bocken.org (RFC 9116).
# Please report vulnerabilities privately by email, not in public, and
# encrypt anything sensitive to the key below.
# Key fingerprint: $KEY

Contact: mailto:security@bocken.org
Encryption: $SITE/pgp-key.txt
Expires: $expires
Preferred-Languages: en, de
Canonical: $SITE/.well-known/security.txt
EOF

gpg --batch --yes --local-user "$KEY" --digest-algo SHA512 \
    --clearsign --output "$OUT" "$tmp"
gpg --verify "$OUT" 2>/dev/null

echo "   signed $OUT (expires $expires) + exported $PUBKEY_OUT"
