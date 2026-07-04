#!/usr/bin/env node
// Provision the throwaway Authentik test IdP (docker-compose.test.yml) to match
// what the app + Playwright harness expect. Idempotent: safe to re-run against a
// warm stack (get-or-create everywhere).
//
// Creates: the app's groups, the test-user matrix (tests/e2e/users.json) with a
// shared password, a custom scope mapping that emits `nickname` + `groups`, an
// OAuth2/OIDC provider with the fixed client id/secret + redirect URI, and the
// application whose slug yields AUTHENTIK_ISSUER.
//
// Usage: node scripts/e2e/provision-authentik.mjs
// Reads config from the environment (.env.test); falls back to the same constants.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

const BASE = process.env.AUTHENTIK_TEST_URL || 'http://localhost:9100';
const TOKEN = process.env.AUTHENTIK_API_TOKEN || 'e2e-authentik-admin-api-token-0123456789abcdef';
const CLIENT_ID = process.env.AUTHENTIK_ID || 'bocken-e2e-client-id';
const CLIENT_SECRET = process.env.AUTHENTIK_SECRET || 'bocken-e2e-client-secret-0123456789abcdef';
const APP_SLUG = 'bocken-test';
const REDIRECT_URI = (process.env.ORIGIN || 'http://localhost:4173') + '/auth/callback/authentik';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'e2e-user-password-123';

const API = `${BASE}/api/v3`;
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' };

const users = JSON.parse(readFileSync(resolve(REPO, 'tests/e2e/users.json'), 'utf8')).users;
const ALL_GROUPS = [...new Set(users.flatMap((u) => u.groups))];

