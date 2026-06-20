# Kharchay — Mobile App

> **Kharchay** (خرچے, Urdu for *“expenses”*) is a shared-household expense & **mess-management** app for homes and hostels — people who split rent and bills *and* run a common kitchen. This repo is the **Expo / React Native** client.

The API it talks to lives in **[kharchay-backend](https://github.com/Abdullah5111/kharchay-backend)** (Django + DRF).

---

## What it does

The app has two modes you switch between per group:

- **My Expenses** — your standing (*“you owe ₨X” / “you’re owed ₨X”*), monthly activity, Haazri (meal) history, payments, and notifications.
- **Management** *(admins)* — record expenses, mark daily attendance, run month-end settlement, and approve payments.

### Highlights

- 📧 **Passwordless sign-in** — email OTP, JWT stored in secure storage.
- 👥 **Groups & friends** — create a group, invite friends, assign admins.
- 🧾 **Ledgers** — Monthly Expenses, Kitchen Expenses, Workplace Items with equal/custom splits and month finalization.
- 🍽️ **Haazri** — mark who ate each meal (with guest multipliers) and add shared extras.
- 💸 **Settlement** — per-meal-rate kitchen division and a clear **“who pays whom”** breakdown.
- 🧷 **Payments** — submit a manual payment with a **proof photo**; admins approve/reject from a review queue.
- 🔔 **Notifications** — in-app feed + push (Expo).

---

## Tech stack

- **Expo SDK 51** · **React Native 0.74** · **TypeScript**
- **Expo Router** (file-based navigation)
- **NativeWind 4** (Tailwind for RN) — clean, rounded “fresh-fintech” mint/green UI
- **@tanstack/react-query** for server state
- **expo-secure-store** (tokens) · **expo-notifications** (push) · **expo-image-picker** (proof upload)

---

## Project structure

```
app/
├── _layout.tsx           # root providers (query client, auth, selected group)
├── (auth)/               # email-OTP sign-in flow
└── (app)/                # authenticated app
    ├── _layout.tsx       # tab shell (role-gated Management)
    ├── profile.tsx       # mode toggle + My Expenses links
    ├── friends, groups, group/[id]
    ├── ledger/[type].tsx # reusable Monthly/Kitchen/Workplace screen
    ├── haazri, my-haazri
    ├── standing, activity, settlement
    ├── my-payments, payment-approvals
    └── notifications
components/                # Screen, Card, Button, AmountInput, modals, …
lib/                       # api client, auth, react-query hooks per domain
```

---

## Getting started

```bash
npm install
npx expo start            # then press 'a' for Android, or scan the QR in Expo Go
```

### Point the app at your API

The client reads the API base from `EXPO_PUBLIC_API_URL` (default: `http://10.0.2.2:8020/api`, the Android-emulator alias for `localhost:8020`).

```bash
# Android emulator + local backend → the default works.
# Physical device → use your machine's LAN IP:
EXPO_PUBLIC_API_URL=http://192.168.1.50:8020/api npx expo start
```

Run the backend first (see [kharchay-backend](https://github.com/Abdullah5111/kharchay-backend) — `docker compose up`).

### Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server. |
| `npm run android` | Start and open on a connected Android device/emulator. |
| `npm test` | Run the Jest test suite. |
| `npx tsc --noEmit` | Type-check (CI gate). |

### Building an APK

The app is designed to be distributed internally as an Android APK (iOS-ready in code). Use **EAS Build** (`eas build -p android --profile preview`) or a local Expo build once your `EXPO_PUBLIC_API_URL` points at the deployed API.

---

## Notes for contributors

- **Types come from the real serializers.** `api.get<T>()` *asserts* types — it does not validate them — so the `lib/*.ts` data-layer types are written to match the backend serializers exactly. Keep them in sync when the API changes.
- Money values cross the wire as **strings** (`Decimal`) and are formatted with a shared `fmt()` helper.

---

## Status

**Feature-complete** across the full flow: sign-in → groups → expenses → Haazri → settlement → payments. The proof-image **multipart upload** is the one path that benefits from an on-device check before release.

---

## Related

- ⚙️ API / backend: **[kharchay-backend](https://github.com/Abdullah5111/kharchay-backend)**

## License

No license has been assigned yet — all rights reserved by the author.
