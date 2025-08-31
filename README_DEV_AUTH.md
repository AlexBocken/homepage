# Development Authentication Bypass

This document explains how to safely disable authentication during development.

## 🔐 Security Overview

The authentication bypass is designed with multiple layers of security:

1. **Development Mode Only**: Only works when `vite dev` is running
2. **Explicit Opt-in**: Requires setting `DEV_DISABLE_AUTH=true` 
3. **Production Protection**: Build fails if enabled in production mode
4. **Environment Isolation**: Uses local environment files (gitignored)

## 🚀 Usage

### 1. Create Local Environment File

Create `.env.local` (this file is gitignored):

```bash
# Copy from example
cp .env.local.example .env.local
```

### 2. Enable Development Bypass

Edit `.env.local` and set:

```env
DEV_DISABLE_AUTH=true
```

### 3. Start Development Server

```bash
pnpm run dev
```

You'll see a warning in the console:
```
🚨 AUTH DISABLED: Development mode with DEV_DISABLE_AUTH=true
```

### 4. Access Protected Routes

Protected routes (`/rezepte/edit/*`, `/rezepte/add`) will now be accessible without authentication.

## 🛡️ Security Guarantees

### Production Safety
- **Build-time Check**: Production builds fail if `DEV_DISABLE_AUTH=true`
- **Runtime Check**: Double verification using `dev` flag from `$app/environment`
- **No Environment Leakage**: Uses `process.env` (server-only) not client environment

### Development Isolation  
- **Gitignored Files**: `.env.local` is never committed
- **Example Template**: `.env.local.example` shows safe defaults
- **Clear Warnings**: Console warns when auth is disabled

## 🧪 Testing the Security

### Test Production Build Safety
```bash
# This should FAIL with security error
DEV_DISABLE_AUTH=true pnpm run build
```

### Test Normal Production Build
```bash
# This should succeed
pnpm run build
```

## 🔄 Re-enabling Authentication

Set in `.env.local`:
```env
DEV_DISABLE_AUTH=false
```

Or simply delete/rename the `.env.local` file.

## ⚠️ Important Notes

- **Never** commit `.env.local` to git
- **Never** set `DEV_DISABLE_AUTH=true` in production environment
- The bypass provides a mock session with `rezepte_users` group access
- All other authentication flows (signin pages, etc.) remain unchanged