async function api(method, path, body) {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: H,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await res.text();
	let data;
	try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
	if (!res.ok) {
		throw new Error(`${method} ${path} -> ${res.status}\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
	}
	return data;
}

const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const patch = (p, b) => api('PATCH', p, b);

/** GET first result matching a query, or null. */
async function findOne(listPath) {
	const data = await get(listPath);
	return (data.results && data.results[0]) || null;
}

async function waitReady() {
	for (let i = 0; i < 60; i++) {
		try {
			const res = await fetch(`${BASE}/-/health/ready/`);
			if (res.ok) return;
		} catch { /* not up yet */ }
		await new Promise((r) => setTimeout(r, 2000));
	}
	throw new Error('Authentik did not become ready in time');
}

async function ensureGroup(name) {
	const existing = await findOne(`/core/groups/?name=${encodeURIComponent(name)}`);
	if (existing && existing.name === name) return existing;
	return post('/core/groups/', { name });
}

async function ensureUser(u, groupPkByName) {
	const groups = u.groups.map((g) => groupPkByName[g]);
	let user = await findOne(`/core/users/?username=${encodeURIComponent(u.username)}`);
	if (user && user.username === u.username) {
		await patch(`/core/users/${user.pk}/`, { name: u.name, email: u.email, groups, is_active: true });
	} else {
		user = await post('/core/users/', {
			username: u.username,
			name: u.name,
			email: u.email,
			type: 'internal',
			path: 'users',
			is_active: true,
			groups
		});
	}
	await post(`/core/users/${user.pk}/set_password/`, { password: USER_PASSWORD });
	return user;
}

async function ensureScopeMapping() {
	const name = 'bocken-test: nickname + groups';
	const expression = [
		'return {',
		'    "preferred_username": request.user.username,',
		'    "nickname": request.user.username,',
		'    "name": request.user.name,',
		'    "email": request.user.email,',
		'    "groups": [group.name for group in request.user.ak_groups.all()],',
		'}'
	].join('\n');
	const existing = await findOne(`/propertymappings/provider/scope/?search=${encodeURIComponent(name)}`);
	if (existing && existing.name === name) {
		await patch(`/propertymappings/provider/scope/${existing.pk}/`, { scope_name: 'profile', expression });
		return existing.pk;
	}
	const created = await post('/propertymappings/provider/scope/', {
		name,
		scope_name: 'profile',
		description: 'Adds nickname + groups to the profile scope for the bocken app.',
		expression
	});
	return created.pk;
}

async function flowPk(slug) {
	// On a cold boot the API is reachable before the worker finishes applying the
	// default-flow blueprints, so poll until the flow exists.
	for (let i = 0; i < 45; i++) {
		const f = await findOne(`/flows/instances/?slug=${slug}`);
		if (f) return f.pk;
		await new Promise((r) => setTimeout(r, 2000));
	}
	throw new Error(`flow not found after waiting: ${slug}`);
}

async function ensureProvider(scopeMappingPk) {
	const name = 'bocken-test-provider';
	const cert = await findOne('/crypto/certificatekeypairs/?has_key=true');
	const all = await get('/propertymappings/provider/scope/?page_size=100');
	// Only the built-in (managed) OpenID mappings; our custom one is added separately.
	const managed = (all.results || []).filter((m) => typeof m.managed === 'string' && m.managed.includes('scope-'));
	const byScope = Object.fromEntries(managed.map((m) => [m.scope_name, m.pk]));
	const property_mappings = [byScope.openid, byScope.email, byScope.profile, scopeMappingPk].filter(Boolean);

	const body = {
		name,
		authorization_flow: await flowPk('default-provider-authorization-implicit-consent'),
		invalidation_flow: await flowPk('default-provider-invalidation-flow'),
		client_type: 'confidential',
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		// Authentik 2026.x requires grant types to be enabled explicitly; without
		// this the authorize endpoint rejects with "Invalid grant_type for provider".
		grant_types: ['authorization_code', 'refresh_token'],
		redirect_uris: [{ matching_mode: 'strict', url: REDIRECT_URI }],
		sub_mode: 'user_username',
		include_claims_in_id_token: true,
		signing_key: cert ? cert.pk : null,
		property_mappings,
		access_code_validity: 'minutes=1',
		access_token_validity: 'minutes=60',
		refresh_token_validity: 'days=30'
	};

	const existing = await findOne(`/providers/oauth2/?name=${encodeURIComponent(name)}`);
	if (existing && existing.name === name) {
		await patch(`/providers/oauth2/${existing.pk}/`, body);
		return existing.pk;
	}
	const created = await post('/providers/oauth2/', body);
	return created.pk;
}

async function ensureApplication(providerPk) {
	const existing = await findOne(`/core/applications/?slug=${APP_SLUG}`);
	if (existing && existing.slug === APP_SLUG) {
		await patch(`/core/applications/${APP_SLUG}/`, { provider: providerPk });
		return existing;
	}
	return post('/core/applications/', {
		name: 'Bocken Test',
		slug: APP_SLUG,
		provider: providerPk
	});
}

async function main() {
	console.log(`⏳ Waiting for Authentik at ${BASE} ...`);
	await waitReady();

	console.log('👥 Ensuring groups:', ALL_GROUPS.join(', '));
	const groupPkByName = {};
	for (const g of ALL_GROUPS) groupPkByName[g] = (await ensureGroup(g)).pk;

	console.log('🧑 Ensuring users:', users.map((u) => u.username).join(', '));
	for (const u of users) await ensureUser(u, groupPkByName);

	console.log('🧩 Ensuring scope mapping (nickname + groups)');
	const scopeMappingPk = await ensureScopeMapping();

	console.log('🔐 Ensuring OAuth2 provider');
	const providerPk = await ensureProvider(scopeMappingPk);

	console.log('📇 Ensuring application (slug: %s)', APP_SLUG);
	await ensureApplication(providerPk);

	// Sanity: OIDC discovery must advertise the exact issuer the app is built with.
	const wellKnown = `${BASE}/application/o/${APP_SLUG}/.well-known/openid-configuration`;
	const disc = await (await fetch(wellKnown)).json();
	console.log('🔎 issuer:', disc.issuer);
	console.log('✅ Authentik provisioned.');
}

main().catch((e) => {
	console.error('❌ Provisioning failed:\n', e.message);
	process.exit(1);
});
