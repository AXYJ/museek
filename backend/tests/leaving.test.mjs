// Fermeture d'onglet ("leaving" envoyé au pagehide) : le joueur est retiré après un délai
// court (LEAVING_GRACE_MS = 1 s ici), alors qu'une simple déconnexion garde le délai long
// (GRACE_PERIOD_MS = 3 s). Un rechargement (F5) se reconnecte à temps et garde sa place.
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
// Ce que ferait le navigateur en fermant l'onglet : "leaving" puis coupure de la socket
const closeTab = (socket) => {
  socket.emit("leaving");
  socket.disconnect();
};

// Salon : Alice (hôte), Bob, Carol, Dave, tous dans le lobby
const a = await connect();
a.emit("create_game", "leave-a", "Alice");
const code = await new Promise((r) => a.once("room_created", r));
const b = await connect();
const c = await connect();
const d = await connect();
let players = [];
d.on("room_updated", (_code, list) => (players = list));
let transferredTo = null;
for (const [name, s] of [["Carol", c], ["Dave", d]]) {
  s.on("host_transferred", () => (transferredTo = name));
}
b.emit("join_game", code, "leave-b", "Bob");
c.emit("join_game", code, "leave-c", "Carol");
d.emit("join_game", code, "leave-d", "Dave");
await sleep(500);
const names = () => players.map((p) => p.name).join(", ");
const find = (name) => players.find((p) => p.name === name);

// 1. Bob ferme son onglet : retiré du lobby après le délai court
closeTab(b);
await sleep(1500);
check("Bob retiré après fermeture d'onglet", !find("Bob"), `(${names()})`);

// 2. Alice (hôte) ferme son onglet : retirée et l'hôte passe à un autre joueur
closeTab(a);
await sleep(1500);
check("Alice retirée après fermeture d'onglet", !find("Alice"), `(${names()})`);
check("Carol devient hôte", find("Carol")?.isHost === true);
check("Carol est prévenue du transfert", transferredTo === "Carol");

// 3. Carol (nouvelle hôte) recharge la page : même id, reconnectée avant la fin du délai
closeTab(c);
await sleep(200);
const c2 = await connect();
c2.emit("join_game", code, "leave-c", "Carol");
await sleep(1500);
check(
  "F5 : Carol toujours là, active et hôte",
  find("Carol")?.leavedPlayer === false && find("Carol")?.isHost === true,
  `(${names()})`,
);

// 4. Dave se déconnecte sans "leaving" (mobile qui change d'appli) : il garde sa place
// pendant le délai long
const e = await connect();
e.on("room_updated", (_code, list) => (players = list));
e.emit("join_game", code, "leave-e", "Eve");
await sleep(300);
d.disconnect();
await sleep(1500);
check(
  "Dave encore là 1,5 s après une simple déconnexion",
  find("Dave")?.leavedPlayer === true,
  `(${names()})`,
);
await sleep(2000);
check("Dave retiré après le délai long", !find("Dave"), `(${names()})`);

c2.disconnect();
e.disconnect();
console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
