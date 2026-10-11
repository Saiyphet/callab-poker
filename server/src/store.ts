import { randomUUID } from "node:crypto";
import { SEAT_COUNT, assertAmount, assertCount, breakdown, parsePlayerCode } from "./chips.js";
import { loadDoc, saveDoc } from "./persist.js";
import type { ChipRequest, NameEntry, Player, Snapshot, State, TableReport } from "./types.js";


export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function blankPlayer(index: number): Player {
  const seat = index + 1;
  return {
    seat,
    playerNumber: String(seat).padStart(2, "0"),
    name: "",
    chips: 0,
    totalBuyIn: 0,
    inGame: false,
  };
}

function seed(): State {
  return {
    players: Array.from({ length: SEAT_COUNT }, (_, index) => blankPlayer(index)),
    requests: [],
    ledger: [],
  };
}

function normalize(raw: unknown): State {
  try {
    const parsed = (raw ?? {}) as Partial<State>;
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.requests) || !Array.isArray(parsed.ledger)) return seed();
    const players = parsed.players.slice(0, SEAT_COUNT).map((raw, index) => {
      const player = raw as Partial<Player>;
      const base = blankPlayer(index);
      const chips = typeof player.chips === "number" ? player.chips : 0;
      const inGame = Boolean(player.inGame);
      const bought = parsed.ledger
        ?.filter((entry) => entry.playerNumber === base.playerNumber && entry.type === "buyin")
        .reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
      const totalBuyIn = typeof player.totalBuyIn === "number" ? player.totalBuyIn : inGame ? Math.max(bought, chips) : bought;
      return {
        ...base,
        name: typeof player.name === "string" ? player.name : "",
        chips,
        totalBuyIn,
        inGame,
      };
    });
    while (players.length < SEAT_COUNT) players.push(blankPlayer(players.length));
    const ledger = parsed.ledger.map((entry) => ({ ...entry, name: entry.name ?? "" }));
    return { players, requests: parsed.requests, ledger };
  } catch {
    return seed();
  }
}

let state: State = seed();

export async function initStore() {
  state = normalize(await loadDoc<Partial<State>>("state"));
  save();
}

function save() {
  const pending = state.requests.filter((request) => request.status === "pending");
  const settled = state.requests.filter((request) => request.status !== "pending").slice(-200);
  state.requests = [...settled, ...pending];
  state.ledger = state.ledger.slice(0, 100);
  saveDoc("state", state);
}

export function snapshot(): Snapshot {
  const totalChips = state.players.reduce((sum, player) => sum + player.chips, 0);
  return {
    table: { id: 1, name: "ໂຕະ 1", seats: SEAT_COUNT },
    players: state.players.map((player) => ({ ...player })),
    pending: state.requests.filter((request) => request.status === "pending"),
    ledger: state.ledger.slice(0, 20),
    totalChips,
    inGameCount: state.players.filter((player) => player.inGame).length,
  };
}

function nameEntries(): NameEntry[] {
  const ordered = [...state.ledger].reverse();
  const open = new Map<string, { name: string; buyIn: number; enteredAt: string }>();
  const closed: NameEntry[] = [];

  for (const event of ordered) {
    if (event.type === "buyin") {
      const session = open.get(event.playerNumber) ?? { name: "", buyIn: 0, enteredAt: event.at };
      session.buyIn += event.amount;
      if (event.name) session.name = event.name;
      open.set(event.playerNumber, session);
      continue;
    }
    if (event.type !== "settle") continue;
    const session = open.get(event.playerNumber);
    closed.push({
      order: 0,
      name: event.name || session?.name || "",
      playerNumber: event.playerNumber,
      buyIn: event.buyIn ?? session?.buyIn ?? 0,
      chipsInHand: event.chipsInHand ?? event.amount,
      profit: event.profit ?? 0,
      enteredAt: session?.enteredAt ?? event.at,
      settledAt: event.at,
      status: "settled",
    });
    open.delete(event.playerNumber);
  }

  const playing: NameEntry[] = [];
  for (const [playerNumber, session] of open) {
    const player = state.players.find((item) => item.playerNumber === playerNumber);
    playing.push({
      order: 0,
      name: player?.name || session.name,
      playerNumber,
      buyIn: player?.inGame ? player.totalBuyIn : session.buyIn,
      chipsInHand: null,
      profit: null,
      enteredAt: session.enteredAt,
      settledAt: null,
      status: "playing",
    });
  }

  return [...closed, ...playing]
    .sort((left, right) => left.enteredAt.localeCompare(right.enteredAt))
    .map((entry, index) => ({ ...entry, order: index + 1 }));
}

