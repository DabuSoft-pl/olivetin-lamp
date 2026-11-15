// Dev server: serves src/ and either a mock OliveTin API (default) or proxies /api to a real one.
//   node dev/server.mjs                                  # mock data, http://127.0.0.1:8080
//   OLIVETIN_URL=http://olivetin.lan:1337 node dev/server.mjs  # real OliveTin behind the same origin
//   PORT=9000 LAMP_CONFIG=examples/lamp.json node dev/server.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");
const PORT = Number(process.env.PORT || 8080);
const UPSTREAM = process.env.OLIVETIN_URL;
const CONFIG = process.env.LAMP_CONFIG ?? "dev/demo-lamp.json";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".txt": "text/plain" };

// ---------- mock data ----------
// OliveTin reports times in the server's local time zone, without an offset
const ago = (min) => { const d = new Date(Date.now() - min * 60000), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const ME = "alex@example.com";
const arg = (name, title, choices, extra = {}) => ({ name, title, type: "ascii_identifier", choices: choices?.map(([value, t]) => ({ value, title: t })) ?? [], defaultValue: "", ...extra });
const CONFIRM = { name: "confirm", title: "I understand", type: "confirmation" };
const HOSTS = [["all", "All machines"], ["nas", "nas"], ["router", "router"], ["media", "media"], ["home-assistant", "home-assistant"], ["backup", "backup"], ["dev", "dev"]];
const ACTIONS = [
  ["Everyday", [
    { bindingId: "status", title: "Refresh status", icon: "mdi:refresh", execOnCron: ["*/30 * * * *"] },
    { bindingId: "check", title: "Check machines", icon: "mdi:clipboard-check-outline", arguments: [arg("limit", "Machine", HOSTS)] },
    { bindingId: "update", title: "Update packages", icon: "mdi:update", arguments: [arg("limit", "Machine", HOSTS), CONFIRM] },
    { bindingId: "reboot", title: "Reboot", icon: "mdi:restart", arguments: [arg("host", "Machine", HOSTS.slice(1)), arg("mode", "How", [["reboot", "Clean reboot"], ["reset", "Hard reset"]]), CONFIRM] },
    { bindingId: "prune", title: "Docker cleanup", icon: "mdi:broom", arguments: [CONFIRM] },
  ]],
  ["Backup", [
    { bindingId: "restore-test", title: "Restore test", icon: "mdi:backup-restore" },
    { bindingId: "offsite", title: "Offsite copy", icon: "mdi:cloud-upload-outline", execOnCron: ["0 3 * * *"], arguments: [CONFIRM] },
  ]],
  ["Setup", [
    { bindingId: "notify", title: "Test notifications", icon: "mdi:bell-outline" },
    { bindingId: "certs", title: "Renew certificates", icon: "mdi:cog-outline", arguments: [CONFIRM] },
  ]],
];
const MACHINES = [
  { name: "nas", state: "warn", label: "reboot", summary: "kernel 6.12.9 waiting for a reboot", meta: "3 updates", updates: 3, uptime: 41.2, kind: "vm", subtitle: "Virtual machine" },
  { name: "router", state: "ok", label: "OK", summary: "", meta: "", updates: 0, uptime: 120.4, kind: "host", subtitle: "Physical host" },
  { name: "media", state: "ok", label: "OK", summary: "", meta: "", updates: 0, uptime: 6.3, kind: "lxc", subtitle: "Container" },
  { name: "home-assistant", state: "ok", label: "OK", summary: "", meta: "1 update", updates: 1, uptime: 12.8, kind: "vm", subtitle: "Virtual machine" },
  { name: "backup", state: "ok", label: "OK", summary: "", meta: "", updates: 0, uptime: 41.1, kind: "lxc", subtitle: "Container" },
  { name: "dev", state: "ok", label: "OK", summary: "", meta: "", updates: 0, uptime: 0.4, kind: "vm", subtitle: "Virtual machine" },
].map((m) => ({ ...m, checked: new Date(Date.now() - 7 * 60000).toTimeString().slice(0, 5) }));

const byId = new Map(ACTIONS.flatMap(([, l]) => l).map((a) => [a.bindingId, a]));
let seq = 100;
const RUNS = [
  run("status", "cron", 7, 0.6), run("update", ME, 95, 3.4), run("check", ME, 140, 0.9),
  run("offsite", "cron", 60 * 9, 12.2), run("reboot", ME, 60 * 26, 1.2, 2), run("restore-test", "cron", 60 * 30, 4.1),
];
function run(id, user, minAgo, minutes, exitCode = 0) {
  const a = byId.get(id);
  const start = Date.now() - minAgo * 60000;
  return { executionTrackingId: `run-${++seq}`, bindingId: id, actionTitle: a.title, user, exitCode, timedOut: false, canKill: false,
    executionStarted: true, executionFinished: true, datetimeStarted: ago(minAgo), datetimeFinished: ago(minAgo - minutes),
    output: fakeOutput(a, exitCode), _start: start };
}
function fakeOutput(a, code = 0) {
  const hosts = ["nas", "router", "media", "home-assistant", "backup", "dev"];
  return [`PLAY [${a.title}] ${"*".repeat(40)}`, "", `TASK [Gathering Facts] ${"*".repeat(30)}`, ...hosts.map((h) => `ok: [${h}]`), "",
    `TASK [${a.title}] ${"*".repeat(30)}`, ...hosts.map((h, i) => (code && i === 0 ? `fatal: [${h}]: FAILED! => {"msg": "Timeout waiting for the machine to come back"}` : i % 2 ? `changed: [${h}]` : `ok: [${h}]`)), "",
    `PLAY RECAP ${"*".repeat(40)}`, ...hosts.map((h, i) => `${h.padEnd(16)}: ok=4 changed=${i % 2} unreachable=0 failed=${code && i === 0 ? 1 : 0}`)].join("\n");
}
const LIVE = new Map();
function liveEntry(r) {
  const el = (Date.now() - r._start) / 1000;
  const full = r._output.split("\n");
  const done = el >= r._seconds || r._killed;
  return { ...r, output: done ? r._output : full.slice(0, Math.ceil((el / r._seconds) * full.length)).join("\n"), executionFinished: done,
    datetimeFinished: done ? ago(0) : "0001-01-01 00:00:00", exitCode: r._killed ? -1 : done ? 0 : -1, canKill: !done };
}

const MOCK = {
  Init: () => ({ pageTitle: "Homelab", rootDashboards: ["Homelab"], authenticatedUser: ME, currentVersion: "3000.21.0" }),
  WhoAmI: () => ({ authenticatedUser: ME, acls: ["admins"] }),
  GetDashboard: () => ({ dashboard: { title: "Homelab", contents: ACTIONS.map(([g, list]) => ({ type: "fieldset", title: g, contents: [{ type: "fieldset", title: "Actions",
    contents: list.map((a) => ({ type: "link", title: a.title, action: { canExec: true, arguments: [], execOnCron: [], ...a, icon: `<iconify-icon icon="${a.icon}"></iconify-icon>` } })) }] })) } }),
  GetEntities: ({ entityType }) => ({ entityDefinitions: entityType === "machine" ? [{ title: "machine", instances: MACHINES.map((m, i) => ({ title: m.name, uniqueKey: String(i) })) }] : [] }),
  GetEntity: ({ type, uniqueKey }) => {
    const m = MACHINES[Number(uniqueKey)];
    if (type !== "machine" || !m) throw Object.assign(new Error("not found"), { status: 404 });
    return { title: m.name, fields: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, String(v)])) };
  },
  GetLogs: ({ startOffset = 0 }) => {
    const all = [...[...LIVE.values()].map(liveEntry).reverse(), ...RUNS].sort((a, b) => b._start - a._start);
    const page = all.slice(startOffset, startOffset + 10);
    return { logs: page.map(({ _output, _seconds, _start, _killed, ...x }) => x), pageSize: 10, countRemaining: Math.max(0, all.length - startOffset - 10) };
  },
  StartAction: ({ bindingId, arguments: args = [] }) => {
    const a = byId.get(bindingId);
    if (!a) throw Object.assign(new Error("unknown action"), { status: 404 });
    if ((a.arguments || []).some((x) => x.type === "confirmation") && !args.some((x) => x.name === "confirm" && x.value)) throw Object.assign(new Error("confirmation required"), { status: 400 });
    const id = `run-${++seq}`;
    LIVE.set(id, { executionTrackingId: id, bindingId, actionTitle: a.title, user: ME, timedOut: false, executionStarted: true, datetimeStarted: ago(0),
      _start: Date.now(), _seconds: bindingId === "status" ? 3 : 6, _output: fakeOutput(a) });
    return { executionTrackingId: id };
  },
  ExecutionStatus: ({ executionTrackingId }) => {
    const r = LIVE.get(executionTrackingId) || RUNS.find((x) => x.executionTrackingId === executionTrackingId);
    if (!r) throw Object.assign(new Error("not found"), { status: 404 });
    const { _output, _seconds, _start, _killed, ...e } = LIVE.has(executionTrackingId) ? liveEntry(r) : r;
    return { logEntry: e };
  },
  KillAction: ({ executionTrackingId }) => { const r = LIVE.get(executionTrackingId); if (r) r._killed = true; return {}; },
};

// ---------- server ----------
createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    const body = await new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
    if (UPSTREAM) {
      const up = await fetch(UPSTREAM + url.pathname, { method: req.method, headers: { "content-type": "application/json" }, body: req.method === "POST" ? body : undefined });
      res.writeHead(up.status, { "content-type": up.headers.get("content-type") || "application/json" });
      return res.end(Buffer.from(await up.arrayBuffer()));
    }
    const fn = MOCK[url.pathname.split("/").pop()];
    try {
      const out = fn ? fn(JSON.parse(body || "{}")) : null;
      if (!fn) throw Object.assign(new Error("404 page not found"), { status: 404 });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(e.status || 500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ code: "error", message: e.message }));
    }
  }
  let file = url.pathname === "/lamp.json" && CONFIG ? join(ROOT, CONFIG) : join(SRC, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!extname(file)) file = join(SRC, "index.html");
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Lamp dev server: http://127.0.0.1:${PORT} (${UPSTREAM ? `proxy to ${UPSTREAM}` : "mock API"})`));
