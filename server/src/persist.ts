import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./paths.js";

// Storage for small JSON documents.
// - If Upstash Redis env vars are set → saved in Redis (survives restarts/redeploys).
// - Otherwise → saved as files in DATA_DIR (local development).
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const prefix = process.env.REDIS_PREFIX || "chip-poker";

export const storageKind = redisUrl && redisToken ? "redis" : "file";

async function redis(command: unknown[]) {
  const response = await fetch(redisUrl!, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || data.error) throw new Error(`Redis: ${data.error ?? response.status}`);
  return data.result;
}

export async function loadDoc<T>(name: string): Promise<T | null> {
  if (storageKind === "redis") {
    const raw = await redis(["GET", `${prefix}:${name}`]);
    return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

// Writes are queued so they happen in order; only the newest pending value is written.
const pending = new Map<string, string>();
let chain: Promise<void> = Promise.resolve();

export function saveDoc(name: string, value: unknown) {
  const json = JSON.stringify(value, null, storageKind === "file" ? 2 : 0);
  if (storageKind === "file") {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `${name}.json`), json);
    return;
  }
  const alreadyQueued = pending.has(name);
  pending.set(name, json);
  if (alreadyQueued) return;
  chain = chain.then(async () => {
    const latest = pending.get(name)!;
    pending.delete(name);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await redis(["SET", `${prefix}:${name}`, latest]);
        return;
      } catch (error) {
        console.error(`Save ${name} failed (attempt ${attempt})`, error);
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  });
}

export function flushSaves() {
  return chain;
}
