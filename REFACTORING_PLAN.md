# Refactoring Plan

Generated: 2025-11-18

## Overview
This document outlines the step-by-step plan to refactor the homepage codebase, eliminate duplication, and add comprehensive testing.

---

## Phase 1: Testing Infrastructure Setup

### 1.1 Install Testing Dependencies
```bash
npm install -D vitest @testing-library/svelte @testing-library/jest-dom @vitest/ui
npm install -D @playwright/test
```

### 1.2 Configure Vitest
- Create `vitest.config.ts` for unit/component tests
- Configure Svelte component testing
- Set up test utilities and helpers

### 1.3 Configure Playwright
- Create `playwright.config.ts` for E2E tests
- Set up test fixtures and helpers

### 1.4 Add Test Scripts
- Update `package.json` with test commands
- Add coverage reporting

---

## Phase 2: Backend Refactoring

### 2.1 Database Connection Consolidation
**Priority: 🔴 Critical**

**Current State:**
- ❌ `src/lib/db/db.ts` (legacy, uses `MONGODB_URI`)
- ✅ `src/utils/db.ts` (preferred, better pooling, uses `MONGO_URL`)

**Action Plan:**
1. ✅ Keep `src/utils/db.ts` as the single source of truth
2. Update all imports to use `src/utils/db.ts`
3. Delete `src/lib/db/db.ts`
4. Update environment variable docs

**Files to Update (43 total):**
- All API route files in `src/routes/api/`
- `src/hooks.server.ts`
- Any other imports

### 2.2 Extract Auth Middleware
**Priority: 🔴 Critical**

**Duplication:** Authorization check repeated 47 times across API routes

**Current Pattern:**
```typescript
const session = await locals.auth();
if (!session || !session.user?.nickname) {
  return json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Action Plan:**
1. Create `src/lib/server/middleware/auth.ts`
2. Export `requireAuth()` helper function
3. Update all 47 API routes to use helper
4. Add unit tests for auth middleware

**New Pattern:**
```typescript
import { requireAuth } from '$lib/server/middleware/auth';

export async function GET({ locals }) {
  const user = await requireAuth(locals);
  // user is guaranteed to exist here
}
```

### 2.3 Create Shared Utilities
**Priority: 🟡 Moderate**

**New Files:**
1. `src/lib/utils/formatters.ts`
   - `formatCurrency(amount, currency)`
   - `formatDate(date, locale)`
   - `formatNumber(num, decimals)`

2. `src/lib/utils/errors.ts`
   - `createErrorResponse(message, status)`
   - Standard error types

3. `src/lib/server/middleware/validation.ts`
   - Request body validation helpers

### 2.4 Backend Unit Tests
**Priority: 🔴 Critical**

**Test Coverage:**
1. **Models** (10 files)
   - Validation logic
   - Schema defaults
   - Instance methods

2. **Utilities** (4 files)
   - `src/lib/utils/currency.ts`
   - `src/lib/utils/recurring.ts`
   - `src/lib/utils/settlements.ts`
   - New formatters

3. **Middleware**
   - Auth helpers
   - Error handlers

**Test Structure:**
```
tests/
  unit/
    models/
    utils/
    middleware/
```

---

## Phase 3: Frontend JavaScript Refactoring

### 3.1 Consolidate Formatters
**Priority: 🟡 Moderate**

**Duplication:** 65 formatting function calls across 12 files

**Action Plan:**
1. Create `src/lib/utils/formatters.ts` (shared between client/server)
2. Find all inline formatting logic
3. Replace with imported functions
4. Add unit tests

**Files with Formatting Logic:**
- Cospend pages (8 files)
- Recipe components (4+ files)

### 3.2 Shared Type Definitions
**Priority: 🟢 Minor**

**Action Plan:**
1. Audit `src/types/types.ts`
2. Add missing types from models
3. Create shared interfaces for API responses
4. Add JSDoc comments

### 3.3 Frontend Utility Tests
**Priority: 🟡 Moderate**

**Test Coverage:**
1. **Stores**
   - `img_store.js`
   - `portions_store.js`
   - `season_store.js`

2. **Utils**
   - `randomize.js`
   - `recipeJsonLd.ts`
   - `stripHtmlTags.ts`
   - `cookie.js`

---

## Phase 4: Frontend Design Refactoring

### 4.1 Create Unified Button Component
**Priority: 🟡 Moderate**

**Duplication:** 121 button style definitions across 20 files

**Action Plan:**
1. Create `src/lib/components/ui/Button.svelte`
2. Support variants: `primary`, `secondary`, `danger`, `ghost`
3. Support sizes: `sm`, `md`, `lg`
4. Replace all button instances
5. Add Storybook examples (optional)

**New Usage:**
```svelte
<Button variant="primary" size="md" on:click={handleClick}>
  Click me
