import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { loadDoc, saveDoc } from "./persist.js";
import { HttpError } from "./store.js";

type StoredPin = { salt: string; hash: string };

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // dealer stays logged in for 7 days
const revoked = new Set<string>();
let stored: StoredPin;

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

function makePin(pin: string): StoredPin {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: hashPin(pin, salt) };
}

export async function initAuth() {
  const loaded = await loadDoc<StoredPin>("dealer-pin");
  if (loaded?.salt && loaded?.hash) {
    stored = loaded;
    return;
  }
  // First start: create the dealer PIN from DEALER_PIN (or the old default).
  stored = makePin(process.env.DEALER_PIN || "245678");
  saveDoc("dealer-pin", stored);
}

function pinMatches(pin: string) {
  const actual = Buffer.from(hashPin(pin, stored.salt), "hex");
  const expected = Buffer.from(stored.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Signed token "<expires>.<nonce>.<signature>". Signed with the PIN hash, so it
// survives server restarts and every token becomes invalid when the PIN changes.
function sign(payload: string) {
  return createHmac("sha256", stored.hash).update(payload).digest("hex");
}

function tokenValid(token: string) {
  const [expires, nonce, signature] = token.split(".");
  if (!expires || !nonce || !signature || revoked.has(token)) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(`${expires}.${nonce}`), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function tokenFrom(req: Request) {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

export function login(pin: unknown) {
  if (typeof pin !== "string" || !pinMatches(pin)) throw new HttpError(401, "ລະຫັດດີເລີບໍ່ຖືກ");
  const payload = `${Date.now() + TOKEN_TTL_MS}.${randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export function logout(token: string) {
  if (token) revoked.add(token);
}

export function changePin(currentPin: unknown, nextPin: unknown) {
  if (typeof currentPin !== "string" || !pinMatches(currentPin)) throw new HttpError(400, "ລະຫັດເກົ່າບໍ່ຖືກ");
  if (typeof nextPin !== "string" || !/^\d{4,8}$/.test(nextPin)) {
    throw new HttpError(400, "ລະຫັດໃໝ່ຕ້ອງເປັນຕົວເລກ 4 ຫາ 8 ໂຕ");
  }
  stored = makePin(nextPin);
  saveDoc("dealer-pin", stored);
}

export function requireDealer(req: Request, res: Response, next: NextFunction) {
  const token = tokenFrom(req);
  if (!token || !tokenValid(token)) {
    res.status(401).json({ error: "ຕ້ອງເຂົ້າລະບົບດີເລີ" });
    return;
  }
  next();
}
