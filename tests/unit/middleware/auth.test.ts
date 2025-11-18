import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, optionalAuth } from '$lib/server/middleware/auth';

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
});
