// Lamp: a calm, phone-friendly web UI for OliveTin.
// No dependencies, no build step. Talks to OliveTin's own API on the same origin, so OliveTin's
// authentication and access control lists apply unchanged: this file can't do anything the user can't.
// Everything works without lamp.json; the file only adds groups, descriptions, icons and the Status screen.

import { STRINGS, pickLang } from "./i18n.js";

const API = "/api/olivetin.api.v1.OliveTinApiService/";
const POLL_MS = 20000;

// ---------- icons (24x24, 1.6 stroke) ----------
const ICONS = {
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  clipboard: ["M9 3h6v3H9z", "M8 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2", "M9 14l2 2 4-4"],
  update: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16V8", "M8.5 11.5L12 8l3.5 3.5"],
  restart: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  cloud: ["M16 16l-4-4-4 4", "M12 12v9", "M20.4 18.1A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 4 16.3"],
  eraser: ["M20 20H9l-5-5a1.5 1.5 0 0 1 0-2l9-9a1.5 1.5 0 0 1 2 0l5 5a1.5 1.5 0 0 1 0 2L12 19", "M7 11l6 6"],
  package: ["M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z", "M3.3 7L12 12l8.7-5", "M12 22V12"],
  sliders: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"],
  tag: ["M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z", "M7.5 7.5h.01"],
  database: ["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z", "M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.9 1.9 0 0 0 3.4 0"],
  server: ["M2 4h20v7H2z", "M2 13h20v7H2z", "M6 7.5h.01", "M6 16.5h.01"],
  terminal: ["M4 17l6-5-6-5", "M12 19h8"],
  power: ["M12 2v10", "M18.4 6.6a9 9 0 1 1-12.8 0"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 15h10l1-15"],
  play: ["M6 4l14 8-14 8z"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  chevron: ["M9 18l6-6-6-6"],
  stop: ["M6 6h12v12H6z"],
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  hand: ["M12 3v8", "M8 6v6", "M16 6v6", "M20 9v6a8 8 0 0 1-8 8h-1a8 8 0 0 1-6-3l-2-3a1.6 1.6 0 0 1 2.4-2L7 14"],
};
// OliveTin icons are usually Iconify tags (<iconify-icon icon="mdi:...">). Lamp ships no icon font,
// so common Material Design names map to the built-in set; anything else falls back to "play".
const MDI = [
  [/refresh|reload|sync/, "refresh"], [/restart|reboot|cached/, "restart"], [/backup|restore|history/, "history"],
  [/update|upgrade|arrow-up/, "update"], [/cloud|upload/, "cloud"], [/broom|eraser|clean|delete-sweep/, "eraser"],
  [/docker|package|cube|archive/, "package"], [/cog|tune|sliders|wrench|settings/, "sliders"], [/tag|label/, "tag"],
  [/database|db/, "database"], [/bell|notif/, "bell"], [/clipboard|check|list/, "clipboard"], [/server|dns|nas/, "server"],
  [/console|terminal|bash|script/, "terminal"], [/power/, "power"], [/download/, "download"], [/trash|delete/, "trash"],
  [/clock|timer|calendar/, "clock"],
];
function iconFor(action, override) {
  if (override && ICONS[override]) return override;
  const m = /icon="(?:mdi|material-symbols)[:-]([^"]+)"/.exec(action?.icon || "");
  if (m) for (const [re, name] of MDI) if (re.test(m[1])) return name;
  return "play";
}
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(ICONS[name] || ICONS.play).map((d) => `<path d="${d}"/>`).join("")}</svg>`;

// ---------- helpers ----------
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) on(el, k.slice(2), v);
    else if (k === "style") el.setAttribute("style", v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
// Handlers live in el._on so morph() can swap them (fresh closures) without recreating the element.
function on(el, type, fn) {
  el._on ??= {};
  if (!(type in el._on)) el.addEventListener(type, (e) => el._on[type]?.(e));
  el._on[type] = fn;
}
// Applies a new tree onto the existing one and changes only what differs. Elements under the cursor,
// with focus or with a running animation (pulsing lamps) stay the same, so nothing flickers on click.
function morph(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  if (a._on || b._on) { for (const t in a._on) if (!b._on || !(t in b._on)) a._on[t] = null; for (const t in b._on) on(a, t, b._on[t]); }
  const ak = [...a.childNodes], bk = [...b.childNodes];
  bk.forEach((n, i) => (ak[i] ? morph(ak[i], n) : a.append(n)));
  ak.slice(bk.length).forEach((n) => n.remove());
}
const ico = (name, cls = "") => h("span", { class: cls, html: svg(name) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, body = {}) {
  const r = await fetch(API + method, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || r.statusText), { code: j.code, status: r.status });
  return j;
}

const parseTime = (s) => (s && !s.startsWith("0001") ? new Date(s.replace(" ", "T")) : null);
const pad = (n) => String(n).padStart(2, "0");
function when(d) {
  if (!d) return "";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return T.now;
  if (diff < 3600) return T.minAgo(Math.floor(diff / 60));
  const time = new Intl.DateTimeFormat(LANG, { hour: "2-digit", minute: "2-digit" }).format(d);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(d)) / 864e5);
  if (days === 0) return T.today(time);
  if (days === 1) return T.yesterday(time);
  return `${new Intl.DateTimeFormat(LANG, { day: "numeric", month: "short" }).format(d)} ${time}`;
}
function dur(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
const days = (d) => { const n = parseFloat(d); return Number.isNaN(n) ? "" : n < 1 ? `${Math.max(1, Math.round(n * 24))} h` : `${Math.round(n)} d`; };
// lamp.json labels may be a string or {"en": "...", "pl": "..."}
const tr = (x) => (x && typeof x === "object" ? x[LANG] ?? x.en ?? Object.values(x)[0] : x);
const lines = (s) => String(s || "").split(/<br\s*\/?>|\n/).map((x) => x.trim()).filter(Boolean);

// ---------- state ----------
let LANG = "en";
let T = STRINGS.en;
const S = {
  cfg: {}, title: "OliveTin", me: "", actions: new Map(), groups: [], machines: [], summary: null,
  logs: [], logsOffset: 0, logsLeft: 0, showAuto: false, route: "", refreshing: false, running: null, error: null, ready: false,
};
const app = document.getElementById("app");
let sheetCtl = null;
const statusCfg = () => S.cfg.status || null;

async function boot() {
  try {
    S.cfg = await fetch("lamp.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    LANG = pickLang(S.cfg.lang);
    T = STRINGS[LANG];
    document.documentElement.lang = LANG;
    const [init, who] = await Promise.all([api("Init"), api("WhoAmI")]);
    S.title = S.cfg.title || init.pageTitle || "OliveTin";
    document.title = S.title;
    S.me = who.authenticatedUser || init.authenticatedUser || "";
    if (!who.acls || !who.acls.length) return denied();
    await loadActions(S.cfg.dashboards || init.rootDashboards || []);
    await Promise.all([statusCfg() ? loadStatus() : null, loadLogs(true)]);
    S.ready = true;
  } catch (e) {
    S.error = e;
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
  route();
}

// Actions come from OliveTin's dashboards; the group is the nearest named fieldset around the action.
async function loadActions(dashboards) {
  const over = S.cfg.actions || {};
  const order = [];
  for (const title of dashboards.length ? dashboards : ["Actions"]) {
    const d = await api("GetDashboard", { title }).catch(() => null);
    (function walk(node, group) {
      for (const x of node?.contents || []) {
        if (x.action) {
          const a = x.action, o = over[a.bindingId] || {};
          if (o.hidden || S.actions.has(a.bindingId)) continue;
          S.actions.set(a.bindingId, {
            ...a, group: tr(o.group) || group || T.other, title: tr(o.title) || a.title,
            description: tr(o.description) || "", icon: iconFor(a, o.icon),
            scheduled: (a.execOnCron || []).length > 0 || !!a.execOnCalendarFile,
          });
          continue;
        }
        const named = x.type === "fieldset" && x.title && x.title !== "Actions" ? x.title : null;
        if (named && !order.includes(named)) order.push(named);
        walk(x, named || group);
      }
    })(d?.dashboard, d?.dashboard?.title && d.dashboard.title !== "Actions" && dashboards.length > 1 ? d.dashboard.title : null);
  }
  const wanted = (S.cfg.groups || []).map(tr);
  const seen = new Set([...S.actions.values()].map((a) => a.group));
  S.groups = [...new Set([...wanted, ...order, ...seen])].filter((g) => seen.has(g));
}

async function loadStatus() {
  const c = statusCfg();
  const type = c.entity || "machine";
  const list = await api("GetEntities", { entityType: type });
  const inst = list.entityDefinitions?.[0]?.instances ?? [];
  const [machines, sum] = await Promise.all([
    Promise.all(inst.map((i) => api("GetEntity", { type, uniqueKey: i.uniqueKey }))),
    c.summary ? api("GetEntity", { type: c.summary, uniqueKey: "0" }).catch(() => null) : null,
  ]);
  const rank = { bad: 0, offline: 0, warn: 1, ok: 2 };
  S.machines = machines.map((m) => ({ ...m.fields, name: m.fields?.name || m.title })).sort((a, b) => (rank[a.state] ?? 3) - (rank[b.state] ?? 3));
  S.summary = sum?.fields || computeSummary();
}
function computeSummary() {
  const ms = S.machines;
  const worst = ["bad", "offline", "warn"].find((s) => ms.some((m) => m.state === s)) || "ok";
  const attention = ms.filter((m) => m.state === "bad" || m.state === "offline").map((m) => m.name);
  const waiting = ms.filter((m) => m.state === "warn").map((m) => m.name);
  return {
    state: worst,
    headline: worst === "ok" ? T.allOk : worst === "warn" ? T.waiting(waiting) : T.attention(attention.length, attention),
    detail: T.summaryDetail(ms.length),
  };
}

// History hides the scheduled status refresh unless switched on.
async function loadLogs(reset = false) {
  if (reset) { S.logs = []; S.logsOffset = 0; S.logsLeft = 1; }
  let guard = 0;
  const target = S.logs.length + 12;
  while (S.logsLeft > 0 && S.logs.length < target && guard++ < 6) {
    const r = await api("GetLogs", { startOffset: S.logsOffset });
    S.logs.push(...(r.logs || []));
    S.logsOffset += Number(r.pageSize) || 10;
    S.logsLeft = Number(r.countRemaining) || 0;
  }
  await loadRunning();
}
const loadRunning = () => api("GetLogs", { startOffset: 0 }).then((r) => { S.running = (r.logs || []).find((l) => l.executionStarted && !l.executionFinished) || null; });
const refreshId = () => statusCfg()?.refreshAction || null;
const visibleLogs = () => S.logs.filter((l) => S.showAuto || !refreshId() || l.bindingId !== refreshId());

let lastSig = "";
async function refresh(force = false) {
  try {
    await Promise.all([statusCfg() ? loadStatus() : null, S.route === "history" ? loadLogs(true) : loadRunning()]);
    S.error = null;
  } catch (e) { S.error = e; }
  if (force || sig() !== lastSig) { if (!sheetCtl) render(); else renderNav(); }
}
// Signature of what's on screen; stored in render(), so a change while a sheet is open re-renders after it closes.
const sig = () => JSON.stringify([S.machines, S.summary, S.running?.executionTrackingId, S.route === "history" ? S.logs.length : 0, S.error?.message]);

// ---------- routing and shell ----------
const routes = () => [statusCfg() ? ["status", T.navStatus, "activity"] : null, ["actions", T.navActions, "grid"], ["history", T.navHistory, "clock"]].filter(Boolean);
function route() {
  const r = routes();
  S.route = (location.hash.replace(/^#\/?/, "") || r[0][0]).split("/")[0];
  if (!r.some((x) => x[0] === S.route)) S.route = r[0][0];
  if (S.route === "history") loadLogs(true).then(() => render()).catch(() => {});
  render();
  scrollTo(0, 0);
}
function navLinks() {
  return routes().map(([id, label, icon]) => h("a", { class: "nav-link", href: `#/${id}`, "aria-current": S.route === id ? "page" : null },
    ico(icon), label, id === "history" && S.running ? h("span", { class: "dot", title: T.somethingRunning }) : null));
}
function renderNav() {
  // in place: links aren't recreated, so the hover highlight doesn't blink on refresh
  app.querySelector(".nav")?.querySelectorAll(".nav-link").forEach((a) => {
    const id = a.getAttribute("href").slice(2);
    if (S.route === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    const dot = a.querySelector(".dot"), want = id === "history" && !!S.running;
    if (want && !dot) a.append(h("span", { class: "dot", title: T.somethingRunning }));
    if (!want && dot) dot.remove();
  });
  const b = app.querySelector(".banner"); if (b) b.replaceWith(banner() ?? document.createComment(""));
}
function banner() {
  if (!S.running) return null;
  const started = parseTime(S.running.datetimeStarted);
  return h("button", { class: "banner", onclick: () => openRun(S.running.executionTrackingId, S.running.actionTitle) },
    h("i", { class: "lamp live", style: "--c:var(--warn)" }),
    h("span", { class: "t" }, `${T.running}: `, S.running.actionTitle),
    h("span", { class: "m" }, started ? dur(Date.now() - started) : ""));
}
let lastRoute = "";
function render() {
  if (!S.ready && S.error) { app.replaceChildren(h("div", { class: "center" }, h("h1", {}, T.noConnection), h("p", {}, S.error?.message || T.noConfig), h("button", { class: "btn", onclick: () => location.reload() }, T.tryAgain))); return; }
  const view = S.error && !S.actions.size ? errorView() : { status: viewStatus, actions: viewActions, history: viewHistory }[S.route]();
  const prev = app.querySelector("main");
  // same screen = only new data: morph onto the existing DOM, no entrance animations for new elements
  const same = prev && lastRoute === S.route;
  if (same) view.classList.add("still");
  const lampState = statusCfg() ? S.summary?.state || "ok" : "ok";
  const shell = h("div", { class: "shell" },
    h("nav", { class: "nav", "aria-label": T.navMain }, h("div", { class: "brand" }, h("i", { class: `lamp ${lampState}` }), S.title), ...navLinks(), h("div", { class: "nav-user" }, S.me)),
    h("main", {}, banner() ?? document.createComment("banner"), view));
  if (same && app.firstChild?.classList?.contains("shell")) morph(app.firstChild, shell);
  else { app.replaceChildren(shell); if (prev) scrollTo(0, 0); }
  lastRoute = S.route;
  lastSig = sig();
}

function denied() {
  app.replaceChildren(h("div", { class: "center" }, h("h1", {}, T.denied), h("p", {}, T.deniedText(S.me))));
}
function errorView() {
  return h("div", { class: "view" }, h("div", { class: "center" }, h("h1", {}, T.noConnection), h("p", {}, S.error?.message || T.tryAgain),
    h("button", { class: "btn", onclick: () => refresh(true) }, ico("refresh"), T.tryAgain)));
}

// ---------- screen: Status (only with "status" in lamp.json) ----------
function viewStatus() {
  const sum = S.summary || { state: "ok", headline: T.loading, detail: "" };
  const rid = refreshId();
  const refreshBtn = rid && S.actions.has(rid) ? h("button", { class: "btn ghost", disabled: S.refreshing, onclick: runStatus }, ico("refresh", S.refreshing ? "spin" : ""), S.refreshing ? T.refreshing : T.refresh) : null;
  return h("div", { class: "view" },
    h("section", { class: `hero ${sum.state}` },
      h("p", { class: "kicker" }, h("i", { class: "lamp" }), S.title),
      h("h1", {}, sum.headline),
      h("p", { class: "detail" }, sum.detail),
      h("div", { class: "strip", role: "list" }, S.machines.map((m, i) => h("button", { class: `seg ${m.state}`, role: "listitem", style: `--i:${i}`, "aria-label": `${m.name}: ${m.label || m.state}`, onclick: () => openMachine(m) },
        h("i", { class: "bar" }), h("span", { class: "seg-name" }, m.name), m.state !== "ok" ? h("span", { class: "seg-state" }, m.label || m.state) : null))),
      refreshBtn ? h("div", { class: "toolbar" }, refreshBtn) : null),
    h("h2", { class: "section-title" }, tr(statusCfg().title) || T.machines, h("small", {}, `${S.machines.length}`)),
    h("section", { class: "machines" }, S.machines.map(machineCard)));
}
function machineCard(m) {
  const probs = lines(m.summary);
  return h("button", { class: `machine ${m.state}`, onclick: () => openMachine(m) },
    h("span", { class: "row" }, h("span", { class: "name" }, m.name), h("span", { class: "tag" }, h("i", { class: "lamp" }), m.label || m.state)),
    m.state !== "ok" && probs.length ? h("span", { class: "note" }, probs.join(" · ")) : null,
    h("span", { class: "meta" }, m.meta || (m.state === "ok" ? T.noChange : "")));
}
async function runStatus() {
  if (S.refreshing) return;
  S.refreshing = true; render();
  try {
    const r = await api("StartAction", { bindingId: refreshId(), arguments: [] });
    for (let i = 0; i < 600; i++) { await sleep(1000); const e = (await api("ExecutionStatus", { executionTrackingId: r.executionTrackingId })).logEntry; if (e.executionFinished) break; }
    await loadStatus();
  } catch (e) { S.error = e; }
  S.refreshing = false; render();
}

// ---------- screen: Actions ----------
function viewActions() {
  const all = [...S.actions.values()].filter((a) => a.bindingId !== refreshId());
  const groups = S.groups.map((g) => [g, all.filter((a) => a.group === g)]).filter(([, l]) => l.length);
  return h("div", { class: "view" }, h("h1", { class: "section-title page-title" }, T.actionsTitle),
    groups.map(([g, list]) => h("section", { class: "group" }, groups.length > 1 || g !== T.other ? h("h2", {}, g) : null, h("div", { class: "list" }, list.map((a) =>
      h("button", { class: "item", onclick: () => openAction(a.bindingId) }, ico(a.icon, "ico"),
        h("span", { class: "text" }, h("span", { class: "title" }, a.title, a.scheduled ? h("span", { class: "tag-auto" }, T.auto) : null), a.description ? h("span", { class: "sub" }, a.description) : null),
        ico("chevron", "chev")))))));
}

// ---------- screen: History ----------
function logState(l) { return !l.executionStarted ? "queued" : !l.executionFinished ? "run" : l.timedOut || l.exitCode !== 0 ? "fail" : "ok"; }
const who = (u) => (u === S.me ? T.you : /^(cron|startup|webhook|calendar|fileindir|system)$/.test(u || "") ? T.automatic : String(u || "").split("@")[0]);
function viewHistory() {
  const rows = visibleLogs();
  return h("div", { class: "view" },
    h("h1", { class: "section-title page-title" }, T.historyTitle),
    refreshId() ? h("div", { class: "toolbar", style: "margin:0 0 24px" }, h("button", { class: "chip-toggle", "aria-pressed": String(S.showAuto), onclick: () => { S.showAuto = !S.showAuto; render(); } }, T.showAuto)) : null,
    rows.length ? h("div", { class: "list" }, rows.map((l) => {
      const st = logState(l), t = parseTime(l.datetimeStarted), e = parseTime(l.datetimeFinished);
      return h("button", { class: `item ${st}`, onclick: () => openRun(l.executionTrackingId, l.actionTitle, l) },
        h("i", { class: `lamp ${st === "run" ? "live" : ""}` }),
        h("span", { class: "text" }, h("span", { class: "title" }, l.actionTitle), h("span", { class: "sub" }, `${who(l.user)}${st === "fail" ? ` · ${T.failed(l.exitCode)}` : st === "run" ? ` · ${T.inProgress}` : e && t ? ` · ${dur(e - t)}` : ""}`)),
        h("span", { class: "when" }, when(t)));
    })) : h("p", { class: "empty" }, T.noRuns),
    S.logsLeft > 0 ? h("div", { class: "more" }, h("button", { class: "btn ghost", onclick: async () => { await loadLogs(); render(); } }, T.older)) : null);
}

// ---------- sheet ----------
function openSheet({ icon, title, sub, body, onClose }) {
  closeSheet(true);
  const prevFocus = document.activeElement;
  const scrim = h("div", { class: "scrim", onclick: () => closeSheet() });
  const bodyEl = h("div", { class: "body" }, body);
  const subEl = h("p", { class: "sub" }, sub || "");
  const sheet = h("section", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "grab" }),
    h("header", {}, ico(icon || "play", "ico"), h("div", { class: "text" }, h("h2", {}, title), subEl), h("button", { class: "x", "aria-label": T.close, onclick: () => closeSheet() }, ico("x"))),
    bodyEl);
  document.body.append(scrim, sheet);
  document.body.classList.add("locked");
  const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
  document.addEventListener("keydown", onKey);
  sheetCtl = { scrim, sheet, bodyEl, subEl, prevFocus, onKey, onClose, setBody: (...n) => bodyEl.replaceChildren(...n.flat(Infinity).filter(Boolean)) };
  (sheet.querySelector("select, input, .hold, .btn, .x") || sheet).focus?.({ preventScroll: true });
  return sheetCtl;
}
function closeSheet(instant = false) {
  const c = sheetCtl; if (!c) return;
  sheetCtl = null;
  document.removeEventListener("keydown", c.onKey);
  c.onClose?.();
  const done = () => { c.scrim.remove(); c.sheet.remove(); document.body.classList.remove("locked"); c.prevFocus?.focus?.({ preventScroll: true }); };
  if (instant) return done();
  c.sheet.classList.add("closing"); c.scrim.classList.add("closing");
  setTimeout(() => { done(); refresh(); }, 200);
}

