import type { PageServerLoad } from "./$types"
import { requireSelf, getUser } from "$lib/server/authentik"
import { groupLabel, requestableGroups } from "$lib/server/groups"

export const load: PageServerLoad = async ({ locals, params }) => {
	const { pk } = await requireSelf(locals)
	const user = await getUser(pk)
	// Prefer the uploaded full-resolution avatar (stored, cache-busted, in
	// `attributes.avatar`) for the large upload view, falling back to Authentik's
	// computed avatar (gravatar/initials) for users who never uploaded one. Using
	// the stored URL also keeps the picture stable across email changes.
	const avatarAttr = user.attributes?.avatar as { url?: unknown } | undefined
	const uploadedAvatar = typeof avatarAttr?.url === 'string' ? avatarAttr.url : undefined
	// Resolve group labels server-side and only ship {codename,label} — the full
	// group map (incl. admin/system codenames) never reaches the client.
	const currentCodes = user.groups_obj?.map((g) => g.name) ?? []
	const currentSet = new Set(currentCodes)
	return {
		lang: params.settingsLang === 'einstellungen' ? 'de' : 'en',
		account: {
			username: user.username,
			name: user.name,
			email: user.email,
			groups: currentCodes.map((codename) => ({ codename, label: groupLabel(codename) })),
			dateJoined: user.date_joined,
			avatar: uploadedAvatar ?? user.avatar,
			isActive: user.is_active
		},
		availableGroups: requestableGroups().filter((g) => !currentSet.has(g.codename))
	}
}
