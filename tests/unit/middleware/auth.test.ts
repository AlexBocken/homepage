import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireGroup, requireFinanceOwner, optionalAuth, toUser } from '$lib/server/middleware/auth';
import { FINANCE_OWNER } from '$lib/config/users';

describe('auth middleware', () => {
	describe('requireAuth', () => {
		it('should return user when authenticated', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({
					user: {
						nickname: 'testuser',
						name: 'Test User',
						email: 'test@example.com',
						image: 'https://example.com/avatar.jpg'
					}
				})
			};

			const user = await requireAuth(mockLocals as any);

			expect(user).toEqual({
				nickname: 'testuser',
				name: 'Test User',
				email: 'test@example.com',
				image: 'https://example.com/avatar.jpg'
			});
		});

		it('should throw 401 error when no session', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue(null)
			};

			await expect(requireAuth(mockLocals as any)).rejects.toThrow();
		});

		it('should throw 401 error when no user in session', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({})
			};

			await expect(requireAuth(mockLocals as any)).rejects.toThrow();
		});

		it('should throw 401 error when no nickname in user', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({
					user: {
						name: 'Test User'
					}
				})
			};

			await expect(requireAuth(mockLocals as any)).rejects.toThrow();
		});

		it('should handle user with only nickname', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({
					user: {
						nickname: 'testuser'
					}
				})
			};

			const user = await requireAuth(mockLocals as any);

			expect(user).toEqual({
				nickname: 'testuser',
				name: undefined,
				email: undefined,
				image: undefined
			});
		});
	});

	describe('optionalAuth', () => {
		it('should return user when authenticated', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({
					user: {
						nickname: 'testuser',
						name: 'Test User',
						email: 'test@example.com'
					}
				})
			};

			const user = await optionalAuth(mockLocals as any);

			expect(user).toEqual({
				nickname: 'testuser',
				name: 'Test User',
				email: 'test@example.com',
				image: undefined
			});
		});

		it('should return null when no session', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue(null)
			};

			const user = await optionalAuth(mockLocals as any);

			expect(user).toBeNull();
		});

		it('should return null when no user in session', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({})
			};

			const user = await optionalAuth(mockLocals as any);

			expect(user).toBeNull();
		});

		it('should return null when no nickname in user', async () => {
			const mockLocals = {
				auth: vi.fn().mockResolvedValue({
					user: {
						name: 'Test User'
					}
				})
			};

			const user = await optionalAuth(mockLocals as any);

			expect(user).toBeNull();
		});
	});

	describe('toUser', () => {
		it('maps a session to a user, nulls to undefined', () => {
			expect(
				toUser({ user: { nickname: 'a', name: null, email: 'a@x', image: null } } as any)
			).toEqual({ nickname: 'a', name: undefined, email: 'a@x', image: undefined });
		});

		it('returns null for a missing session, user or nickname', () => {
			expect(toUser(null)).toBeNull();
			expect(toUser(undefined)).toBeNull();
			expect(toUser({} as any)).toBeNull();
			expect(toUser({ user: { name: 'x' } } as any)).toBeNull();
			expect(toUser({ user: { nickname: '' } } as any)).toBeNull();
		});

		it('does not leak groups or other session fields', () => {
			const user = toUser({ user: { nickname: 'a', groups: ['g'] }, expires: 'x' } as any);
			expect(user).not.toHaveProperty('groups');
			expect(user).not.toHaveProperty('expires');
		});
	});

	describe('session source', () => {
		it('prefers locals.session over calling auth()', async () => {
			const auth = vi.fn();
			const user = await requireAuth({ session: { user: { nickname: 'cached' } }, auth } as any);
			expect(user.nickname).toBe('cached');
			expect(auth).not.toHaveBeenCalled();
		});

		it('falls back to auth() when hooks left no session', async () => {
			const auth = vi.fn().mockResolvedValue({ user: { nickname: 'fresh' } });
			const user = await requireAuth({ session: null, auth } as any);
			expect(user.nickname).toBe('fresh');
			expect(auth).toHaveBeenCalledOnce();
		});
	});

	describe('requireGroup', () => {
		const locals = (session: unknown) => ({ auth: vi.fn().mockResolvedValue(session) }) as any;

		it('returns the user when in the group', async () => {
			const user = await requireGroup(locals({ user: { nickname: 'a', groups: ['g'] } }), 'g');
			expect(user).toEqual({ nickname: 'a', name: undefined, email: undefined, image: undefined });
		});

		it('throws 401 when logged out', async () => {
			await expect(requireGroup(locals(null), 'g')).rejects.toMatchObject({ status: 401 });
		});

		it('throws 403 when not in the group', async () => {
			await expect(
				requireGroup(locals({ user: { nickname: 'a', groups: ['other'] } }), 'g')
			).rejects.toMatchObject({ status: 403 });
			await expect(requireGroup(locals({ user: { nickname: 'a' } }), 'g')).rejects.toMatchObject({
				status: 403
			});
		});
	});

	describe('requireFinanceOwner', () => {
		const locals = (session: unknown) => ({ auth: vi.fn().mockResolvedValue(session) }) as any;

		it('admits the owner, case-insensitively', async () => {
			const nick = FINANCE_OWNER[0].toUpperCase() + FINANCE_OWNER.slice(1);
			const user = await requireFinanceOwner(locals({ user: { nickname: nick } }));
			expect(user.nickname).toBe(nick);
		});

		it('throws 403 for anyone else, whatever their groups', async () => {
			await expect(
				requireFinanceOwner(locals({ user: { nickname: 'anna', groups: ['cospend', 'rezepte_users'] } }))
			).rejects.toMatchObject({ status: 403 });
		});

		it('throws 401 when logged out', async () => {
			await expect(requireFinanceOwner(locals(null))).rejects.toMatchObject({ status: 401 });
		});
	});
});
