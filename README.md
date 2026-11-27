# Expo Supabase Starter

A production-ready **React Native + Expo** starter for iOS and Android, with a **Supabase** backend: authentication, user profiles with row level security, and push notifications sent from an Edge Function, all already wired up. Clone it, add your Supabase keys and start building your actual app on day one.

[![CI](https://github.com/hassan-forge/expo-supabase-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/hassan-forge/expo-supabase-starter/actions/workflows/ci.yml)
![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-auth%20%2B%20Postgres-3ECF8E?logo=supabase)

## Features

- 🔐 **Authentication with Supabase**
  - Email and password sign-up and sign-in
  - Google sign-in (OAuth with PKCE through the system browser)
  - Native Sign in with Apple on iOS (with a hashed nonce)
  - Forgot-password email and in-app password change
  - Email-confirmation and reset links that open straight back into the app
- 🧭 **Protected routes with Expo Router**: signed-out users only see the auth screens, signed-in users only see the app (`Stack.Protected`)
- 💾 **Persistent sessions** stored with `expo-sqlite`'s `localStorage`, auto-refreshed only while the app is in the foreground
- 👤 **User profiles** in Postgres, created automatically on sign-up and protected by row level security
- 🔔 **Push notifications**: permission flow, Android channel and the device's Expo push token saved to the user's profile
- ⚡ **Supabase Edge Function** (`send-push`) that sends a notification to the signed-in user's device through the Expo push API, runs every query under the caller's own permissions, and clears tokens Expo reports as dead
- 📱 **Native tabs** (SF Symbols on iOS, Material icons on Android)
- 🌗 **Light and dark mode** with a small theme and reusable UI components
- ✅ **Strict TypeScript**, typed Supabase queries and ESLint

## Tech stack

| Area | Tools |
| --- | --- |
| App | React Native 0.88, Expo SDK 58, Expo Router, TypeScript |
| Backend | Supabase (Auth, Postgres, row level security, Edge Functions on Deno) |
| Storage | expo-sqlite (`localStorage`) |
| Auth | Supabase Auth, expo-web-browser, expo-apple-authentication, expo-crypto |
| Notifications | expo-notifications, expo-device |
| Quality | ESLint (eslint-config-expo), `tsc --noEmit`, Deno tests for the Edge Function, GitHub Actions CI |

## Project structure

```
src/
  app/
    _layout.tsx            Root layout: auth provider, splash screen and route guards
    (auth)/                Sign in, sign up, forgot password (signed-out only)
    (app)/                 Home and Profile tabs (signed-in only)
  components/
    ui/                    Button, TextField, Screen, FormMessage
  hooks/                   useProfile, useTheme, useColorScheme
  lib/
    supabase.ts            Supabase client
    auth.ts                Email, Google and Apple sign-in helpers
    notifications.ts       Push permission and token registration
    database.types.ts      Typed database schema
  providers/
    auth-provider.tsx      Session state for the whole app
supabase/
  migrations/              SQL for the profiles table, RLS policies and sign-up trigger
  functions/send-push/
    index.ts               Edge Function: auth check, profile lookup under RLS, Expo push call
    push.ts                Input validation, Expo request and ticket handling (no I/O)
    push_test.ts           Unit tests, run with `deno test`
```

## Getting started

### 1. Install

```bash
git clone https://github.com/hassan-forge/expo-supabase-starter.git
cd expo-supabase-starter
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql).
3. Copy the env file and add your project URL and publishable key (**Project Settings → API**):

   ```bash
   cp .env.example .env.local
   ```

4. In **Authentication → URL Configuration**, add `exposupabasestarter://auth/callback` to the redirect URLs. While developing in Expo Go, also add the `exp://…/--/auth/callback` URL printed by `Linking.createURL`.

### 3. Run

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator. Email sign-in works in Expo Go. Google, Apple and push notifications are best tested in a [development build](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
npx eas-cli@latest build --profile development
```

### Optional: Google and Apple sign-in

- **Google:** enable the Google provider in **Authentication → Providers** and add your Google OAuth client ID and secret.
- **Apple:** enable the Apple provider and add your app's bundle ID (`com.hassanforge.exposupabasestarter`, change it in `app.json`). Sign in with Apple needs an Apple Developer account.

### Optional: push notifications

Link the project to EAS so the app has a project ID, then build on a physical device:

```bash
npx eas-cli@latest init
```

Tap **Enable push notifications** on the Home tab. The device's Expo push token is saved in `profiles.expo_push_token`.

To send notifications from the backend, deploy the Edge Function:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy send-push
# only if "enhanced push security" is on for your Expo project:
npx supabase secrets set EXPO_ACCESS_TOKEN=your-expo-access-token
```

Then tap **Send a test notification** on the Home tab. The app calls the function with the user's session; the function reads that user's token under row level security and sends the message through the [Expo push API](https://docs.expo.dev/push-notifications/sending-notifications/). A user can only ever notify their own device. Other server code (a cron job, a database webhook) can call the same function or reuse `push.ts`.

Run the function's tests with [Deno](https://deno.com):

```bash
cd supabase/functions/send-push
deno test
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` | Open on a simulator or emulator |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with TypeScript |

## License

MIT, see [LICENSE](LICENSE).

---

Built by [Hassan](https://github.com/hassan-forge), React Native developer.
