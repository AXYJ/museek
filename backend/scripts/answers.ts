import { Track } from "../types/game.js";
import { ARTISTS_WITH_SEPARATOR } from "./artists-with-separator.js";

// Correction des réponses : comparaison tolérante (casse et accents ignorés), artistes
// fournis par la plateforme ou séparés par ",", "&", "feat."… et noms acceptés dans
// l'écriture d'origine comme en version internationale (romanisée).

export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

const KNOWN_ARTISTS = new RegExp(
  `\\b(${ARTISTS_WITH_SEPARATOR.join("|")})\\b`,
  "i",
);

export function splitArtists(artistStr: string): string[] {
  if (!artistStr || typeof artistStr !== "string") return [];

  const separators =
    /,\s*|&\s*|\s+\/\s+|\s+(?:and|feat\.?|featuring|with)\s+/gi;

  // Grâce au groupe capturant, les noms connus restent aux indices impairs, à leur place
  return artistStr
    .split(KNOWN_ARTISTS)
    .flatMap((part, i) => (i % 2 === 1 ? [part] : part.split(separators)))
    .map((a) => a.trim())
    .filter(
      (a) => a.length > 0 && !/^(feat\.?|featuring|with|&|and)$/i.test(a),
    );
}

// Liste de la plateforme si elle existe, sinon découpe de la chaîne (Apple Music)
export function getTrackArtists(track: Track): string[] {
  return track.artists?.filter(Boolean) ?? splitArtists(track.artist);
}

// Morceau prêt à jouer : champs par défaut et normalisations précalculées pour
// la correction des réponses (voir scoreAnswer)
export function prepareTrack(track: Track, index: number): Track {
  const artists = getTrackArtists(track);
  const originalArtists = artists
    .map((a) => normalizeString(a))
    .filter(Boolean);
  const internationalArtist = track.internationalArtist || "";
  const internationalArtists = (
    artists.length === 1
      ? [internationalArtist]
      : splitArtists(internationalArtist)
  )
    .map((a) => normalizeString(a))
    .filter(Boolean);
  // ponytail: nom avec "," ou "&" dans une collab, listes de tailles différentes : seul
  // le nom d'origine est accepté. Romaniser artiste par artiste si ça gêne.
  const aligned = internationalArtists.length === originalArtists.length;

  // Noms alternatifs de la bibliothèque, retrouvés par nom d'origine normalisé
  const altByArtist = new Map<string, string[]>();
  for (const [name, alts] of Object.entries(
    track.artistAlternativeNames ?? {},
  )) {
    altByArtist.set(
      normalizeString(name),
      alts.map((n) => normalizeString(n)).filter(Boolean),
    );
  }

  // Pour chaque artiste, les noms acceptés (original, international et alternatifs)
  const requiredArtists = originalArtists.map((orig, idx) => [
    ...(aligned ? [orig, internationalArtists[idx]] : [orig]),
    ...(altByArtist.get(orig) ?? []),
  ]);

  return {
    order: index + 1,
    name: track.name || "",
    artist: track.artist || "",
    internationalName: track.internationalName || track.name || "",
    internationalArtist: track.internationalArtist || track.artist || "",
    alternativeNames: track.alternativeNames,
    artistAlternativeNames: track.artistAlternativeNames,
    previewUrl: track.previewUrl || "",
    imageUrl: track.imageUrl || "",
    submittedBy: track.submittedBy || "",
    url: track.url || "",
    _normalizedName: normalizeString(track.name || ""),
    _normalizedIntName: normalizeString(track.internationalName || ""),
    _requiredArtists: requiredArtists,
    _rawArtist: normalizeString(track.artist || ""),
    _rawIntArtist: normalizeString(track.internationalArtist || ""),
    _normalizedAltNames: (track.alternativeNames ?? []).map((n) =>
      normalizeString(n),
    ),
  };
}

// Note d'une réponse : artiste 1 (tous trouvés), 0.5 (une partie) ou 0 ; titre juste ou non.
// Les artistes de la réponse sont séparés par des virgules.
export function scoreAnswer(
  track: Track,
  artistGuess: string,
  trackGuess: string,
): { artistScore: number; trackCorrect: boolean } {
  const correctTrack = track._normalizedName ?? normalizeString(track.name);
  const correctIntTrack =
    track._normalizedIntName ?? normalizeString(track.internationalName || "");
  const correctAltTrack =
    track._normalizedAltNames ??
    (track.alternativeNames ?? []).map((n) => normalizeString(n));
  const guessedTrack = normalizeString(trackGuess);
  const trackCorrect =
    guessedTrack === correctTrack ||
    guessedTrack === correctIntTrack ||
    correctAltTrack.includes(guessedTrack);

  const playerGuesses = (artistGuess || "")
    .split(",")
    .map((a) => normalizeString(a))
    .filter(Boolean);

  const requiredArtists = track._requiredArtists ?? [];
  const rawArtist = track._rawArtist ?? normalizeString(track.artist);
  const rawIntArtist =
    track._rawIntArtist ?? normalizeString(track.internationalArtist || "");
  let artistScore = 0;
  // Nom de groupe saisi en entier (« Simon & Garfunkel »)
  const wholeGuess = normalizeString(artistGuess || "");
  if (
    [...playerGuesses, wholeGuess].some(
      (g) => g && (g === rawArtist || g === rawIntArtist),
    )
  ) {
    artistScore = 1;
  } else if (requiredArtists.length > 0) {
    // Segments voisins recollés : un nom peut contenir une virgule (« Tyler, The Creator »)
    const candidates = [
      ...playerGuesses,
      ...playerGuesses.slice(1).map((g, i) => playerGuesses[i] + g),
    ];
    const matchedCount = requiredArtists.filter((acceptableNames) =>
      candidates.some((guess) => acceptableNames.includes(guess)),
    ).length;
    if (matchedCount === requiredArtists.length) artistScore = 1;
    else if (matchedCount > 0) artistScore = 0.5;
  }

  return { artistScore, trackCorrect };
}
