# Homepage Codebase Map

Generated: 2025-11-18

## Table of Contents
1. [Backend Architecture](#backend-architecture)
2. [Frontend JavaScript](#frontend-javascript)
3. [Frontend Design](#frontend-design)
4. [Duplication Analysis](#duplication-analysis)

---

## Backend Architecture

### Database Configuration

**⚠️ CRITICAL DUPLICATION:**
- `src/lib/db/db.ts` - Legacy DB connection using `MONGODB_URI`
- `src/utils/db.ts` - Current DB connection using `MONGO_URL` (better pooling) ✅ Preferred

**Recommendation:** Consolidate all usage to `src/utils/db.ts`

### Models (10 Total)

#### Cospend (Expense Tracking)
- `src/models/Payment.ts` - Payment records with currency conversion
- `src/models/PaymentSplit.ts` - Individual user splits per payment
- `src/models/RecurringPayment.ts` - Scheduled recurring payments with cron
- `src/models/ExchangeRate.ts` - Cached currency exchange rates

#### Recipes
- `src/models/Recipe.ts` - Full recipe schema with ingredients, instructions, images
- `src/models/UserFavorites.ts` - User favorite recipes

#### Fitness
- `src/models/Exercise.ts` - Exercise database (body parts, equipment, instructions)
- `src/models/WorkoutTemplate.ts` - Workout templates with exercises/sets
- `src/models/WorkoutSession.ts` - Completed workout sessions

#### Gaming
- `src/models/MarioKartTournament.ts` - Tournament management with groups/brackets

### API Routes (47 Total Endpoints)

#### Bible/Misc (1 endpoint)
- `GET /api/bible-quote/+server.ts` - Random Bible verse for error pages

#### Cospend API (13 endpoints)
- `GET /api/cospend/balance/+server.ts` - Calculate user balances
- `GET /api/cospend/debts/+server.ts` - Calculate who owes whom
- `GET /api/cospend/exchange-rates/+server.ts` - Manage exchange rates
- `GET /api/cospend/monthly-expenses/+server.ts` - Monthly expense analytics
- `GET|POST /api/cospend/payments/+server.ts` - CRUD for payments
- `GET|PUT|DELETE /api/cospend/payments/[id]/+server.ts` - Single payment ops
- `GET|POST /api/cospend/recurring-payments/+server.ts` - CRUD recurring payments
- `GET|PUT|DELETE /api/cospend/recurring-payments/[id]/+server.ts` - Single recurring
- `POST /api/cospend/recurring-payments/execute/+server.ts` - Manual execution
- `POST /api/cospend/recurring-payments/cron-execute/+server.ts` - Cron execution
- `GET /api/cospend/recurring-payments/scheduler/+server.ts` - Scheduler status
- `POST /api/cospend/upload/+server.ts` - Receipt image upload

#### Fitness API (8 endpoints)
- `GET|POST /api/fitness/exercises/+server.ts` - List/search/create exercises
- `GET|PUT|DELETE /api/fitness/exercises/[id]/+server.ts` - Single exercise ops
- `GET /api/fitness/exercises/filters/+server.ts` - Get filter options
- `GET|POST /api/fitness/sessions/+server.ts` - List/create workout sessions
- `GET|PUT|DELETE /api/fitness/sessions/[id]/+server.ts` - Single session ops
- `GET|POST /api/fitness/templates/+server.ts` - List/create templates
- `GET|PUT|DELETE /api/fitness/templates/[id]/+server.ts` - Single template ops
- `POST /api/fitness/seed-example/+server.ts` - Seed example data

#### Mario Kart API (8 endpoints)
- `GET|POST /api/mario-kart/tournaments/+server.ts` - List/create tournaments
- `GET|PUT|DELETE /api/mario-kart/tournaments/[id]/+server.ts` - Single tournament
- `GET|PUT /api/mario-kart/tournaments/[id]/bracket/+server.ts` - Bracket management
- `PUT /api/mario-kart/tournaments/[id]/bracket/matches/[matchId]/scores/+server.ts` - Match scores
- `POST|DELETE /api/mario-kart/tournaments/[id]/contestants/+server.ts` - Manage contestants
- `PUT /api/mario-kart/tournaments/[id]/contestants/[contestantId]/dnf/+server.ts` - Mark DNF
- `POST /api/mario-kart/tournaments/[id]/groups/+server.ts` - Group management
- `PUT /api/mario-kart/tournaments/[id]/groups/[groupId]/scores/+server.ts` - Group scores

#### Recipes (Rezepte) API (17 endpoints)
- `POST /api/rezepte/add/+server.ts` - Add new recipe
- `DELETE /api/rezepte/delete/+server.ts` - Delete recipe
- `PUT /api/rezepte/edit/+server.ts` - Edit recipe
- `GET /api/rezepte/search/+server.ts` - Search recipes
- `GET|POST|DELETE /api/rezepte/favorites/+server.ts` - User favorites
- `GET /api/rezepte/favorites/check/[shortName]/+server.ts` - Check if favorite
- `GET /api/rezepte/favorites/recipes/+server.ts` - Get favorite recipes
- `POST /api/rezepte/img/add/+server.ts` - Add recipe image
- `DELETE /api/rezepte/img/delete/+server.ts` - Delete recipe image
- `PUT /api/rezepte/img/mv/+server.ts` - Move/reorder recipe image
- `GET /api/rezepte/items/all_brief/+server.ts` - Get all recipes (brief)
- `GET /api/rezepte/items/[name]/+server.ts` - Get single recipe
- `GET /api/rezepte/items/category/+server.ts` - Get categories
- `GET /api/rezepte/items/category/[category]/+server.ts` - Recipes by category
- `GET /api/rezepte/items/icon/+server.ts` - Get icons
- `GET /api/rezepte/items/icon/[icon]/+server.ts` - Recipes by icon
- `GET /api/rezepte/items/in_season/[month]/+server.ts` - Seasonal recipes
- `GET /api/rezepte/items/tag/+server.ts` - Get tags
- `GET /api/rezepte/items/tag/[tag]/+server.ts` - Recipes by tag
- `GET /api/rezepte/json-ld/[name]/+server.ts` - Recipe JSON-LD for SEO

### Server-Side Utilities

#### Core Utils
- `src/utils/db.ts` - MongoDB connection with pooling ✅ Preferred
- `src/lib/db/db.ts` - Legacy DB connection ⚠️ Deprecated

#### Server Libraries
- `src/lib/server/favorites.ts` - User favorites helper functions
- `src/lib/server/scheduler.ts` - Recurring payment scheduler (node-cron)

#### Business Logic
- `src/lib/utils/categories.ts` - Payment category definitions
- `src/lib/utils/currency.ts` - Currency conversion (Frankfurter API)
- `src/lib/utils/recurring.ts` - Cron expression parsing & scheduling
- `src/lib/utils/settlements.ts` - Settlement payment helpers

#### Authentication
- `src/auth.ts` - Auth.js configuration (Authentik provider)
- `src/hooks.server.ts` - Server hooks (auth, routing, DB init, scheduler)

---

## Frontend JavaScript

### Svelte Stores (src/lib/js/)
- `img_store.js` - Image state store
- `portions_store.js` - Recipe portions state
- `season_store.js` - Seasonal filtering state

### Utility Functions

#### Recipe Utils (src/lib/js/)
- `randomize.js` - Seeded randomization for daily recipe order
- `recipeJsonLd.ts` - Recipe JSON-LD schema generation
- `stripHtmlTags.ts` - HTML tag removal utility

#### General Utils
- `src/utils/cookie.js` - Cookie utilities

### Type Definitions
- `src/types/types.ts` - Recipe TypeScript types (RecipeModelType, BriefRecipeType)
- `src/app.d.ts` - SvelteKit app type definitions

### Configuration
- `src/lib/config/users.ts` - Predefined users for Cospend (alexander, anna)

---

## Frontend Design

### Global CSS (src/lib/css/) - 8 Files, 544 Lines

- `nordtheme.css` (54 lines) - Nord color scheme, CSS variables, global styles
- `form.css` (51 lines) - Form styling
- `action_button.css` (58 lines) - Action button with shake animation
- `icon.css` (52 lines) - Icon styling
- `shake.css` (28 lines) - Shake animation
- `christ.css` (32 lines) - Faith section styling
- `predigten.css` (65 lines) - Sermon section styling
- `rosenkranz.css` (204 lines) - Rosary prayer styling

### Reusable Components (src/lib/components/) - 48 Files

#### Icon Components (src/lib/assets/icons/)
- `Check.svelte`, `Cross.svelte`, `Heart.svelte`, `Pen.svelte`, `Plus.svelte`, `Upload.svelte`

#### UI Components
- `ActionButton.svelte` - Animated action button
- `AddButton.svelte` - Add button
- `EditButton.svelte` - Edit button (floating)
- `FavoriteButton.svelte` - Toggle favorite
- `Card.svelte` (259 lines) ⚠️ Large - Recipe card with hover effects, tags, category
- `CardAdd.svelte` - Add recipe card placeholder
- `FormSection.svelte` - Styled form section wrapper
- `Header.svelte` - Page header
- `UserHeader.svelte` - User-specific header
- `Icon.svelte` - Icon wrapper
- `IconLayout.svelte` - Icon grid layout
- `Symbol.svelte` - Symbol display
- `ProfilePicture.svelte` - User avatar

#### Layout Components
- `LinksGrid.svelte` - Navigation links grid
- `MediaScroller.svelte` - Horizontal scrolling media
- `SeasonLayout.svelte` - Seasonal recipe layout
- `TitleImgParallax.svelte` - Parallax title image

#### Recipe-Specific Components
- `Recipes.svelte` - Recipe list display
- `RecipeEditor.svelte` - Recipe editing form
- `RecipeNote.svelte` - Recipe notes display
- `EditRecipe.svelte` - Edit recipe modal
- `EditRecipeNote.svelte` - Edit recipe notes
- `CreateIngredientList.svelte` - Ingredient list editor
- `CreateStepList.svelte` - Instruction steps editor
- `IngredientListList.svelte` - Multiple ingredient lists
- `IngredientsPage.svelte` - Ingredients tab view
- `InstructionsPage.svelte` - Instructions tab view
- `ImageUpload.svelte` - Recipe image uploader
- `HefeSwapper.svelte` - Yeast type converter
- `SeasonSelect.svelte` - Season selector
- `TagBall.svelte` - Tag bubble
- `TagCloud.svelte` - Tag cloud display
- `Search.svelte` - Recipe search

#### Cospend (Expense) Components
- `PaymentModal.svelte` (716 lines) ⚠️ Very Large - Detailed payment view modal
- `SplitMethodSelector.svelte` - Payment split method chooser
- `UsersList.svelte` - User selection list
- `EnhancedBalance.svelte` - Balance display with charts
- `DebtBreakdown.svelte` - Debt summary
- `BarChart.svelte` - Bar chart visualization

### Layouts (6 Total)
- `src/routes/+layout.svelte` - Root layout (minimal)
- `src/routes/(main)/+layout.svelte` - Main section layout
- `src/routes/rezepte/+layout.svelte` - Recipe section layout
- `src/routes/cospend/+layout.svelte` - Cospend section layout
- `src/routes/glaube/+layout.svelte` - Faith section layout
- `src/routes/fitness/+layout.svelte` - Fitness section layout

### Pages (36 Total)

#### Main Pages (4)
- `(main)/+page.svelte` - Homepage
- `(main)/register/+page.svelte` - Registration
- `(main)/settings/+page.svelte` - Settings
- `+error.svelte` - Error page (with Bible verse)

#### Recipe Pages (15)
- `rezepte/+page.svelte` - Recipe list
- `rezepte/[name]/+page.svelte` - Recipe detail
- `rezepte/add/+page.svelte` - Add recipe
- `rezepte/edit/[name]/+page.svelte` - Edit recipe
- `rezepte/search/+page.svelte` - Search recipes
- `rezepte/favorites/+page.svelte` - Favorite recipes
- `rezepte/category/+page.svelte` - Category list
- `rezepte/category/[category]/+page.svelte` - Category recipes
- `rezepte/icon/+page.svelte` - Icon list
- `rezepte/icon/[icon]/+page.svelte` - Icon recipes
- `rezepte/season/+page.svelte` - Season selector
- `rezepte/season/[month]/+page.svelte` - Seasonal recipes
- `rezepte/tag/+page.svelte` - Tag list
- `rezepte/tag/[tag]/+page.svelte` - Tag recipes
- `rezepte/tips-and-tricks/+page.svelte` - Tips page with converter

#### Cospend Pages (8)
- `cospend/+page.svelte` (20KB!) ⚠️ Very Large - Dashboard
- `cospend/payments/+page.svelte` - Payment list
- `cospend/payments/add/+page.svelte` - Add payment
- `cospend/payments/edit/[id]/+page.svelte` - Edit payment
- `cospend/payments/view/[id]/+page.svelte` - View payment
- `cospend/recurring/+page.svelte` - Recurring payments
- `cospend/recurring/edit/[id]/+page.svelte` - Edit recurring
- `cospend/settle/+page.svelte` - Settlement calculator

#### Fitness Pages (4)
- `fitness/+page.svelte` - Fitness dashboard
- `fitness/sessions/+page.svelte` - Workout sessions
- `fitness/templates/+page.svelte` - Workout templates
- `fitness/workout/+page.svelte` - Active workout

#### Mario Kart Pages (2)
- `mario-kart/+page.svelte` - Tournament list
- `mario-kart/[id]/+page.svelte` - Tournament detail

#### Faith Pages (4)
- `glaube/+page.svelte` - Faith section home
- `glaube/gebete/+page.svelte` - Prayers
- `glaube/predigten/+page.svelte` - Sermons
- `glaube/rosenkranz/+page.svelte` - Rosary

---

## Duplication Analysis

### 🔴 Critical Issues

#### 1. Database Connection Duplication
- **Files:** `src/lib/db/db.ts` vs `src/utils/db.ts`
- **Impact:** 43 API routes, inconsistent env var usage
- **Action:** Consolidate to `src/utils/db.ts`

#### 2. Authorization Pattern (47 occurrences)
```typescript
const session = await locals.auth();
if (!session || !session.user?.nickname) {
  return json({ error: 'Unauthorized' }, { status: 401 });
}
```
- **Action:** Extract to middleware helper

### 🟡 Moderate Issues

#### 3. Formatting Functions (65 occurrences)
- Currency formatting in 12+ files (inline)
- Date formatting scattered across components
- **Action:** Create `src/lib/utils/formatters.ts`

#### 4. Button Styling (121 definitions across 20 files)
- Repeated `.btn-primary`, `.btn-secondary`, `.btn-danger` classes
- **Action:** Create unified `Button.svelte` component

#### 5. Recipe Filtering Logic
- Similar patterns in category/icon/tag/season pages
- **Action:** Extract to shared filter component

### 🟢 Minor Issues

#### 6. Border Radius (22 files)
- Consistent `0.5rem` or `8px` usage
- **Action:** Add CSS variable for design token

#### 7. Large Component Files
- `src/routes/cospend/+page.svelte` (20KB)
- `src/lib/components/PaymentModal.svelte` (716 lines)
- `src/lib/components/Card.svelte` (259 lines)
- **Action:** Consider decomposition

### ✅ Strengths

1. **Excellent Nord Theme Consistency** - 525 occurrences, well-defined CSS variables
2. **Good Architecture** - Clear separation: models, API, components, pages
3. **Type Safety** - Comprehensive TypeScript usage
4. **Scoped Styles** - All component styles properly scoped

---

## Architecture Summary

**Framework:** SvelteKit + TypeScript
**Database:** MongoDB + Mongoose ODM
**Authentication:** Auth.js + Authentik provider
**Styling:** CSS (Nord theme) + Scoped component styles
**State Management:** Svelte stores (minimal - 3 stores)
**API Architecture:** RESTful endpoints in `/routes/api/`

**Module Breakdown:**
- **Recipes (Rezepte):** 17 API endpoints, 15 pages
- **Expense Tracking (Cospend):** 13 API endpoints, 8 pages
- **Fitness Tracking:** 8 API endpoints, 4 pages
- **Mario Kart Tournaments:** 8 API endpoints, 2 pages
- **Faith/Religious Content:** 1 API endpoint, 4 pages
