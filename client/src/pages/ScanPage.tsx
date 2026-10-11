import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChipRequest, getChipRequest, getPlayer } from "../api";
import { BUYIN_PRESETS, formatChips, parsePlayerCode } from "../chips";
import { nameColor } from "../nameColor";
import { ChipToken } from "../components/ChipToken";
import type { ChipRequest } from "../types";

type Phase = "scan" | "form" | "done";

export function ScanPage() {
  const navigate = useNavigate();
  const params = useParams();
  const routeSeat = parsePlayerCode(params.playerNumber ?? "");
  const [phase, setPhase] = useState<Phase>(routeSeat ? "form" : "scan");
  const [playerNumber, setPlayerNumber] = useState<string | null>(routeSeat);
  const [knownName, setKnownName] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<ChipRequest | null>(null);

  useEffect(() => {
    if (!routeSeat) return;
    void openPlayer(routeSeat);
  }, [routeSeat]);

  useEffect(() => {
    if (phase !== "scan") return;
    const scanner = new Html5Qrcode("qr-reader", { verbose: false });
    let cancelled = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (text) => {
          if (cancelled) return;
          const parsed = parsePlayerCode(text);
          if (!parsed) {
            setError("QR ນີ້ບໍ່ແມ່ນເລກຜູ້ຫຼິ້ນຂອງ Collab Poker");
            return;
          }
          cancelled = true;
          setError(null);
          const finish = () => {
            void openPlayer(parsed);
          };
          if (scanner.isScanning) scanner.stop().then(finish).catch(finish);
          else finish();
        },
        () => undefined,
      )
      .then(() => {
        if (cancelled && scanner.isScanning) scanner.stop().catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError("ເປີດກ້ອງບໍ່ໄດ້ ເລືອກເລກຜູ້ຫຼິ້ນດ້ານລຸ່ມ ຫຼືເປີດໜ້ານີ້ຜ່ານ localhost");
        }
      });

    return () => {
      cancelled = true;
      if (scanner.isScanning) scanner.stop().catch(() => undefined);
    };
  }, [phase]);

  useEffect(() => {
    if (!ticket || ticket.status !== "pending") return;
    const timer = window.setInterval(() => {
      getChipRequest(ticket.id)
        .then((result) => setTicket(result.request))
        .catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [ticket]);

  const chosen = custom.trim() === "" ? amount : Number(custom);
  const validAmount = Number.isInteger(chosen) && chosen >= 1 && chosen <= 1_000_000;

  async function openPlayer(nextNumber: string) {
    setError(null);
    setPlayerNumber(nextNumber);
    setName("");
    try {
      const result = await getPlayer(nextNumber);
      setKnownName(result.player.name);
    } catch {
      setKnownName("");
    }
    setPhase("form");
  }

  async function submit() {
    if (!playerNumber || !validAmount || (!knownName && name.trim() === "")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createChipRequest(playerNumber, chosen, knownName ? undefined : name.trim());
      setTicket(result.request);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  async function scanImage(file: File) {
    const scanner = new Html5Qrcode("qr-file", { verbose: false });
    try {
      const parsed = parsePlayerCode(await scanner.scanFile(file, true));
      if (!parsed) {
        setError("QR ນີ້ບໍ່ແມ່ນເລກຜູ້ຫຼິ້ນຂອງ Collab Poker");
        return;
      }
      setError(null);
      await openPlayer(parsed);
    } catch {
      setError("ອ່ານ QR ຈາກຮູບບໍ່ສຳເລັດ");
    } finally {
      scanner.clear();
    }
  }

  function pickManual(number: string) {
    void openPlayer(number);
  }

  function reset() {
    setTicket(null);
    setPlayerNumber(null);
    setKnownName("");
    setName("");
    setCustom("");
    setAmount(1000);
    setError(null);
    setPhase("scan");
    if (routeSeat) navigate("/scan", { replace: true });
  }

  return (
    <section className="scan-page">
      {phase === "scan" && (
        <>
          <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
          <h1>ຂໍຊິບເຂົ້າຫຼິ້ນ</h1>
          <p className="muted">ສະແກນ QR ເລກຜູ້ຫຼິ້ນຂອງໂຕະ 1</p>
          <div id="qr-reader" />
          {params.playerNumber && !routeSeat && <p className="banner">ເລກຜູ້ຫຼິ້ນນີ້ບໍ່ມີໃນໂຕະ 1</p>}
          {cameraError && <p className="banner">{cameraError}</p>}
          {error && <p className="banner">{error}</p>}
          <label className="btn ghost file-btn">
            ອັບໂຫຼດຮູບ QR
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void scanImage(file);
              }}
            />
          </label>
          <div id="qr-file" hidden />
          <div className="manual">
            <p>ຫຼືເລືອກເລກຜູ້ຫຼິ້ນ</p>
            <div className="preset-grid player-grid">
              {Array.from({ length: 15 }, (_, index) => String(index + 1).padStart(2, "0")).map((number) => (
                <button key={number} type="button" onClick={() => pickManual(number)}>
                  {number}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === "form" && playerNumber && (
        <>
          <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
          <p className="table-kicker">ໂຕະ 1</p>
          <h1 style={knownName ? { color: nameColor(knownName) } : undefined}>{knownName || `ຜູ້ຫຼິ້ນ ${playerNumber}`}</h1>
          <p className="muted">ບ່ອນ {Number(playerNumber)} · ເລືອກຈຳນວນຊິບທີ່ຈະຂໍ</p>
          {!knownName && (
            <label className="field">
              ພິມຊື່ຂອງທ່ານ
              <input value={name} maxLength={40} placeholder="ຊື່" onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <div className="preset-grid">
            {BUYIN_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={custom === "" && amount === preset ? "is-selected" : ""}
                onClick={() => {
                  setAmount(preset);
                  setCustom("");
                }}
              >
                {formatChips(preset)}
              </button>
            ))}
          </div>
          <label className="field">
            ກອກຈຳນວນເອງ
            <input
              inputMode="numeric"
              value={custom}
              placeholder={formatChips(amount)}
              onChange={(event) => setCustom(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          {error && <p className="banner">{error}</p>}
          <div className="row-actions">
            <button type="button" className="btn primary" disabled={!validAmount || busy || (!knownName && name.trim() === "")} onClick={submit}>
              ສົ່ງຄຳຂໍໃຫ້ດີເລີ
            </button>
            <button type="button" className="btn ghost" onClick={reset}>
              ສະແກນໃໝ່
            </button>
          </div>
        </>
      )}

      {phase === "done" && ticket && (
        <div className="done-card">
          {ticket.status === "pending" && (
            <>
              <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
              <p className="table-kicker">ລໍຖ້າດີເລີ</p>
              <h1>ສົ່ງຄຳຂໍແລ້ວ</h1>
              <p>
                ຜູ້ຫຼິ້ນ {ticket.playerNumber} · ບ່ອນນັ່ງ {ticket.seat}
              </p>
              <p className="sheet-amount">{formatChips(ticket.amount)}</p>
              <p className="muted">ລໍຖ້າດີເລີກົດ Accept ເພື່ອຮັບຊິບ</p>
            </>
          )}
          {ticket.status === "accepted" && (
            <>
              <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
              <p className="table-kicker">ເຂົ້າເກມໄດ້</p>
              <h1>ໄດ້ຮັບຊິບແລ້ວ</h1>
              <p className="sheet-amount">{formatChips(ticket.amount)}</p>
              <p>ໄປບ່ອນນັ່ງ {ticket.seat} ໄດ້ເລີຍ</p>
            </>
          )}
          {ticket.status === "rejected" && (
            <>
              <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
              <p className="table-kicker">ບໍ່ຜ່ານ</p>
              <h1>ດີເລີປະຕິເສດຄຳຂໍ</h1>
              <button type="button" className="btn primary" onClick={reset}>
                ຂໍໃໝ່
              </button>
            </>
          )}
          {ticket.status !== "rejected" && (
            <button type="button" className="btn ghost" onClick={reset}>
              ກັບໄປສະແກນ
            </button>
          )}
          <div className="chip-sample" aria-hidden="true">
            <ChipToken value={1000} />
            <ChipToken value={500} />
            <ChipToken value={100} />
          </div>
        </div>
      )}
    </section>
  );
}
