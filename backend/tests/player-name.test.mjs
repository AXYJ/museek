import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const results = [];
const check = (name, ok, extra = "") => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

const a = io(URL, { transports: ["websocket"] });
const b = io(URL, { transports: ["websocket"] });

await Promise.all([a, b].map((s) => new Promise((r) => s.on("connect", r))));

a.emit("create_game", "id-a", "");
const { roomCode, players } = await new Promise((r) => a.on("room_created", (code, list) => r({ roomCode: code, players: list })));
const host = players.find((p) => p.socketId === a.id);
check("L'hôte doit s'appeler Player 1", host?.name === "Player 1", `nom=${host?.name}`);

b.emit("join_game", roomCode, "id-b", "   ");
await new Promise((r) => b.on("room_updated", ((code, list) => r({ roomCode: code, players: list }))))
const player2 = players.find((p) => p.socketId === b.id)
check("Le joueur doit s'appeler Player 2", await (player2?.name === "Player 2", `nom=${player2?.name}`))

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
