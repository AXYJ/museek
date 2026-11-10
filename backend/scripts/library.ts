import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseArtist, DatabaseTrack } from "../types/game.js";

// Bibliothèque de romanisations corrigées à la main (data/library.json).
// Clé = le nom tel que la plateforme le renvoie (ex. Spotify donne « Faye Wong », pas 王菲),
// puis, pour chaque artiste, le titre d'origine.

// Required : sans lui, les champs restent optionnels comme dans DatabaseArtist/DatabaseTrack,
// et une entrée vide {} serait acceptée
type TrackInfo = Required<Pick<DatabaseTrack, "internationalName">>;

interface ArtistEntry extends Required<Pick<DatabaseArtist, "internationalArtist">> {
  tracks: Record<string, TrackInfo>;
}

export type Library = Record<string, ArtistEntry>;

// Chemin relatif au dossier de lancement (backend/, en dev comme avec `npm start`).
// MUSEEK_LIBRARY_FILE permet de pointer ailleurs, par exemple vers un volume Coolify plus tard.
// (Pas LIBRARY_PATH : variable standard de l'éditeur de liens, déjà définie par Nixpacks en prod.)
const getLibraryPath = () =>
  process.env.MUSEEK_LIBRARY_FILE || join(process.cwd(), "data", "library.json");

// JSON.parse renvoie `any` : on vérifie la forme à l'exécution plutôt que de faire confiance
// au fichier (une faute de frappe dans un fichier édité à la main arrive vite).
// Une entrée mal formée est ignorée avec un avertissement, sans faire tomber le serveur.
function validate(raw: unknown): Library {
  const library: Library = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.warn("[library] Le fichier doit contenir un objet : bibliothèque ignorée.");
    return library;
  }
  for (const [artist, entry] of Object.entries(raw)) {
    const e = entry as Partial<ArtistEntry> | null;
    if (
      !e ||
      typeof e.internationalArtist !== "string" ||
      !e.tracks ||
      typeof e.tracks !== "object"
    ) {
      console.warn(`[library] Entrée ignorée (forme invalide) : ${artist}`);
      continue;
    }
    const tracks: Record<string, TrackInfo> = {};
    for (const [title, info] of Object.entries(e.tracks)) {
      if (typeof (info as Partial<TrackInfo>)?.internationalName === "string") {
        tracks[title] = info as TrackInfo;
      } else {
        console.warn(`[library] Titre ignoré (forme invalide) : ${artist} / ${title}`);
      }
    }
    library[artist] = { internationalArtist: e.internationalArtist, tracks };
  }
  return library;
}

// Lu une seule fois, au premier appel (et non au chargement du module : même raison que
// pour process.env dans transliterate.ts, le .env est chargé par servor.ts après les imports)
let cache: Library | null = null;

export function loadLibrary(): Library {
  if (cache) return cache;
  const path = getLibraryPath();
  try {
    cache = validate(JSON.parse(readFileSync(path, "utf8")));
    console.log(`[library] ${Object.keys(cache).length} artiste(s) chargé(s) depuis ${path}`);
  } catch (err) {
    // Fichier absent ou JSON invalide : le jeu continue sans bibliothèque
    console.warn(`[library] Impossible de lire ${path} :`, (err as Error).message);
    cache = {};
  }
  return cache;
}

// Romanisation d'un titre de cet artiste, ou undefined s'il n'est pas dans la bibliothèque
export function findTrack(artist: string, title: string): string | undefined {
  return loadLibrary()[artist]?.tracks[title]?.internationalName;
}

// Romanisation d'un artiste, ou undefined
export function findArtist(artist: string): string | undefined {
  return loadLibrary()[artist]?.internationalArtist;
}

// Pour les tests : relire le fichier au prochain appel
export function resetLibraryCache(): void {
  cache = null;
}
