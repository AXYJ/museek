"use client";

// Import de react
import { useState, useEffect, useRef } from "react";

// Import des composants
import Error from "@/components/alert/Error";
import Message from "@/components/alert/Message";
import TrackCover from "@/components/track/TrackCover";
import AutocompleteInput from "@/components/autocomplete/AutocompleteInput";
import QuitGame from "@/components/button/QuitGame";

// Import du contexte
import { useGame } from "@/context/GameContext";
import { useTranslation } from "@/context/LanguageContext";

// Import des utilitaires
import { normalizeString } from "@/utils/stringUtils";
import { getClockState } from "@/utils/gameClock";

export default function Game() {
  const {
    toPlay,
    time,
    volume,
    setVolume,
    database_artists = [],
    database_tracks = [],
    sendAnswer,
    setPlayers,
    socket,
    players,
    turn,
    setTurn,
    phase,
    setPhase,
    timeLeft,
    setTimeLeft,
    error,
    setError,
    message,
    setMessage,
    playerId,
    gameClock,
    setView,
    guessPlayer,
  } = useGame();

  const { t } = useTranslation();

  // Find current player profile
  const me = players?.find(
    (p) => (playerId && p.id === playerId) || p.socketId === socket?.id,
  );
  const [artistGuess, setArtistGuess] = useState<string>("");
  const [trackGuess, setTrackGuess] = useState<string>("");
  const [guessingArtist, setGuessingArtist] = useState<boolean>(false);
  const [guessingSong, setGuessingSong] = useState<boolean>(false);
  const [playerGuess, setPlayerGuess] = useState<string>("");
  const [guessingPlayer, setGuessingPlayer] = useState<boolean>(false);
  const [isChangingVolume, setIsChangingVolume] = useState<boolean>(false);
  const volumeControlRef = useRef<HTMLDivElement | null>(null);
  // Dernier volume non nul, pour le restaurer quand on remet le son
  const lastAudibleVolumeRef = useRef<number>(volume > 0 ? volume : 0.5);
  const isMuted = volume === 0;

  useEffect(() => {
    if (volume > 0) lastAudibleVolumeRef.current = volume;
  }, [volume]);

  const toggleMute = () => {
    setVolume(isMuted ? lastAudibleVolumeRef.current : 0);
  };

  // Close volume control when clicking outside
  useEffect(() => {
    if (!isChangingVolume) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeControlRef.current &&
        !volumeControlRef.current.contains(event.target as Node)
      ) {
        setIsChangingVolume(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isChangingVolume]);

  // Bloquer le défilement du body lors de la saisie
  useEffect(() => {
    if (guessingArtist || guessingSong || guessingPlayer) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [guessingArtist, guessingSong, guessingPlayer]);

  // Helper to get the current artist query (the part after the last comma)
  const getArtistQuery = (input: string) => {
    const parts = input.split(",");
    return parts[parts.length - 1].trim();
  };

  const artistQuery = getArtistQuery(artistGuess);

  // Saisies normalisées une seule fois par rendu, et non pour chaque élément de la base
  const artistSearch = normalizeString(artistQuery);
  const trackSearch = normalizeString(trackGuess);

  // Filter database artists (max 5 results)
  // Moins de 3 caractères : on ne parcourt pas du tout la base
  const filteredArtists =
    artistQuery.length < 3
      ? []
      : (database_artists || [])
          .filter((a) => {
            const matchesName = normalizeString(a.artist).includes(
              artistSearch,
            );
            const matchesInt = normalizeString(a.internationalArtist).includes(
              artistSearch,
            );
            const matchesAlt = a.alternativeNames?.some((name) =>
              normalizeString(name).includes(artistSearch),
            );
            return matchesName || matchesInt || matchesAlt;
          })
          .slice(0, 5);

  // Filter database tracks (max 5 results)
  const filteredTracks =
    trackGuess.length < 3
      ? []
      : (database_tracks || [])
          .filter((t) => {
            const matchesName = normalizeString(t.name).includes(trackSearch);
            const matchesInt = normalizeString(t.internationalName).includes(
              trackSearch,
            );
            // Noms alternatifs (ex. traduction) : au moins un doit contenir la saisie
            const matchesAlt = t.alternativeNames?.some((name) =>
              normalizeString(name).includes(trackSearch),
            );
            return matchesName || matchesInt || matchesAlt;
          })
          .slice(0, 5);

  // Joueurs proposables (max 5) : ceux qui ont envoyé au moins un morceau, filtrés selon la saisie
  const submitters = new Set(toPlay.map((track) => track.submittedBy));
  const playerSearch = normalizeString(playerGuess);
  const filteredPlayers = (players || [])
    .filter(
      (p) =>
        submitters.has(p.name) &&
        normalizeString(p.name).includes(playerSearch),
    )
    .slice(0, 5);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Sync volume when setting changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle track autoplay, reload, and crescendo on new turn
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0; // Start at 0 for crescendo
      audioRef.current.load();
      audioRef.current.play().catch(() => {});

      // Crescendo (fade-in) over 2 seconds
      const targetVolume = volumeRef.current;
      const duration = 2000; // 2s
      const tickRate = 50; // ms per step
      const steps = duration / tickRate;
      let currentStep = 0;

      const crescendoInterval = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          const currentVol = (currentStep / steps) * targetVolume;
          audioRef.current.volume = Math.min(targetVolume, currentVol);
        }
        if (currentStep >= steps) {
          clearInterval(crescendoInterval);
        }
      }, tickRate);

      return () => clearInterval(crescendoInterval);
    }
  }, [turn]);

  // Enable play after user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
      document.removeEventListener("click", handleInteraction);
    };
    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, []);

  // Dernières saisies, lues par l'horloge sans la relancer à chaque frappe
  const guessesRef = useRef({ artist: "", track: "", player: "" });
  useEffect(() => {
    guessesRef.current = {
      artist: artistGuess,
      track: trackGuess,
      player: playerGuess,
    };
  }, [artistGuess, trackGuess, playerGuess]);

  // Horloge de partie : tour, phase et temps restant sont recalculés depuis l'heure
  // du serveur. Pas de décompte local qui dérive, et un retour de veille (mobile)
  // se resynchronise tout seul au tick suivant.
  const clockRef = useRef({ turn, phase, answeredTurn: 0 });
  useEffect(() => {
    if (!gameClock) return;

    const interval = setInterval(() => {
      const next = getClockState(gameClock, toPlay.length);
      const cur = clockRef.current;

      if (next.turn !== cur.turn) {
        guessesRef.current = { artist: "", track: "", player: "" };
        setTurn(next.turn);
        setArtistGuess("");
        setTrackGuess("");
        setPlayerGuess("");
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            artist_answer: false,
            artist_score: 0,
            track_answer: false,
          })),
        );
      }
      if (next.phase !== cur.phase) {
        setPhase(next.phase);
        if (next.phase !== "guessing") {
          setGuessingArtist(false);
          setGuessingSong(false);
          setGuessingPlayer(false);
        }
      }
      setTimeLeft(next.timeLeft);

      // Dernier morceau terminé : on demande les scores et on affiche les résultats
      if (next.turn > toPlay.length && cur.turn <= toPlay.length) {
        socket?.emit("get_final_scores");
        setView("result");
      }

      // Une seule réponse par tour, envoyée dès la fin de la phase de devinette
      let answeredTurn = cur.answeredTurn;
      if (
        next.phase !== "guessing" &&
        next.turn <= toPlay.length &&
        answeredTurn < next.turn
      ) {
        sendAnswer(
          guessesRef.current.artist,
          guessesRef.current.track,
          next.turn,
          guessesRef.current.player,
        );
        answeredTurn = next.turn;
      }
      clockRef.current = { turn: next.turn, phase: next.phase, answeredTurn };
    }, 250);

    return () => clearInterval(interval);
  }, [
    gameClock,
    toPlay.length,
    sendAnswer,
    socket,
    setView,
    setPlayers,
    setTurn,
    setPhase,
    setTimeLeft,
  ]);

  // Local decrescendo (fade out) of the audio during the last 2s of the answer phase
  useEffect(() => {
    if (!audioRef.current) return;

    if (phase === "answer" && timeLeft <= 2 && timeLeft > 0) {
      const startVolume = audioRef.current.volume;
      const duration = timeLeft * 1000; // remaining time in ms
      const tickRate = 50; // ms per volume step
      const steps = duration / tickRate;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          const targetVolume = Math.max(
            0,
            startVolume * (1 - currentStep / steps),
          );
          audioRef.current.volume = targetVolume;
        }
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      }, tickRate);

      return () => clearInterval(fadeInterval);
    } else if (phase === "transition") {
      // Ensure audio is fully silent and paused during transition (Phase 3)
      audioRef.current.volume = 0;
      audioRef.current.pause();
    } else if (phase === "guessing") {
      // Reset volume to global setting at start of turn/guessing phase
      audioRef.current.volume = volume;
    }
  }, [timeLeft, phase, volume]);

  const currentTrack = toPlay[turn - 1];

  if (!currentTrack) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--accent) border-t-transparent"></div>
          <p className="text-lg text-(--grey)/60">{t("game.loading")}</p>
        </div>
      </div>
    );
  }

  const trackImage = currentTrack.imageUrl || null;
  const totalPhaseTime =
    phase === "guessing" ? time : phase === "transition" ? 2 : 5;
  const showAnswer = phase === "answer" || phase === "transition";

  return (
    <div className="relative mx-auto my-16 flex min-h-[calc(100vh-128px)] max-w-4xl flex-col items-center justify-center gap-4">
      <audio ref={audioRef} src={currentTrack.previewUrl}></audio>

      <QuitGame />

      <div
        className={`flex w-full flex-col items-center gap-4 transition-opacity duration-500 ${
          phase === "transition"
            ? "pointer-events-none opacity-0 select-none"
            : "opacity-100"
        }`}
      >
        <TrackCover
          imageUrl={trackImage}
          artist={currentTrack.artist}
          internationalArtist={currentTrack.internationalArtist}
          name={currentTrack.name}
          internationalName={currentTrack.internationalName}
          submittedBy={guessPlayer ? currentTrack.submittedBy : undefined}
          counterText={`${turn}/${toPlay.length}`}
          blurImage={phase === "guessing"}
          hasHelp={me?.hasHelp}
          blurLevel={
            me?.hasHelp ? Math.min(1, Math.max(0, (timeLeft - 5) / 5)) : 1
          }
          showAnswerOverlay={showAnswer}
          className="aspect-square w-full max-w-72"
          turn={turn}
        >
          {!showAnswer && (
            <div
              className="absolute right-2 bottom-2 z-10"
              ref={volumeControlRef}
            >
              <button
                type="button"
                onClick={() => {
                  toggleMute();
                  setIsChangingVolume(true);
                }}
                aria-label={isMuted ? t("game.unmute") : t("game.mute")}
                className="cursor-pointer"
              >
                {isMuted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-volume-off"
                  >
                    <path d="M16 9a5 5 0 0 1 .95 2.293" />
                    <path d="M19.364 5.636a9 9 0 0 1 1.889 9.96" />
                    <path d="m2 2 20 20" />
                    <path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11" />
                    <path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-volume-2"
                  >
                    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                    <path d="M16 9a5 5 0 0 1 0 6" />
                    <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
                  </svg>
                )}
              </button>
              {isChangingVolume && (
                <div className="absolute top-[-300%] left-1/2 z-10 -translate-x-1/2 -rotate-90">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onMouseDown={() => setIsChangingVolume(true)}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-(--grey) [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-(--accent) [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--accent)"
                  />
                </div>
              )}
            </div>
          )}
        </TrackCover>

        <section className="relative flex w-full flex-col gap-4">
          {/* Wrapper Artiste */}
          <div className="relative h-18 w-full">
            <AutocompleteInput
              id="artist-guess"
              label={t("game.artist")}
              value={artistGuess}
              onChange={setArtistGuess}
              suggestions={filteredArtists}
              isActive={guessingArtist}
              onActivate={() => {
                setGuessingSong(false);
                setGuessingArtist(true);
                setGuessingPlayer(false);
              }}
              onDeactivate={() => setGuessingArtist(false)}
              timeLeft={timeLeft}
              showAnswer={showAnswer}
              isCorrect={me?.artist_score === 1}
              isHalfCorrect={me?.artist_score === 0.5}
              isMultiple={true}
              getSuggestionValue={(item) => item.artist}
              getSuggestionLabel={(item) => {
                // Même principe que pour les titres : le nom alternatif trouvé passe en second
                const matchedAlt = item.alternativeNames?.find((name) =>
                  normalizeString(name).includes(artistSearch),
                );
                return {
                  main: item.artist,
                  secondary:
                    matchedAlt ??
                    (item.internationalArtist !== item.artist
                      ? item.internationalArtist
                      : undefined),
                };
              }}
              emptyText={t("game.no-artist-found")}
              phase={phase}
            />
          </div>

          {/* Wrapper Chanson */}
          <div className="relative h-18 w-full">
            <AutocompleteInput
              id="track-guess"
              label={t("game.track")}
              value={trackGuess}
              onChange={setTrackGuess}
              suggestions={filteredTracks}
              isActive={guessingSong}
              onActivate={() => {
                setGuessingArtist(false);
                setGuessingSong(true);
                setGuessingPlayer(false);
              }}
              onDeactivate={() => setGuessingSong(false)}
              timeLeft={timeLeft}
              showAnswer={showAnswer}
              isCorrect={me?.track_answer}
              isMultiple={false}
              getSuggestionValue={(item) => item.name}
              getSuggestionLabel={(item) => {
                // Si la saisie correspond à un nom alternatif, on l'affiche pour que le joueur
                // comprenne pourquoi ce morceau est proposé
                const matchedAlt = item.alternativeNames?.find((name) =>
                  normalizeString(name).includes(trackSearch),
                );
                return {
                  main: item.name,
                  secondary:
                    matchedAlt ??
                    (item.internationalName !== item.name
                      ? item.internationalName
                      : undefined),
                };
              }}
              emptyText={t("game.no-track-found")}
              phase={phase}
            />
          </div>

          {/* Wrapper Joueur */}
          {guessPlayer && (
            <div className="relative h-18 w-full">
              <AutocompleteInput
                id="player-guess"
                label={t("game.player")}
                value={playerGuess}
                onChange={setPlayerGuess}
                suggestions={filteredPlayers}
                isActive={guessingPlayer}
                onActivate={() => {
                  setGuessingArtist(false);
                  setGuessingSong(false);
                  setGuessingPlayer(true);
                }}
                onDeactivate={() => setGuessingPlayer(false)}
                timeLeft={timeLeft}
                showAnswer={showAnswer}
                isCorrect={me?.player_answer}
                isMultiple={false}
                getSuggestionValue={(item) => item.name}
                getSuggestionLabel={(item) => ({ main: item.name })}
                emptyText={t("game.no-player-found")}
                phase={phase}
                minQueryLength={0}
              />
            </div>
          )}
        </section>
      </div>

      {/* Barre de temps */}
      <div className="pointer-events-none mt-4 flex w-full max-w-lg flex-col items-center gap-2 md:w-1/2 lg:w-[calc(100vw-4rem)]">
        <span
          className={`text-sm font-semibold tracking-wider tabular-nums transition-colors duration-300 ${
            phase === "guessing" && timeLeft <= 5
              ? "text-red-500"
              : phase === "guessing" && timeLeft <= 10
                ? "text-(--warning)"
                : "text-(--grey)/80"
          }`}
        >
          {phase === "guessing"
            ? `${t("game.time-remaining")} : ${timeLeft}s`
            : phase === "transition"
              ? `${t("game.next-turn")} : ${timeLeft}s`
              : `${t("game.revelation")} : ${timeLeft}s`}
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-(--white)/20">
          <div
            className={`h-full w-full rounded-full transition-transform duration-1000 ease-linear will-change-transform ${
              phase === "guessing"
                ? "bg-(--accent)"
                : phase === "transition"
                  ? "bg-(--grey)"
                  : "bg-(--green)"
            }`}
            // Translation plutôt que largeur : animée par le GPU, sans recalcul de mise en page à chaque image
            style={{
              transform: `translateX(-${(timeLeft / totalPhaseTime) * 100}%)`,
            }}
          ></div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      <Error error={error} setError={setError} />
      <Message message={message} setMessage={setMessage} />
    </div>
  );
}
