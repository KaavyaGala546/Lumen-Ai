import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Field, inputClass } from "../components/AuthLayout";
import { api, apiFrame, ApiError, type HouseCamera } from "../lib/api";

const BRANDS = [
  { id: "hikvision", label: "Hikvision / CP Plus" },
  { id: "uniview", label: "Uniview" },
  { id: "dahua", label: "Dahua" },
  { id: "axis", label: "Axis" },
  { id: "custom", label: "Other / paste URL" },
];

export function CamerasPage() {
  const [cameras, setCameras] = useState<HouseCamera[]>([]);
  const [ffmpeg, setFfmpeg] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({
    name: "Dining north",
    brand: "hikvision",
    host: "",
    port: "554",
    username: "admin",
    password: "",
    channel: "1",
    rtspUrl: "",
    snapshotUrl: "",
    tables: "1,2,3,4,5,6",
  });

  async function refresh() {
    const res = await api<{ cameras: HouseCamera[]; ffmpeg: boolean }>("/cameras");
    setCameras(res.cameras);
    setFfmpeg(res.ffmpeg);
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof ApiError ? err.message : "Could not load cameras."));
  }, []);

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">Cameras</h1>
          <p className="mt-1 text-sm text-mist">
            Same LAN as this computer. Hikvision, Uniview, Dahua, Axis — RTSP 554 or a snapshot URL.
            {ffmpeg ? " ffmpeg is ready." : " ffmpeg missing — use a snapshot URL."}
          </p>
        </header>
        {error ? <p className="border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p> : null}
        <ol className="grid h-fit gap-2 border border-line bg-ink-2 px-3 py-2.5 text-[13px] text-mist sm:grid-cols-3">
          <li>1. IP + admin password</li>
          <li>2. Save, then Connect</li>
          <li>
            3. Open on{" "}
            <Link to="/app/live" className="text-paper">
              Live
            </Link>
          </li>
        </ol>

        {cameras.length === 0 && (
          <p className="border border-line bg-ink-2 px-4 py-8 text-sm text-mist">No house cameras yet. Add one on the right.</p>
        )}

        <ul className="grid gap-3">
          {cameras.map((cam) => (
            <CameraCard
              key={cam.id}
              cam={cam}
              busy={busy === cam.id}
              onStart={async () => {
                setBusy(cam.id);
                setError("");
                try {
                  await api(`/cameras/${cam.id}/start`, { method: "POST" });
                  await refresh();
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Connect failed.");
                } finally {
                  setBusy(null);
                }
              }}
              onStop={async () => {
                setBusy(cam.id);
                try {
                  await api(`/cameras/${cam.id}/stop`, { method: "POST" });
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
              onDelete={async () => {
                setBusy(cam.id);
                try {
                  const res = await api<{ cameras: HouseCamera[] }>(`/cameras/${cam.id}`, { method: "DELETE" });
                  setCameras(res.cameras);
                } finally {
                  setBusy(null);
                }
              }}
            />
          ))}
        </ul>
      </div>

      <form
        className="h-fit border border-line bg-ink-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy("new");
          setError("");
          void (async () => {
            try {
              await api("/cameras", {
                method: "POST",
                body: JSON.stringify({
                  ...form,
                  port: Number(form.port),
                  channel: Number(form.channel),
                }),
              });
              setForm((f) => ({ ...f, host: "", rtspUrl: "", snapshotUrl: "", password: "" }));
              await refresh();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not save camera.");
            } finally {
              setBusy(null);
            }
          })();
        }}
      >
        <h2 className="text-sm font-semibold">Add a camera</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Brand">
            <select className={inputClass} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="IP / host">
            <input
              className={inputClass}
              placeholder="192.168.1.64"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RTSP port">
              <input className={inputClass} value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            </Field>
            <Field label="Channel">
              <input className={inputClass} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            </Field>
          </div>
          <Field label="Username">
            <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="RTSP URL (optional override)">
            <input
              className={inputClass}
              placeholder="rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101"
              value={form.rtspUrl}
              onChange={(e) => setForm({ ...form, rtspUrl: e.target.value })}
            />
          </Field>
          <Field label="Snapshot URL (optional)">
            <input
              className={inputClass}
              placeholder="http://192.168.1.64/ISAPI/Streaming/channels/101/picture"
              value={form.snapshotUrl}
              onChange={(e) => setForm({ ...form, snapshotUrl: e.target.value })}
            />
          </Field>
          <Field label="Tables this cam covers">
            <input className={inputClass} value={form.tables} onChange={(e) => setForm({ ...form, tables: e.target.value })} />
          </Field>
        </div>
        <button
          type="submit"
          disabled={busy === "new"}
          className="mt-4 w-full bg-cyan py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {busy === "new" ? "Saving…" : "Save camera"}
        </button>
      </form>
    </div>
  );
}

function prettyCamError(err: string) {
  const t = err.toLowerCase();
  if (t.includes("no route to host")) return "This computer cannot reach that IP. Same LAN as the DVR?";
  if (t.includes("connection refused")) return "Port closed. Check RTSP port 554.";
  if (t.includes("401") || t.includes("auth")) return "Username or password rejected.";
  if (t.includes("timed out") || t.includes("timeout")) return "Timed out. Camera is off-network or firewalled.";
  return err.replace(/rtsp:\/\/[^@\s]+@/gi, "rtsp://***@").split("\n")[0];
}

function CameraCard({
  cam,
  busy,
  onStart,
  onStop,
  onDelete,
}: {
  cam: HouseCamera;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  const live = cam.status === "live" || cam.status === "starting";
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!live) {
      setSrc("");
      return;
    }
    let url = "";
    let cancelled = false;
    async function pull() {
      try {
        const blob = await apiFrame(`/cameras/${cam.id}/frame`);
        if (cancelled) return;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch {
        /* still connecting */
      }
    }
    void pull();
    const id = window.setInterval(() => void pull(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [live, cam.id]);

  return (
    <li className="border border-line bg-ink-2">
      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        <div className="relative min-h-[140px] bg-black">
          {src ? (
            <img alt="" className="h-40 w-full object-cover sm:h-full" src={src} />
          ) : (
            <div className="grid h-40 place-items-center text-[12px] text-mist sm:h-full">{live ? "Waiting for frame…" : "No feed"}</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{cam.name}</p>
              <p className="mt-0.5 text-[12px] text-mist">
                {cam.brand} · {cam.host || "URL"} · ch {cam.channel}
              </p>
            </div>
            <span className={`text-[11px] ${live ? "text-sage" : "text-mist"}`}>{cam.status}</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-mist break-all">{cam.rtspUrl || cam.snapshotUrl || "—"}</p>
          {cam.lastError && <p className="mt-2 text-[12px] text-rose">{prettyCamError(cam.lastError)}</p>}
          <p className="mt-2 text-[12px] text-mute">Tables {cam.tables}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {live ? (
              <button type="button" disabled={busy} onClick={onStop} className="border border-line px-3 py-1.5 text-[12px]">
                Disconnect
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={onStart} className="bg-cyan px-3 py-1.5 text-[12px] font-medium text-ink">
                {busy ? "Connecting…" : "Connect"}
              </button>
            )}
            <Link to={`/app/live?cam=${cam.id}`} className="border border-line px-3 py-1.5 text-[12px]">
              Open on Live
            </Link>
            <button type="button" disabled={busy} onClick={onDelete} className="px-3 py-1.5 text-[12px] text-rose">
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