// ---------- sheet: machine ----------
// status.machineActions: [{action, args: {argName: "{name}"}, title, description, icon, only: {field, in: [...]}}]
function openMachine(m) {
  const c = statusCfg();
  const probs = lines(m.summary);
  const fill = (v) => String(v).replace(/\{(\w+)\}/g, (_, k) => m[k] ?? "");
  const rows = (c.machineActions || []).filter((x) => S.actions.has(x.action) && (!x.only || (x.only.in || []).includes(m[x.only.field]))).map((x) => {
    const a = S.actions.get(x.action);
    const preset = Object.fromEntries(Object.entries(x.args || {}).map(([k, v]) => [k, fill(v)]));
    return h("button", { class: "item", onclick: () => openAction(x.action, preset) }, ico(x.icon || a.icon, "ico"),
      h("span", { class: "text" }, h("span", { class: "title" }, tr(x.title) || a.title), tr(x.description) ? h("span", { class: "sub" }, tr(x.description)) : null), ico("chevron", "chev"));
  });
  const details = (c.details || []).map((d) => [tr(d.label) || d.field, d.format === "days" ? days(m[d.field]) || "-" : m[d.field] ?? "-"]);
  openSheet({
    icon: "server", title: m.name, sub: m.subtitle || "",
    body: [
      h("div", { class: `status-line ${m.state}` }, h("i", { class: "lamp" }), m.state === "ok" ? T.allGood : m.label || m.state, h("span", { class: "m" }, m.checked ? T.checkedAt(m.checked) : "")),
      m.state !== "ok" && probs.length ? h("ul", { class: `problems ${m.state}` }, probs.map((p) => h("li", {}, p))) : null,
      details.length ? h("dl", { class: "dl" }, details.map(([k, v]) => [h("dt", {}, k), h("dd", {}, String(v))])) : null,
      rows.length ? h("div", { class: "list", style: "grid-template-columns:1fr" }, rows) : null,
    ],
  });
}

