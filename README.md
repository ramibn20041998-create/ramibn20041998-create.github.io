# Pi Digital City

A virtual city on Pi Network where users own, develop, and trade land NFTs. The city contains
exactly **1,000,000 plots** on a 1000×1000 grid — that cap is enforced structurally (by the size
of the coordinate grid itself), not by a counter that could be changed later.

This repo contains a complete, working implementation of the economy described in the spec:
LAD currency, Pi-funded top-ups, primary land sales, 5-level upgrades with a 30% burn, daily
passive rewards, a marketplace with a 10% fee, cosmetic decorations, leaderboards, and an admin
panel — wired to a real Node.js + Firebase backend and a Pi SDK-integrated React frontend.

> **Before you launch:** this is a full, runnable codebase, not a mockup — every economic rule in
> the spec is implemented as real Firestore transactions. But it has not been run against a live
> Pi Sandbox or a real Firebase project (this environment has no network access to test that).
> Budget time for: creating your Firebase project, registering the app in the Pi Developer Portal,
> running `npm install` in both folders, and doing a full sandbox payment test end-to-end before
> going to Mainnet.

---

## 1. Architecture

```
Pi Browser (client)
   │  Pi SDK (auth + payments)
   ▼
React SPA (frontend/) ──HTTPS──▶ Node/Express API (backend/) ──Admin SDK──▶ Firestore
                                        │
                                        └──HTTPS──▶ Pi Platform API (verify/approve/complete)
```

**Every balance-changing action goes through the backend**, inside a Firestore transaction, never
directly from the client. The Firestore security rules (`firebase/firestore.rules`) deny all
client writes to financial collections as defense-in-depth — the Admin SDK on the backend bypasses
those rules by design, so it's the only path that can move LAD, mint land, or change ownership.

### Why land isn't pre-created as 1,000,000 documents

Pre-seeding a million Firestore documents would be slow, costly, and pointless — almost all of
them would sit empty forever. Instead, **the fixed supply is enforced by the grid bounds**
(`CITY_GRID_WIDTH × CITY_GRID_HEIGHT = 1,000,000` in `backend/src/config/constants.js`), and a
land document is only created ("minted") the moment someone buys it (`landService.buyPrimaryLand`).
Buying is gated by a Firestore transaction that checks the document doesn't already exist, so two
people can never claim the same coordinate, and no coordinate outside the grid can ever be sold.
The result is identical from the user's perspective — a fixed, permanent 1,000,000-plot city — but
without ever paying to store a million empty rows.

The city map queries only the lands that have actually been minted within the visible viewport
(`GET /api/lands?xMin=...`); everything else is rendered client-side as an empty, unclaimed tile.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS, mobile-first, dark theme |
| Backend | Node.js 18+ / Express |
| Database | Firebase Firestore |
| Auth | Pi SDK (`Pi.authenticate`) verified server-side against the Pi Platform API |
| Payments | Pi SDK (`Pi.createPayment`) with full approve/complete server-side verification |
| Hosting | Render (backend web service + frontend static site) — see `render.yaml` |

---

## 3. Project structure

```
backend/
  src/
    config/         constants.js (fixed supply, default rates), firebaseAdmin.js
    middleware/      auth, admin guard, error handler
    services/        one file per concern: land, marketplace, rewards, burn, treasury,
                      decorations, leaderboard, payments, settings, admin, users
    routes/          thin Express routers calling into services
  server.js
firebase/
  firestore.rules
  firestore.indexes.json
frontend/
  src/
    lib/             piSdk.js (window.Pi wrapper), api.js (backend client)
    context/         AuthContext (drives the Pi login flow)
    components/      Layout (TopBar/BottomNav), Land (LandCard/LandModal), UI
    pages/           Home, Dashboard, CityMap, Marketplace, LandProfile, Leaderboard,
                      BuyLad, Admin
render.yaml          one-shot Render Blueprint for both services
```

---

