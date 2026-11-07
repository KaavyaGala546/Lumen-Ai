# Lumen

Floor intelligence for Indian restaurants and hotel F&B — live table alerts, labour, revenue, and a working house from **signup → GST invoice → floor**.

Prices are INR, exclusive of 18% GST. Plans follow table count, not a USD conversion.

## Run

```bash
cd lumen
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite (5173) proxies `/api` to the Lumen API (8787). SQLite lives in `data/lumen.db`.

## Demo GM

- Email: `gm@aangan.in`
- Password: `AanganFriday1`
- House: Aangan, The Banyan, Bandra West, Mumbai · 16 tables
- Plan: Dining ₹6,999 / month + GST, already paid

Or create a new room, map tables, and pay with UPI (`gm@okhdfcbank`) or test card `4242 4242 4242 4242` (PIN `400050`). Decline: `4000 0000 0000 0002`.

## Plans (ex-GST)

| Plan | Tables | Cameras | Price |
| --- | --- | --- | --- |
| Cafe | ≤12 | 2 | ₹2,999 / month |
| Dining | ≤28 | 4 | ₹6,999 / month |
| House | ≤60 | 8 | ₹12,999 / month |
| Property | hotel F&B, multi-room | 16 | ₹24,999 / property / month |
| Chain | 3+ outlets | 8 | ₹9,999 / outlet / month |

Hotel groups on Chain: ₹19,999 / property at volume. Sold to F&B, not IT.

## Product path

1. Landing → **Start a room** or **Open Friday night at Aangan**
2. Signup / login
3. Onboarding (restaurant vs hotel, tables, cameras, recommended plan)
4. Checkout (UPI or card via Lumen Pay, or Stripe INR if `STRIPE_SECRET_KEY` is set)
5. Floor, Handheld, Labor, Revenue, Cameras, Account (profile, billing, team)

## Stripe (optional)

Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY`. Checkout then redirects to Stripe Checkout in INR with GST included. Confirm lands on `/billing/success`.

Without Stripe keys, Lumen Pay runs locally: UPI ID or cards are authorized, brand + last four are stored, PAN is discarded.
