import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock environment variables
process.env.MONGO_URL = 'mongodb://localhost:27017/test';
process.env.AUTH_SECRET = 'test-secret';
process.env.AUTHENTIK_ID = 'test-client-id';
process.env.AUTHENTIK_SECRET = 'test-client-secret';
process.env.AUTHENTIK_ISSUER = 'https://test.authentik.example.com';

// Mock SvelteKit specific globals
global.fetch = vi.fn();
