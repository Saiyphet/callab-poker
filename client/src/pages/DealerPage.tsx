import { useEffect, useState } from "react";
import { acceptChipRequest, getTable, rejectChipRequest, renamePlayer, settlePlayer, updateChipRequest } from "../api";
import { formatChips, formatTime, resultWord } from "../chips";
import { ChipToken } from "../components/ChipToken";
import { PlayerName } from "../components/PlayerName";
import { PokerTable } from "../components/PokerTable";
import type { Receipt, Snapshot } from "../types";

export function DealerPage() {
  const [table, setTable] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [settleNumber, setSettleNumber] = useState<string | null>(null);
  const [handCount, setHandCount] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [editRequestId, setEditRequestId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    let alive = true;
    const pull = () => {
      getTable()
        .then((next) => {
          if (!alive) return;
          setTable(next);
          setOffline(false);
        })
        .catch(() => {
          if (alive) setOffline(true);
        });
    };
    pull();
    const timer = window.setInterval(pull, 1200);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  function startEdit(id: string, amount: number, name: string) {
    setEditRequestId(id);
    setEditAmount(String(amount));
    setEditName(name);
    setError(null);
  }

  async function saveEdit(id: string) {
    const amount = Number(editAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      setError("ຈຳນວນຊິບຕ້ອງເປັນຈຳນວນເຕັມ 1 ຫາ 1,000,000");
      return false;
    }
    const result = await updateChipRequest(id, {
      amount,
      ...(editName.trim() ? { name: editName.trim() } : {}),
    });
    setTable(result.table);
    setEditRequestId(null);
    return true;
  }

  async function onAccept(id: string) {
    setBusyId(id);
    setError(null);
    try {
      if (editRequestId === id) {
        const saved = await saveEdit(id);
        if (!saved) return;
      }
      const result = await acceptChipRequest(id);
      setTable(result.table);
      setReceipt({
        kind: "buyin",
        playerNumber: result.player.playerNumber,
        seat: result.player.seat,
        name: result.player.name,
        amount: result.request.amount,
        breakdown: result.breakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ອະນຸມັດບໍ່ສຳເລັດ");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = await rejectChipRequest(id);
      setTable(result.table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ປະຕິເສດບໍ່ສຳເລັດ");
    } finally {
      setBusyId(null);
    }
  }

  async function onRename(playerNumber: string) {
    setError(null);
    try {
      const result = await renamePlayer(playerNumber, nameDraft);
      setTable(result.table);
      setEditingNumber(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ບັນທຶກຊື່ບໍ່ສຳເລັດ");
    }
  }

  async function onSettle() {
    const settling = table?.players.find((player) => player.playerNumber === settleNumber);
    const chipsInHand = Number(handCount);
    if (!settling || !Number.isInteger(chipsInHand) || chipsInHand < 0) return;
    setError(null);
    try {
      const result = await settlePlayer(settling.playerNumber, chipsInHand);
      setTable(result.table);
      setSettleNumber(null);
      setHandCount("");
      setReceipt({
        kind: "settle",
        playerNumber: settling.playerNumber,
        seat: settling.seat,
        name: settling.name,
        buyIn: result.buyIn,
        chipsInHand: result.chipsInHand,
        profit: result.profit,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ສະຫຼຸບບໍ່ສຳເລັດ");
    }
  }

  const settling = table?.players.find((player) => player.playerNumber === settleNumber) ?? null;
  const handReady = handCount !== "" && Number.isInteger(Number(handCount));
  const profit = settling && handReady ? Number(handCount) - settling.totalBuyIn : null;

  return (
    <div className="dealer">
      <section className="stats">
        <Stat label="ໂຕະ" value="1" hint="15 ບ່ອນນັ່ງ" />
        <Stat label="ກຳລັງຫຼິ້ນ" value={table ? `${table.inGameCount}/15` : "—"} hint="ຜູ້ຫຼິ້ນທີ່ໄດ້ຮັບຊິບ" />
        <Stat label="ຊິບເທິງໂຕະ" value={table ? formatChips(table.totalChips) : "—"} hint="ຍອດທີ່ນັບໄດ້ຕອນນີ້" />
        <Stat label="ຄຳຂໍລໍຖ້າ" value={table ? String(table.pending.length) : "—"} hint={offline ? "ຂາດການເຊື່ອມຕໍ່" : "ອັບເດດສົດ"} />
      </section>

      {error && <p className="banner">{error}</p>}

      <div className="dealer-grid">
        {table ? (
          <PokerTable
            players={table.players}
            pending={table.pending}
            editingNumber={editingNumber}
            nameDraft={nameDraft}
            onEditStart={(player) => {
              setEditingNumber(player.playerNumber);
              setNameDraft(player.name);
            }}
            onNameDraft={setNameDraft}
            onEditSave={onRename}
            onEditCancel={() => setEditingNumber(null)}
            onSettle={(playerNumber) => {
              setSettleNumber(playerNumber);
              setHandCount("");
            }}
          />
        ) : (
          <p className="loading">ກຳລັງໂຫຼດໂຕະ 1...</p>
        )}

        <aside className="queue">
          <h2>ຄຳຂໍຊິບ</h2>
          <p className="muted">ແກ້ຊື່ ຫຼືຈຳນວນຊິບໄດ້ກ່ອນກົດ Accept</p>
          {table && table.pending.length === 0 && <p className="empty">ຍັງບໍ່ມີຄຳຂໍ ລໍຖ້າຜູ້ຫຼິ້ນສະແກນ QR</p>}
          <ul className="request-list">
            {table?.pending.map((item) => {
              const playerName = table.players.find((player) => player.playerNumber === item.playerNumber)?.name || "";
              const editing = editRequestId === item.id;
              return (
                <li key={item.id}>
                  <div>
                    <PlayerName name={playerName} />
                    <span>ບ່ອນ {item.playerNumber}</span>
                  </div>
                  <p className="request-amount">{formatChips(editing ? Number(editAmount) || 0 : item.amount)}</p>
                  <p className="muted">ຂໍເມື່ອ {formatTime(item.createdAt)}</p>
                  {editing && (
                    <div className="request-edit">
                      <label className="field">
                        ຊື່
                        <input value={editName} maxLength={40} onChange={(event) => setEditName(event.target.value)} />
                      </label>
                      <label className="field">
                        ຈຳນວນຊິບ
                        <input
                          inputMode="numeric"
                          value={editAmount}
                          onChange={(event) => setEditAmount(event.target.value.replace(/[^\d]/g, ""))}
                        />
                      </label>
                    </div>
                  )}
                  <div className="row-actions">
                    {editing ? (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setEditRequestId(null);
                          setError(null);
                        }}
                      >
                        ຍົກເລີກການແກ້
                      </button>
                    ) : (
                      <button type="button" className="btn ghost" disabled={busyId === item.id} onClick={() => startEdit(item.id, item.amount, playerName)}>
                        ແກ້
                      </button>
                    )}
                    <button type="button" className="btn primary" disabled={busyId === item.id} onClick={() => onAccept(item.id)}>
                      Accept · ຈ່າຍຊິບ
                    </button>
                    <button type="button" className="btn ghost" disabled={busyId === item.id} onClick={() => onReject(item.id)}>
                      ປະຕິເສດ
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <h3>ປະຫວັດການນັບ</h3>
          <ul className="ledger">
            {table?.ledger.length === 0 && <li className="muted">ຍັງບໍ່ມີການຈ່າຍຊິບ</li>}
            {table?.ledger.map((entry) => (
              <li key={entry.id}>
                <span>{formatTime(entry.at)}</span>
                <span>
                  {entry.type === "buyin" ? "ຈ່າຍ" : entry.type === "settle" ? "ສະຫຼຸບ" : "ຮັບຄືນ"}{" "}
                  <PlayerName name={entry.name} empty={`ຜູ້ຫຼິ້ນ ${entry.playerNumber}`} />
                </span>
                <b className={entry.type === "settle" ? profitClass(entry.profit ?? 0) : undefined}>
                  {entry.type === "settle" ? `${resultWord(entry.profit ?? 0)} ${formatChips(Math.abs(entry.profit ?? 0))}` : formatChips(entry.amount)}
                </b>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {receipt && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setReceipt(null)}>
          <section className="sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <img src="/collab-poker.jpg" alt="Collab Poker" className="sheet-logo" />
            <p className="table-kicker">{receipt.kind === "buyin" ? "ຈ່າຍຊິບແລ້ວ" : resultWord(receipt.profit)}</p>
            <h2>
              <PlayerName name={receipt.name} empty={`ຜູ້ຫຼິ້ນ ${receipt.playerNumber}`} />
              <small>ບ່ອນ {receipt.playerNumber}</small>
            </h2>
            {receipt.kind === "buyin" ? (
              <>
                <p className="sheet-amount">{formatChips(receipt.amount)}</p>
                <ul className="breakdown">
                  {receipt.breakdown.map((chip) => (
                    <li key={chip.value}>
                      <ChipToken value={chip.value} size={48} />
                      <span>× {chip.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <SettleMath buyIn={receipt.buyIn} chipsInHand={receipt.chipsInHand} profit={receipt.profit} />
            )}
            <button type="button" className="btn primary" onClick={() => setReceipt(null)}>
              ປິດ
            </button>
          </section>
        </div>
      )}

      {settling && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSettleNumber(null)}>
          <section className="sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="table-kicker">ສະຫຼຸບກັບບ້ານ</p>
            <h2>
              <PlayerName name={settling.name} empty={`ຜູ້ຫຼິ້ນ ${settling.playerNumber}`} />
              <small>ບ່ອນ {settling.playerNumber}</small>
            </h2>
            <p className="muted example">
              ຕົວຢ່າງ ຜູ້ຫຼິ້ນ 01 ຊື້ເຂົ້າ 3,000. ຖ້າບອກວ່າມີ 4,500 ໄດ້ກຳໄລ 1,500. ຖ້າມີ 2,000 ໄດ້ຂາດທຶນ 1,000.
            </p>
            <p className="buyin-line">ຊິບທີ່ຊື້ເຂົ້າ {formatChips(settling.totalBuyIn)}</p>
            <label className="field">
              ຊິບທີ່ຜູ້ຫຼິ້ນບອກວ່າມີ
              <input
                inputMode="numeric"
                value={handCount}
                placeholder="0"
                onChange={(event) => setHandCount(event.target.value.replace(/[^\d]/g, ""))}
              />
            </label>
            {handReady && profit !== null && (
              <SettleMath buyIn={settling.totalBuyIn} chipsInHand={Number(handCount)} profit={profit} />
            )}
            <div className="row-actions">
              <button type="button" className="btn primary" disabled={!handReady} onClick={onSettle}>
                ຢືນຢັນສະຫຼຸບ
              </button>
              <button type="button" className="btn ghost" onClick={() => setSettleNumber(null)}>
                ຍົກເລີກ
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function profitClass(profit: number) {
  if (profit > 0) return "win";
  if (profit < 0) return "loss";
  return "";
}

function SettleMath({ buyIn, chipsInHand, profit }: { buyIn: number; chipsInHand: number; profit: number }) {
  return (
    <div className="settle-math">
      <p>ຊື້ເຂົ້າ {formatChips(buyIn)}</p>
      <p>ມີຢູ່ {formatChips(chipsInHand)}</p>
      <p className={profitClass(profit)}>
        {resultWord(profit)} {formatChips(Math.abs(profit))}
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
