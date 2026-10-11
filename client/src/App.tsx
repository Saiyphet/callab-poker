import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { changeDealerPin, loginDealer, logoutDealer } from "./api";
import { clearDealerToken, dealerToken, setDealerToken } from "./dealerAuth";
import { CardsPage } from "./pages/CardsPage";
import { DealerPage } from "./pages/DealerPage";
import { ReportPage } from "./pages/ReportPage";
import { ScanPage } from "./pages/ScanPage";

export function App() {
  const location = useLocation();
  const [authed, setAuthed] = useState(() => dealerToken() !== "");
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    const logout = () => setAuthed(false);
    window.addEventListener("dealer-logout", logout);
    return () => window.removeEventListener("dealer-logout", logout);
  }, []);

  async function exitDealer() {
    await logoutDealer();
    clearDealerToken();
    setAuthed(false);
    setPinOpen(false);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/collab-poker.jpg" alt="Collab Poker" className="brand-logo" />
          {authed && <small>ລະບົບນັບຊິບໂປກເກີ</small>}
        </div>
        {authed ? (
          <div className="dealer-tools">
            <nav>
              <NavLink to="/" end>
                ໂຕະດີເລີ
              </NavLink>
              <NavLink to="/scan">ສະແກນຂໍຊິບ</NavLink>
              <NavLink to="/cards">ບັດ QR</NavLink>
              <NavLink to="/report">ລາຍງານ</NavLink>
            </nav>
            <button type="button" className="btn ghost" onClick={() => setPinOpen(true)}>
              ປ່ຽນລະຫັດ
            </button>
            <button type="button" className="btn ghost" onClick={() => void exitDealer()}>
              ອອກ
            </button>
          </div>
        ) : (
          location.pathname.startsWith("/scan") && (
            <Link className="dealer-entry" to="/">
              ດີເລີ
            </Link>
          )
        )}
      </header>
      <main>
        <Routes>
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/scan/:playerNumber" element={<ScanPage />} />
          <Route path="/" element={authed ? <DealerPage /> : <LoginPage onSuccess={() => setAuthed(true)} />} />
          <Route path="/cards" element={authed ? <CardsPage /> : <LoginPage onSuccess={() => setAuthed(true)} />} />
          <Route path="/report" element={authed ? <ReportPage /> : <LoginPage onSuccess={() => setAuthed(true)} />} />
          <Route path="*" element={<Navigate to={authed ? "/" : "/scan"} replace />} />
        </Routes>
      </main>
      {authed && (
        <nav className="tabbar">
          <NavLink to="/" end>
            ໂຕະ
          </NavLink>
          <NavLink to="/scan">ສະແກນ</NavLink>
          <NavLink to="/cards">ບັດ</NavLink>
          <NavLink to="/report">ລາຍງານ</NavLink>
        </nav>
      )}
      {pinOpen && <PinDialog onClose={() => setPinOpen(false)} />}
    </div>
  );
}

function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await loginDealer(pin);
      setDealerToken(result.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ເຂົ້າລະບົບບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="scan-page" onSubmit={(event) => void submit(event)}>
      <img src="/collab-poker.jpg" alt="Collab Poker" className="scan-logo" />
      <h1>ສຳລັບດີເລີ</h1>
      <p className="muted">ໃສ່ລະຫັດເພື່ອເຂົ້າໂຕະ ບັດ QR ແລະ ລາຍງານ</p>
      <label className="field">
        ລະຫັດດີເລີ
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/[^\d]/g, ""))}
        />
      </label>
      {error && <p className="banner">{error}</p>}
      <button type="submit" className="btn primary" disabled={pin.length < 4 || busy}>
        ເຂົ້າສູ່ລະບົບ
      </button>
      <Link className="dealer-entry" to="/scan">
        ກັບໄປໜ້າສະແກນຂໍຊິບ
      </Link>
    </form>
  );
}

function PinDialog({ onClose }: { onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await changeDealerPin(currentPin, nextPin);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ປ່ຽນລະຫັດບໍ່ສຳເລັດ");
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <form className="sheet" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void submit(event)}>
        <p className="table-kicker">ດີເລີ</p>
        <h2>ປ່ຽນລະຫັດ</h2>
        {done ? (
          <p>ປ່ຽນລະຫັດແລ້ວ</p>
        ) : (
          <>
            <label className="field">
              ລະຫັດເກົ່າ
              <input type="password" inputMode="numeric" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/[^\d]/g, ""))} />
            </label>
            <label className="field">
              ລະຫັດໃໝ່ 4–8 ໂຕ
              <input type="password" inputMode="numeric" value={nextPin} onChange={(event) => setNextPin(event.target.value.replace(/[^\d]/g, ""))} />
            </label>
            {error && <p className="banner">{error}</p>}
          </>
        )}
        <div className="row-actions">
          {!done && (
            <button type="submit" className="btn primary" disabled={currentPin.length < 4 || nextPin.length < 4}>
              ບັນທຶກ
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            ປິດ
          </button>
        </div>
      </form>
    </div>
  );
}
