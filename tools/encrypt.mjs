// Reads .env (git-ignored) and writes admin.enc.json: the repo + GitHub token locked with the password.
// Usage: node tools/encrypt.mjs   (then commit admin.enc.json; never commit .env)
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as c } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
for (const k of ["ADMIN_PASSWORD", "GITHUB_TOKEN", "REPO"]) if (!env[k]) throw new Error(k + " is missing in .env");
// The file is public, so anyone can try passwords offline: a short one is crackable.
if (env.ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");

const ITER = 600000;
const salt = c.getRandomValues(new Uint8Array(16));
const iv = c.getRandomValues(new Uint8Array(12));
const base = await c.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_PASSWORD), "PBKDF2", false, ["deriveKey"]);
const key = await c.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const data = await c.subtle.encrypt({ name: "AES-GCM", iv }, key,
  new TextEncoder().encode(JSON.stringify({ repo: env.REPO, token: env.GITHUB_TOKEN })));
const b64 = (u) => Buffer.from(u).toString("base64");
writeFileSync("admin.enc.json", JSON.stringify({ iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data) }) + "\n");
console.log("Wrote admin.enc.json");
