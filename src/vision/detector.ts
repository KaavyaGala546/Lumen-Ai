import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import { iou, pointInZone, zonePx, type CamZone } from "./zones";

export type Detection = {
  class: string;
  score: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TableOccupancy = Record<string, { people: number; score: number }>;

let model: cocoSsd.ObjectDetection | null = null;
let loading: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadDetector() {
  if (model) return model;
  if (!loading) {
    loading = (async () => {
      await tf.ready();
      model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      return model;
    })();
  }
  return loading;
}

export async function detectFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const net = await loadDetector();
  const raw = await net.detect(source, 20, 0.38);
  return raw.map((d) => ({
    class: d.class,
    score: d.score,
    x: d.bbox[0],
    y: d.bbox[1],
    w: d.bbox[2],
    h: d.bbox[3],
  }));
}

export function occupancyFromDetections(
  detections: Detection[],
  zones: CamZone[],
  width: number,
  height: number,
): TableOccupancy {
  const out: TableOccupancy = {};
  for (const z of zones) out[z.tableId] = { people: 0, score: 0 };

  const people = detections.filter((d) => d.class === "person" && d.score >= 0.42);
  for (const person of people) {
    const feetX = person.x + person.w / 2;
    const feetY = person.y + person.h * 0.82;
    let bestId = "";
    let best = 0;
    for (const z of zones) {
      const rect = zonePx(z, width, height);
      const overlap = iou(person.x, person.y, person.w, person.h, rect.x, rect.y, rect.w, rect.h);
      const inside = pointInZone(feetX, feetY, rect) ? 0.4 : 0;
      const score = overlap + inside;
      if (score > best) {
        best = score;
        bestId = z.tableId;
      }
    }
    if (bestId && best >= 0.05) {
      out[bestId].people += 1;
      out[bestId].score = Math.max(out[bestId].score, person.score);
    }
  }
  return out;
}