export function report(): TableReport {
  const playing = state.players.filter((player) => player.inGame);
  const settled = state.ledger.filter((entry) => entry.type === "settle");
  const entries = nameEntries();
  const winTotal = settled.reduce((sum, entry) => sum + Math.max(entry.profit ?? 0, 0), 0);
  const lossTotal = settled.reduce((sum, entry) => sum + Math.max(-(entry.profit ?? 0), 0), 0);
  const names = new Set(entries.map((entry) => entry.name.trim().toLowerCase()).filter(Boolean));
  return {
    generatedAt: new Date().toISOString(),
    table: { id: 1, name: "ໂຕະ 1", seats: SEAT_COUNT },
    entries,
    playing: playing.map((player) => ({ ...player })),
    settled: settled.map((entry) => ({ ...entry })),
    ledger: state.ledger.map((entry) => ({ ...entry })),
    totals: {
      inGameCount: playing.length,
      chipsInPlay: state.players.reduce((sum, player) => sum + player.chips, 0),
      buyInInPlay: playing.reduce((sum, player) => sum + player.totalBuyIn, 0),
      settledCount: settled.length,
      winTotal,
      lossTotal,
      net: winTotal - lossTotal,
      visitCount: entries.length,
      nameCount: names.size,
    },
  };
}

export function clearReport(): TableReport {
  const ordered = [...state.ledger].reverse();
  const openEventIds = new Map<string, string[]>();
  for (const event of ordered) {
    if (event.type === "settle") {
      openEventIds.delete(event.playerNumber);
      continue;
    }
    const ids = openEventIds.get(event.playerNumber) ?? [];
    ids.push(event.id);
    openEventIds.set(event.playerNumber, ids);
  }

  const keep = new Set<string>();
  for (const [playerNumber, ids] of openEventIds) {
    const player = state.players.find((item) => item.playerNumber === playerNumber);
    if (!player?.inGame) continue;
    for (const id of ids) keep.add(id);
  }

  state.ledger = state.ledger.filter((entry) => keep.has(entry.id));
  state.requests = state.requests.filter((request) => request.status === "pending");
  save();
  return report();
}

export function findPlayer(rawPlayer: string) {
  const playerNumber = parsePlayerCode(rawPlayer);
  if (!playerNumber) throw new HttpError(400, "ເລກຜູ້ຫຼິ້ນບໍ່ຖືກຕ້ອງ");
  return { player: { ...playerByNumber(playerNumber) } };
}

function playerByNumber(playerNumber: string): Player {
  const player = state.players.find((item) => item.playerNumber === playerNumber);
  if (!player) throw new HttpError(404, "ບໍ່ພົບເລກຜູ້ຫຼິ້ນເທິງໂຕະ 1");
  return player;
}

function assertName(raw: unknown): string {
  if (typeof raw !== "string") throw new HttpError(400, "ກະລຸນາພິມຊື່");
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) throw new HttpError(400, "ຊື່ຕ້ອງມີ 1 ຫາ 40 ໂຕອັກສອນ");
  return name;
}

export function createRequest(rawPlayer: unknown, rawAmount: unknown, rawName: unknown) {
  if (typeof rawPlayer !== "string") throw new HttpError(400, "ຕ້ອງລະບຸເລກຜູ້ຫຼິ້ນ");
  const playerNumber = parsePlayerCode(rawPlayer);
  if (!playerNumber) throw new HttpError(400, "QR ນີ້ບໍ່ແມ່ນເລກຜູ້ຫຼິ້ນຂອງ Collab Poker");

  let amount: number;
  try {
    amount = assertAmount(rawAmount);
  } catch {
    throw new HttpError(400, "ຈຳນວນຊິບຕ້ອງເປັນຈຳນວນເຕັມ 1 ຫາ 1,000,000");
  }

  const player = playerByNumber(playerNumber);
  const existing = state.requests.find(
    (request) => request.playerNumber === playerNumber && request.status === "pending",
  );
  if (existing) throw new HttpError(409, "ຜູ້ຫຼິ້ນນີ້ມີຄຳຂໍທີ່ລໍຖ້າດີເລີຢູ່ແລ້ວ");
  if (!player.name) player.name = assertName(rawName);

  const request: ChipRequest = {
    id: randomUUID(),
    playerNumber,
    seat: player.seat,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  state.requests.push(request);
  save();
  return { request, player: { ...player }, table: snapshot() };
}

export function getRequest(id: string) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) throw new HttpError(404, "ບໍ່ພົບຄຳຂໍຊິບ");
  const player = playerByNumber(request.playerNumber);
  return { request, player: { ...player } };
}