## 4. Firestore collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | LAD balance, Pi spent, owned land count, admin/ban flags |
| `lands/{x-y}` | One doc per **minted** plot: owner, level, profile fields, sale status, reward checkpoint |
| `marketplace/{listingId}` | Active/sold/cancelled secondary-sale listings |
| `transactions/{id}` | Immutable log of every economic action, per user |
| `rewards/{id}` | Claim history (amount, land, timestamp) |
| `piPayments/{paymentId}` | Idempotency ledger for Pi→LAD top-ups (keyed by Pi's own payment id) |
| `decorations/{id}` | Cosmetic item catalog |
| `settings/global` | Admin-tunable economy rates (exchange rate, upgrade costs, reward rates, fees) |
| `settings/treasury` | Platform LAD revenue (70% of upgrade burns + marketplace fees + decorations) |
| `settings/cityStats` | Lifetime Pi revenue and lands-sold counters |
| `burnStats/global` (+ `history` subcollection) | Total LAD permanently destroyed, with an event trail |

`backend/src/config/constants.js` documents the default rates seeded into `settings/global` on
first boot; after that, Firestore is the live source of truth and the admin panel edits it.

---

## 5. Economy rules implemented

- **Exchange rate:** 1 Pi = 0.1 LAD (10 Pi = 1 LAD), admin-adjustable.
- **Land price:** 0.5 LAD (5 Pi) to mint any unclaimed plot.
- **Upgrades:** Level 2 (House, 0.1 LAD) → 3 (Shop, 0.25) → 4 (Business Center, 0.5) → 5 (Mega
  Tower, 1 LAD). 30% of every upgrade cost is burned (`burnStats`); the remaining 70% goes to the
  platform treasury.
- **Daily rewards:** 0.001 / 0.003 / 0.008 / 0.02 LAD per day for levels 2–5, accrued continuously
  and claimable anytime. Rewards are checkpointed on every level change so a rate change never
  retroactively re-prices time already earned.
- **Marketplace:** 10% fee on every resale; seller receives 90%.
- **Decorations:** Pure cosmetic LAD sinks (100% platform revenue), never touch reward rates.

---

## 6. Setup

### 6.1 Firebase

1. Create a Firebase project → enable **Firestore** (production mode).
2. Project Settings → Service Accounts → **Generate new private key**. You'll use its
   `project_id`, `client_email`, and `private_key` as backend env vars (or point
   `GOOGLE_APPLICATION_CREDENTIALS` at the downloaded JSON file for local dev).
3. Deploy rules and indexes:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   # (run from the firebase/ folder, or pass --config firebase/firebase.json)
   ```

### 6.2 Pi Developer Portal

1. Register your app at the Pi Developer Portal and note your **App ID** and **server API key**.
2. Replace `frontend/public/validation-key.txt` with the exact domain-verification string the
   Portal gives you (served at `https://yourdomain.com/validation-key.txt`).
3. Keep `PI_SANDBOX=true` / `VITE_PI_SANDBOX=true` while testing in the Pi Sandbox, and switch
   both to `false` only once you've fully tested a real payment round-trip.

### 6.3 Backend

```bash
cd backend
cp .env.example .env   # fill in PI_API_KEY, JWT_SECRET, Firebase credentials
npm install
npm run dev             # http://localhost:4000
```

### 6.4 Frontend

```bash
cd frontend
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm install
npm run dev              # http://localhost:5173
```

Pi SDK features (`Pi.authenticate`, `Pi.createPayment`) only work when the app is actually opened
inside **Pi Browser**; outside of it the UI degrades gracefully with an explanatory message
instead of crashing.

---

## 7. Deploying

`render.yaml` defines both services as a Render Blueprint — push this repo to GitHub, then in
Render choose **New → Blueprint** and point it at the repo. You'll be prompted for the secret env
vars (`PI_API_KEY`, Firebase credentials, `FRONTEND_ORIGIN`, `VITE_API_BASE_URL`). Alternatively,
create the two services manually using the same settings as a reference.

After the first deploy, run the Firestore rules/indexes deploy from §6.1 against your production
project, and set `SEED_ADMIN_USERNAMES` (comma-separated Pi usernames) before anyone logs in, so
your own account is granted admin on first sign-in.

---

## 8. Security notes

- Every Pi payment is verified twice server-side: once against `GET /payments/{id}` before
  approval, and again before crediting LAD on completion, cross-checking the amount against what
  was recorded at approval time.
- `piPayments/{paymentId}` makes crediting idempotent — completing the same payment twice (e.g. a
  retried request, or `onIncompletePaymentFound` re-firing) never double-credits LAD.
- All ownership/balance mutations run inside Firestore transactions with a read-then-write pattern,
  so concurrent requests (e.g. two buyers racing for the same plot) can't corrupt state.
- Firestore security rules deny all direct client writes to financial collections; only the
  backend's Admin SDK credential can write them.

---

## 9. Future expansions

The schema was kept deliberately narrow and additive so these can be layered on without migrating
existing data:

- **Roads / vehicles / factories** — new `level`-independent decoration or building types; the
  `decorations` catalog pattern already supports arbitrary cosmetic or (with a small service
  change) functional items per land.
- **Land renting** — add a `rental` sub-object to a land doc (`renterId`, `expiresAt`, `dailyRate`)
  and a new `rentalService.js` mirroring the existing transaction pattern.
- **Guilds / city districts** — new top-level `guilds/{id}` collection; lands gain an optional
  `guildId` field.
- **Governance voting / staking** — new `proposals/{id}` and `stakes/{uid}` collections; LAD
  ledger primitives in `ladService.js` (`debitLad`/`creditLad`) already generalize to a staking
  lock by adding a `lockedLad` field on the user doc.
- **Advertising billboards** — a `featuredListings`/`billboards` collection with the same
  Pi-or-LAD purchase flow already used for decorations.

---

## 10. What's stubbed vs. real

Everything described in the spec is implemented with real logic, not placeholders: payment
verification, land minting, upgrades with burn, reward accrual/claim, marketplace listing/buying
with fees, decorations, leaderboards, and the admin settings/ban/listing-removal tools. The parts
that genuinely need your own input before launch are credentials (Firebase service account, Pi API
key), a brief UI polish pass once you can actually run `npm run dev` and look at it, and a full
sandbox payment test — none of that can be verified from inside this conversation.
