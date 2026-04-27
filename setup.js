#!/usr/bin/env node

/**
 * usage-tracker: Setup Script
 * 
 * Automatically configures the statusline in your Claude Code settings.
 * Run this after installing the plugin:
 * 
 *   node setup.js
 *   node setup.js --uninstall    # Remove statusline config
 */

const fs = require("fs");
const path = require("path");

const HOME = process.env.HOME || process.env.USERPROFILE || "/tmp";
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname);
const SCRIPT_PATH = path.join(PLUGIN_ROOT, "hooks", "scripts", "statusline.js");

const uninstall = process.argv.includes("--uninstall");

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

if (uninstall) {
  if (settings.statusLine) {
    delete settings.statusLine;
    writeSettings(settings);
    console.log("✅ Removed usage-tracker statusline from settings.");
  } else {
    console.log("No statusline config found. Nothing to remove.");
  }
  process.exit(0);
}

// Check if there's already a statusline configured
if (settings.statusLine && !settings.statusLine.command?.includes("usage-tracker")) {
  console.log("⚠️  You already have a statusline configured:");
  console.log(`   command: ${settings.statusLine.command}`);
  console.log("");
  console.log("To replace it, re-run with --force, or manually update your settings.");
  
  if (!process.argv.includes("--force")) {
    console.log("");
    console.log("Alternatively, you can chain scripts. Add to your existing statusline:");
    console.log(`   node ${SCRIPT_PATH}`);
    process.exit(0);
  }
}

settings.statusLine = {
  type: "command",
  command: `node ${SCRIPT_PATH}`,
  padding: 0,
};

writeSettings(settings);

console.log("✅ Statusline configured!");
console.log("");
console.log("Restart Claude Code to see the statusline.");
console.log("");
console.log("It will show:");
console.log("  🤖 Model │ 🧠 Context bar │ 💰 Session cost │ 💬 Prompt count");
console.log("  📅 Today's stats │ 📊 Token breakdown │ ∑ All-time totals");
console.log("");
console.log(`To remove: node ${__filename} --uninstall`);
