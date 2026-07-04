# End-to-end tests (Playwright)

Greenfield e2e suite that drives the app as a real user against a **fully isolated,
disposable stack** — a throwaway MongoDB and a real **Authentik** OIDC provider —
so authentication and permission gating are exercised for real (no auth bypass).

## Quick start

```bash
pnpm test:e2e            # up → provision → seed → run → tear down
pnpm test:e2e:keep       # same, but leave the stack running (KEEP_UP=1)
pnpm test:e2e:ui         # Playwright UI mode (keeps the stack up)

# Manual control of the stack:
pnpm e2e:up              # start Mongo+Authentik, provision, clone+seed
pnpm e2e:seed            # re-run clone + overlay only
pnpm e2e:down            # stop and wipe the stack (-v)
```

Requires Docker. The stack uses shifted ports (Mongo `27018`, Authentik `9100`)
and the compose project name `bocken-e2e`, so it never collides with a dev stack.

## How it fits together

| Piece | File | Purpose |
|---|---|---|
| Stack | `docker-compose.test.yml` | Mongo + Authentik (postgres/redis/server/worker), ephemeral volumes |
| Fixed env | `.env.test` | Constants shared by the build, the app runtime, and the harness |
| Authentik provisioning | `scripts/e2e/provision-authentik.mjs` | Groups, users, OIDC provider/app, scope mapping (nickname+groups) |
| Realistic data | `scripts/e2e/clone-dev.mjs` | Clones non-personal content from the dev DB (graceful skip if absent) |
| Deterministic overlay | `scripts/e2e/seed.mjs` | Upserts guaranteed fixtures tests key on |
| Orchestration | `scripts/e2e/run.sh` | up → provision → clone → seed → `playwright test` → teardown |
| Login + roles | `tests/e2e/helpers/auth.ts`, `auth.setup.ts` | Real Authentik login per role → saved storageState |
| Users matrix | `tests/e2e/users.json` | The permission profiles (see below) |

### Test users (permission matrix)

Defined in `users.json`, provisioned into Authentik, password from `E2E_USER_PASSWORD`.

| role (storageState) | username | groups |
|---|---|---|
| `full` | `e2e_full` | rezepte_users, cospend, task_users, fitness |
| `none` | `e2e_none` | — (logged in, no groups) |
| `recipes` | `e2e_recipes` | rezepte_users |
| `cospend` | `e2e_cospend` | cospend |
| `tasks` | `e2e_tasks` | task_users |
| `fitness` | `e2e_fitness` | fitness |
| `anna` | `anna` | all (drives anna-only branches) |

Use a role in a test:

```ts
import { storageStateFor, ANONYMOUS } from '../helpers/auth';
test.use({ storageState: storageStateFor('full') }); // or ANONYMOUS for logged-out
```

## Data strategy

`clone-dev.mjs` copies **non-personal content** (recipes, to-try, shopping
categories, nutrition overwrites, exchange rates) from the local dev Mongo for
realistic volume/variety. Personal domains (payments, fitness, tasks, period,
measurements) are **not** cloned — they belong to real accounts; the e2e suite
owns those via fixtures on the `e2e_*` users instead. `seed.mjs` then upserts a
handful of guaranteed recipe fixtures (e.g. `schokokuchen`, `gugelhupf`) that
specific tests assert on, without wiping the cloned data. Options:

```bash
E2E_CLONE_COLLECTIONS=recipes,exchangerates pnpm e2e:seed  # narrow the clone
E2E_CLONE_OFF=5000 pnpm e2e:seed                           # sample OpenFoodFacts
```

If the dev DB is unreachable (e.g. CI), the clone is skipped and the overlay
alone still yields a working DB.

## Notes for writing tests

- Prefer stable ids / `aria-label` / roles over translated visible text (UI is de/en/la).
- SSR renders immediately but Svelte attaches handlers on hydration — use
  `gotoHydrated(page, url)` (`helpers/nav.ts`) before the first interaction, or a
  click may be a silent no-op.
- Recipe card names live in the link's `aria-label`, not a text node.
- Skip capabilities headless Chromium can't provide (GPS/Tauri workouts, the pose
  camera, barcode scanning) or mock their endpoints.
