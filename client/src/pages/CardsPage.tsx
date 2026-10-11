import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getTable } from "../api";
import { SEAT_COUNT, playerQrValue } from "../chips";
import { PlayerName } from "../components/PlayerName";
import type { Player } from "../types";

export function CardsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const numbers = Array.from({ length: SEAT_COUNT }, (_, index) => String(index + 1).padStart(2, "0"));

  useEffect(() => {
    let alive = true;
    const pull = () => {
      getTable()
        .then((table) => {
          if (alive) setPlayers(table.players);
        })
        .catch(() => undefined);
    };
    pull();
    const timer = window.setInterval(pull, 1500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="cards-page">
      <div className="cards-head">
        <div>
          <img src="/collab-poker.jpg" alt="Collab Poker" className="cards-logo" />
          <h1>ບັດ QR ຜູ້ຫຼິ້ນ ໂຕະ 1</h1>
          <p className="muted">ສະແກນແລ້ວຂໍຊິບ ຊື່ຜູ້ຫຼິ້ນຈະຂຶ້ນແທນເລກບ່ອນນັ່ງ</p>
        </div>
        <button type="button" className="btn primary" onClick={() => window.print()}>
          ພິມບັດ
        </button>
      </div>
      <div className="card-grid">
        {numbers.map((playerNumber) => {
          const name = players.find((player) => player.playerNumber === playerNumber)?.name ?? "";
          return (
            <article key={playerNumber} className="player-card">
              <img src="/collab-poker.jpg" alt="Collab Poker" className="card-logo" />
              <QRCodeSVG
                value={playerQrValue(playerNumber)}
                size={168}
                bgColor="#ffffff"
                fgColor="#1a1408"
                level="M"
                includeMargin
              />
              <p>{name ? <PlayerName name={name} /> : `ຜູ້ຫຼິ້ນ ${playerNumber}`}</p>
              <small>ໂຕະ 1 · ບ່ອນນັ່ງ {Number(playerNumber)}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