</Button>
```

### 4.2 Extract Modal Component
**Priority: 🟡 Moderate**

**Action Plan:**
1. Create `src/lib/components/ui/Modal.svelte`
2. Extract common modal patterns from `PaymentModal.svelte`
3. Make generic and reusable
4. Add accessibility (ARIA, focus trap, ESC key)

### 4.3 Consolidate CSS Variables
**Priority: 🟢 Minor**

**Action Plan:**
1. Audit `src/lib/css/nordtheme.css`
2. Add missing design tokens:
   - `--border-radius-sm: 0.25rem`
   - `--border-radius-md: 0.5rem`
   - `--border-radius-lg: 1rem`
   - Spacing scale
   - Typography scale
3. Replace hardcoded values throughout codebase

### 4.4 Extract Recipe Filter Component
**Priority: 🟢 Minor**

**Duplication:** Similar filtering logic in 5+ pages

**Action Plan:**
1. Create `src/lib/components/recipes/RecipeFilter.svelte`
2. Support multiple filter types
3. Replace filtering logic in:
   - Category pages
   - Icon pages
   - Tag pages
   - Season pages
   - Search page

### 4.5 Decompose Large Components
**Priority: 🟢 Minor**

**Large Files:**
- `src/routes/cospend/+page.svelte` (20KB)
- `src/lib/components/PaymentModal.svelte` (716 lines)
- `src/lib/components/Card.svelte` (259 lines)

**Action Plan:**
1. Break down cospend dashboard into smaller components
2. Extract sections from PaymentModal
3. Simplify Card component

### 4.6 Component Tests
**Priority: 🟡 Moderate**

**Test Coverage:**
1. **UI Components**
   - Button variants and states
   - Modal open/close behavior
   - Form components

2. **Feature Components**
   - Recipe card rendering
   - Payment modal calculations
   - Filter interactions

**Test Structure:**
```
tests/
  components/
    ui/
    recipes/
    cospend/
    fitness/
```

---

## Phase 5: API Integration Tests

### 5.1 API Route Tests
**Priority: 🔴 Critical**

**Test Coverage:**
1. **Cospend API (13 endpoints)**
   - Balance calculations
   - Payment CRUD
   - Recurring payment logic
   - Currency conversion

2. **Recipe API (17 endpoints)**
   - Recipe CRUD
   - Search functionality
   - Favorites
   - Image upload

3. **Fitness API (8 endpoints)**
   - Exercise CRUD
   - Session tracking
   - Template management

4. **Mario Kart API (8 endpoints)**
   - Tournament management
   - Bracket generation
   - Score tracking

**Test Structure:**
```
tests/
  integration/
    api/
      cospend/
      rezepte/
      fitness/
      mario-kart/
```

---

## Phase 6: E2E Tests

### 6.1 Critical User Flows
**Priority: 🟡 Moderate**

**Test Scenarios:**
1. **Recipe Management**
   - Create new recipe
   - Edit recipe
   - Add images
   - Mark as favorite
   - Search recipes

2. **Expense Tracking**
   - Add payment
   - Split payment
   - View balance
   - Calculate settlements

3. **Fitness Tracking**
   - Create workout template
   - Start workout
   - Log session

**Test Structure:**
```
tests/
  e2e/
    recipes/
    cospend/
    fitness/
```

---

## Phase 7: Documentation & Cleanup

### 7.1 Update Documentation
- Update README with testing instructions
- Document new component API
- Add JSDoc comments to utilities
- Create architecture decision records (ADRs)

### 7.2 Clean Up Unused Code
- Remove old DB connection file
- Delete unused imports
- Remove commented code
- Clean up console.logs

### 7.3 Code Quality
- Run ESLint and fix issues
- Run Prettier for formatting
- Check for unused dependencies
- Update package versions

---

## Implementation Order

### Sprint 1: Foundation (Week 1)
1. ✅ Set up testing infrastructure
2. ✅ Consolidate DB connections
3. ✅ Extract auth middleware
4. ✅ Create formatter utilities
5. ✅ Write backend unit tests

### Sprint 2: Backend Cleanup (Week 1-2)
6. ✅ Refactor all API routes
7. ✅ Add API integration tests
8. ✅ Document backend changes

### Sprint 3: Frontend JavaScript (Week 2)
9. ✅ Consolidate formatters in frontend
10. ✅ Update type definitions
11. ✅ Add utility tests

### Sprint 4: UI Components (Week 3)
12. ✅ Create Button component
13. ✅ Create Modal component
14. ✅ Add CSS variables
15. ✅ Component tests

### Sprint 5: Component Refactoring (Week 3-4)
16. ✅ Refactor large components
17. ✅ Extract filter components
18. ✅ Update all usages

### Sprint 6: Testing & Polish (Week 4)
19. ✅ E2E critical flows
20. ✅ Documentation
21. ✅ Code cleanup
22. ✅ Final verification

---

## Success Metrics

### Code Quality
- [ ] Zero duplication of DB connections
- [ ] <5% code duplication overall
- [ ] All components <200 lines
- [ ] All utilities have unit tests

### Test Coverage
- [ ] Backend: >80% coverage
- [ ] Frontend utils: >80% coverage
- [ ] Components: >60% coverage
- [ ] E2E: All critical flows covered

### Performance
- [ ] No regression in API response times
- [ ] No regression in page load times
- [ ] Bundle size not increased

### Developer Experience
- [ ] All tests pass in CI/CD
- [ ] Clear documentation
- [ ] Easy to add new features
- [ ] Consistent code patterns

---

## Risk Mitigation

### Breaking Changes
- Run full test suite after each refactor
- Keep old code until tests pass
- Deploy incrementally with feature flags

### Database Migration
- Ensure MONGO_URL env var is set
- Test connection pooling under load
- Monitor for connection leaks

### Component Changes
- Use visual regression testing
- Manual QA of affected pages
- Gradual rollout of new components

---

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Identify failing tests
3. Fix issues in isolation
4. Redeploy with fixes

---

## Notes

- All refactoring will be done incrementally
- Tests will be written BEFORE refactoring
- No feature will be broken
- Code will be more maintainable
- Future development will be faster
