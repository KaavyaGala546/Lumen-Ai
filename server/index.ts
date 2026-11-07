import "dotenv/config";
import "./db.ts";
import { db } from "./db.ts";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  buildUrls,
  deleteCamera,
  ffmpegAvailable,
  getCamera,
  listCameras,
  publicCamera,
  readFrame,
  startCamera,
  stopCamera,
} from "./cameras.ts";

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || "lumen-dev-secret-change-in-prod";
const CLIENT = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

const GST_RATE = 0.18;
const PLANS: Record<string, { name: string; amount: number }> = {
  cafe: { name: "Lumen Cafe", amount: 299900 },
  dining: { name: "Lumen Dining", amount: 699900 },
  house: { name: "Lumen House", amount: 1299900 },
  property: { name: "Lumen Property", amount: 2499900 },
  chain: { name: "Lumen Chain", amount: 999900 },
};

function gstInclusive(paise: number) {
  return Math.round(paise * (1 + GST_RATE));
}

type JwtUser = { uid: number; email: string };

type UserRow = { id: number; email: string; name: string; password_hash: string };
type RestaurantRow = {
  id: number;
  user_id: number;
  name: string;
  city: string;
  tables: number;
  cameras: number;
  avg_check: number;
};
type SubRow = {
  id: number;
  user_id: number;
  plan: string;
  status: string;
  amount: number;
  brand: string | null;
  last4: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_session_id: string | null;
  cancel_at_period_end: number;
  current_period_end: string | null;
};
type InvoiceRow = {
  id: number;
  number: string;
  plan: string;
  amount: number;
  status: string;
  brand: string | null;
  last4: string | null;
  created_at: string;
};
type TeamRow = { id: number; name: string; role: string; section: string };

function sign(user: UserRow) {
  return jwt.sign({ uid: user.id, email: user.email } satisfies JwtUser, JWT_SECRET, {
    expiresIn: "14d",
  });
}

function auth(req: express.Request): JwtUser {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw Object.assign(new Error("Sign in required"), { status: 401 });
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    throw Object.assign(new Error("Session expired"), { status: 401 });
  }
}

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name };
}

function publicRestaurant(r: RestaurantRow | undefined) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    tables: r.tables,
    cameras: r.cameras,
    avgCheck: r.avg_check,
  };
}

function publicSub(s: SubRow | undefined) {
  if (!s) return null;
  return {
    plan: s.plan,
    status: s.status,
    amount: s.amount,
    brand: s.brand,
    last4: s.last4,
    cancelAtPeriodEnd: Boolean(s.cancel_at_period_end),
    currentPeriodEnd: s.current_period_end,
    active: s.status === "active" || s.status === "trialing",
  };
}

function loadAccount(uid: number) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid) as UserRow | undefined;
  if (!user) throw Object.assign(new Error("Account missing"), { status: 401 });
  const restaurant = db.prepare("SELECT * FROM restaurants WHERE user_id = ?").get(uid) as
    | RestaurantRow
    | undefined;
  const subscription = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(uid) as
    | SubRow
    | undefined;
  const invoices = db
    .prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY id DESC LIMIT 12")
    .all(uid) as InvoiceRow[];
  const team = db.prepare("SELECT id, name, role, section FROM team WHERE user_id = ?").all(uid) as TeamRow[];
  return {
    user: publicUser(user),
    restaurant: publicRestaurant(restaurant),
    subscription: publicSub(subscription),
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      plan: i.plan,
      amount: i.amount,
      status: i.status,
      brand: i.brand,
      last4: i.last4,
      createdAt: i.created_at,
    })),
    team,
    gateway: stripe ? "stripe" : "lumen",
  };
}

