# Personal Homepage

My own homepage, [bocken.org](https://bocken.org), built with SvelteKit and Svelte 5.

## Features

### Recipes (`/rezepte` · `/recipes`)
Bilingual recipe collection with search, category filtering, and seasonal recommendations. Authenticated users can add recipes and mark favorites. Recipes are browsable offline via service worker caching.

### Faith (`/glaube` · `/faith`)
Catholic prayer collection in German, English, and Latin. Includes an interactive Rosary with scroll-synced SVG bead visualization, mystery images (sticky column on desktop, draggable PiP on mobile), decade progress tracking, and a daily streak counter. Adapts prayers for liturgical seasons like Eastertide.

### Expense Sharing (`/cospend`)
Shared expense tracker with balance dashboards, debt breakdowns, monthly bar charts with category filtering, and payment management.

### Self-Hosted Services
Landing pages and themed integrations for Gitea, Jellyfin, SearxNG, Photoprism, Jitsi, Webtrees, and more — all behind Authentik SSO.

### Technical Highlights
- **PWA with offline support** — service worker with network-first caching, offline recipe browsing, and intelligent prefetching
- **Bilingual routing** — language derived from URL (`/rezepte` vs `/recipes`, `/glaube` vs `/faith`) with seamless switching
- **Nord theme** — consistent color palette with light/dark mode support
- **Auth** — Auth.js with OIDC/LDAP via Authentik, role-based access control
- **Progressive enhancement** — core functionality works without JavaScript

## TODO
### General

### Rezepte

### Glaube


#### E-Mail
- [x] emailwiz setup
- [x] fail2ban
- [ ] LDAP?

#### Dendrite
- [x] setup dendrite
- [ ] Connect to LDAP/OIDC (waiting on upstream)
- [x] Serve some web-frontend -> Just element?

#### Webtrees
- [x] setup Oauth2proxy -> not necessary, authentik has proxy integrated
- [x] connect to OIDC using Oauth2proxy (using authentik)
- [ ] consistent theming
- [x] auto-login if not logged in

#### Jitsi
- [ ] consistent theming
- [ ] move away from docker
- [ ] find a way to improve max video quality without jitsi becoming unreliable

#### Searx
- [x] investigate SearxNG as more reliable alternative
- [ ] consistent theming

#### Photoprism
- [ ] consistent theming
- [x] OIDC integration
