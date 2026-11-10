// Bibliothèque de romanisations (scripts/library.ts) : lecture du fichier, recherche,
// et résistance à un fichier absent ou mal formé. Sans serveur ni réseau.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findArtist, findTrack, resetLibraryCache } from "../scripts/library.ts";

let ok = true;
const check = (name: string, cond: boolean) => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
};

// 1. Le vrai fichier data/library.json
check("titre connu", findTrack("Faye Wong", "容易受傷的女人") === "Rong Yi Shou Shang De Nu Ren");
check("artiste connu", findArtist("Faye Wong") === "Faye Wong");
check("titre inconnu", findTrack("Faye Wong", "Inconnu") === undefined);
check("artiste inconnu", findTrack("Personne", "容易受傷的女人") === undefined);

// 2. Fichier mal formé : les entrées invalides sont ignorées, les autres gardées
const dir = mkdtempSync(join(tmpdir(), "museek-library-"));
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

process.exit(ok ? 0 : 1);
