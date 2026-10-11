import type { ChipCount } from "./types.js";

export const SEAT_COUNT = 15;
export const DENOMINATIONS = [1000, 500, 100, 25, 5, 1] as const;

function seatCode(raw: string): string | null {
  const seat = Number(raw);
  if (!Number.isInteger(seat) || seat < 1 || seat > SEAT_COUNT) return null;
  return String(seat).padStart(2, "0");
}

export function parsePlayerCode(raw: string): string | null {
  const text = raw.trim();
  const fromPath = text.match(/\/scan\/0*(\d{1,2})(?=[/?#]|$)/i);
  if (fromPath) return seatCode(fromPath[1]);
  const fromQuery = text.match(/[?&](?:seat|player|p)=0*(\d{1,2})(?=&|#|$)/i);
  if (fromQuery) return seatCode(fromQuery[1]);
  const compact = text.toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^(?:(?:CALLAB|COLLAB)[:|-])?0*(\d{1,2})$/);
  if (!match) return null;
  return seatCode(match[1]);
}

export function assertCount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > 1_000_000) {
    throw new Error("COUNT");
  }
  return amount;
}

export function breakdown(amount: number): ChipCount[] {
  const chips: ChipCount[] = [];
  let left = amount;
  for (const value of DENOMINATIONS) {
    const count = Math.floor(left / value);
    if (count > 0) chips.push({ value, count });
    left -= count * value;
  }
  return chips;
}

export function assertAmount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
    throw new Error("AMOUNT");
  }
  return amount;
}
