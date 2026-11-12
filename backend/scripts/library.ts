import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DatabaseArtist, DatabaseTrack } from "../types/game.js";
import { needsLlm } from "./transliterate.js";

// Bibliothèque de romanisations corrigées à la main (data/library.json) ou alimenté par Groq (data/learned.json)
// Clé = le nom tel que la plateforme le renvoie (ex. Spotify donne « Faye Wong », pas 王菲),
// puis, pour chaque artiste, le titre d'origine.

// Required : sans lui, les champs restent optionnels comme dans DatabaseArtist/DatabaseTrack,
// et une entrée vide {} serait acceptée
type TrackInfo = Required<Pick<DatabaseTrack, "internationalName">> & {
  alternativeNames?: string[];
};

interface ArtistEntry extends Required<
  Pick<DatabaseArtist, "internationalArtist">
> {
  // Autres noms acceptés pour l'artiste (ex. nom anglais d'un groupe)
  alternativeNames?: string[];
  tracks: Record<string, TrackInfo>;
}

export type Library = Record<string, ArtistEntry>;

// Chemin relatif au dossier de lancement (backend/, en dev comme avec `npm start`).
// MUSEEK_LIBRARY_FILE permet de pointer ailleurs, par exemple vers un volume Coolify plus tard.
// (Pas LIBRARY_PATH : variable standard de l'éditeur de liens, déjà définie par Nixpacks en prod.)
const getLibraryPath = () =>
  process.env.MUSEEK_LIBRARY_FILE ||
  join(process.cwd(), "data", "library.json");

const getLearnedPath = () =>
  process.env.MUSEEK_LEARNED_FILE ||
  join(process.cwd(), "data", "learned.json");

// Liste de noms alternatifs valide (une liste de textes), sinon undefined avec un
// avertissement. Un champ fautif est ignoré sans faire perdre l'entrée qui le contient.
function validAlternativeNames(
  alt: unknown,
  where: string,
): string[] | undefined {
  if (Array.isArray(alt) && alt.every((n) => typeof n === "string")) {
    return alt;
  }
  if (alt !== undefined) {
    console.warn(
      `[library] alternativeNames ignoré (doit être une liste de textes) : ${where}`,
    );
  }
  return undefined;
}

// JSON.parse renvoie `any` : on vérifie la forme à l'exécution plutôt que de faire confiance
// au fichier (une faute de frappe dans un fichier édité à la main arrive vite).
// Une entrée mal formée est ignorée avec un avertissement, sans faire tomber le serveur.
function validate(raw: unknown): Library {
  const library: Library = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.warn(
      "[library] Le fichier doit contenir un objet : bibliothèque ignorée.",
    );
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
      const t = info as Partial<TrackInfo> | null;
      if (typeof t?.internationalName !== "string") {
        console.warn(
          `[library] Titre ignoré (forme invalide) : ${artist} / ${title}`,
        );
        continue;
      }

      // On construit l'entrée nous-mêmes au lieu de recopier `info` tel quel :
      // seuls les champs vérifiés y entrent
      const entry: TrackInfo = { internationalName: t.internationalName };

      const alt = validAlternativeNames(
        t.alternativeNames,
        `${artist} / ${title}`,
      );
      if (alt) entry.alternativeNames = alt;

      tracks[title] = entry;
    }
    const artistEntry: ArtistEntry = {
      internationalArtist: e.internationalArtist,
      tracks,
    };
    const artistAlt = validAlternativeNames(e.alternativeNames, artist);
    if (artistAlt) artistEntry.alternativeNames = artistAlt;
    library[artist] = artistEntry;
  }
  return library;
}

// Lu une seule fois, au premier appel (et non au chargement du module : même raison que
// pour process.env dans transliterate.ts, le .env est chargé par servor.ts après les imports)

const cache = new Map<string, Library>();

export function loadLibrary(path: string): Library {
  const cached = cache.get(path);
  if (cached) return cached;

  let library: Library = {};
  try {
    library = validate(JSON.parse(readFileSync(path, "utf8")));
    console.log(
      `[library] ${Object.keys(library).length} artiste(s) chargé(s) depuis ${path}`,
    );
  } catch (err) {
    console.warn(
      `[library] Impossible de lire ${path} :`,
      (err as Error).message,
    );
  }
  cache.set(path, library);
  return library;
}

