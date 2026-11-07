import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.ts";

const here = dirname(fileURLToPath(import.meta.url));
const camDir = join(here, "../data/cameras");
mkdirSync(camDir, { recursive: true });

export type CameraRow = {
  id: number;
  user_id: number;
  name: string;
  brand: string;
  host: string;
  port: number;
  username: string;
  password: string;
  channel: number;
  rtsp_url: string;
  snapshot_url: string;
  tables: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

type Ingest = {
  child?: ChildProcess;
  poller?: ReturnType<typeof setInterval>;
  jpeg: string;
};

const running = new Map<number, Ingest>();

function ffmpegBin() {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"];
  return candidates.find((p) => p === "ffmpeg" || existsSync(p)) || "ffmpeg";
}

export function ffmpegAvailable() {
  return existsSync("/opt/homebrew/bin/ffmpeg") || existsSync("/usr/local/bin/ffmpeg");
}

export function encodeBasic(user: string, pass: string) {
  return Buffer.from(`${user}:${pass}`).toString("base64");
}

export function buildUrls(input: {
  brand: string;
  host: string;
  port: number;
  username: string;
  password: string;
  channel: number;
  rtspUrl?: string;
  snapshotUrl?: string;
}) {
  const host = input.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const ch = Math.max(1, input.channel);
  const auth =
    input.username && input.password
      ? `${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}@`
      : "";
  const rtspPort = input.port || 554;
  let rtsp = (input.rtspUrl || "").trim();
  let snapshot = (input.snapshotUrl || "").trim();

  if (!rtsp) {
    if (input.brand === "hikvision") {
      rtsp = `rtsp://${auth}${host}:${rtspPort}/Streaming/Channels/${ch}01`;
    } else if (input.brand === "uniview") {
      rtsp = `rtsp://${auth}${host}:${rtspPort}/media/video${ch}`;
    } else if (input.brand === "dahua") {
      rtsp = `rtsp://${auth}${host}:${rtspPort}/cam/realmonitor?channel=${ch}&subtype=0`;
    } else if (input.brand === "axis") {
      rtsp = `rtsp://${auth}${host}:${rtspPort}/axis-media/media.amp`;
    }
  }
  if (!snapshot) {
    if (input.brand === "hikvision") {
      snapshot = `http://${host}/ISAPI/Streaming/channels/${ch}01/picture`;
    } else if (input.brand === "axis") {
      snapshot = `http://${host}/axis-cgi/jpg/image.cgi`;
    } else if (input.brand === "dahua") {
      snapshot = `http://${host}/cgi-bin/snapshot.cgi?channel=${ch}`;
    }
  }
  return { rtsp, snapshot };
}

function setStatus(id: number, status: string, error: string | null = null) {
  db.prepare("UPDATE cameras SET status = ?, last_error = ? WHERE id = ?").run(status, error, id);
}

function jpegPath(id: number) {
  return join(camDir, `${id}.jpg`);
}

async function pullSnapshot(cam: CameraRow) {
  if (!cam.snapshot_url) throw new Error("No snapshot URL");
  const headers: Record<string, string> = {};
  if (cam.username) headers.Authorization = `Basic ${encodeBasic(cam.username, cam.password || "")}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 6000);
  try {
    const res = await fetch(cam.snapshot_url, { headers, signal: ac.signal });
    if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 400) throw new Error("Snapshot was empty");
    writeFileSync(jpegPath(cam.id), buf);
    setStatus(cam.id, "live", null);
  } finally {
    clearTimeout(t);
  }
}

function startFfmpeg(cam: CameraRow) {
  if (!cam.rtsp_url) throw new Error("No RTSP URL");
  const out = jpegPath(cam.id);
  const child = spawn(
    ffmpegBin(),
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-rtsp_transport",
      "tcp",
      "-i",
      cam.rtsp_url,
      "-an",
      "-vf",
      "fps=4,scale=1280:-2",
      "-q:v",
      "5",
      "-f",
      "image2",
      "-update",
      "1",
      out,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let err = "";
  child.stderr?.on("data", (d) => {
    err = String(d).slice(-400);
  });
  child.on("exit", (code) => {
    const cur = running.get(cam.id);
    if (cur?.child === child) running.delete(cam.id);
    if (code && code !== 0) setStatus(cam.id, "error", err || `ffmpeg exited ${code}`);
  });
  return child;
}

export function publicCamera(row: CameraRow) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    host: row.host,
    port: row.port,
    username: row.username,
    channel: row.channel,
    rtspUrl: row.rtsp_url ? maskUrl(row.rtsp_url) : "",
    snapshotUrl: row.snapshot_url ? maskUrl(row.snapshot_url) : "",
    tables: row.tables,
    status: running.has(row.id) ? "live" : row.status === "live" ? "idle" : row.status,
    lastError: row.last_error,
    hasPassword: Boolean(row.password),
    createdAt: row.created_at,
  };
}

function maskUrl(url: string) {
  return url.replace(/:\/\/([^:@/]+):([^@/]+)@/g, "://$1:***@");
}

export function listCameras(uid: number) {
  const rows = db.prepare("SELECT * FROM cameras WHERE user_id = ? ORDER BY id").all(uid) as CameraRow[];
  return rows.map(publicCamera);
}

export function getCamera(uid: number, id: number) {
  const row = db.prepare("SELECT * FROM cameras WHERE id = ? AND user_id = ?").get(id, uid) as CameraRow | undefined;
  if (!row) throw Object.assign(new Error("Camera not found"), { status: 404 });
  return row;
}

export async function startCamera(uid: number, id: number) {
  const cam = getCamera(uid, id);
  stopCamera(uid, id, false);
  const jpeg = jpegPath(id);
  const ingest: Ingest = { jpeg };
  let started = false;

  if (cam.snapshot_url) {
    try {
      await pullSnapshot(cam);
      started = true;
      ingest.poller = setInterval(() => {
        void pullSnapshot(cam).catch((err) => setStatus(id, "error", err instanceof Error ? err.message : "snapshot failed"));
      }, 900);
    } catch {
      /* RTSP fallback */
    }
  }

  if (!started && cam.rtsp_url) {
    if (!ffmpegAvailable()) {
      throw Object.assign(new Error("ffmpeg is not installed. Add a snapshot URL, or install ffmpeg for RTSP."), {
        status: 400,
      });
    }
    ingest.child = startFfmpeg(cam);
    started = true;
    setStatus(id, "starting", null);
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      if (existsSync(jpeg) && statSync(jpeg).size > 800) {
        setStatus(id, "live", null);
        break;
      }
      if (ingest.child.exitCode != null) {
        throw Object.assign(new Error("RTSP failed. Check IP, port 554, and user/password."), { status: 400 });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!started) {
    throw Object.assign(new Error("Add an RTSP URL or a snapshot URL."), { status: 400 });
  }
  running.set(id, ingest);
  return publicCamera(getCamera(uid, id));
}

export function stopCamera(uid: number, id: number, updateDb = true) {
  const ingest = running.get(id);
  if (ingest?.child && ingest.child.exitCode == null) ingest.child.kill("SIGTERM");
  if (ingest?.poller) clearInterval(ingest.poller);
  running.delete(id);
  if (updateDb) {
    const row = db.prepare("SELECT id FROM cameras WHERE id = ? AND user_id = ?").get(id, uid);
    if (row) setStatus(id, "idle", null);
  }
}

export function readFrame(uid: number, id: number) {
  getCamera(uid, id);
  const file = jpegPath(id);
  if (!existsSync(file) || statSync(file).size < 400) {
    throw Object.assign(new Error("No frame yet. Connect the camera first."), { status: 409 });
  }
  return readFileSync(file);
}

export function deleteCamera(uid: number, id: number) {
  stopCamera(uid, id);
  db.prepare("DELETE FROM cameras WHERE id = ? AND user_id = ?").run(id, uid);
  const file = jpegPath(id);
  if (existsSync(file)) unlinkSync(file);
}

export function stopAll() {
  for (const [id, ingest] of running) {
    if (ingest.child && ingest.child.exitCode == null) ingest.child.kill("SIGTERM");
    if (ingest.poller) clearInterval(ingest.poller);
    running.delete(id);
  }
}

process.on("exit", stopAll);
process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
