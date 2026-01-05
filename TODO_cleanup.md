# TypeScript Error Cleanup TODO

Generated from `pnpm check` output. Total errors found: 1239

## Categories

### 1. Implicit 'any' Types (High Priority - Easy Fixes)
Files with missing type annotations for function parameters

### 2. Mongoose Type Issues
Property access and type compatibility issues with Mongoose models

### 3. Null/Undefined Safety
Properties that may be null or undefined

### 4. Type Mismatches
Arguments and assignments with incompatible types

### 5. Missing Imports/Definitions
Cannot find name/namespace errors

---

## Detailed Errors

### Category 1: Implicit 'any' Types

#### src/lib/components/do_on_key.js
- [x] Line 1:27 - Parameter 'event' implicitly has an 'any' type ✅
- [x] Line 1:34 - Parameter 'key' implicitly has an 'any' type ✅
- [x] Line 1:39 - Parameter 'needsctrl' implicitly has an 'any' type ✅
- [x] Line 1:50 - Parameter 'fn' implicitly has an 'any' type ✅

#### src/lib/js/randomize.js
- [x] Line 2:21 - Parameter 'a' implicitly has an 'any' type ✅
- [x] Line 11:28 - Parameter 'array' implicitly has an 'any' type ✅

#### src/utils/cookie.js
- [x] Line 2:35 - Parameter 'request' implicitly has an 'any' type ✅
- [x] Line 4:45 - Parameter 'cookie' implicitly has an 'any' type ✅

#### src/hooks.server.ts
- [ ] Line 26:32 - Binding element 'event' implicitly has an 'any' type
- [ ] Line 26:39 - Binding element 'resolve' implicitly has an 'any' type

#### src/lib/js/stripHtmlTags.ts
- [x] Line 4:31 - Parameter 'input' implicitly has an 'any' type ✅

#### src/lib/utils/settlements.ts
- [ ] Line 51:40 - Parameter 'split' implicitly has an 'any' type
- [ ] Line 57:41 - Parameter 'split' implicitly has an 'any' type

#### src/routes/[recipeLang=recipeLang]/favorites/+page.server.ts
- [ ] Line 25:49 - Parameter 'recipe' implicitly has an 'any' type

#### src/routes/api/cospend/payments/+server.ts
- [ ] Line 135:48 - Parameter 'split' implicitly has an 'any' type

### Category 2: Mongoose/Model Type Issues

#### src/models/RecurringPayment.ts
- [ ] Line 98:20 - Property 'frequency' does not exist on type

#### src/routes/api/cospend/debts/+server.ts
- [ ] Line 36:64 - Property '_id' does not exist on FlattenMaps type
- [ ] Line 54:21 - Property '_id' does not exist on FlattenMaps type
- [ ] Line 54:56 - Property '_id' does not exist on FlattenMaps type

#### src/routes/api/generate-alt-text/+server.ts
- [ ] Line 60:34 - Type 'never[]' is missing properties (DocumentArray)
- [ ] Lines 62-75 - Multiple 'possibly null/undefined' errors for recipe.translations

#### src/routes/api/generate-alt-text-bulk/+server.ts
- [ ] Lines 93-108 - Similar DocumentArray and null/undefined issues

### Category 3: Null/Undefined Safety

#### src/lib/server/middleware/auth.ts
- [ ] Lines 42-44 - Type 'string | null | undefined' not assignable to 'string | undefined' (3 instances)
- [ ] Lines 77-79 - Same issue (3 more instances)

### Category 4: Error Handling (unknown type)

#### src/routes/api/cospend/payments/+server.ts
- [ ] Line 91:70 - 'e' is of type 'unknown'

#### src/routes/api/cospend/payments/[id]/+server.ts  
- [ ] Line 26:9 - 'e' is of type 'unknown'
- [ ] Line 88:9 - 'e' is of type 'unknown'
- [ ] Line 121:9 - 'e' is of type 'unknown'

#### src/routes/api/cospend/upload/+server.ts
- [ ] Line 59:9 - 'err' is of type 'unknown'

### Category 5: Missing Definitions

#### src/lib/server/scheduler.ts
- [ ] Line 10:17 - Cannot find namespace 'cron'
- [ ] Line 30:7 - Invalid argument for TaskOptions

#### src/routes/(main)/settings/+page.server.ts
- [ ] Line 6:22 - Cannot find name 'authenticateUser'

#### src/hooks.server.ts
- [ ] Lines 39, 51, 61 - error() function doesn't accept custom object format

### Category 6: Aggregate Pipeline Issues

#### src/routes/api/cospend/monthly-expenses/+server.ts
- [ ] Line 79:45 - No matching overload for aggregate pipeline
- [ ] Line 115:62 - 'value' is of type 'unknown'
- [ ] Line 125:39 - Type incompatibility in map function

### Category 7: Svelte Component Props

#### Various .svelte files
- [ ] Multiple implicit 'any' types in event handlers and derived state
- [ ] Missing prop type definitions
- [ ] Element binding type issues

---

## Quick Wins (Start Here)

1. **do_on_key.js** - Add type annotations (4 parameters)
2. **randomize.js** - Add type annotations (2 parameters)  
3. **cookie.js** - Add type annotations (2 parameters)
4. **stripHtmlTags.ts** - Add input parameter type
5. **Error handling** - Type catch blocks properly (`catch (e: unknown)`)

## Progress Tracking

- Total Errors: 1239
- Fixed: 12
- Remaining: 1227
- Categories Completed: Quick Wins (Category 1 - Partial)

Last Updated: Mon Jan  5 11:48:00 PM CET 2026