function luhn(num: string) {
  const s = num.replace(/\D/g, "");
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = Number(s[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return s.length >= 13 && s.length <= 19 && sum % 10 === 0;
}

function brandOf(num: string) {
  const s = num.replace(/\D/g, "");
  if (s.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(s) || s.startsWith("222")) return "mastercard";
  if (/^3[47]/.test(s)) return "amex";
  if (s.startsWith("6") || s.startsWith("81") || s.startsWith("508")) return "rupay";
  return "card";
}

function invoiceNumber(uid: number) {
  const row = db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE user_id = ?").get(uid) as { c: number };
  return `LM-${1000 + uid * 17 + Number(row.c) + 1}`;
}

function activate(uid: number, plan: string, brand: string, last4: string, stripeIds?: {
  customer?: string;
  subscription?: string;
  session?: string;
}) {
  const spec = PLANS[plan] ?? PLANS.dining;
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86400000).toISOString();
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(uid) as
    | { id: number }
    | undefined;
  if (existing) {
    db.prepare(
      `UPDATE subscriptions SET plan=?, status='active', amount=?, brand=?, last4=?,
        stripe_customer_id=COALESCE(?, stripe_customer_id),
        stripe_subscription_id=COALESCE(?, stripe_subscription_id),
        stripe_session_id=COALESCE(?, stripe_session_id),
        cancel_at_period_end=0, current_period_end=? WHERE user_id=?`,
    ).run(
      plan,
      spec.amount,
      brand,
      last4,
      stripeIds?.customer ?? null,
      stripeIds?.subscription ?? null,
      stripeIds?.session ?? null,
      end,
      uid,
    );
  } else {
    db.prepare(
      `INSERT INTO subscriptions
        (user_id, plan, status, amount, brand, last4, stripe_customer_id, stripe_subscription_id, stripe_session_id, cancel_at_period_end, current_period_end, created_at)
       VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      uid,
      plan,
      spec.amount,
      brand,
      last4,
      stripeIds?.customer ?? null,
      stripeIds?.subscription ?? null,
      stripeIds?.session ?? null,
      end,
      now.toISOString(),
    );
  }
  db.prepare(
    "INSERT INTO invoices (user_id, number, plan, amount, status, brand, last4, created_at) VALUES (?, ?, ?, ?, 'paid', ?, ?, ?)",
  ).run(uid, invoiceNumber(uid), plan, gstInclusive(spec.amount), brand, last4, now.toISOString());
}

const app = express();
app.use(cors({ origin: CLIENT, credentials: true }));

app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.json({ received: true });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"] as string,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return res.status(400).send("invalid signature");
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = Number(session.client_reference_id || session.metadata?.userId);
      const plan = (session.metadata?.plan || "dining") as string;
      if (uid) {
        activate(uid, plan, "card", "****", {
          customer: String(session.customer || ""),
          subscription: String(session.subscription || ""),
          session: session.id,
        });
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      db.prepare("UPDATE subscriptions SET status='canceled' WHERE stripe_subscription_id = ?").run(sub.id);
    }
    res.json({ received: true });
  },
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, gateway: stripe ? "stripe" : "lumen" });
});

app.get("/api/config", (_req, res) => {
  res.json({ stripe: Boolean(stripe), gateway: stripe ? "stripe" : "lumen" });
});

app.post("/api/leads", (req, res) => {
  const restaurant = String(req.body.restaurant || "").trim();
  const city = String(req.body.city || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const tables = Number(req.body.tables || 16);
  if (!restaurant || !city || !email) return res.status(400).json({ error: "Restaurant, city, and email are required." });
  db.prepare(
    "INSERT INTO leads (restaurant, city, email, tables, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(restaurant, city, email, tables, new Date().toISOString());
  res.json({ ok: true });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email.includes("@")) return res.status(400).json({ error: "Name and a real email are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const taken = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (taken) return res.status(409).json({ error: "That email already has a Lumen account." });
  const now = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(email, name, bcrypt.hashSync(password, 10), now);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid)) as UserRow;
  const lead = db.prepare("SELECT * FROM leads WHERE email = ? ORDER BY id DESC").get(email) as
    | { restaurant: string; city: string; tables: number }
    | undefined;
  if (lead) {
    db.prepare(
      "INSERT INTO restaurants (user_id, name, city, tables, cameras, avg_check, created_at) VALUES (?, ?, ?, ?, 4, 950, ?)",
    ).run(user.id, lead.restaurant, lead.city, lead.tables || 16, now);
  }
  res.json({ token: sign(user), ...loadAccount(user.id) });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is wrong." });
  }
  res.json({ token: sign(user), ...loadAccount(user.id) });
});

app.post("/api/auth/forgot", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user) return res.json({ ok: true });
  const token = randomBytes(24).toString("hex");
  db.prepare("INSERT OR REPLACE INTO resets (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    user.id,
    Date.now() + 1000 * 60 * 60,
  );
  res.json({ ok: true, resetUrl: `${CLIENT}/reset?token=${token}` });
});

app.post("/api/auth/reset", (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const row = db.prepare("SELECT * FROM resets WHERE token = ?").get(token) as
    | { user_id: number; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return res.status(400).json({ error: "Reset link is expired." });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), row.user_id);
  db.prepare("DELETE FROM resets WHERE token = ?").run(token);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const { uid } = auth(req);
  res.json(loadAccount(uid));
});

app.patch("/api/account", (req, res) => {
  const { uid } = auth(req);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid) as UserRow;
  const name = String(req.body.name || user.name).trim();
  if (req.body.password) {
    if (!bcrypt.compareSync(String(req.body.currentPassword || ""), user.password_hash)) {
      return res.status(400).json({ error: "Current password is wrong." });
    }
    const password = String(req.body.password);
    if (password.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
    db.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?").run(
      name,
      bcrypt.hashSync(password, 10),
      uid,
    );
  } else {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, uid);
  }
  res.json(loadAccount(uid));
});

app.put("/api/restaurant", (req, res) => {
  const { uid } = auth(req);
  const name = String(req.body.name || "").trim();
  const city = String(req.body.city || "").trim();
  const tables = Math.max(4, Math.min(200, Number(req.body.tables || 16)));
  const cameras = Math.max(1, Math.min(24, Number(req.body.cameras || 4)));
  const avgCheck = Math.max(80, Math.min(8000, Number(req.body.avgCheck || 950)));
  if (!name || !city) return res.status(400).json({ error: "Restaurant name and city are required." });
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM restaurants WHERE user_id = ?").get(uid);
  if (existing) {
    db.prepare(
      "UPDATE restaurants SET name=?, city=?, tables=?, cameras=?, avg_check=? WHERE user_id=?",
    ).run(name, city, tables, cameras, avgCheck, uid);
  } else {
    db.prepare(
      "INSERT INTO restaurants (user_id, name, city, tables, cameras, avg_check, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(uid, name, city, tables, cameras, avgCheck, now);
  }
  res.json(loadAccount(uid));
});

app.get("/api/team", (req, res) => {
  const { uid } = auth(req);
  res.json({ team: loadAccount(uid).team });
});

app.post("/api/team", (req, res) => {
  const { uid } = auth(req);
  const name = String(req.body.name || "").trim();
  const role = String(req.body.role || "server").trim();
  const section = String(req.body.section || "Floor").trim();
  if (!name) return res.status(400).json({ error: "Name is required." });
  db.prepare("INSERT INTO team (user_id, name, role, section) VALUES (?, ?, ?, ?)").run(uid, name, role, section);
  res.json(loadAccount(uid));
});

app.delete("/api/team/:id", (req, res) => {
  const { uid } = auth(req);
  db.prepare("DELETE FROM team WHERE id = ? AND user_id = ?").run(Number(req.params.id), uid);
  res.json(loadAccount(uid));
});

app.post("/api/billing/checkout", async (req, res) => {
  try {
  const { uid } = auth(req);
  const plan = String(req.body.plan || "dining");
  const spec = PLANS[plan];
  if (!spec) return res.status(400).json({ error: "Unknown plan." });
  const account = loadAccount(uid);
  if (!account.restaurant) return res.status(400).json({ error: "Map the room before you pay." });
  if (!stripe) {
    return res.json({ mode: "lumen", url: `/checkout?plan=${plan}` });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: String(uid),
    customer_email: account.user.email,
    success_url: `${CLIENT}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${CLIENT}/checkout?plan=${plan}`,
    metadata: { userId: String(uid), plan },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "inr",
          unit_amount: gstInclusive(spec.amount),
          recurring: { interval: "month" },
          product_data: { name: spec.name, description: `${account.restaurant.name} · ${account.restaurant.city} · GST included` },
        },
      },
    ],
  });
  db.prepare(
    `INSERT INTO subscriptions (user_id, plan, status, amount, cancel_at_period_end, created_at, stripe_session_id)
     VALUES (?, ?, 'incomplete', ?, 0, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan, stripe_session_id=excluded.stripe_session_id`,
  ).run(uid, plan, spec.amount, new Date().toISOString(), session.id);
  res.json({ mode: "stripe", url: session.url });
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
    res.status(status || 500).json({ error: err instanceof Error ? err.message : "Checkout failed." });
  }
});

app.post("/api/billing/confirm", async (req, res) => {
  try {
    const { uid } = auth(req);
    const sessionId = String(req.body.sessionId || "");
    if (!stripe || !sessionId) return res.status(400).json({ error: "Missing Stripe session." });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return res.status(400).json({ error: "Payment is not complete." });
    }
    const plan = session.metadata?.plan || "dining";
    activate(uid, plan, "card", "****", {
      customer: String(session.customer || ""),
      subscription: String(session.subscription || ""),
      session: session.id,
    });
    res.json(loadAccount(uid));
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
    res.status(status || 500).json({ error: err instanceof Error ? err.message : "Could not confirm payment." });
  }
});

app.post("/api/billing/pay", (req, res) => {
  const { uid } = auth(req);
  const plan = String(req.body.plan || "dining");
  if (!PLANS[plan]) return res.status(400).json({ error: "Unknown plan." });
  const account = loadAccount(uid);
  if (!account.restaurant) return res.status(400).json({ error: "Map the room before you pay." });
  if (stripe) {
    return res.status(400).json({ error: "This house is on Stripe Checkout. Use Pay with Stripe." });
  }
  const method = String(req.body.method || "card");
  if (method === "upi") {
    const vpa = String(req.body.vpa || "").trim().toLowerCase();
    if (!/^[\w.-]{2,}@[a-z]{2,}$/.test(vpa)) {
      return res.status(400).json({ error: "Enter a valid UPI ID, like gm@okhdfcbank." });
    }
    activate(uid, plan, "upi", vpa.slice(-4));
    return res.json(loadAccount(uid));
  }
  const number = String(req.body.number || "");
  const digits = number.replace(/\D/g, "");
  const expMonth = Number(req.body.expMonth);
  const expYear = Number(req.body.expYear);
  const cvc = String(req.body.cvc || "").replace(/\D/g, "");
  const name = String(req.body.name || "").trim();
  const pin = String(req.body.pin || req.body.zip || "").trim();
  if (!name) return res.status(400).json({ error: "Name on the card is required." });
  if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: "Billing PIN must be 6 digits." });
  if (cvc.length < 3) return res.status(400).json({ error: "CVC is required." });
  const now = new Date();
  const exp = new Date(expYear < 100 ? 2000 + expYear : expYear, expMonth - 1, 1);
  if (!expMonth || !expYear || exp < new Date(now.getFullYear(), now.getMonth(), 1)) {
    return res.status(402).json({ error: "That card is expired." });
  }
  if (digits === "4000000000000002") return res.status(402).json({ error: "Your card was declined." });
  if (digits === "4000000000009995") return res.status(402).json({ error: "Insufficient funds." });
  if (digits === "4000000000000069") return res.status(402).json({ error: "Your card is expired." });
  if (!luhn(digits)) return res.status(400).json({ error: "Check the card number." });
  activate(uid, plan, brandOf(digits), digits.slice(-4));
  res.json(loadAccount(uid));
});

app.post("/api/billing/cancel", (req, res) => {
  const { uid } = auth(req);
  db.prepare("UPDATE subscriptions SET cancel_at_period_end = 1 WHERE user_id = ? AND status = 'active'").run(uid);
  res.json(loadAccount(uid));
});

app.post("/api/billing/resume", (req, res) => {
  const { uid } = auth(req);
  db.prepare("UPDATE subscriptions SET cancel_at_period_end = 0 WHERE user_id = ? AND status = 'active'").run(uid);
  res.json(loadAccount(uid));
});

app.get("/api/cameras", (req, res) => {
  const { uid } = auth(req);
  res.json({ cameras: listCameras(uid), ffmpeg: ffmpegAvailable() });
});

app.post("/api/cameras", (req, res) => {
  const { uid } = auth(req);
  const name = String(req.body.name || "").trim();
  const brand = String(req.body.brand || "hikvision");
  const host = String(req.body.host || "").trim();
  const port = Math.max(1, Number(req.body.port || 554));
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const channel = Math.max(1, Number(req.body.channel || 1));
  const tables = String(req.body.tables || "1,2,3,4,5,6");
  if (!name) return res.status(400).json({ error: "Name the camera — Dining north, Patio, etc." });
  if (!host && !req.body.rtspUrl && !req.body.snapshotUrl) {
    return res.status(400).json({ error: "Enter the camera IP, or paste an RTSP / snapshot URL." });
  }
  const urls = buildUrls({
    brand,
    host: host || "0.0.0.0",
    port,
    username,
    password,
    channel,
    rtspUrl: req.body.rtspUrl,
    snapshotUrl: req.body.snapshotUrl,
  });
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO cameras (user_id, name, brand, host, port, username, password, channel, rtsp_url, snapshot_url, tables, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?)`,
    )
    .run(uid, name, brand, host, port, username, password, channel, urls.rtsp, urls.snapshot, tables, now);
  const row = getCamera(uid, Number(result.lastInsertRowid));
  res.json(publicCamera(row));
});

app.post("/api/cameras/:id/start", async (req, res) => {
  try {
    const { uid } = auth(req);
    const cam = await startCamera(uid, Number(req.params.id));
    res.json(cam);
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 400;
    res.status(status || 400).json({ error: err instanceof Error ? err.message : "Could not connect." });
  }
});

app.post("/api/cameras/:id/stop", (req, res) => {
  const { uid } = auth(req);
  stopCamera(uid, Number(req.params.id));
  res.json({ ok: true });
});

app.get("/api/cameras/:id/frame", (req, res) => {
  try {
    const { uid } = auth(req);
    const buf = readFrame(uid, Number(req.params.id));
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 409;
    res.status(status || 409).json({ error: err instanceof Error ? err.message : "No frame." });
  }
});

app.delete("/api/cameras/:id", (req, res) => {
  const { uid } = auth(req);
  deleteCamera(uid, Number(req.params.id));
  res.json({ cameras: listCameras(uid), ffmpeg: ffmpegAvailable() });
});

app.post("/api/billing/change", (req, res) => {
  const { uid } = auth(req);
  const plan = String(req.body.plan || "dining");
  const spec = PLANS[plan];
  if (!spec) return res.status(400).json({ error: "Unknown plan." });
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(uid) as SubRow | undefined;
  if (!sub || sub.status !== "active") return res.status(400).json({ error: "No active house to change." });
  db.prepare("UPDATE subscriptions SET plan = ?, amount = ? WHERE user_id = ?").run(plan, spec.amount, uid);
  db.prepare(
    "INSERT INTO invoices (user_id, number, plan, amount, status, brand, last4, created_at) VALUES (?, ?, ?, ?, 'paid', ?, ?, ?)",
  ).run(
    uid,
    invoiceNumber(uid),
    plan,
    gstInclusive(spec.amount),
    sub.brand,
    sub.last4,
    new Date().toISOString(),
  );
  res.json(loadAccount(uid));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Server error";
  res.status(status || 500).json({ error: message });
});

const dist = join(dirname(fileURLToPath(import.meta.url)), "../dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(dist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Lumen API on http://localhost:${PORT} · gateway ${stripe ? "stripe" : "lumen pay"}`);
});