export function updateRequest(id: string, rawAmount: unknown, rawName: unknown) {
  const request = state.requests.find((item) => item.id === id);
  if (!request || request.status !== "pending") throw new HttpError(404, "ບໍ່ພົບຄຳຂໍທີ່ລໍຖ້າອະນຸມັດ");

  if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
    try {
      request.amount = assertAmount(rawAmount);
    } catch {
      throw new HttpError(400, "ຈຳນວນຊິບຕ້ອງເປັນຈຳນວນເຕັມ 1 ຫາ 1,000,000");
    }
  }

  if (typeof rawName === "string" && rawName.trim() !== "") {
    const player = playerByNumber(request.playerNumber);
    player.name = assertName(rawName);
  }

  save();
  return { request, player: { ...playerByNumber(request.playerNumber) }, table: snapshot() };
}

export function acceptRequest(id: string) {
  const request = state.requests.find((item) => item.id === id);
  if (!request || request.status !== "pending") throw new HttpError(404, "ບໍ່ພົບຄຳຂໍທີ່ລໍຖ້າອະນຸມັດ");
  const player = playerByNumber(request.playerNumber);
  request.status = "accepted";
  request.resolvedAt = new Date().toISOString();
  player.chips += request.amount;
  player.totalBuyIn += request.amount;
  player.inGame = true;
  state.ledger.unshift({
    id: randomUUID(),
    type: "buyin",
    playerNumber: player.playerNumber,
    seat: player.seat,
    name: player.name,
    amount: request.amount,
    at: request.resolvedAt,
  });
  save();
  return {
    request,
    player: { ...player },
    breakdown: breakdown(request.amount),
    table: snapshot(),
  };
}

export function rejectRequest(id: string) {
  const request = state.requests.find((item) => item.id === id);
  if (!request || request.status !== "pending") throw new HttpError(404, "ບໍ່ພົບຄຳຂໍທີ່ລໍຖ້າອະນຸມັດ");
  request.status = "rejected";
  request.resolvedAt = new Date().toISOString();
  save();
  return { request, table: snapshot() };
}

export function renamePlayer(rawPlayer: string, rawName: unknown) {
  const playerNumber = parsePlayerCode(rawPlayer);
  if (!playerNumber) throw new HttpError(400, "ເລກຜູ້ຫຼິ້ນບໍ່ຖືກຕ້ອງ");
  const player = playerByNumber(playerNumber);
  player.name = assertName(rawName);
  save();
  return { player: { ...player }, table: snapshot() };
}

export function settlePlayer(rawPlayer: string, rawCount: unknown) {
  const playerNumber = parsePlayerCode(rawPlayer);
  if (!playerNumber) throw new HttpError(400, "ເລກຜູ້ຫຼິ້ນບໍ່ຖືກຕ້ອງ");
  const player = playerByNumber(playerNumber);
  if (!player.inGame || player.totalBuyIn <= 0) throw new HttpError(400, "ຜູ້ຫຼິ້ນນີ້ບໍ່ໄດ້ຢູ່ໃນເກມ");
  const waiting = state.requests.some((request) => request.playerNumber === playerNumber && request.status === "pending");
  if (waiting) throw new HttpError(409, "ຍັງມີຄຳຂໍຊິບທີ່ລໍຖ້າ Accept");

  let chipsInHand: number;
  try {
    chipsInHand = assertCount(rawCount);
  } catch {
    throw new HttpError(400, "ຈຳນວນຊິບຕ້ອງເປັນຈຳນວນເຕັມ ຕັ້ງແຕ່ 0 ຂຶ້ນໄປ");
  }

  const buyIn = player.totalBuyIn;
  const profit = chipsInHand - buyIn;
  const name = player.name;
  state.ledger.unshift({
    id: randomUUID(),
    type: "settle",
    playerNumber: player.playerNumber,
    seat: player.seat,
    name,
    amount: chipsInHand,
    buyIn,
    chipsInHand,
    profit,
    at: new Date().toISOString(),
  });
  player.chips = 0;
  player.totalBuyIn = 0;
  player.inGame = false;
  player.name = "";
  save();
  return {
    player: { ...player, name },
    buyIn,
    chipsInHand,
    profit,
    table: snapshot(),
  };
}
