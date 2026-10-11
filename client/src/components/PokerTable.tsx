import { breakdown, formatChips, stackPreview } from "../chips";
import type { ChipRequest, Player } from "../types";
import { ChipRow } from "./ChipToken";
import { PlayerName } from "./PlayerName";

type Props = {
  players: Player[];
  pending: ChipRequest[];
  editingNumber: string | null;
  nameDraft: string;
  onEditStart: (player: Player) => void;
  onNameDraft: (value: string) => void;
  onEditSave: (playerNumber: string) => void;
  onEditCancel: () => void;
  onSettle: (playerNumber: string) => void;
};

export function PokerTable({
  players,
  pending,
  editingNumber,
  nameDraft,
  onEditStart,
  onNameDraft,
  onEditSave,
  onEditCancel,
  onSettle,
}: Props) {
  return (
    <section className="felt-wrap" aria-label="ໂຕະ 1">
      <div className="table-center">
        <img src="/collab-poker.jpg" alt="Collab Poker" className="table-logo" />
        <p>ໂຕະ 1 · 15 ຜູ້ຫຼິ້ນ</p>
      </div>
      <div className="seat-grid">
        {players.map((player) => {
          const request = pending.find((item) => item.playerNumber === player.playerNumber);
          const editing = editingNumber === player.playerNumber;
          return (
            <article
              key={player.playerNumber}
              className={`seat ${player.inGame ? "is-playing" : ""} ${request ? "is-pending" : ""}`}
            >
              <header>
                <span>ບ່ອນ {player.playerNumber}</span>
                <PlayerName name={player.name} />
              </header>
              <ChipRow values={stackPreview(player.chips, breakdown(player.chips))} size={30} />
              <p className="seat-amount">{formatChips(player.totalBuyIn)}</p>
              <p className="seat-note">ຊື້ເຂົ້າ</p>
              {request ? (
                <p className="seat-status wait">ລໍຖ້າ Accept {formatChips(request.amount)}</p>
              ) : player.inGame ? (
                <p className="seat-status live">ກຳລັງຫຼິ້ນ</p>
              ) : (
                <p className="seat-status">ວ່າງ ຮັບຄົນໃໝ່ໄດ້</p>
              )}
              {editing ? (
                <form
                  className="name-edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onEditSave(player.playerNumber);
                  }}
                >
                  <input
                    value={nameDraft}
                    maxLength={40}
                    placeholder="ພິມຊື່"
                    onChange={(event) => onNameDraft(event.target.value)}
                  />
                  <div className="row-actions">
                    <button type="submit">ບັນທຶກ</button>
                    <button type="button" onClick={onEditCancel}>
                      ຍົກເລີກ
                    </button>
                  </div>
                </form>
              ) : (
                <div className="row-actions seat-actions">
                  <button type="button" className="text-btn" onClick={() => onEditStart(player)}>
                    ແກ້ຊື່
                  </button>
                  {player.inGame && (
                    <button type="button" className="text-btn" onClick={() => onSettle(player.playerNumber)}>
                      ສະຫຼຸບ
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
