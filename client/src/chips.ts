import type { ChipCount } from "./types";

export const SEAT_COUNT = 15;
export const DENOMINATIONS = [1000, 500, 100, 25, 5, 1] as const;
export const BUYIN_PRESETS = [1000, 2000,3000,4000, 5000, 10000];

export const DENOM_META: Record<number, { color: string; ink: string; label: string }> = {
  1000: { color: "#f6d56b", ink: "#2a2108", label: "1,000" },
  500: { color: "#c7962e", ink: "#1a1406", label: "500" },
  100: { color: "#111111", ink: "#f6d56b", label: "100" },
  25: { color: "#8d6a22", ink: "#fff6d8", label: "25" },
  5: { color: "#e7c56a", ink: "#2a2108", label: "5" },
  1: { color: "#f8f1dc", ink: "#1c170c", label: "1" },
};

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

export function resultWord(profit: number): string {
  if (profit > 0) return "ກຳໄລ";
  if (profit < 0) return "ຂາດທຶນ";
  return "ເທົ່າທຶນ";
}

export function playerQrValue(playerNumber: string, origin?: string): string {
  const base = (origin ?? (typeof window === "undefined" ? "" : window.location.origin)).replace(/\/$/, "");
  if (base) return `${base}/scan/${playerNumber}`;
  return `COLLAB:${playerNumber}`;
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

export function formatChips(amount: number): string {
  return new Intl.NumberFormat("lo-LA").format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("lo-LA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("lo-LA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function stackPreview(amount: number, parts: ChipCount[]): number[] {
  if (amount <= 0) return [];
  const values: number[] = [];
  for (const part of parts.length > 0 ? parts : [{ value: 100, count: 1 }]) {
    for (let index = 0; index < Math.min(part.count, 3); index += 1) values.push(part.value);
    if (values.length >= 4) break;
  }
  return values.slice(0, 4);
}
