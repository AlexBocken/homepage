#!/bin/bash

# Update all files importing from the legacy $lib/db/db to use $utils/db instead

files=(
  "/home/alex/.local/src/homepage/src/routes/mario-kart/[id]/+page.server.ts"
  "/home/alex/.local/src/homepage/src/routes/mario-kart/+page.server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/sessions/[id]/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/sessions/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/templates/[id]/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/templates/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/exercises/[id]/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/exercises/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/exercises/filters/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/fitness/seed-example/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/groups/[groupId]/scores/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/groups/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/contestants/[contestantId]/dnf/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/contestants/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/bracket/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/[id]/bracket/matches/[matchId]/scores/+server.ts"
  "/home/alex/.local/src/homepage/src/routes/api/mario-kart/tournaments/+server.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file"
    sed -i "s/from '\$lib\/db\/db'/from '\$utils\/db'/g" "$file"
  else
    echo "File not found: $file"
  fi
done

echo "All files updated!"
