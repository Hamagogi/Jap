#!/usr/bin/env node
// Daily KBO data refresher.
// Best-effort scrape from mykbostats.com (no auth, simple HTML).
// Falls back to keeping the existing data file untouched if scraping fails.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../data/kbo-2026.json");

const UA = "Mozilla/5.0 (compatible; KBO-Toto-Calculator/1.0; +https://github.com/Hamagogi/Jap)";
const STANDINGS_URL = "https://mykbostats.com/standings";
const SCHEDULE_URL = "https://mykbostats.com/schedule";

const TEAM_MAP = {
  "samsung": "삼성 라이온즈",
  "kt": "KT 위즈",
  "lg": "LG 트윈스",
  "ssg": "SSG 랜더스",
  "kia": "KIA 타이거즈",
  "nc": "NC 다이노스",
  "hanwha": "한화 이글스",
  "doosan": "두산 베어스",
  "lotte": "롯데 자이언츠",
  "kiwoom": "키움 히어로즈",
};

function normalizeTeam(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  for (const [k, v] of Object.entries(TEAM_MAP)) {
    if (t.includes(k)) return v;
  }
  return null;
}

// Pythagorean win% with regression to mean.
function eloFromWinPct(pct, n) {
  const prior = 50;
  const regressed = 0.5 + (pct - 0.5) * (n / (n + prior));
  const clamped = Math.max(0.05, Math.min(0.95, regressed));
  return Math.round(1500 + 400 * Math.log10(clamped / (1 - clamped)));
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// Parse the standings table from mykbostats.com.
// Site uses a <table> with team name + W/L/Pct columns.
function parseStandings(html) {
  const out = [];
  // Each standings row tends to look like: <tr>...<a ...>Samsung Lions</a>...<td>12</td><td>5</td>...
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    const nameMatch = row.match(/>([A-Za-z][A-Za-z .]+?)<\/a>/);
    if (!nameMatch) continue;
    const team = normalizeTeam(nameMatch[1]);
    if (!team) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x =>
      x[1].replace(/<[^>]+>/g, "").trim()
    );
    const nums = cells.map(c => parseFloat(c)).filter(Number.isFinite);
    // Heuristic: first three integers after the team name are GP, W, L (or W, L, D depending on layout).
    if (nums.length < 3) continue;
    const w = nums.find(n => Number.isInteger(n) && n >= 0 && n <= 144);
    // Take first int for W, next int for L; this is approximate.
    const ints = nums.filter(n => Number.isInteger(n));
    if (ints.length < 2) continue;
    const W = ints[0], L = ints[1], D = ints[2] && ints[2] < 50 ? ints[2] : 0;
    const games = W + L;
    if (games < 1) continue;
    const pct = +(W / games).toFixed(3);
    out.push({ team, w: W, l: L, d: D, pct, elo: eloFromWinPct(pct, games) });
  }
  // Dedupe by team, keep first occurrence.
  const seen = new Set();
  return out.filter(x => (seen.has(x.team) ? false : seen.add(x.team)));
}

function parseSchedule(html) {
  // Best-effort: pick game rows with date + two teams. Keep next 14 days.
  const out = [];
  const today = new Date();
  const horizon = new Date(today.getTime() + 14 * 86400000);
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    const dateMatch = row.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (!dateMatch) continue;
    const d = new Date(`${dateMatch[1]}-${String(+dateMatch[2]).padStart(2,"0")}-${String(+dateMatch[3]).padStart(2,"0")}`);
    if (isNaN(d) || d < today || d > horizon) continue;
    const teamMatches = [...row.matchAll(/>([A-Za-z][A-Za-z .]+?)<\/a>/g)]
      .map(x => normalizeTeam(x[1])).filter(Boolean);
    if (teamMatches.length < 2) continue;
    const timeMatch = row.match(/(\d{1,2}:\d{2})/);
    out.push({
      date: d.toISOString().slice(0, 10),
      away: teamMatches[0],
      home: teamMatches[1],
      time: timeMatch ? timeMatch[1] : null,
    });
  }
  return out;
}

// Update last10 from a results-style table if present in standings page.
function parseLast10(html, teamName) {
  // Look for a fragment near the team name like "L10: 6-4" or sequence "WLWWLW".
  const idx = html.indexOf(teamName);
  if (idx < 0) return null;
  const slice = html.slice(idx, idx + 600);
  const seqMatch = slice.match(/\b([WL][WL]{8,9})\b/);
  if (seqMatch) return seqMatch[1].split("");
  const recordMatch = slice.match(/L10[:\s]+(\d{1,2})[-–](\d{1,2})/i);
  if (recordMatch) {
    const w = +recordMatch[1], l = +recordMatch[2];
    return Array(w).fill("W").concat(Array(l).fill("L")).slice(0, 10);
  }
  return null;
}

async function main() {
  const existing = JSON.parse(await readFile(DATA_PATH, "utf8"));
  let standings = existing.standings;
  let schedule = existing.schedule || [];
  let ok = false;

  try {
    const html = await fetchText(STANDINGS_URL);
    const parsed = parseStandings(html);
    if (parsed.length >= 8) {
      // Preserve team list order + rotation/team_ops/team_era/etc. from existing file.
      const byTeam = Object.fromEntries(parsed.map(p => [p.team, p]));
      standings = existing.standings.map(s => {
        const p = byTeam[s.team];
        if (!p) return s;
        const last10 = parseLast10(html, s.team) || s.last10;
        return { ...s, w: p.w, l: p.l, d: p.d, pct: p.pct, elo: p.elo, last10 };
      });
      // Re-sort by pct desc.
      standings.sort((a, b) => b.pct - a.pct);
      ok = true;
    }
  } catch (e) {
    console.error("standings fetch failed:", e.message);
  }

  try {
    const html = await fetchText(SCHEDULE_URL);
    const parsed = parseSchedule(html);
    if (parsed.length > 0) schedule = parsed;
  } catch (e) {
    console.error("schedule fetch failed:", e.message);
  }

  const next = {
    ...existing,
    updated_at: new Date().toISOString().slice(0, 10),
    source: ok ? `mykbostats.com (auto, ${new Date().toISOString()})` : existing.source,
    standings,
    schedule,
  };

  await writeFile(DATA_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`updated standings=${standings.length} schedule=${schedule.length} ok=${ok}`);
}

main().catch(e => {
  console.error("fatal:", e);
  process.exit(1);
});
