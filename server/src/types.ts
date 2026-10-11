export type RequestStatus = "pending" | "accepted" | "rejected";

export type Player = {
  seat: number;
  playerNumber: string;
  name: string;
  chips: number;
  totalBuyIn: number;
  inGame: boolean;
};

export type ChipRequest = {
  id: string;
  playerNumber: string;
  seat: number;
  amount: number;
  status: RequestStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type LedgerEntry = {
  id: string;
  type: "buyin" | "cashout" | "settle";
  playerNumber: string;
  seat: number;
  name: string;
  amount: number;
  at: string;
  buyIn?: number;
  chipsInHand?: number;
  profit?: number;
};

export type ChipCount = {
  value: number;
  count: number;
};

export type Snapshot = {
  table: {
    id: number;
    name: string;
    seats: number;
  };
  players: Player[];
  pending: ChipRequest[];
  ledger: LedgerEntry[];
  totalChips: number;
  inGameCount: number;
};

export type NameEntry = {
  order: number;
  name: string;
  playerNumber: string;
  buyIn: number;
  chipsInHand: number | null;
  profit: number | null;
  enteredAt: string;
  settledAt: string | null;
  status: "playing" | "settled";
};

export type TableReport = {
  generatedAt: string;
  table: Snapshot["table"];
  entries: NameEntry[];
  playing: Player[];
  settled: LedgerEntry[];
  ledger: LedgerEntry[];
  totals: {
    inGameCount: number;
    chipsInPlay: number;
    buyInInPlay: number;
    settledCount: number;
    winTotal: number;
    lossTotal: number;
    net: number;
    visitCount: number;
    nameCount: number;
  };
};

export type State = {
  players: Player[];
  requests: ChipRequest[];
  ledger: LedgerEntry[];
};
