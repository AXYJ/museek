// Playlists mélangeant plusieurs écritures non ASCII (japonais, chinois, coréen, cyrillique…).
// Teste le traitement local des noms (version internationale) et la correction des réponses.
// Sans serveur ni réseau (le traitement Groq n'est pas utilisé ici).
//
// Les 22 premiers morceaux viennent d'une vraie playlist Spotify (tests/fixtures/mixed-languages.json,
// noms d'origine conservés, espaces insécables compris) ; les autres écritures sont fabriquées.
import fs from "node:fs";
import {
  cleanSpaces,
  getInternationalName,
  transliterateText,
} from "../scripts/get-artists-tracks.ts";
import { prepareTrack, scoreAnswer, normalizeString, splitArtists } from "../scripts/answers.ts";
import { ARTISTS_WITH_SEPARATOR } from "../scripts/artists-with-separator.ts";
import type { Track } from "../types/game.ts";

let ok = true;
const check = (name: string, cond: boolean, extra = "") => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);

// Kuroshiro (japonais) s'initialise en tâche de fond : on attend qu'il lise bien le japonais
let ready = false;
for (let i = 0; i < 100 && !ready; i++) {
  ready = (await transliterateText("桜の花")).toLowerCase().startsWith("sakura"); // la bibliothèque seule lirait ces kanji en chinois
  if (!ready) await new Promise((r) => setTimeout(r, 200));
}
check("Kuroshiro prêt (le japonais est lu en romaji)", ready);
if (!ready) process.exit(1);

// Même chaîne que selectTracks quand Groq n'est pas disponible
async function build(artist: string, name: string): Promise<Track> {
  const a = cleanSpaces(artist);
  const n = cleanSpaces(name);
  return {
    name: n,
    artist: a,
    internationalName: await getInternationalName(n),
    internationalArtist: await getInternationalName(a),
  };
}

type Fixture = { note: string; artist: string; name: string };
const playlist: Fixture[] = JSON.parse(
  fs.readFileSync(new URL("./fixtures/mixed-languages.json", import.meta.url), "utf8"),
);
// Écritures qui ne sont pas dans la playlist
const synthetic: Fixture[] = [
  { note: "coréen", artist: "방탄소년단", name: "봄날" },
  { note: "coréen + latin", artist: "BLACKPINK", name: "마지막처럼 (As If It's Your Last)" },
  { note: "russe", artist: "Кино", name: "Группа крови" },
  { note: "arabe", artist: "فيروز", name: "سألوني الناس" },
  { note: "thaï", artist: "ลาบานูน", name: "ฝัน" },
  { note: "grec", artist: "Ελένη Βιτάλη", name: "Αγάπη μου" },
  { note: "hindi", artist: "अरिजीत सिंह", name: "तुम ही हो" },
  { note: "latin accentué", artist: "Beyoncé", name: "Déjà Vu" },
  { note: "latin accentué (artistes multiples)", artist: "Måneskin, Zaz", name: "Zitti e buoni" },
];
const all = [...playlist.map((f) => ({ ...f, source: "playlist" })), ...synthetic.map((f) => ({ ...f, source: "synthétique" }))];

// --- 1. Version internationale : uniquement des lettres latines simples ---
const tracks = new Map<string, Track>();
for (const f of all) tracks.set(f.note + "|" + f.name, await build(f.artist, f.name));
for (const f of all) {
  const t = tracks.get(f.note + "|" + f.name)!;
  const shown = `[${f.note}] ${JSON.stringify(f.name)} -> ${JSON.stringify(t.internationalName)}`;
  check(`international en ASCII et non vide : ${shown}`, !!t.internationalName && isAscii(t.internationalName));
  check(`artiste international en ASCII et non vide : ${JSON.stringify(t.artist)} -> ${JSON.stringify(t.internationalArtist)}`, !!t.internationalArtist && isAscii(t.internationalArtist));
}

