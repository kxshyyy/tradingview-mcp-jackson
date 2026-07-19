/**
 * Morning brief core logic.
 * Reads rules.json, scans watchlist symbols, returns structured data
 * for Claude to apply bias criteria and generate a session brief.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as chart from "./chart.js";
import * as data from "./data.js";
import * as indicators from "./indicators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const SESSIONS_DIR = join(homedir(), ".tradingview-mcp", "sessions");
const DEFAULT_DASHBOARD_FILTER = "Apex Predator";

function loadRules(rulesPath) {
  const candidates = [
    rulesPath,
    join(PROJECT_ROOT, "rules.json"),
    join(homedir(), ".tradingview-mcp", "rules.json"),
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return { rules: JSON.parse(readFileSync(p, "utf8")), path: p };
      } catch (e) {
        throw new Error(`Failed to parse rules.json at ${p}: ${e.message}`);
      }
    }
  }

  throw new Error(
    "No rules.json found. Copy rules.example.json to rules.json and fill in your trading rules.\n" +
      "Looked in:\n" +
      candidates
        .filter(Boolean)
        .map((p) => `  - ${p}`)
        .join("\n"),
  );
}

export async function runBrief({ rules_path } = {}) {
  const { rules, path: loadedFrom } = loadRules(rules_path);
  const {
    watchlist = [],
    default_timeframe = "240",
    dashboard_study_filter,
  } = rules;
  const dashboardFilter = dashboard_study_filter || DEFAULT_DASHBOARD_FILTER;

  if (!watchlist.length) {
    throw new Error(
      "rules.json watchlist is empty. Add at least one symbol to your watchlist array.",
    );
  }

  // Save current chart state so we can restore after scanning
  let originalSymbol, originalTimeframe;
  let dashboardEntityId, dashboardWasVisible;
  try {
    const currentState = await chart.getState();
    originalSymbol = currentState.symbol;
    originalTimeframe = currentState.resolution;

    const match = (currentState.studies || []).find((s) =>
      s.name.toLowerCase().includes(dashboardFilter.toLowerCase()),
    );
    if (match) {
      dashboardEntityId = match.id;
      dashboardWasVisible = await indicators.isVisible({
        entity_id: dashboardEntityId,
      });
      if (!dashboardWasVisible) {
        await indicators.toggleVisibility({
          entity_id: dashboardEntityId,
          visible: true,
        });
      }
    }
  } catch (_) {}

  const results = [];

  for (const symbol of watchlist) {
    try {
      await chart.setSymbol({ symbol });
      await new Promise((r) => setTimeout(r, 900));
      await chart.setTimeframe({ timeframe: default_timeframe });
      await new Promise((r) => setTimeout(r, 1200));

      const [state, studyValues, quote, dashboard] = await Promise.all([
        chart.getState(),
        data.getStudyValues(),
        data.getQuote({}),
        dashboardEntityId
          ? data.getPineTables({ study_filter: dashboardFilter })
          : Promise.resolve(null),
      ]);

      results.push({
        symbol,
        timeframe: default_timeframe,
        state,
        indicators: studyValues,
        quote,
        dashboard,
      });
    } catch (err) {
      results.push({ symbol, error: err.message });
    }
  }

  // Restore original chart state
  if (originalSymbol) {
    try {
      await chart.setSymbol({ symbol: originalSymbol });
      if (originalTimeframe)
        await chart.setTimeframe({ timeframe: originalTimeframe });
    } catch (_) {}
  }
  if (dashboardEntityId && dashboardWasVisible === false) {
    try {
      await indicators.toggleVisibility({
        entity_id: dashboardEntityId,
        visible: false,
      });
    } catch (_) {}
  }

  return {
    success: true,
    generated_at: new Date().toISOString(),
    rules_loaded_from: loadedFrom,
    rules: {
      bias_criteria: rules.bias_criteria || null,
      risk_rules: rules.risk_rules || null,
      notes: rules.notes || null,
    },
    symbols_scanned: results,
    instruction: [
      "For each symbol in symbols_scanned, use its dashboard table (Bias/Trend/Signal/Confidence/Pressure/Delta/Sweep/Liquidity, if present) together with the indicator readings to apply the bias_criteria and risk_rules from rules.",
      "Output one line per symbol: SYMBOL | BIAS: [bullish/bearish/neutral] | KEY LEVEL: [price] | WATCH: [what to monitor]",
      "End with a one-sentence overall market read.",
      "Be direct. No preamble.",
    ].join(" "),
  };
}

export function saveSession({ brief, date } = {}) {
  mkdirSync(SESSIONS_DIR, { recursive: true });

  const dateStr = date || new Date().toISOString().split("T")[0];
  const filePath = join(SESSIONS_DIR, `${dateStr}.json`);

  const existing = existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, "utf8"))
    : {};
  const record = {
    ...existing,
    date: dateStr,
    saved_at: new Date().toISOString(),
    brief,
  };

  writeFileSync(filePath, JSON.stringify(record, null, 2));
  return { success: true, path: filePath, date: dateStr };
}

export function getSession({ date } = {}) {
  const dateStr = date || new Date().toISOString().split("T")[0];
  const filePath = join(SESSIONS_DIR, `${dateStr}.json`);

  if (existsSync(filePath)) {
    return { success: true, ...JSON.parse(readFileSync(filePath, "utf8")) };
  }

  // Fall back to yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdayPath = join(SESSIONS_DIR, `${yesterdayStr}.json`);

  if (existsSync(yesterdayPath)) {
    return {
      success: true,
      note: "No session for today — returning yesterday",
      ...JSON.parse(readFileSync(yesterdayPath, "utf8")),
    };
  }

  return {
    success: false,
    error: `No session found for ${dateStr} or ${yesterdayStr}`,
    sessions_dir: SESSIONS_DIR,
  };
}