// ---------- sheet: action ----------
function openAction(id, preset = {}) {
  const act = S.actions.get(id);
  if (!act) return;
  const values = {}, fields = [], chips = [];
  const confirm = (act.arguments || []).find((a) => a.type === "confirmation");
  for (const arg of act.arguments || []) {
    if (arg.type === "confirmation") continue;
    const choice = (arg.choices || []).find((c) => c.value === preset[arg.name]);
    if (arg.name in preset) { values[arg.name] = preset[arg.name]; chips.push(`${arg.title || arg.name}: ${choice?.title ?? preset[arg.name]}`); continue; }
    values[arg.name] = arg.defaultValue || arg.choices?.[0]?.value || "";
    fields.push(field(arg, values));
  }
  const start = async () => {
    const args = Object.entries(values).map(([name, value]) => ({ name, value }));
    // OliveTin enforces a named confirmation argument server-side; the long press is what the user agreed to
    if (confirm?.name) args.push({ name: confirm.name, value: "1" });
    try {
      const r = await api("StartAction", { bindingId: id, arguments: args });
      followRun(r.executionTrackingId, act.title, act.icon);
    } catch (e) { c.setBody(h("p", { class: "desc" }, T.startFailed(e.message)), h("button", { class: "btn ghost", onclick: () => closeSheet() }, T.close)); }
  };
  const c = openSheet({
    icon: act.icon, title: act.title, sub: act.group,
    body: [
      act.description ? h("p", { class: "desc" }, act.description) : null,
      chips.length ? h("div", { class: "chips" }, chips.map((t) => h("span", { class: "chip" }, t))) : null,
      fields,
      confirm ? [holdButton(start), h("p", { class: "hint" }, T.holdHint)] : h("button", { class: "btn", onclick: start }, ico("play"), T.run),
    ],
  });
}
function field(arg, values) {
  const id = `f-${arg.name}`;
  const ch = arg.choices || [];
  let control;
  if (ch.length && ch.length <= 3) {
    control = h("div", { class: "seg-ctl", role: "radiogroup" }, ch.map((c, i) => h("label", {}, h("input", { type: "radio", name: id, value: c.value, checked: (values[arg.name] ? values[arg.name] === c.value : i === 0) ? true : null, onchange: () => { values[arg.name] = c.value; } }), c.title || c.value)));
  } else if (ch.length) {
    const sel = h("select", { id, onchange: (e) => { values[arg.name] = e.target.value; } }, ch.map((c) => h("option", { value: c.value, selected: c.value === values[arg.name] ? true : null }, c.title || c.value)));
    control = h("div", { class: "select-wrap" }, sel);
  } else {
    control = h("input", { id, type: "text", value: values[arg.name] || "", oninput: (e) => { values[arg.name] = e.target.value; } });
  }
  return h("div", { class: "field" }, ch.length && ch.length <= 3 ? h("span", { class: "lab" }, arg.title || arg.name) : h("label", { for: id }, arg.title || arg.name), control, arg.description ? h("p", { class: "help" }, arg.description) : null);
}
function holdButton(onDone) {
  const HOLD = 900;
  let timer = null;
  const btn = h("button", { class: "hold", type: "button", "aria-label": T.hold }, h("span", { class: "fill" }), h("span", { class: "label" }, ico("hand"), T.hold));
  const begin = (e) => { if (timer || (e.type === "keydown" && (e.repeat || (e.key !== "Enter" && e.key !== " ")))) return; if (e.key === " ") e.preventDefault(); btn.classList.add("holding"); timer = setTimeout(() => { timer = null; btn.classList.remove("holding"); onDone(); }, HOLD); };
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove("holding"); };
  btn.addEventListener("pointerdown", begin); btn.addEventListener("keydown", begin);
  for (const ev of ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"]) btn.addEventListener(ev, cancel);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  return btn;
}

