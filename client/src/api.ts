import { clearDealerToken, dealerToken } from "./dealerAuth";
import type { ChipCount, ChipRequest, Player, Snapshot, TableReport } from "./types";

type PublicPlayer = Pick<Player, "playerNumber" | "name" | "seat">;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = dealerToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401 && !url.endsWith("/api/dealer/login")) clearDealerToken();
  if (!response.ok) throw new Error(data.error || "ຄຳຂໍບໍ່ສຳເລັດ");
  return data;
}

export function loginDealer(pin: string) {
  return request<{ token: string }>("/api/dealer/login", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export function logoutDealer() {
  return request<{ ok: boolean }>("/api/dealer/logout", { method: "POST" }).catch(() => ({ ok: false }));
}

export function changeDealerPin(currentPin: string, nextPin: string) {
  return request<{ ok: boolean }>("/api/dealer/pin", {
    method: "POST",
    body: JSON.stringify({ currentPin, nextPin }),
  });
}

export function getTable() {
  return request<Snapshot>("/api/table");
}

export function getReport() {
  return request<TableReport>("/api/report");
}

export function clearReport() {
  return request<TableReport>("/api/report/clear", { method: "POST" });
}

export function getPlayer(playerNumber: string) {
  return request<{ player: PublicPlayer }>(`/api/players/${playerNumber}`);
}

export function createChipRequest(playerNumber: string, amount: number, name?: string) {
  return request<{ request: ChipRequest; player: PublicPlayer }>("/api/requests", {
    method: "POST",
    body: JSON.stringify({ playerNumber, amount, name }),
  });
}

export function renamePlayer(playerNumber: string, name: string) {
  return request<{ player: Player; table: Snapshot }>(`/api/players/${playerNumber}/name`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function settlePlayer(playerNumber: string, chipsInHand: number) {
  return request<{ player: Player; buyIn: number; chipsInHand: number; profit: number; table: Snapshot }>(
    `/api/players/${playerNumber}/settle`,
    { method: "POST", body: JSON.stringify({ chipsInHand }) },
  );
}

export function getChipRequest(id: string) {
  return request<{ request: ChipRequest; player: PublicPlayer }>(`/api/requests/${id}`);
}

export function updateChipRequest(id: string, body: { amount?: number; name?: string }) {
  return request<{ request: ChipRequest; player: Player; table: Snapshot }>(`/api/requests/${id}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function acceptChipRequest(id: string) {
  return request<{ request: ChipRequest; player: Player; breakdown: ChipCount[]; table: Snapshot }>(
    `/api/requests/${id}/accept`,
    { method: "POST" },
  );
}

export function rejectChipRequest(id: string) {
  return request<{ request: ChipRequest; table: Snapshot }>(`/api/requests/${id}/reject`, {
    method: "POST",
  });
}

