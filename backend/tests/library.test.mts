// Bibliothèque de romanisations (scripts/library.ts) : lecture du fichier, recherche,
// résistance à un fichier absent ou mal formé, et mémoire des réponses de Groq
// (rememberTrack / rememberArtist / saveLearned). Sans serveur ni réseau.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareTrack, scoreAnswer } from "../scripts/answers.ts";
import {
  findAlternativeNames,
  findArtist,
  findTrack,
  rememberArtist,
  rememberTrack,
  resetLibraryCache,
  saveLearned,
} from "../scripts/library.ts";

let ok = true;
const check = (name: string, cond: boolean) => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
};

// Fichier appris dans un dossier temporaire : les tests ne touchent jamais au
// data/learned.json du développeur
const dir = mkdtempSync(join(tmpdir(), "museek-library-"));
process.env.MUSEEK_LEARNED_FILE = join(dir, "absent-learned.json");

// 1. Le vrai fichier data/library.json
check("titre connu", findTrack("Faye Wong", "容易受傷的女人") === "Rong Yi Shou Shang De Nu Ren");
check("artiste connu", findArtist("Faye Wong") === "Faye Wong");
check("titre inconnu", findTrack("Faye Wong", "Inconnu") === undefined);
check("artiste inconnu", findTrack("Personne", "容易受傷的女人") === undefined);
check(
  "noms alternatifs connus",
  findAlternativeNames("Faye Wong", "容易受傷的女人").includes("Fragile Woman"),
);
check("noms alternatifs absents : liste vide", findAlternativeNames("Personne", "Rien").length === 0);

// Un nom alternatif est accepté comme réponse, sans tenir compte des majuscules ni de la ponctuation
const altTrack = prepareTrack(
  { name: "容易受傷的女人", artist: "Faye Wong", alternativeNames: ["Fragile Woman"] },
  0,
);
check("nom alternatif accepté", scoreAnswer(altTrack, "", "fragile-woman").trackCorrect);
check("titre original toujours accepté", scoreAnswer(altTrack, "", "容易受傷的女人").trackCorrect);
check("mauvaise réponse refusée", !scoreAnswer(altTrack, "", "banane").trackCorrect);

// 2. Fichier mal formé : les entrées invalides sont ignorées, les autres gardées
const bad = join(dir, "library.json");
writeFileSync(
  bad,
  JSON.stringify({
    Valide: {
      internationalArtist: "Valide",
      tracks: { A: { internationalName: "a" }, B: {}, C: { internationalName: "c", alternativeNames: "pas une liste" } },
    },
    SansRomanisation: { tracks: {} },
  }),
);
process.env.MUSEEK_LIBRARY_FILE = bad;
resetLibraryCache();
check("entrée valide gardée", findTrack("Valide", "A") === "a");
check("titre sans romanisation ignoré", findTrack("Valide", "B") === undefined);
check("alternativeNames invalide : titre gardé", findTrack("Valide", "C") === "c");
check("alternativeNames invalide : champ ignoré", findAlternativeNames("Valide", "C").length === 0);
check("artiste sans romanisation ignoré", findArtist("SansRomanisation") === undefined);

// 3. Fichier absent : pas d'erreur, bibliothèque vide
process.env.MUSEEK_LIBRARY_FILE = join(dir, "absent.json");
resetLibraryCache();
check("fichier absent sans plantage", findArtist("Faye Wong") === undefined);

// 4. Mémoire des réponses de Groq : en mémoire, puis sur le disque
// Dossier "data" absent exprès : saveLearned doit le créer
const learned = join(dir, "data", "learned.json");
process.env.MUSEEK_LIBRARY_FILE = join(dir, "absent.json");
process.env.MUSEEK_LEARNED_FILE = learned;
resetLibraryCache();