// --- 2. Cas précis ---
const byName = (artist: string, name: string) => tracks.get(all.find((f) => cleanSpaces(f.artist) === artist && f.name === name)!.note + "|" + name)!;
check("parenthèses pleine largeur : 火炎（FLAME） devient FLAME", byName("QUEEN BEE", "火炎（FLAME）").internationalName === "FLAME");
check("feat. en han : le han est romanisé", /^Meridian \(feat\. .*Peipei\)$/.test(byName("JORDANN, 邹沛沛", "Meridian (feat. 邹沛沛Peipei)").internationalName));
check("latin collé à du han : le latin est conservé (REmi, RnB)", byName("吴子健REmi", "Drowing沉陷").internationalArtist.includes("REmi") && byName("江皓南", "不如RnB").internationalName.includes("RnB"));
check("artiste han + artiste latin : JORDANN, Zou Pei Pei", byName("JORDANN, 邹沛沛", "Meridian (feat. 邹沛沛Peipei)").internationalArtist === "JORDANN, Zou Pei Pei");
check("voyelles longues ramenées en lettres simples : seijanokoshin, doraifurawa", byName("Tatsuya Kitani", "聖者の行進").internationalName === "seijanokoshin" && byName("Uru", "ドライフラワー").internationalName === "doraifurawa");
check("kanji inconnu du dictionnaire : plus aucun kanji restant (23時の断捨離)", isAscii(byName("suisoh, 人間合格", "23時の断捨離").internationalName));
check("espace insécable remplacée par une espace simple", cleanSpaces("Orangestar, kase.") === "Orangestar, kase." && cleanSpaces("a　b") === "a b");
check("artiste 100 % latin avec espace insécable : n'est plus pris pour du non-ASCII", isAscii(cleanSpaces("eill, GANMI")));

// --- 3. Correction des réponses ---
const prepared = (t: Track) => prepareTrack(t, 0);
const full = { artistScore: 1, trackCorrect: true };
const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

for (const f of all) {
  const t = tracks.get(f.note + "|" + f.name)!;
  const p = prepared(t);
  const label = `[${f.source}] ${f.note} : ${t.name}`;
  check(`${label} : réponse dans l'écriture d'origine acceptée`, same(scoreAnswer(p, t.artist, t.name), full));
  check(`${label} : réponse en version internationale acceptée`, same(scoreAnswer(p, t.internationalArtist, t.internationalName), full));
  check(`${label} : majuscules et minuscules sans importance`, same(scoreAnswer(p, t.internationalArtist.toUpperCase(), t.internationalName.toUpperCase()), full) && same(scoreAnswer(p, t.artist.toLowerCase(), t.name.toLowerCase()), full));
  check(`${label} : mauvais titre refusé, réponse vide à zéro`, !scoreAnswer(p, t.artist, t.name + " x").trackCorrect && same(scoreAnswer(p, "", ""), { artistScore: 0, trackCorrect: false }));
}

// Plusieurs artistes : crédit partiel, mélange d'écritures, espace insécable saisie
const multi = prepared(byName("Lanndo, Eve, suis from Yorushika", "宇宙の季節"));
check("3 artistes : un seul trouvé = 0,5", scoreAnswer(multi, "Eve", "").artistScore === 0.5);
check("3 artistes : tous trouvés (virgule + espace insécable dans la saisie) = 1", scoreAnswer(multi, "Lanndo, Eve, suis from Yorushika", "").artistScore === 1);
check("3 artistes : mauvais artiste = 0", scoreAnswer(multi, "Yorushika, Ado", "").artistScore === 0);
const mixed = prepared(byName("JORDANN, 邹沛沛", "Meridian (feat. 邹沛沛Peipei)"));
check("artistes mêlant latin et han : l'un en latin, l'autre en han = 1", scoreAnswer(mixed, "JORDANN, 邹沛沛", "").artistScore === 1);
check("artistes mêlant latin et han : l'un en latin, l'autre romanisé = 1", scoreAnswer(mixed, "jordann, zou pei pei", "").artistScore === 1);
check("artistes mêlant latin et han : un seul = 0,5", scoreAnswer(mixed, "Zou Pei Pei", "").artistScore === 0.5);

