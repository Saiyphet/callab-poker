import { useEffect, useState } from "react";
import { clearReport, getReport } from "../api";
import { formatChips, formatDateTime, resultWord } from "../chips";
import { PlayerName } from "../components/PlayerName";
import type { TableReport } from "../types";

export function ReportPage() {
  const [report, setReport] = useState<TableReport | null>(null);
  const [offline, setOffline] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      getReport()
        .then((next) => {
          if (!alive) return;
          setReport(next);
          setOffline(false);
        })
        .catch(() => {
          if (alive) setOffline(true);
        });
    };
    pull();
    const timer = window.setInterval(pull, 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  async function onClear() {
    setClearing(true);
    setError(null);
    try {
      setReport(await clearReport());
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ລ້າງລາຍງານບໍ່ສຳເລັດ");
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="report">
      <div className="cards-head">
        <div>
          <img src="/collab-poker.jpg" alt="Collab Poker" className="cards-logo" />
          <h1>ລາຍງານຊື່ທີ່ເຂົ້າທັງໝົດ</h1>
          <p className="muted">
            {report ? `${report.table.name} · ${formatDateTime(report.generatedAt)}` : "ກຳລັງໂຫຼດລາຍງານ..."}
            {offline ? " · ຂາດການເຊື່ອມຕໍ່" : ""}
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={() => setConfirmClear(true)}>
            ລ້າງລາຍງານ
          </button>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            ພິມລາຍງານ
          </button>
        </div>
      </div>
      {error && <p className="banner">{error}</p>}

      {report && (
        <>
          <section className="stats">
            <article className="stat">
              <span>ຊື່ທີ່ເຂົ້າ</span>
              <strong>{report.totals.nameCount}</strong>
              <small>{report.totals.visitCount} ຄັ້ງ</small>
            </article>
            <article className="stat">
              <span>ກຳລັງຫຼິ້ນ</span>
              <strong>{report.totals.inGameCount}/15</strong>
              <small>ຊື້ເຂົ້າ {formatChips(report.totals.buyInInPlay)}</small>
            </article>
            <article className="stat">
              <span>ຊິບໃນເກມ</span>
              <strong>{formatChips(report.totals.chipsInPlay)}</strong>
              <small>ຍັງບໍ່ທັນສະຫຼຸບ</small>
            </article>
            <article className="stat">
              <span>ກຳໄລລວມ</span>
              <strong className="win">{formatChips(report.totals.winTotal)}</strong>
              <small>{report.totals.settledCount} ຄົນສະຫຼຸບແລ້ວ</small>
            </article>
            <article className="stat">
              <span>ຂາດທຶນລວມ</span>
              <strong className="loss">{formatChips(report.totals.lossTotal)}</strong>
              <small>
                ສ່ວນຕ່າງ {resultWord(report.totals.net)} {formatChips(Math.abs(report.totals.net))}
              </small>
            </article>
          </section>

          <section className="report-block">
            <h2>ລາຍຊື່ທັງໝົດ</h2>
            {report.entries.length === 0 && <p className="empty">ຍັງບໍ່ມີຄົນເຂົ້າຫຼິ້ນ</p>}
            <div className="report-list">
              {report.entries.map((entry) => {
                const profit = entry.profit;
                return (
                  <article key={`${entry.playerNumber}-${entry.enteredAt}`}>
                    <div>
                      <span>
                        {entry.order}. <PlayerName name={entry.name} empty="ບໍ່ມີຊື່" />
                      </span>
                      <span>ບ່ອນ {entry.playerNumber}</span>
                    </div>
                    <p>ເຂົ້າ {formatDateTime(entry.enteredAt)}</p>
                    <p>ຊື້ເຂົ້າ {formatChips(entry.buyIn)}</p>
                    {entry.status === "playing" ? (
                      <b className="win">ກຳລັງຫຼິ້ນ</b>
                    ) : (
                      <>
                        <p>ມີຢູ່ {formatChips(entry.chipsInHand ?? 0)}</p>
                        <b className={profit !== null && profit > 0 ? "win" : profit !== null && profit < 0 ? "loss" : ""}>
                          {resultWord(profit ?? 0)} {formatChips(Math.abs(profit ?? 0))}
                        </b>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="report-block">
            <h2>ກຳລັງຫຼິ້ນ</h2>
            {report.playing.length === 0 && <p className="empty">ຍັງບໍ່ມີຄົນໃນເກມ</p>}
            <div className="report-list">
              {report.playing.map((player) => (
                <article key={player.playerNumber}>
                  <div>
                    <PlayerName name={player.name} />
                    <span>ບ່ອນ {player.playerNumber}</span>
                  </div>
                  <b>ຊື້ເຂົ້າ {formatChips(player.totalBuyIn)}</b>
                </article>
              ))}
            </div>
          </section>

          <section className="report-block">
            <h2>ສະຫຼຸບແລ້ວ</h2>
            {report.settled.length === 0 && <p className="empty">ຍັງບໍ່ມີຄົນກັບບ້ານ</p>}
            <div className="report-list">
              {report.settled.map((entry) => {
                const profit = entry.profit ?? 0;
                return (
                  <article key={entry.id}>
                    <div>
                      <PlayerName name={entry.name} empty={`ຜູ້ຫຼິ້ນ ${entry.playerNumber}`} />
                      <span>
                        ບ່ອນ {entry.playerNumber} · {formatDateTime(entry.at)}
                      </span>
                    </div>
                    <p>ຊື້ເຂົ້າ {formatChips(entry.buyIn ?? 0)}</p>
                    <p>ມີຢູ່ {formatChips(entry.chipsInHand ?? entry.amount)}</p>
                    <b className={profit > 0 ? "win" : profit < 0 ? "loss" : ""}>
                      {resultWord(profit)} {formatChips(Math.abs(profit))}
                    </b>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="report-block">
            <h2>ປະຫວັດທັງໝົດ</h2>
            <div className="report-list">
              {report.ledger.map((entry) => (
                <article key={entry.id} className="history-row">
                  <span>{formatDateTime(entry.at)}</span>
                  <span>
                    {entry.type === "buyin" ? "ຈ່າຍຊິບ" : entry.type === "settle" ? "ສະຫຼຸບ" : "ຮັບຄືນ"}{" "}
                    <PlayerName name={entry.name} empty={`ຜູ້ຫຼິ້ນ ${entry.playerNumber}`} />
                  </span>
                  <b>
                    {entry.type === "settle"
                      ? `${resultWord(entry.profit ?? 0)} ${formatChips(Math.abs(entry.profit ?? 0))}`
                      : formatChips(entry.amount)}
                  </b>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {confirmClear && (
        <div className="sheet-backdrop" role="presentation" onClick={() => !clearing && setConfirmClear(false)}>
          <section className="sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="table-kicker">ຜູ້ດູແລລະບົບ</p>
            <h2>ລ້າງລາຍງານທັງໝົດ</h2>
            <p className="muted">ຊື່ທີ່ສະຫຼຸບແລ້ວ ກຳໄລ ຂາດທຶນ ແລະປະຫວັດຈະຖືກລຶບ. ຄົນທີ່ກຳລັງຫຼິ້ນຢູ່ຍັງຢູ່ໂຕະ.</p>
            <div className="row-actions">
              <button type="button" className="btn primary" disabled={clearing} onClick={() => void onClear()}>
                ລ້າງລາຍງານ
              </button>
              <button type="button" className="btn ghost" disabled={clearing} onClick={() => setConfirmClear(false)}>
                ຍົກເລີກ
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
