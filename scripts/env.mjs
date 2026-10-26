// Loads .env for local scripts. Inside Docker the variables come from compose.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // ignore malformed .env; required variables are validated below
  }
}

export const ROOT = root;

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[agencykit] Missing required environment variable ${name}. Run ./scripts/setup.sh first.`);
    process.exit(1);
  }
  return value;
}
