import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

// Attend le prochain `event` reçu par `socket` et renvoie ses arguments sous forme de tableau.
// Au bout de `ms` millisecondes sans réponse, renvoie null : le test échoue au lieu de bloquer.
const waitFor = (socket, event, ms = 3000) =>
  Promise.race([
    new Promise((r) => socket.once(event, (...args) => r(args))),
    sleep(ms).then(() => null),
  ]);

const a = io(URL, { transports: ["websocket"] });
const b = io(URL, { transports: ["websocket"] });

await Promise.all([a, b].map((s) => new Promise((r) => s.on("connect", r))));

// 1. L'hôte crée une room sans pseudo : il devient « Player 1 »
// L'écouteur est créé avant l'envoi pour ne pas rater la réponse
const created = waitFor(a, "room_created");
a.emit("create_game", "id-a", "");
const [roomCode, players] = (await created) ?? [];
const host = players?.find((p) => p.socketId === a.id);
check("L'hôte doit s'appeler Player 1", host?.name === "Player 1", `nom=${host?.name}`);
if (!roomCode) process.exit(1);

// 2. Un joueur rejoint avec un pseudo fait d'espaces : il devient « Player 2 »
const joined = waitFor(b, "room_updated");
b.emit("join_game", roomCode, "id-b", "   ");
const [, newPlayers] = (await joined) ?? [];
const player2 = newPlayers?.find((p) => p.socketId === b.id);
check("Le joueur doit s'appeler Player 2", player2?.name === "Player 2", `nom=${player2?.name}`);

// 3. Il se renomme dans le lobby
const renamed = waitFor(b, "room_updated");
b.emit("change_name", "Bob");
const [, renamedPlayers] = (await renamed) ?? [];
const renamedPlayer = renamedPlayers?.find((p) => p.socketId === b.id);
check("Le joueur doit s'appeler Bob", renamedPlayer?.name === "Bob", `nom=${renamedPlayer?.name}`);

// 4. Un renommage vide est ignoré : le serveur n'envoie rien et le nom reste « Bob »
const ignored = waitFor(b, "room_updated", 1000);
b.emit("change_name", "   ");
check("Un renommage vide n'envoie pas de mise à jour", (await ignored) === null);
const scores = waitFor(a, "final_scores");
a.emit("get_final_scores");
const [finalPlayers] = (await scores) ?? [];
const stillBob = finalPlayers?.find((p) => p.socketId === b.id);
check("Le nom reste Bob", stillBob?.name === "Bob", `nom=${stillBob?.name}`);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
