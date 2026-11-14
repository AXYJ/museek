import type { Metadata } from "next";
import { notFound } from "next/navigation";

import HomeApp from "../../HomeApp";

// Lien d'invitation : museek.xiao-web.com/room/ABC123 ouvre directement le lobby.
// Les codes de room sont 6 caractères hexadécimaux (voir create_game dans backend/servor.ts).
const ROOM_CODE = /^[0-9A-F]{6}$/i;

const TITLE = "Rejoins ma partie";
const DESCRIPTION =
  "On t'invite à un blindtest sur Museek : rejoins le salon en un clic, sans compte, avec ta playlist Spotify, Deezer ou Apple Music.";

// Les salons sont éphémères : ces pages ne doivent pas être indexées.
// Titre et description servent à l'aperçu du lien (WhatsApp, Discord...).
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    title: `${TITLE} | Museek`,
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Museek - Blindtest musical",
      },
    ],
  },
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!ROOM_CODE.test(code)) notFound();

  return <HomeApp initialRoomCode={code.toUpperCase()} />;
}
