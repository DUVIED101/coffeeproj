#!/usr/bin/env node
// Mint the Sign in with Apple client secret (ES256 JWT) GoTrue needs in
// GOTRUE_EXTERNAL_APPLE_SECRET. Apple caps validity at 6 months: put a
// reminder in the calendar and re-run before it expires.
//
//   APPLE_TEAM_ID=<team> APPLE_SIWA_KEY_ID=<kid> APPLE_SIWA_KEY_P8=~/Downloads/AuthKey_<kid>.p8 \
//   APPLE_CLIENT_ID=com.bystrobarista.web node infra/supabase-selfhost/scripts/apple-client-secret.mjs

import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
};

const b64url = (input) => Buffer.from(input).toString("base64url");
const keyPath = env("APPLE_SIWA_KEY_P8").replace(/^~/, homedir());
const privateKey = createPrivateKey(readFileSync(keyPath, "utf8"));
const now = Math.floor(Date.now() / 1000);
const header = b64url(
  JSON.stringify({ alg: "ES256", kid: env("APPLE_SIWA_KEY_ID") }),
);
const payload = b64url(
  JSON.stringify({
    iss: env("APPLE_TEAM_ID"),
    iat: now,
    exp: now + 180 * 24 * 3600,
    aud: "https://appleid.apple.com",
    sub: env("APPLE_CLIENT_ID"),
  }),
);
const signature = sign("SHA256", Buffer.from(`${header}.${payload}`), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});
console.log(`${header}.${payload}.${signature.toString("base64url")}`);