// Romanisation d'un titre de cet artiste, ou undefined s'il n'est pas dans la bibliothèque
export function findTrack(artist: string, title: string): string | undefined {
  return (
    loadLibrary(getLibraryPath())[artist]?.tracks[title]?.internationalName ||
    loadLibrary(getLearnedPath())[artist]?.tracks[title]?.internationalName
  );
}

// Romanisation d'un artiste, ou undefined
export function findArtist(artist: string): string | undefined {
  return (
    loadLibrary(getLibraryPath())[artist]?.internationalArtist ||
    loadLibrary(getLearnedPath())[artist]?.internationalArtist
  );
}

export function findAlternativeNames(artist: string, title: string): string[] {
  const libraryData =
    loadLibrary(getLibraryPath())[artist]?.tracks[title]?.alternativeNames ??
    [];
  const learnedData =
    loadLibrary(getLearnedPath())[artist]?.tracks[title]?.alternativeNames ??
    [];

  const alternativeNamesData = [...libraryData, ...learnedData];

  return alternativeNamesData;
}

// Noms alternatifs d'un artiste (bibliothèque manuelle puis fichier appris), ou liste vide
export function findArtistAlternativeNames(artist: string): string[] {
  return [
    ...(loadLibrary(getLibraryPath())[artist]?.alternativeNames ?? []),
    ...(loadLibrary(getLearnedPath())[artist]?.alternativeNames ?? []),
  ];
}

export function resetLibraryCache(): void {
  cache.clear();
}

// Vrai si l'un des textes est vide ou ne contient que des espaces
const isEmpty = (...texts: (string | undefined | null)[]): boolean =>
  texts.some((t) => !t?.trim());

// Réponse de Groq inutilisable : vide, ou encore en écriture non latine (Groq a recopié
// l'original au lieu de le romaniser). Rien n'est alors enregistré.
const isUnusable = (...romanized: string[]): boolean =>
  isEmpty(...romanized) || romanized.some((t) => needsLlm(t));

// Mémorise la romanisation d'un artiste renvoyée par Groq (en mémoire seulement,
// voir saveLearned pour l'écriture sur le disque)
export function rememberArtist(
  artist: string,
  internationalArtist: string,
): void {
  if (isEmpty(artist) || isUnusable(internationalArtist)) {
    console.warn(
      `[library] Artiste ignoré (réponse Groq inutilisable) : ${artist} → "${internationalArtist}"`,
    );
    return;
  }

  const library = loadLibrary(getLearnedPath());
  library[artist] ??= { internationalArtist, tracks: {} };
}

// Mémorise la romanisation d'un titre renvoyée par Groq. Vérifié avant rememberArtist :
// si l'artiste était refusé, library[artist] n'existerait pas et .tracks planterait.
export function rememberTrack(
  artist: string,
  title: string,
  internationalArtist: string,
  internationalName: string,
  officialEnglishTitle?: unknown,
): void {
  if (
    isEmpty(artist, title) ||
    isUnusable(internationalArtist, internationalName)
  ) {
    console.warn(
      `[library] Titre ignoré (réponse Groq inutilisable) : ${artist} / ${title} → "${internationalName}"`,
    );
    return;
  }

  rememberArtist(artist, internationalArtist);
  // « = » et non « ??= » : Groq n'est appelé que si findTrack n'a rien trouvé, donc le titre
  // n'est jamais déjà là. « = » dit simplement « j'enregistre cette réponse ».
  const entry: TrackInfo = { internationalName };

  // Titre anglais officiel (Groq) : gardé seulement si c'est un vrai texte latin, différent
  // de la romanisation. Il devient un nom alternatif, accepté comme réponse.
  const english =
    typeof officialEnglishTitle === "string" ? officialEnglishTitle.trim() : "";
  if (
    english &&
    !needsLlm(english) &&
    english.toLowerCase() !== internationalName.trim().toLowerCase()
  ) {
    entry.alternativeNames = [english];
  }

  loadLibrary(getLearnedPath())[artist].tracks[title] = entry;
}

export function saveLearned() {
  const path = getLearnedPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    const saveLearnedJson = JSON.stringify(loadLibrary(path), null, 2);
    writeFileSync(`${path}.tmp`, saveLearnedJson);
    renameSync(`${path}.tmp`, path);
  } catch (err) {
    console.warn(
      `[library] Erreur d'écriture de learned.json :`,
      (err as Error).message,
    );
  }
}
