import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { changePin, initAuth, login, logout, requireDealer, tokenFrom } from "./auth.js";
import { storageKind } from "./persist.js";
import { HttpError, initStore, acceptRequest, clearReport, createRequest, findPlayer, getRequest, rejectRequest, renamePlayer, report, settlePlayer, snapshot, updateRequest } from "./store.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Collab Poker" });
});

app.post("/api/dealer/login", (req, res) => {
  try {
    const body = req.body as { pin?: unknown };
    res.json({ token: login(body.pin) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/dealer/logout", (req, res) => {
  logout(tokenFrom(req));
  res.json({ ok: true });
});

app.post("/api/dealer/pin", requireDealer, (req, res) => {
  try {
    const body = req.body as { currentPin?: unknown; nextPin?: unknown };
    changePin(body.currentPin, body.nextPin);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/table", requireDealer, (_req, res) => {
  res.json(snapshot());
});

app.get("/api/report", requireDealer, (_req, res) => {
  res.json(report());
});

app.post("/api/report/clear", requireDealer, (_req, res) => {
  try {
    res.json(clearReport());
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/requests", (req, res) => {
  try {
    const body = req.body as { playerNumber?: unknown; amount?: unknown; name?: unknown };
    const result = createRequest(body.playerNumber, body.amount, body.name);
    res.status(201).json({ request: result.request, player: publicPlayer(result.player) });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/requests/:id", (req, res) => {
  try {
    const result = getRequest(req.params.id);
    res.json({ request: result.request, player: publicPlayer(result.player) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/requests/:id", requireDealer, (req, res) => {
  try {
    const body = req.body as { amount?: unknown; name?: unknown };
    res.json(updateRequest(req.params.id, body.amount, body.name));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/requests/:id/accept", requireDealer, (req, res) => {
  try {
    res.json(acceptRequest(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/requests/:id/reject", requireDealer, (req, res) => {
  try {
    res.json(rejectRequest(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/players/:playerNumber", (req, res) => {
  try {
    res.json({ player: publicPlayer(findPlayer(req.params.playerNumber).player) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/players/:playerNumber/name", requireDealer, (req, res) => {
  try {
    const body = req.body as { name?: unknown };
    res.json(renamePlayer(req.params.playerNumber, body.name));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/players/:playerNumber/settle", requireDealer, (req, res) => {
  try {
    const body = req.body as { chipsInHand?: unknown };
    res.json(settlePlayer(req.params.playerNumber, body.chipsInHand));
  } catch (error) {
    sendError(res, error);
  }
});

function publicPlayer(player: { playerNumber: string; name: string; seat: number }) {
  return { playerNumber: player.playerNumber, name: player.name, seat: player.seat };
}

const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "client", "dist");
const noCacheFiles = new Set(["sw.js", "manifest.webmanifest", "index.html"]);
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      setHeaders(res, filePath) {
        if (noCacheFiles.has(path.basename(filePath))) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

function sendError(res: express.Response, error: unknown) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "ລະບົບຂັດຂ້ອງ" });
}

await initStore();
await initAuth();

app.listen(port, "0.0.0.0", () => {
  console.log(`Collab Poker http://localhost:${port} (storage: ${storageKind})`);
});