rememberTrack("邹沛沛", "不完整的心", "Zou Pei Pei", "Bu Wan Zheng De Xin");
rememberTrack("邹沛沛", "爱你", "Zou Pei Pei", "Ai Ni");
rememberArtist("王菲", "Faye Wong");
check("titre mémorisé", findTrack("邹沛沛", "不完整的心") === "Bu Wan Zheng De Xin");
check("2e titre du même artiste gardé", findTrack("邹沛沛", "爱你") === "Ai Ni");
check("artiste mémorisé", findArtist("王菲") === "Faye Wong");

// Réponses de Groq inutilisables : rien n'est enregistré
rememberTrack("邹沛沛", "测试", "Zou Pei Pei", "测试");
rememberTrack("邹沛沛", "空", "Zou Pei Pei", "   ");
rememberTrack("Inconnu", "测试", undefined as unknown as string, "Ce Shi");
rememberArtist("李", null as unknown as string);
check("romanisation non latine refusée", findTrack("邹沛沛", "测试") === undefined);
check("romanisation vide refusée", findTrack("邹沛沛", "空") === undefined);
check("artiste manquant refusé", findArtist("Inconnu") === undefined);
check("artiste null refusé", findArtist("李") === undefined);

saveLearned();
check("dossier et fichier créés", existsSync(learned));
check("pas de .tmp restant", !existsSync(`${learned}.tmp`));
const onDisk = JSON.parse(readFileSync(learned, "utf8"));
check("fichier écrit lisible", onDisk["邹沛沛"]?.tracks["爱你"]?.internationalName === "Ai Ni");

// Titre anglais officiel renvoyé par Groq : gardé comme nom alternatif s'il est utilisable
rememberTrack("邓丽君", "月亮代表我的心", "Teresa Teng", "Yue Liang Dai Biao Wo De Xin", "The Moon Represents My Heart");
rememberTrack("邓丽君", "甜蜜蜜", "Teresa Teng", "Tian Mi Mi", null);
rememberTrack("邓丽君", "小城故事", "Teresa Teng", "Xiao Cheng Gu Shi", "小城故事");
rememberTrack("邓丽君", "我只在乎你", "Teresa Teng", "Wo Zhi Zai Hu Ni", "wo zhi zai hu ni");
check(
  "titre anglais officiel mémorisé",
  findAlternativeNames("邓丽君", "月亮代表我的心")[0] === "The Moon Represents My Heart",
);
check("pas de titre anglais (null) : rien", findAlternativeNames("邓丽君", "甜蜜蜜").length === 0);
check("titre anglais non latin refusé", findAlternativeNames("邓丽君", "小城故事").length === 0);
check("titre anglais identique à la romanisation ignoré", findAlternativeNames("邓丽君", "我只在乎你").length === 0);
check("romanisation gardée malgré le titre anglais refusé", findTrack("邓丽君", "小城故事") === "Xiao Cheng Gu Shi");
saveLearned();

// Relu après redémarrage (cache vidé) : la mémoire survit
resetLibraryCache();
check("relu depuis le disque", findTrack("邹沛沛", "不完整的心") === "Bu Wan Zheng De Xin");
check(
  "titre anglais relu depuis le disque",
  findAlternativeNames("邓丽君", "月亮代表我的心")[0] === "The Moon Represents My Heart",
);

// La bibliothèque manuelle passe devant le fichier appris
const manual = join(dir, "manual.json");
writeFileSync(
  manual,
  JSON.stringify({
    "邹沛沛": { internationalArtist: "Zou Peipei", tracks: { "爱你": { internationalName: "Ai Ni (corrigé)" } } },
  }),
);
process.env.MUSEEK_LIBRARY_FILE = manual;
resetLibraryCache();
check("correction manuelle prioritaire", findTrack("邹沛沛", "爱你") === "Ai Ni (corrigé)");
check("repli sur le fichier appris", findTrack("邹沛沛", "不完整的心") === "Bu Wan Zheng De Xin");

// Écriture impossible : avertissement, pas de plantage
process.env.MUSEEK_LEARNED_FILE = join(manual, "impossible", "learned.json");
resetLibraryCache();
let crashed = false;
try {
  saveLearned();
} catch {
  crashed = true;
}
check("écriture impossible sans plantage", !crashed);

process.exit(ok ? 0 : 1);
