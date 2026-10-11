import path from "node:path";
import { fileURLToPath } from "node:url";

// DATA_DIR lets the host mount a persistent disk (e.g. /var/data on Render/Railway).
export const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
