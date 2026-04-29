#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const C = {
  reset:  "\x1b[0m",
  dim:    "\x1b[2m",
  white:  "\x1b[37m",
  gray:   "\x1b[90m",
  green:  "\x1b[32m",
  bGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  bRed:   "\x1b[91m",
};

const HOME = process.env.HOME || process.env.USERPROFILE || "/tmp";
const STATE_FILE = path.join(HOME, ".claude", "usage-tracker", "statusline-state.json");

function fmtTokens(n) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function ctxColor(pct) {
  if (pct >= 80) return C.bRed;
  if (pct >= 60) return C.yellow;
  if (pct >= 30) return C.bGreen;
  return C.green;
}

function fmtRemaining(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m > 0 ? m + "m" : ""}`;
  return `${m}m`;
}

function fmtTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, "0")}${ampm}`;
}

function fmtDateTime(date) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${date.getDate()} ${months[date.getMonth()]} ${fmtTime(date)}`;
}

function getCtxDelta(sessionId, currentPct) {
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); } catch {}

  const prev = state[sessionId];
  let deltaPct;

  if (!prev || currentPct > prev.prevPct) {
    deltaPct = Math.max(0, currentPct - (prev?.prevPct ?? 0));
    state[sessionId] = { prevPct: currentPct, lastDeltaPct: deltaPct };
    try {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    } catch {}
  } else {
    deltaPct = prev.lastDeltaPct ?? 0;
  }

  return deltaPct;
}

async function main() {
  let inputData = "";
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) inputData += line;

  let data;
  try { data = JSON.parse(inputData); } catch { data = {}; }

  const sessionId  = data.session_id || "";
  const ctxPct     = Math.round(data.context_window?.used_percentage || 0);
  const ctxSize    = data.context_window?.context_window_size || 200000;
  const cu          = data.context_window?.current_usage || {};
  const tokIn       = cu.input_tokens || 0;
  const tokOut      = cu.output_tokens || 0;
  const tokCache    = (cu.cache_read_input_tokens || 0) + (cu.cache_creation_input_tokens || 0);

  const fiveHour  = data.rate_limits?.five_hour  || {};
  const sevenDay  = data.rate_limits?.seven_day  || {};

  if (!sessionId || ctxPct === 0) return;

  const now = Date.now();
  const deltaPct = getCtxDelta(sessionId, ctxPct);

  // ── Context window segment ────────────────────────────────────
  const tokStr = (tokIn + tokOut + tokCache) > 0
    ? ` 🌀${C.white}${fmtTokens(tokIn)}${C.reset}`
    + ` ✨${C.white}${fmtTokens(tokOut)}${C.reset}`
    + (tokCache > 0 ? ` ${C.gray}♻️ ${fmtTokens(tokCache)}${C.reset}` : "")
    : "";

  const ctxStr = `${ctxColor(ctxPct)}🧠 ${ctxPct}%${C.reset}`
    + (deltaPct > 0 ? ` ${C.gray}(+${Math.round(deltaPct)}%)${C.reset}` : "")
    + tokStr;

  // ── Session (5h) segment ──────────────────────────────────────
  let sessionStr = "";
  if (fiveHour.used_percentage != null) {
    const pct      = Math.round(fiveHour.used_percentage);
    const resetAt  = fiveHour.resets_at ? new Date(fiveHour.resets_at * 1000) : null;
    const remaining = resetAt ? fmtRemaining(resetAt - now) : "";
    const resetTime = resetAt ? fmtTime(resetAt) : "";
    sessionStr = `${ctxColor(pct)}session ${pct}%${C.reset}`
      + (remaining ? ` ${C.gray}${remaining} (${resetTime})${C.reset}` : "");
  }

  // ── Week (7d) segment ─────────────────────────────────────────
  let weekStr = "";
  if (sevenDay.used_percentage != null) {
    const pct      = Math.round(sevenDay.used_percentage);
    const resetAt  = sevenDay.resets_at ? new Date(sevenDay.resets_at * 1000) : null;
    const remaining = resetAt ? fmtRemaining(resetAt - now) : "";
    const resetDT  = resetAt ? fmtDateTime(resetAt) : "";
    weekStr = `${ctxColor(pct)}week ${pct}%${C.reset}`
      + (remaining ? ` ${C.gray}${remaining} (${resetDT})${C.reset}` : "");
  }

  const sep = ` ${C.gray}│${C.reset} `;
  const parts = [ctxStr, sessionStr, weekStr].filter(Boolean);
  console.log(parts.join(sep));
}

main().catch(() => {});
