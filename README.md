# Personal Homepage

My own homepage, bocken.org, built with svelte-kit.

## TODO
### General
- [ ] Admin user management -> move to authentik via oIDC
	- [x] login to authentik
	- [x] only let rezepte_users edit recipes -> currently only letting them log in, should be changed
	- [x] get user info from authentik (more than email and name)
	- [ ] upload pfp
- [ ] upload/change pfp
- [x] registration only with minimal permissions
- [ ] logout without /logout page
- [ ] preferences page
- [x] change password
- [x] css dark mode `@media (prefers-color-scheme: dark) {}`
- [ ] dark mode toggle

### Rezepte
- [x] Do not list recipes that are all-year as "seasonal"
- [ ] nutrition facts
- [x] verify randomize arrays based on day
- [x] notes for next time
- [ ] refactor, like, a lot
- [ ] expose json-ld for recipes https://json-ld.org/ https://schema.org/Recipe
- [ ] reference other recipes in recipe
	- [ ] add a link to the recipe
	- [ ] add ingredients to the ingredients list
	- [ ] include steps?
- [ ] add favoriting ability when logged in
	- [ ] favorite button on recipe
	- [ ] store favorites in DB -> add to user object
	- [ ] favorite API endpoint (requires auth of user)
		- [ ] set
		- [ ] retrieve
	- [ ] favorite page/MediaScroller
- [ ] graceful degradation for JS-less browsers
	- [ ] use js-only class with display:none and remove it with JS
	- [ ] disable search -> use form action instead on submit?
	- [x] do not blur images without js
	- [x] correct Recipe Card rendering


### Glaube
- [ ] just keep it md rendered
- [ ] Google Speech to Text API integration?
- [ ] Gebete

### Outside of this sveltekit project but planned to run on the server as well
- [x] create LDAP and OpenID

#### E-Mail
- [x] emailwiz setup
- [x] fail2ban
- [ ] LDAP?

#### Dendrite
- [x] setup dendrite
- [ ] Connect to LDAP/OIDC (waiting on upstream)
- [x] Serve some web-frontend -> Just element?

#### Gitea
- [ ] consistent theming
- [x] OpenID Connect
- [x] sane landing page

#### Jellyfin
- [x] connect to LDAP
- [x] consitent theming

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
- [ ] OIDC integration (waiting on upstream)

#### Nextcloud
- [x] consistent theming
- [x] collabora integration

#### Transmission
- [x] move behind authentik
