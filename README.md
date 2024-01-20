# Personal Homepage

My own homepage, bocken.org, built with svelte-kit.

## TODO
### General
- [ ] Admin user management -> move to authentik via oIDC
- [ ] upload/change pfp
- [x] registration only with minimal permissions
- [ ] logout without /logout page
- [ ] preferences page
- [x] change password
- [ ] fail2ban integration
- [x] css dark mode `@media (prefers-color-scheme: dark) {}`
- [ ] dark mode toggle

### Rezepte
- [x] Do not list recipes that are all-year as "seasonal"
- [ ] nutrition facts
- [x] verify randomize arrays based on day
- [x] notes for next time
- [ ] refactor, like, a lot
- [ ] expose json-ld for recipes https://json-ld.org/ https://github.com/flauschtrud/broccoli
- [ ] graceful degradation for JS-less browsers
	- use js-only class with display:none and remove it with JS
	- disable search -> use form action instead on submit?
	- do not blur images without js
	- correct Recipe Card rendering


### Glaube
- [ ] just keep it as MD rendering for now?
- [ ] DB setup
- [ ] Google Speech to Text API integration?
- [ ] Gebete


### Outside of this sveltekit project but planned to run on the server as well
- [x] create LDAP and OpenID

#### E-Mail
- [x] emailwiz setup
- [x] fail2ban
- [ ] LDAP?

### Dendrite
- [x] setup dendrite
- [ ] Connect to LDAP
- [x] Serve some web-frontend -> Just element?

### Gitea
- [ ] consistent theming
- [ ] LDAP
- [x] OpenID Connect

### Jellyfin
- [x] connect to LDAP
