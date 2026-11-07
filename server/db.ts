import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, "lumen.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    tables INTEGER NOT NULL DEFAULT 16,
    cameras INTEGER NOT NULL DEFAULT 4,
    avg_check INTEGER NOT NULL DEFAULT 950,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    amount INTEGER NOT NULL,
    brand TEXT,
    last4 TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_session_id TEXT,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    current_period_end TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    brand TEXT,
    last4 TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    section TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS resets (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant TEXT NOT NULL,
    city TEXT NOT NULL,
    email TEXT NOT NULL,
    tables INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 554,
    username TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    channel INTEGER NOT NULL DEFAULT 1,
    rtsp_url TEXT NOT NULL DEFAULT '',
    snapshot_url TEXT NOT NULL DEFAULT '',
    tables TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    status TEXT NOT NULL DEFAULT 'idle',
    last_error TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const STAFF_SEED = [
  ["Meera Iyer", "server", "Main 1–6"],
  ["Arjun Menon", "server", "Booths + 7–10"],
  ["Fatima Khan", "server", "Patio + 11–12"],
  ["Kabir Rao", "server", "Bar rail"],
  ["Imran Sheikh", "busser", "Floor"],
  ["Anjali Deshpande", "host", "Host stand"],
] as const;

function seedStaff(uid: number) {
  const insertTeam = db.prepare(
    "INSERT INTO team (user_id, name, role, section) VALUES (?, ?, ?, ?)",
  );
  for (const [name, role, section] of STAFF_SEED) insertTeam.run(uid, name, role, section);
}

const aanganEmail = "gm@aangan.in";
const hearthEmail = "gm@hearth.restaurant";
const aangan = db.prepare("SELECT id FROM users WHERE email = ?").get(aanganEmail) as
  | { id: number }
  | undefined;
const hearth = db.prepare("SELECT id FROM users WHERE email = ?").get(hearthEmail) as
  | { id: number }
  | undefined;

if (hearth && !aangan) {
  const hash = bcrypt.hashSync("AanganFriday1", 10);
  db.prepare("UPDATE users SET email = ?, name = ?, password_hash = ? WHERE id = ?").run(
    aanganEmail,
    "Vikram Shah",
    hash,
    hearth.id,
  );
  db.prepare("UPDATE restaurants SET name = ?, city = ?, avg_check = ? WHERE user_id = ?").run(
    "Aangan",
    "Mumbai",
    950,
    hearth.id,
  );
  db.prepare("UPDATE subscriptions SET plan = ?, amount = ? WHERE user_id = ?").run(
    "dining",
    699900,
    hearth.id,
  );
  db.prepare("UPDATE invoices SET plan = ?, amount = ? WHERE user_id = ?").run("dining", 825882, hearth.id);
  db.prepare("DELETE FROM team WHERE user_id = ?").run(hearth.id);
  seedStaff(hearth.id);
} else if (!aangan) {
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync("AanganFriday1", 10);
  const user = db
    .prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(aanganEmail, "Vikram Shah", hash, now);
  const uid = Number(user.lastInsertRowid);
  db.prepare(
    "INSERT INTO restaurants (user_id, name, city, tables, cameras, avg_check, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(uid, "Aangan", "Mumbai", 16, 4, 950, now);
  db.prepare(
    `INSERT INTO subscriptions
      (user_id, plan, status, amount, brand, last4, cancel_at_period_end, current_period_end, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    uid,
    "dining",
    "active",
    699900,
    "visa",
    "4242",
    new Date(Date.now() + 30 * 86400000).toISOString(),
    now,
  );
  db.prepare(
    "INSERT INTO invoices (user_id, number, plan, amount, status, brand, last4, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(uid, "LM-1001", "dining", 825882, "paid", "visa", "4242", now);
  seedStaff(uid);
}

db.prepare(
  "UPDATE subscriptions SET plan = 'dining', amount = 699900 WHERE amount IN (24900, 44900, 37900)",
).run();
db.prepare(
  "UPDATE invoices SET plan = 'dining', amount = 825882 WHERE amount IN (24900, 44900, 37900)",
).run();
