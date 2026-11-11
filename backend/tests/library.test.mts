// Bibliothèque de romanisations (scripts/library.ts) : lecture du fichier, recherche,
// résistance à un fichier absent ou mal formé, et mémoire des réponses de Groq
// (rememberTrack / rememberArtist / saveLearned). Sans serveur ni réseau.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
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

// 2. Fichier mal formé : les entrées invalides sont ignorées, les autres gardées
const bad = join(dir, "library.json");
writeFileSync(
  bad,
  JSON.stringify({
    Valide: { internationalArtist: "Valide", tracks: { A: { internationalName: "a" }, B: {} } },
    SansRomanisation: { tracks: {} },
  }),
);
process.env.MUSEEK_LIBRARY_FILE = bad;
resetLibraryCache();
check("entrée valide gardée", findTrack("Valide", "A") === "a");
check("titre sans romanisation ignoré", findTrack("Valide", "B") === undefined);
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

// Relu après redémarrage (cache vidé) : la mémoire survit
resetLibraryCache();
check("relu depuis le disque", findTrack("邹沛沛", "不完整的心") === "Bu Wan Zheng De Xin");

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
