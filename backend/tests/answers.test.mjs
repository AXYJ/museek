import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const PLAYLIST = "https://www.deezer.com/playlist/3155776842";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

const a = io(URL, { transports: ["websocket"] });
const b = io(URL, { transports: ["websocket"] });
const c = io(URL, { transports: ["websocket"] });
const d = io(URL, { transports: ["websocket"] });
const e = io(URL, { transports: ["websocket"] });

let roomCode, toPlay;
let answersSeenByA = [];
a.on("answer", (id, artistScore, trackOk) => answersSeenByA.push({ id, artistScore, trackOk }));
a.on("error", (e) => console.log("A error:", e));
b.on("error", (e) => console.log("B error:", e));

await Promise.all([a, b, c, d, e].map((s) => new Promise((r) => s.on("connect", r))));

a.emit("create_game", "id-a", "Alice");
roomCode = await new Promise((r) => a.on("room_created", (code) => r(code)));
b.emit("join_game", roomCode, "id-b", "Bob");
c.emit("join_game", roomCode, "id-c", "Carol");
d.emit("join_game", roomCode, "id-d", "Dave");
e.emit("join_game", roomCode, "id-e", "Dave");
await sleep(300);

a.on("game_started", () => a.emit("send_playlist_url", PLAYLIST));
b.on("game_started", () => b.emit("send_playlist_url", ""));
c.on("game_started", () => c.emit("send_playlist_url", ""));
d.on("game_started", () => d.emit("send_playlist_url", ""));
e.on("game_started", () => e.emit("send_playlist_url", "")); 

const loaded = new Promise((r) => a.on("data_loaded", (tp) => r(tp)));
// Bob active l'aide (possible seulement au lobby) : il n'aura pas le bonus « sans aide »
b.emit("help", true);
for (const s of [b, c, d, e]) s.emit("ready", true);
await sleep(200);
a.emit("start_game");
toPlay = await Promise.race([loaded, sleep(60000).then(() => null)]);
check("partie démarrée, morceaux chargés", !!toPlay && toPlay.length > 0, `(${toPlay?.length} morceaux)`);
if (!toPlay) process.exit(1);

const t1 = toPlay[0];
const scoreOf = async (name) => {
  a.emit("get_final_scores");
  const players = await new Promise((r) => a.once("final_scores", r));
  return players.find((p) => p.name === name).score;
};

// Retrouve un joueur par sa socket : deux joueurs peuvent avoir le même pseudo
const findPlayerBySocket = async (socket) => {
  a.emit("get_final_scores");
  const players = await new Promise((r) => a.once("final_scores", r));
  return players.find((p) => p.socketId === socket.id);
};

// 1. bonne réponse envoyée 3 fois au tour 1 : comptée une seule fois
// Bonus de 1 point si la réponse est parfaite sans l'aide
a.emit("submit_answer", t1.artist, t1.name, 1);
a.emit("submit_answer", t1.artist, t1.name, 1);
a.emit("submit_answer", t1.artist, t1.name, 1);
await sleep(500);
check("réponse répétée comptée une fois (score 3)", (await scoreOf("Alice")) === 3, `score=${await scoreOf("Alice")}`);
check("un seul événement answer émis", answersSeenByA.length === 1, `n=${answersSeenByA.length}`);

// 2. mauvais tour (futur / passé / 0 / négatif) : ignoré
for (const t of [2, 0, -1, 99]) b.emit("submit_answer", t1.artist, t1.name, t);
await sleep(500);
check("tour invalide ignoré (score Bob 0)", (await scoreOf("Bob")) === 0);

// 3. réponse normale d'un autre joueur au bon tour : acceptée
b.emit("submit_answer", t1.artist, t1.name, 1);
await sleep(500);
check("Bob au bon tour : score 2", (await scoreOf("Bob")) === 2);

// 4. mauvaise réponse au bon tour : acceptée mais 0 point, puis verrouillée
c.emit("submit_answer", "xxx", "yyy", 1);
c.emit("submit_answer", t1.artist, t1.name, 1);
await sleep(500);
check("mauvaise réponse puis bonne : seule la 1re compte (0)", (await scoreOf("Carol")) === 0);

// 5. deux joueurs au même pseudo : la réponse n'est attribuée qu'à celui qui a répondu
d.emit("submit_answer", t1.artist, t1.name, 1);
await sleep(500);
const lastAnswerId = answersSeenByA.at(-1)?.id;
const daveD = await findPlayerBySocket(d);
const daveE = await findPlayerBySocket(e);
check("deux Dave, deux publicId différents", !!daveD && !!daveE && daveD.id !== daveE.id);
check("la réponse est attribuée au Dave qui a répondu", lastAnswerId === daveD?.id, `answer=${lastAnswerId} d=${daveD?.id}`);
check("la réponse n'est pas attribuée à l'autre Dave", lastAnswerId !== daveE?.id);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