// ---------- sheet: run ----------
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
// Light highlighting of common output (Ansible, shell); unknown output stays plain.
function colorize(text) {
  const frag = document.createDocumentFragment();
  for (const line of text.replace(ANSI, "").split("\n")) {
    const cls = /^(fatal|\[ERROR\]|ERROR|error:)/i.test(line) || /failed=[1-9]|unreachable=[1-9]/.test(line) ? "f" : /^(TASK|PLAY)\b/.test(line) ? "t" : /^changed:/.test(line) ? "c" : /^ok:|^skipping:/.test(line) ? "o" : /PLAY RECAP|^\S+\s+: ok=/.test(line) ? "g" : "";
    frag.append(cls ? h("span", { class: cls }, line + "\n") : document.createTextNode(line + "\n"));
  }
  return frag;
}
function openRun(tid, title, known) {
  const act = [...S.actions.values()].find((a) => a.title === title || a.bindingId === known?.bindingId);
  openSheet({ icon: act?.icon || "play", title, sub: "", body: [] });
  followRun(tid, title, act?.icon, known, true);
}
async function followRun(tid, title, icon, known, reuse = false) {
  const c = reuse ? sheetCtl : openSheet({ icon: icon || "play", title, sub: "", body: [] });
  if (!c) return;
  const status = h("div", { class: "status-line run" }, h("i", { class: "lamp live" }), h("span", { class: "s" }, T.starting), h("span", { class: "m" }));
  const term = h("pre", { class: "term", tabindex: "0", "aria-label": T.output });
  const actions = h("div", { class: "actions" });
  c.setBody(status, term, actions);
  let alive = true;
  const prevClose = c.onClose; c.onClose = () => { alive = false; prevClose?.(); };
  let stick = true;
  term.addEventListener("scroll", () => { stick = term.scrollTop + term.clientHeight > term.scrollHeight - 24; });
  const paint = (e) => {
    const st = logState(e), t = parseTime(e.datetimeStarted), f = parseTime(e.datetimeFinished);
    status.className = `status-line ${st}`;
    status.querySelector(".lamp").className = `lamp ${st === "run" ? "live" : ""}`;
    status.querySelector(".s").textContent = st === "run" ? T.running : st === "queued" ? T.queued : st === "ok" ? T.done : e.timedOut ? T.timedOut : T.errorCode(e.exitCode);
    status.querySelector(".m").textContent = t ? (f ? dur(f - t) : dur(Date.now() - t)) : "";
    c.subEl.textContent = t ? `${who(e.user)} · ${when(t)}` : "";
    term.replaceChildren(colorize(e.output || ""));
    if (stick) term.scrollTop = term.scrollHeight;
    actions.replaceChildren(...[
      (st === "run" || st === "queued") && e.canKill ? h("button", { class: "btn danger-outline", onclick: () => api("KillAction", { executionTrackingId: tid }).catch(() => {}) }, ico("stop"), T.stop) : null,
      st !== "run" && st !== "queued" ? h("button", { class: "btn ghost", onclick: () => navigator.clipboard?.writeText((e.output || "").replace(ANSI, "")) }, ico("copy"), T.copy) : null,
      h("button", { class: "btn", onclick: () => closeSheet() }, T.close)].filter(Boolean));
  };
  let entry = known;
  if (entry) paint(entry);
  while (alive) {
    try { entry = (await api("ExecutionStatus", { executionTrackingId: tid })).logEntry; paint(entry); } catch (e) { status.querySelector(".s").textContent = T.readError(e.message); }
    if (entry?.executionFinished) { Promise.all([statusCfg() ? loadStatus() : null, loadLogs(true)]).catch(() => {}); break; }
    await sleep(1000);
  }
}

boot();
