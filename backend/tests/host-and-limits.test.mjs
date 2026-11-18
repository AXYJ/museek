import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const connect = async () => {
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => s.on("connect", r));
  return s;
};

// --- A2 : contrôle hôte et validation ---
const host = await connect();
host.emit("create_game", "id-h", "Hote");
const code = await new Promise((r) => host.once("room_created", r));
const guest = await connect();
guest.emit("join_game", code, "id-g", "Invite");
await sleep(500);

let settings = [];
let started = 0;
host.on("game-setting", (k, v) => settings.push([k, v]));
host.on("game_started", () => started++);
const reset = () => {
  settings = [];
  started = 0;
};

reset();
guest.emit("start_game");
guest.emit("music_amount", 5);
guest.emit("time", 10);
await sleep(500);
check("non-hôte : start_game / music_amount / time ignorés", started === 0 && settings.length === 0, JSON.stringify(settings));

reset();
for (const v of [0, 31, 1.5, -3, 100000, "5", null, NaN]) host.emit("music_amount", v);
for (const v of [0, 4, 7, 31, 35, -5, 100000, 7.5, "10", null]) host.emit("time", v);
await sleep(500);
check("hôte : valeurs invalides ignorées", settings.length === 0, JSON.stringify(settings));

reset();
host.emit("music_amount", 1);
host.emit("music_amount", 30);
host.emit("time", 5);
host.emit("time", 30);
await sleep(500);
check(
  "hôte : bornes valides acceptées",
  JSON.stringify(settings) === JSON.stringify([["music_amount", 1], ["music_amount", 30], ["time", 5], ["time", 30]]),
  JSON.stringify(settings),
);

let guestView = null;
host.on("room_updated", (_c, players) => (guestView = players.find((p) => !p.isHost)));
for (const v of ["oui", 1, null, { a: 1 }]) guest.emit("ready", v);
await sleep(300);
check("ready : valeurs non booléennes ignorées", guestView === null || guestView.isReady === false, JSON.stringify(guestView?.isReady));

reset();
host.emit("start_game");
await sleep(500);
check("hôte : start_game refusé tant que l'invité n'est pas prêt", started === 0);

guest.emit("ready", true);
await sleep(200);
reset();
host.on("game_started", () => host.emit("send_playlist_url", ""));
guest.on("game_started", () => guest.emit("send_playlist_url", ""));
host.emit("start_game");
await sleep(500);
check("hôte : start_game fonctionne quand tout le monde est prêt", started === 1);
// start_game / restart_game en pleine partie : voir reconnection.test.mjs

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
