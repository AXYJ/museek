"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

// Pop-up d'information quand une ou plusieurs playlists n'ont pas pu être chargées :
// les joueurs ont été remis « pas prêts », celui concerné peut corriger son lien.
export default function PlaylistFailureModal({
  names,
  isHost,
  myName,
  onClose,
}: {
  names: string[] | null;
  isHost: boolean;
  myName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isConcerned = !!names?.includes(myName);

  return (
    <AnimatePresence>
      {names && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="playlist-failure-title"
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-(--background) p-6 text-(--white) shadow-lg">
            <h2 id="playlist-failure-title" className="text-xl font-bold">
              {t("lobby.playlist-failure-title")}
            </h2>
            <p>
              {t(
                names.length > 1
                  ? "lobby.playlist-failure-many"
                  : "lobby.playlist-failure-one",
                { names: names.join(", ") },
              )}
            </p>
            <p className="text-sm text-gray-400">
              {t(
                isConcerned
                  ? "lobby.playlist-failure-yours"
                  : isHost
                    ? "lobby.playlist-failure-host"
                    : "lobby.playlist-failure-guest",
              )}
            </p>
            <button
              className="cursor-pointer rounded-full bg-(--white) px-6 py-2 text-sm text-(--background) transition-all duration-300 ease-out hover:bg-(--accent)/60 hover:text-(--white) active:scale-95 md:text-base"
              onClick={onClose}
            >
              {t("alert.close")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
