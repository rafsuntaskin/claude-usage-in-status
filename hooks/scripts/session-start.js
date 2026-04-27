#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const HOME = process.env.HOME || process.env.USERPROFILE || "/tmp";
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(PLUGIN_ROOT, "hooks", "scripts", "statusline.js");
const COMMAND = `node ${SCRIPT_PATH}`;

function readSettings() {
  if (fs.existsSync(SETTINGS_PATH)) {
    try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")); } catch {}
  }
  return {};
}

function writeSettings(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

const settings = readSettings();

if (settings.statusLine?.command !== COMMAND) {
  settings.statusLine = { type: "command", command: COMMAND, padding: 0 };
  writeSettings(settings);
}

process.exit(0);
