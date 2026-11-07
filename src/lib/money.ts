import { getPlan, recommendPlan } from "./plans";

export type RoiInputs = {
  tables: number;
  avgCheck: number;
  peakNights: number;
  greetMissPct: number;
  resetMin: number;
};

export type RoiResult = {
  recoveredCovers: number;
  recoveredRevenue: number;
  laborSaved: number;
  laborDollars: number;
  dessertSaved: number;
  walkPrevented: number;
  monthly: number;
  annual: number;
  software: number;
  net: number;
  paybackDays: number;
  multiple: number;
  planId: string;
};

export function computeRoi(i: RoiInputs): RoiResult {
  const plan = getPlan(recommendPlan(i.tables));
  const servicesPerPeak = i.tables * 2.15;
  const missedGreets = servicesPerPeak * (i.greetMissPct / 100);
  const courseSkip = 180;
  const dessertSaved = missedGreets * 0.31 * courseSkip * i.peakNights * 4.3;
  const walkPrevented = missedGreets * 0.045 * i.avgCheck * 2.4 * i.peakNights * 4.3;
  const extraTurns =
    i.tables * Math.max(0, (i.resetMin - 3.2) / 55) * i.peakNights * 4.3;
  const recoveredCovers = extraTurns * 2.6;
  const recoveredRevenue = recoveredCovers * i.avgCheck;
  const laborSaved = i.peakNights * 4.3 * 2.4;
  const laborDollars = laborSaved * 150;
  const monthly = dessertSaved + walkPrevented + recoveredRevenue + laborDollars * 0.35;
  const annual = monthly * 12;
  const software = plan.price;
  const net = monthly - software;
  const paybackDays = Math.max(1, Math.round((software / Math.max(monthly, 1)) * 30));
  const multiple = monthly / software;

  return {
    recoveredCovers,
    recoveredRevenue,
    laborSaved,
    laborDollars,
    dessertSaved,
    walkPrevented,
    monthly,
    annual,
    software,
    net,
    paybackDays,
    multiple,
    planId: plan.id,
  };
}
