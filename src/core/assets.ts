import type { ElectronicAsset } from "../types";
import { roundMoney } from "./money";

function dateAtMidnight(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((dateAtMidnight(to) - dateAtMidnight(from)) / 86_400_000);
}

export function assetMetrics(asset: ElectronicAsset, today: string) {
  const elapsedDays = Math.max(0, daysBetween(asset.purchaseDate, today));
  const usedDaysForCost = Math.max(1, elapsedDays);
  const dailyCost = roundMoney(asset.purchaseAmount / usedDaysForCost);
  const warrantyDaysLeft = asset.warrantyEndDate
    ? daysBetween(today, asset.warrantyEndDate)
    : null;
  const paidBack =
    !!asset.targetDailyCost && dailyCost <= asset.targetDailyCost;
  return {
    usedDays: elapsedDays,
    dailyCost,
    warrantyDaysLeft,
    paidBack,
  };
}