// Accents latins : la saisie sans accent est acceptée
const beyonce = prepared(byName("Beyoncé", "Déjà Vu"));
check("accents latins : « beyonce » et « deja vu » acceptés", same(scoreAnswer(beyonce, "beyonce", "deja vu"), full));
const maneskin = prepared(byName("Måneskin, Zaz", "Zitti e buoni"));
check("accents latins : « Maneskin, Zaz » accepté", scoreAnswer(maneskin, "Maneskin, Zaz", "").artistScore === 1);

// Liste fournie par la plateforme : "&" et "," dans un nom ne découpent plus l'artiste
const duo = prepared({ name: "Dommage", artist: "Bigflo & Oli", artists: ["Bigflo & Oli"], internationalArtist: "Bigflo & Oli" });
check("duo : nom complet = 1", scoreAnswer(duo, "Bigflo & Oli", "").artistScore === 1);
check("duo : un seul nom = 0", scoreAnswer(duo, "Bigflo", "").artistScore === 0);
const collab = prepared({ name: "After the Storm", artist: "Kali Uchis, Tyler, The Creator", artists: ["Kali Uchis", "Tyler, The Creator"], internationalArtist: "Kali Uchis, Tyler, The Creator" });
check("nom avec virgule dans une collab : les deux dans le désordre = 1", scoreAnswer(collab, "Tyler, The Creator, Kali Uchis", "").artistScore === 1);
check("nom avec virgule dans une collab : un seul = 0,5", scoreAnswer(collab, "Tyler, The Creator", "").artistScore === 0.5);
const romanized = prepared({ name: "Meridian", artist: "JORDANN, 邹沛沛", artists: ["JORDANN", "邹沛沛"], internationalArtist: "JORDANN, Zou Pei Pei" });
check("liste fournie : nom romanisé accepté", scoreAnswer(romanized, "JORDANN, Zou Pei Pei", "").artistScore === 1);

// Chaîne Apple Music, sans liste : les noms connus restent entiers et à leur place
check("Apple : duo connu gardé entier", same(splitArtists("Bigflo & Oli"), ["Bigflo & Oli"]));
check("Apple : nom connu puis collab", same(splitArtists("Bigflo & Oli & Petit Biscuit"), ["Bigflo & Oli", "Petit Biscuit"]));
check("Apple : collab puis nom connu, ordre conservé", same(splitArtists("Kali Uchis, Tyler, The Creator & Bootsy Collins"), ["Kali Uchis", "Tyler, The Creator", "Bootsy Collins"]));
check("Apple : casse ignorée", same(splitArtists("earth, wind & fire"), ["earth, wind & fire"]));
check("Apple : collab inconnue découpée", same(splitArtists("Drake & Future"), ["Drake", "Future"]));
check("Apple : nom connu dans un autre mot ignoré", same(splitArtists("Carmel & Kimbra"), ["Carmel", "Kimbra"]) && same(splitArtists("Sam & Davey"), ["Sam", "Davey"]));
check("Apple : chaque nom de la liste reste entier", ARTISTS_WITH_SEPARATOR.every((a) => same(splitArtists(a), [a])));
const appleDuo = prepared({ name: "Demain", artist: "Bigflo & Oli & Petit Biscuit", internationalArtist: "Bigflo & Oli & Petit Biscuit" });
check("Apple : duo + artiste trouvés = 1", scoreAnswer(appleDuo, "Petit Biscuit, Bigflo & Oli", "").artistScore === 1);
check("Apple : duo seul = 0,5", scoreAnswer(appleDuo, "Bigflo & Oli", "").artistScore === 0.5);

// normalizeString : ni la casse ni les accents ne comptent, les écritures non latines sont gardées
check("normalizeString garde le han et le kana intacts", normalizeString("  聖者の行進 ") === "聖者の行進" && normalizeString("Déjà") === "deja");

console.log(ok ? "\nTOUT OK" : "\nECHEC");
process.exit(ok ? 0 : 1);
