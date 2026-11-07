import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useFloor } from "../state/FloorContext";
import { detectFrame, occupancyFromDetections, type Detection } from "../vision/detector";
import { loadZones, saveZones, zonePx, type CamZone } from "../vision/zones";
import { formatMmSs, stateLabel } from "../lib/format";
import { stateColor } from "./StatusLegend";
import { api, apiFrame, ApiError, type HouseCamera } from "../lib/api";

type Drag =
  | { kind: "move"; id: string; ox: number; oy: number; zx: number; zy: number }
  | { kind: "resize"; id: string; ox: number; oy: number; zw: number; zh: number };

export function LiveStage() {
  const { tables, now, selectedId, setSelectedId, liveMode, startLive, stopLive, applyOccupancy, greetSeconds } =
    useFloor();
  const [params] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const frameUrlRef = useRef<string | null>(null);
  const busy = useRef(false);
  const smear = useRef<Record<string, { people: number; occupiedHits: number; emptyHits: number }>>({});
  const zonesRef = useRef<CamZone[]>(loadZones());
  const [zones, setZones] = useState<CamZone[]>(zonesRef.current);
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "denied" | "error">("idle");
  const [message, setMessage] = useState("Pick a house camera and connect.");
  const [fps, setFps] = useState(0);
  const [edit, setEdit] = useState(false);
  const [source, setSource] = useState<"laptop" | "file" | "house">("laptop");
  const [houseCameras, setHouseCameras] = useState<HouseCamera[]>([]);
  const [camId, setCamId] = useState(params.get("cam") || "");
  const camIdRef = useRef(camId);
  const drag = useRef<Drag | null>(null);
  const lastFps = useRef({ t: performance.now(), n: 0 });
  const lastDets = useRef<Detection[]>([]);
  const statusHold = useRef(status);
  const editHold = useRef(edit);
  const sourceHold = useRef(source);
  statusHold.current = status;
  editHold.current = edit;
  sourceHold.current = source;
  camIdRef.current = camId;

  useEffect(() => {
    zonesRef.current = zones;
    saveZones(zones);
  }, [zones]);

  useEffect(() => {
    void api<{ cameras: HouseCamera[] }>("/cameras")
      .then((res) => {
        setHouseCameras(res.cameras);
        setCamId((id) => id || (res.cameras[0] ? String(res.cameras[0].id) : ""));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      statusHold.current = "idle";
      stopTracks();
      stopLive();
    };
  }, [stopLive]);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    if (frameUrlRef.current) {
      URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.removeAttribute("src");
    }
  }

  async function startLaptop() {
    setStatus("loading");
    setMessage("Asking for this laptop’s camera…");
    stopTracks();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setSource("laptop");
      sourceHold.current = "laptop";
      await bootModel();
    } catch (err) {
      setStatus("denied");
      setMessage(err instanceof Error ? err.message : "Camera permission was denied.");
    }
  }

  async function startHouse() {
    if (!camId) {
      setMessage("Save a camera under Cameras first.");
      return;
    }
    setStatus("loading");
    setMessage("Connecting the DVR…");
    stopTracks();
    try {
      await api(`/cameras/${camId}/start`, { method: "POST" });
      setSource("house");
      sourceHold.current = "house";
      await bootModel();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not reach that camera.");
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setMessage("Loading clip…");
    stopTracks();
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = null;
    video.src = url;
    video.loop = true;
    await video.play();
    setSource("file");
    sourceHold.current = "file";
    await bootModel();
    e.target.value = "";
  }

  async function bootModel() {
    try {
      const { loadDetector } = await import("../vision/detector");
      await loadDetector();
      startLive(zonesRef.current.map((z) => z.tableId));
      statusHold.current = "live";
      setStatus("live");
      setMessage("Feed is live. Occupancy writes the floor.");
      loop();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load the detector.");
    }
  }

  function halt() {
    statusHold.current = "idle";
    stopTracks();
    stopLive();
    setStatus("idle");
    setMessage("Stopped. Floor simulation is back on.");
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  async function houseFrame() {
    const img = imgRef.current;
    const id = camIdRef.current;
    if (!img || !id) return null;
    const blob = await apiFrame(`/cameras/${id}/frame`);
    const url = URL.createObjectURL(blob);
    if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
    frameUrlRef.current = url;
    img.src = url;
    await img.decode();
    return img;
  }

  function loop() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = async () => {
      if (statusHold.current === "idle") return;
      try {
        let w = 1280;
        let h = 720;
        let sourceEl: HTMLVideoElement | HTMLImageElement | null = null;

        if (sourceHold.current === "house") {
          sourceEl = await houseFrame();
          if (sourceEl) {
            w = sourceEl.naturalWidth || 1280;
            h = sourceEl.naturalHeight || 720;
          }
        } else {
          const el = videoRef.current;
          if (!el || el.readyState < 2) {
            requestAnimationFrame(tick);
            return;
          }
          sourceEl = el;
          w = el.videoWidth || 1280;
          h = el.videoHeight || 720;
        }

        if (!sourceEl) {
          requestAnimationFrame(tick);
          return;
        }

        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;

        if (!busy.current && !editHold.current) {
          busy.current = true;
          try {
            const dets = await detectFrame(sourceEl);
            paint(canvas, dets, w, h);
            emitOccupancy(dets, w, h);
            const t = performance.now();
            lastFps.current.n += 1;
            if (t - lastFps.current.t > 1000) {
              setFps(lastFps.current.n);
              lastFps.current = { t, n: 0 };
            }
          } catch {
            paint(canvas, [], w, h);
          } finally {
            busy.current = false;
          }
        } else {
          paint(canvas, lastDets.current, w, h);
        }
      } catch {
        /* next frame */
      }
      requestAnimationFrame(tick);
    };
    void tick();
  }

  function emitOccupancy(dets: Detection[], w: number, h: number) {
    lastDets.current = dets;
    const raw = occupancyFromDetections(dets, zonesRef.current, w, h);
    const stable: Record<string, { people: number; score: number }> = {};
    for (const z of zonesRef.current) {
      const hit = raw[z.tableId] ?? { people: 0, score: 0 };
      const prev = smear.current[z.tableId] ?? { people: 0, occupiedHits: 0, emptyHits: 0 };
      if (hit.people > 0) {
        prev.occupiedHits += 1;
        prev.emptyHits = 0;
        prev.people = hit.people;
      } else {
        prev.emptyHits += 1;
        prev.occupiedHits = 0;
      }
      smear.current[z.tableId] = prev;
      let people = 0;
      if (prev.occupiedHits >= 2) people = prev.people;
      else if (prev.emptyHits >= 3) {
        prev.people = 0;
        people = 0;
      } else if (prev.people > 0) people = prev.people;
      stable[z.tableId] = { people, score: hit.score };
    }
    applyOccupancy(stable);
  }

  function paint(canvas: HTMLCanvasElement, dets: Detection[], w: number, h: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";

    for (const zone of zonesRef.current) {
      const table = tablesRef.current.find((t) => t.id === zone.tableId);
      const color = stateColor(table?.state ?? "ready");
      const r = zonePx(zone, w, h);
      ctx.fillStyle = color.fill;
      ctx.strokeStyle = selectedRef.current === zone.tableId ? "#f4f0e8" : color.ring;
      ctx.lineWidth = selectedRef.current === zone.tableId ? 3 : 2;
      ctx.setLineDash(table?.state === "ready" ? [8, 6] : []);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);

      const clock =
        table?.state === "dirty" && table.dirtySince
          ? formatMmSs((nowRef.current - table.dirtySince) / 1000)
          : table?.seatedAt
            ? formatMmSs((nowRef.current - table.seatedAt) / 1000)
            : "";
      ctx.fillStyle = "rgba(28,25,23,0.82)";
      ctx.fillRect(r.x + 8, r.y + 8, Math.min(r.w - 16, 220), 48);
      ctx.fillStyle = color.ring;
      ctx.font = "600 14px ui-monospace, monospace";
      ctx.fillText(`T${zone.tableId}`, r.x + 16, r.y + 26);
      ctx.fillStyle = "#f4f0e8";
      ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${stateLabel(table?.state ?? "ready")}${clock ? "  " + clock : ""}`, r.x + 16, r.y + 44);

      if (editHold.current) {
        ctx.fillStyle = "#d97706";
        ctx.fillRect(r.x + r.w - 14, r.y + r.h - 14, 14, 14);
      }
    }

    for (const d of dets) {
      const person = d.class === "person";
      ctx.strokeStyle = person ? "#f4f0e8" : "rgba(168,162,158,0.7)";
      ctx.lineWidth = person ? 2 : 1;
      ctx.strokeRect(d.x, d.y, d.w, d.h);
      const tag = `${d.class} ${d.score.toFixed(2)}`;
      ctx.font = "500 11px ui-monospace, monospace";
      const tw = ctx.measureText(tag).width + 10;
      ctx.fillStyle = "rgba(28,25,23,0.9)";
      ctx.fillRect(d.x, Math.max(0, d.y - 18), tw, 18);
      ctx.fillStyle = person ? "#f4f0e8" : "#a8a29e";
      ctx.fillText(tag, d.x + 5, Math.max(12, d.y - 5));
    }
  }

  const tablesRef = useRef(tables);
  const nowRef = useRef(now);
  const selectedRef = useRef(selectedId);
  tablesRef.current = tables;
  nowRef.current = now;
  selectedRef.current = selectedId;

  function localPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, w: 1, h: 1 };
    const box = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
      w: canvas.width,
      h: canvas.height,
    };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = localPoint(e);
    if (edit) {
      const hit = [...zones].reverse().find((z) => p.x >= z.x && p.y >= z.y && p.x <= z.x + z.w && p.y <= z.y + z.h);
      if (!hit) return;
      const nearSE = p.x > hit.x + hit.w - 4 && p.y > hit.y + hit.h - 4;
      drag.current = nearSE
        ? { kind: "resize", id: hit.tableId, ox: p.x, oy: p.y, zw: hit.w, zh: hit.h }
        : { kind: "move", id: hit.tableId, ox: p.x, oy: p.y, zx: hit.x, zy: hit.y };
      setSelectedId(hit.tableId);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      return;
    }
    const hit = [...zones].reverse().find((z) => p.x >= z.x && p.y >= z.y && p.x <= z.x + z.w && p.y <= z.y + z.h);
    if (hit) setSelectedId(hit.tableId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    const p = localPoint(e);
    setZones((prev) =>
      prev.map((z) => {
        if (z.tableId !== d.id) return z;
        if (d.kind === "move") {
          return {
            ...z,
            x: Math.max(0, Math.min(100 - z.w, d.zx + (p.x - d.ox))),
            y: Math.max(0, Math.min(100 - z.h, d.zy + (p.y - d.oy))),
          };
        }
        return {
          ...z,
          w: Math.max(10, Math.min(100 - z.x, d.zw + (p.x - d.ox))),
          h: Math.max(10, Math.min(100 - z.y, d.zh + (p.y - d.oy))),
        };
      }),
    );
  }

  const live = status === "live" || liveMode;
  const house = source === "house";

  return (
    <div className="overflow-hidden border border-line bg-ink-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] text-mist">{message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-line bg-ink px-2 py-1.5 text-[13px]"
            value={camId}
            onChange={(e) => setCamId(e.target.value)}
          >
            <option value="">House camera…</option>
            {houseCameras.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.host || c.brand})
              </option>
            ))}
          </select>
          {status !== "live" ? (
            <>
              <button
                type="button"
                onClick={() => void startHouse()}
                className="bg-cyan px-3 py-1.5 text-[13px] font-medium text-ink"
              >
                {status === "loading" ? "Connecting…" : "Connect DVR"}
              </button>
              <button type="button" onClick={() => void startLaptop()} className="border border-line px-3 py-1.5 text-[13px]">
                This laptop
              </button>
            </>
          ) : (
            <button type="button" onClick={halt} className="border border-line px-3 py-1.5 text-[13px]">
              Stop
            </button>
          )}
          <label className="cursor-pointer border border-line px-3 py-1.5 text-[13px]">
            Clip
            <input type="file" accept="video/*" className="hidden" onChange={(e) => void onFile(e)} />
          </label>
          <button
            type="button"
            onClick={() => setEdit((v) => !v)}
            className={`px-3 py-1.5 text-[13px] ${edit ? "bg-brass text-ink" : "border border-line"}`}
          >
            {edit ? "Done" : "Map tables"}
          </button>
        </div>
      </div>

      <div className="relative bg-black">
        <video
          ref={videoRef}
          className={`block aspect-video w-full bg-black object-contain ${house ? "hidden" : ""}`}
          muted
          playsInline
          autoPlay
        />
        <img ref={imgRef} alt="" className={`aspect-video w-full bg-black object-contain ${house ? "block" : "hidden"}`} />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full ${edit ? "cursor-move" : "cursor-pointer"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            drag.current = null;
          }}
        />
        {status !== "live" && status !== "loading" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/80">
            <ol className="max-w-sm space-y-1.5 px-6 text-[13px] text-mist">
              <li>1. Select a house camera above</li>
              <li>2. Connect DVR (same LAN as this computer)</li>
              <li>3. Map tables on the feed</li>
              <li className="pt-1 text-[12px]">Laptop camera is only for testing boxes.</li>
            </ol>
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 bg-black/70 px-2 py-1 font-mono text-[11px]">
          <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-sage" : "bg-mist"}`} />
          {live ? "LIVE" : "STANDBY"} · {fps || "—"} fps · {source}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 bg-black/70 px-2 py-1 font-mono text-[11px] text-brass">
          Greet {formatMmSs(greetSeconds)}
        </div>
      </div>
    </div>
  );
}
